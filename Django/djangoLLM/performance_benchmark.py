import time
import ollama
import os

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
client = ollama.Client(host=OLLAMA_HOST)


def benchmark_text_generation(model_name, prompt, iterations=3):
    """Benchmark text generation speed (tokens per second)"""
    print(f"\n{'='*60}")
    print(f"Benchmarking {model_name} - Text Generation")
    print(f"{'='*60}")

    total_tokens = 0
    total_time = 0

    for i in range(iterations):
        start_time = time.time()
        response = client.generate(model=model_name, prompt=prompt, keep_alive="30m")
        end_time = time.time()

        elapsed = end_time - start_time
        # Estimate tokens (rough approximation: 1 token ≈ 4 characters)
        tokens = len(response["response"]) // 4
        tps = tokens / elapsed if elapsed > 0 else 0

        total_tokens += tokens
        total_time += elapsed

        print(f"  Run {i+1}: {tokens} tokens in {elapsed:.2f}s ({tps:.2f} TPS)")

    avg_tps = total_tokens / total_time if total_time > 0 else 0
    print(f"\n  Average: {avg_tps:.2f} tokens/second")
    return avg_tps


def benchmark_vision(model_name, image_path, iterations=3):
    """Benchmark vision model latency"""
    print(f"\n{'='*60}")
    print(f"Benchmarking {model_name} - Image Description")
    print(f"{'='*60}")

    if not os.path.exists(image_path):
        print(f"  ERROR: Image not found at {image_path}")
        return 0

    total_time = 0

    for i in range(iterations):
        start_time = time.time()
        response = client.generate(
            model=model_name,
            prompt="Describe this image in detail.",
            images=[image_path],
            keep_alive="30m",
        )
        end_time = time.time()

        elapsed = end_time - start_time
        total_time += elapsed

        print(f"  Run {i+1}: {elapsed:.2f}s")
        if i == 0:
            print(f"  Sample output: {response['response'][:100]}...")

    avg_latency = total_time / iterations
    print(f"\n  Average latency: {avg_latency:.2f} seconds")
    return avg_latency


if __name__ == "__main__":
    print("Performance Benchmark Suite")
    print("=" * 60)

    # Test text generation
    test_prompt = "Explain the concept of machine learning in simple terms."

    print("\n[1/2] Testing Llama 3.2 Model...")
    llama_tps = benchmark_text_generation("llama3.2:latest", test_prompt)

    # Test vision model
    print("\n[2/2] Testing Llama 3.2 Vision Model...")
    # Create a simple test image if none exists
    test_image = "test_image.jpg"
    if not os.path.exists(test_image):
        print(f"  Note: Place a test image at {test_image} for vision benchmarking")
        print(f"  Skipping vision benchmark for now...")
    else:
        qwen_latency = benchmark_vision("llama3.2-vision:latest", test_image)

    print("\n" + "=" * 60)
    print("Benchmark Complete!")
    print("=" * 60)
