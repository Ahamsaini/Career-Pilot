import requests
from app.config import TAVILY_API_KEY

def search_interview_trends(topic: str) -> list[str]:
    """
    Search live interview questions and industry standards using Tavily API.
    Used by the question generation agent to ensure questions reflect current 2026 industry practices.
    """
    if not TAVILY_API_KEY:
        return [
            f"Recent senior interview scenarios covering {topic} scalability",
            f"Common production pitfalls and recovery patterns in {topic}"
        ]

    try:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": TAVILY_API_KEY,
            "query": f"latest technical interview questions and architecture tradeoffs for {topic}",
            "search_depth": "basic",
            "max_results": 3
        }
        resp = requests.post(url, json=payload, timeout=5)
        if resp.status_code == 200:
            results = resp.json().get("results", [])
            return [r.get("content", "") for r in results if r.get("content")]
    except Exception as e:
        print(f"Tavily search warning: {e}")

    return [
        f"Real-world distributed systems considerations in {topic}",
        f"Performance optimization benchmarks in {topic}"
    ]
