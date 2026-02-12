from unsloth import FastLanguageModel, FastVisionModel # Import Unsloth FIRST
import argparse
import os
import torch
from datasets import Dataset
from trl import DPOTrainer, DPOConfig

def training_data_processor(args):
    """
    Placeholder for processing training data.
    """
    print(f"Loading data from {args.data_path}")
    # Example dummy data
    prompts = [
        "What is the capital of France?",
        "Tell me about large language models.",
    ]
    chosen = [
        "The capital of France is Paris.",
        "Large language models (LLMs) are deep learning models that can understand and generate human-like text.",
    ]
    rejected = [
        "France's capital is Berlin.",
        "LLMs are small, simple neural networks.",
    ]

    return {"prompt": prompts, "chosen": chosen, "rejected": rejected}

def main():
    parser = argparse.ArgumentParser(description="Train or Convert an LLM using Unsloth.")
    parser.add_argument("--base_model_path", type=str, required=True, help="Path to the base model (e.g., 'unsloth/Llama-3.2-3B-Instruct').")
    parser.add_argument("--data_path", type=str, required=False, help="Path to the training data file.")
    parser.add_argument("--output_dir", type=str, default="./results", help="Directory to save the trained model.")
    parser.add_argument("--num_train_epochs", type=int, default=1, help="Number of training epochs.")
    parser.add_argument("--learning_rate", type=float, default=5e-5, help="Learning rate.")
    parser.add_argument("--batch_size", type=int, default=2, help="Batch size.")
    parser.add_argument("--lora_r", type=int, default=16, help="LoRA rank.")
    parser.add_argument("--max_length", type=int, default=1024, help="Max sequence length.")
    parser.add_argument("--save_gguf", action="store_true", help="Export model to GGUF format.")
    parser.add_argument("--quantization_method", type=str, default="q4_k_m", help="GGUF quantization method (e.g., q4_k_m, q8_0).")
    parser.add_argument("--save_only", action="store_true", help="Skip training and only save/encrypt/export the model.")
    parser.add_argument("--fast_conversion", type=bool, default=False, help="Use Unsloth's fast GGUF conversion (default False for vision models).")

    args = parser.parse_args()

    # Detect if it's a vision model
    is_vision = "vl" in args.base_model_path.lower()
    
    if not torch.cuda.is_available():
        print("ERROR: CUDA is not available. Unsloth requires a GPU to run efficiently.")
        print("Please ensure you have installed the GPU version of PyTorch.")
        print("Try: pip install --force-reinstall torch==2.5.1 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124")
        return

    print(f"Loading model: {args.base_model_path} (Vision: {is_vision})")

    if is_vision:
        # Experimental support for Vision models in Unsloth
        try:
            model, tokenizer = FastVisionModel.from_pretrained(
                args.base_model_path,
                load_in_4bit = True,
                max_seq_length = args.max_length,
            )
        except Exception as e:
            print(f"FastVisionModel failed, falling back to FastLanguageModel (might fail for pure vision tasks): {e}")
            model, tokenizer = FastLanguageModel.from_pretrained(
                args.base_model_path,
                load_in_4bit = True,
                max_seq_length = args.max_length,
            )
    else:
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name = args.base_model_path,
            max_seq_length = args.max_length,
            dtype = None,
            load_in_4bit = True,
        )

    # Apply LoRA adapters if training
    if not args.save_only:
        model = FastLanguageModel.get_peft_model(
            model,
            r = args.lora_r,
            target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                              "gate_proj", "up_proj", "down_proj",],
            lora_alpha = 16,
            lora_dropout = 0, # Supports any, but = 0 is optimized
            bias = "none",    # Supports any, but = "none" is optimized
            use_gradient_checkpointing = "unsloth", # True or "unsloth" for very long context
            random_state = 3407,
            use_rslora = False,  # We support rank stabilized LoRA
            loftq_config = None, # And LoftQ
        )

        # Prepare training data
        if args.data_path:
            data_dict = training_data_processor(args)
            dataset = Dataset.from_dict(data_dict)
            
            # DPO training arguments
            training_args = DPOConfig(
                output_dir=args.output_dir,
                num_train_epochs=args.num_train_epochs,
                learning_rate=args.learning_rate,
                per_device_train_batch_size=args.batch_size,
                gradient_checkpointing=True,
                max_length=args.max_length,
                fp16 = not torch.cuda.is_bf16_supported(),
                bf16 = torch.cuda.is_bf16_supported(),
            )

            # Initialize DPOTrainer
            dpo_trainer = DPOTrainer(
                model,
                ref_model=None,
                tokenizer=tokenizer,
                args=training_args,
                train_dataset=dataset,
            )

            print("Starting DPO training...")
            dpo_trainer.train()
            print("Training complete.")
        else:
            print("No data pth provided, skipping training.")

    # GGUF Export
    if args.save_gguf:
        try:
            # For Vision models, we often need to merge to 16bit first or constrain memory
            # Adding maximum_memory_usage and fast_conversion control
            model.save_pretrained_gguf(
                args.output_dir,
                tokenizer,
                quantization_method = args.quantization_method,
                maximum_memory_usage = 0.5, # Limit VRAM/RAM usage to 50%
                fast_conversion = args.fast_conversion, # Set to False for vision models if it fails
            )
            print(f"GGUF exported to {args.output_dir}")
        except Exception as e:
            print(f"Failed to export GGUF directly: {e}")
            if is_vision:
                 print("Attempting fallback: Saving to 16-bit first, then converting (this may take more space)...")
                 try:
                     # Merge LoRA and save to 16bit
                     model.save_pretrained_merged(args.output_dir + "_merged_16bit", tokenizer, save_method = "merged_16bit")
                     print(f"Model merged to 16-bit at {args.output_dir}_merged_16bit. You might need to use llama.cpp manually if this also fails.")
                 except Exception as e2:
                     print(f"Fallback failed: {e2}")
                 print("Vision model export might require specific handling or latest Unsloth version.")

if __name__ == "__main__":
    main()
