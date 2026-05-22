import { Platform } from 'react-native';

// ── Server URL ─────────────────────────────────────────────────────────────
// Physical Android device on WiFi CANNOT use 'localhost' — that points to
// the phone itself. Must use your PC's local IP address.
// Set EXPO_PUBLIC_FASTAPI_URL in your .env file.
const FALLBACK_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
const BASE_URL = (process.env.EXPO_PUBLIC_FASTAPI_URL || FALLBACK_URL).replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 15000; // 15 seconds

// Wrap fetch with a timeout so the UI never hangs forever
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.\n` +
        `Make sure FastAPI is running with:\n  uvicorn main:app --host 0.0.0.0 --port 8000\n` +
        `And that EXPO_PUBLIC_FASTAPI_URL=${BASE_URL} is reachable from your phone.`
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const ML_API = {
  /**
   * Test connectivity to the FastAPI server.
   * Call this first to verify the connection before recording.
   */
  async ping(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Transcribe an audio file using Whisper STT.
   * @param audioUri Local file URI from expo-av
   * @param language Optional language code ('en' or 'hi')
   */
  async transcribeAudio(audioUri: string, language: string = 'en') {
    const formData = new FormData();
    const filename = audioUri.split('/').pop() || 'audio.m4a';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `audio/${match[1]}` : 'audio/m4a';

    // React Native's FormData accepts {uri, name, type} objects for files
    // @ts-ignore
    formData.append('audio', { uri: audioUri, name: filename, type });

    const response = await fetchWithTimeout(
      `${BASE_URL}/speech/transcribe?language=${language}`,
      {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type manually for multipart — the browser adds the boundary automatically
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Transcription failed (${response.status}): ${errText}`);
    }
    return response.json() as Promise<{ text: string; language: string; duration_seconds: number }>;
  },

  /**
   * Parse natural language text into structured product data.
   * @param text e.g. "Add 1kg Basmati Rice at 120 rupees"
   */
  async parseProduct(text: string) {
    const response = await fetchWithTimeout(`${BASE_URL}/nlp/parse-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NLP parsing failed (${response.status}): ${errText}`);
    }
    return response.json() as Promise<{
      name: string;
      unit: string | null;
      price: number | null;
      price_display: string | null;
      category: string | null;
      confidence: string;
    }>;
  },

  /**
   * Identify a product from a base64-encoded image using CLIP.
   * @param base64 Base64 image string (no data: prefix needed)
   */
  async identifyProductBase64(base64: string) {
    const response = await fetchWithTimeout(`${BASE_URL}/vision/identify-product-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: base64 }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Vision identification failed (${response.status}): ${errText}`);
    }
    return response.json() as Promise<{ name: string; category: string | null; confidence: number }>;
  },

  /**
   * Look up a product by barcode from the local SQLite database.
   * @param barcode Numeric barcode string (EAN-13 / UPC-A)
   */
  async lookupBarcode(barcode: string) {
    const response = await fetchWithTimeout(`${BASE_URL}/barcode/lookup/${barcode}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Barcode lookup failed (${response.status})`);
    }
    return response.json() as Promise<{
      barcode: string; name: string; brand: string | null;
      category: string | null; unit: string | null; image_url: string | null;
    }>;
  },
};
