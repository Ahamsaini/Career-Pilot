"""
CareerState — The Unified TypedDict Shared Across All Agents in the Ecosystem.
Every agent receives and updates this state.
"""
from typing import TypedDict, List, Dict, Any, Optional

class SkillInfo(TypedDict, total=False):
    name: str
    proficiency: str  # beginner, intermediate, advanced
    score: float       # 0 - 100
    evidence_count: int
    is_strong: bool
    needs_practice: bool

class ProjectInfo(TypedDict, total=False):
    title: str
    description: str
    technologies: List[str]
    github_url: Optional[str]
    demo_url: Optional[str]

class QuestionRecord(TypedDict, total=False):
    question_text: str
    topic: str
    score: Optional[float]
    feedback: Optional[str]

class CareerState(TypedDict, total=False):
    # Core Student Identification
    student_id: str
    student_name: str
    target_role: str
    experience_level: str  # fresher, experienced
    experience_years: float
    bio: Optional[str]
    college: Optional[str]
    degree: Optional[str]

    # Skill Knowledge Graph
    skills: List[str]
    strong_skills: List[str]
    weak_skills: List[str]
    skills_detailed: List[Dict[str, Any]]

    # Persistent Assets (Resume-Once)
    resume_id: Optional[str]
    resume_file_name: Optional[str]
    raw_resume_text: Optional[str]
    parsed_resume: Optional[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    education: List[Dict[str, Any]]

    # Multi-Agent Performance Telemetry
    career_readiness_score: float
    interview_count: int
    interview_avg_score: float
    asked_questions: List[Dict[str, Any]]
    past_topics_covered: List[str]
    
    quiz_count: int
    quiz_avg_score: float
    missed_quiz_concepts: List[str]

    coding_count: int
    coding_pass_rate: float
    languages_tested: List[str]

    # Dynamic Agent Runtime Context
    current_agent: Optional[str]
    current_step: Optional[str]
    agent_scratchpad: Dict[str, Any]
