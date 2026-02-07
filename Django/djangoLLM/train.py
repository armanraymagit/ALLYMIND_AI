import argparse
import os
import torch
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForCausalLM
from trl import DPOTrainer, DPOConfig
from peft import LoraConfig

def training_data_processor(args):
    """
    Placeholder for processing training data.
    In a real scenario, this would load and format your dataset.
    For DPO, you need 'prompt', 'chosen', and 'rejected' columns.
    """
    print(f"Loading data from {args.data_path}")
    # Example dummy data for demonstration
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
    parser = argparse.ArgumentParser(description="Train an LLM using DPO.")
    parser.add_argument("--base_model_path", type=str, required=True, help="Path to the base model (e.g., 'mistralai/Mistral-7B-v0.1').")
    parser.add_argument("--data_path", type=str, required=True, help="Path to the training data file (e.g., 'data.json').")
    parser.add_argument("--output_dir", type=str, default="./results", help="Directory to save the trained model.")
    parser.add_argument("--num_train_epochs", type=int, default=3, help="Number of training epochs.")
    parser.add_argument("--learning_rate", type=float, default=5e-5, help="Learning rate for training.")
    parser.add_argument("--batch_size", type=int, default=2, help="Batch size per device during training.")
    parser.add_argument("--lora_r", type=int, default=16, help="LoRA attention dimension.")
    parser.add_argument("--lora_alpha", type=int, default=32, help="Alpha parameter for LoRA scaling.")
    parser.add_argument("--lora_dropout", type=float, default=0.05, help="Dropout probability for LoRA layers.")
    parser.add_argument("--max_length", type=int, default=1024, help="Maximum sequence length.")
    parser.add_argument("--max_prompt_length", type=int, default=512, help="Maximum prompt length.")
    parser.add_argument("--beta", type=float, default=0.1, help="Beta parameter for DPO loss.")
    parser.add_argument("--warmup_steps", type=int, default=100, help="Number of warmup steps.")
    parser.add_argument("--warmup_ratio", type=float, default=0.1, help="Warmup ratio for learning rate scheduler.")
    parser.add_argument("--max_grad_norm", type=float, default=0.3, help="Maximum gradient norm.")


    args = parser.parse_args()

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(args.base_model_path, padding_side="left")
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token # Or another suitable token

    # Load model
    # Use torch.float32 for CPU training, bfloat16 for supported GPUs
    # Check if GPU is available and set torch_dtype accordingly
    if torch.cuda.is_available():
        torch_dtype = torch.bfloat16 # or torch.float16 depending on GPU support
        print("CUDA available, using bfloat16 for model.")
    else:
        torch_dtype = torch.float32
        print("CUDA not available, using float32 for model.")

    model = AutoModelForCausalLM.from_pretrained(
        args.base_model_path,
        trust_remote_code=True,
        ignore_mismatched_sizes=True,
        torch_dtype=torch_dtype,
    )

    # Prepare training data
    data_dict = training_data_processor(args)
    dataset = Dataset.from_dict(data_dict)

    # LoRA configuration
    lora_config = None
    if args.lora_r > 0:
        lora_config = LoraConfig(
            r=args.lora_r,
            lora_alpha=args.lora_alpha,
            lora_dropout=args.lora_dropout,
            bias="none",
            target_modules="all-linear",
            task_type="CAUSAL_LM",
        )
    else:
        print("LoRA disabled (lora_r is 0).")

    # DPO training arguments
    training_args = DPOConfig(
        output_dir=args.output_dir,
        num_train_epochs=args.num_train_epochs,
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        gradient_checkpointing=True, # Enable for memory efficiency, especially with large models
        gradient_checkpointing_kwargs={"use_reentrant": True},
        max_grad_norm=args.max_grad_norm,
        lr_scheduler_type="cosine",
        logging_steps=5,
        optim="adamw_torch",  # Using adamw_torch for broader compatibility
        loss_type="sigmoid",
        warmup_steps=args.warmup_steps,
        warmup_ratio=args.warmup_ratio,
        do_eval=False,
        max_prompt_length=args.max_prompt_length,
        max_length=args.max_length,
        seed=42,
        remove_unused_columns=False,
        fp16=not torch.cuda.is_available(), # Use fp16 if CUDA is not available, useful for some CPU setups or older GPUs
        bf16=torch.cuda.is_available(), # Use bf16 if CUDA is available (modern GPUs)
        beta=args.beta,
    )

    # Initialize DPOTrainer
    dpo_trainer = DPOTrainer(
        model,
        ref_model=None, # For DPO, ref_model is typically a frozen copy of the initial policy model or a different model
        tokenizer=tokenizer,
        args=training_args,
        train_dataset=dataset,
        peft_config=lora_config,
    )

    # Train the model
    print("Starting DPO training...")
    dpo_trainer.train()
    print("Training complete. Saving model...")

    # Save the trained model
    dpo_trainer.save_model(os.path.join(args.output_dir, "final_checkpoint"))
    print(f"Model saved to {os.path.join(args.output_dir, 'final_checkpoint')}")

if __name__ == "__main__":
    main()
