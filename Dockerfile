# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.12.3
FROM python:${PYTHON_VERSION}-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Create a non-privileged user that the app will run under.
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

# Download dependencies
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=backend/requirements.txt,target=requirements.txt \
    python -m pip install -r requirements.txt

# --- REMOVED: No need for explicit mkdir for 'instance' here if app handles it.
# You had this line for instance, but removed the mkdir, leaving only chown.
# This entire previous block (related to instance) should ideally be removed if your app creates it.
# If you kept a comment but removed the RUN line, that's good.

# Copy the source code into the container.
# This copies your local 'MyDuka' content into '/app' in the container.
COPY . .

# --- THIS IS THE CORRECT POSITION FOR THE CHOWN COMMAND ---
# It must be AFTER the COPY, because at this point /app/backend actually exists
# and contains your application files, and it's still owned by root.
# This command transfers ownership to appuser.
RUN chown -R appuser:appuser /app/backend

# Switch to the non-privileged user to run the application.
USER appuser

# Expose the port that the application listens on.
EXPOSE 8000

# Run the application.
CMD ["python", "backend/run.py"]