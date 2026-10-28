import { query } from '../config/db.js';
import { recordSkillEvidence } from './careerIntelligenceService.js';

/**
 * Career Events Bus
 * Coordinates multi-agent lifecycle events across the ecosystem.
 */
export async function emitCareerEvent(userId, eventType, payload = {}) {
  try {
    // 1. Log event in career_events table
    const eventInsert = await query(
      `INSERT INTO career_events (user_id, event_type, payload, processed)
       VALUES ($1, $2, $3::jsonb, true)
       RETURNING id, created_at`,
      [userId, eventType, JSON.stringify(payload)]
    );

    // 2. Dispatch event handlers based on event type
    switch (eventType) {
      case 'RESUME_PARSED': {
        const { skills = [], projects = [], resume_id } = payload;
        for (const skill of skills) {
          await recordSkillEvidence(
            userId,
            skill,
            'resume',
            resume_id,
            65.0, // baseline proficiency for declared resume skill
            0.5,  // resume weight
            'Extracted from uploaded candidate resume'
          );
        }
        break;
      }

      case 'INTERVIEW_ANSWER_EVALUATED': {
        const { topic = 'General Technical', technical_score = 50, interview_id, feedback = '' } = payload;
        // Clean topic to skill name (e.g. "Spring Boot & IoC" -> "Spring Boot")
        const mainSkill = topic.split('&')[0].split('—')[0].split(':')[0].trim();
        await recordSkillEvidence(
          userId,
          mainSkill,
          'interview',
          interview_id,
          parseFloat(technical_score) * 10, // scale 1-10 to 10-100
          1.0,                              // interview weight
          `Interview answer evaluation: ${feedback.slice(0, 120)}`
        );
        break;
      }

      case 'CODE_SUBMITTED': {
        const { language = 'Python', correctness_pct = 0, question_title = 'Algorithm' } = payload;
        await recordSkillEvidence(
          userId,
          language.toUpperCase() === 'JAVA' ? 'Java' : (language.toUpperCase() === 'PYTHON' ? 'Python' : language),
          'coding',
          null,
          parseFloat(correctness_pct),
          1.2, // coding sandbox weight
          `Coding challenge: ${question_title} (${correctness_pct}% test cases passed)`
        );
        break;
      }

      case 'QUIZ_FINISHED': {
        const { subject = 'DBMS', score_pct = 0, quiz_id } = payload;
        await recordSkillEvidence(
          userId,
          subject,
          'quiz',
          quiz_id,
          parseFloat(score_pct),
          0.8, // quiz weight
          `Subject technical quiz completed: ${score_pct}% score`
        );
        break;
      }

      default:
        break;
    }

    return { success: true, event_id: eventInsert.rows[0]?.id };
  } catch (err) {
    console.error(`Error processing career event [${eventType}]:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Record an agent run for system telemetry and observability
 */
export async function recordAgentRun(userId, agentName, status = 'success', inputContext = {}, outputSummary = {}, latencyMs = 0) {
  try {
    await query(
      `INSERT INTO agent_runs (user_id, agent_name, run_status, input_context, output_summary, latency_ms)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
      [userId, agentName, status, JSON.stringify(inputContext), JSON.stringify(outputSummary), latencyMs]
    );
  } catch (err) {
    console.error('Error logging agent run:', err);
  }
}
