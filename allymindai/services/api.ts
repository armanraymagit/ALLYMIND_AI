import type { QuizQuestion } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export { API_BASE_URL };

/** Parse raw quiz text from backend LLM into QuizQuestion[]. */
function parseQuizTextToQuestions(quizText: string): QuizQuestion[] {
    const raw = quizText.trim();
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']') + 1;
    if (start === -1 || end <= start) return [];
    try {
        const arr = JSON.parse(raw.slice(start, end)) as unknown[];
        return (Array.isArray(arr) ? arr : []).map((item: unknown, index: number) => {
            const o = item as Record<string, unknown>;
            const options = Array.isArray(o.options) ? o.options.map(String) : [];
            return {
                id: `quiz-${Date.now()}-${index}`,
                question: String(o.question ?? ''),
                options: options.length >= 4 ? options : [...options, '', '', ''].slice(0, 4),
                correctAnswer: String(o.correctAnswer ?? o.correct ?? ''),
                explanation: String(o.explanation ?? ''),
            };
        }).filter(q => q.question);
    } catch {
        return [];
    }
}

class ApiService {
    private static instance: ApiService;
    private token: string | null = localStorage.getItem('access_token');

    private constructor() { }

    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    public setToken(token: string | null) {
        this.token = token;
        if (token) {
            localStorage.setItem('access_token', token);
        } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
    }

    public async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        } as Record<string, string>;

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        let response = await fetch(url, { ...options, headers });

        // Handle token refresh if token expired (401)
        if (response.status === 401 && localStorage.getItem('refresh_token')) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.token}`;
                response = await fetch(url, { ...options, headers });
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    private async refreshToken(): Promise<boolean> {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/api/ai/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });

            if (response.ok) {
                const data = await response.json();
                this.setToken(data.access);
                return true;
            }
        } catch (error) {
            console.error('Failed to refresh token', error);
        }

        this.setToken(null);
        return false;
    }

    // Auth Methods
    public async login(username: string, password: string) {
        const response = await fetch(`${API_BASE_URL}/api/ai/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Login failed');
        }

        const data = await response.json();
        this.setToken(data.access);
        localStorage.setItem('refresh_token', data.refresh);
        return data;
    }

    public async register(userData: any) {
        const response = await fetch(`${API_BASE_URL}/api/ai/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(JSON.stringify(errorData) || 'Registration failed');
        }

        return response.json();
    }

    // AI-Specific Backend Methods (Django)
    public async summarizeText(text: string): Promise<{ summary: string }> {
        return this.fetchWithAuth('/api/ai/summarize-text/', {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    }

    public async generateQuiz(text: string): Promise<{ quiz: string }> {
        return this.fetchWithAuth('/api/ai/generate-quiz/', {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    }

    public async chat(query: string): Promise<{ response: string }> {
        return this.fetchWithAuth('/api/ai/hybrid-query/', {
            method: 'POST',
            body: JSON.stringify({ query }),
        });
    }

    /** Get summary from backend (returns summary string). */
    public async getSummaryFromBackend(text: string): Promise<string> {
        const res = await this.summarizeText(text);
        return res.summary ?? '';
    }

    /** Get chat/RAG response from backend. */
    public async getChatFromBackend(query: string): Promise<string> {
        const res = await this.chat(query);
        return res.response ?? '';
    }

    /** Get parsed quiz questions from backend (backend returns raw LLM text; we parse JSON array). */
    public async getQuizFromBackend(text: string): Promise<QuizQuestion[]> {
        const { quiz } = await this.generateQuiz(text);
        return parseQuizTextToQuestions(quiz);
    }

    /** Upload image for classification; returns backend description/label. */
    public async uploadImageForClassification(file: File): Promise<{ description: string }> {
        const url = `${API_BASE_URL}/api/ai/notes/upload-image/`;
        const formData = new FormData();
        formData.append('image', file);
        const headers: Record<string, string> = {};
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        const response = await fetch(url, { method: 'POST', body: formData, headers });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || err.detail || `HTTP ${response.status}`);
        }
        const data = await response.json();
        return { description: data.description ?? '' };
    }

    // Stats / Study Time
    public async syncStudyTime(date: string, duration: number) {
        return this.fetchWithAuth('/api/ai/study-time/', {
            method: 'POST',
            body: JSON.stringify({ date, duration }),
        });
    }

    public async getStudyStats() {
        return this.fetchWithAuth('/api/ai/study-time/');
    }

    // Notes
    public async getNotes() {
        return this.fetchWithAuth('/api/ai/notes/');
    }

    public async saveNote(title: string, content: string) {
        return this.fetchWithAuth('/api/ai/notes/', {
            method: 'POST',
            body: JSON.stringify({ title, content }),
        });
    }
}

export const api = ApiService.getInstance();
