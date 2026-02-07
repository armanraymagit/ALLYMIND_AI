from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("notes/", views.NoteListCreate.as_view(), name="note-list"),
    path("notes/delete/<int:pk>/", views.NoteDelete.as_view(), name="delete-note"),
    path("register/", views.CreateUserView.as_view(), name="register"),
    path("token/", TokenObtainPairView.as_view(), name="get_token"),
    path("token/refresh/", TokenRefreshView.as_view(), name="refresh_token"),
    path("notes/upload-pdf/", views.PdfUploadView.as_view(), name="upload-pdf"),
    path("notes/upload-audio/", views.AudioUploadView.as_view(), name="upload-audio"),
    path("notes/upload-video/", views.VideoUploadView.as_view(), name="upload-video"),
    path("embeddings/create/", views.create_embedding, name="create-embedding"),
    path("embeddings/search/", views.search_embeddings, name="search-embeddings"),
    path("study-time/", views.StudyTimeListCreate.as_view(), name="study-time-list-create"),
    path("generate-quiz/", views.generate_quiz_view, name="generate-quiz"),
    path("hybrid-query/", views.hybrid_rag_query_view, name="hybrid-rag-query"),
    path("summarize-text/", views.text_summarization_view, name="summarize-text"),
    path("documents/", views.DocumentListCreateView.as_view(), name="document-list-create"),
    path("documents/delete/<int:pk>/", views.DocumentDeleteView.as_view(), name="document-delete"),
]