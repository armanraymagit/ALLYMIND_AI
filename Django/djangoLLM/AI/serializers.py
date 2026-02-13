from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Note, TextEmbedding, StudyTime, Document


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        print(validated_data)
        user = User.objects.create_user(**validated_data)
        return user


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "title", "content", "created_at", "author"]
        extra_kwargs = {"author": {"read_only": True}}


class TextEmbeddingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TextEmbedding
        fields = ["id", "text", "embedding", "created_at"]
        read_only_fields = ["embedding", "created_at"]


class StudyTimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyTime
        fields = ["id", "user", "date", "duration"]
        extra_kwargs = {"user": {"read_only": True}}


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["id", "user", "filename", "file_type", "upload_date", "status"]
        extra_kwargs = {"user": {"read_only": True}}
