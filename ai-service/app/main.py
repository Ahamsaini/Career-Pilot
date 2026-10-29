from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict

from app.config import PORT
from app.agents.resume_agent import parse_resume_text, extract_text_from_pdf, extract_text_from_docx
from app.agents.resume_builder_agent import research_agent, decision_agent, generator_agent, optimizer_agent
from app.agents.interview_graph import interview_engine
from app.agents.evaluation_agent import evaluate_student_answer
from app.agents.coding_sandbox import run_isolated_code
from app.agents.quiz_agent import generate_subject_quiz
from app.agents.roadmap_agent import generate_personalized_roadmap
from app.agents.skill_intelligence_agent import calculate_evidence_weighted_score, compute_career_readiness

app = FastAPI(
    title="Advanced Career Pilot AI Service",
    description="Agentic AI Backend powering dynamic interviews, evaluation, code execution, and roadmaps",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "service": "Advanced Career Pilot AI Service", "version": "2.0.0"}

# Pydantic Request Models
class ResumeParseRequest(BaseModel):
    resume_text: str

class InterviewStateRequest(BaseModel):
    student_id: Optional[str] = None
    target_role: Optional[str] = "Backend Developer"
    difficulty: Optional[str] = "medium"
    remaining_time: Optional[int] = 1800
    skills: Optional[List[str]] = []
    weak_skills: Optional[List[str]] = []
    strong_skills: Optional[List[str]] = []
    projects: Optional[List[Dict[str, Any]]] = []
    asked_questions: Optional[List[Dict[str, Any]]] = []
    history: Optional[List[Dict[str, Any]]] = []

class AnswerEvaluationRequest(BaseModel):
    question: str
    topic: Optional[str] = "General"
    student_answer: str
    duration_seconds: Optional[int] = 60

class CodeEvaluationRequest(BaseModel):
    code: str
    language: Optional[str] = "python"
    question_id: Optional[str] = ""

class QuizGenerateRequest(BaseModel):
    subject: Optional[str] = "DBMS"
    subjects: Optional[List[str]] = []
    difficulty: str = "medium"
    count: int = 5
    duration_minutes: Optional[int] = 10
    weak_skills: Optional[List[str]] = []
    target_role: Optional[str] = "Software Engineer"

class RoadmapGenerateRequest(BaseModel):
    target_role: str = "Java Backend Developer"
    skills: Optional[List[str]] = []
    weak_skills: Optional[List[str]] = []
    strong_skills: Optional[List[str]] = []
    projects: Optional[List[Dict[str, Any]]] = []
    career_readiness_score: Optional[float] = 65.0

class ResumeBuildRequest(BaseModel):
    student_name: Optional[str] = "Aham Saini"
    target_role: str = "Java Backend Developer"
    experience_level: Optional[str] = "fresher"
    experience_years: Optional[float] = 0.0
    skills: Optional[List[str]] = []
    projects: Optional[List[Dict[str, Any]]] = []
    education: Optional[List[str]] = []

class SkillEvidencePayload(BaseModel):
    evidence: List[Dict[str, Any]]

class CareerReadinessPayload(BaseModel):
    target_role: str = "Java Backend Developer"
    skills: List[Dict[str, Any]] = []
    interview_avg: Optional[float] = 0.0
    coding_pass_rate: Optional[float] = 0.0
    quiz_avg: Optional[float] = 0.0


@app.get("/api/ai/health")
def health_check():
    return {
        "status": "online",
        "service": "Career Pilot Connected Agentic AI Service",
        "version": "2.0.0",
        "engine": "LangGraph + Gemini / Grok / Tavily"
    }

@app.post("/api/ai/resume/parse")
def parse_resume(payload: ResumeParseRequest):
    try:
        return parse_resume_text(payload.resume_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/resume/parse-file")
async def parse_resume_file(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        filename = (file.filename or "").lower()
        extracted_text = ""

        if filename.endswith(".pdf"):
            extracted_text = extract_text_from_pdf(file_bytes)
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            extracted_text = extract_text_from_docx(file_bytes)
        else:
            try:
                extracted_text = file_bytes.decode("utf-8")
            except Exception:
                extracted_text = file_bytes.decode("latin-1", errors="ignore")

        if not extracted_text.strip():
            extracted_text = f"Resume Document: {file.filename}\nCandidate Resume Profile"

        parsed = parse_resume_text(extracted_text)
        return {
            "file_name": file.filename,
            "raw_text": extracted_text,
            "parsed": parsed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/resume/build-optimized")
def build_optimized_resume(payload: ResumeBuildRequest):
    try:
        level = decision_agent.decide_level(payload.experience_years, payload.experience_level)
        reference_data = research_agent.research_role(payload.target_role, level)
        raw_resume = generator_agent.generate(
            student_name=payload.student_name,
            target_role=payload.target_role,
            level=level,
            student_skills=payload.skills or ["Java", "Spring Boot", "PostgreSQL", "React"],
            projects=payload.projects or [],
            education=payload.education or ["B.Tech Computer Science"],
            reference_data=reference_data
        )
        optimized_result = optimizer_agent.optimize_loop(
            resume_content=raw_resume,
            target_role=payload.target_role,
            student_skills=payload.skills or ["Java", "Spring Boot", "PostgreSQL", "React"],
            reference_data=reference_data
        )
        return {
            "status": "success",
            "reference_insights": reference_data,
            "result": optimized_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/interview/next-question")
def next_question(payload: InterviewStateRequest):
    try:
        state = payload.model_dump()
        return interview_engine.decide_next_question(state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/interview/evaluate-answer")
def evaluate_answer(payload: AnswerEvaluationRequest):
    try:
        return evaluate_student_answer(
            question=payload.question,
            topic=payload.topic,
            student_answer=payload.student_answer,
            duration_seconds=payload.duration_seconds
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/coding/evaluate")
def evaluate_code(payload: CodeEvaluationRequest):
    try:
        return run_isolated_code(
            code=payload.code,
            language=payload.language,
            question_id=payload.question_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/quiz/generate")
def generate_quiz(payload: QuizGenerateRequest):
    try:
        return generate_subject_quiz(
            subject=payload.subject or "DBMS",
            subjects=payload.subjects,
            difficulty=payload.difficulty,
            count=payload.count,
            weak_skills=payload.weak_skills,
            target_role=payload.target_role
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/roadmap/generate")
def generate_roadmap(payload: RoadmapGenerateRequest):
    try:
        return generate_personalized_roadmap(payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/skills/evaluate")
def evaluate_skills(payload: SkillEvidencePayload):
    try:
        return calculate_evidence_weighted_score(payload.evidence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/career/readiness")
def assess_career_readiness(payload: CareerReadinessPayload):
    try:
        return compute_career_readiness(
            target_role=payload.target_role,
            skill_profiles=payload.skills,
            interview_avg=payload.interview_avg or 0.0,
            coding_pass_rate=payload.coding_pass_rate or 0.0,
            quiz_avg=payload.quiz_avg or 0.0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
