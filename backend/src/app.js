import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import resumeRouter from './routes/resume.js';
import interviewsRouter from './routes/interviews.js';
import codingRouter from './routes/coding.js';
import quizzesRouter from './routes/quizzes.js';
import analyticsRouter from './routes/analytics.js';
import roadmapsRouter from './routes/roadmaps.js';
import { authMiddleware } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads directory
app.use('/uploads', express.static(path.resolve('uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Advanced Career Pilot Node.js Backend',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/profile', authMiddleware, profileRouter);
app.use('/api/resume', authMiddleware, resumeRouter);
app.use('/api/interviews', authMiddleware, interviewsRouter);
app.use('/api/coding', authMiddleware, codingRouter);
app.use('/api/quizzes', authMiddleware, quizzesRouter);
app.use('/api/analytics', authMiddleware, analyticsRouter);
app.use('/api/roadmaps', authMiddleware, roadmapsRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
