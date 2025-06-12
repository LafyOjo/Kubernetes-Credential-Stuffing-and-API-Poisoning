# app/main.py (or your primary FastAPI application file)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Import CORSMiddleware

# Assuming your alerts router is in app.api.alerts
from app.api import alerts # Import your alerts router correctly

app = FastAPI()

# --- CORS Configuration ---
origins = [
    "http://localhost:3000",  # Your frontend application's origin
    # Add other allowed origins for production here, e.g.,
    # "https://your-production-frontend.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- End CORS Configuration ---

# Include your API routers here in the main application file
app.include_router(alerts.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI application!"}

# To run this application, navigate to your backend directory in the terminal
# and execute:
# uvicorn app.main:app --reload --port 8001
