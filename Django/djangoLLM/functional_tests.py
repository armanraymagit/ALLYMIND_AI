import ollama
import os
import json
import tempfile
from PIL import Image, ImageDraw, ImageFont

OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
client = ollama.Client(host=OLLAMA_HOST)

def create_test_image():
    """Create a simple test image for classification"""
    img = Image.new('RGB', (400, 300), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple scene
    draw.rectangle([50, 50, 150, 150], fill='red', outline='black', width=2)
    draw.ellipse([200, 50, 300, 150], fill='blue', outline='black', width=2)
    draw.polygon([(100, 200), (150, 250), (50, 250)], fill='green', outline='black')
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    img.save(temp_file.name)
    return temp_file.name

def test_image_classification():
    """Test image classification with Qwen3-VL"""
    print("\n" + "="*60)
    print("TEST 1: Image Classification")
    print("="*60)
    
    test_image = create_test_image()
    print(f"Created test image: {test_image}")
    
    try:
        response = client.generate(
            model='qwen3-vl:4b',
            prompt='Describe what shapes and colors you see in this image.',
            images=[test_image],
            keep_alive='30m'
        )
        
        description = response['response']
        print(f"\nModel Response:\n{description}")
        
        # Check if key elements are mentioned
        success = any(word in description.lower() for word in ['red', 'blue', 'green', 'shape', 'rectangle', 'circle', 'triangle'])
        
        if success:
            print("\n✓ PASS: Model correctly identified shapes/colors")
        else:
            print("\n✗ FAIL: Model did not identify expected elements")
        
        return success
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        return False
    finally:
        if os.path.exists(test_image):
            os.remove(test_image)

def test_quiz_generation():
    """Test quiz generation with Llama 3.2"""
    print("\n" + "="*60)
    print("TEST 2: Quiz Generation")
    print("="*60)
    
    topic_text = """
    Photosynthesis is the process by which plants convert light energy into chemical energy.
    It occurs in chloroplasts and requires sunlight, water, and carbon dioxide.
    The products are glucose and oxygen.
    """
    
    prompt = f"""Generate exactly 2 multiple choice quiz questions from this text in JSON format.
Each question should have 4 options (A, B, C, D) and indicate the correct answer.

Format:
[
  {{
    "question": "Question text?",
    "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
    "correct": "A"
  }}
]

Text: {topic_text}

JSON:"""
    
    try:
        response = client.generate(
            model='llama3.2-custom',
            prompt=prompt,
            keep_alive='30m'
        )
        
        quiz_text = response['response']
        print(f"\nModel Response:\n{quiz_text}")
        
        # Try to parse as JSON
        try:
            # Extract JSON from response
            start = quiz_text.find('[')
            end = quiz_text.rfind(']') + 1
            if start != -1 and end > start:
                json_str = quiz_text[start:end]
                quiz_data = json.loads(json_str)
                
                if isinstance(quiz_data, list) and len(quiz_data) >= 2:
                    print("\n✓ PASS: Generated valid quiz JSON with multiple questions")
                    return True
                else:
                    print("\n✗ FAIL: JSON structure incorrect")
                    return False
            else:
                print("\n✗ FAIL: No JSON array found in response")
                return False
        except json.JSONDecodeError as e:
            print(f"\n✗ FAIL: Invalid JSON - {str(e)}")
            return False
            
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        return False

def test_flashcard_generation():
    """Test flashcard generation with Llama 3.2"""
    print("\n" + "="*60)
    print("TEST 3: Flashcard Generation")
    print("="*60)
    
    text = """
    The mitochondria is known as the powerhouse of the cell because it produces ATP through cellular respiration.
    DNA stands for deoxyribonucleic acid and contains genetic information.
    """
    
    prompt = f"""Create 2 flashcards from this text in JSON format.
Each flashcard should have a "front" (question/term) and "back" (answer/definition).

Format:
[
  {{"front": "What is...", "back": "..."}},
  {{"front": "Define...", "back": "..."}}
]

Text: {text}

JSON:"""
    
    try:
        response = client.generate(
            model='llama3.2-custom',
            prompt=prompt,
            keep_alive='30m'
        )
        
        flashcard_text = response['response']
        print(f"\nModel Response:\n{flashcard_text}")
        
        # Try to parse as JSON
        try:
            start = flashcard_text.find('[')
            end = flashcard_text.rfind(']') + 1
            if start != -1 and end > start:
                json_str = flashcard_text[start:end]
                flashcard_data = json.loads(json_str)
                
                if isinstance(flashcard_data, list) and len(flashcard_data) >= 2:
                    # Check structure
                    valid = all('front' in card and 'back' in card for card in flashcard_data)
                    if valid:
                        print("\n✓ PASS: Generated valid flashcard JSON")
                        return True
                    else:
                        print("\n✗ FAIL: Flashcard structure incorrect")
                        return False
                else:
                    print("\n✗ FAIL: Not enough flashcards generated")
                    return False
            else:
                print("\n✗ FAIL: No JSON array found in response")
                return False
        except json.JSONDecodeError as e:
            print(f"\n✗ FAIL: Invalid JSON - {str(e)}")
            return False
            
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    print("\nFunctional Test Suite")
    print("="*60)
    
    results = {
        'image_classification': test_image_classification(),
        'quiz_generation': test_quiz_generation(),
        'flashcard_generation': test_flashcard_generation()
    }
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{test_name}: {status}")
    
    total_passed = sum(results.values())
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")
    print("="*60)
