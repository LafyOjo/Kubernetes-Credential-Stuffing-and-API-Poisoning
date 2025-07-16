import sys
from pathlib import Path

# Ensure the backend package is on the Python path so tests can import app.*
backend_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_root))
