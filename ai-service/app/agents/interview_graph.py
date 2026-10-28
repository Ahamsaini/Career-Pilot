import json
import random
import re
from app.config import GEMINI_API_KEY
from app.agents.tavily_tool import search_interview_trends

GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash']

class LangGraphInterviewEngine:
    """
    Connected Agentic AI Interview Engine.
    Operates on the shared CareerState:
    - Truly Resume-Aware: dynamically probes actual candidate projects & declared technologies
    - Multi-Agent Informed: targets weak skills detected by quizzes or coding sandbox
    - Question Deduplication: avoids asking already asked questions across sessions
    - Adaptive Difficulty: auto-adjusts based on previous evaluation scores
    """

    def decide_next_question(self, state: dict) -> dict:
        asked_questions = state.get("asked_questions", [])
        skills = state.get("skills", [])
        weak_skills = state.get("weak_skills", [])
        strong_skills = state.get("strong_skills", [])
        projects = state.get("projects", [])
        target_role = state.get("target_role", "Software Engineer")
        difficulty = state.get("difficulty", "medium")
        remaining_time = state.get("remaining_time", 1800)
        history = state.get("history", [])

        # Ensure fallback skills if none provided
        if not skills:
            skills = ["Data Structures", "REST APIs", "System Design", "Git"]

        # Deduplication list
        all_asked_texts = [
            (q.get("question_text") or q.get("question") or "").lower()
            for q in (asked_questions + history)
        ]

        # Check last answer evaluation for adaptive difficulty
        last_score = None
        if asked_questions:
            last_q = asked_questions[-1]
            eval_data = last_q.get("evaluation") or {}
            tech_score = eval_data.get("technical_score")
            if tech_score is not None:
                last_score = float(tech_score)

        # Adaptive difficulty adjustment
        current_difficulty = difficulty
        if last_score is not None:
            if last_score >= 8.0 and difficulty != "hard":
                current_difficulty = "hard"
            elif last_score < 5.0 and difficulty != "easy":
                current_difficulty = "easy"

        # 1. Try Gemini Reasoning with multi-model fallback loop
        if GEMINI_API_KEY:
            try:
                from google import genai
                client = genai.Client(api_key=GEMINI_API_KEY)
                
                active_skill = weak_skills[0] if weak_skills else (skills[len(asked_questions) % len(skills)] if skills else "Software Engineering")
                recent_trends = search_interview_trends(active_skill)

                prompt = f"""
                You are an expert AI Lead Technical Interviewer conducting an adaptive, realistic technical interview for a '{target_role}' position at '{current_difficulty}' difficulty.
                You have full access to the candidate's verified Career Intelligence Profile.

                Candidate Context:
                - Target Role: {target_role}
                - Adaptive Difficulty: {current_difficulty} (Last evaluation score: {last_score if last_score is not None else 'N/A'})
                - Verified Skills: {skills}
                - Identified Weak Skills (Prioritize testing these!): {weak_skills}
                - Identified Strong Skills: {strong_skills}
                - Resume Projects: {json.dumps(projects[:3])}
                - Remaining Time: {remaining_time // 60} minutes
                - Questions asked so far ({len(asked_questions)}):
                {json.dumps([{"q": q.get("question") or q.get("question_text"), "topic": q.get("topic"), "score": q.get("evaluation", {}).get("technical_score")} for q in asked_questions], indent=2)}

                RULES FOR INTERVIEW QUESTION PROGRESSION:
                1. Question #1: Real Project Architecture Probe. Ask directly about one of the candidate's actual projects from their resume, asking them to walk through the architecture, tech choices, and a challenging tradeoff.
                2. Question #2: Targeted Weak Skill or Core Framework. If weak skills ({weak_skills}) exist, formulate a practical troubleshooting or architectural question on that weak skill. Otherwise, probe deep into their primary framework/language.
                3. Question #3: Data Persistence, Schemas & Concurrency. Ask about database design, query optimization, connection pooling, or transactional consistency.
                4. Question #4: High-Scale Systems & Outage Handling. Ask how they would diagnose and resolve a severe production outage, memory leak, or sudden 50x spike in traffic.
                5. Question #5: Security, API Resiliency & Best Practices. Ask about OWASP defense, rate limiting, token authentication, or clean architecture.

                ADAPTIVE RULES:
                - If previous score >= 7.5: Escalate into advanced edge-cases, concurrency hazards, and architectural scalability.
                - If previous score < 5.0: Ask a foundational question breaking down the core principles clearly.
                - CLARITY REQUIREMENT: Formulate a crystal-clear, direct, and conversational interview question that the candidate can understand immediately and answer verbally or in writing.
                - NEVER repeat any question similar to: {all_asked_texts[-5:]}

                Return ONLY a valid JSON object:
                {{
                    "topic": "Clear Short Topic (e.g. Project Architecture, Data Persistence, Concurrency)",
                    "question_text": "The crystal-clear dynamic interview question",
                    "allocated_time_seconds": 150,
                    "rationale": "Why chosen based on candidate context and progression rules"
                }}
                """
                for model_name in GEMINI_MODELS:
                    try:
                        response = client.models.generate_content(
                            model=model_name,
                            contents=prompt
                        )
                        text = response.text.strip()
                        match = re.search(r'\{[\s\S]*\}', text)
                        if match:
                            parsed_res = json.loads(match.group(0))
                            if parsed_res.get("question_text"):
                                return parsed_res
                    except Exception as model_err:
                        print(f"Gemini {model_name} question generator notice: {model_err}")
                        continue
            except Exception as e:
                print(f"Gemini next question setup error: {e}")

        # 2. Dynamic Algorithmic Interview Question Flow (Uses Candidate's REAL data!)
        count = len(asked_questions)
        
        # Extract candidate's projects
        proj_list = [p for p in projects if isinstance(p, dict) and (p.get("name") or p.get("title"))]
        first_proj = proj_list[0] if proj_list else {}
        first_proj_title = first_proj.get("name") or first_proj.get("title")
        first_proj_techs = first_proj.get("technologies") or []
        if isinstance(first_proj_techs, str):
            first_proj_techs = [t.strip() for t in first_proj_techs.split(",") if t.strip()]

        second_proj = proj_list[1] if len(proj_list) > 1 else {}
        second_proj_title = second_proj.get("name") or second_proj.get("title")
        second_proj_techs = second_proj.get("technologies") or []
        if isinstance(second_proj_techs, str):
            second_proj_techs = [t.strip() for t in second_proj_techs.split(",") if t.strip()]

        # Main technologies from candidate's profile
        tech_primary = first_proj_techs[0] if first_proj_techs else (skills[0] if skills else "Architecture")
        tech_secondary = first_proj_techs[1] if len(first_proj_techs) > 1 else (skills[1] if len(skills) > 1 else "Database")
        target_weak = weak_skills[0] if weak_skills else None

        if count == 0:
            if first_proj_title:
                return {
                    "topic": f"Project Architecture — {first_proj_title}",
                    "question_text": f"In your resume, you highlighted your project '{first_proj_title}'. Could you walk me through its architectural design, why you chose {tech_primary}, and the most challenging technical roadblock you resolved?",
                    "allocated_time_seconds": 180,
                    "rationale": f"Grounding interview directly in candidate's verified project '{first_proj_title}'."
                }
            else:
                return {
                    "topic": f"{target_role} Architecture & Stack",
                    "question_text": f"As an aspiring {target_role} proficient in {tech_primary}, could you describe the most complex technical system or module you have built, and how you ensured scalability?",
                    "allocated_time_seconds": 180,
                    "rationale": f"Probing candidate's core background in {target_role}."
                }

        elif count == 1:
            if target_weak:
                return {
                    "topic": f"{target_weak} Fundamentals & Deep Dive",
                    "question_text": f"Your career telemetry indicates {target_weak} is an area you are actively refining. Can you explain core principles of {target_weak}, common pitfalls developers make, and how you ensure reliability?",
                    "allocated_time_seconds": 150,
                    "rationale": f"Probing candidate's identified weak area ({target_weak}) to measure competency."
                }
            elif second_proj_title:
                s_tech = second_proj_techs[0] if second_proj_techs else tech_secondary
                return {
                    "topic": f"Project Implementation — {second_proj_title}",
                    "question_text": f"Let's discuss another key project from your resume: '{second_proj_title}'. How did you utilize {s_tech} in this project, and how did you approach state management and data modeling?",
                    "allocated_time_seconds": 150,
                    "rationale": f"Examining breadth across candidate's second project '{second_proj_title}'."
                }
            else:
                return {
                    "topic": f"{tech_primary} Internals & Implementation",
                    "question_text": f"Regarding your experience with {tech_primary}: how does it handle concurrency, memory management, and asynchronous I/O under heavy load compared to alternative frameworks?",
                    "allocated_time_seconds": 120,
                    "rationale": f"Testing candidate's deep conceptual knowledge of {tech_primary}."
                }

        elif count == 2:
            return {
                "topic": f"Data Persistence & Consistency ({tech_secondary})",
                "question_text": f"Looking at your data layer using {tech_secondary}: how did you design your schemas or indexing for query performance, and how do you handle transactional consistency and connection pooling under concurrent traffic?",
                "allocated_time_seconds": 150,
                "rationale": f"Assessing database engineering and consistency tradeoffs in {tech_secondary}."
            }

        elif count == 3:
            proj_context = f"in your '{first_proj_title}'" if first_proj_title else f"in a production {target_role} service"
            return {
                "topic": "System Scale & Production Outage Handling",
                "question_text": f"Suppose traffic {proj_context} surges by 50x during peak hours, causing response timeouts and connection exhaustion. Walk me through your step-by-step diagnostic process and mitigation strategy.",
                "allocated_time_seconds": 240,
                "rationale": "Evaluating production debugging, fault isolation, and scaling mindset under pressure."
            }

        elif count == 4:
            return {
                "topic": f"API Security & Resiliency in {target_role}",
                "question_text": f"How do you approach authentication, rate limiting, and input sanitization across your API endpoints to protect against common OWASP vulnerabilities and service degradation?",
                "allocated_time_seconds": 120,
                "rationale": "Verifying production-grade security awareness and API defense-in-depth."
            }

        else:
            return {
                "topic": "Engineering Reflection & Future Scalability",
                "question_text": f"Reflecting on your software engineering journey so far, what architectural pattern or paradigm shift (e.g. event-driven, microservices, or serverless) has most significantly improved how you write code?",
                "allocated_time_seconds": 120,
                "rationale": "Assessing senior-level design maturity and self-reflection."
            }

interview_engine = LangGraphInterviewEngine()
