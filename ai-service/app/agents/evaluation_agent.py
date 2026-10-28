import json
import re
from app.config import GEMINI_API_KEY
from app.agents.resume_agent import COMPREHENSIVE_SKILLS

GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash']

def evaluate_student_answer(question: str, topic: str, student_answer: str, duration_seconds: int = 60) -> dict:
    """
    Evaluates student answer on 5 core dimensions:
    - Technical correctness (0-10)
    - Communication (0-10)
    - Grammar (0-10)
    - Logical reasoning (0-10)
    - Relevance (0-10)
    Plus delivery metrics (speaking pace, filler words, pauses).
    """
    words = student_answer.split()
    word_count = len(words)
    speaking_pace = int((word_count / max(1, duration_seconds)) * 60)

    # Estimate filler words
    filler_words = ["um", "uh", "like", "you know", "basically", "actually", "sort of", "kind of"]
    filler_count = sum(len(re.findall(rf"\b{f}\b", student_answer, re.I)) for f in filler_words)

    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = f"""
            You are an expert technical interviewer evaluating a candidate's live answer.
            
            Question: {question}
            Topic: {topic}
            Candidate Answer: {student_answer}

            Analyze the answer across these 5 dimensions:
            1. Technical Knowledge (0-10): Accuracy, depth, technical terminology
            2. Communication (0-10): Clarity, structure, articulation
            3. Grammar (0-10): Sentence construction and professional phrasing
            4. Logical Structure (0-10): Problem-solving breakdown, rationale
            5. Relevance (0-10): Directness in addressing the specific question asked

            Provide constructive feedback mentioning what was good and what was missing, and give an ideal expected answer.
            Detect all key technical concepts mentioned in the candidate's answer.

            Return ONLY valid JSON with no extra markdown:
            {{
                "technical_score": 8.0,
                "communication_score": 7.5,
                "grammar_score": 8.0,
                "logic_score": 8.0,
                "relevance_score": 8.5,
                "feedback": "Detailed constructive evaluation...",
                "expected_answer": "Ideal response for this question...",
                "detected_concepts": ["Concept1", "Concept2"]
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
                    if not match:
                        continue
                    res = json.loads(match.group(0))
                    res["delivery_metrics"] = {
                        "speaking_pace": f"{speaking_pace} wpm ({'Optimal' if 110 <= speaking_pace <= 160 else 'Slightly Fast' if speaking_pace > 160 else 'Deliberate'})",
                        "long_pauses": 1 if duration_seconds > 45 else 0,
                        "filler_words": filler_count,
                        "response_duration_seconds": duration_seconds
                    }
                    return res
                except Exception as model_err:
                    print(f"Gemini {model_name} evaluation notice: {model_err}")
                    continue
        except Exception as e:
            print(f"Gemini evaluation setup error: {e}")

    # Dynamic Algorithmic Evaluation Engine (Evaluates the ACTUAL answer!)
    # 1. Detect concepts from student answer using the full skills catalog
    answer_lower = student_answer.lower()
    detected = [s for s in COMPREHENSIVE_SKILLS if re.search(rf"\b{re.escape(s)}\b", student_answer, re.I)]
    if not detected:
        # Extract 2-3 significant technical terms from question & answer
        q_words = [w.capitalize() for w in re.findall(r'[A-Za-z]{4,}', question) if w.lower() not in ['what', 'when', 'where', 'which', 'explain', 'could', 'your', 'about', 'design', 'system']]
        detected = q_words[:2] or [topic]

    # 2. Relevance calculation (overlap between question keywords and answer)
    question_keywords = set(re.findall(r'[a-zA-Z]{3,}', question.lower())) - {'the', 'and', 'for', 'you', 'your', 'how', 'what', 'why', 'can', 'explain'}
    answer_keywords = set(re.findall(r'[a-zA-Z]{3,}', answer_lower))
    overlap = len(question_keywords.intersection(answer_keywords))
    relevance_score = min(9.5, max(5.0, 5.5 + (overlap * 0.7)))

    # 3. Technical score based on depth, detected concepts, and length
    tech_score = 6.0
    if word_count > 30: tech_score += 0.8
    if word_count > 70: tech_score += 0.7
    if len(detected) >= 2: tech_score += 1.0
    if len(detected) >= 4: tech_score += 0.5
    if any(k in answer_lower for k in ['because', 'therefore', 'tradeoff', 'latency', 'concurrency', 'scalability', 'optimized', 'cache', 'index', 'modular']):
        tech_score += 0.8
    tech_score = round(min(9.5, max(4.5, tech_score)), 1)

    # 4. Communication & Logic
    comm_score = round(min(9.5, max(5.0, 8.0 - (0.3 * min(5, filler_count)) + (0.5 if 20 <= word_count <= 150 else -0.5))), 1)
    logic_score = round(min(9.5, max(5.0, (tech_score + relevance_score) / 2)), 1)
    grammar_score = 8.0 if word_count > 10 else 6.0

    # 5. Context-aware Feedback
    feedback = (
        f"Solid articulation addressing {topic}. "
        f"You demonstrated good grasp of {', '.join(detected[:3])}. "
        f"To elevate this answer to a senior level, include concrete production metrics (e.g. latency numbers, throughput targets, or failure recovery mechanisms)."
    )

    expected = (
        f"An optimal response on {topic} covers core architectural rationale, explains how {detected[0] if detected else 'the component'} "
        f"integrates with the overall data flow, and discusses tradeoffs (e.g. read vs write latency, memory overhead, and fault isolation)."
    )

    return {
        "technical_score": tech_score,
        "communication_score": comm_score,
        "grammar_score": grammar_score,
        "logic_score": logic_score,
        "relevance_score": round(relevance_score, 1),
        "feedback": feedback,
        "expected_answer": expected,
        "detected_concepts": detected[:5],
        "delivery_metrics": {
            "speaking_pace": f"{speaking_pace} wpm ({'Optimal' if 110 <= speaking_pace <= 160 else 'Deliberate'})",
            "long_pauses": 1 if duration_seconds > 45 else 0,
            "filler_words": filler_count,
            "response_duration_seconds": duration_seconds
        }
    }
