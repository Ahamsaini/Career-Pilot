import { Router } from 'express';
import { query } from '../config/db.js';
import { generateRoadmapWithAI } from '../services/aiService.js';
import { getStudentCareerContext } from '../services/careerIntelligenceService.js';
import { recordAgentRun } from '../services/careerEventsService.js';

const router = Router();

// Get active roadmap or generate one
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const roadmapRes = await query('SELECT * FROM roadmaps WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);

    if (roadmapRes.rows.length === 0) {
      // Auto generate roadmap using unified Career Intelligence context
      const careerContext = await getStudentCareerContext(userId);
      const targetRole = careerContext.target_role || 'Java Backend Developer';

      const generated = await generateRoadmapWithAI({
        target_role: targetRole,
        skills: careerContext.skills,
        weak_skills: careerContext.weak_skills,
        strong_skills: careerContext.strong_skills,
        projects: careerContext.projects,
        career_readiness_score: careerContext.career_readiness_score
      });

      const newRoadmap = await query(
        `INSERT INTO roadmaps (user_id, target_role, roadmap_title)
         VALUES ($1, $2, $3) RETURNING *`,
        [userId, targetRole, `${targetRole} Mastery Roadmap`]
      );
      const roadmapId = newRoadmap.rows[0].id;

      const modules = [];
      for (const m of generated.modules) {
        const mRes = await query(
          `INSERT INTO roadmap_modules (roadmap_id, step_order, topic, description, resources, practice_tasks)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
           RETURNING *`,
          [roadmapId, m.step, m.topic, m.description, JSON.stringify(m.resources || []), JSON.stringify(m.practice_tasks || [])]
        );
        modules.push(mRes.rows[0]);
      }

      return res.json({
        roadmap: newRoadmap.rows[0],
        modules,
        weekly_focus: [
          { week: 'Week 1', items: ['SQL JOIN Optimization', 'PostgreSQL Indexing', 'Spring Security Fundamentals'] },
          { week: 'Week 2', items: ['Redis Caching Strategies', 'REST API Idempotency', 'Microservices Communication'] },
          { week: 'Week 3', items: ['System Design Scalability', 'Kafka Partitioning', 'Docker Container Orchestration'] }
        ]
      });
    }

    const roadmap = roadmapRes.rows[0];
    const modulesRes = await query(
      `SELECT m.*, COALESCE(p.completed, false) as is_completed
       FROM roadmap_modules m
       LEFT JOIN roadmap_progress p ON p.module_id = m.id AND p.user_id = $1
       WHERE m.roadmap_id = $2
       ORDER BY m.step_order ASC`,
      [userId, roadmap.id]
    );

    res.json({
      roadmap,
      modules: modulesRes.rows,
      weekly_focus: [
        { week: 'Week 1', items: ['SQL JOIN Optimization', 'PostgreSQL Indexing', 'Spring Security Fundamentals'] },
        { week: 'Week 2', items: ['Redis Caching Strategies', 'REST API Idempotency', 'Microservices Communication'] },
        { week: 'Week 3', items: ['System Design Scalability', 'Kafka Partitioning', 'Docker Container Orchestration'] }
      ]
    });
  } catch (err) {
    console.error('Roadmap error:', err);
    res.status(500).json({ error: 'Failed to fetch learning roadmap' });
  }
});

// Toggle module completion
router.post('/toggle-module/:moduleId', async (req, res) => {
  try {
    const userId = req.user.id;
    const moduleId = req.params.moduleId;

    const existing = await query('SELECT * FROM roadmap_progress WHERE module_id = $1 AND user_id = $2', [moduleId, userId]);
    if (existing.rows.length > 0) {
      const newState = !existing.rows[0].completed;
      await query(
        'UPDATE roadmap_progress SET completed = $1, completed_at = CURRENT_TIMESTAMP WHERE module_id = $2 AND user_id = $3',
        [newState, moduleId, userId]
      );
      return res.json({ completed: newState });
    } else {
      await query(
        'INSERT INTO roadmap_progress (module_id, user_id, completed, completed_at) VALUES ($1, $2, true, CURRENT_TIMESTAMP)',
        [moduleId, userId]
      );
      return res.json({ completed: true });
    }
  } catch (err) {
    console.error('Toggle module error:', err);
    res.status(500).json({ error: 'Failed to update module progress' });
  }
});

// Regenerate roadmap with latest career intelligence
router.post('/regenerate', async (req, res) => {
  try {
    const userId = req.user.id;
    const careerContext = await getStudentCareerContext(userId);
    const targetRole = req.body.target_role || careerContext.target_role || 'Java Backend Developer';

    const generated = await generateRoadmapWithAI({
      target_role: targetRole,
      skills: careerContext.skills,
      weak_skills: careerContext.weak_skills,
      strong_skills: careerContext.strong_skills,
      projects: careerContext.projects,
      career_readiness_score: careerContext.career_readiness_score
    });

    const newRoadmap = await query(
      `INSERT INTO roadmaps (user_id, target_role, roadmap_title)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, targetRole, `${targetRole} Mastery Roadmap`]
    );
    const roadmapId = newRoadmap.rows[0].id;

    const modules = [];
    for (const m of (generated.modules || [])) {
      const mRes = await query(
        `INSERT INTO roadmap_modules (roadmap_id, step_order, topic, description, resources, practice_tasks)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
         RETURNING *`,
        [roadmapId, m.step, m.topic, m.description, JSON.stringify(m.resources || []), JSON.stringify(m.practice_tasks || [])]
      );
      modules.push(mRes.rows[0]);
    }

    await recordAgentRun(userId, 'Roadmap Architect Agent', 'success', { targetRole }, { modules_count: modules.length });

    res.json({
      roadmap: newRoadmap.rows[0],
      modules
    });
  } catch (err) {
    console.error('Regenerate roadmap error:', err);
    res.status(500).json({ error: 'Failed to regenerate learning roadmap' });
  }
});

export default router;
