FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py /app/

# Model files are mounted as a Railway volume at /app/model
# Or committed to git with: git add -f server/ml/model/*

CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "--workers", "2", "app:app"]