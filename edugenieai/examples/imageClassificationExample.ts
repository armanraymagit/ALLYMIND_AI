/**
 * Example usage of the Image Classification Service
 * This demonstrates how to classify images using LLaVA
 */

import {
    classifyImage,
    classifyMultipleImages,
    classifyText,
    isVisionModelAvailable,
    CLASSIFICATION_LABELS,
    type ClassificationResult,
} from '../services/imageClassifier';

/**
 * Example 1: Classify a single image
 */
async function classifySingleImage(imageBase64: string) {
    try {
        console.log('Classifying single image...');
        const result = await classifyImage(imageBase64);
        console.log('Classification Result:', result);
        // Output: { label: 'Math', confidence: 'high' }
    } catch (error) {
        console.error('Classification failed:', error);
    }
}

/**
 * Example 2: Classify multiple images (e.g., from a PDF)
 */
async function classifyPDFPages(pdfImages: string[]) {
    try {
        console.log(`Classifying ${pdfImages.length} PDF pages...`);
        const result = await classifyMultipleImages(pdfImages);
        console.log('Majority Vote Result:', result);
        // Output: { label: 'Physics', confidence: 'medium' }
    } catch (error) {
        console.error('Classification failed:', error);
    }
}

/**
 * Example 3: Classify text content
 */
function classifyTextContent(text: string) {
    console.log('Classifying text content...');
    const result = classifyText(text);
    console.log('Text Classification Result:', result);
    // Output: { label: 'ComputerScience', confidence: 'high' }
}

/**
 * Example 4: Check if vision model is available
 */
async function checkModelAvailability() {
    const isAvailable = await isVisionModelAvailable();

    if (isAvailable) {
        console.log('✅ LLaVA vision model is available');
    } else {
        console.log('❌ LLaVA vision model not found');
        console.log('Install it with: ollama pull llava');
    }
}

/**
 * Example 5: Handle file upload and classify
 */
async function handleFileUpload(file: File) {
    // Check file type
    if (file.type.startsWith('image/')) {
        // Convert image to base64
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            const result = await classifyImage(base64);
            console.log(`Image "${file.name}" classified as:`, result);
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
        // For PDFs, you would extract images first using FileProcessor
        // Then classify using classifyMultipleImages
        console.log('PDF classification requires image extraction first');
    } else if (file.type === 'text/plain') {
        // For text files, read content and classify
        const text = await file.text();
        const result = classifyText(text);
        console.log(`Text file "${file.name}" classified as:`, result);
    }
}

/**
 * Example 6: Display all available categories
 */
function showAvailableCategories() {
    console.log('Available Classification Categories:');
    CLASSIFICATION_LABELS.forEach((label, index) => {
        console.log(`${index + 1}. ${label}`);
    });
}

// Export examples for use in other files
export {
    classifySingleImage,
    classifyPDFPages,
    classifyTextContent,
    checkModelAvailability,
    handleFileUpload,
    showAvailableCategories,
};
