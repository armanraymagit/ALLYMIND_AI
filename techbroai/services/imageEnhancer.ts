import { resizeImageBase64 } from './imageClassifier';

/**
 * Image Enhancement Service for Handwriting Recognition
 * Preprocesses images to improve OCR accuracy for messy handwriting,
 * especially blue pen on white paper.
 */

/**
 * Preprocess a handwritten image to enhance contrast and readability
 * Specifically optimized for blue pen handwriting on white paper
 *
 * @param imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @returns Enhanced base64 encoded image
 */
export const preprocessHandwritingImage = async (imageBase64: string): Promise<string> => {
    // Resize image first for performance (max 1024px)
    const resizedBase64 = await resizeImageBase64(imageBase64, 1024);

    return new Promise((resolve, reject) => {
        try {
            // Create an image element to load the base64 data
            const img = new Image();

            img.onload = () => {
                try {
                    // Create canvas for image processing
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    // Set canvas size to match image
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Draw the original image
                    ctx.drawImage(img, 0, 0);

                    // Get image data for pixel manipulation
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    // Step 1: Convert to grayscale using the Red channel
                    // Blue ink appears darker in the red channel, making it more visible
                    for (let i = 0; i < data.length; i += 4) {
                        const red = data[i];
                        // const _green = data[i + 1];
                        // const _blue = data[i + 2];

                        // Use red channel as grayscale value (blue ink is dark in red channel)
                        // This makes blue pen writing appear darker
                        const gray = red;

                        data[i] = gray;     // R
                        data[i + 1] = gray; // G
                        data[i + 2] = gray; // B
                        // Alpha channel (i + 3) remains unchanged
                    }

                    // Step 2: Find min and max values for contrast stretching
                    let min = 255;
                    let max = 0;

                    for (let i = 0; i < data.length; i += 4) {
                        const value = data[i]; // All channels are the same now (grayscale)
                        if (value < min) min = value;
                        if (value > max) max = value;
                    }

                    // Step 3: Apply contrast stretching
                    // This maximizes the difference between ink and paper
                    const range = max - min;

                    if (range > 0) {
                        for (let i = 0; i < data.length; i += 4) {
                            const oldValue = data[i];
                            // Stretch contrast to use full 0-255 range
                            const newValue = Math.round(((oldValue - min) / range) * 255);

                            data[i] = newValue;     // R
                            data[i + 1] = newValue; // G
                            data[i + 2] = newValue; // B
                        }
                    }

                    // Step 4: Apply slight sharpening to enhance edges
                    // This helps with messy handwriting
                    const sharpenedData = applySharpen(imageData, canvas.width, canvas.height);

                    // Put the processed image data back on canvas
                    ctx.putImageData(sharpenedData, 0, 0);

                    // Convert canvas back to base64
                    const enhancedBase64 = canvas.toDataURL('image/jpeg', 0.95);
                    resolve(enhancedBase64);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            // Use the resized image (already has data URL prefix)
            img.src = resizedBase64;
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Apply a sharpening filter to enhance edges
 * Uses a 3x3 convolution kernel
 *
 * @param imageData - ImageData object to sharpen
 * @param width - Image width
 * @param height - Image height
 * @returns Sharpened ImageData
 */
const applySharpen = (imageData: ImageData, width: number, height: number): ImageData => {
    const data = imageData.data;
    const output = new ImageData(width, height);
    const outputData = output.data;

    // Sharpening kernel (3x3)
    // [  0, -1,  0 ]
    // [ -1,  5, -1 ]
    // [  0, -1,  0 ]
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    // Apply convolution
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let r = 0, g = 0, b = 0;

            // Apply kernel
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                    const kernelIndex = (ky + 1) * 3 + (kx + 1);
                    const weight = kernel[kernelIndex];

                    r += data[pixelIndex] * weight;
                    g += data[pixelIndex + 1] * weight;
                    b += data[pixelIndex + 2] * weight;
                }
            }

            const outputIndex = (y * width + x) * 4;
            outputData[outputIndex] = Math.max(0, Math.min(255, r));     // R
            outputData[outputIndex + 1] = Math.max(0, Math.min(255, g)); // G
            outputData[outputIndex + 2] = Math.max(0, Math.min(255, b)); // B
            outputData[outputIndex + 3] = data[outputIndex + 3];         // A (copy alpha)
        }
    }

    // Copy edge pixels (not processed by kernel)
    for (let x = 0; x < width; x++) {
        // Top row
        const topIndex = x * 4;
        outputData[topIndex] = data[topIndex];
        outputData[topIndex + 1] = data[topIndex + 1];
        outputData[topIndex + 2] = data[topIndex + 2];
        outputData[topIndex + 3] = data[topIndex + 3];

        // Bottom row
        const bottomIndex = ((height - 1) * width + x) * 4;
        outputData[bottomIndex] = data[bottomIndex];
        outputData[bottomIndex + 1] = data[bottomIndex + 1];
        outputData[bottomIndex + 2] = data[bottomIndex + 2];
        outputData[bottomIndex + 3] = data[bottomIndex + 3];
    }

    for (let y = 0; y < height; y++) {
        // Left column
        const leftIndex = y * width * 4;
        outputData[leftIndex] = data[leftIndex];
        outputData[leftIndex + 1] = data[leftIndex + 1];
        outputData[leftIndex + 2] = data[leftIndex + 2];
        outputData[leftIndex + 3] = data[leftIndex + 3];

        // Right column
        const rightIndex = (y * width + width - 1) * 4;
        outputData[rightIndex] = data[rightIndex];
        outputData[rightIndex + 1] = data[rightIndex + 1];
        outputData[rightIndex + 2] = data[rightIndex + 2];
        outputData[rightIndex + 3] = data[rightIndex + 3];
    }

    return output;
};

/**
 * Preprocess multiple images for handwriting recognition
 *
 * @param imagesBase64 - Array of base64 encoded images
 * @returns Array of enhanced base64 encoded images
 */
export const preprocessMultipleHandwritingImages = async (imagesBase64: string[]): Promise<string[]> => {
    return Promise.all(imagesBase64.map(img => preprocessHandwritingImage(img)));
};
