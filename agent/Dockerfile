FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create config directory for persistent data
RUN mkdir -p /config

# Set default config directory
ENV CONFIG_DIR=/config

# Set unbuffered output for logging
ENV PYTHONUNBUFFERED=1

# Declare volume for persistent data
VOLUME ["/config"]

CMD ["python", "main.py"]
