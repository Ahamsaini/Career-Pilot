-- =============================================================================
-- Migration V2: Connected Agentic AI Ecosystem Schema Additions
-- =============================================================================

-- 1. Skill Evidence (Multi-Agent Evidence-Weighted Scoring)
CREATE TABLE IF NOT EXISTS skill_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'interview', 'quiz', 'coding', 'resume', 'manual'
    source_id UUID,              -- Reference to interview, quiz, or code submission
    score NUMERIC(5, 2) NOT NULL, -- 0-100
    weight NUMERIC(3, 2) DEFAULT 1.0, -- e.g., coding=1.2, interview=1.0, quiz=0.8, resume=0.5
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skill_evidence_user ON skill_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_skill ON skill_evidence(user_id, skill_name);

-- 2. Career Events (Cross-Agent Asynchronous & Synchronous Propagation)
CREATE TABLE IF NOT EXISTS career_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'RESUME_PARSED', 'INTERVIEW_COMPLETED', 'CODE_SUBMITTED', 'QUIZ_FINISHED', 'SKILL_EVALUATED'
    payload JSONB DEFAULT '{}'::jsonb,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_events_user ON career_events(user_id);
CREATE INDEX IF NOT EXISTS idx_career_events_type ON career_events(event_type);

-- 3. Agent Runs (Observability, Telemetry & Multi-Agent History)
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    run_status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed', 'running'
    input_context JSONB DEFAULT '{}'::jsonb,
    output_summary JSONB DEFAULT '{}'::jsonb,
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_name);

-- 4. Resume Versions (Single Source of Truth, History & Active Tracking)
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

-- 5. Generated Resumes (AI Tailored Resumes)
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

-- 6. Enhance student_profiles with aggregate career score & radar cache
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS career_readiness_score NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS weak_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS strong_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS target_readiness JSONB DEFAULT '{}'::jsonb;

-- 7. Enhance interviews table with topics_covered and resume_reference
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS questions_asked JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS topics_covered JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS final_score NUMERIC(5, 2) DEFAULT 0;
