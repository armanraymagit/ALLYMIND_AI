
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for pdfjs
import process from 'process';

const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface ProcessedFile {
    name: string;
    type: string;
    content: string; // Base64 for images, Plain text for docs
}

export class SimpleFileProcessor {
    static async processFile(file: File): Promise<ProcessedFile> {
        const isImage = file.type.startsWith('image/') ||
            /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);

        if (isImage) {
            const base64 = await this.readAsDataURL(file);
            return {
                name: file.name,
                type: file.type || (file.name.endsWith('.png') ? 'image/png' : 'image/jpeg'),
                content: base64
            };
        } else if (file.type === 'text/plain') {
            const text = await file.text();
            return {
                name: file.name,
                type: file.type,
                content: text
            };
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            const text = await this.extractTextFromPDF(file);
            return {
                name: file.name,
                type: 'application/pdf',
                content: text
            };
        } else {
            throw new Error('Unsupported file type. Please upload an image, .txt, or .pdf file.');
        }
    }

    private static readAsDataURL(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    private static async extractTextFromPDF(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // Sort items top-to-bottom, left-to-right (PDF coords: origin bottom-left, Y increases upward)
            const sorted = [...content.items].sort((a: any, b: any) => {
                const ay = a.transform?.[5] ?? 0;
                const by = b.transform?.[5] ?? 0;
                if (Math.abs(ay - by) > 2) return by - ay; // Higher Y first (top of page)
                const ax = a.transform?.[4] ?? 0;
                const bx = b.transform?.[4] ?? 0;
                return ax - bx; // Left to right on same line
            });
            const pageText = sorted.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText.trim();
    }
}
