#!/bin/bash

# Exit on error
set -e

echo "Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL to be available
while ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done

echo "PostgreSQL is up - continuing..."

# Emergency fix: Install missing ollama package on startup (avoiding rebuild)
# This check prevents re-installing if already present, speeding up restarts
python3 -c "import ollama" 2>/dev/null || pip install ollama

# Run database migrations
echo "Running database migrations..."
python3 manage.py migrate --noinput

# Preload (and create) Ollama models
echo "Setting up Ollama models..."
if curl -s -f "$OLLAMA_HOST/api/tags" > /dev/null; then
    python3 manage.py preload_models || echo "Warning: Could not preload models"
else
    echo "Warning: Ollama is not reachable at $OLLAMA_HOST. Skipping model preloading."
fi

# Collect static files
echo "Collecting static files..."
python3 manage.py collectstatic --noinput || true

# Start Django development server
echo "Starting Django server..."
exec python3 manage.py runserver 0.0.0.0:8000
