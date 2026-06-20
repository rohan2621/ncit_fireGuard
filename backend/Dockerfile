FROM python:3.11-slim

# OpenCV needs libgl1 at the OS level (not just pip) or imdecode fails on import.
# ffmpeg is for yt-dlp/stream support later — cheap to include now.
RUN apt-get update && apt-get install -y ffmpeg libgl1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
