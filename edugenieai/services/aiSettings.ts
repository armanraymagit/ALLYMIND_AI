
export type AIProvider = 'hf' | 'ollama';

/**
 * Simplified Provider Model
 * Gemini is removed. We default to Hugging Face for generation quality.
 */
export const getPreferredProvider = (): AIProvider => {
    return 'hf';
};

export const getAIProvider = getPreferredProvider;
export const setAIProvider = (_provider: AIProvider) => { };
