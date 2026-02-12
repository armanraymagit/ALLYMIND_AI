import logging
from django.core.management.base import BaseCommand
import ollama
import os

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Preloads Ollama models into VRAM to reduce inference latency'

    def add_arguments(self, parser):
        OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2:latest')
        OLLAMA_VISION_MODEL = os.getenv('OLLAMA_VISION_MODEL', 'llama3.2-vision:latest')
        parser.add_argument(
            '--models',
            nargs='+',
            default=[OLLAMA_MODEL, OLLAMA_VISION_MODEL],
            help=f'List of models to preload (default: {OLLAMA_MODEL} {OLLAMA_VISION_MODEL})'
        )
        parser.add_argument(
            '--keep-alive',
            type=str,
            default='30m',
            help='Keep alive duration (-1 for infinite, or duration like "30m")'
        )

    def handle(self, *args, **options):
        ollama_host = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
        models = options['models']
        keep_alive = options['keep_alive']

        self.stdout.write(self.style.SUCCESS(f'Connecting to Ollama at {ollama_host}'))
        
        try:
            client = ollama.Client(host=ollama_host)
            
            # Verify connection by listing available models
            # Verify connection by listing available models
            available_models = client.list()
            
            # Handle both dict (old client) and object (new client) responses
            if hasattr(available_models, 'models'):
                model_list = available_models.models
            else:
                model_list = available_models.get('models', [])

            model_names = []
            for m in model_list:
                # Extract model name from object or dict
                if hasattr(m, 'model'): # New client uses 'model' attribute
                    model_names.append(m.model)
                elif hasattr(m, 'name'):
                    model_names.append(m.name)
                elif isinstance(m, dict):
                    model_names.append(m.get('model', m.get('name', '')))
                else:
                    self.stdout.write(self.style.WARNING(f"Unknown model format: {m}"))
            self.stdout.write(f'Available models: {", ".join(model_names)}')
            
            for model in models:
                self.stdout.write(f'Preloading model: {model}')
                
                # Check if model exists (match by name or tag, e.g. llama3.2:latest)
                if not any(model in name for name in model_names):
                    # Try pulling from Ollama library first (llama3.2, llama3.2-vision, etc.)
                    if 'llama3.2' in model or ':' in model:
                        self.stdout.write(self.style.WARNING(
                            f'Model {model} not found. Attempting to pull from Ollama library...'
                        ))
                        try:
                            client.pull(model)
                            self.stdout.write(self.style.SUCCESS(f'✓ Model {model} pulled successfully'))
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'✗ Failed to pull model {model}: {e}'))
                            continue
                    else:
                        self.stdout.write(self.style.WARNING(
                            f'Model {model} not found. Attempting to create from Modelfile...'
                        ))
                        modelfile_path = 'Modelfile' if 'llama' in model else f'Modelfile.{model}'
                        if not os.path.exists(modelfile_path) and 'llama' in model:
                            modelfile_path = 'Modelfile'
                        elif not os.path.exists(modelfile_path):
                            modelfile_path = 'Modelfile'
                        if os.path.exists(modelfile_path):
                            try:
                                with open(modelfile_path, 'r') as f:
                                    modelfile_content = f.read()
                                client.create(model=model, modelfile=modelfile_content)
                                self.stdout.write(self.style.SUCCESS(f'✓ Model {model} created successfully'))
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(f'✗ Failed to create model {model}: {e}'))
                                continue
                        else:
                            self.stdout.write(self.style.ERROR(f'Model {model} not found and no Modelfile. Skipping.'))
                            continue
                
                try:
                    # Send a minimal request to load the model into VRAM
                    response = client.generate(
                        model=model,
                        prompt='Hello',
                        keep_alive=keep_alive,
                        options={'num_predict': 1}  # Generate only 1 token to minimize time
                    )
                    
                    self.stdout.write(self.style.SUCCESS(
                        f'✓ Model {model} loaded successfully (keep_alive={keep_alive})'
                    ))
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f'✗ Failed to load model {model}: {str(e)}'
                    ))
                    logger.error(f'Failed to preload {model}', exc_info=True)
            
            self.stdout.write(self.style.SUCCESS('\nPreloading complete!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to connect to Ollama: {str(e)}'))
            logger.error('Ollama connection failed', exc_info=True)
            raise
