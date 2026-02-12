from unsloth import FastLanguageModel
import torch
import os

def export_to_gguf(model_path, output_path):
    print(f"Loading Llama 3.2 from {model_path}...")
    try:
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=model_path,
            load_in_4bit=True,
            max_seq_length=2048,
        )

        print(f"Exporting to GGUF at {output_path}...")
        # We use q4_k_m for a good balance of speed and quality
        model.save_pretrained_gguf(
            output_path,
            tokenizer,
            quantization_method="q4_k_m",
        )
        print(f"Successfully exported to {output_path}")
    except Exception as e:
        print(f"FAILED to export: {e}")
        print("\nChecking for llama.cpp issues...")
        # If GGUF fails, let's at least save a merged 16-bit version
        # This is a fallback that makes manual conversion easier
        try:
            merged_path = output_path + "_merged_16bit"
            print(f"Attempting fallback: Saving merged 16-bit model to {merged_path}...")
            model.save_pretrained_merged(merged_path, tokenizer, save_method="merged_16bit")
            print(f"Merged model saved at {merged_path}")
        except Exception as e2:
            print(f"Fallback also failed: {e2}")

if __name__ == "__main__":
    llama_path = r"D:\AI projects\Backend with django for llm model\Django\djangoLLM\models\llama3.2-gguf"
    output_dir = "llama3.2-custom"
    export_to_gguf(llama_path, output_dir)
