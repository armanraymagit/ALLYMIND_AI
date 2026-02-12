# Run all tests using env\Scripts (project venv)
$Root = $PSScriptRoot
$Python = Join-Path $Root "env\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    Write-Error "env\Scripts\python.exe not found. Create: python -m venv env; .\env\Scripts\pip install -r requirements.txt"
    exit 1
}

Write-Host "Using env\Scripts: $Python"
& $Python -c "import sys; print('Python', sys.version)"

# Django test suite
Write-Host "`n--- Django tests (AI app) ---"
& $Python (Join-Path $Root "manage.py") test AI -v 2

# Optional: functional/vision tests require Ollama with llama3.2 & llama3.2-vision
# & $Python (Join-Path $Root "functional_tests.py")
# & $Python (Join-Path $Root "vision_focused_tests.py")
