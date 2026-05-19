/** Normalize disease / condition labels for map lookup (alphanumeric only, lowercased). */
export function normalizeDiseaseKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Env format: `diabetes:VIDEO_ID|asthma:OTHER_ID|heartdisease:THIRD`
 * Keys are matched loosely against user input (substring either way).
 */
export function parseDiseaseVideoMap(): Record<string, string> {
  const raw = process.env.NEXT_PUBLIC_DISEASE_VIDEO_MAP?.trim();
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const pair of raw.split("|")) {
    const idx = pair.indexOf(":");
    if (idx === -1) continue;
    const key = normalizeDiseaseKey(pair.slice(0, idx));
    const id = pair.slice(idx + 1).trim();
    if (!key || !/^[a-zA-Z0-9_-]{6,32}$/.test(id)) continue;
    out[key] = id;
  }
  return out;
}

export function findCuratedVideoId(input: string, map: Record<string, string>): string | null {
  const norm = normalizeDiseaseKey(input);
  if (!norm) return null;
  if (map[norm]) return map[norm];
  for (const [k, id] of Object.entries(map)) {
    if (norm.includes(k) || k.includes(norm)) return id;
  }
  return null;
}

/** Opens YouTube search results (no API key; user picks a video). */
export function diseaseYoutubeSearchUrl(input: string): string {
  const q = `${input.trim()} patient education health explained`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

import { classifySymptomSeverity } from "./triageSeverity";

/**
 * True when the user query suggests an acute / severe presentation that must not
 * be treated as “browse YouTube for education” — triggers emergency UI instead.
 * Uses the same severity engine as triage for consistency.
 */
export function detectAcuteSeriousCondition(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 3) return false;
  const { severity } = classifySymptomSeverity(s);
  return severity === "critical" || severity === "high";
}
