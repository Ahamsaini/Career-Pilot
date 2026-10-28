-- =============================================================================
-- Advanced Career Pilot - PostgreSQL Initialization Schema
-- Based on Project Plan Specifications (Section 25)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    college VARCHAR(255),
    degree VARCHAR(150),
    graduation_year INT,
    experience_years NUMERIC(4, 1) DEFAULT 0,
    target_role VARCHAR(150),
    target_companies JSONB DEFAULT '[]'::jsonb,
    preferred_languages JSONB DEFAULT '[]'::jsonb,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Resumes & Extracted Metadata
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    raw_text TEXT,
    parsed_json JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Resume Skills & Student Skills
CREATE TABLE IF NOT EXISTS resume_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    proficiency VARCHAR(50),
    category VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS student_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    source VARCHAR(50) DEFAULT 'user_added', -- 'resume' or 'user_added'
    proficiency VARCHAR(50) DEFAULT 'intermediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Student Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    technologies JSONB DEFAULT '[]'::jsonb,
    github_url TEXT,
    demo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Interviews & Dynamic Sessions
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    interview_type VARCHAR(50) DEFAULT 'technical', -- 'technical', 'hr', 'system_design'
    difficulty VARCHAR(20) DEFAULT 'medium',        -- 'easy', 'medium', 'hard'
    duration_minutes INT DEFAULT 30,
    target_role VARCHAR(150),
    status VARCHAR(50) DEFAULT 'in_progress',       -- 'in_progress', 'completed', 'cancelled'
    state_data JSONB DEFAULT '{}'::jsonb,           -- LangGraph state persistence
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS interview_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    question_order INT NOT NULL,
    topic VARCHAR(100),
    question_text TEXT NOT NULL,
    allocated_time_seconds INT DEFAULT 180,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES interview_questions(id) ON DELETE CASCADE,
    raw_transcript TEXT,
    final_text TEXT,
    audio_url TEXT,
    duration_seconds INT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS answer_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id UUID REFERENCES interview_answers(id) ON DELETE CASCADE,
    technical_score NUMERIC(4, 1),
    communication_score NUMERIC(4, 1),
    grammar_score NUMERIC(4, 1),
    logic_score NUMERIC(4, 1),
    relevance_score NUMERIC(4, 1),
    feedback TEXT,
    expected_answer TEXT,
    detected_concepts JSONB DEFAULT '[]'::jsonb,
    delivery_metrics JSONB DEFAULT '{}'::jsonb, -- speaking pace, pauses, fillers
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Coding Interviews & Evaluation Sandbox
CREATE TABLE IF NOT EXISTS coding_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_company VARCHAR(100),
    language VARCHAR(50) DEFAULT 'python',
    level VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coding_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coding_interview_id UUID REFERENCES coding_interviews(id) ON DELETE CASCADE,
    category VARCHAR(50), -- 'dsa', 'programming', 'database', 'debugging'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    starter_code TEXT,
    solution_code TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coding_question_id UUID REFERENCES coding_questions(id) ON DELETE CASCADE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS coding_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coding_question_id UUID REFERENCES coding_questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    submitted_code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS code_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES coding_submissions(id) ON DELETE CASCADE,
    compiled BOOLEAN DEFAULT TRUE,
    test_cases_passed INT DEFAULT 0,
    test_cases_total INT DEFAULT 0,
    correctness_pct NUMERIC(5, 2) DEFAULT 0,
    time_complexity VARCHAR(50),
    space_complexity VARCHAR(50),
    code_quality_score NUMERIC(4, 1),
    compiler_output TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. AI Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium',
    total_questions INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_type VARCHAR(50), -- 'mcq', 'true_false', 'scenario', 'output_prediction'
    question_text TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    correct_option VARCHAR(100),
    explanation TEXT
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score NUMERIC(5, 2),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    time_taken_seconds INT
);

-- 9. Skill Assessments & Progress Engine
CREATE TABLE IF NOT EXISTS skill_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    overall_score NUMERIC(5, 2) DEFAULT 0,
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    score_percentage NUMERIC(5, 2) DEFAULT 0,
    is_strong BOOLEAN DEFAULT FALSE,
    needs_practice BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. AI Roadmaps & Modules
CREATE TABLE IF NOT EXISTS roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_role VARCHAR(150) NOT NULL,
    roadmap_title VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roadmap_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    topic VARCHAR(150) NOT NULL,
    description TEXT,
    resources JSONB DEFAULT '[]'::jsonb,
    practice_tasks JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'pending' -- 'pending', 'in_progress', 'completed'
);

CREATE TABLE IF NOT EXISTS roadmap_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES roadmap_modules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 11. Final Interview Reports
CREATE TABLE IF NOT EXISTS interview_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    overall_score NUMERIC(5, 2),
    technical_knowledge_score NUMERIC(5, 2),
    communication_score NUMERIC(5, 2),
    logical_reasoning_score NUMERIC(5, 2),
    grammar_score NUMERIC(5, 2),
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    detailed_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- V2: Connected Agentic AI Ecosystem Schema Additions
-- =============================================================================

-- 12. Skill Evidence (Multi-Agent Evidence-Weighted Scoring)
CREATE TABLE IF NOT EXISTS skill_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_id UUID,
    score NUMERIC(5, 2) NOT NULL,
    weight NUMERIC(3, 2) DEFAULT 1.0,
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skill_evidence_user ON skill_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_skill ON skill_evidence(user_id, skill_name);

-- 13. Career Events (Cross-Agent Asynchronous & Synchronous Propagation)
CREATE TABLE IF NOT EXISTS career_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_events_user ON career_events(user_id);
CREATE INDEX IF NOT EXISTS idx_career_events_type ON career_events(event_type);

-- 14. Agent Runs (Observability, Telemetry & Multi-Agent History)
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    run_status VARCHAR(50) DEFAULT 'success',
    input_context JSONB DEFAULT '{}'::jsonb,
    output_summary JSONB DEFAULT '{}'::jsonb,
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_name);

-- 15. Resume Versions (Single Source of Truth, History & Active Tracking)
CREATE TABLE IF NOT EXISTS resume_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    version_num INT DEFAULT 1,
    file_name VARCHAR(255),
    file_path TEXT,
    raw_text TEXT,
    parsed_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resume_versions_user ON resume_versions(user_id);

-- 16. Generated Resumes (AI Tailored Resumes)
CREATE TABLE IF NOT EXISTS generated_resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_role VARCHAR(150) NOT NULL,
    experience_level VARCHAR(50) DEFAULT 'fresher',
    resume_format VARCHAR(50) DEFAULT 'professional',
    markdown_content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generated_resumes_user ON generated_resumes(user_id);

ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS career_readiness_score NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS weak_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS strong_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS target_readiness JSONB DEFAULT '{}'::jsonb;

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS questions_asked JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS topics_covered JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS final_score NUMERIC(5, 2) DEFAULT 0;

