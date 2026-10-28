import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in root workspace or current dir
root_env = Path(__file__).resolve().parent.parent.parent / '.env'
if root_env.exists():
    load_dotenv(dotenv_path=root_env)
else:
    load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROK_API_KEY = os.getenv("GROK_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
PORT = int(os.getenv("FASTAPI_PORT", "8000"))
