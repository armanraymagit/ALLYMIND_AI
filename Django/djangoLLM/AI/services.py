import ollama
import os
from .models import TextEmbedding # Import TextEmbedding model
from pgvector.django import CosineDistance # Import CosineDistance for vector similarity


OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://ollama:11434') # 'ollama' is the service name in docker-compose

def generate_embedding(text: str) -> list[float]:
    """
    Generates a vector embedding for the given text using Ollama.
    Assumes 'nomic-embed-text' model is available in Ollama.
    """
    client = ollama.Client(host=OLLAMA_HOST)
    response = client.embeddings(
        model='nomic-embed-text',
        prompt=text
    )
    return response['embedding']

def get_ollama_host() -> str:
    """
    Returns the configured Ollama host.
    """
    return OLLAMA_HOST

import PyPDF2
import whisper # Import whisper
from moviepy import VideoFileClip # Import moviepy
import tempfile
import os

# Load the Whisper model once (adjust model size as needed, e.g., 'base', 'small', 'medium', 'large')
# This can be resource intensive and might be better handled in a separate process or with a pre-loaded model.
_whisper_model = None

def get_whisper_model():
    """
    Loads the Whisper model. If a CUDA-enabled GPU is available, the model is loaded onto the GPU.
    Otherwise, it falls back to the CPU.
    Requires PyTorch to be installed with CUDA support for GPU acceleration.
    """
    global _whisper_model
    if _whisper_model is None:
        import torch
        import logging

        logger = logging.getLogger(__name__)

        is_cuda_available = torch.cuda.is_available()
        logger.info(f"CUDA available: {is_cuda_available}")
        
        if not is_cuda_available:
            logger.warning("CUDA not available. Falling back to CPU for Whisper.")
            logger.info(f"PyTorch version: {torch.__version__}")
            logger.info(f"PyTorch CUDA version: {torch.version.cuda}")
            device = "cpu"
        else:
            logger.info("CUDA is available. Loading Whisper model on GPU.")
            device = "cuda"

        _whisper_model = whisper.load_model("base", device=device)
    return _whisper_model

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
    model = get_whisper_model()
    result = model.transcribe(audio_file_path)
    return result["text"]

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
    client = ollama.Client(host=OLLAMA_HOST)
    prompt = f"Summarize the following text concisely: {text}"
    response = client.generate(model='llama3.2', prompt=prompt)
    return response['response']

def generate_quiz(text: str) -> str:
    """
    Generates quiz questions from the given text using the Llama 3.2 model via Ollama.
    """
    client = ollama.Client(host=OLLAMA_HOST)
    prompt = f"Generate 3-5 multiple choice quiz questions (each with 4 options and the correct answer) from the following text: {text}"
    response = client.generate(model='llama3.2', prompt=prompt)
    return response['response']

def hybrid_rag_generation(query: str, user) -> str:
    """
    Generates a response using a hybrid RAG and fine-tuning approach with Llama 3.2 via Ollama.
    """
    client = ollama.Client(host=OLLAMA_HOST)

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
    response = client.generate(model='llama3.2', prompt=prompt)
    return response['response']
