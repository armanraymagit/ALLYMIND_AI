
import os
from unsloth import FastVisionModel
import torch

def export_to_gguf():
    local_dir = r"D:\AI projects\Backend with django for llm model\Django\djangoLLM\models\qwen3-vl-new"
    output_name = "qwen3-vl-custom"
    
    # Add env/Scripts to PATH so Unsloth can find uv.exe
    env_scripts = r"D:\AI projects\Backend with django for llm model\Django\djangoLLM\env\Scripts"
    os.environ["PATH"] = env_scripts + os.pathsep + os.environ["PATH"]
    
    print(f"Loading model from {local_dir}...")
    try:
        # Load the model and tokenizer
        model, tokenizer = FastVisionModel.from_pretrained(
            model_name=local_dir,
            load_in_4bit=True, # Qwen3-VL often requires 4-bit for memory efficiency during export
        )
        
        print(f"Exporting to GGUF (q4_k_m)...")
        # Note: Unsloth handles the conversion using llama.cpp internally
        model.save_pretrained_gguf(
            output_name,
            tokenizer,
            quantization_method="q4_k_m"
        )
        
        print("Export successful.")
    except Exception as e:
        print(f"Export failed: {e}")

if __name__ == "__main__":
    export_to_gguf()
