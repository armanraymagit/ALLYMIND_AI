import traceback
try:
    print("Attempting to import Unsloth...")
    from unsloth import FastLanguageModel
    print("SUCCESS: FastLanguageModel imported.")
except Exception as e:
    print("FAILED: Error during import.")
    traceback.print_exc()
