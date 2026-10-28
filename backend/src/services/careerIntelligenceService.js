import { query } from '../config/db.js';

const FASTAPI_AI_URL = process.env.FASTAPI_AI_URL || 'http://localhost:8000';

/**
 * Career Intelligence Service
 * Single source of truth for the student's unified Career Profile.
 * Aggregates resume, skills, evidence, projects, interview history, coding stats, and quiz scores.
 */
export async function getStudentCareerContext(userId) {
  try {
    // 1. Student Profile & Bio
    const profileRes = await query(
      `SELECT sp.*, u.full_name, u.email
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1`,
      [userId]
    );
    const profile = profileRes.rows[0] || {};

    // 2. Active / Latest Resume
    const resumeRes = await query(
      `SELECT id, file_name, file_path, raw_text, parsed_json, uploaded_at
       FROM resumes
       WHERE user_id = $1
       ORDER BY uploaded_at DESC
       LIMIT 1`,
      [userId]
    );
    const activeResume = resumeRes.rows[0] || null;

    // 3. Projects (extracted from resume or user added)
    const projectsRes = await query(
      `SELECT id, title, description, technologies, github_url, demo_url
       FROM projects
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // 4. Skills & Computed Progress
    const skillsRes = await query(
      `SELECT skill_name, score_percentage, is_strong, needs_practice, last_updated
       FROM skill_progress
       WHERE user_id = $1
       ORDER BY score_percentage DESC`,
      [userId]
    );

    // If skill_progress is empty, fallback to student_skills
    let skillsList = [];
    let strongSkills = [];
    let weakSkills = [];

    const resumeSkills = activeResume?.parsed_json?.skills || [];

    if (skillsRes.rows.length > 0) {
      skillsList = [...new Set([...resumeSkills, ...skillsRes.rows.map(s => s.skill_name)])];
      strongSkills = skillsRes.rows.filter(s => s.is_strong || s.score_percentage >= 75).map(s => s.skill_name);
      weakSkills = skillsRes.rows.filter(s => s.needs_practice || s.score_percentage < 60).map(s => s.skill_name);
    } else {
      const basicSkills = await query(
        `SELECT skill_name, proficiency FROM student_skills WHERE user_id = $1`,
        [userId]
      );
      skillsList = [...new Set([...resumeSkills, ...basicSkills.rows.map(s => s.skill_name)])];
    }

    // Projects: Prioritize active uploaded resume projects
    const resumeProjects = activeResume?.parsed_json?.projects || [];
    let unifiedProjects = [];
    if (resumeProjects.length > 0) {
      unifiedProjects = resumeProjects;
    } else if (projectsRes.rows.length > 0) {
      unifiedProjects = projectsRes.rows;
    }

    // Target role: prioritize uploaded resume target role over generic default
    const dynamicTargetRole = activeResume?.parsed_json?.target_role || profile.target_role || 'Software Engineer';

    // 5. Recent Skill Evidence (last 25 records across all agents)
    const evidenceRes = await query(
      `SELECT skill_name, source, score, weight, notes, recorded_at
       FROM skill_evidence
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 25`,
      [userId]
    );

    // 6. Interview Telemetry
    const interviewStatsRes = await query(
      `SELECT COUNT(id) as total_interviews,
              COALESCE(AVG(final_score), 0) as avg_score
       FROM interviews
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    const interviewStats = interviewStatsRes.rows[0] || { total_interviews: 0, avg_score: 0 };

    // Past questions asked to prevent deduplication
    const pastQuestionsRes = await query(
      `SELECT q.topic, q.question_text
       FROM interview_questions q
       JOIN interviews i ON i.id = q.interview_id
       WHERE i.user_id = $1
       ORDER BY q.created_at DESC
       LIMIT 20`,
      [userId]
    );

    // 7. Coding Sandbox Telemetry
    const codingStatsRes = await query(
      `SELECT COUNT(s.id) as total_submissions,
              COUNT(CASE WHEN e.correctness_pct >= 100 THEN 1 END) as passed_submissions,
              COALESCE(AVG(e.correctness_pct), 0) as avg_correctness
       FROM coding_submissions s
       LEFT JOIN code_evaluations e ON e.submission_id = s.id
       WHERE s.user_id = $1`,
      [userId]
    );
    const codingStats = codingStatsRes.rows[0] || { total_submissions: 0, passed_submissions: 0, avg_correctness: 0 };

    // 8. Quiz Telemetry
    const quizStatsRes = await query(
      `SELECT COUNT(id) as total_attempts,
              COALESCE(AVG(score), 0) as avg_score
       FROM quiz_attempts
       WHERE user_id = $1`,
      [userId]
    );
    const quizStats = quizStatsRes.rows[0] || { total_attempts: 0, avg_score: 0 };

    return {
      student_id: userId,
      student_name: profile.full_name || 'Student',
      email: profile.email || '',
      college: profile.college || '',
      degree: profile.degree || '',
      target_role: dynamicTargetRole,
      experience_years: parseFloat(profile.experience_years || 0),
      career_readiness_score: parseFloat(profile.career_readiness_score || 50),
      
      // Skills
      skills: skillsList.length ? skillsList : ['Problem Solving', 'Data Structures', 'Git', 'REST APIs'],
      strong_skills: strongSkills.length ? strongSkills : (profile.strong_skills || []),
      weak_skills: weakSkills.length ? weakSkills : (profile.weak_skills || []),
      skill_progress: skillsRes.rows.length ? skillsRes.rows : skillsList.map(s => ({
        skill_name: s,
        score_percentage: 65,
        is_strong: false,
        needs_practice: false
      })),
      skill_evidence: evidenceRes.rows,

      // Resume Assets (Resume-Once)
      has_resume: !!activeResume,
      active_resume: activeResume ? {
        id: activeResume.id,
        file_name: activeResume.file_name,
        parsed: activeResume.parsed_json,
        uploaded_at: activeResume.uploaded_at
      } : null,
      projects: unifiedProjects.length ? unifiedProjects : (activeResume?.parsed_json?.projects || []),

      // Cross-Agent Telemetry
      interviews: {
        count: parseInt(interviewStats.total_interviews, 10),
        avg_score: Math.round(parseFloat(interviewStats.avg_score)),
        past_questions: pastQuestionsRes.rows
      },
      coding: {
        total: parseInt(codingStats.total_submissions, 10),
        passed: parseInt(codingStats.passed_submissions, 10),
        pass_rate: Math.round(parseFloat(codingStats.avg_correctness))
      },
      quiz: {
        total: parseInt(quizStats.total_attempts, 10),
        avg_score: Math.round(parseFloat(quizStats.avg_score))
      }
    };
  } catch (err) {
    console.error('Error fetching student career context:', err);
    throw err;
  }
}

/**
 * Record skill evidence from any agent (coding, interview, quiz, resume)
 * and trigger evidence-weighted recomputation.
 */
export async function recordSkillEvidence(userId, skillName, source, sourceId, score, weight = 1.0, notes = '') {
  try {
    const cleanSkill = skillName.trim();
    if (!cleanSkill) return;

    // 1. Insert into skill_evidence
    await query(
      `INSERT INTO skill_evidence (user_id, skill_name, source, source_id, score, weight, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, cleanSkill, source, sourceId || null, score, weight, notes]
    );

    // 2. Add to student_skills if not existing
    const exists = await query(
      `SELECT id FROM student_skills WHERE user_id = $1 AND LOWER(skill_name) = LOWER($2)`,
      [userId, cleanSkill]
    );
    if (exists.rows.length === 0) {
      await query(
        `INSERT INTO student_skills (user_id, skill_name, source, proficiency)
         VALUES ($1, $2, $3, 'intermediate')`,
        [userId, cleanSkill, source]
      );
    }

    // 3. Recompute aggregate skills and readiness
    await recomputeStudentCompetency(userId);
  } catch (err) {
    console.error('Error recording skill evidence:', err);
  }
}

/**
 * Multi-Agent Evidence-Weighted Aggregation Engine
 * Calculates updated skill scores and updates profile & skill_progress tables.
 */
export async function recomputeStudentCompetency(userId) {
  try {
    const evidenceRes = await query(
      `SELECT skill_name, source, score, weight FROM skill_evidence WHERE user_id = $1`,
      [userId]
    );

    if (evidenceRes.rows.length === 0) return;

    // Call Python Skill Intelligence Agent
    let evaluationResult = null;
    try {
      const response = await fetch(`${FASTAPI_AI_URL}/api/ai/skills/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence: evidenceRes.rows })
      });
      if (response.ok) {
        evaluationResult = await response.json();
      }
    } catch (e) {
      console.warn('AI Skill Intelligence service call failed, falling back to local calculation:', e.message);
    }

    // Fallback local calculation if AI service unreachable
    if (!evaluationResult) {
      const buckets = {};
      evidenceRes.rows.forEach(ev => {
        const k = ev.skill_name;
        if (!buckets[k]) buckets[k] = [];
        buckets[k].push(ev);
      });

      const skills = [];
      const strong = [];
      const weak = [];

      Object.entries(buckets).forEach(([skill, items]) => {
        let totalW = 0;
        let sum = 0;
        items.forEach(i => {
          const w = parseFloat(i.weight) || 1.0;
          sum += parseFloat(i.score) * w;
          totalW += w;
        });
        const finalScore = totalW > 0 ? Math.round((sum / totalW) * 10) / 10 : 50;
        const isStrong = finalScore >= 75;
        const needsPractice = finalScore < 60;
        if (isStrong) strong.push(skill);
        if (needsPractice) weak.push(skill);
        skills.push({ skill_name: skill, score_percentage: finalScore, is_strong: isStrong, needs_practice: needsPractice });
      });

      evaluationResult = { skills, strong_skills: strong, weak_skills: weak };
    }

    // 4. Update skill_progress table
    for (const s of (evaluationResult.skills || [])) {
      const existing = await query(
        `SELECT id FROM skill_progress WHERE user_id = $1 AND LOWER(skill_name) = LOWER($2)`,
        [userId, s.skill_name]
      );
      if (existing.rows.length > 0) {
        await query(
          `UPDATE skill_progress
           SET score_percentage = $1, is_strong = $2, needs_practice = $3, last_updated = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [s.score_percentage, s.is_strong, s.needs_practice, existing.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO skill_progress (user_id, skill_name, score_percentage, is_strong, needs_practice)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, s.skill_name, s.score_percentage, s.is_strong, s.needs_practice]
        );
      }
    }

    // 5. Update student_profiles with strong_skills, weak_skills, and readiness
    const profileRes = await query(
      `SELECT target_role FROM student_profiles WHERE user_id = $1`,
      [userId]
    );
    const targetRole = profileRes.rows[0]?.target_role || 'Java Backend Developer';

    // Compute Career Readiness
    let readinessScore = 55;
    try {
      const readRes = await fetch(`${FASTAPI_AI_URL}/api/ai/career/readiness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_role: targetRole,
          skills: evaluationResult.skills
        })
      });
      if (readRes.ok) {
        const readData = await readRes.json();
        readinessScore = readData.readiness_score || 55;
      }
    } catch (e) {
      // Fallback
      const scores = evaluationResult.skills.map(s => s.score_percentage);
      if (scores.length) readinessScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    await query(
      `UPDATE student_profiles
       SET strong_skills = $1::jsonb,
           weak_skills = $2::jsonb,
           career_readiness_score = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4`,
      [
        JSON.stringify(evaluationResult.strong_skills || []),
        JSON.stringify(evaluationResult.weak_skills || []),
        readinessScore,
        userId
      ]
    );

    return {
      success: true,
      readiness_score: readinessScore,
      strong_skills: evaluationResult.strong_skills,
      weak_skills: evaluationResult.weak_skills
    };
  } catch (err) {
    console.error('Error recomputing student competency:', err);
  }
}
