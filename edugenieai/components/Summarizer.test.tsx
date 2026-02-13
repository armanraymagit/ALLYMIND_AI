
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Summarizer from './Summarizer';

// Mock dependencies
vi.mock('../services/ai', () => ({
    summarizeNotes: vi.fn(() => Promise.resolve('Mocked AI summary')),
    extractTextFromImage: vi.fn(() => Promise.resolve('Mocked extracted text')),
    classifyImage: vi.fn(() => Promise.resolve({ label: 'Notes', confidence: 'high' })),
    trimRepetitionLoop: vi.fn((t: string) => t),
}));

vi.mock('../services/simpleFileProcessor', () => ({
    SimpleFileProcessor: {
        processFile: vi.fn((file) => Promise.resolve({
            name: file.name,
            type: file.type,
            content: file.type.startsWith('image/') ? 'data:image/png;base64,mock' : 'Mocked file content'
        }))
    }
}));

describe('Summarizer Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<Summarizer onSummaryGenerated={vi.fn()} />);
        expect(screen.getByText('Note Summarizer')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Type or paste your study materials here...')).toBeInTheDocument();
    });

    it('handles text input summarization', async () => {
        render(<Summarizer onSummaryGenerated={vi.fn()} />);

        // Type in text area
        const textarea = screen.getByPlaceholderText('Type or paste your study materials here...');
        fireEvent.change(textarea, { target: { value: 'Some study notes' } });

        // Click summarize
        const button = screen.getByText('Generate Summary');
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText('Mocked AI summary')).toBeInTheDocument();
        });
    });

    it('handles file input summarization', async () => {
        const { container } = render(<Summarizer onSummaryGenerated={vi.fn()} />);

        // Simulate file upload
        const file = new File(['dummy content'], 'notes.txt', { type: 'text/plain' });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Loaded from notes.txt/i)).toBeInTheDocument();
        });

        // Click summarize
        const button = screen.getByText('Generate Summary');
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText('Mocked AI summary')).toBeInTheDocument();
        });
    });
});
