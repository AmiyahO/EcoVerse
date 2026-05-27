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
  // "4800 L", "4800 litres", "4800 liters" — explicit litre unit (highest confidence)
  /(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:litres?|liters?|L\b)/gi,
  // "4.8 kL", "4.8 kl", "4800 kL" — kilolitres adjacent to number
  // Converted to litres: value × 1000
  /(\d{1,4}(?:[.,]\d{1,3})?)\s*k[Ll]\b/g,
  // "77 kilolitres", "4.8 kiloliters" — word form (e.g. "Total water used was 77 kilolitres")
  /(\d{1,4}(?:[.,]\d{1,3})?)\s*kilolitr(?:es?|ers?)/gi,
  // "m³" or "m3" cubic metres — convert to litres (1 m³ = 1000 L)
  /(\d{1,4}(?:[.,]\d{1,3})?)\s*m[³3]/gi,
  // "consumption: 4800", "used: 4800", "usage 4800" — keyword context
  /(?:consumption|used|usage|water|quantity|volume|amount)[:\s]+(\d{1,6}(?:[.,]\d{1,2})?)/gi,
  // Standalone 2-6 digit numbers — catches bare table values like "77" (kL) or "4800" (L).
  // Lower bound 10 so small kL readings (e.g. 77 kL = 77,000 L) aren't filtered out
  // before the kL multiplier can be applied. Range check happens after conversion.
  /\b(\d{2,6})\b/g,
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

      // Unit conversions: m³ → L (×1000), kL → L (×1000), kilolitres → L (×1000)
      const rawLower = raw.toLowerCase();
      const needsX1000 = type === 'water' && (
        rawLower.includes('m³') || rawLower.includes('m3') ||
        /\d\s*kl\b/i.test(raw) ||
        rawLower.includes('kilolitr')
      );
      const finalValue = needsX1000 ? value * 1000 : value;

      // Range validation — applied AFTER conversion so 77 kL → 77,000 L passes
      const validRange = type === 'electricity'
        ? finalValue >= 10 && finalValue <= 99999
        : finalValue >= 200 && finalValue <= 999999;

      if (!validRange) continue;
      if (seen.has(finalValue)) continue;
      seen.add(finalValue);

      // Confidence based on which pattern matched:
      // 0 = explicit L (high), 1 = kL adjacent (high), 2 = kilolitres word (high),
      // 3 = m³ (medium), 4 = keyword context (medium), 5 = standalone (low)
      const confidence: OCRCandidate['confidence'] =
        patternIndex <= 2 ? 'high' :
        patternIndex <= 4 ? 'medium' : 'low';

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