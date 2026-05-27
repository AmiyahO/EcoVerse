// src/services/billOCR.ts
// On-device OCR using Google ML Kit. No API calls, no cost, works offline.
// Extracts likely meter readings from a bill photo.

import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as ImagePicker from 'expo-image-picker';

export interface OCRCandidate {
  value: number;
  raw: string;       // original text fragment e.g. "320.5 kWh"
  confidence: 'high' | 'medium' | 'low';
}

export type OCRResult =
  | { status: 'success'; candidates: OCRCandidate[] }
  | { status: 'no_candidates'; allText: string }
  | { status: 'cancelled' }
  | { status: 'permission_denied' }
  | { status: 'error'; message: string };

// Patterns that indicate a number is likely a meter/usage reading
// Order matters — more specific patterns first
const ELECTRICITY_PATTERNS = [
  // "320 kWh", "320.5kWh", "320 KWH"
  /(\d{1,5}(?:[.,]\d{1,3})?)\s*k[Ww][Hh]/g,
  // "consumption: 320", "used: 320", "usage 320"
  /(?:consumption|used|usage|units)[:\s]+(\d{2,5}(?:[.,]\d{1,2})?)/gi,
  // Standalone 3-5 digit numbers that look like kWh readings (50-9999 range)
  /\b(\d{3,4})\b/g,
];

const WATER_PATTERNS = [
  // "4800 L", "4800 litres", "4800 liters" — explicit unit (highest confidence)
  /(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:litres?|liters?|L\b)/gi,
  // "m³" or "m3" cubic metres — convert to litres (1 m³ = 1000 L)
  /(\d{1,4}(?:[.,]\d{1,3})?)\s*m[³3]/gi,
  // "consumption: 4800", "used: 4800", "usage 4800" — keyword context
  /(?:consumption|used|usage|water|quantity|volume|amount)[:\s]+(\d{2,6}(?:[.,]\d{1,2})?)/gi,
  // Standalone 3-6 digit numbers — most water bills just print the number
  // Range: 200–999999 L (loosened lower bound from 4-digit to 3-digit; a
  // household might save only a few hundred litres in a low-use month)
  /\b(\d{3,6})\b/g,
];

function parseNumber(raw: string): number {
  // Handle European comma decimals e.g. "320,5"
  return parseFloat(raw.replace(',', '.'));
}

function extractCandidates(
  text: string,
  type: 'electricity' | 'water',
): OCRCandidate[] {
  const patterns = type === 'electricity' ? ELECTRICITY_PATTERNS : WATER_PATTERNS;
  const seen = new Set<number>();
  const candidates: OCRCandidate[] = [];

  patterns.forEach((pattern, patternIndex) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[0];
      const numStr = match[1];
      const value = parseNumber(numStr);

      if (isNaN(value) || seen.has(value)) continue;

      // Range validation — keeps out obvious non-readings
      const validRange = type === 'electricity'
        ? value >= 10 && value <= 99999
        : value >= 200 && value <= 999999;

      if (!validRange) continue;

      // m³ → litres conversion
      const finalValue = (type === 'water' && raw.includes('m')) ? value * 1000 : value;
      if (seen.has(finalValue)) continue;
      seen.add(finalValue);

      // Confidence based on which pattern matched
      const confidence: OCRCandidate['confidence'] =
        patternIndex === 0 ? 'high' :
        patternIndex === 1 ? 'medium' : 'low';

      candidates.push({ value: finalValue, raw, confidence });
    }
  });

  // Sort: high confidence first, then by value descending (larger readings more likely to be totals)
  const order = { high: 0, medium: 1, low: 2 };
  candidates.sort((a, b) =>
    order[a.confidence] - order[b.confidence] || b.value - a.value
  );

  // Return top 5 candidates max
  return candidates.slice(0, 5);
}

export async function scanBillFromCamera(
  type: 'electricity' | 'water',
): Promise<OCRResult> {
  // Request camera permission
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return { status: 'permission_denied' };
  }

  // Launch camera
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.9,      // high quality for better OCR accuracy
    allowsEditing: true,
    aspect: [4, 3],
  });

  if (result.canceled) {
    return { status: 'cancelled' };
  }

  const imageUri = result.assets[0].uri;

  try {
    // Run ML Kit on-device OCR
    const recognized = await TextRecognition.recognize(imageUri);
    const fullText = recognized.text ?? '';

    if (!fullText.trim()) {
      return { status: 'no_candidates', allText: '' };
    }

    const candidates = extractCandidates(fullText, type);

    if (candidates.length === 0) {
      return { status: 'no_candidates', allText: fullText };
    }

    return { status: 'success', candidates };
  } catch (e: any) {
    console.error('OCR error:', e);
    return { status: 'error', message: e?.message ?? 'Unknown error' };
  }
}