from huggingface_hub import snapshot_download
import os
from unsloth import FastVisionModel

def download_and_export():
    model_name = "unsloth/Qwen3-VL-4B-Instruct-bnb-4bit"
    local_dir = "./models/qwen3-vl-new"
    
    print(f"Downloading {model_name} to {local_dir}...")
    try:
        snapshot_download(
            repo_id=model_name,
            local_dir=local_dir,
            local_dir_use_symlinks=False
        )
        print("Download complete.")
        
        print(f"Loading from {local_dir}...")
        model, tokenizer = FastVisionModel.from_pretrained(
            model_name=local_dir,
            load_in_4bit=True,
        )
        
        output_gguf = "qwen3-vl-custom.gguf"
        print(f"Exporting to {output_gguf}...")
        model.save_pretrained_gguf(
            "qwen3-vl-custom",
            tokenizer,
            quantization_method="q4_k_m"
        )
        print("Success.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    download_and_export()
