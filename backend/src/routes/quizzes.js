import { Router } from 'express';
import { query } from '../config/db.js';
import { generateQuizWithAI } from '../services/aiService.js';
import { getStudentCareerContext } from '../services/careerIntelligenceService.js';
import { emitCareerEvent, recordAgentRun } from '../services/careerEventsService.js';

const router = Router();

// Generate or fetch quiz for a subject (supports multi-subject and custom question counts)
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      subject,
      subjects = [],
      difficulty = 'medium',
      total_questions = 5,
      duration_minutes = 10
    } = req.body;

    const subjectsList = Array.isArray(subjects) && subjects.length > 0
      ? subjects
      : (subject ? subject.split(',').map(s => s.trim()).filter(Boolean) : ['DBMS']);

    const subjectStr = subjectsList.join(', ');
    const count = parseInt(total_questions, 10) || 5;

    const quizInsert = await query(
      `INSERT INTO quizzes (user_id, subject, difficulty, total_questions)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, subjectStr, difficulty, count]
    );
    const quizId = quizInsert.rows[0].id;

    // Fetch unified student career context to target weak skills
    const careerContext = await getStudentCareerContext(userId);

    // Generate questions using AI focusing on candidate's weak areas & multi-subjects
    const generatedQuestions = await generateQuizWithAI(
      subjectsList,
      difficulty,
      count,
      careerContext.weak_skills || [],
      careerContext.target_role || 'Software Engineer'
    );

    const questions = [];
    for (const q of generatedQuestions) {
      const qRes = await query(
        `INSERT INTO quiz_questions (quiz_id, question_type, question_text, options, correct_option, explanation)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         RETURNING *`,
        [quizId, q.question_type || 'mcq', q.question_text, JSON.stringify(q.options), q.correct_option, q.explanation]
      );
      questions.push({
        ...qRes.rows[0],
        subject: q.subject || subjectsList[0] || 'Technical'
      });
    }

    res.json({
      quiz: {
        ...quizInsert.rows[0],
        subjects: subjectsList,
        duration_minutes: parseInt(duration_minutes, 10) || 10
      },
      questions
    });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Submit answers for quiz attempt
router.post('/:id/attempt', async (req, res) => {
  try {
    const userId = req.user.id;
    const quizId = req.params.id;
    const { answers = [] } = req.body; // Array of { question_id, user_answer, time_taken_seconds }

    let correctCount = 0;
    const questionsRes = await query('SELECT * FROM quiz_questions WHERE quiz_id = $1', [quizId]);
    const qMap = new Map(questionsRes.rows.map(q => [q.id, q]));

    // Record attempt
    const attemptInsert = await query(
      `INSERT INTO quiz_attempts (quiz_id, user_id, score)
       VALUES ($1, $2, 0)
       RETURNING *`,
      [quizId, userId]
    );
    const attemptId = attemptInsert.rows[0].id;

    for (const ans of answers) {
      const q = qMap.get(ans.question_id);
      const isCorrect = q ? (q.correct_option === ans.user_answer) : false;
      if (isCorrect) correctCount++;

      await query(
        `INSERT INTO quiz_answers (attempt_id, question_id, user_answer, is_correct, time_taken_seconds)
         VALUES ($1, $2, $3, $4, $5)`,
        [attemptId, ans.question_id, ans.user_answer, isCorrect, ans.time_taken_seconds || 0]
      );
    }

    const total = questionsRes.rows.length || 1;
    const scorePct = Math.round((correctCount / total) * 100);

    await query('UPDATE quiz_attempts SET score = $1 WHERE id = $2', [scorePct, attemptId]);

    // Fetch quiz subject and emit QUIZ_FINISHED event
    const quizRes = await query('SELECT subject FROM quizzes WHERE id = $1', [quizId]);
    const subject = quizRes.rows[0]?.subject || 'DBMS';

    await emitCareerEvent(userId, 'QUIZ_FINISHED', {
      subject,
      score_pct: scorePct,
      quiz_id: quizId
    });

    await recordAgentRun(userId, 'Quiz Intelligence Agent', 'success', { subject }, { score: scorePct, correct: correctCount, total });

    res.json({
      attempt_id: attemptId,
      score: scorePct,
      correct: correctCount,
      total
    });
  } catch (err) {
    console.error('Quiz attempt error:', err);
    res.status(500).json({ error: 'Failed to submit quiz attempt' });
  }
});

export default router;
