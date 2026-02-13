import os
import requests
from dotenv import load_dotenv

load_dotenv()

hf_token = os.getenv("HUGGINGFACE_API_KEY")
print(
    f"Token found: {hf_token[:5]}...{hf_token[-5:]}" if hf_token else "Token not found"
)

model = "Qwen/Qwen2-VL-2B-Instruct"
# Test official inference API
url = f"https://api-inference.huggingface.co/models/{model}"
headers = {"Authorization": f"Bearer {hf_token}"}
payload = {"inputs": "What is in this image?", "parameters": {"max_new_tokens": 1}}

try:
    print(f"Testing Legacy Inference API: {url}")
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test Router API
router_url = "https://router.huggingface.co/v1/chat/completions"
router_payload = {
    "model": model,
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10,
}

try:
    print(f"\nTesting Router API: {router_url}")
    response = requests.post(
        router_url, headers=headers, json=router_payload, timeout=10
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
