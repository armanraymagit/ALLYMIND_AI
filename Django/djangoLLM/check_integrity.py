import os
import json

def check_integrity(model_dir):
    print(f"\nChecking: {model_dir}")
    index_path = os.path.join(model_dir, "model.safetensors.index.json")
    if not os.path.exists(index_path):
        print("Error: model.safetensors.index.json not found!")
        return

    with open(index_path, "r") as f:
        data = json.load(f)
    
    expected_total = data.get("metadata", {}).get("total_size", 0)
    
    current_total = 0
    shards = set(data.get("weight_map", {}).values())
    
    for shard in shards:
        shard_path = os.path.join(model_dir, shard)
        if os.path.exists(shard_path):
            size = os.path.getsize(shard_path)
            current_total += size
            print(f" - {shard}: {size:,} bytes")
        else:
            print(f" - {shard}: MISSING")
            
    print(f"Expected Size: {expected_total:,} bytes")
    print(f"Actual Size:   {current_total:,} bytes")
    
    if current_total >= expected_total:
        print("Status: HEALTHY")
    else:
        diff = expected_total - current_total
        print(f"Status: CORRUPTED (Missing {diff:,} bytes)")

if __name__ == "__main__":
    check_integrity(r"D:\AI projects\Backend with django for llm model\Django\djangoLLM\models\llama3.2-gguf")
    check_integrity(r"D:\AI projects\Backend with django for llm model\Django\djangoLLM\models\qwen3-vl-gguf")
