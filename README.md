# Local Store Platform

A hyperlocal discovery and vendor management platform powered by on-device and local AI models.

## Project Structure

This repository is a monorepo containing two main parts:

- `/frontend` - The React Native (Expo) mobile app used by buyers and vendors.
- `/fastapi-backend` - The Python server that hosts open-source Machine Learning models for Natural Language Processing, Speech-to-Text, and Computer Vision.

## Setup Instructions

### 1. Database Setup (Supabase)
The app uses Supabase for Auth, Postgres Database, and Storage.
- Set up a new Supabase project.
- Use the SQL migrations in `/frontend` to seed your database.

### 2. Backend Setup
The backend powers the AI features using offline, open-source models (Whisper, CLIP, spaCy).
```bash
cd fastapi-backend
python -m venv venv
# Activate the venv (Windows: venv\Scripts\activate, Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
# Set up your .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_FASTAPI_URL
npx expo start
```

# Contributor: Sathvik, Atul Singh and Meet Jain