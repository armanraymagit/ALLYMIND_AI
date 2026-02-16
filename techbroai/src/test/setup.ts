
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock URL.createObjectURL since it's not in JSDOM
if (typeof window !== 'undefined') {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}

// Mock process.env for client-side tests
global.process = {
    ...global.process,
    env: {
        GEMINI_API_KEY: 'test-key',
        HUGGINGFACE_API_KEY: 'test-key',
    }
};
