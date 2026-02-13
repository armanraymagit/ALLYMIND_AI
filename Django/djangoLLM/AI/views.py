from django.shortcuts import render
from django.http import StreamingHttpResponse
from rest_framework import generics, status
from django.contrib.auth.models import User
from .serializers import (
    UserSerializer,
    NoteSerializer,
    TextEmbeddingSerializer,
    StudyTimeSerializer,
    DocumentSerializer,
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Note, TextEmbedding, StudyTime, Document
from .services import (
    generate_embedding,
    extract_text_from_pdf,
    summarize_text,
    transcribe_audio,
    extract_audio_from_video,
    generate_quiz,
    hybrid_rag_generation,
    get_ollama_host,
    classify_image,
)
from pgvector.django import CosineDistance, L2Distance
from rest_framework.parsers import MultiPartParser, FormParser
import os  # Import os for file handling
import tempfile  # Import tempfile for temporary file creation
import traceback  # Import traceback for detailed error logging
import requests
import json

# Reuse the session to keep connection open
_proxy_session = requests.Session()


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class NoteListCreate(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(author=self.request.user)
        else:
            print(serializer.errors)


class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)


class StudyTimeListCreate(generics.ListCreateAPIView):
    serializer_class = StudyTimeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return StudyTime.objects.filter(user=user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(user=self.request.user)
        else:
            print(serializer.errors)


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        file = request.data.get("file")
        if not file:
            return Response(
                {"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        doc = Document.objects.create(
            user=request.user,
            filename=file.name,
            file_type=file.content_type,
            status="processing",
        )

        try:
            text_content = ""
            if file.content_type == "application/pdf":
                text_content = extract_text_from_pdf(file)
            elif file.content_type == "text/plain":
                text_content = file.read().decode("utf-8")
            else:
                doc.status = "failed"
                doc.save()
                return Response(
                    {"error": "Unsupported file type."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # For simplicity, embedding the whole text. A more robust solution would chunk it.
            embedding = generate_embedding(text_content)
            TextEmbedding.objects.create(
                document=doc, text=text_content, embedding=embedding
            )

            doc.status = "indexed"
            doc.save()

            serializer = self.get_serializer(doc)
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data, status=status.HTTP_201_CREATED, headers=headers
            )

        except Exception as e:
            doc.status = "failed"
            doc.save()
            return Response(
                {"error": f"Failed to process document: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DocumentDeleteView(generics.DestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)


class PdfUploadView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        pdf_file = request.data.get("pdf_file")

        if not pdf_file:
            return Response(
                {"error": "No PDF file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            extracted_text = extract_text_from_pdf(pdf_file)
            summary = summarize_text(extracted_text)
            return Response({"summary": summary}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AudioUploadView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        audio_file = request.data.get("audio_file")

        if not audio_file:
            return Response(
                {"error": "No audio file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Save the audio file temporarily to transcribe
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".mp3"
        ) as temp_audio_file:
            for chunk in audio_file.chunks():
                temp_audio_file.write(chunk)
            temp_audio_path = temp_audio_file.name

        try:
            transcribed_text = transcribe_audio(temp_audio_path)
            summary = summarize_text(transcribed_text)
            return Response({"summary": summary}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            if os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)


class VideoUploadView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        video_file = request.data.get("video_file")

        if not video_file:
            return Response(
                {"error": "No video file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Save the video file temporarily
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".mp4"
        ) as temp_video_file:
            for chunk in video_file.chunks():
                temp_video_file.write(chunk)
            temp_video_path = temp_video_file.name

        temp_audio_path = None  # Initialize to None

        try:
            temp_audio_path = extract_audio_from_video(temp_video_path)
            transcribed_text = transcribe_audio(temp_audio_path)
            summary = summarize_text(transcribed_text)
            return Response({"summary": summary}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}\n{traceback.format_exc()}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            if os.path.exists(temp_video_path):
                os.remove(temp_video_path)
            if temp_audio_path and os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)


class ImageClassificationView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        image_file = request.data.get("image")
        if not image_file:
            return Response(
                {"error": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_image:
            for chunk in image_file.chunks():
                temp_image.write(chunk)
            temp_image_path = temp_image.name

        try:
            description = classify_image(temp_image_path)
            return Response({"description": description}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)


@api_view(["POST"])
@permission_classes([AllowAny])
def create_embedding(request):
    text = request.data.get("text")
    if not text:
        return Response(
            {"error": "Text is required."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        embedding = generate_embedding(text)
        text_embedding = TextEmbedding.objects.create(text=text, embedding=embedding)
        serializer = TextEmbeddingSerializer(text_embedding)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def search_embeddings(request):
    query_text = request.data.get("query_text")
    if not query_text:
        return Response(
            {"error": "Query text is required."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        query_embedding = generate_embedding(query_text)

        results = (
            TextEmbedding.objects.order_by(CosineDistance("embedding", query_embedding))
            .annotate(distance=CosineDistance("embedding", query_embedding))
            .filter(distance__lt=0.5)[:5]
        )

        serializer = TextEmbeddingSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_quiz_view(request):
    text = request.data.get("text")
    if not text:
        return Response(
            {"error": "Text is required."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        quiz = generate_quiz(text)
        return Response({"quiz": quiz}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hybrid_rag_query_view(request):
    query = request.data.get("query")
    if not query:
        return Response(
            {"error": "Query is required."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        response = hybrid_rag_generation(query, request.user)
        return Response({"response": response}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def text_summarization_view(request):
    text = request.data.get("text")
    if not text:
        return Response(
            {"error": "Text is required."}, status=status.HTTP_400_BAD_REQUEST
        )
    try:
        summary = summarize_text(text)
        return Response({"summary": summary}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ollama_proxy_view(request):
    """
    Proxies requests from the frontend to the local Ollama instance.
    Handles both standard and streaming responses.
    Injects keep_alive to keep models loaded.
    """
    ollama_url = f"{get_ollama_host()}/api/generate"
    payload = request.data

    # Inject keep_alive if not present, to ensure model stays in memory
    if "keep_alive" not in payload:
        payload["keep_alive"] = "30m"

    stream = payload.get("stream", False)

    try:
        if stream:

            def stream_generator():
                try:
                    with _proxy_session.post(
                        ollama_url, json=payload, stream=True, timeout=120
                    ) as resp:
                        resp.raise_for_status()
                        for line in resp.iter_lines():
                            if line:
                                yield line + b"\n"
                except Exception as stream_err:
                    print(f"Ollama Stream Error: {str(stream_err)}")
                    yield json.dumps({"error": str(stream_err)}).encode() + b"\n"

            return StreamingHttpResponse(
                stream_generator(), content_type="application/x-ndjson"
            )
        else:
            resp = _proxy_session.post(ollama_url, json=payload, timeout=120)
            return Response(resp.json(), status=resp.status_code)
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Ollama Proxy Error: {str(e)}\n{error_details}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def huggingface_proxy_view(request):
    """
    Proxies vision requests to Hugging Face Inference API.
    Uses the modern v1/chat/completions (OpenAI Compatible) API
    which is much more stable and avoids "410 Gone" errors.
    """
    hf_token = os.getenv("HUGGINGFACE_API_KEY")
    if not hf_token:
        return Response(
            {"error": "Hugging Face API key not configured on server."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    model = request.data.get("model", "Qwen/Qwen2-VL-2B-Instruct")
    # Use the official router endpoint for v1/chat/completions
    api_url = "https://router.huggingface.co/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json",
    }

    try:
        payload = request.data.get("payload", {})

        # Convert legacy vision format to Messages format if needed
        if "inputs" in payload and not "messages" in payload:
            inputs = payload["inputs"]
            text = inputs.get("question", "Analyze this image")
            image = inputs.get("image", "")

            hf_payload = {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": text},
                            {"type": "image_url", "image_url": {"url": image}},
                        ],
                    }
                ],
                "max_tokens": 1024,
            }
        else:
            hf_payload = payload

        payload_size = len(json.dumps(hf_payload))
        print(
            f"[AI] Proxying to HF (Messages API): {model} | Payload size: {payload_size/1024:.1f} KB"
        )

        # Use requests.post directly instead of a global session to avoid pool issues with large payloads
        # Adding a simple retry loop for network/ssl glitches
        last_err = None
        for attempt in range(2):
            try:
                resp = requests.post(
                    api_url, headers=headers, json=hf_payload, timeout=90
                )

                if resp.status_code >= 400:
                    print(
                        f"[AI] HF Error {resp.status_code} on attempt {attempt+1}: {resp.text}"
                    )
                    # If chat API is not supported (404), fall back to legacy
                    if resp.status_code == 404 and attempt == 0:
                        legacy_url = (
                            f"https://api-inference.huggingface.co/models/{model}"
                        )
                        print(f"[AI] Chat API 404, trying legacy endpoint...")
                        resp = requests.post(
                            legacy_url, headers=headers, json=payload, timeout=90
                        )

                    # If we got a real error, return it
                    if resp.status_code >= 400:
                        return Response(
                            resp.json()
                            if "application/json"
                            in resp.headers.get("Content-Type", "")
                            else {"error": resp.text},
                            status=resp.status_code,
                        )

                return Response(resp.json(), status=resp.status_code)
            except (
                requests.exceptions.SSLError,
                requests.exceptions.ConnectionError,
            ) as net_err:
                last_err = net_err
                print(f"[AI] Network/SSL Error on attempt {attempt+1}: {str(net_err)}")
                if attempt == 0:
                    import time

                    time.sleep(1)  # Quick wait before retry
                    continue
                break

        raise last_err or Exception("Failed after retries")

    except Exception as e:
        print(f"HF Proxy Fatal Error: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
