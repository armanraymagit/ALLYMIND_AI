from django.db import models
from django.contrib.auth.models import User
from pgvector.django import VectorField


class Note(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes")

    def __str__(self):
        return self.title


class Document(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="documents")
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    upload_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('processing', 'Processing'), ('indexed', 'Indexed'), ('failed', 'Failed')], default='processing')

    def __str__(self):
        return f"{self.filename} ({self.get_status_display()})"


class TextEmbedding(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="embeddings")
    text = models.TextField()
    embedding = VectorField(dimensions=768)  # nomic-embed-text typically produces 768-dimensional embeddings
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Embedding for {self.document.filename}: {self.text[:30]}..."


class StudyTime(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="study_times")
    date = models.DateField()
    duration = models.PositiveIntegerField()  # in seconds

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.duration}s"