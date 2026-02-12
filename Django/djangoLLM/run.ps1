# Run a Python script or manage.py command using env\Scripts
# Usage: .\run.ps1 manage.py test AI
#        .\run.ps1 functional_tests.py
#        .\run.ps1 -c "import django; print(django.VERSION)"
$Root = $PSScriptRoot
$Python = Join-Path $Root "env\Scripts\python.exe"
$Pip = Join-Path $Root "env\Scripts\pip.exe"

if (-not (Test-Path $Python)) {
    Write-Error "env\Scripts\python.exe not found. Create venv: python -m venv env; .\env\Scripts\pip install -r requirements.txt"
    exit 1
}

if ($args.Count -eq 0) {
    Write-Host "Usage: .\run.ps1 <script.py or manage.py> [args...]"
    Write-Host "       .\run.ps1 -c \"code\""
    Write-Host "Using: $Python"
    exit 0
}

if ($args[0] -eq "-c") {
    & $Python -c ($args[1..($args.Count-1)] -join " ")
} else {
    & $Python @args
}
