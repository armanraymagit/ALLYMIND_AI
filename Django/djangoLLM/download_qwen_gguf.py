
import os
from huggingface_hub import hf_hub_download

def download_gguf():
    repo_id = "bartowski/Qwen_Qwen3-VL-4B-Instruct-GGUF"
    local_dir = r"D:\AI projects\Backend with django for llm model\Django\djangoLLM"
    
    # 1. Download the main GGUF file (Q4_K_M is a good balance)
    files_to_download = [
        # "Qwen_Qwen3-VL-4B-Instruct-Q4_K_M.gguf", # Already downloaded
        "mmproj-Qwen_Qwen3-VL-4B-Instruct-f16.gguf" # Correct vision adapter filename
    ]
    
    print(f"Downloading files from {repo_id} to {local_dir}...")
    
    for filename in files_to_download:
        print(f"Downloading {filename}...")
        try:
            path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                local_dir=local_dir,
                local_dir_use_symlinks=False
            )
            print(f"Downloaded: {path}")
        except Exception as e:
            print(f"Error downloading {filename}: {e}")

if __name__ == "__main__":
    download_gguf()
