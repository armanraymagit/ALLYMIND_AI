from django.shortcuts import render
from rest_framework import generics, status
from django.contrib.auth.models import User
from .serializers import UserSerializer, NoteSerializer, TextEmbeddingSerializer, StudyTimeSerializer, DocumentSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Note, TextEmbedding, StudyTime, Document
from .services import generate_embedding, extract_text_from_pdf, summarize_text, transcribe_audio, extract_audio_from_video, generate_quiz, hybrid_rag_generation
from pgvector.django import CosineDistance, L2Distance
from rest_framework.parsers import MultiPartParser, FormParser
import os # Import os for file handling
import tempfile # Import tempfile for temporary file creation
import traceback # Import traceback for detailed error logging


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
        file = request.data.get('file')
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        doc = Document.objects.create(
            user=request.user,
            filename=file.name,
            file_type=file.content_type,
            status='processing'
        )

        try:
            text_content = ""
            if file.content_type == 'application/pdf':
                text_content = extract_text_from_pdf(file)
            elif file.content_type == 'text/plain':
                text_content = file.read().decode('utf-8')
            else:
                doc.status = 'failed'
                doc.save()
                return Response({"error": "Unsupported file type."}, status=status.HTTP_400_BAD_REQUEST)
            
            # For simplicity, embedding the whole text. A more robust solution would chunk it.
            embedding = generate_embedding(text_content)
            TextEmbedding.objects.create(document=doc, text=text_content, embedding=embedding)

            doc.status = 'indexed'
            doc.save()
            
            serializer = self.get_serializer(doc)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            doc.status = 'failed'
            doc.save()
            return Response({"error": f"Failed to process document: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentDeleteView(generics.DestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)


class PdfUploadView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        pdf_file = request.data.get('pdf_file')

        if not pdf_file:
            return Response({"error": "No PDF file provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            extracted_text = extract_text_from_pdf(pdf_file)
            summary = summarize_text(extracted_text)
            return Response({"summary": summary}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AudioUploadView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        audio_file = request.data.get('audio_file')

        if not audio_file:
            return Response({"error": "No audio file provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Save the audio file temporarily to transcribe
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_audio_file:
            for chunk in audio_file.chunks():
                temp_audio_file.write(chunk)
            temp_audio_path = temp_audio_file.name

        try:
            transcribed_text = transcribe_audio(temp_audio_path)
            summary = summarize_text(transcribed_text)
            return Response({"summary": summary}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)


class VideoUploadView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        video_file = request.data.get('video_file')

        if not video_file:
            return Response({"error": "No video file provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Save the video file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video_file:
            for chunk in video_file.chunks():
                temp_video_file.write(chunk)
            temp_video_path = temp_video_file.name

        temp_audio_path = None # Initialize to None

        try:
            temp_audio_path = extract_audio_from_video(temp_video_path)
            transcribed_text = transcribe_audio(temp_audio_path)
            summary = summarize_text(transcribed_text)
            return Response({"summary": summary}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"An error occurred: {str(e)}\n{traceback.format_exc()}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(temp_video_path):
                os.remove(temp_video_path)
            if temp_audio_path and os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_embedding(request):
    text = request.data.get('text')
    if not text:
        return Response({"error": "Text is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        embedding = generate_embedding(text)
        text_embedding = TextEmbedding.objects.create(text=text, embedding=embedding)
        serializer = TextEmbeddingSerializer(text_embedding)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def search_embeddings(request):
    query_text = request.data.get('query_text')
    if not query_text:
        return Response({"error": "Query text is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        query_embedding = generate_embedding(query_text)
        
        results = TextEmbedding.objects.order_by(CosineDistance('embedding', query_embedding)).annotate(
            distance=CosineDistance('embedding', query_embedding)
        ).filter(distance__lt=0.5)[:5]

        serializer = TextEmbeddingSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_quiz_view(request):
    text = request.data.get('text')
    if not text:
        return Response({"error": "Text is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        quiz = generate_quiz(text)
        return Response({"quiz": quiz}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hybrid_rag_query_view(request):
    query = request.data.get('query')
    if not query:
        return Response({"error": "Query is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        response = hybrid_rag_generation(query, request.user)
        return Response({"response": response}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def text_summarization_view(request):
    text = request.data.get('text')
    if not text:
        return Response({"error": "Text is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        summary = summarize_text(text)
        return Response({"summary": summary}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
