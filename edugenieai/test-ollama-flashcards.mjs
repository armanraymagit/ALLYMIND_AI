/**
 * Test script to verify Ollama flashcards generation
 * Run with: node test-ollama-flashcards.mjs
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

// Try alternative models if the primary one fails
const FALLBACK_MODELS = ['llama3.1', 'llama3.2', 'mistral', 'qwen2.5', 'phi3'];

async function testFlashcardGeneration(model) {
  console.log(`\n🧪 Testing with model: ${model}`);
  
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

  const prompt = `Generate exactly 3 flashcards about Machine Learning.
Return ONLY a JSON array with flashcards.`;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        format: jsonSchema,
        stream: false,
        options: { temperature: 0.7 },
        system: "You are an expert at creating educational flashcards. Respond with valid JSON only."
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        console.log(`❌ Model "${model}" not found. Install with: ollama pull ${model}`);
        return false;
      }
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.response);
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log(`✅ Success! Generated ${parsed.length} flashcards`);
      console.log('Sample:', JSON.stringify(parsed[0], null, 2));
      return true;
    } else {
      console.log('⚠️  Response is not a valid array:', data.response.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Ollama Flashcard Generation');
  console.log(`📍 Ollama URL: ${OLLAMA_BASE_URL}`);
  console.log(`🤖 Primary Model: ${OLLAMA_MODEL}`);
  
  // Test primary model
  let success = await testFlashcardGeneration(OLLAMA_MODEL);
  
  // Try fallback models if primary fails
  if (!success) {
    console.log('\n🔄 Trying fallback models...');
    for (const model of FALLBACK_MODELS) {
      if (model === OLLAMA_MODEL) continue; // Skip already tested
      success = await testFlashcardGeneration(model);
      if (success) {
        console.log(`\n💡 Recommendation: Update .env to use: OLLAMA_MODEL=${model}`);
        break;
      }
    }
  }
  
  if (!success) {
    console.log('\n❌ All models failed. Please:');
    console.log('1. Make sure Ollama is running: ollama serve');
    console.log('2. Install a model: ollama pull llama3.1');
    console.log('3. Check your OLLAMA_BASE_URL in .env');
  } else {
    console.log('\n✅ Setup looks good! Your flashcards should work now.');
  }
}

main().catch(console.error);
