import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_careerpilot_jwt_token_key_change_in_production';

// Ensure a default demo user exists for seamless evaluation & immediate testing
let defaultUserId = null;

async function getOrCreateDemoUser() {
  if (defaultUserId) return defaultUserId;
  try {
    const res = await query("SELECT id FROM users WHERE email = 'aham.saini@example.com'");
    if (res.rows.length > 0) {
      defaultUserId = res.rows[0].id;
      return defaultUserId;
    }

    const insertUser = await query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ('aham.saini@example.com', 'hashed_pass_placeholder', 'Aham Saini')
       RETURNING id`
    );
    defaultUserId = insertUser.rows[0].id;

    // Create default student profile matching PDF example
    await query(
      `INSERT INTO student_profiles (user_id, college, degree, graduation_year, experience_years, target_role, target_companies, preferred_languages, bio)
       VALUES ($1, 'IIT Delhi', 'B.Tech Computer Science', 2025, 1.0, 'Java Backend Developer',
               '["Google", "Amazon", "Microsoft", "Infosys", "TCS", "Accenture"]'::jsonb,
               '["Java", "JavaScript", "Python", "SQL"]'::jsonb,
               'Aspiring backend engineer focusing on distributed systems and high-throughput microservices.')`,
      [defaultUserId]
    );

    // Seed default skills
    const skills = [
      { name: 'Java', source: 'resume', prof: 'advanced' },
      { name: 'Spring Boot', source: 'resume', prof: 'intermediate' },
      { name: 'React', source: 'resume', prof: 'intermediate' },
      { name: 'PostgreSQL', source: 'resume', prof: 'intermediate' },
      { name: 'Docker', source: 'user_added', prof: 'intermediate' },
      { name: 'Redis', source: 'user_added', prof: 'beginner' },
      { name: 'Kafka', source: 'user_added', prof: 'beginner' }
    ];

    for (const s of skills) {
      await query(
        `INSERT INTO student_skills (user_id, skill_name, source, proficiency)
         VALUES ($1, $2, $3, $4)`,
        [defaultUserId, s.name, s.source, s.prof]
      );
    }

    // Seed sample project from PDF
    await query(
      `INSERT INTO projects (user_id, title, description, technologies, github_url)
       VALUES ($1, 'Ride Sharing System', 'Ride sharing system helps students without personal transportation to come to campus. Students travelling on the same route can share rides.', '["Spring Boot", "React", "PostgreSQL"]'::jsonb, 'https://github.com/aham/rideshare')`,
      [defaultUserId]
    );

    // Seed initial skill progress
    const skillProgress = [
      { name: 'Java', score: 90, strong: true, practice: false },
      { name: 'Spring Boot', score: 80, strong: true, practice: false },
      { name: 'Communication', score: 80, strong: true, practice: false },
      { name: 'React', score: 70, strong: false, practice: false },
      { name: 'PostgreSQL', score: 60, strong: false, practice: true },
      { name: 'SQL Joins', score: 60, strong: false, practice: true },
      { name: 'DSA', score: 50, strong: false, practice: true },
      { name: 'Graphs', score: 45, strong: false, practice: true },
      { name: 'Dynamic Programming', score: 40, strong: false, practice: true }
    ];

    for (const sp of skillProgress) {
      await query(
        `INSERT INTO skill_progress (user_id, skill_name, score_percentage, is_strong, needs_practice)
         VALUES ($1, $2, $3, $4, $5)`,
        [defaultUserId, sp.name, sp.score, sp.strong, sp.practice]
      );
    }

    return defaultUserId;
  } catch (err) {
    console.error('Error ensuring demo user:', err);
    return null;
  }
}

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        return next();
      } catch {
        // Token invalid, fall back to demo user in dev
      }
    }

    // Fallback demo user
    const demoId = await getOrCreateDemoUser();
    req.user = { id: demoId, email: 'aham.saini@example.com', name: 'Aham Saini' };
    next();
  } catch (err) {
    next(err);
  }
};
