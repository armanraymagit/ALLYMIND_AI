import { Flashcard, QuizQuestion } from "../types";
import { api, API_BASE_URL } from './api';

// Re-export image classification service
import {
  classifyImage,
  classifyMultipleImages,
  classifyText,
  isVisionModelAvailable,
  CLASSIFICATION_LABELS,
  type ClassificationLabel,
  type ConfidenceLevel,
  type ClassificationResult,
  resizeImageBase64,
  DEFAULT_PROVIDER,
  type AIProvider
} from './imageClassifier';


export {
  classifyImage,
  classifyMultipleImages,
  classifyText,
  isVisionModelAvailable,
  CLASSIFICATION_LABELS,
  type ClassificationLabel,
  type ConfidenceLevel,
  type ClassificationResult,
  resizeImageBase64
};

// Ollama API configuration
// const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';
// Default to llama3.2 associated models
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:latest';
// Vision model for summarization and OCR
const VISION_MODEL = import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llama3.2-vision:latest';

/**
 * Purge other models from VRAM to make room for vision tasks.
 * Sends a request with keep_alive: 0 to all other active models.
 */
export const purgeModelsExcept = async (keepModel: string): Promise<void> => {
  try {
    console.log(`[Ollama] Purging VRAM, keeping only: ${keepModel}`);
    await api.fetchWithAuth('/api/ai/ollama-proxy/', {
      method: 'GET',
      // This is a custom endpoint we might need to handle, but for now we'll assumes
      // the proxy can handle /api/ps or we'll just try to unload common ones.
    }).catch(() => ({ models: [] }));

    // For now, let's explicitly unload the main text model if it's not the vision model
    if (OLLAMA_MODEL !== keepModel) {
      await unloadModel(OLLAMA_MODEL);
    }

    // Wait a moment for VRAM to clear
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (e) {
    console.warn('[Ollama] VRAM purge failed:', e);
  }
};

/**
 * Explicitly unload a model from VRAM to make room for another.
 */
export const unloadModel = async (modelName: string): Promise<void> => {
  try {
    console.log(`[Ollama] Unloading model: ${modelName}`);
    console.log(`[Ollama] Unloading model: ${modelName}`);
    await api.fetchWithAuth('/api/ai/ollama-proxy/', {
      method: 'POST',
      body: JSON.stringify({
        model: modelName,
        keep_alive: 0
      }),
    });
  } catch (e) {
    console.warn(`[Ollama] Failed to unload ${modelName}:`, e);
  }
};



interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  format?: 'json' | object; // Can be 'json' string or JSON schema object
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_gpu?: number;
    num_ctx?: number;
    num_predict?: number;
    num_thread?: number;
    repeat_penalty?: number;
    repeat_last_n?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    /** Stop generation when any of these strings are output (reduces runaway/loops) */
    stop?: string[];
  };
  system?: string;
  images?: string[];
  keep_alive?: string | number;
}

/**
 * Generic function to call Ollama API with error handling
 */
const callOllama = async (request: OllamaGenerateRequest): Promise<string> => {
  try {
    const data = await api.fetchWithAuth('/api/ai/ollama-proxy/', {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        stream: false,
        keep_alive: request.keep_alive ?? '2h',
        options: {
          num_gpu: request.options?.num_gpu ?? -1,
          num_ctx: request.options?.num_ctx ?? 4096,
          ...request.options
        }
      }),
    });

    if (!data.response) {
      throw new Error('Ollama returned empty response');
    }

    return data.response;
  } catch (error) {
    console.error('Ollama API call failed:', error);
    throw error;
  }
};

/**
 * Call Ollama API with streaming support and automatic retry
 */
const streamOllama = async (
  request: OllamaGenerateRequest,
  onToken?: (token: string) => void
): Promise<string> => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const proxyUrl = `${API_BASE_URL}/api/ai/ollama-proxy/`;
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          ...request,
          stream: true,
          keep_alive: request.keep_alive ?? '2h',
          options: {
            num_gpu: request.options?.num_gpu ?? -1,
            num_ctx: request.options?.num_ctx ?? 4096,
            ...request.options
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Ollama API error:', response.status, errorText);
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                const token = json.response;
                fullResponse += token;
                if (onToken) onToken(token);
              }
            } catch {
              console.error('Error parsing JSON chunk');
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      lastError = error as Error;

      const isNetworkError = error instanceof TypeError &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('network') ||
          error.message.includes('ERR_NETWORK_CHANGED'));

      if (isNetworkError && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[Ollama] Network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }

  console.error('Ollama streaming failed after retries:', lastError);
  throw lastError || new Error('Ollama streaming failed');
};

/**
 * Preload the text model
 */
export const preloadTextModel = async (): Promise<void> => {
  console.log('[Ollama] Preloading text model disabled as per user request.');
};

/**
 * Preload the vision model
 */
export const preloadVisionModel = async (): Promise<void> => {
  console.log('[Ollama] Vision preloading disabled as per user request.');
};

/**
 * Coordinator for preloading models
 */
export const preloadModel = async (): Promise<void> => {
  console.log('[Ollama] Preloading coordinator disabled.');
};

/**
 * General Chat with AI (NLP)
 * Handles standard conversation and queries.
 */
export const chatWithAI = async (
  message: string,
  history: string = '',
  onToken?: (token: string) => void
): Promise<string> => {
  // Construct a conversational prompt
  const prompt = `${history}\nUser: ${message}\nAssistant:`;

  const request: OllamaGenerateRequest = {
    model: OLLAMA_MODEL,
    prompt,
    options: {
      temperature: 0.8, // Slightly higher for creativity in chat
    },
    system: "You are TECHBRO, a friendly and helpful AI study companion. Engage in natural conversation, answer questions clearly, and help the user learn."
  };

  if (onToken) {
    return await streamOllama(request, onToken);
  }

  return await callOllama(request);
};

/**
 * Explain a concept to a student
 * (kept for backward compatibility, but can alias to chatWithAI with specific instructions)
 */
export const explainConcept = async (
  topic: string,
  context: string = '',
  onToken?: (token: string) => void
): Promise<string> => {
  // We can just use the chat function but inject the "Explain..." instruction into the message or prompt
  // But for now, let's keep the specialized prompt if the user explicitly asks for an explanation via this specific API.
  // However, since the UI calls this for *everything* in the Explainer, we should probably make IT the chat function.

  // Let's UPDATE explainConcept to be more "chatty" if the input doesn't look like a strict concept query.
  // Or better, we expose chatWithAI and update the UI to use it.

  // For this refactor, I will introduce chatWithAI and keep explainConcept specialized for "Explain X" tasks
  // if we were distinguishing them, but the UI uses 'explainConcept' for the main chat.
  // So I will redirect 'explainConcept' to 'chatWithAI' with a flexible prompt.

  return chatWithAI(topic, context, onToken);
};

/**
 * Summarize study notes
 */
export const summarizeNotes = async (notes: string, onToken?: (token: string) => void): Promise<string> => {
  const prompt = `Summarize these study notes into clear bullet points and highlight the most important concepts:\n\n${notes}`;

  const request: OllamaGenerateRequest = {
    model: VISION_MODEL, // Use Qwen 2.5 V for summarization
    prompt,
    options: {
      temperature: 0.3,
    },
    system: "You are a professional note-taker. Extract the core essence of the provided text while maintaining factual accuracy."
  };

  if (onToken) {
    return await streamOllama(request, onToken);
  }

  return await callOllama(request);
};

/**
 * Trims repetitive/looping content from model output.
 * Detects when a chunk of text repeats 2+ times and truncates before the loop.
 */
export const trimRepetitionLoop = (text: string, minChunkLen = 40): string => {
  if (!text || text.length < minChunkLen * 2) return text;
  const maxChunk = Math.min(120, Math.floor(text.length / 3));
  for (let chunkLen = maxChunk; chunkLen >= minChunkLen; chunkLen -= 8) {
    const tail = text.slice(-chunkLen * 2);
    const first = tail.slice(0, chunkLen);
    const second = tail.slice(chunkLen);
    if (first === second && first.trim().length > 0) {
      const cut = text.length - chunkLen * 2;
      const trimAt = Math.max(0, cut);
      return text.slice(0, trimAt).trimEnd();
    }
  }
  // Check for 3+ repeats of a shorter pattern at the end
  for (let chunkLen = Math.min(80, Math.floor(text.length / 4)); chunkLen >= 20; chunkLen -= 5) {
    const tail = text.slice(-chunkLen * 3);
    const a = tail.slice(0, chunkLen);
    const b = tail.slice(chunkLen, chunkLen * 2);
    const c = tail.slice(chunkLen * 2);
    if (a === b && b === c && a.trim().length > 0) {
      const trimAt = Math.max(0, text.length - chunkLen * 3);
      return text.slice(0, trimAt).trimEnd();
    }
  }
  return text;
};

/**
 * Summarize text from an image (OCR + summarization)
 * Uses the configured vision model (default: llama3.2-vision) or Hugging Face
 * @param images - Base64 encoded image(s)
 * @param _mimeType - MIME type (for compatibility)
 * @param onToken - Optional streaming callback
 * @param enhanceHandwriting - If true, preprocesses images to enhance handwriting (especially blue pen)
 * @param provider - AI provider to use
 */
export const summarizeImage = async (
  images: string | string[],
  _: string,
  onToken?: (token: string) => void,
  _2: boolean = false,
  _3: AIProvider = DEFAULT_PROVIDER
): Promise<string> => {
  const imageArray = Array.isArray(images) ? images : [images];
  const image = imageArray[0];

  try {
    await purgeModelsExcept(VISION_MODEL);
    console.log('[Ollama] Using local models for handwriting extraction and summarization...');
    const prompt = `Look at this image and do exactly two things. Do not repeat yourself or add extra commentary.

1) Extracted text: Write all text you see in the image, exactly as written (OCR).
2) Content summary: In a short "Content Summary" section, list the main ideas in bullet points.

Output format:
---
Extracted text:
[text here]

Content summary:
• [bullet 1]
• [bullet 2]
---
Stop after the summary. Do not repeat. Output nothing after the final ---.`;
    const request: OllamaGenerateRequest = {
      model: VISION_MODEL,
      prompt,
      images: [image.replace(/^data:image\/[a-z]+;base64,/, "")],
      options: {
        temperature: 0,
        num_ctx: 2048,
        num_predict: 700,        // Cap length; stop sequences end the loop
        repeat_penalty: 1.6,     // Strong anti-repetition to end the loop
        repeat_last_n: 128,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        top_p: 0.9,
        top_k: 40,
        stop: ['\n\n\n', '---\n---', '---\n---\n', 'Extracted text:\nExtracted text:'], // Stop once done
      },
      system: "You are a precise vision assistant. Extract text exactly from the image, then give a brief bullet-point summary. Do not repeat content. Do not invent text that is not in the image."
    };

    let result: string;
    if (onToken) {
      result = await streamOllama(request, onToken);
    } else {
      result = await callOllama(request);
    }
    return trimRepetitionLoop(result);
  } catch (ollamaError) {
    console.error('[Ollama] Local summarization failed:', ollamaError);
    return "Error: Could not generate summary with local AI model. Please ensure Ollama is running.";
  }
}

/**
 * Extract raw text from an image (OCR only, no summarization)
 * Useful for handwritten notes where you want the full text extraction
 * Uses the configured vision model (default: llama3.2-vision) or Hugging Face
 * @param images - Base64 encoded image(s)
 * @param onToken - Optional streaming callback
 * @param enhanceHandwriting - If true, preprocesses images to enhance handwriting (especially blue pen)
 * @param provider - AI provider to use
 */
export const extractTextFromImage = async (
  images: string | string[],
  onToken?: (token: string) => void,
  _: boolean = false,
  __: AIProvider = DEFAULT_PROVIDER
): Promise<string> => {
  const imageArray = Array.isArray(images) ? images : [images];
  const image = imageArray[0];

  try {
    await purgeModelsExcept(VISION_MODEL);
    console.log('[Ollama] Using local models for OCR...');
    const prompt = `Extract ALL visible text from this image accurately. Maintain the layout if possible. Output only the extracted text. When finished, stop immediately. Do not repeat, add commentary, or continue.`;
    const request: OllamaGenerateRequest = {
      model: VISION_MODEL,
      prompt,
      images: [image.replace(/^data:image\/[a-z]+;base64,/, "")],
      options: {
        temperature: 0,
        num_ctx: 2048,           // VRAM-friendly context for OCR
        num_predict: 600,        // Cap length; extraction stops via stop sequences
        repeat_penalty: 1.6,     // Strong anti-repetition to end the loop
        repeat_last_n: 128,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        top_p: 0.9,
        top_k: 40,
        stop: ['\n\n\n', '[END]', '\n[END]', '---\n---', 'Extracted text:\nExtracted text:'], // Stop once done or looping
      },
      system: "You are a high-precision OCR assistant. Output ONLY the text from the image. Stop as soon as extraction is complete. Do not invent, repeat, or add anything else."
    };

    let result: string;
    if (onToken) {
      result = await streamOllama(request, onToken);
    } else {
      result = await callOllama(request);
    }
    // Remove any [END] marker and trim loops
    return trimRepetitionLoop(result.replace(/\[END\]\s*$/i, '').trim());
  } catch (ollamaError) {
    console.error('[Ollama] Local OCR failed:', ollamaError);
    return "Error: Could not extract text with local AI model. Please ensure Ollama is running.";
  }
}

/**
 * Generate flashcards from topic and content
 * Enforces JSON output mode for reliability
 * Note: includeImages parameter is accepted for compatibility but Ollama doesn't generate images
 */
export const generateFlashcards = async (topic: string, content: string, count: number = 8, _: boolean = false): Promise<Flashcard[]> => {
  const prompt = `Generate exactly ${count} flashcards based on the following topic and content.

Topic: ${topic}
Content: ${content || 'No additional content provided.'}

IMPORTANT: Return ONLY a JSON array. Do not include any explanation, markdown, or text outside the JSON array.
Each flashcard must have exactly two fields: "front" and "back".`;

  // Use JSON schema for better reliability
  const jsonSchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        front: { type: 'string' },
        back: { type: 'string' }
      },
      required: ['front', 'back'],
      additionalProperties: false
    }
  };

  const response = await callOllama({
    model: OLLAMA_MODEL,
    prompt,
    format: jsonSchema, // Use JSON schema for structured output
    options: {
      temperature: 0.7,
    },
    system: "You are an expert at creating educational flashcards. You must respond with a valid JSON array only, no other text."
  });

  try {
    // Parse the response
    let parsed: any;
    try {
      parsed = JSON.parse(response);
    } catch {
      // If direct parse fails, try to extract JSON array from response
      const startIndex = response.indexOf('[');
      const endIndex = response.lastIndexOf(']') + 1;

      if (startIndex === -1 || endIndex <= startIndex) {
        console.error('No JSON array found in Ollama response:', response.substring(0, 200));
        throw new Error('AI returned invalid format (no array found).');
      }

      const jsonStr = response.substring(startIndex, endIndex);
      parsed = JSON.parse(jsonStr);
    }

    // Handle various Ollama response formats
    let rawJson: any[] = [];

    if (Array.isArray(parsed)) {
      // Direct array format (most common with JSON schema)
      rawJson = parsed;
    } else if (parsed && parsed.type === 'array') {
      // Ollama structured format: { type: "array", data: [...] } or { type: "array", items: [...] }
      if (Array.isArray(parsed.items)) {
        rawJson = parsed.items;
      } else if (Array.isArray(parsed.data)) {
        rawJson = parsed.data;
      } else {
        throw new Error('AI response has type "array" but no data/items field found.');
      }
    } else {
      throw new Error('AI response parsed but is not an array.');
    }

    // Filter and extract actual card data
    const cards = rawJson
      .filter((item: any) => {
        // Skip schema definitions
        if (item && item.properties) return false;
        // Keep items that have 'front' and 'back' fields
        return item && typeof item === 'object' && (item.front !== undefined || item.back !== undefined);
      })
      .map((item: any) => {
        // Handle nested data structures
        if (item && item.type === 'object' && item.data) {
          return item.data;
        }
        return item;
      });

    if (cards.length === 0) {
      throw new Error('No valid flashcards found in response.');
    }

    return cards.map((item: any, index: number) => ({
      front: String(item.front || ''),
      back: String(item.back || ''),
      id: `card-${Date.now()}-${index}`
    }));
  } catch (error) {
    console.error('Failed to parse flashcards JSON:', error, 'Response:', response.substring(0, 500));
    throw new Error(`Failed to generate flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate a quiz from topic and content
 * Enforces JSON output mode for reliability
 * Note: includeImages parameter is accepted for compatibility but Ollama doesn't generate images
 */
export const generateQuiz = async (topic: string, content: string, count: number = 5, _: boolean = false): Promise<QuizQuestion[]> => {
  const prompt = `Generate exactly ${count} multiple choice quiz questions based on the following topic and content.

Topic: ${topic}
Content: ${content || 'No additional content provided.'}

IMPORTANT: Return ONLY a JSON array. Do not include any explanation, markdown, or text outside the JSON array.
Each question must have: "question", "options" (array of 4 strings), "correctAnswer" (must match one option exactly), and "explanation".`;

  // Use JSON schema for better reliability
  const jsonSchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        options: {
          type: 'array',
          items: { type: 'string' },
          minItems: 4,
          maxItems: 4
        },
        correctAnswer: { type: 'string' },
        explanation: { type: 'string' }
      },
      required: ['question', 'options', 'correctAnswer', 'explanation'],
      additionalProperties: false
    }
  };

  const response = await callOllama({
    model: OLLAMA_MODEL,
    prompt,
    format: jsonSchema, // Use JSON schema for structured output
    options: {
      temperature: 0.7,
    },
    system: "You are an expert at creating educational quizzes. You must respond with a valid JSON array only, no other text. The correctAnswer must exactly match one of the options."
  });

  try {
    // Parse the response
    let parsed: any;
    try {
      parsed = JSON.parse(response);
    } catch {
      // If direct parse fails, try to extract JSON array from response
      const startIndex = response.indexOf('[');
      const endIndex = response.lastIndexOf(']') + 1;

      if (startIndex === -1 || endIndex <= startIndex) {
        console.error('No JSON array found in Ollama response:', response.substring(0, 200));
        throw new Error('AI returned invalid format (no array found).');
      }

      const jsonStr = response.substring(startIndex, endIndex);
      parsed = JSON.parse(jsonStr);
    }

    // Handle various Ollama response formats
    let rawJson: any[] = [];

    if (Array.isArray(parsed)) {
      // Direct array format (most common with JSON schema)
      rawJson = parsed;
    } else if (parsed && parsed.type === 'array') {
      // Ollama structured format: { type: "array", data: [...] } or { type: "array", items: [...] }
      if (Array.isArray(parsed.items)) {
        rawJson = parsed.items;
      } else if (Array.isArray(parsed.data)) {
        rawJson = parsed.data;
      } else {
        throw new Error('AI response has type "array" but no data/items field found.');
      }
    } else {
      throw new Error('AI response parsed but is not an array.');
    }

    // Filter and extract actual question data
    const questions = rawJson
      .filter((item: any) => {
        // Skip schema definitions
        if (item && item.properties) return false;
        // Keep items that have 'question' field
        return item && typeof item === 'object' && item.question !== undefined;
      })
      .map((item: any) => {
        // Handle nested data structures
        if (item && item.type === 'object' && item.data) {
          return item.data;
        }
        return item;
      });

    if (questions.length === 0) {
      throw new Error('No valid quiz questions found in response.');
    }

    return questions.map((item: any, index: number) => ({
      question: String(item.question || ''),
      options: Array.isArray(item.options) ? item.options.map((opt: any) => String(opt)) : [],
      correctAnswer: String(item.correctAnswer || ''),
      explanation: String(item.explanation || ''),
      id: `quiz-${Date.now()}-${index}`
    }));
  } catch (error) {
    console.error('Failed to parse quiz JSON:', error, 'Response:', response.substring(0, 500));
    throw new Error(`Failed to generate quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
