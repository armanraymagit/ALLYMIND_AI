import requests
import json

def test_ollama():
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "llama3.2:latest",
        "prompt": "hi",
        "stream": False
    }
    print(f"Testing {payload['model']} at {url}...")
    try:
        response = requests.post(url, json=payload, timeout=60)
        print(f"Status Code: {response.status_code}")
        try:
            print("Response:", response.json())
        except:
            print("Raw Response:", response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ollama()
