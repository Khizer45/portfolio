"""Initial portfolio content, taken only from verified information (CV and profile brief).

Loaded once with `python -m app.cli seed`. After that, manage everything from the admin
dashboard; this file is not read again.
"""

PROFILE = {
    "display_name": "Khizer Hayat",
    "role": "Software Engineer · AI/ML · MLOps",
    "headline": "Software Engineer building practical AI systems, intelligent applications, and reliable software.",
    "intro": (
        "I'm a 2026 Software Engineering graduate from MUST, Pakistan. I build end-to-end projects that combine "
        "Python backends, machine learning, and deployment tooling — and I'm looking for my first role in software "
        "or AI engineering."
    ),
    "biography": "\n\n".join(
        [
            "I'm Khizer Hayat, a Software Engineering graduate from Mirpur University of Science and Technology (MUST), "
            "Class of 2026. My foundation is in programming with Python, Java, and C#, and in data structures and "
            "algorithms in Python and Java.",
            "Most of my work sits where software engineering meets AI. For my final year project, Skyntri, I trained a "
            "CNN-based image model and built the FastAPI backend and React frontend around it. I'm currently building "
            "tools for benchmarking locally hosted models, translating natural-language questions into SQL, and "
            "automating short-form video production.",
            "I also completed a cybersecurity internship at Moboroid Software Company, where I worked on network "
            "scanning, web security testing with Burp Suite, and the OWASP Top 10.",
        ]
    ),
    "location": "Mirpur, AJK, Pakistan",
    "contact_email": "khizerhayat.official0@gmail.com",
    "github_url": "https://github.com/Khizer45",
    "linkedin_url": "https://www.linkedin.com/in/khizer-hayat-417387276/",
    "cv_url": "/cv/Khizer-Hayat-CV.pdf",
    "profile_image_url": None,
    "social_links": [],
    "availability_open": True,
    "availability_label": "Open to entry-level software and AI engineering roles",
    "focus_areas": ["AI & ML applications", "Backend APIs", "MLOps & local AI"],
    "spoken_languages": ["English", "Urdu"],
    "career_interests": [
        "Software Engineer",
        "Junior Python Developer",
        "AI Engineer",
        "Machine Learning Engineer",
        "Deep Learning Engineer",
        "Computer Vision Engineer",
        "Generative AI / LLM Engineer",
        "AI Agent and Automation Developer",
        "MLOps Engineer",
        "Backend Engineer",
    ],
    "interests": [
        "Machine learning and deep learning applications",
        "Generative AI, LLMs, retrieval-augmented generation, and AI agents",
        "Backend systems and REST APIs with Python and FastAPI",
        "Automation, MLOps, and reproducible model deployment",
        "Local AI: running and evaluating models on your own hardware",
    ],
    "approach": [
        "I learn by building complete projects — data, model, API, and interface — rather than isolated exercises.",
        "I label work honestly: planned features are marked as planned, and results are published only once measured.",
        "I document what I build so others can run it, review it, and learn from it.",
    ],
    "seeking": [
        "Entry-level and graduate roles in software engineering, AI engineering, or machine learning",
        "Backend and automation work with Python and FastAPI",
        "Internships and freelance projects where I can contribute and keep learning",
    ],
}

PROJECT_CATEGORIES = [
    (
        "frontend",
        "Web Development — Frontend",
        "Frontend",
        "layout",
        "User interfaces built with modern web technologies, with attention to accessibility, responsiveness, and performance.",
        [
            "HTML, CSS, JavaScript, React, and Next.js",
            "Responsive layouts and accessibility",
            "Reusable components and UI/UX implementation",
            "Frontend testing and performance",
        ],
    ),
    (
        "backend",
        "Backend Development",
        "Backend",
        "server",
        "APIs and services in Python and FastAPI, covering data access, security, and reliability.",
        [
            "Python, FastAPI, and REST APIs",
            "Authentication, authorization, JWT, password hashing, and validation",
            "SQL and database integration",
            "Async programming",
            "Logging, error handling, testing, and API documentation",
        ],
    ),
    (
        "full-stack",
        "Full-Stack Development",
        "Full-Stack",
        "layers",
        "Complete applications that connect a frontend, backend, and database into one working system.",
        [
            "Frontend and backend integration",
            "Database design",
            "Complete application architecture",
            "Deployment and environment configuration",
        ],
    ),
    (
        "data-science",
        "Data Analysis & Data Science",
        "Data Science",
        "chart",
        "Exploring, cleaning, and explaining data with reproducible analysis.",
        [
            "NumPy, Pandas, and Matplotlib",
            "Exploratory data analysis",
            "Data cleaning and visualization",
            "Statistical analysis",
            "Model evaluation and reproducible experiments",
        ],
    ),
    (
        "machine-learning",
        "Machine Learning",
        "Machine Learning",
        "brain",
        "Classical machine learning, from preprocessing and features to validated, compared models.",
        [
            "Supervised and unsupervised learning",
            "Feature engineering and data preprocessing",
            "Model comparison",
            "Validation, evaluation metrics, and error analysis",
        ],
    ),
    (
        "deep-learning",
        "Deep Learning",
        "Deep Learning",
        "network",
        "Neural networks trained and evaluated with PyTorch or TensorFlow.",
        [
            "Neural networks and CNNs",
            "Transfer learning",
            "PyTorch and TensorFlow/Keras",
            "Training, validation, and experiment tracking",
        ],
    ),
    (
        "computer-vision",
        "Computer Vision & OpenCV",
        "Computer Vision",
        "eye",
        "Systems that process and understand images, from preprocessing to model inference.",
        [
            "Image preprocessing",
            "Object detection and classification",
            "Image segmentation",
            "OpenCV applications",
            "Model inference and computer-vision APIs",
        ],
    ),
    (
        "nlp-llm",
        "NLP & LLM Engineering",
        "NLP & LLMs",
        "message",
        "Working with text and language models: classification, retrieval, and LLM integration.",
        [
            "Text classification and information extraction",
            "Embeddings and semantic search",
            "Retrieval-Augmented Generation (RAG)",
            "LLM integrations",
            "Evaluation, latency, and cost considerations",
        ],
    ),
    (
        "generative-ai",
        "Generative AI",
        "Generative AI",
        "sparkles",
        "Applications that generate text, audio, images, or video with AI models.",
        [
            "AI assistants",
            "Document and knowledge assistants",
            "Content-generation systems",
            "Multimodal applications",
            "LLM-powered tools",
        ],
    ),
    (
        "ai-agents-automation",
        "AI Agents & Automation",
        "Agents & Automation",
        "workflow",
        "Tool-using agents and automated workflows designed to run reliably.",
        [
            "Tool-using agents",
            "Workflow orchestration and n8n integrations",
            "API-based automation",
            "Human approval and error recovery",
            "Logging and reliable task execution",
        ],
    ),
    (
        "mlops",
        "MLOps & Deployment",
        "MLOps",
        "container",
        "Packaging, serving, and operating models in reproducible environments.",
        [
            "Docker and Docker Compose",
            "Model serving with FastAPI",
            "Model versioning and experiment tracking",
            "CI/CD, monitoring, and logging",
            "Reproducible environments and cloud deployment",
            "Model performance and operational metrics",
        ],
    ),
    (
        "local-ai",
        "Local AI & Model Benchmarking",
        "Local AI",
        "cpu",
        "Running models on local hardware and measuring how they actually perform.",
        [
            "Ollama and local model serving",
            "Hardware-aware model selection",
            "Offline inference",
            "Latency, throughput, and memory measurements",
            "Task-based model evaluation and reproducible benchmarking",
        ],
    ),
    (
        "software-engineering",
        "Software Engineering & Developer Tools",
        "Dev Tools",
        "terminal",
        "Core engineering work: algorithms, testing, design, and tools that make developers productive.",
        [
            "Data structures and algorithms",
            "Testing and debugging",
            "System design",
            "Command-line utilities",
            "Open-source contributions",
            "Developer productivity tools",
        ],
    ),
]

SKILL_CATEGORIES = [
    ("languages", "Programming Languages"),
    ("frontend", "Frontend Development"),
    ("backend", "Backend Development"),
    ("databases", "Databases"),
    ("data-science", "Data Science"),
    ("machine-learning", "Machine Learning"),
    ("deep-learning", "Deep Learning"),
    ("computer-vision", "Computer Vision & OpenCV"),
    ("nlp-llm", "NLP & LLM Engineering"),
    ("generative-ai", "Generative AI"),
    ("ai-agents-automation", "AI Agents & Automation"),
    ("devops-mlops", "DevOps & MLOps"),
    ("testing-se", "Testing & Software Engineering"),
    ("developer-tools", "Developer Tools"),
    ("security", "Security"),
]

# (name, category, level, evidence project slug, featured, learning)
SKILLS = [
    ("Python", "languages", "intermediate", "skyntri", True, False),
    ("Java", "languages", "intermediate", None, True, False),
    ("C#", "languages", "beginner", None, False, False),
    ("JavaScript", "languages", "beginner", None, False, False),
    ("React", "frontend", "beginner", "skyntri", True, False),
    ("Tailwind CSS", "frontend", "intermediate", "skyntri", False, False),
    ("FastAPI", "backend", "intermediate", "skyntri", True, False),
    ("REST APIs", "backend", "intermediate", "skyntri", True, False),
    ("SQL", "databases", "intermediate", None, True, False),
    ("PostgreSQL", "databases", "intermediate", "datatalk", False, False),
    ("SQLite", "databases", "intermediate", "skyntri", False, False),
    ("NumPy", "data-science", "intermediate", None, False, False),
    ("Pandas", "data-science", "intermediate", None, True, False),
    ("Matplotlib", "data-science", "intermediate", None, False, False),
    ("Supervised & unsupervised learning", "machine-learning", "intermediate", None, False, False),
    ("Model training & evaluation", "machine-learning", "intermediate", "local-ai-lab", False, False),
    ("Scikit-learn", "machine-learning", "intermediate", "local-ai-lab", True, False),
    ("Neural networks & CNNs", "deep-learning", "intermediate", "skyntri", False, False),
    ("PyTorch", "deep-learning", "intermediate", "local-ai-lab", True, False),
    ("TensorFlow / Keras", "deep-learning", "intermediate", "skyntri", True, False),
    ("Computer vision", "computer-vision", "intermediate", "skyntri", False, False),
    ("OpenCV", "computer-vision", "intermediate", "reelforge", False, False),
    ("OCR (Tesseract)", "computer-vision", "intermediate", "skyntri", False, False),
    ("LLMs", "nlp-llm", "beginner", "datatalk", False, True),
    ("Retrieval-Augmented Generation (RAG)", "nlp-llm", "beginner", None, False, True),
    ("Hugging Face Transformers", "nlp-llm", "intermediate", "reelforge", True, False),
    ("Text-to-speech (TTS)", "generative-ai", "intermediate", "reelforge", False, False),
    ("LangGraph", "ai-agents-automation", "beginner", None, False, True),
    ("AI agents & agentic workflows", "ai-agents-automation", "beginner", None, False, True),
    ("n8n", "ai-agents-automation", "beginner", None, False, False),
    ("Docker", "devops-mlops", "intermediate", "local-ai-lab", True, False),
    ("Kubernetes", "devops-mlops", "beginner", None, False, False),
    ("Ollama", "devops-mlops", "intermediate", "local-ai-lab", True, False),
    ("Model benchmarking & profiling", "devops-mlops", "intermediate", "local-ai-lab", False, False),
    ("Data structures & algorithms (Python, Java)", "testing-se", "intermediate", None, False, False),
    ("Git & GitHub", "developer-tools", "intermediate", None, False, False),
    ("Linux command line", "developer-tools", "beginner", None, False, False),
    ("FFmpeg", "developer-tools", "intermediate", "reelforge", False, False),
    ("Burp Suite", "security", "beginner", None, False, False),
    ("Network scanning", "security", "beginner", None, False, False),
    ("OWASP Top 10", "security", "beginner", None, False, False),
]

PROJECTS = [
    {
        "slug": "skyntri",
        "title": "Skyntri",
        "subtitle": "AI-Based Skin Health Assistant",
        "label": "Final Year Project",
        "summary": (
            "An AI-assisted skin-health web application that analyses skin images with a multi-label CNN, scans "
            "product ingredients with OCR, and tracks progress over time. Educational project — not a diagnostic tool."
        ),
        "category": "computer-vision",
        "secondary": ["deep-learning", "full-stack"],
        "status": "completed",
        "technologies": [
            "Python",
            "TensorFlow/Keras",
            "CNN",
            "FastAPI",
            "React",
            "Tailwind CSS",
            "Tesseract OCR",
            "SQLite",
        ],
        "problem": (
            "Skin-care guidance is scattered, and it is hard to relate general advice to your own skin and the products "
            "you use. Skyntri explores how image analysis and ingredient checking can support more informed skin-care "
            "decisions, while making clear that it does not replace professional medical advice."
        ),
        "contribution": [
            "Trained a multi-label CNN-based deep learning model to classify ten visible skin-pattern classes from images.",
            "Built the React frontend and FastAPI backend, including authentication, an AI chat assistant, progress tracking, and PDF reports.",
            "Implemented an OCR ingredient scanner with fuzzy matching that gives skin-type-aware ingredient safety guidance.",
        ],
        "features": [
            {
                "name": "Skin-pattern image analysis",
                "status": "implemented",
                "description": "A multi-label CNN classifies ten visible skin-pattern classes from an uploaded image.",
            },
            {
                "name": "Ingredient scanner",
                "status": "implemented",
                "description": "Tesseract OCR reads a product's ingredient list; fuzzy matching maps the text to known ingredients for skin-type-aware safety guidance.",
            },
            {"name": "AI chat assistant", "status": "implemented"},
            {"name": "Progress tracking", "status": "implemented"},
            {"name": "PDF reports", "status": "implemented"},
            {"name": "User accounts and authentication", "status": "implemented"},
        ],
        "implementation": [
            "Model: a CNN trained with TensorFlow/Keras as a multi-label classifier over ten visible skin-pattern classes.",
            "Backend: FastAPI, providing authentication, the chat assistant, progress tracking, and PDF report generation, with SQLite for storage.",
            "Frontend: React with Tailwind CSS.",
            "OCR pipeline: Tesseract extracts ingredient text from product photos, and fuzzy matching handles imperfect OCR output when looking up ingredients.",
        ],
        "evaluation_note": (
            "Model evaluation metrics will be published here together with the dataset, data split, and evaluation "
            "method. Skyntri has not undergone clinical validation."
        ),
        "notice_title": "Educational project — not a medical device",
        "notice_body": (
            "Skyntri was built for learning and research as a final year project. It does not provide a medical "
            "diagnosis and is not a substitute for advice from a dermatologist or other qualified healthcare professional."
        ),
    },
    {
        "slug": "local-ai-lab",
        "title": "Local AI Lab",
        "subtitle": "AI Model Benchmarking Platform",
        "summary": (
            "A benchmarking platform for comparing machine-learning, deep-learning, and locally hosted language models "
            "on consistent tasks and hardware, to support evidence-based model selection."
        ),
        "category": "local-ai",
        "secondary": ["mlops", "machine-learning"],
        "status": "in_progress",
        "technologies": ["Python", "Scikit-learn", "PyTorch", "Ollama", "FastAPI", "Docker"],
        "problem": (
            "Choosing a model is often guesswork. Published benchmarks rarely reflect your own hardware, task, or "
            "configuration, and results are hard to compare when each run is set up differently. Local AI Lab aims to "
            "make comparisons repeatable: the same tasks on the same hardware, with the settings of every run recorded."
        ),
        "contribution": [
            "Developed the platform for comparing classical machine-learning and deep-learning models side by side.",
            "Set up evaluation on accuracy, F1-score, inference latency, and resource utilisation.",
            "Implemented experiment tracking, and am extending benchmarking to locally hosted LLMs served through Ollama.",
        ],
        "features": [
            {
                "name": "Side-by-side model comparison",
                "status": "implemented",
                "description": "Compare classical machine-learning and deep-learning models on the same data.",
            },
            {
                "name": "Core evaluation metrics",
                "status": "implemented",
                "description": "Accuracy, F1-score, inference latency, and resource utilisation.",
            },
            {"name": "Experiment tracking", "status": "implemented"},
            {"name": "Local LLM benchmarking through Ollama", "status": "in_progress"},
            {
                "name": "Task-quality evaluation for language models",
                "status": "planned",
                "description": "Score models on a consistent set of tasks.",
            },
            {
                "name": "Throughput and memory measurements",
                "status": "planned",
                "description": "Record tokens per second and memory consumption for each run.",
            },
            {
                "name": "Run metadata",
                "status": "planned",
                "description": "Store the model version and configuration with every result.",
            },
            {
                "name": "Hardware-aware model recommendations",
                "status": "planned",
                "description": "Help users pick a suitable model for their task and machine.",
            },
        ],
        "evaluation_note": (
            "No benchmark results are published yet. Results will be reported with the hardware, model versions, and "
            "configuration used for each run."
        ),
    },
    {
        "slug": "datatalk",
        "title": "DataTalk",
        "subtitle": "AI Database Analyst",
        "summary": (
            "A data assistant that aims to let users ask questions about structured data in plain English and get back "
            "a SQL query, its results, and a chart. Currently in development."
        ),
        "category": "nlp-llm",
        "secondary": ["data-science", "backend"],
        "status": "in_progress",
        "technologies": ["Python", "LLMs", "Scikit-learn", "PostgreSQL", "FastAPI", "React"],
        "problem": (
            "Answering questions about a database usually requires knowing SQL and the schema. DataTalk explores "
            "whether a language model can translate plain-English questions into executable PostgreSQL queries, and how "
            "to validate those queries before they run."
        ),
        "features": [
            {"name": "Natural-language to PostgreSQL translation", "status": "in_progress"},
            {"name": "Query-intent classification", "status": "in_progress"},
            {"name": "SQL validation for safe execution", "status": "in_progress"},
            {"name": "Automatic visualisation of query results", "status": "in_progress"},
        ],
        "evaluation_note": (
            "Query accuracy has not been evaluated yet. Results will be published once the system is tested against a "
            "defined set of questions."
        ),
    },
    {
        "slug": "reelforge",
        "title": "ReelForge",
        "subtitle": "AI Video Generation Pipeline",
        "summary": (
            "An AI-assisted pipeline for producing short-form video, covering script processing, voiceover, subtitles, "
            "and video assembly. Currently in development."
        ),
        "category": "generative-ai",
        "secondary": ["ai-agents-automation", "computer-vision"],
        "status": "in_progress",
        "technologies": ["Python", "PyTorch", "Transformers", "OpenCV", "Text-to-Speech", "FFmpeg", "FastAPI"],
        "problem": (
            "Producing short-form video involves many repetitive steps: preparing a script, recording a voiceover, "
            "captioning, and editing. ReelForge explores how much of that workflow can be automated with AI models and "
            "media-processing tools."
        ),
        "features": [
            {"name": "Script processing", "status": "in_progress"},
            {"name": "Voiceover generation with text-to-speech", "status": "in_progress"},
            {"name": "Subtitle generation", "status": "in_progress"},
            {"name": "Video assembly with FFmpeg", "status": "in_progress"},
            {"name": "Speech-recognition integration", "status": "in_progress"},
            {
                "name": "Scene classification for automated editing",
                "status": "in_progress",
                "description": "Computer-vision models to classify scenes and guide edits.",
            },
            {"name": "Multiple language options", "status": "planned"},
        ],
    },
]

EXPERIENCES = [
    {
        "organization": "Moboroid Software Company",
        "role": "Cybersecurity Intern",
        "employment_type": "internship",
        "location": "Mirpur, AJK, Pakistan",
        "start_date": "2025-07",
        "end_date": "2025-10",
        "responsibilities": [
            "Performed network scanning and introductory penetration testing to identify security weaknesses.",
            "Analysed common web application vulnerabilities and their mitigations with reference to the OWASP Top 10.",
            "Performed web security testing with Burp Suite and strengthened Linux command-line skills for security operations.",
        ],
        "technologies": ["Burp Suite", "Linux", "Network scanning", "OWASP Top 10"],
    },
]

EDUCATION = [
    {
        "institution": "Mirpur University of Science and Technology (MUST)",
        "qualification": "BS Software Engineering",
        "location": "Mirpur, AJK, Pakistan",
        "start_date": "2022-10",
        "end_date": "2026-10",
        "grade": "CGPA 3.45 / 4.00",
        "is_primary": True,
        "highlights": ["Final Year Project: Skyntri — AI-Based Skin Health Assistant"],
        "display_order": 0,
    },
    {
        "institution": "Dr. A. Q. Khan School System and College",
        "qualification": "Intermediate (HSSC)",
        "location": "Bhimber, AJK, Pakistan",
        "start_date": "2019",
        "end_date": "2021",
        "grade": "76.73%",
        "display_order": 10,
    },
    {
        "institution": "Jabbi National Foundation College",
        "qualification": "Matriculation (SSC)",
        "location": "Bhimber, AJK, Pakistan",
        "start_date": "2017",
        "end_date": "2019",
        "grade": "84.91%",
        "display_order": 20,
    },
]

ARTICLES = [
    {
        "slug": "benchmarking-local-llms-methodology",
        "title": "How I plan to benchmark local LLMs",
        "summary": "The methodology behind Local AI Lab: tasks, hardware, and the measurements that make model comparisons repeatable.",
        "tags": ["Local AI", "Benchmarking", "Ollama"],
        "status": "draft",
        "related_project": "local-ai-lab",
        "content": "\n".join(
            [
                "## Why benchmark locally",
                "",
                '_Explain why published benchmarks don\'t answer "which model should I run on my machine?"_',
                "",
                "## What gets measured",
                "",
                "- Task quality on a fixed task set",
                "- Latency and throughput",
                "- Memory consumption",
                "- Model version and configuration",
                "",
                "## Hardware and setup",
                "",
                "_Describe the machine, OS, Ollama version, and model settings used._",
                "",
                "## Results",
                "",
                "_Add results only after running the benchmarks._",
            ]
        ),
    },
]
