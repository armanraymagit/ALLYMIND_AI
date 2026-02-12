
import os
import json
from safetensors import safe_open
import torch

model_path = r"D:\AI projects\Backend with django for llm model\Django\djangoLLM\models\qwen3-vl-new\model.safetensors"

def check_safetensors(path):
    if not os.path.exists(path):
        print(f"Error: File not found at {path}")
        return
    
    file_size = os.path.getsize(path)
    print(f"File size: {file_size} bytes ({file_size / 1024**3:.2f} GB)")
    
    try:
        with safe_open(path, framework="pt", device="cpu") as f:
            metadata = f.metadata()
            print("Metadata:", metadata)
            keys = f.keys()
            print(f"Number of tensors: {len(keys)}")
            
            if keys:
                # Try reading the last tensor to check for truncation
                last_key = keys[-1]
                print(f"Attempting to read last tensor: {last_key}")
                tensor = f.get_tensor(last_key)
                print(f"Successfully read last tensor. Shape: {tensor.shape}")
                print("PASS: Safetensors file header and data appear intact.")
            else:
                print("FAIL: No tensors found in file.")
    except Exception as e:
        print(f"FAIL: Safetensors integrity check failed: {e}")

if __name__ == "__main__":
    check_safetensors(model_path)
