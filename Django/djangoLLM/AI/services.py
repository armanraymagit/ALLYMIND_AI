import ollama
import os
from .models import TextEmbedding # Import TextEmbedding model
from pgvector.django import CosineDistance # Import CosineDistance for vector similarity


OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://127.0.0.1:11434') # Default to localhost for local dev
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2:latest')
OLLAMA_VISION_MODEL = os.getenv('OLLAMA_VISION_MODEL', 'llama3.2-vision:latest')
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')
HF_VISION_MODEL = "Qwen/Qwen2-VL-2B-Instruct"

# Shared Ollama client instance for connection reuse
_ollama_client = None

def get_ollama_client():
    """
    Returns a shared Ollama client instance.
    """
    global _ollama_client
    if _ollama_client is None:
        try:
            _ollama_client = ollama.Client(host=OLLAMA_HOST)
            # Test connection lightly
            # _ollama_client.list() # Optional: heavy call, maybe skip for now or use a lighter check if possible
        except Exception as e:
            print(f"Failed to initialize Ollama client at {OLLAMA_HOST}: {e}")
            raise e
    return _ollama_client

def generate_embedding(text: str) -> list[float]:
    """
    Generates a vector embedding for the given text using Ollama.
    Assumes 'nomic-embed-text' model is available in Ollama.
    """
    client = get_ollama_client()
    response = client.embeddings(
        model='nomic-embed-text',
        prompt=text,
        keep_alive='30m'  # Keep model loaded for 30 minutes
    )
    return response['embedding']

def get_ollama_host() -> str:
    """
    Returns the configured Ollama host.
    """
    return OLLAMA_HOST

import PyPDF2
# import whisper # Import whisper
from moviepy import VideoFileClip # Import moviepy
from PIL import Image # Import PIL for image processing
import tempfile
import os

# Load the Whisper model once (adjust model size as needed, e.g., 'base', 'small', 'medium', 'large')
# This can be resource intensive and might be better handled in a separate process or with a pre-loaded model.
_whisper_model = None

# def get_whisper_model():
#     """
#     Loads the Whisper model. If a CUDA-enabled GPU is available, the model is loaded onto the GPU.
#     Otherwise, it falls back to the CPU.
#     Requires PyTorch to be installed with CUDA support for GPU acceleration.
#     """
#     global _whisper_model
#     if _whisper_model is None:
#         import torch
#         import logging
# 
#         logger = logging.getLogger(__name__)
# 
#         is_cuda_available = torch.cuda.is_available()
#         logger.info(f"CUDA available: {is_cuda_available}")
#         
#         if not is_cuda_available:
#             logger.warning("CUDA not available. Falling back to CPU for Whisper.")
#             logger.info(f"PyTorch version: {torch.__version__}")
#             logger.info(f"PyTorch CUDA version: {torch.version.cuda}")
#             device = "cpu"
#         else:
#             logger.info("CUDA is available. Loading Whisper model on GPU.")
#             device = "cuda"
# 
#         _whisper_model = whisper.load_model("base", device=device)
#     return _whisper_model

def extract_text_from_pdf(pdf_file) -> str:
    """
    Extracts text from a PDF file.
    """
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page_num in range(len(reader.pages)):
        text += reader.pages[page_num].extract_text()
    return text

def transcribe_audio(audio_file_path: str) -> str:
    """
    Transcribes audio from a given file path into text using the Whisper model.
    """
    # model = get_whisper_model()
    # result = model.transcribe(audio_file_path)
    # return result["text"]
    return "Whisper model is currently disabled."

def extract_audio_from_video(video_file_path: str) -> str:
    """
    Extracts audio from a video file and saves it to a temporary MP3 file.
    Returns the path to the temporary audio file.
    """
    clip = VideoFileClip(video_file_path)
    temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    temp_audio_path = temp_audio_file.name
    clip.audio.write_audiofile(temp_audio_path)
    clip.close()
    return temp_audio_path

def summarize_text(text: str) -> str:
    """
    Summarizes the given text using the Llama 3.2 model via Ollama.
    """
    client = get_ollama_client()
    prompt = f"Summarize the following text concisely: {text}"
    response = client.generate(
        model=OLLAMA_MODEL,
        prompt=prompt,
        keep_alive='30m'  # Keep model loaded for 30 minutes
    )
    return response['response']

def generate_quiz(text: str) -> str:
    """
    Generates quiz questions from the given text using the Llama 3.2 model via Ollama.
    """
    client = get_ollama_client()
    prompt = f"Generate 3-5 multiple choice quiz questions (each with 4 options and the correct answer) from the following text: {text}"
    response = client.generate(
        model=OLLAMA_MODEL,
        prompt=prompt,
        keep_alive='30m'  # Keep model loaded for 30 minutes
    )
    return response['response']

def hybrid_rag_generation(query: str, user) -> str:
    """
    Generates a response using a hybrid RAG and fine-tuning approach with Llama 3.2 via Ollama.
    """
    client = get_ollama_client()

    # 1. Generate embedding for the query
    query_embedding = generate_embedding(query)

    # 2. Search for relevant documents (notes) by the user
    # Note: This assumes TextEmbedding is associated with a user or content related to a user
    # For now, we'll search all embeddings, but ideally, this would be scoped to the user's content.
    # To scope by user, you would need to add a ForeignKey to User in TextEmbedding model.
    results = TextEmbedding.objects.order_by(CosineDistance('embedding', query_embedding)).annotate(
        distance=CosineDistance('embedding', query_embedding)
    ).filter(distance__lt=0.5)[:3] # Get top 3 relevant results

    context = ""
    if results:
        context = "Relevant information:\n"
        for i, res in enumerate(results):
            context += f"Document {i+1}: {res.text}\n"

    # 3. Construct prompt for Llama 3.2 model
    if context:
        prompt = (
            f"Based on the following relevant information and your knowledge, answer the user's question. "
            f"If the information is not sufficient, state that you don't have enough information.\n\n"
            f"{context}\n"
            f"User's question: {query}"
        )
    else:
        prompt = f"Answer the following question based on your knowledge: {query}"

    # 4. Generate response using Llama 3.2
    response = client.generate(
        model=OLLAMA_MODEL,
        prompt=prompt,
        keep_alive='30m'  # Keep model loaded for 30 minutes
    )
    return response['response']

def classify_image(image_path: str, max_dimension: int = 768) -> str:
    """
    Classifies or describes an image using Llama 3.2 Vision via Ollama (or Hugging Face if configured).
    Automatically resizes large images to improve processing speed.
    
    Args:
        image_path: Path to the image file
        max_dimension: Maximum width/height (default 768px for optimal speed/quality balance)
    """
    client = get_ollama_client()
    
    # Check if file exists
    if not os.path.exists(image_path):
        return "Error: Image file not found."

    optimized_path = image_path
    temp_file = None
    
    try:
        # Optimize image size for faster processing
        img = Image.open(image_path)
        width, height = img.size
        
        # Only resize if image is larger than max_dimension
        if width > max_dimension or height > max_dimension:
            # Calculate new size maintaining aspect ratio
            if width > height:
                new_width = max_dimension
                new_height = int((max_dimension / width) * height)
            else:
                new_height = max_dimension
                new_width = int((max_dimension / height) * width)
            
            # Resize image
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save to temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            img.save(temp_file.name, 'JPEG', quality=85)
            optimized_path = temp_file.name
        
        # Prefer Hugging Face if API key is set; otherwise use Ollama with Llama 3.2 Vision
        if HUGGINGFACE_API_KEY:
            try:
                print(f"[AI] Using Hugging Face for image classification: {HF_VISION_MODEL}")
                return classify_image_hf(optimized_path)
            except Exception as hf_err:
                print(f"[AI] HF Classification failed, falling back to Ollama: {hf_err}")
        # Ollama fallback: Llama 3.2 Vision
        try:
            prompt = "Classify this image into ONE of these categories: Math, Physics, ComputerScience, Chemistry, Biology, Assignment, ExamPaper, Notes, or Other. Provide only the category name."
            response = client.generate(
                model=OLLAMA_VISION_MODEL,
                prompt=prompt,
                images=[optimized_path],
                keep_alive='30m'
            )
            return response.get('response', '').strip()
        except Exception as ollama_err:
            if not HUGGINGFACE_API_KEY:
                return f"Ollama vision failed: {str(ollama_err)}. Set HUGGINGFACE_API_KEY for HF fallback or ensure {OLLAMA_VISION_MODEL} is available."
            return f"Both HF and Ollama vision failed. Ollama: {str(ollama_err)}"

    except Exception as e:
        return f"Error in image classification pipeline: {str(e)}"
    finally:
        # Clean up temporary file if created
        if temp_file and os.path.exists(temp_file.name):
            os.remove(temp_file.name)

import requests
import base64

def huggingface_analyze_image(image_path: str, prompt: str) -> str:
    """
    Analyzes an image using Hugging Face Inference API.
    """
    if not HUGGINGFACE_API_KEY:
        return "Error: HUGGINGFACE_API_KEY not set."

    # Read and encode image
    with open(image_path, "rb") as f:
        img_str = base64.b64encode(f.read()).decode('utf-8')
    
    data_uri = f"data:image/jpeg;base64,{img_str}"
    
    api_url = f"https://api-inference.huggingface.co/models/{HF_VISION_MODEL}"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}", "Content-Type": "application/json"}
    
    payload = {
        "inputs": {
            "question": prompt,
            "image": data_uri
        },
        "parameters": {
            "max_new_tokens": 1000,
            "temperature": 0.2
        }
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        
        if isinstance(result, list) and len(result) > 0:
            return result[0].get('generated_text', str(result))
        return result.get('generated_text', result.get('answer', str(result)))
    except Exception as e:
        return f"Error with HF API: {str(e)}"

def classify_image_hf(image_path: str) -> str:
    """
    Classifies an image using Hugging Face.
    """
    prompt = "Classify this image into ONE of these categories: Math, Physics, ComputerScience, Chemistry, Biology, Assignment, ExamPaper, Notes, or Other. Provide only the category name."
    return huggingface_analyze_image(image_path, prompt)
