import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as ai from '../services/ai';
import * as Ollama from '../services/ollama';

// Mock the underlying services
vi.mock('../services/ollama', () => ({
  explainConcept: vi.fn(),
  summarizeNotes: vi.fn(),
  generateFlashcards: vi.fn(() => Promise.resolve([])),
  generateQuiz: vi.fn(() => Promise.resolve([])),
  classifyImage: vi.fn(() => Promise.resolve({ label: 'Other', confidence: 'medium' as const })),
  classifyMultipleImages: vi.fn(() => Promise.resolve([])),
  classifyText: vi.fn(() => Promise.resolve({ label: 'Other', confidence: 'medium' as const })),
}));

vi.mock('../services/huggingface', () => ({
  generateFlashcards: vi.fn(),
  generateQuiz: vi.fn(),
  generateImage: vi.fn(() => Promise.resolve('mock-image-url')),
}));

describe('AI Coordination Service (services/ai.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates flashcard generation to Ollama', async () => {
    await ai.generateFlashcards('History', 'The French Revolution', 3, true);

    expect(Ollama.generateFlashcards).toHaveBeenCalledWith(
      'History',
      'The French Revolution',
      3,
      true
    );
  });

  it('uses Ollama for concept explanation', async () => {
    await ai.explainConcept('Science', 'Photosynthesis');

    expect(Ollama.explainConcept).toHaveBeenCalledWith('Science', 'Photosynthesis', undefined);
  });

  it('can enhance flashcards with images', async () => {
    const mockCard = { id: '1', front: 'Concept', back: 'Definition' };
    const enhanced = await ai.enhanceFlashcardWithImage(mockCard);

    expect(enhanced.imageUrl).toBe('mock-image-url');
  });
});
