import os
import ollama
import sys

def setup():
    ollama_host = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
    client = ollama.Client(host=ollama_host)
    
    models_to_setup = [
        {"name": "llama3.2-custom", "gguf": "llama3.2-custom-q8.gguf", "modelfile": "Modelfile"},
    ]
    
    for m in models_to_setup:
        print(f"Checking model: {m['name']}")
        try:
            client.show(m['name'])
            print(f"✓ Model {m['name']} already exists.")
        except:
            print(f"Creating model {m['name']}...")
            if not os.path.exists(m['gguf']):
                print(f"✗ Error: {m['gguf']} not found!")
                continue
            
            # Read modelfile and fix path for host if needed
            with open(m['modelfile'], 'r') as f:
                content = f.read()
            
            # If running on host (Windows), replace /app/ with local path
            if os.name == 'nt' and '/app/' in content:
                local_path = os.path.abspath(m['gguf'])
                content = content.replace('/app/', local_path.replace('\\', '/') if ' ' in local_path else local_path)
            
            try:
                client.create(model=m['name'], modelfile=content)
                print(f"✓ Success.")
            except Exception as e:
                print(f"✗ Failed: {e}")

if __name__ == "__main__":
    setup()
