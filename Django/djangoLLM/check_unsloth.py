import torch
import sys

def check_compatibility():
    print("--- Compatibility Check ---")
    print(f"Python version: {sys.version}")
    print(f"PyTorch version: {torch.__version__}")
    
    cuda_available = torch.cuda.is_available()
    print(f"CUDA available: {cuda_available}")
    
    if cuda_available:
        print(f"CUDA version (PyTorch): {torch.version.cuda}")
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        
        try:
            import bitsandbytes as bnb
            print(f"bitsandbytes version: {bnb.__version__}")
        except ImportError:
            print("bitsandbytes is NOT installed.")
            
        try:
            from unsloth import FastLanguageModel
            print("Unsloth: FastLanguageModel imported successfully!")
        except ImportError as e:
            print(f"Unsloth import FAILED: {e}")
        except Exception as e:
            print(f"Unsloth initialization FAILED: {e}")
    else:
        print("CUDA is NOT available. Unsloth requires an NVIDIA GPU and CUDA.")

if __name__ == "__main__":
    check_compatibility()
