import os
import ollama
import sys

def setup():
    ollama_host = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
    client = ollama.Client(host=ollama_host)
    
    # Llama 3.2 (text) and Llama 3.2 Vision are pulled from Ollama library; no local GGUF required
    models_to_setup = [
        {"name": "llama3.2:latest", "pull_only": True},
        {"name": "llama3.2-vision:latest", "pull_only": True},
    ]
    
    for m in models_to_setup:
        name = m['name']
        print(f"Checking model: {name}")
        try:
            client.show(name)
            print(f"✓ Model {name} already exists.")
        except Exception:
            if m.get('pull_only'):
                print(f"Pulling model {name} from Ollama library...")
                try:
                    client.pull(name)
                    print(f"✓ Success.")
                except Exception as e:
                    print(f"✗ Failed to pull: {e}")
            else:
                print(f"Creating model {name}...")
                if not os.path.exists(m.get('gguf', '')):
                    print(f"✗ Error: {m.get('gguf')} not found!")
                    continue
                with open(m['modelfile'], 'r') as f:
                    content = f.read()
                if os.name == 'nt' and '/app/' in content:
                    local_path = os.path.abspath(m['gguf'])
                    content = content.replace('/app/', local_path.replace('\\', '/') if ' ' in local_path else local_path)
                try:
                    client.create(model=name, modelfile=content)
                    print(f"✓ Success.")
                except Exception as e:
                    print(f"✗ Failed: {e}")

if __name__ == "__main__":
    setup()
