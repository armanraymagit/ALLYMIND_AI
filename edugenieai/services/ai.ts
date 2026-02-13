
import * as Ollama from './ollama';
import * as HuggingFace from './huggingface';
import { Flashcard, QuizQuestion } from '../types';

/**
 * Coordinator Service
 * Now uses Ollama for Flashcards and Quizzes.
 * Uses HuggingFace only for image generation (Ollama doesn't support image generation).
 * Keeps Ollama for local-only fallbacks or simpler summaries.
 * GEMINI COMPLETELY REMOVED.
 */

export const explainConcept = async (topic: string, context: string = '', onToken?: (token: string) => void): Promise<string> => {
    // Stick with Ollama for chat to keep it local if possible,
    // or we could use HF here too. Given user asked for "locally or whatever is best",
    // HF Inference API is often "best" in quality, Ollama is best for "local".
    // I'll keep Ollama as default for the Chatbot (Explainer) since it's already working well.
    return Ollama.explainConcept(topic, context, onToken);
};

export const preloadModel = async (): Promise<void> => {
    return Ollama.preloadModel();
};

export const preloadTextModel = async (): Promise<void> => {
    return Ollama.preloadTextModel();
};

export const preloadVisionModel = async (): Promise<void> => {
    return Ollama.preloadVisionModel();
};

export const unloadModel = async (modelName: string): Promise<void> => {
    return Ollama.unloadModel(modelName);
};

export const summarizeNotes = async (notes: string, onToken?: (token: string) => void): Promise<string> => {
    return Ollama.summarizeNotes(notes, onToken);
};

export const summarizeImage = async (images: string | string[], mimeType: string, onToken?: (token: string) => void, enhanceHandwriting: boolean = false): Promise<string> => {
    return Ollama.summarizeImage(images, mimeType, onToken, enhanceHandwriting);
};

export const extractTextFromImage = async (images: string | string[], onToken?: (token: string) => void, enhanceHandwriting: boolean = false): Promise<string> => {
    return Ollama.extractTextFromImage(images, onToken, enhanceHandwriting);
};

export const trimRepetitionLoop = Ollama.trimRepetitionLoop;

export const classifyImage = Ollama.classifyImage;
export const classifyMultipleImages = Ollama.classifyMultipleImages;
export const classifyText = Ollama.classifyText;
export { type ClassificationResult, type ClassificationLabel } from './imageClassifier';

/**
 * Flashcard Generation - Now uses Ollama
 */
export const generateFlashcards = async (topic: string, content: string, count: number = 5, includeImages: boolean = false): Promise<Flashcard[]> => {
    const cards = await Ollama.generateFlashcards(topic, content, count, includeImages);

    // If images are requested, enhance cards with images using HuggingFace (Ollama doesn't generate images)
    if (includeImages && cards.length > 0) {
        try {
            const imagePrompts = cards.map(card => card.front);
            // Generate images with error handling - continue even if some fail
            const images = await Promise.allSettled(
                imagePrompts.map(prompt => HuggingFace.generateImage(prompt))
            );
            return cards.map((card, index) => ({
                ...card,
                imageUrl: images[index].status === 'fulfilled' && images[index].value
                    ? images[index].value
                    : undefined
            }));
        } catch (error) {
            console.warn('Image generation failed, continuing without images:', error);
            // Return cards without images if generation fails
            return cards;
        }
    }

    return cards;
};

/**
 * Quiz Generation - Now uses Ollama
 */
export const generateQuiz = async (topic: string, content: string, count: number = 5, includeImages: boolean = false): Promise<QuizQuestion[]> => {
    const questions = await Ollama.generateQuiz(topic, content, count, includeImages);

    // If images are requested, enhance questions with images using HuggingFace (Ollama doesn't generate images)
    if (includeImages && questions.length > 0) {
        try {
            const imagePrompts = questions.map(q => q.question);
            // Generate images with error handling - continue even if some fail
            const images = await Promise.allSettled(
                imagePrompts.map(prompt => HuggingFace.generateImage(prompt))
            );
            return questions.map((question, index) => ({
                ...question,
                imageUrl: images[index].status === 'fulfilled' && images[index].value
                    ? images[index].value
                    : undefined
            }));
        } catch (error) {
            console.warn('Image generation failed, continuing without images:', error);
            // Return questions without images if generation fails
            return questions;
        }
    }

    return questions;
};

/**
 * Lazy Image Enhancement (Call this for individual cards/questions to avoid blocking)
 */
export const enhanceFlashcardWithImage = async (card: Flashcard): Promise<Flashcard> => {
    const imageUrl = await HuggingFace.generateImage(card.front);
    return { ...card, imageUrl: imageUrl || undefined };
};

export const enhanceQuizWithImage = async (question: QuizQuestion): Promise<QuizQuestion> => {
    const imageUrl = await HuggingFace.generateImage(question.question);
    return { ...question, imageUrl: imageUrl || undefined };
};

export const summarizeLecture = async (content: string, type: 'text' | 'media' = 'text'): Promise<string> => {
    if (type === 'media') {
        return "Media summarization currently requires Gemini. Since Gemini was removed, please paste the transcript text instead to use Ollama.";
    }
    return Ollama.summarizeNotes(content);
};

export const generateImage = HuggingFace.generateImage;
