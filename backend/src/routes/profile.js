import { Router } from 'express';
import { query } from '../config/db.js';

const router = Router();

// Get complete student career profile
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const profileRes = await query('SELECT * FROM student_profiles WHERE user_id = $1', [userId]);
    const skillsRes = await query('SELECT * FROM student_skills WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    const projectsRes = await query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    const userRes = await query('SELECT full_name, email FROM users WHERE id = $1', [userId]);

    res.json({
      user: userRes.rows[0],
      profile: profileRes.rows[0] || {},
      skills: skillsRes.rows,
      projects: projectsRes.rows
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch student profile' });
  }
});

// Update basic profile details
router.put('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { college, degree, graduation_year, experience_years, target_role, target_companies, preferred_languages, bio } = req.body;

    const updated = await query(
      `UPDATE student_profiles
       SET college = COALESCE($1, college),
           degree = COALESCE($2, degree),
           graduation_year = COALESCE($3, graduation_year),
           experience_years = COALESCE($4, experience_years),
           target_role = COALESCE($5, target_role),
           target_companies = COALESCE($6::jsonb, target_companies),
           preferred_languages = COALESCE($7::jsonb, preferred_languages),
           bio = COALESCE($8, bio),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $9
       RETURNING *`,
      [college, degree, graduation_year, experience_years, target_role, JSON.stringify(target_companies || []), JSON.stringify(preferred_languages || []), bio, userId]
    );

    res.json({ profile: updated.rows[0] });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Add student skill (user_added or resume)
router.post('/skills', async (req, res) => {
  try {
    const userId = req.user.id;
    const { skill_name, proficiency = 'intermediate', source = 'user_added' } = req.body;

    if (!skill_name) {
      return res.status(400).json({ error: 'skill_name is required' });
    }

    const inserted = await query(
      `INSERT INTO student_skills (user_id, skill_name, source, proficiency)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, skill_name, source, proficiency]
    );

    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error('Error adding skill:', err);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// Delete student skill
router.delete('/skills/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const skillId = req.params.id;
    await query('DELETE FROM student_skills WHERE id = $1 AND user_id = $2', [skillId, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting skill:', err);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// Add project
router.post('/projects', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, technologies = [], github_url, demo_url } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Project title is required' });
    }

    const inserted = await query(
      `INSERT INTO projects (user_id, title, description, technologies, github_url, demo_url)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING *`,
      [userId, title, description, JSON.stringify(technologies), github_url, demo_url]
    );

    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error('Error adding project:', err);
    res.status(500).json({ error: 'Failed to add project' });
  }
});

// Delete project
router.delete('/projects/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id;
    await query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
