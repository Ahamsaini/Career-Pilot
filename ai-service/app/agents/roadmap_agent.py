import json
from app.config import GEMINI_API_KEY

def generate_personalized_roadmap(student_data: dict) -> dict:
    """
    Connected Agentic Career Roadmap Engine.
    Synthesizes full Career Intelligence:
    - Target Role benchmarks
    - Identified weak skills & knowledge gaps (prioritized)
    - Already mastered strong skills (fast-tracked)
    - Resume projects to expand upon
    """
    target_role = student_data.get("target_role", "Java Backend Developer")
    current_skills = student_data.get("skills", ["Java", "Spring Boot", "PostgreSQL", "React"])
    weak_skills = student_data.get("weak_skills", [])
    strong_skills = student_data.get("strong_skills", [])
    projects = student_data.get("projects", [])
    career_score = student_data.get("career_readiness_score", 65.0)

    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = f"""
            You are a Principal Career Engineering Mentor.
            Design an intensive, highly personalized step-by-step career roadmap for a student aiming for '{target_role}'.

            Student Career Intelligence Context:
            - Target Role: {target_role}
            - Current Career Readiness: {career_score}%
            - Mastered Strong Skills: {strong_skills}
            - Critical Weak Skills / Gaps to Bridge: {weak_skills}
            - Existing Projects: {[p.get('title') or p.get('name') for p in projects[:3]]}

            REQUIREMENTS:
            1. Fast-track past skills they already master ({strong_skills}).
            2. Dedicate deep, hands-on modules to their weak areas ({weak_skills}).
            3. Suggest real architectural extensions to their existing projects.
            4. 5 to 7 logical progression steps with concrete documentation links and hands-on milestones.

            Return ONLY a valid JSON object:
            {{
                "target_role": "{target_role}",
                "custom_focus": "One sentence summary of primary focus",
                "modules": [
                    {{
                        "step": 1,
                        "topic": "Topic Name",
                        "description": "What to master and why",
                        "focus_type": "weakness_bridge" or "core_mastery" or "advanced_scaling",
                        "resources": ["Official Docs or Book"],
                        "practice_tasks": ["Concrete coding project or benchmark"]
                    }}
                ]
            }}
            """
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        except Exception as e:
            print(f"Gemini roadmap generator error: {e}")

    # High-quality dynamic fallback based on target role and weak skills
    primary_weak = weak_skills[0] if weak_skills else "System Design & Distributed Caching"
    second_weak = weak_skills[1] if len(weak_skills) > 1 else "Message Queues (Kafka/RabbitMQ)"

    return {
        "target_role": target_role,
        "custom_focus": f"Targeted roadmap bridging '{primary_weak}' and accelerating interview readiness for {target_role}.",
        "modules": [
            {
                "step": 1,
                "topic": f"High-Priority Gap Remediation: {primary_weak}",
                "description": f"Master the architectural fundamentals and production pitfalls of {primary_weak} identified as your key growth area.",
                "focus_type": "weakness_bridge",
                "resources": ["Official Documentation & Architectural RFCs", "Designing Data-Intensive Applications (Kleppmann)"],
                "practice_tasks": [f"Build an end-to-step reference service specifically demonstrating mastery of {primary_weak} with benchmark tests."]
            },
            {
                "step": 2,
                "topic": "Advanced Backend Architecture & Concurrency",
                "description": "Master non-blocking I/O, thread safety, thread pools, lock-free data structures, and connection pool sizing (HikariCP).",
                "focus_type": "core_mastery",
                "resources": ["Java Concurrency in Practice", "Spring Boot Internals Guide"],
                "practice_tasks": ["Implement a custom thread-safe rate limiter and token bucket filter."]
            },
            {
                "step": 3,
                "topic": f"Distributed State & Messaging: {second_weak}",
                "description": "Learn event-driven architecture, at-least-once delivery, partition strategies, and consumer group offset management.",
                "focus_type": "weakness_bridge",
                "resources": ["Kafka: The Definitive Guide", "Cloud Native Microservices Patterns"],
                "practice_tasks": ["Implement an asynchronous event-driven order processing pipeline with dead-letter queue (DLQ)."]
            },
            {
                "step": 4,
                "topic": "Database Optimization & High-Performance SQL",
                "description": "Master PostgreSQL EXPLAIN ANALYZE, composite B-Trees, GiST/GIN indexes, MVCC transaction isolation, and connection pooling.",
                "focus_type": "core_mastery",
                "resources": ["Use The Index, Luke!", "PostgreSQL Official Internals Documentation"],
                "practice_tasks": ["Optimize a slow query from 1,200ms to under 15ms using indexing and partial index strategies."]
            },
            {
                "step": 5,
                "topic": "System Design & Production Readiness",
                "description": "Design distributed rate limiting, circuit breakers (Resilience4j), observability (Prometheus/Grafana), and Docker/K8s deployment.",
                "focus_type": "advanced_scaling",
                "resources": ["System Design Interview by Alex Xu", "Site Reliability Engineering (Google SRE Book)"],
                "practice_tasks": ["Deploy a full-stack containerized cluster with health probes, alerting metrics, and graceful shutdown handling."]
            }
        ]
    }
