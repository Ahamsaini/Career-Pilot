"""
Skill Intelligence Agent — Evidence-Weighted Scoring & Career Readiness Synthesis
Computes multi-agent aggregated competency across coding, interviews, quizzes, and resume projects.
"""
from typing import Dict, List, Any, Optional

WEIGHTS = {
    "coding": 1.2,
    "interview": 1.0,
    "quiz": 0.8,
    "resume": 0.5,
    "manual": 0.5
}

STRONG_THRESHOLD = 75.0
WEAK_THRESHOLD = 60.0

ROLE_REQUIRED_SKILLS = {
    "Java Backend Developer": ["Java", "Spring Boot", "PostgreSQL", "REST APIs", "Microservices", "Docker", "Git"],
    "Frontend Developer": ["JavaScript", "TypeScript", "React", "CSS", "HTML", "Redux", "Tailwind CSS"],
    "Full Stack Developer": ["JavaScript", "React", "Node.js", "Express", "PostgreSQL", "MongoDB", "Docker"],
    "Python Developer": ["Python", "FastAPI", "Django", "PostgreSQL", "Docker", "Data Structures", "Git"],
    "Data Scientist / AI Engineer": ["Python", "Machine Learning", "PyTorch", "Pandas", "SQL", "Deep Learning", "Statistics"],
    "DevOps Engineer": ["Docker", "Kubernetes", "Linux", "CI/CD", "AWS", "Terraform", "Bash"]
}

def calculate_evidence_weighted_score(evidence_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Given a list of skill evidence records:
    [
        {"skill_name": "Java", "source": "coding", "score": 85, "weight": 1.2},
        {"skill_name": "Java", "source": "interview", "score": 70, "weight": 1.0},
        {"skill_name": "Java", "source": "quiz", "score": 90, "weight": 0.8}
    ]
    Computes weighted average score for each skill, identifies strong and weak skills,
    and returns comprehensive analytics.
    """
    skill_buckets: Dict[str, List[Dict[str, Any]]] = {}

    for ev in evidence_list:
        skill = ev.get("skill_name", "").strip()
        if not skill:
            continue
        skill_key = skill.title()
        if skill_key not in skill_buckets:
            skill_buckets[skill_key] = []
        skill_buckets[skill_key].append(ev)

    skill_profiles = []
    strong_skills = []
    weak_skills = []

    for skill_name, items in skill_buckets.items():
        total_weight = 0.0
        weighted_sum = 0.0

        for item in items:
            src = item.get("source", "manual").lower()
            w = float(item.get("weight") or WEIGHTS.get(src, 1.0))
            score = float(item.get("score", 50.0))
            weighted_sum += (score * w)
            total_weight += w

        final_score = round(weighted_sum / total_weight, 1) if total_weight > 0 else 50.0
        is_strong = final_score >= STRONG_THRESHOLD
        needs_practice = final_score < WEAK_THRESHOLD

        if is_strong:
            strong_skills.append(skill_name)
        if needs_practice:
            weak_skills.append(skill_name)

        skill_profiles.append({
            "skill_name": skill_name,
            "score_percentage": final_score,
            "is_strong": is_strong,
            "needs_practice": needs_practice,
            "evidence_count": len(items),
            "sources": list(set([i.get("source") for i in items if i.get("source")]))
        })

    # Sort descending by score
    skill_profiles.sort(key=lambda x: x["score_percentage"], reverse=True)

    return {
        "skills": skill_profiles,
        "strong_skills": strong_skills,
        "weak_skills": weak_skills,
        "total_skills_tracked": len(skill_profiles)
    }

def compute_career_readiness(
    target_role: str,
    skill_profiles: List[Dict[str, Any]],
    interview_avg: float = 0.0,
    coding_pass_rate: float = 0.0,
    quiz_avg: float = 0.0
) -> Dict[str, Any]:
    """
    Computes holistic Career Readiness Index (0 - 100) and role gap analysis.
    """
    # 1. Target Role Skill Coverage
    role_benchmarks = ROLE_REQUIRED_SKILLS.get(
        target_role,
        ["Data Structures", "Algorithms", "System Design", "Databases", "Git", "Problem Solving"]
    )

    skill_map = {s["skill_name"].lower(): s["score_percentage"] for s in skill_profiles}
    
    covered_skills = []
    missing_skills = []
    skill_score_sum = 0.0

    for req in role_benchmarks:
        req_lower = req.lower()
        if req_lower in skill_map:
            score = skill_map[req_lower]
            covered_skills.append({"name": req, "score": score})
            skill_score_sum += score
        else:
            missing_skills.append(req)
            skill_score_sum += 20.0  # baseline penalty for missing required skill

    benchmark_skill_score = skill_score_sum / len(role_benchmarks) if role_benchmarks else 50.0

    # 2. Weighted Overall Readiness Formula:
    # Skill Coverage & Proficiency: 40%
    # Coding Sandbox Pass Rate: 25%
    # Technical Interview Performance: 20%
    # Quiz Knowledge: 15%
    readiness_components = []
    weights_sum = 0.0
    weighted_total = 0.0

    # Skills component (always available if skills exist)
    weighted_total += (benchmark_skill_score * 0.40)
    weights_sum += 0.40
    readiness_components.append({"component": "Skills Proficiency & Role Coverage", "score": round(benchmark_skill_score, 1), "weight": 0.40})

    if coding_pass_rate > 0:
        weighted_total += (coding_pass_rate * 0.25)
        weights_sum += 0.25
        readiness_components.append({"component": "Coding Challenge Performance", "score": round(coding_pass_rate, 1), "weight": 0.25})
    else:
        # redistribute weight to skills
        weighted_total += (benchmark_skill_score * 0.25)
        weights_sum += 0.25

    if interview_avg > 0:
        weighted_total += (interview_avg * 0.20)
        weights_sum += 0.20
        readiness_components.append({"component": "Technical Interview Readiness", "score": round(interview_avg, 1), "weight": 0.20})
    else:
        weighted_total += (benchmark_skill_score * 0.20)
        weights_sum += 0.20

    if quiz_avg > 0:
        weighted_total += (quiz_avg * 0.15)
        weights_sum += 0.15
        readiness_components.append({"component": "Core CS Quiz Knowledge", "score": round(quiz_avg, 1), "weight": 0.15})
    else:
        weighted_total += (benchmark_skill_score * 0.15)
        weights_sum += 0.15

    overall_readiness = round(weighted_total / weights_sum, 1) if weights_sum > 0 else 50.0

    return {
        "readiness_score": min(100.0, max(0.0, overall_readiness)),
        "target_role": target_role,
        "target_skills_covered": covered_skills,
        "target_skills_missing": missing_skills,
        "components": readiness_components,
        "recommended_focus": missing_skills[:3] if missing_skills else [s["skill_name"] for s in skill_profiles if s.get("needs_practice")][:3]
    }
