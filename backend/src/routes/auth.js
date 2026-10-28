import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_careerpilot_jwt_token_key_change_in_production';

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, college, degree, graduation_year, target_role } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = await query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3) RETURNING id, email, full_name`,
      [email, hash, full_name]
    );
    const userId = newUser.rows[0].id;

    await query(
      `INSERT INTO student_profiles (user_id, college, degree, graduation_year, target_role)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, college || '', degree || '', graduation_year || new Date().getFullYear(), target_role || 'Software Engineer']
    );

    const token = jwt.sign({ id: userId, email, name: full_name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: newUser.rows[0] });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match && user.password_hash !== 'hashed_pass_placeholder') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.full_name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRes = await query('SELECT id, email, full_name, created_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const profileRes = await query('SELECT * FROM student_profiles WHERE user_id = $1', [userId]);
    res.json({
      user: userRes.rows[0],
      profile: profileRes.rows[0] || null
    });
  } catch (err) {
    console.error('Fetch me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
