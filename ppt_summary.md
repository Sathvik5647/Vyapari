# 📊 Local Store App — PPT Summary
> **Use this with Claude (or any AI) to create a PowerPoint presentation.**

---

## 🎯 Slide 1: Title Slide

**Title:** Local Store — Connecting You to Your Neighborhood
**Subtitle:** A hyperlocal discovery and vendor management app powered by on-device AI
**Tagline:** "Your local bazaar, digitized."

---

## 🧩 Slide 2: Problem Statement

**Headline:** India's Local Vendors Are Invisible Online

- 🛒 90%+ of India's retail is unorganized / local
- Buyers don't know what's available nearby without physically going
- Vendors have no digital presence, no footfall tracking, no billing tools
- No existing app targets **hyperlocal item-level discovery** (not just Google Maps pins)

---

## 💡 Slide 3: Our Solution

**Headline:** Local Store — A Two-Sided Platform

| For Buyers | For Vendors |
|---|---|
| Discover nearby stores on a live map | Register your store in minutes |
| Filter by category (Grocery, Pharmacy, etc.) | List products with prices & stock status |
| Search by text or **voice** | Add products via **camera / barcode / voice** |
| Get in-app walking/driving directions | Generate and send **bills** to customers |
| See real-time stock availability | View footfall analytics |

---

## 🗺️ Slide 4: App Flow — Buyer Journey

```
Open App
  ↓
Map loads → Stores shown as markers
  ↓
Search / Filter by category (or speak search query 🎙️)
  → Audio sent to FastAPI → Whisper transcribes → text populates search
  ↓
Tap a store marker
  ↓
See store card: name, rating, category
  ↓
"View More" → store detail (product list)
  ↓
Get Directions / Call store
```

---

## 🏪 Slide 5: App Flow — Vendor Journey

```
Register / Login (Supabase Auth)
  ↓
Onboarding: Store name, category, location
  ↓
Vendor Dashboard
  ↓
Add Products:
  - Type manually
  - Scan barcode 📸 → FastAPI looks up local product DB
  - Take a photo 📷 → FastAPI runs CLIP/BLIP → identifies product
  - Speak product details 🎙️ → Whisper transcribes → spaCy extracts entities
  ↓
Toggle stock status (In Stock / Out of Stock)
  ↓
Create Bill → Print 🖨️ or Send via WhatsApp 📤
```

---

## 🛠️ Slide 6: Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Mobile App** | React Native + Expo | Cross-platform (Android + iOS) |
| **Language** | TypeScript | Type safety |
| **Database / Auth** | Supabase | Postgres + Auth + Storage + Realtime |
| **Maps** | React Native Maps + Google Maps API | Live map, directions |
| **ML Backend** | FastAPI (Python) | Serves all AI/ML inference |
| **Speech Recognition** | OpenAI Whisper (`faster-whisper`) | Open-source, self-hosted, multilingual |
| **NLP / Entity Extraction** | spaCy NER pipeline | Extracts product name, price, unit from speech |
| **Computer Vision** | CLIP / BLIP-2 (HuggingFace) | Zero-shot product recognition from images |
| **Barcode Lookup** | ZXing (expo-camera) + Local Product DB | Offline-capable barcode resolution |
| **Bill / PDF** | `expo-print` + HTML template | Print or share bills |

---

## 🤖 Slide 7: AI-Powered Features (Phase 2)

### 🎙️ Voice Search (Buyer)
- Buyer taps mic icon → records audio in-app
- Audio sent to **FastAPI `/transcribe`** endpoint
- **Whisper** (open-source, self-hosted) converts speech → text
- Text populates search bar → filters stores and products
- Supports **English + Hindi** natively

### 🎙️ Voice Product Listing (Vendor)
- Vendor says "Add 1kg Basmati Rice, ₹120"
- Whisper transcribes → **FastAPI `/parse-product`**
- **spaCy NER pipeline** extracts: `{ name: "Basmati Rice", unit: "1kg", price: 120 }`
- Auto-fills the product form — vendor reviews, confirms, saved to Supabase

### 📸 CV Product Listing (Vendor)
- **Mode 1 — Barcode:** Expo camera scans barcode → FastAPI looks up local product database
- **Mode 2 — Photo:** Vendor captures image → FastAPI runs **CLIP** (zero-shot) or **BLIP-2** (captioning) → returns product name + category
- One-tap confirm → added to inventory

### 🧾 Bill Generation
- Vendor selects items + quantities from their inventory
- App generates a **styled PDF bill** (client-side, no server needed)
- Vendor **prints** via phone's native print dialog OR **shares via WhatsApp**

---

## 🏗️ Slide 8: System Architecture

```
┌──────────────────────────────────────┐
│       React Native App (Expo)        │
│  Buyer Screen │ Vendor Dashboard     │
└──────────┬───────────────┬───────────┘
           │               │
           ▼               ▼
   ┌───────────────┐  ┌──────────────────────────┐
   │   Supabase    │  │     FastAPI (Python)      │
   │               │  │   ML Inference Server     │
   │  - Postgres   │  │                          │
   │  - Auth       │  │  /transcribe  → Whisper   │
   │  - Storage    │  │  /parse-product → spaCy   │
   │  (bills PDF)  │  │  /identify-product → CLIP │
   └───────────────┘  │  /barcode-lookup → LocalDB│
                      └──────────────────────────┘
```

**Key Design Principle:** FastAPI handles **ML only** — Supabase handles **data + auth**.  
All models are **pre-trained open-source** — zero API costs, runs on your own server.

---

## 🧠 Slide 9: Open-Source Models Used

| Feature | Model | Source | Size |
|---|---|---|---|
| Speech → Text | **Whisper base/small** | OpenAI (HuggingFace) | ~150MB / 460MB |
| Text → Product JSON | **spaCy NER pipeline** | spaCy / custom | ~15MB |
| Image → Product Name | **CLIP ViT-B/32** | OpenAI (HuggingFace) | ~340MB |
| Image Captioning | **BLIP-2** (alt) | Salesforce (HuggingFace) | ~3GB |
| Barcode Lookup | **Local DB** (Open Food Facts dump) | openfoodfacts.org | ~500MB |

> All models run **locally on the FastAPI server** — no paid API calls, no data leaves your infrastructure.

---

## 📐 Slide 10: Database Schema

```
┌─────────────┐        ┌─────────────┐
│   stores    │──1:N──▶│  products   │
│─────────────│        │─────────────│
│ id          │        │ id          │
│ vendor_id   │        │ store_id    │
│ name        │        │ name        │
│ category    │        │ price       │
│ latitude    │        │ unit        │
│ longitude   │        │ is_in_stock │
│ phone       │        └─────────────┘
│ rating      │
└─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│    bills    │  ← Phase 2 addition
│─────────────│
│ id          │
│ store_id    │
│ customer    │
│ items (JSON)│
│ total       │
│ pdf_url     │
│ created_at  │
└─────────────┘
```

---

## 📅 Slide 11: Roadmap

| Phase | Features | Status |
|---|---|---|
| **Phase 1** | Map discovery, store markers, directions, vendor dashboard, auth, product listing | ✅ Done |
| **Phase 2** | FastAPI ML server, Voice search, Voice listing, Barcode CV, Image CV (CLIP), Bill generation + send | 🔜 Building |
| **Phase 3** | Footfall analytics, paid visibility boost, GNN-based recommendations, review system | 🔮 Future |

---

## 🌟 Slide 12: Why This Matters

- **$800B+** Indian retail market — 90% unorganized
- Local vendors lose customers to e-commerce every day
- This app gives vendors a **digital storefront in minutes**
- AI features reduce friction — no typing, no separate software
- **All AI is self-hosted** — no recurring API costs, full data privacy
- Bill generation replaces paper chits — first step toward digital accounting
- Buyer gets **real-time local inventory** — not stale web listings

---

## 🧑‍💻 Slide 13: Team / Demo

*(Add your team details, demo screenshots, or QR code to the app here)*

---

## 📌 Prompt for Claude (PPT Generation)

> Use the following to ask Claude to make the PPT:

```
I'm building a hyperlocal vendor discovery app called "Local Store" — a React Native (Expo) app
with Supabase as the database and a FastAPI Python backend for all AI/ML features using
open-source pre-trained models (Whisper for speech, CLIP for vision, spaCy for NLP).

Please create a polished PowerPoint presentation based on the following structured content.
Make it visually rich — use icons, colored section headers, a clean dark/modern theme.
The audience is a college/startup demo panel. Include the architecture diagram on Slide 8.

Here is the full content:

[Paste the content of this file below]
```
