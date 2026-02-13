
import { api } from './api';

/**
 * Hugging Face AI Service
 * Using Inference API via Backend Proxy to avoid CORS issues.
 */

const TEXT_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";
const IMAGE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
const VISION_MODEL = "Qwen/Qwen2-VL-2B-Instruct";

/**
 * Generic text generation helper using backend proxy
 */
const generateText = async (prompt: string, systemPrompt?: string): Promise<string> => {
    try {
        const result = await api.fetchWithAuth('/api/ai/hf-proxy/', {
            method: "POST",
            body: JSON.stringify({
                model: TEXT_MODEL,
                payload: {
                    inputs: `<s>[INST] ${systemPrompt ? systemPrompt + "\n\n" : ""}${prompt} [/INST]`,
                    parameters: { max_new_tokens: 1000, temperature: 0.7 }
                }
            }),
        });

        // HF returns an array or single object depending on model
        const generatedText = Array.isArray(result) ? result[0].generated_text : result.generated_text;

        // Strip the instruction part if present (standard for Mistral/Llama instruct)
        if (generatedText && generatedText.includes('[/INST]')) {
            return generatedText.split('[/INST]').pop().trim();
        }
        return generatedText || "";
    } catch (error) {
        console.error("HF generateText fail:", error);
        throw error;
    }
};

/**
 * Generates an image based on a text prompt.
 * Uses fetch directly with absolute URL for binary/blob support if needed, 
 * but proxies through backend to avoid CORS.
 */
export const generateImage = async (prompt: string): Promise<string | null> => {
    const enhancedPrompt = `educational illustration of ${prompt}, high quality, clean background, 4k resolution`;

    try {
        // We use absolute URL for the proxy to ensure it hits the Django port
        const response = await fetch('http://localhost:8000/api/ai/hf-proxy/', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                model: IMAGE_MODEL,
                payload: { inputs: enhancedPrompt }
            }),
        });

        if (!response.ok) {
            console.warn("HF Image proxy failed:", response.status);
            return null;
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Image generation failed:", error);
        return null;
    }
};

/**
 * Batch generate images for flashcards or quiz questions
 */
export const batchGenerateImages = async (prompts: string[]): Promise<(string | null)[]> => {
    const tasks = prompts.map(p => generateImage(p));
    return Promise.all(tasks);
};

/**
 * Generate flashcards using Hugging Face
 */
export const generateFlashcards = async (topic: string, content: string, count: number = 8, includeImages: boolean = false): Promise<any[]> => {
    const systemPrompt = "You are a teacher. Create educational flashcards. Return ONLY a JSON array of objects with 'front' and 'back' properties.";
    const prompt = `Generate ${count} flashcards about: Topic: ${topic}. Context: ${content}. 
  Return exactly ${count} flashcards in this format: [{"front": "...", "back": "..."}]`;

    const text = await generateText(prompt, systemPrompt);
    try {
        const startIndex = text.indexOf('[');
        const endIndex = text.lastIndexOf(']') + 1;

        if (startIndex === -1 || endIndex <= startIndex) {
            throw new Error("AI returned invalid format (no array found).");
        }

        const jsonStr = text.substring(startIndex, endIndex);
        let cards = JSON.parse(jsonStr);

        if (!Array.isArray(cards)) {
            throw new Error("AI response parsed but is not an array.");
        }

        cards = cards.map((c: any, i: number) => ({ ...c, id: `hf-card-${Date.now()}-${i}` }));

        if (includeImages) {
            const imagePrompts = cards.map((c: any) => c.front);
            const images = await batchGenerateImages(imagePrompts);
            return cards.map((c: any, i: number) => ({ ...c, imageUrl: images[i] || undefined }));
        }

        return cards;
    } catch (e: any) {
        console.error("Failed to parse HF flashcards JSON:", text, e);
        throw new Error(`Could not parse AI response: ${e.message}`);
    }
};

/**
 * Generate quiz using Hugging Face
 */
export const generateQuiz = async (topic: string, content: string, count: number = 5, includeImages: boolean = false): Promise<any[]> => {
    const systemPrompt = "You are a quiz master. Create multiple choice questions. Return ONLY a JSON array of objects.";
    const prompt = `Generate a ${count}-question quiz about: Topic: ${topic}. Content: ${content}.
  Return exactly ${count} questions in this format: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "explanation": "..."}]`;

    const text = await generateText(prompt, systemPrompt);
    try {
        const startIndex = text.indexOf('[');
        const endIndex = text.lastIndexOf(']') + 1;

        if (startIndex === -1 || endIndex <= startIndex) {
            throw new Error("AI returned invalid format (no array found).");
        }

        const jsonStr = text.substring(startIndex, endIndex);
        let quiz = JSON.parse(jsonStr);

        if (!Array.isArray(quiz)) {
            throw new Error("AI response parsed but is not an array.");
        }

        quiz = quiz.map((q: any, i: number) => ({ ...q, id: `hf-quiz-${Date.now()}-${i}` }));

        if (includeImages) {
            const imagePrompts = quiz.map((q: any) => q.question);
            const images = await batchGenerateImages(imagePrompts);
            return quiz.map((q: any, i: number) => ({ ...q, imageUrl: images[i] || undefined }));
        }

        return quiz;
    } catch (e: any) {
        console.error("Failed to parse HF quiz JSON:", text, e);
        throw new Error(`Could not parse AI response: ${e.message}`);
    }
};

/**
 * Helper to resize image specifically for Hugging Face to reduce payload size
 */
const resizeForHF = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const maxDim = 800;
            if (img.width <= maxDim && img.height <= maxDim) {
                resolve(base64);
                return;
            }
            const scale = Math.min(maxDim / img.width, maxDim / img.height);
            const canvas = document.createElement('canvas');
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else resolve(base64);
        };
        img.onerror = () => resolve(base64);
    });
};

/**
 * Vision-to-Text using Qwen2.5-VL-7B-Instruct via Backend Proxy
 */
export const analyzeImageWithHF = async (imageBase64: string, prompt: string): Promise<string> => {
    // Resize to keep payload small (helps with proxy/SSL stability)
    const resized = await resizeForHF(imageBase64);

    const cleanedImage = resized.startsWith('data:')
        ? resized
        : `data:image/jpeg;base64,${resized.replace(/^data:image\/[a-z]+;base64,/, "")}`;

    try {
        const result = await api.fetchWithAuth('/api/ai/hf-proxy/', {
            method: "POST",
            body: JSON.stringify({
                model: VISION_MODEL,
                payload: {
                    inputs: {
                        question: prompt,
                        image: cleanedImage
                    },
                    parameters: {
                        max_new_tokens: 1000,
                        temperature: 0.2
                    }
                }
            }),
        });

        if (typeof result === 'string') {
            return result;
        } else if (result.choices && result.choices[0]?.message?.content) {
            return result.choices[0].message.content;
        } else if (result.generated_text) {
            return result.generated_text;
        } else if (Array.isArray(result) && result[0]?.generated_text) {
            return result[0].generated_text;
        } else if (result.answer) {
            return result.answer;
        }

        return JSON.stringify(result);
    } catch (error: any) {
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            console.error("HF Vision proxy failed: Authentication Error (401). Check your API Key.");
        } else if (error.message?.includes('404')) {
            console.error("HF Vision proxy failed: Model Not Found (404). Check the VISION_MODEL name.");
        } else {
            console.error("HF Vision proxy failed:", error);
        }
        throw error;
    }
};

/**
 * Classify an image using Hugging Face Vision Model
 */
export const classifyImageWithHF = async (imageBase64: string): Promise<{ label: string, confidence: string }> => {
    const prompt = `Analyze this image and classify it into ONE of these categories: Math, Physics, ComputerScience, Chemistry, Biology, Assignment, ExamPaper, Notes, or Other. Respond ONLY with JSON: {"label": "...", "confidence": "high/medium/low"}`;

    try {
        const response = await analyzeImageWithHF(imageBase64, prompt);
        const jsonMatch = response.match(/\{[^}]+\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                label: parsed.label || 'Other',
                confidence: parsed.confidence || 'low'
            };
        }
        return { label: 'Other', confidence: 'low' };
    } catch (error) {
        console.error("HF classification failed:", error);
        throw error;
    }
};

/**
 * Extract text from an image (OCR) using Hugging Face
 */
export const extractTextWithHF = async (imageBase64: string): Promise<string> => {
    const prompt = `Extract ALL visible text from this image.`;
    return await analyzeImageWithHF(imageBase64, prompt);
};

/**
 * Summarize an image using Hugging Face
 */
export const summarizeImageWithHF = async (imageBase64: string): Promise<string> => {
    const prompt = `Provide a comprehensive summary of this image content in bullet points.`;
    return await analyzeImageWithHF(imageBase64, prompt);
};
