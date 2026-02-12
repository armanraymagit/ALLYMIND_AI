from unsloth import FastVisionModel
import torch
import os

def export_vision_to_gguf(model_name, output_path):
    print(f"Loading Vision Model: {model_name}...")
    try:
        model, tokenizer = FastVisionModel.from_pretrained(
            model_name=model_name,
            load_in_4bit=True,
            max_seq_length=2048,
        )

        print(f"Exporting vision model to GGUF at {output_path}...")
        # For vision models, save_pretrained_gguf might be experimental
        model.save_pretrained_gguf(
            output_path,
            tokenizer,
            quantization_method="q4_k_m",
        )
        print(f"Successfully exported vision model to {output_path}")
    except Exception as e:
        print(f"FAILED to export vision model: {e}")
        print("\nAttempting to save merged 16bit for manual conversion...")
        try:
            merged_path = output_path + "_merged_16bit"
            model.save_pretrained_merged(merged_path, tokenizer, save_method="merged_16bit")
            print(f"Saved merged 16bit to {merged_path}")
        except Exception as e2:
            print(f"Fallback failed: {e2}")

if __name__ == "__main__":
    # The existing corrupted directory
    # corrupted_path = r"D:\AI projects\Backend with django for llm model\Django\djangoLLM\models\qwen3-vl-gguf"
    
    # We will download a fresh one from Unsloth directly
    base_model = "unsloth/Qwen3-VL-4B-Instruct-bnb-4bit" 
    
    export_vision_to_gguf(base_model, "qwen3-vl-custom")
