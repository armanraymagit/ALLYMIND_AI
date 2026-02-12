
from huggingface_hub import list_repo_files

repo_id = "bartowski/Qwen_Qwen3-VL-4B-Instruct-GGUF"
files = list_repo_files(repo_id)
print(f"Files in {repo_id}:")
for f in files:
    if "mmproj" in f:
        print(f)
