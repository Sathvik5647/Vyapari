# Local Vendor App — FastAPI ML Backend

Python ML inference server that powers the AI features in the Local Vendor App.

## What This Server Does

| Endpoint | Model | Purpose |
|---|---|---|
| `POST /speech/transcribe` | Whisper (faster-whisper) | Audio → text (buyer voice search, vendor voice add) |
| `POST /nlp/parse-product` | spaCy NER + Regex | Text → `{name, price, unit, category}` |
| `POST /vision/identify-product` | CLIP (ViT-B/32) | Photo → product name + category |
| `GET /barcode/lookup/{barcode}` | Local SQLite DB | Barcode → product info |

## Quick Start

### 1. Install dependencies

```bash
cd fastapi-backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

> **Note:** `torch` and `transformers` are large (~2GB download). Use a fast connection.
> CLIP model (~600MB) and Whisper base (~150MB) download on first request.

### 2. Set environment variables

Create a `.env` file in `fastapi-backend/`:
```env
WHISPER_MODEL_SIZE=base        # tiny | base | small | medium
WHISPER_DEVICE=cpu             # cpu | cuda
WHISPER_COMPUTE_TYPE=int8      # int8 (fastest CPU) | float16 (GPU)
CLIP_MODEL_ID=openai/clip-vit-base-patch32
```

### 3. Run the server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs: http://localhost:8000/docs

### 4. Connect from the app

Add to your `.env` in `local-vendor-app/`:
```env
EXPO_PUBLIC_FASTAPI_URL=http://YOUR_PC_IP:8000
```

> For Android emulator: use `http://10.0.2.2:8000`
> For physical device on same WiFi: use your PC's local IP (e.g. `http://192.168.1.5:8000`)

---

## Docker

```bash
# Build
docker build -t local-vendor-ml .

# Run
docker run -p 8000:8000 local-vendor-ml
```

---

## Barcode Database Setup

The barcode lookup uses a local SQLite DB seeded from Open Food Facts:

```bash
# Download Open Food Facts CSV (~7GB, but we only need ~50MB subset)
# Run the seed script (creates data/products.db)
python scripts/seed_products_db.py
```

---

## Model Resource Requirements (CPU)

| Model | RAM | Disk | First-load time |
|---|---|---|---|
| Whisper base | ~500MB | ~150MB | ~3s |
| CLIP ViT-B/32 | ~600MB | ~600MB | ~5s |
| spaCy en_core_web_sm | ~50MB | ~50MB | <1s |

**Recommended server:** 4GB RAM, 4 vCPU, 5GB disk minimum.
