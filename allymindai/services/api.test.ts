import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => (k === 'access_token' ? 'fake-token' : null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  mockFetch.mockReset();
});

describe('API backend requests', () => {
  it('getSummaryFromBackend calls summarize-text and returns summary string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ summary: 'Short summary here.' }),
    });
    const summary = await api.getSummaryFromBackend('Some long text.');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/summarize-text/'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'Some long text.' }),
      })
    );
    expect(summary).toBe('Short summary here.');
  });

  it('getChatFromBackend calls hybrid-query and returns response string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: 'AI answer here.' }),
    });
    const response = await api.getChatFromBackend('What is photosynthesis?');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/hybrid-query/'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'What is photosynthesis?' }),
      })
    );
    expect(response).toBe('AI answer here.');
  });

  it('getQuizFromBackend calls generate-quiz and parses questions', async () => {
    const rawQuiz = `
    Some intro text.
    [
      {"question": "Q1?", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "Because."},
      {"question": "Q2?", "options": ["X","Y","Z","W"], "correctAnswer": "Y", "explanation": "Yes."}
    ]
    `;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ quiz: rawQuiz }),
    });
    const questions = await api.getQuizFromBackend('Topic: Biology');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/generate-quiz/'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'Topic: Biology' }),
      })
    );
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(2);
    expect(questions[0].question).toBe('Q1?');
    expect(questions[0].correctAnswer).toBe('A');
    expect(questions[1].question).toBe('Q2?');
  });
});
