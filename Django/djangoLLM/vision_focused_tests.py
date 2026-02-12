import time
import ollama
import os
import requests
import tempfile
from PIL import Image, ImageDraw, ImageOps

OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
client = ollama.Client(host=OLLAMA_HOST)

def create_test_image(format='JPEG', size=(224, 224), content='shape'):
    """Create a synthetic test image with specific content"""
    img = Image.new('RGB', size, color='white')
    draw = ImageDraw.Draw(img)
    
    if content == 'shape':
        draw.rectangle([size[0]//4, size[1]//4, 3*size[0]//4, 3*size[1]//4], fill='red', outline='black')
    elif content == 'text':
        draw.text((size[0]//2, size[1]//2), "This is a document", fill='black', anchor='mm')
    
    # Handle formats
    ext = format.lower()
    if ext == 'jpeg': ext = 'jpg'
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}')
    img.save(temp_file.name, format=format)
    return temp_file.name

def benchmark_vision_performance():
    print("="*60)
    print("Vision Model Performance & Accuracy Benchmark")
    print("="*60)
    
    resolutions = [(224, 224), (512, 512), (1024, 1024)]
    formats = ['JPEG', 'PNG', 'WEBP']
    
    results = []
    
    # 1. Resolution Impact Test
    print("\n[1/3] Resolution Impact Test")
    for res in resolutions:
        # Create image
        img_path = create_test_image(size=res, content='shape')
        
        try:
            start_time = time.time()
            response = client.generate(
                model='llama3.2-vision:latest',
                prompt='Describe this image concisely.',
                images=[img_path],
                keep_alive='30m'
            )
            end_time = time.time()
            latency = end_time - start_time
            
            print(f"  {res[0]}x{res[1]}px: {latency:.4f}s")
            results.append({'test': 'resolution', 'val': res, 'latency': latency})
            
        except Exception as e:
            print(f"  {res[0]}x{res[1]}px: ERROR - {str(e)}")
        finally:
            if os.path.exists(img_path): os.remove(img_path)

    # 2. Format Compatibility Test
    print("\n[2/3] Format Compatibility Test")
    for fmt in formats:
        img_path = create_test_image(format=fmt, size=(224, 224))
        
        try:
            start_time = time.time()
            response = client.generate(
                model='llama3.2-vision:latest',
                prompt='Describe this image.',
                images=[img_path]
            )
            end_time = time.time()
            
            print(f"  {fmt}: Success ({end_time-start_time:.4f}s)")
        except Exception as e:
            print(f"  {fmt}: FAILED - {str(e)}")
        finally:
            if os.path.exists(img_path): os.remove(img_path)

    # 3. Classification Accuracy Test
    print("\n[3/3] Classification Accuracy")
    
    # Test Case A: Document vs Image
    doc_img = create_test_image(content='text', size=(512, 512))
    shape_img = create_test_image(content='shape', size=(512, 512))
    
    prompts = [
        (doc_img, "Is this a document containing text? Answer YES or NO."),
        (shape_img, "Is this a red rectangle? Answer YES or NO.")
    ]
    
    for img, prompt in prompts:
        try:
            response = client.generate(
                model='llama3.2-vision:latest',
                prompt=prompt,
                images=[img]
            )
            answer = response['response'].strip().upper()
            print(f"  Prompt: {prompt[:30]}... -> Response: {answer}")
            
            if "YES" in answer:
                print("  ✓ Correct")
            else:
                print("  ✗ Incorrect")
        except Exception as e:
            print(f"  Error: {e}")
        finally:
            if os.path.exists(img): os.remove(img)

if __name__ == "__main__":
    benchmark_vision_performance()
