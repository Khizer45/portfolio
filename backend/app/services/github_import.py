"""Read a GitHub user's public repositories so the admin can import them as draft projects.

Only api.github.com is ever called, with a validated username, so this can't be pointed at
another host. Anonymous requests are allowed 60 per hour per server IP, which is enough to
list repositories and read the README of each one imported.
"""

import json
import re
import urllib.error
import urllib.request
from dataclasses import dataclass

from app.core.errors import ConflictError, FieldValidationError

API = "https://api.github.com"
USERNAME = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$")
TIMEOUT_SECONDS = 10
MAX_PAGES = 3

# Topic and language spellings as people write them; anything else is title-cased.
_NAMES = {
    "ai": "AI",
    "api": "API",
    "aws": "AWS",
    "c#": "C#",
    "cnn": "CNN",
    "css": "CSS",
    "deep-learning": "Deep Learning",
    "django": "Django",
    "docker": "Docker",
    "fastapi": "FastAPI",
    "flask": "Flask",
    "html": "HTML",
    "javascript": "JavaScript",
    "jupyter-notebook": "Jupyter Notebook",
    "keras": "Keras",
    "langchain": "LangChain",
    "langgraph": "LangGraph",
    "llm": "LLMs",
    "llms": "LLMs",
    "machine-learning": "Machine Learning",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    "nextjs": "Next.js",
    "nlp": "NLP",
    "nodejs": "Node.js",
    "numpy": "NumPy",
    "ollama": "Ollama",
    "opencv": "OpenCV",
    "openai": "OpenAI",
    "pandas": "Pandas",
    "php": "PHP",
    "postgresql": "PostgreSQL",
    "python": "Python",
    "pytorch": "PyTorch",
    "rag": "RAG",
    "react": "React",
    "scikit-learn": "Scikit-learn",
    "sklearn": "Scikit-learn",
    "sql": "SQL",
    "sqlite": "SQLite",
    "streamlit": "Streamlit",
    "tailwindcss": "Tailwind CSS",
    "tensorflow": "TensorFlow",
    "typescript": "TypeScript",
    "yolo": "YOLO",
}
_TITLE_WORDS = {
    "ai": "AI",
    "ml": "ML",
    "llm": "LLM",
    "api": "API",
    "cnn": "CNN",
    "nlp": "NLP",
    "sql": "SQL",
    "ui": "UI",
    "cv": "CV",
}


@dataclass
class Repo:
    name: str
    full_name: str
    description: str | None
    html_url: str
    homepage: str | None
    language: str | None
    topics: list[str]
    stars: int
    fork: bool
    archived: bool
    created_at: str
    pushed_at: str


def _request(path: str, accept: str = "application/vnd.github+json") -> bytes:
    # API is a fixed https:// host and `path` is built from a validated username or repo name.
    request = urllib.request.Request(  # noqa: S310
        API + path, headers={"Accept": accept, "User-Agent": "portfolio-admin", "X-GitHub-Api-Version": "2022-11-28"}
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310 (fixed https host)
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404:
            raise
        if error.code in (403, 429):
            raise ConflictError(
                "GitHub's limit for requests from this server was reached. Try again in an hour."
            ) from error
        raise ConflictError(f"GitHub answered with an error ({error.code}). Try again later.") from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise ConflictError("Couldn't reach GitHub from the server. Try again later.") from error


def check_username(username: str) -> str:
    username = username.strip().lstrip("@")
    if not USERNAME.match(username):
        raise FieldValidationError("username", "Enter a GitHub username, e.g. Khizer45.")
    return username


def list_repos(username: str) -> list[Repo]:
    """The user's own public repositories (not forks of others' work first), newest activity first."""
    username = check_username(username)
    repos: list[Repo] = []
    for page in range(1, MAX_PAGES + 1):
        try:
            raw = _request(f"/users/{username}/repos?type=owner&sort=pushed&per_page=100&page={page}")
        except urllib.error.HTTPError as error:
            raise FieldValidationError("username", "No GitHub user with this name.") from error
        batch = json.loads(raw)
        for item in batch:
            repos.append(
                Repo(
                    name=item["name"],
                    full_name=item["full_name"],
                    description=(item.get("description") or "").strip() or None,
                    html_url=item["html_url"],
                    homepage=(item.get("homepage") or "").strip() or None,
                    language=item.get("language"),
                    topics=list(item.get("topics") or []),
                    stars=int(item.get("stargazers_count") or 0),
                    fork=bool(item.get("fork")),
                    archived=bool(item.get("archived")),
                    created_at=item.get("created_at") or "",
                    pushed_at=item.get("pushed_at") or "",
                )
            )
        if len(batch) < 100:
            break
    return repos


def readme_summary(full_name: str, limit: int = 400) -> str | None:
    """The README's first real paragraph as plain text, or None if there is no README or GitHub refuses."""
    try:
        text = _request(f"/repos/{full_name}/readme", accept="application/vnd.github.raw").decode("utf-8", "replace")
    except (urllib.error.HTTPError, ConflictError):
        return None
    paragraph: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        skip = (
            not stripped
            or stripped.startswith(("#", "!", "<", "[!", "|", "```", "---", "===", ">"))
            or re.fullmatch(r"(\[!\[.*?\]\(.*?\)\]\(.*?\)\s*)+", stripped)
        )
        if skip:
            if paragraph:
                break
            continue
        paragraph.append(stripped)
    if not paragraph:
        return None
    plain = " ".join(paragraph)
    plain = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", plain)  # images
    plain = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", plain)  # links → their text
    plain = re.sub(r"[*_`]{1,3}([^*_`]+)[*_`]{1,3}", r"\1", plain)  # emphasis, code
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) > limit:
        plain = plain[: limit - 1].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return plain or None


def nice_name(value: str) -> str:
    key = value.strip().lower()
    if key in _NAMES:
        return _NAMES[key]
    return " ".join(word.capitalize() for word in re.split(r"[-_\s]+", value.strip()) if word)


def project_title(repo_name: str) -> str:
    words = [w for w in re.split(r"[-_\s]+", repo_name) if w]
    if any(c.isupper() for c in repo_name):
        return " ".join(words)
    return " ".join(_TITLE_WORDS.get(w.lower(), w.capitalize()) for w in words)


def technologies(repo: Repo) -> list[str]:
    names: list[str] = []
    for value in ([repo.language] if repo.language else []) + repo.topics:
        name = nice_name(value)
        if name and name.lower() not in {n.lower() for n in names}:
            names.append(name[:60])
    return names[:15]
