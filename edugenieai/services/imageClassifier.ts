/**
 * Image Classification Service using Vision Models (Llama 3.2 Vision / LLaVA)
 * Classifies images into academic categories without training
 * Based on the multimodal file classification system specification
 */

import { api } from './api';

// AI Provider Preference
export type AIProvider = 'ollama' | 'huggingface';
export const DEFAULT_PROVIDER: AIProvider = (import.meta.env.VITE_AI_PROVIDER || 'ollama') as AIProvider;

// Ollama API configuration
// const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';
const VISION_MODEL = import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llama3.2-vision:latest';

// Classification categories
export const CLASSIFICATION_LABELS = [
    'Math',
    'Physics',
    'ComputerScience',
    'Chemistry',
    'Biology',
    'Assignment',
    'ExamPaper',
    'Notes',
    'Other',
    'Unclassified'
] as const;

export type ClassificationLabel = typeof CLASSIFICATION_LABELS[number];
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ClassificationResult {
    label: ClassificationLabel;
    confidence: ConfidenceLevel;
}

/**
 * Classify an image using a vision model (Llama 3.2 Vision by default)
 * @param imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @returns Classification result with label and confidence
 */

/**
 * Resize a base64 image to a maximum dimension while maintaining aspect ratio
 * @param base64Str - Base64 encoded image string
 * @param maxDim - Maximum width or height (reduced to 512 for extreme memory optimization)
 * @returns Resized base64 image string
 */
export const resizeImageBase64 = (base64Str: string, maxDim: number = 512): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width <= maxDim && height <= maxDim) {
                resolve(base64Str);
                return;
            }

            if (width > height) {
                if (width > maxDim) {
                    height = Math.round(height * (maxDim / width));
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width = Math.round(width * (maxDim / height));
                    height = maxDim;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Return as JPEG with 0.8 quality for speed/size balance
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                resolve(base64Str); // Fallback
            }
        };
        img.onerror = () => {
            resolve(base64Str); // Fallback on error
        };
    });
};

export const classifyImage = async (imageBase64: string, _: AIProvider = 'ollama'): Promise<ClassificationResult> => {
    try {
        const { purgeModelsExcept } = await import('./ollama');
        await purgeModelsExcept(VISION_MODEL);

        console.log(`[ImageClassifier] Using local ${VISION_MODEL} for classification...`);
        const fetchClassification = async (retryPrompt: string, _: number) => {
            return await api.fetchWithAuth('/api/ai/ollama-proxy/', {
                method: 'POST',
                body: JSON.stringify({
                    model: VISION_MODEL,
                    prompt: retryPrompt,
                    images: [imageBase64.replace(/^data:image\/[a-z]+;base64,/, "")],
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_ctx: 2048,    // VRAM-friendly; enough for single-image classification
                        num_predict: 150
                    },
                    keep_alive: 300
                })
            });
        };

        const simplePrompt = `Identify the primary subject of this image. Categories: Math, Physics, ComputerScience, Chemistry, Biology, Assignment, ExamPaper, Notes, Other. Respond ONLY with JSON: {"label": "...", "confidence": "high"}`;

        let data = await fetchClassification(simplePrompt, 2048);
        let response = data.response || "";

        // If empty, try one more time with even lower context and simpler prompt
        if (!response) {
            console.warn('[ImageClassifier] Empty response, retrying with emergency settings...');
            data = await fetchClassification("What is in this image? Respond with a single word category.", 1024);
            response = data.response || "";
        }

        console.log('[ImageClassifier] Raw response from Ollama:', response);

        if (!response) {
            console.warn('[ImageClassifier] Still empty after retry. Possible VRAM issue or model stall.');
            return { label: 'Other', confidence: 'low' };
        }

        const jsonMatch = response.match(/\{[^}]+\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    label: (parsed.label || 'Other') as ClassificationLabel,
                    confidence: (parsed.confidence || 'low') as ConfidenceLevel
                };
            } catch (pErr) {
                console.error('[ImageClassifier] JSON parse error:', pErr);
            }
        }

        // Fallback: search for category names in raw text
        const foundLabel = CLASSIFICATION_LABELS.find(l => response.toLowerCase().includes(l.toLowerCase()));
        if (foundLabel) {
            return { label: foundLabel as ClassificationLabel, confidence: 'medium' };
        }

        console.warn('[ImageClassifier] Invalid JSON and no label found in text:', response);
        return { label: 'Other', confidence: 'low' };
    } catch (ollamaError) {
        console.error('[ImageClassifier] Local classification failed:', ollamaError);
        return {
            label: 'Unclassified',
            confidence: 'low'
        };
    }
};

/**
 * Classify multiple images and return majority vote
 * Useful for multi-page PDFs or batch processing
 * @param imagesBase64 - Array of base64 encoded images
 * @returns Classification result based on majority vote
 */
export const classifyMultipleImages = async (imagesBase64: string[]): Promise<ClassificationResult> => {
    if (imagesBase64.length === 0) {
        throw new Error('No images provided for classification');
    }

    if (imagesBase64.length === 1) {
        return classifyImage(imagesBase64[0]);
    }

    // Classify each image
    const results = await Promise.all(
        imagesBase64.map(img => classifyImage(img))
    );

    // Count occurrences of each label
    const labelCounts = new Map<ClassificationLabel, number>();
    const confidenceLevels: ConfidenceLevel[] = [];

    results.forEach(result => {
        labelCounts.set(result.label, (labelCounts.get(result.label) || 0) + 1);
        confidenceLevels.push(result.confidence);
    });

    // Find the most common label (majority vote)
    let maxCount = 0;
    let majorityLabel: ClassificationLabel = 'Other';

    labelCounts.forEach((count, label) => {
        if (count > maxCount) {
            maxCount = count;
            majorityLabel = label;
        }
    });

    // Determine overall confidence
    // If all agree -> high, if majority agrees -> medium, if split -> low
    const agreementRatio = maxCount / results.length;
    let overallConfidence: ConfidenceLevel;

    if (agreementRatio === 1) {
        // All images classified the same
        overallConfidence = 'high';
    } else if (agreementRatio >= 0.6) {
        // Strong majority
        overallConfidence = 'medium';
    } else {
        // Split decision
        overallConfidence = 'low';
    }

    return {
        label: majorityLabel,
        confidence: overallConfidence,
    };
};

/**
 * Classify text content using keyword-based rules
 * Fallback for digital PDFs and text files
 * @param text - Text content to classify
 * @returns Classification result
 */
export const classifyText = (text: string): ClassificationResult => {
    const lowerText = text.toLowerCase();

    // Math keywords
    if (/\b(integral|derivative|matrix|equation|theorem|proof|∫|∑|lim|∂)\b/i.test(text)) {
        return { label: 'Math', confidence: 'high' };
    }

    // Physics keywords
    if (/\b(voltage|current|ohm|force|energy|momentum|circuit|newton|joule)\b/i.test(lowerText)) {
        return { label: 'Physics', confidence: 'high' };
    }

    // Computer Science keywords
    if (/\b(function|class|import|def|algorithm|code|programming|python|java)\b/i.test(lowerText)) {
        return { label: 'ComputerScience', confidence: 'high' };
    }

    // Chemistry keywords
    if (/\b(h2o|nacl|molecule|atom|reaction|chemical|element|compound)\b/i.test(lowerText)) {
        return { label: 'Chemistry', confidence: 'high' };
    }

    // Biology keywords
    if (/\b(cell|dna|organism|evolution|species|protein|gene|biology)\b/i.test(lowerText)) {
        return { label: 'Biology', confidence: 'high' };
    }

    // Assignment keywords
    if (/\b(assignment|homework|submit|due date|deadline)\b/i.test(lowerText)) {
        return { label: 'Assignment', confidence: 'medium' };
    }

    // Exam keywords
    if (/\b(question \d+|section [a-z]|exam|test|quiz|marks|total points)\b/i.test(lowerText)) {
        return { label: 'ExamPaper', confidence: 'medium' };
    }

    // Notes keywords
    if (/\b(notes|lecture|chapter|summary|key points)\b/i.test(lowerText)) {
        return { label: 'Notes', confidence: 'medium' };
    }

    // Default to Other with low confidence
    return { label: 'Other', confidence: 'low' };
};

/**
 * Check if vision model is available
 * @returns True if model is available, false otherwise
 */
export const isVisionModelAvailable = async (): Promise<boolean> => {
    try {
        const data = await api.fetchWithAuth('/api/ai/ollama-proxy/', {
            method: 'POST',
            body: JSON.stringify({
                model: VISION_MODEL,
                prompt: "",
                stream: false
            })
        });
        return !!data;
    } catch (error) {
        console.error('Failed to check vision model availability:', error);
        return false;
    }
};
