import { Router } from 'express';
import { query } from '../config/db.js';
import { getStudentCareerContext } from '../services/careerIntelligenceService.js';

const router = Router();

// Full Performance & Career Intelligence
router.get('/performance', async (req, res) => {
  try {
    const userId = req.user.id;
    const context = await getStudentCareerContext(userId);

    // Fetch interview history points
    const historyRes = await query(
      `SELECT i.title, i.created_at, r.overall_score, r.technical_knowledge_score, r.communication_score
       FROM interviews i
       JOIN interview_reports r ON r.interview_id = i.id
       WHERE i.user_id = $1
       ORDER BY i.created_at ASC`,
      [userId]
    );

    // Group into strong areas and needs practice
    const strongAreas = context.skill_progress.filter(s => s.is_strong || Number(s.score_percentage) >= 75);
    const needsPractice = context.skill_progress.filter(s => s.needs_practice || Number(s.score_percentage) < 60);

    // Build timeline from real interview records or default starter points
    const timeline = historyRes.rows.length > 0 ? historyRes.rows.map(h => ({
      date: new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      label: h.title,
      score: Math.round(Number(h.overall_score))
    })) : [
      { date: 'Initial', label: 'Resume Ingestion', score: 65 },
      { date: 'Current', label: 'Multi-Agent Assessment', score: Math.round(context.career_readiness_score) }
    ];

    res.json({
      overall_score: Math.round(context.career_readiness_score),
      career_readiness_score: Math.round(context.career_readiness_score),
      target_role: context.target_role,
      skills: context.skill_progress.length ? context.skill_progress : context.skills.map(s => ({
        skill_name: s,
        score_percentage: 65,
        is_strong: false,
        needs_practice: false
      })),
      strong_areas: strongAreas.length ? strongAreas : context.strong_skills.map(s => ({ skill_name: s, score_percentage: 85, is_strong: true })),
      needs_practice: needsPractice.length ? needsPractice : context.weak_skills.map(s => ({ skill_name: s, score_percentage: 50, needs_practice: true })),
      evidence: context.skill_evidence,
      history_timeline: timeline,
      stats: {
        interviews: context.interviews,
        coding: context.coding,
        quiz: context.quiz
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch student analytics' });
  }
});

// Agent Observability: Recent Agent Executions & Event Bus Log
router.get('/agent-runs', async (req, res) => {
  try {
    const userId = req.user.id;
    const runsRes = await query(
      `SELECT id, agent_name, run_status, input_context, output_summary, latency_ms, created_at
       FROM agent_runs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 15`,
      [userId]
    );

    const eventsRes = await query(
      `SELECT id, event_type, payload, processed, created_at
       FROM career_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 15`,
      [userId]
    );

    res.json({
      runs: runsRes.rows,
      events: eventsRes.rows
    });
  } catch (err) {
    console.error('Agent runs telemetry error:', err);
    res.status(500).json({ error: 'Failed to fetch agent runs telemetry' });
  }
});

export default router;
