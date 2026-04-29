FROM python:3.11-slim

WORKDIR /app

COPY server/ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ml/app.py /app/app.py
COPY server/ml/model /app/model

ENV PORT=5001

EXPOSE 5001

CMD gunicorn --bind 0.0.0.0:5001 --workers 2 app:app