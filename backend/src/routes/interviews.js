import { Router } from 'express';
import { query } from '../config/db.js';
import { generateNextInterviewQuestion, evaluateAnswerWithAI } from '../services/aiService.js';
import { getStudentCareerContext } from '../services/careerIntelligenceService.js';
import { emitCareerEvent, recordAgentRun } from '../services/careerEventsService.js';

const router = Router();

// Create new dynamic interview session
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title = 'Technical Interview',
      interview_type = 'technical',
      difficulty = 'medium',
      duration_minutes = 30,
      target_role = 'Backend Developer'
    } = req.body;

    // Fetch unified Student Career Context
    const careerContext = await getStudentCareerContext(userId);

    const initialState = {
      student_id: userId,
      student_name: careerContext.student_name,
      target_role: target_role || careerContext.target_role,
      difficulty,
      remaining_time: duration_minutes * 60,
      skills: careerContext.skills,
      weak_skills: careerContext.weak_skills,
      strong_skills: careerContext.strong_skills,
      projects: careerContext.projects,
      asked_questions: [],
      history: careerContext.interviews.past_questions || []
    };

    const newInterview = await query(
      `INSERT INTO interviews (user_id, title, interview_type, difficulty, duration_minutes, target_role, state_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [userId, title, interview_type, difficulty, duration_minutes, target_role || careerContext.target_role, JSON.stringify(initialState)]
    );

    const interviewId = newInterview.rows[0].id;

    // Generate first question via AI agent
    const firstQ = await generateNextInterviewQuestion(initialState);

    const insertedQ = await query(
      `INSERT INTO interview_questions (interview_id, question_order, topic, question_text, allocated_time_seconds)
       VALUES ($1, 1, $2, $3, $4)
       RETURNING *`,
      [interviewId, firstQ.topic || 'General', firstQ.question_text, firstQ.allocated_time_seconds || 180]
    );

    res.status(201).json({
      interview: newInterview.rows[0],
      current_question: insertedQ.rows[0]
    });
  } catch (err) {
    console.error('Error starting interview:', err);
    res.status(500).json({ error: 'Failed to start interview session' });
  }
});

// Get interview session by id
router.get('/:id', async (req, res) => {
  try {
    const interviewId = req.params.id;
    const interviewRes = await query('SELECT * FROM interviews WHERE id = $1', [interviewId]);
    if (interviewRes.rows.length === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const questionsRes = await query(
      `SELECT q.*, a.id as answer_id, a.final_text, a.raw_transcript, a.duration_seconds,
              e.technical_score, e.communication_score, e.grammar_score, e.logic_score, e.relevance_score, e.feedback
       FROM interview_questions q
       LEFT JOIN interview_answers a ON a.question_id = q.id
       LEFT JOIN answer_evaluations e ON e.answer_id = a.id
       WHERE q.interview_id = $1
       ORDER BY q.question_order ASC`,
      [interviewId]
    );

    res.json({
      interview: interviewRes.rows[0],
      questions: questionsRes.rows
    });
  } catch (err) {
    console.error('Error getting interview:', err);
    res.status(500).json({ error: 'Failed to get interview session' });
  }
});

// Submit answer to a question and trigger Agentic evaluation & next question
router.post('/:id/answer', async (req, res) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.id;
    const {
      question_id,
      final_text,
      raw_transcript = '',
      audio_url = '',
      duration_seconds = 60
    } = req.body;

    if (!final_text || !question_id) {
      return res.status(400).json({ error: 'Answer text and question_id are required' });
    }

    // Insert answer record
    const ansInsert = await query(
      `INSERT INTO interview_answers (question_id, raw_transcript, final_text, audio_url, duration_seconds)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [question_id, raw_transcript || final_text, final_text, audio_url, duration_seconds]
    );
    const answerId = ansInsert.rows[0].id;

    // Retrieve question context
    const qRes = await query('SELECT * FROM interview_questions WHERE id = $1', [question_id]);
    const question = qRes.rows[0];

    // Evaluate answer with AI Agent
    const evalResult = await evaluateAnswerWithAI({
      question: question.question_text,
      topic: question.topic,
      student_answer: final_text,
      duration_seconds
    });

    // Save evaluation
    const evalInsert = await query(
      `INSERT INTO answer_evaluations (answer_id, technical_score, communication_score, grammar_score, logic_score, relevance_score, feedback, expected_answer, detected_concepts, delivery_metrics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
       RETURNING *`,
      [
        answerId,
        evalResult.technical_score,
        evalResult.communication_score,
        evalResult.grammar_score,
        evalResult.logic_score,
        evalResult.relevance_score,
        evalResult.feedback,
        evalResult.expected_answer,
        JSON.stringify(evalResult.detected_concepts || []),
        JSON.stringify(evalResult.delivery_metrics || {})
      ]
    );

    // Emit INTERVIEW_ANSWER_EVALUATED event to ingest score into skill evidence
    await emitCareerEvent(userId, 'INTERVIEW_ANSWER_EVALUATED', {
      topic: question.topic || 'General Technical',
      technical_score: evalResult.technical_score,
      interview_id: interviewId,
      feedback: evalResult.feedback || ''
    });

    // Update interview session state
    const intRes = await query('SELECT * FROM interviews WHERE id = $1', [interviewId]);
    const interview = intRes.rows[0];
    const currentState = interview.state_data || {};

    const askedQuestions = currentState.asked_questions || [];
    askedQuestions.push({
      question: question.question_text,
      answer: final_text,
      topic: question.topic,
      evaluation: evalResult
    });

    currentState.asked_questions = askedQuestions;
    currentState.remaining_time = Math.max(0, (currentState.remaining_time || 1800) - duration_seconds);

    // Check if session should end (e.g. 5+ questions or time exhausted)
    const isCompleted = askedQuestions.length >= 5 || currentState.remaining_time <= 0;

    let nextQuestion = null;
    if (!isCompleted) {
      const nextQData = await generateNextInterviewQuestion(currentState);
      const nextOrder = askedQuestions.length + 1;

      const insertedNextQ = await query(
        `INSERT INTO interview_questions (interview_id, question_order, topic, question_text, allocated_time_seconds)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [interviewId, nextOrder, nextQData.topic || 'Deep Dive', nextQData.question_text, nextQData.allocated_time_seconds || 120]
      );
      nextQuestion = insertedNextQ.rows[0];
    } else {
      // Complete interview and generate final report
      // Compute averages
      const scores = askedQuestions.map(q => q.evaluation);
      const avgTech = (scores.reduce((acc, s) => acc + Number(s.technical_score), 0) / scores.length) * 10;
      const avgComm = (scores.reduce((acc, s) => acc + Number(s.communication_score), 0) / scores.length) * 10;
      const avgLogic = (scores.reduce((acc, s) => acc + Number(s.logic_score), 0) / scores.length) * 10;
      const avgGrammar = (scores.reduce((acc, s) => acc + Number(s.grammar_score), 0) / scores.length) * 10;
      const overall = Math.round((avgTech + avgComm + avgLogic + avgGrammar) / 4);

      await query(
        `UPDATE interviews SET status = 'completed', final_score = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [overall, interviewId]
      );

      await recordAgentRun(userId, 'Interview Supervisor Graph', 'success', { interviewId }, { final_score: overall, questions_answered: askedQuestions.length });

      // Dynamically derive strengths and weaknesses from real question evaluations
      const strengths = [];
      const weaknesses = [];
      askedQuestions.forEach(q => {
        const topic = q.topic || 'System Design';
        const tScore = Number(q.evaluation?.technical_score || 0);
        if (tScore >= 7.0) {
          if (!strengths.includes(topic)) strengths.push(topic);
        } else {
          if (!weaknesses.includes(topic)) weaknesses.push(topic);
        }
      });

      if (strengths.length === 0) strengths.push('Core Technical Articulation', 'Architectural Communication');
      if (weaknesses.length === 0) weaknesses.push('High-Throughput Edge Cases', 'Concurrency Isolation');

      const targetRoleName = interview.target_role || 'Software Engineer';
      const detailedSummary = `Candidate completed ${askedQuestions.length} technical evaluation questions for the ${targetRoleName} profile, achieving an overall score of ${overall}%. Demonstrated strong competence in ${strengths.slice(0, 2).join(' and ')}, with further depth recommended in ${weaknesses.slice(0, 2).join(' and ')}.`;

      await query(
        `INSERT INTO interview_reports (interview_id, overall_score, technical_knowledge_score, communication_score, logical_reasoning_score, grammar_score, strengths, weaknesses, detailed_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)`,
        [
          interviewId,
          overall,
          avgTech,
          avgComm,
          avgLogic,
          avgGrammar,
          JSON.stringify(strengths),
          JSON.stringify(weaknesses),
          detailedSummary
        ]
      );
    }

    // Save state back to DB
    await query('UPDATE interviews SET state_data = $1::jsonb WHERE id = $2', [JSON.stringify(currentState), interviewId]);

    res.json({
      evaluation: evalInsert.rows[0],
      is_completed: isCompleted,
      next_question: nextQuestion
    });
  } catch (err) {
    console.error('Answer submission error:', err);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// Get interview report
router.get('/:id/report', async (req, res) => {
  try {
    const interviewId = req.params.id;
    const reportRes = await query('SELECT * FROM interview_reports WHERE interview_id = $1', [interviewId]);
    if (reportRes.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found or interview not completed' });
    }

    const interviewRes = await query('SELECT * FROM interviews WHERE id = $1', [interviewId]);
    const questionsRes = await query(
      `SELECT q.question_text, q.topic, a.final_text, e.*
       FROM interview_questions q
       JOIN interview_answers a ON a.question_id = q.id
       JOIN answer_evaluations e ON e.answer_id = a.id
       WHERE q.interview_id = $1
       ORDER BY q.question_order ASC`,
      [interviewId]
    );

    res.json({
      interview: interviewRes.rows[0],
      report: reportRes.rows[0],
      qa_pairs: questionsRes.rows
    });
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ error: 'Failed to fetch interview report' });
  }
});

// Get all interview history for student
router.get('/history/all', async (req, res) => {
  try {
    const userId = req.user.id;
    const historyRes = await query(
      `SELECT i.id, i.title, i.interview_type, i.difficulty, i.created_at, i.status,
              r.overall_score, r.technical_knowledge_score, r.communication_score
       FROM interviews i
       LEFT JOIN interview_reports r ON r.interview_id = i.id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    res.json(historyRes.rows);
  } catch (err) {
    console.error('Error fetching interview history:', err);
    res.status(500).json({ error: 'Failed to fetch interview history' });
  }
});

export default router;
