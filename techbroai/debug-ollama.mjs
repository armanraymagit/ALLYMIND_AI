import fetch from 'node-fetch';

async function testVision() {
    const url = 'http://localhost:11434/api/generate';
    const payload = {
        model: 'qwen3-vl:4b',
        prompt: "Extract all text exactly as written in this image (full OCR). Then, provide a concise 'Content Summary' in bullet points at the end.",
        images: ['iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='], // Tiny red dot
        stream: false,
        options: {
            num_ctx: 2048,
            temperature: 0.1
        }
    };

    console.log('Sending request to Ollama...');
    try {
        const resp = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        console.log('Ollama Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

testVision();
