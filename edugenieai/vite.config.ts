import path from 'path';
import react from '@vitejs/plugin-react';

/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Base path for GitHub Pages (use repository name)
    // For custom domain or root deployment, set to '/'
    base: process.env.VITE_BASE_PATH || '/',

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    optimizeDeps: {
      include: ['chromadb'],
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.HUGGINGFACE_API_KEY': JSON.stringify(env.HUGGINGFACE_API_KEY || ''),
      'process.env.OLLAMA_BASE_URL': JSON.stringify(
        env.OLLAMA_BASE_URL || 'http://localhost:11434'
      ),
      'process.env.OLLAMA_MODEL': JSON.stringify(env.OLLAMA_MODEL || 'qwen2.5'),
      'process.env.OLLAMA_VISION_MODEL': JSON.stringify(env.OLLAMA_VISION_MODEL || 'qwen2.5vl:7b'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'chromadb-default-embed': path.resolve(__dirname, 'stubs/chromadb-default-embed.ts'),
        '@xenova/transformers': path.resolve(__dirname, 'stubs/chromadb-default-embed.ts'),
      },
    },
    build: {
      // Optimize build for production
      rollupOptions: {
        external: ['chromadb-default-embed', '@xenova/transformers', 'onnxruntime-node'],
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            markdown: ['react-markdown'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
