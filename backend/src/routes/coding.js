import { Router } from 'express';
import { query } from '../config/db.js';
import { evaluateCodeWithAI } from '../services/aiService.js';
import { emitCareerEvent, recordAgentRun } from '../services/careerEventsService.js';

const router = Router();

// Seed initial questions if empty
async function ensureCodingQuestions() {
  const check = await query('SELECT id FROM coding_questions LIMIT 1');
  if (check.rows.length === 0) {
    const questions = [
      {
        category: 'dsa',
        title: 'Longest Substring Without Repeating Characters',
        description: 'Given a string s, find the length of the longest substring without duplicate characters.',
        starter_code: 'def lengthOfLongestSubstring(s: str) -> int:\n    # Write your solution here\n    pass',
        difficulty: 'medium'
      },
      {
        category: 'database',
        title: 'Second Highest Salary',
        description: 'Write a SQL query to find the second highest salary from the Employee table. If there is no second highest salary, return null.',
        starter_code: 'SELECT MAX(salary) AS SecondHighestSalary\nFROM Employee\nWHERE salary < (SELECT MAX(salary) FROM Employee);',
        difficulty: 'medium'
      },
      {
        category: 'debugging',
        title: 'Fix Array Calculation Index Bug',
        description: 'The following function fails on off-by-one errors when computing rolling prefixes. Identify and repair the bug.',
        starter_code: 'def calculate(arr):\n    res = []\n    for i in range(len(arr)):\n        res.append(arr[i] * 2)\n    return res',
        difficulty: 'easy'
      },
      {
        category: 'programming',
        title: 'LRU Cache Implementation',
        description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with get(key) and put(key, value) in O(1) time.',
        starter_code: 'class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        pass\n    def put(self, key: int, value: int) -> None:\n        pass',
        difficulty: 'hard'
      }
    ];

    for (const q of questions) {
      await query(
        `INSERT INTO coding_questions (category, title, description, starter_code, difficulty)
         VALUES ($1, $2, $3, $4, $5)`,
        [q.category, q.title, q.description, q.starter_code, q.difficulty]
      );
    }
  }
}

// Get list of coding problems
router.get('/questions', async (req, res) => {
  try {
    await ensureCodingQuestions();
    const { category, difficulty } = req.query;
    let sql = 'SELECT * FROM coding_questions WHERE 1=1';
    const params = [];

    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (difficulty) {
      params.push(difficulty);
      sql += ` AND difficulty = $${params.length}`;
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching coding questions:', err);
    res.status(500).json({ error: 'Failed to fetch coding questions' });
  }
});

// Submit code for sandbox execution & evaluation
router.post('/submit', async (req, res) => {
  try {
    const userId = req.user.id;
    const { question_id, code, language = 'python' } = req.body;

    if (!question_id || !code) {
      return res.status(400).json({ error: 'question_id and code are required' });
    }

    // Save submission
    const subRes = await query(
      `INSERT INTO coding_submissions (coding_question_id, user_id, submitted_code, language)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [question_id, userId, code, language]
    );
    const submissionId = subRes.rows[0].id;

    // Run AI Evaluation / Sandbox
    const evalData = await evaluateCodeWithAI(code, language, question_id);

    // Save evaluation record
    const evalRes = await query(
      `INSERT INTO code_evaluations (submission_id, compiled, test_cases_passed, test_cases_total, correctness_pct, time_complexity, space_complexity, code_quality_score, compiler_output)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        submissionId,
        evalData.compiled,
        evalData.test_cases_passed,
        evalData.test_cases_total,
        evalData.correctness_pct,
        evalData.time_complexity,
        evalData.space_complexity,
        evalData.code_quality_score,
        evalData.compiler_output
      ]
    );

    // Fetch question title
    const qRes = await query('SELECT title, category FROM coding_questions WHERE id = $1', [question_id]);
    const questionTitle = qRes.rows[0]?.title || 'Algorithm Challenge';

    // Emit CODE_SUBMITTED event to update skill evidence graph (weight 1.2x)
    await emitCareerEvent(userId, 'CODE_SUBMITTED', {
      language,
      correctness_pct: evalData.correctness_pct || 0,
      question_title: questionTitle
    });

    await recordAgentRun(userId, 'Coding Sandbox Agent', 'success', { language, questionTitle }, { correctness_pct: evalData.correctness_pct });

    res.json({
      submission: subRes.rows[0],
      evaluation: evalRes.rows[0]
    });
  } catch (err) {
    console.error('Code evaluation submission error:', err);
    res.status(500).json({ error: 'Failed to evaluate code submission' });
  }
});

export default router;
