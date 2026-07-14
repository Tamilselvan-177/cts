FROM python:3.11-slim

WORKDIR /app

# System dependencies for pandas/numpy if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
# Ensure new generative ai SDK is installed
RUN pip install --no-cache-dir google-generativeai pydantic

# Copy the backend code and ML pipeline code
# We need both so the auto-sync can run the ML script
COPY backend /app/backend
COPY cts_ml_pipeline /app/cts_ml_pipeline

# Set Python path so it finds everything correctly
ENV PYTHONPATH="/app/backend:/app/cts_ml_pipeline"
ENV ML_DATA_DIR="/app/cts_ml_pipeline/source_data"
ENV ML_OUTPUT_DIR="/app/cts_ml_pipeline/outputs"

WORKDIR /app/backend

# Expose FastAPI port
EXPOSE 8000

# Run Uvicorn
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
