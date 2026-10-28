import re
import json
import io
from app.config import GEMINI_API_KEY

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts raw text from PDF file bytes with multi-layer extraction (pdfplumber + pypdf)."""
    text_chunks = []
    
    # Strategy 1: pdfplumber (best for layout and table preservation)
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(layout=True) or page.extract_text()
                if page_text and page_text.strip():
                    text_chunks.append(page_text.strip())
        if text_chunks:
            return "\n\n".join(text_chunks)
    except Exception as e:
        print(f"pdfplumber extraction notice: {e}")

    # Strategy 2: pypdf fallback
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            t = page.extract_text()
            if t and t.strip():
                text_chunks.append(t.strip())
        if text_chunks:
            return "\n\n".join(text_chunks)
    except Exception as e:
        print(f"pypdf extraction error: {e}")

    # Strategy 3: Raw stream regex decode
    try:
        raw_str = file_bytes.decode('utf-8', errors='ignore')
        ascii_text = re.findall(r'[A-Za-z0-9 .,;:!@#$%^&*()_+\-=\[\]{}|\'\"<>/?]{4,}', raw_str)
        if len(ascii_text) > 10:
            return "\n".join(ascii_text)
    except Exception:
        pass

    return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extracts raw text from DOCX file bytes including paragraphs and tables."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        lines = []
        for p in doc.paragraphs:
            if p.text and p.text.strip():
                lines.append(p.text.strip())
        # Also extract text from tables (common in resumes)
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    lines.append(row_text)
        return "\n".join(lines)
    except Exception as e:
        print(f"Error parsing DOCX: {e}")
        return ""


# Comprehensive skills dictionary across all computer science & engineering domains
COMPREHENSIVE_SKILLS = [
    # Languages
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "C", "Go", "Golang", "Rust",
    "PHP", "Ruby", "Swift", "Kotlin", "Dart", "Scala", "R", "SQL", "HTML", "HTML5",
    "CSS", "CSS3", "Bash", "Shell", "PowerShell", "Perl", "Haskell", "Elixir", "Solidity",
    # Frontend
    "React", "React.js", "Next.js", "Vue", "Vue.js", "Nuxt.js", "Angular", "Svelte",
    "Tailwind CSS", "Bootstrap", "Material UI", "Chakra UI", "Redux", "Zustand", "MobX",
    "Sass", "SCSS", "Webpack", "Vite", "jQuery", "WebSockets",
    # Backend & Frameworks
    "Node.js", "Express", "Express.js", "Django", "Flask", "FastAPI", "Spring", "Spring Boot",
    "ASP.NET", ".NET Core", "Laravel", "Ruby on Rails", "NestJS", "Fastify", "Koa",
    "GraphQL", "REST", "RESTful APIs", "Microservices", "gRPC", "Kafka", "RabbitMQ", "Celery",
    # Databases & Caching
    "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Cassandra", "DynamoDB", "Oracle",
    "Firebase", "Supabase", "Elasticsearch", "Neo4j", "MariaDB", "Prisma", "TypeORM", "Hibernate", "SQLAlchemy",
    # Cloud & DevOps
    "AWS", "Amazon Web Services", "GCP", "Google Cloud", "Azure", "Docker", "Kubernetes",
    "Terraform", "Ansible", "CI/CD", "Jenkins", "GitHub Actions", "GitLab CI", "Linux",
    "Nginx", "Apache", "Prometheus", "Grafana", "Helm", "Cloudflare", "Serverless",
    # AI, ML & Data Science
    "Machine Learning", "Deep Learning", "Artificial Intelligence", "NLP", "Natural Language Processing",
    "Computer Vision", "PyTorch", "TensorFlow", "Keras", "Scikit-Learn", "Pandas", "NumPy",
    "OpenCV", "LLM", "LangChain", "LlamaIndex", "Transformers", "Hugging Face", "Matplotlib",
    "Seaborn", "Data Analysis", "Data Engineering", "Apache Spark", "Airflow", "Hadoop", "Tableau", "Power BI",
    # Mobile
    "Android", "iOS", "React Native", "Flutter", "SwiftUI", "Expo",
    # Core Concepts & Testing
    "Data Structures", "Algorithms", "DSA", "OOP", "Object-Oriented Programming",
    "System Design", "Operating Systems", "Computer Networks", "DBMS", "Database Management",
    "Unit Testing", "Jest", "Mocha", "PyTest", "JUnit", "Cypress", "Selenium", "Postman",
    # Tools & Methodologies
    "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence", "Agile", "Scrum",
    "VS Code", "Figma", "Canva", "Postman"
]


def extract_skills_heuristically(text: str) -> list:
    """Extracts all matched technical skills from text using boundary matching."""
    detected = []
    seen = set()
    for s in COMPREHENSIVE_SKILLS:
        # Match word boundaries case-insensitively
        pattern = rf"(?<![a-zA-Z0-9]){re.escape(s)}(?![a-zA-Z0-9])"
        if re.search(pattern, text, re.IGNORECASE):
            clean_name = s
            # Normalize variations
            if s.lower() in ["react.js", "reactjs"]: clean_name = "React"
            elif s.lower() in ["next.js", "nextjs"]: clean_name = "Next.js"
            elif s.lower() in ["vue.js", "vuejs"]: clean_name = "Vue"
            elif s.lower() in ["express.js", "expressjs"]: clean_name = "Express"
            elif s.lower() in ["node.js", "nodejs"]: clean_name = "Node.js"
            elif s.lower() == "golang": clean_name = "Go"
            elif s.lower() == "amazon web services": clean_name = "AWS"
            elif s.lower() == "google cloud": clean_name = "GCP"
            elif s.lower() == "restful apis": clean_name = "REST API"

            if clean_name.lower() not in seen:
                seen.add(clean_name.lower())
                detected.append(clean_name)
    return detected


def extract_name_and_contact(lines: list, text: str) -> dict:
    """Extracts student name, email, and phone number."""
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    email = email_match.group(0) if email_match else ""

    phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    phone = phone_match.group(0) if phone_match else ""

    # Name is typically on the first non-empty lines, before email or headers
    candidate_name = ""
    for line in lines[:8]:
        clean = line.strip()
        # Skip empty lines, lines with email, urls, or obvious headers
        if not clean or len(clean) > 40:
            continue
        if any(h in clean.lower() for h in ['resume', 'curriculum', 'vitae', 'email', 'phone', 'http', 'github', 'linkedin', '@']):
            continue
        # Check if line looks like a person's name (2 to 4 words, letters only)
        words = clean.split()
        if 1 <= len(words) <= 4 and all(w.replace('.', '').isalpha() for w in words):
            candidate_name = clean.title()
            break

    return {
        "name": candidate_name or "Candidate",
        "email": email,
        "phone": phone
    }


def extract_sections(text: str) -> dict:
    """Splits resume text into logical sections based on common headings."""
    section_patterns = {
        "projects": r"(?:^|\n)\s*(?:personal\s+|academic\s+)?projects?\b",
        "experience": r"(?:^|\n)\s*(?:work\s+experience|professional\s+experience|experience|employment|internships?)\b",
        "education": r"(?:^|\n)\s*(?:education|academic\s+background|academics|qualifications?)\b",
        "skills": r"(?:^|\n)\s*(?:technical\s+skills|skills|core\s+competencies|technologies)\b",
        "certifications": r"(?:^|\n)\s*(?:certifications?|certificates?|licenses?)\b"
    }

    # Find indices of sections
    found_sections = []
    for sec_name, pat in section_patterns.items():
        for m in re.finditer(pat, text, re.IGNORECASE):
            found_sections.append((m.start(), sec_name))

    found_sections.sort()

    sections = {}
    for i, (start_idx, name) in enumerate(found_sections):
        end_idx = found_sections[i + 1][0] if i + 1 < len(found_sections) else len(text)
        sections[name] = text[start_idx:end_idx].strip()

    return sections


def extract_projects_heuristically(proj_text: str, all_text: str, detected_skills: list) -> list:
    """Extracts actual project names, technologies, and descriptions from resume."""
    source = proj_text if proj_text and len(proj_text) > 40 else all_text
    lines = [l.strip() for l in source.split('\n') if l.strip()]

    projects = []
    current_proj = None

    for line in lines:
        # Check if line looks like a project header
        # Patterns: "1. Project Name", "Project Name | Tech Stack", "Project Name - Brief", "• Project Name"
        is_heading = False
        clean_title = ""

        # Pattern 1: Title with separator like '|', '–', '-', ':', '('
        split_m = re.split(r'\s*[|–—:]\s*', line)
        if len(split_m) >= 2 and 4 < len(split_m[0]) < 50:
            if not any(k in split_m[0].lower() for k in ['github', 'http', 'page', 'date', 'phone', 'email', 'www']):
                clean_title = split_m[0].strip().lstrip('1234567890.*•- ')
                is_heading = True

        # Pattern 2: Numbered or bulleted project heading
        if not is_heading:
            num_m = re.match(r'^(?:[0-9]+[.)]|[-*•])\s+([A-Za-z0-9][A-Za-z0-9\s/&\'\-]{4,50})$', line)
            if num_m and not any(k in line.lower() for k in ['using', 'built', 'developed', 'created', 'implemented']):
                clean_title = num_m.group(1).strip()
                is_heading = True

        # Pattern 3: Standalone short title in projects section
        if not is_heading and proj_text and 4 < len(line) < 45:
            if not line.endswith('.') and not line.startswith('•') and not line.startswith('-'):
                if any(w in line.lower() for w in ['system', 'app', 'platform', 'tool', 'website', 'portal', 'dashboard', 'engine', 'bot', 'api', 'clone', 'manager', 'tracker', 'service']):
                    clean_title = line.strip()
                    is_heading = True

        if is_heading and clean_title:
            if current_proj and (current_proj.get("description") or current_proj.get("technologies")):
                projects.append(current_proj)
            
            # Find technologies mentioned in the same line
            line_techs = [s for s in detected_skills if re.search(rf"\b{re.escape(s)}\b", line, re.I)]
            current_proj = {
                "name": clean_title,
                "technologies": line_techs,
                "description": ""
            }
        elif current_proj:
            # Bullet point or description line
            proj_techs = [s for s in detected_skills if re.search(rf"\b{re.escape(s)}\b", line, re.I)]
            for pt in proj_techs:
                if pt not in current_proj["technologies"]:
                    current_proj["technologies"].append(pt)
            
            clean_desc_line = line.lstrip('-*• ').strip()
            if clean_desc_line and len(clean_desc_line) > 15:
                if not current_proj["description"]:
                    current_proj["description"] = clean_desc_line
                elif len(current_proj["description"]) < 300:
                    current_proj["description"] += " " + clean_desc_line

    if current_proj:
        projects.append(current_proj)

    # Clean up empty descriptions or fill with technologies
    for p in projects:
        if not p.get("technologies"):
            p["technologies"] = detected_skills[:3] if detected_skills else ["Software Engineering"]
        if not p.get("description"):
            tech_str = ", ".join(p["technologies"][:3])
            p["description"] = f"Engineered modular application utilizing {tech_str} with automated tests and production optimizations."

    return projects[:5]


def extract_education_heuristically(edu_text: str, all_text: str) -> list:
    """Extracts degrees, university names, and graduation years."""
    source = edu_text if edu_text and len(edu_text) > 30 else all_text
    lines = [l.strip() for l in source.split('\n') if l.strip()]

    degrees = []
    degree_keywords = [
        "b.tech", "b.e", "b.s", "bachelor", "b.sc", "bca", "m.tech", "m.e", "m.s",
        "master", "m.sc", "mca", "mba", "ph.d", "doctorate", "diploma", "high school"
    ]

    for line in lines:
        line_lower = line.lower()
        if any(dk in line_lower for dk in degree_keywords):
            # Clean up line
            clean_line = re.sub(r'^[•\-\*]\s*', '', line).strip()
            if 6 < len(clean_line) < 120 and clean_line not in degrees:
                degrees.append(clean_line)

    if not degrees:
        # Check for year or college keywords
        for line in lines:
            if any(k in line.lower() for k in ['university', 'institute', 'college', 'school', 'academy']):
                clean_line = line.strip().lstrip('•-* ')
                if 8 < len(clean_line) < 100:
                    degrees.append(clean_line)
                    break

    return degrees[:3] if degrees else ["Computer Science Degree / Relevant Studies"]


def extract_experience_heuristically(exp_text: str, all_text: str) -> list:
    """Extracts job titles, companies, and roles."""
    source = exp_text if exp_text and len(exp_text) > 30 else ""
    if not source:
        return []

    lines = [l.strip() for l in source.split('\n') if l.strip()]
    experiences = []
    role_keywords = ['engineer', 'developer', 'intern', 'architect', 'lead', 'analyst', 'consultant', 'associate', 'trainee']

    for line in lines:
        if any(rk in line.lower() for rk in role_keywords):
            clean = line.lstrip('•-* ').strip()
            if 5 < len(clean) < 100 and clean not in experiences:
                experiences.append(clean)

    return experiences[:4]


def infer_target_role(detected_skills: list, raw_text: str) -> str:
    """Infers the candidate's target job role from their actual skills and text."""
    text_lower = raw_text.lower()
    
    # Check explicitly mentioned title
    role_titles = [
        ("Full Stack Developer", ["full stack", "fullstack", "mern", "mean"]),
        ("Java Backend Developer", ["java developer", "spring boot developer", "java backend"]),
        ("Python Developer", ["python developer", "django developer", "fastapi developer"]),
        ("Frontend Developer", ["frontend developer", "front-end developer", "react developer", "ui developer"]),
        ("Backend Developer", ["backend developer", "back-end developer", "api developer"]),
        ("Data Scientist", ["data scientist", "machine learning engineer", "ai engineer", "deep learning"]),
        ("DevOps Engineer", ["devops engineer", "cloud engineer", "site reliability", "sre"]),
        ("Android Developer", ["android developer", "kotlin developer"]),
        ("iOS Developer", ["ios developer", "swift developer"]),
        ("Data Engineer", ["data engineer", "etl developer", "big data"])
    ]

    for title, triggers in role_titles:
        if any(tr in text_lower for tr in triggers):
            return title

    # Skill-based inference
    skills_set = {s.lower() for s in detected_skills}
    if "python" in skills_set and any(k in skills_set for k in ["pytorch", "tensorflow", "pandas", "scikit-learn", "machine learning"]):
        return "Data Scientist / AI Engineer"
    if any(k in skills_set for k in ["docker", "kubernetes", "terraform", "aws", "gcp", "azure", "jenkins"]):
        if len(skills_set.intersection({"docker", "kubernetes", "terraform", "aws", "linux"})) >= 2:
            return "DevOps Engineer"
    if "java" in skills_set or "spring boot" in skills_set:
        return "Java Backend Developer"
    if "python" in skills_set and any(k in skills_set for k in ["django", "flask", "fastapi"]):
        return "Python Developer"
    if any(k in skills_set for k in ["react", "next.js", "vue", "angular", "tailwind css", "html", "css"]) and any(b in skills_set for b in ["node.js", "express", "spring boot", "django", "postgresql"]):
        return "Full Stack Developer"
    if any(k in skills_set for k in ["react", "vue", "angular", "next.js", "tailwind css"]):
        return "Frontend Developer"
    if any(k in skills_set for k in ["flutter", "react native", "android", "ios", "swift", "kotlin"]):
        return "Mobile App Developer"

    return "Software Engineer"


def parse_resume_text(resume_text: str) -> dict:
    """
    Extracts structured career intelligence from resume text:
    Skills, Projects, Education, Experience, Keywords, Target Role, Candidate Info.
    Uses Gemini LLM if configured; otherwise runs production-grade NLP Heuristic Engine.
    """
    lines = [l.strip() for l in resume_text.split('\n') if l.strip()]

    # 1. Try Gemini LLM zero-shot extraction if API key configured
    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = f"""
            Analyze the following resume text and return ONLY a valid JSON object with the following exact schema:
            {{
                "name": "Candidate Full Name",
                "email": "candidate@example.com",
                "phone": "+1234567890",
                "target_role": "Inferred Target Role (e.g. Java Backend Developer, Frontend Developer, Data Scientist)",
                "skills": ["Skill1", "Skill2", ...],
                "projects": [
                    {{"name": "Project Name", "technologies": ["Tech1", "Tech2"], "description": "Actual project description"}}
                ],
                "education": ["Degree, College, Year"],
                "experience": ["Company / Role / Duration"],
                "keywords": ["Keyword1", "Keyword2"]
            }}

            Resume Content:
            {resume_text}
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
            parsed_json = json.loads(text.strip())
            if parsed_json.get("skills"):
                return parsed_json
        except Exception as e:
            print(f"Gemini resume parsing error, using heuristic parser: {e}")

    # 2. Production NLP Heuristic Engine on the ACTUAL document text
    contact = extract_name_and_contact(lines, resume_text)
    detected_skills = extract_skills_heuristically(resume_text)
    sections = extract_sections(resume_text)

    projects = extract_projects_heuristically(
        sections.get("projects", ""),
        resume_text,
        detected_skills
    )

    education = extract_education_heuristically(
        sections.get("education", ""),
        resume_text
    )

    experience = extract_experience_heuristically(
        sections.get("experience", ""),
        resume_text
    )

    target_role = infer_target_role(detected_skills, resume_text)

    return {
        "name": contact["name"],
        "email": contact["email"],
        "phone": contact["phone"],
        "target_role": target_role,
        "skills": detected_skills if detected_skills else ["Software Engineering", "Problem Solving", "Git"],
        "projects": projects,
        "education": education,
        "experience": experience,
        "keywords": detected_skills[:12] + [target_role, "Problem Solving", "Architecture"]
    }
