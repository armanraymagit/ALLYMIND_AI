# EduGenie AI: Full-Stack AI Study Buddy

EduGenie AI is a powerful, full-stack application designed to help students transform dense study materials into easy-to-digest summaries, quizzes, and flashcards. It leverages local and remote AI models to provide a private and efficient learning experience.

## 🚀 Key Features

*   **Note Summarizer**: Convert long PDFs, images of notes, or text into concise bullet points.
*   **Quiz & Flashcard Generation**: Automatically generate study aids from your materials.
*   **Ollama Integration**: Uses local LLMs (Llama 3.2, Qwen) for privacy and speed.
*   **Hybrid RAG**: Intelligent retrieval-augmented generation for chatting with your notes.
*   **Image Classification**: Automatically categorizes academic content (Math, Physics, etc.).
*   **Dashboard & Progress Tracking**: Monitor your study time and note-taking habits.

## 🏗️ Architecture

The project is structured as a monorepo consisting of:

*   **`edugenieai/`**: A modern React + Vite frontend styled with Tailwind CSS and Framer Motion for smooth animations.
*   **`Django/djangoLLM/`**: A robust Django REST Framework backend handling AI orchestration, vector database (pgvector), and user management.
*   **DevOps Ready**: Integrated with Docker, CI/CD pipelines (GitHub Actions), and pre-commit hooks for high-quality code.

## 🛠️ Tech Stack

*   **Frontend**: React (19), Vite, Tailwind CSS, Recharts, Framer Motion.
*   **Backend**: Django, DRF, PostgreSQL + pgvector, PyPDF2, MoviePy.
*   **AI/ML**: Ollama (Llama 3.2, Qwen), Hugging Face Inference API.
*   **DevOps**: Docker, Docker Compose, GitHub Actions, Pre-commit.

## 🚦 Getting Started

### Prerequisites

*   **Docker & Docker Compose**
*   **Ollama** (running locally on host)
*   **Node.js & Python 3.11** (for local development)

### Quick Start with Docker

The easiest way to run the full project is using Docker Compose:

```bash
docker compose up --build
```

*   **Frontend**: [http://localhost:3000](http://localhost:3000)
*   **Backend**: [http://localhost:8000](http://localhost:8000)

### Local Development

#### Backend Setup
```bash
cd Django/djangoLLM
python -m venv env
./env/Scripts/Activate.ps1 # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend Setup
```bash
cd edugenieai
npm install
npm run dev
```

## ⚙️ Configuration

Ensure you have a `.env` file in the backend directory with following:
- `OLLAMA_HOST`: Defaults to `http://127.0.0.1:11434`
- `HUGGINGFACE_API_KEY`: Required for some vision features.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: For local DB connection.

## 🧪 CI/CD & DevOps

*   **Pre-commit Hooks**: Installed automatically (run `pre-commit run --all-files` manually).
*   **CI Pipeline**: GitHub Actions automatically runs lints, tests, and Docker builds on push to `main`.

## 📄 License

This project is licensed under the MIT License.
