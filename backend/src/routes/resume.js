import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../config/db.js';
import { parseResumeWithAI, parseResumeFileWithAI, buildOptimizedResumeWithAI } from '../services/aiService.js';
import { emitCareerEvent, recordAgentRun } from '../services/careerEventsService.js';
import { getStudentCareerContext } from '../services/careerIntelligenceService.js';

const router = Router();

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Accept both 'file' (ResumeBuilderView) and 'resume' (ResumeView) field names
const upload = multer({ storage });
const uploadAny = multer({ storage }).fields([{ name: 'file', maxCount: 1 }, { name: 'resume', maxCount: 1 }]);

// Upload and parse resume (.pdf, .docx, .doc, .txt)
router.post('/upload', uploadAny, async (req, res) => {
  try {
    const userId = req.user.id;
    let rawText = req.body.raw_text || '';
    let fileName = 'pasted-resume.txt';
    let filePath = '';
    let parsed = null;

    // Support both 'file' and 'resume' field names
    const uploadedFile = req.files?.file?.[0] || req.files?.resume?.[0] || req.file || null;

    if (uploadedFile) {
      fileName = uploadedFile.originalname;
      filePath = uploadedFile.path;
      // Process through AI document intelligence (PDF/DOCX extraction)
      const fileResult = await parseResumeFileWithAI(filePath, fileName);
      parsed = fileResult.parsed;
      rawText = fileResult.raw_text || `Document: ${fileName}`;
    } else if (rawText) {
      // Process inline text
      parsed = await parseResumeWithAI(rawText);
    } else {
      return res.status(400).json({ error: 'Please provide either a resume file (.pdf, .docx) or text' });
    }

    // Save to PostgreSQL resumes table
    const resumeInsert = await query(
      `INSERT INTO resumes (user_id, file_name, file_path, raw_text, parsed_json)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [userId, fileName, filePath || 'inline', rawText, JSON.stringify(parsed)]
    );
    const resumeId = resumeInsert.rows[0].id;

    // Save extracted skills into resume_skills & student_skills
    if (parsed.skills && Array.isArray(parsed.skills)) {
      for (const skill of parsed.skills) {
        await query(
          `INSERT INTO resume_skills (resume_id, skill_name, proficiency)
           VALUES ($1, $2, 'intermediate')`,
          [resumeId, skill]
        );

        // Add to student skills if not existing
        const exists = await query(
          `SELECT id FROM student_skills WHERE user_id = $1 AND LOWER(skill_name) = LOWER($2)`,
          [userId, skill]
        );
        if (exists.rows.length === 0) {
          await query(
            `INSERT INTO student_skills (user_id, skill_name, source, proficiency)
             VALUES ($1, $2, 'resume', 'intermediate')`,
            [userId, skill]
          );
        }
      }
    }

    // Save extracted projects
    if (parsed.projects && Array.isArray(parsed.projects)) {
      for (const p of parsed.projects) {
        const title = typeof p === 'string' ? p : p.name;
        const techs = p.technologies || [];
        const desc = p.description || '';

        const projExists = await query(
          `SELECT id FROM projects WHERE user_id = $1 AND LOWER(title) = LOWER($2)`,
          [userId, title]
        );
        if (projExists.rows.length === 0) {
          await query(
            `INSERT INTO projects (user_id, resume_id, title, description, technologies)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
            [userId, resumeId, title, desc, JSON.stringify(techs)]
          );
        }
      }
    }

    // Update student profile target_role if inferred from resume
    if (parsed.target_role) {
      await query(
        `UPDATE student_profiles SET target_role = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [parsed.target_role, userId]
      );
    }

    // Update user full_name if extracted and user currently has generic/demo name
    if (parsed.name && parsed.name.trim().length > 2 && parsed.name !== 'Candidate') {
      await query(
        `UPDATE users SET full_name = $1 WHERE id = $2 AND (full_name = 'Aham Saini' OR full_name = 'Student' OR full_name IS NULL)`,
        [parsed.name.trim(), userId]
      );
    }

    // Emit RESUME_PARSED event to propagate skills & projects across the ecosystem
    await emitCareerEvent(userId, 'RESUME_PARSED', {
      skills: parsed.skills || [],
      projects: parsed.projects || [],
      target_role: parsed.target_role || null,
      resume_id: resumeId
    });

    await recordAgentRun(userId, 'Resume Parser Agent', 'success', { fileName }, { skills_count: parsed.skills?.length || 0 });

    res.json({
      success: true,
      resume: resumeInsert.rows[0],
      parsed
    });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

// Resume-Once: Get active saved resume with parsed context
router.get('/active', async (req, res) => {
  try {
    const userId = req.user.id;
    const context = await getStudentCareerContext(userId);
    res.json({
      has_resume: context.has_resume,
      active_resume: context.active_resume,
      skills: context.skills,
      projects: context.projects
    });
  } catch (err) {
    console.error('Error getting active resume:', err);
    res.status(500).json({ error: 'Failed to fetch active resume' });
  }
});

// Generate ATS-Optimized Target Job Resume using specialized agents
router.post('/build-optimized', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      target_role = 'Java Backend Developer',
      experience_level = 'fresher',
      resume_format = 'professional',
      // Pre-filled data from uploaded resume (optional override)
      skills: uploadedSkills,
      projects: uploadedProjects,
      education: uploadedEducation,
      student_name: uploadedName
    } = req.body;

    // Fetch verified profile, skills, and projects from DB
    const userRes = await query('SELECT full_name FROM users WHERE id = $1', [userId]);
    const profileRes = await query('SELECT * FROM student_profiles WHERE user_id = $1', [userId]);
    const skillsRes = await query('SELECT skill_name FROM student_skills WHERE user_id = $1', [userId]);
    const projectsRes = await query('SELECT title, description, technologies FROM projects WHERE user_id = $1', [userId]);

    const profile = profileRes.rows[0] || {};
    const studentName = uploadedName || userRes.rows[0]?.full_name || 'Aham Saini';

    // Merge uploaded resume data with DB profile (uploaded data takes priority)
    const mergedSkills = uploadedSkills?.length
      ? [...new Set([...uploadedSkills, ...skillsRes.rows.map(s => s.skill_name)])]
      : skillsRes.rows.map(s => s.skill_name);

    const mergedProjects = uploadedProjects?.length ? uploadedProjects : projectsRes.rows;
    const mergedEducation = uploadedEducation?.length
      ? uploadedEducation
      : [profile.degree ? `${profile.degree}, ${profile.college} (${profile.graduation_year})` : 'B.Tech Computer Science'];

    // Invoke Python AI Agents (Research Agent + Decision Agent + Generator Agent + ATS Optimizer Loop)
    const aiResponse = await buildOptimizedResumeWithAI({
      student_name: studentName,
      target_role,
      experience_level,
      experience_years: Number(profile.experience_years || 0),
      skills: mergedSkills,
      projects: mergedProjects,
      education: mergedEducation
    });

    const optResult = aiResponse.result || {};

    // Save into generated_resumes table in PostgreSQL
    const inserted = await query(
      `INSERT INTO generated_resumes (user_id, target_role, experience_level, resume_format, ats_score, resume_data, markdown_content, missing_skills, improvement_iterations)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9)
       RETURNING *`,
      [
        userId,
        target_role,
        experience_level,
        resume_format,
        optResult.ats_compatibility || 86.0,
        JSON.stringify(optResult.resume_data || {}),
        optResult.markdown_content || '',
        JSON.stringify(optResult.missing_skills_to_learn || []),
        optResult.iterations_performed || 2
      ]
    );

    res.json({
      success: true,
      resume: inserted.rows[0],
      reference_insights: aiResponse.reference_insights,
      result: optResult
    });
  } catch (err) {
    console.error('Error generating optimized resume:', err);
    res.status(500).json({ error: 'Failed to generate ATS-optimized resume' });
  }
});

// Get user generated resumes history
router.get('/generated', async (req, res) => {
  try {
    const userId = req.user.id;
    const resumes = await query('SELECT * FROM generated_resumes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(resumes.rows);
  } catch (err) {
    console.error('Error fetching generated resumes:', err);
    res.status(500).json({ error: 'Failed to fetch generated resumes' });
  }
});

// Get user resumes
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const resumes = await query('SELECT * FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC', [userId]);
    res.json(resumes.rows);
  } catch (err) {
    console.error('Error fetching resumes:', err);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

export default router;

