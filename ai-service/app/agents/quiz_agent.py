import json
import re
from app.config import GEMINI_API_KEY

GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash']

def generate_subject_quiz(
    subject: str = "DBMS",
    subjects: list[str] = None,
    difficulty: str = "medium",
    count: int = 5,
    weak_skills: list[str] = None,
    target_role: str = None
) -> list[dict]:
    """
    Connected Agentic Quiz Generator.
    Supports multi-subject quizzes, custom subjects, variable question counts, and adaptive difficulty.
    Prioritizes the student's identified weak skills and target role.
    """
    # Normalize subjects
    all_subjects = []
    if subjects and isinstance(subjects, list) and len(subjects) > 0:
        all_subjects = [s.strip() for s in subjects if s and s.strip()]
    elif subject:
        all_subjects = [s.strip() for s in subject.split(",") if s.strip()]
    
    if not all_subjects:
        all_subjects = ["DBMS"]
    
    subjects_display = ", ".join(all_subjects)
    weak_skills_str = ", ".join(weak_skills) if weak_skills else "None specified"
    count = max(1, min(int(count or 5), 50)) # Clamp between 1 and 50 questions

    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = f"""
            You are an adaptive AI Technical Quiz Evaluator for a high-end SaaS Career Platform.
            Generate a {count}-question technical quiz covering the following subject(s): {subjects_display} at '{difficulty}' difficulty.
            
            Distribution:
            - If multiple subjects are given, distribute the {count} questions evenly across: {subjects_display}.
            
            Student Career Intelligence Context:
            - Target Role: {target_role or 'Software Engineer'}
            - Candidate's Identified Weak Skills to Target: {weak_skills_str}
            - Difficulty Level: {difficulty.upper()} (Easy = core fundamentals & definitions, Medium = real-world practical concepts & bug catching, Hard = complex architectural scenarios & edge-case performance)

            INSTRUCTIONS:
            1. If weak skills match any of the subjects, prioritize questions that assess and teach those specific weak concepts!
            2. Include a balanced mix of:
               - MCQs (conceptual fundamentals)
               - Scenario questions (real-world production design/troubleshooting)
               - Output prediction / Code snippet analysis
            3. Each question must include:
               - "subject": which subject this question belongs to
               - "question_type": "mcq" or "scenario"
               - "question_text": the question
               - "options": list of exactly 4 plausible options
               - "correct_option": the exact string of the correct option
               - "explanation": a clear, educational explanation for why this is the right answer
            4. Make sure exactly {count} distinct questions are generated.

            Return ONLY a valid JSON list of objects:
            [
                {{
                    "subject": "{all_subjects[0]}",
                    "question_type": "mcq",
                    "question_text": "...",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_option": "Option A",
                    "explanation": "..."
                }}
            ]
            """
            for model_name in GEMINI_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    text = response.text.strip()
                    match = re.search(r'\[[\s\S]*\]', text)
                    if not match:
                        continue
                    data = json.loads(match.group(0))
                    if isinstance(data, list) and len(data) > 0:
                        # Ensure subject tag exists on each question
                        for i, q in enumerate(data):
                            if "subject" not in q or not q["subject"]:
                                q["subject"] = all_subjects[i % len(all_subjects)]
                        return data[:count]
                except Exception as model_err:
                    print(f"Gemini {model_name} quiz generator notice: {model_err}")
                    continue
        except Exception as e:
            print(f"Gemini quiz generator setup error: {e}")

    # Fallback curated technical question bank across key disciplines
    quizzes_by_subject = {
        "DBMS": [
            {
                "question_type": "mcq",
                "question_text": "Which normal form ensures that no non-prime attribute is transitively dependent on the primary key?",
                "options": ["1NF", "2NF", "3NF", "BCNF"],
                "correct_option": "3NF",
                "explanation": "3NF eliminates transitive dependencies between non-prime attributes."
            },
            {
                "question_type": "scenario",
                "question_text": "Your query 'SELECT * FROM orders WHERE status = ? AND order_date > ?' executes a sequential scan on a 5M row table. What composite B-Tree index structure should you build?",
                "options": ["(status, order_date)", "(order_date, status)", "Hash index on status", "Separate indexes on each column"],
                "correct_option": "(status, order_date)",
                "explanation": "Equality condition (status) must come first, followed by range filter (order_date) for index prefix pruning."
            },
            {
                "question_type": "mcq",
                "question_text": "In PostgreSQL, what is the default transaction isolation level and what anomaly does it prevent?",
                "options": ["Read Committed — prevents Dirty Reads", "Serializable — prevents all anomalies", "Repeatable Read — prevents Non-Repeatable Reads", "Read Uncommitted — allows highest throughput"],
                "correct_option": "Read Committed — prevents Dirty Reads",
                "explanation": "PostgreSQL defaults to Read Committed, which guarantees that queries see only data committed before the query began."
            },
            {
                "question_type": "scenario",
                "question_text": "Two transactions update account balances in reverse order (T1: AccA then AccB, T2: AccB then AccA). What phenomenon will occur?",
                "options": ["Deadlock", "Dirty Read", "Phantom Read", "Write Skew"],
                "correct_option": "Deadlock",
                "explanation": "Mutual lock acquisition in reverse order causes a circular dependency, resulting in a database deadlock."
            }
        ],
        "Operating System": [
            {
                "question_type": "mcq",
                "question_text": "Which of the following conditions is NOT one of the 4 Coffman conditions required for a deadlock?",
                "options": ["Mutual Exclusion", "Hold and Wait", "Preemption Allowed", "Circular Wait"],
                "correct_option": "Preemption Allowed",
                "explanation": "No preemption is required for deadlock; allowing preemption eliminates the deadlock condition."
            },
            {
                "question_type": "scenario",
                "question_text": "Under high memory pressure, an application experiences continuous page faults where the OS spends more time swapping pages than executing instructions. What is this condition?",
                "options": ["Thrashing", "Starvation", "Segmentation Fault", "Memory Leak"],
                "correct_option": "Thrashing",
                "explanation": "Thrashing happens when the working set of active processes exceeds physical RAM, causing constant page swapping."
            },
            {
                "question_type": "mcq",
                "question_text": "What is the primary advantage of epoll (Linux) over traditional select() or poll() for handling 10,000+ socket connections?",
                "options": ["O(1) event notification vs O(N) linear scanning", "Runs in user space without kernel context switches", "Automatically compresses TCP payloads", "Requires zero memory allocation"],
                "correct_option": "O(1) event notification vs O(N) linear scanning",
                "explanation": "epoll uses an event-registered kernel callback list returning only ready descriptors in O(1) time."
            }
        ],
        "Python": [
            {
                "question_type": "mcq",
                "question_text": "How does the Global Interpreter Lock (GIL) in CPython affect multithreaded CPU-bound programs vs I/O-bound programs?",
                "options": [
                    "CPU-bound threads cannot execute Python bytecode in parallel on multiple cores; I/O-bound threads release the GIL during I/O",
                    "GIL speeds up CPU-bound threads by 2x via bytecode caching",
                    "GIL has no effect on threads; it only restricts multiprocessing",
                    "I/O-bound threads are blocked by the GIL permanently"
                ],
                "correct_option": "CPU-bound threads cannot execute Python bytecode in parallel on multiple cores; I/O-bound threads release the GIL during I/O",
                "explanation": "The CPython GIL allows only one native thread to execute Python bytecode at a time, limiting CPU-bound concurrency while I/O operations safely release the lock."
            },
            {
                "question_type": "scenario",
                "question_text": "In a Python web service (FastAPI/Django), you define a default argument as a mutable list: def add_item(item, items=[]). What bug will happen?",
                "options": [
                    "The same list instance is shared across all function calls throughout the process lifecycle",
                    "Python raises a SyntaxError at compile time",
                    "The list is reset to empty on every function invocation",
                    "A memory leak occurs and terminates the garbage collector"
                ],
                "correct_option": "The same list instance is shared across all function calls throughout the process lifecycle",
                "explanation": "Default parameter expressions in Python are evaluated once when the function is defined, causing mutable objects to persist across all subsequent calls."
            },
            {
                "question_type": "mcq",
                "question_text": "What is the difference between a generator (using yield) and a regular list comprehension in terms of memory?",
                "options": [
                    "Generator produces values lazily on-demand with O(1) memory, while list comprehension loads all items in memory at once",
                    "List comprehension uses O(1) memory while generators require O(N) memory",
                    "Both use identical memory footprint",
                    "Generators cannot be iterated over in a for-loop"
                ],
                "correct_option": "Generator produces values lazily on-demand with O(1) memory, while list comprehension loads all items in memory at once",
                "explanation": "Generators evaluate items one by one on-demand via the iterator protocol, maintaining a minimal O(1) memory state."
            }
        ],
        "Java": [
            {
                "question_type": "mcq",
                "question_text": "What is the key difference between String, StringBuilder, and StringBuffer in Java?",
                "options": [
                    "String is immutable; StringBuilder is mutable & not synchronized; StringBuffer is mutable & synchronized",
                    "String is mutable; StringBuilder is thread-safe; StringBuffer is deprecated",
                    "StringBuilder is slower than StringBuffer due to locking",
                    "All three are immutable and share the String Constant Pool"
                ],
                "correct_option": "String is immutable; StringBuilder is mutable & not synchronized; StringBuffer is mutable & synchronized",
                "explanation": "StringBuilder is fast for single-threaded string manipulations, while StringBuffer provides thread-safety through method synchronization."
            },
            {
                "question_type": "scenario",
                "question_text": "In a Spring Boot application, an @Async method is called from within the same class (this.asyncMethod()). Why does it execute synchronously?",
                "options": [
                    "Bypasses Spring AOP proxy; internal method calls do not go through the proxy interceptor",
                    "@Async requires an explicit Thread.sleep() call",
                    "Spring Boot disables async execution by default on local machines",
                    "The return type must be void, otherwise it becomes synchronous"
                ],
                "correct_option": "Bypasses Spring AOP proxy; internal method calls do not go through the proxy interceptor",
                "explanation": "Spring AOP proxies intercept calls from outside the bean. Self-invocation bypasses the proxy unless AspectJ bytecode weaving is used."
            }
        ],
        "Computer Networks": [
            {
                "question_type": "mcq",
                "question_text": "What is the fundamental difference between TCP and UDP at the transport layer?",
                "options": [
                    "TCP is connection-oriented, guarantees packet delivery and order; UDP is connectionless and prioritizes low latency",
                    "UDP guarantees packet delivery while TCP drops packets on timeout",
                    "TCP operates at Layer 3 (Network) while UDP operates at Layer 4",
                    "TCP cannot transmit video or audio packets"
                ],
                "correct_option": "TCP is connection-oriented, guarantees packet delivery and order; UDP is connectionless and prioritizes low latency",
                "explanation": "TCP establishes a 3-way handshake and handles acknowledgments, retransmissions, and flow control; UDP sends packets without handshakes."
            },
            {
                "question_type": "scenario",
                "question_text": "What mechanism does HTTPS use during the TLS handshake to authenticate the server identity to the client?",
                "options": [
                    "Public Key Infrastructure (PKI) with digital certificates signed by trusted Certificate Authorities (CAs)",
                    "A shared symmetric password pre-configured in the browser",
                    "IP address geolocation matching",
                    "Hash-based MAC authentication without certificates"
                ],
                "correct_option": "Public Key Infrastructure (PKI) with digital certificates signed by trusted Certificate Authorities (CAs)",
                "explanation": "The server presents an X.509 certificate signed by a trusted CA. The client validates the cryptographic chain of trust to verify the server."
            }
        ],
        "Data Structures": [
            {
                "question_type": "mcq",
                "question_text": "What is the average and worst-case time complexity of lookup in a Hash Table with good hash function vs severe hash collisions?",
                "options": ["Average O(1), Worst-case O(N)", "Average O(log N), Worst-case O(N)", "Average O(1), Worst-case O(log N)", "Always O(1)"],
                "correct_option": "Average O(1), Worst-case O(N)",
                "explanation": "Under worst-case hash collisions, all keys map to a single bucket linked list, degrading search to O(N)."
            },
            {
                "question_type": "scenario",
                "question_text": "Which data structure is optimal for finding the median of a dynamically streaming dataset of numbers in O(1) time?",
                "options": ["Two Heaps (Max-Heap for lower half + Min-Heap for upper half)", "Balanced Binary Search Tree", "Sorted Dynamic Array", "Queue + Stack combination"],
                "correct_option": "Two Heaps (Max-Heap for lower half + Min-Heap for upper half)",
                "explanation": "Two heaps balance the upper and lower halves, giving O(log N) insertion and instantaneous O(1) median retrieval."
            }
        ]
    }

    # Fallback multi-subject collection
    collected = []
    for sub in all_subjects:
        match = quizzes_by_subject.get(sub)
        if not match:
            for k in quizzes_by_subject:
                if k.lower() in sub.lower() or sub.lower() in k.lower():
                    match = quizzes_by_subject[k]
                    break
        if match:
            for item in match:
                item_copy = dict(item)
                item_copy["subject"] = sub
                collected.append(item_copy)
        else:
            # Generate generic fallback question for custom subject
            collected.append({
                "subject": sub,
                "question_type": "mcq",
                "question_text": f"In {sub}, which architectural principle best ensures high availability and resilience under horizontal scale?",
                "options": [
                    "Stateless services with distributed caching and health probes",
                    "Single monolithic stateful instance without replication",
                    "Direct shared memory across separate host clusters",
                    "Disabling all connection timeouts"
                ],
                "correct_option": "Stateless services with distributed caching and health probes",
                "explanation": f"In {sub}, stateless design combined with health probes and distributed caching enables transparent horizontal scalability."
            })

    # If we need more questions to meet count, repeat or pad from standard questions
    all_fallback = []
    for sub_name, q_list in quizzes_by_subject.items():
        for q in q_list:
            q_copy = dict(q)
            q_copy["subject"] = sub_name
            all_fallback.append(q_copy)

    while len(collected) < count and len(all_fallback) > 0:
        collected.append(dict(all_fallback[len(collected) % len(all_fallback)]))

    return collected[:count]
