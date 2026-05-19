import type { PatientTriageContext, TriageResponse } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function normalizeFollowUp(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean).join("\n");
  return String(raw).trim();
}

function asStringArray(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function normalizeCareLevel(raw: unknown): TriageResponse["care_level"] {
  const s = String(raw || "").toLowerCase().replace(/\s+/g, "_");
  if (s.includes("emergency") || s === "er" || s === "emergency_room") return "emergency_room";
  if (s.includes("clinic") || s.includes("urgent") || s.includes("doctor")) return "clinic_visit";
  return "home_care";
}

function normalizeSeverity(raw: unknown): TriageResponse["severity"] {
  const s = String(raw || "").toLowerCase();
  if (s.includes("critical")) return "critical";
  if (s.includes("high")) return "high";
  if (s.includes("mod")) return "moderate";
  return "low";
}

function clampRisk(n: unknown): number {
  const v = typeof n === "number" ? n : parseFloat(String(n));
  if (Number.isNaN(v)) return 35;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function normalizeTriagePayload(data: unknown): TriageResponse {
  if (!data || typeof data !== "object") throw new Error("Invalid triage payload");
  const o = data as Record<string, unknown>;
  const ai = o.ai_message;
  if (typeof ai !== "string" || !ai.trim()) throw new Error("Missing ai_message");
  const follow = normalizeFollowUp(o.follow_up_question);
  const sid = typeof o.session_id === "string" && o.session_id ? o.session_id : "";
  const ts = typeof o.timestamp === "string" ? o.timestamp : new Date().toISOString();

  const is_emergency = Boolean(o.is_emergency === true || o.is_emergency === "true");

  return {
    session_id: sid,
    ai_message: ai.trim(),
    follow_up_question: follow,
    timestamp: ts,
    care_level: normalizeCareLevel(o.care_level),
    risk_score: clampRisk(o.risk_score),
    severity: normalizeSeverity(o.severity),
    is_emergency: is_emergency,
    nlp_symptoms: asStringArray(o.nlp_symptoms),
    nlp_entities_summary: typeof o.nlp_entities_summary === "string" ? o.nlp_entities_summary.trim() : "",
    red_flags: asStringArray(o.red_flags),
    care_recommendation_title:
      typeof o.care_recommendation_title === "string" && o.care_recommendation_title.trim()
        ? o.care_recommendation_title.trim()
        : "Follow guidance in the clinical summary",
    accessibility_note:
      typeof o.accessibility_note === "string" && o.accessibility_note.trim()
        ? o.accessibility_note.trim()
        : "For underserved areas: save this summary; connect when network allows for full AI review.",
    ai_confidence:
      o.ai_confidence != null && !Number.isNaN(Number(o.ai_confidence))
        ? Math.max(0, Math.min(100, Math.round(Number(o.ai_confidence))))
        : undefined,
    emergency_recommendation:
      typeof o.emergency_recommendation === "string" ? o.emergency_recommendation : null,
    hospital_recommendation:
      typeof o.hospital_recommendation === "string" ? o.hospital_recommendation : null,
  };
}

export interface TriageRequestPayload {
  message: string;
  sessionId?: string;
  patientContext?: PatientTriageContext;
}

export async function sendTriageMessage({
  message,
  sessionId,
  patientContext,
}: TriageRequestPayload): Promise<TriageResponse> {
  const res = await fetch(`${API_BASE}/api/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      patient_context: patientContext ?? null,
    }),
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Invalid JSON");
  }

  if (!res.ok) throw new Error("Connection Failure");

  return normalizeTriagePayload(data);
}
