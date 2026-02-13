/**
 * Test script for Image Classification Service
 * Run this to verify LLaVA integration is working
 */

import {
    isVisionModelAvailable,
    classifyText,
    CLASSIFICATION_LABELS
} from './services/imageClassifier.js';

async function runTests() {
    console.log('🧪 Testing Image Classification Service\n');

    // Test 1: Check if LLaVA model is available
    console.log('Test 1: Checking LLaVA model availability...');
    try {
        const isAvailable = await isVisionModelAvailable();
        if (isAvailable) {
            console.log('✅ LLaVA model is installed and ready\n');
        } else {
            console.log('❌ LLaVA model not found');
            console.log('📥 Install it with: ollama pull llava\n');
        }
    } catch (error) {
        console.error('❌ Failed to check model availability:', error.message);
        console.log('⚠️  Make sure Ollama is running at http://localhost:11434\n');
    }

    // Test 2: Display available categories
    console.log('Test 2: Available Classification Categories:');
    CLASSIFICATION_LABELS.forEach((label, index) => {
        console.log(`  ${index + 1}. ${label}`);
    });
    console.log('');

    // Test 3: Test text classification (doesn't require LLaVA)
    console.log('Test 3: Testing text classification...');

    const testCases = [
        {
            text: 'Calculate the integral of x^2 from 0 to 1',
            expected: 'Math'
        },
        {
            text: 'def fibonacci(n): return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)',
            expected: 'ComputerScience'
        },
        {
            text: 'The voltage across the resistor is V = IR according to Ohm\'s law',
            expected: 'Physics'
        },
        {
            text: 'H2O is the chemical formula for water',
            expected: 'Chemistry'
        },
        {
            text: 'Assignment 3: Submit before Friday',
            expected: 'Assignment'
        }
    ];

    testCases.forEach((testCase, index) => {
        const result = classifyText(testCase.text);
        const status = result.label === testCase.expected ? '✅' : '⚠️';
        console.log(`  ${status} Test ${index + 1}: "${testCase.text.substring(0, 40)}..."`);
        console.log(`     Result: ${result.label} (${result.confidence}), Expected: ${testCase.expected}`);
    });

    console.log('\n✨ Tests completed!\n');
    console.log('📚 Next steps:');
    console.log('  1. Make sure Ollama is running: ollama serve');
    console.log('  2. Install LLaVA if not available: ollama pull llava');
    console.log('  3. Try classifying an image using the examples in examples/imageClassificationExample.ts');
    console.log('  4. Read the documentation in docs/IMAGE_CLASSIFICATION.md\n');
}

// Run tests
runTests().catch(console.error);
