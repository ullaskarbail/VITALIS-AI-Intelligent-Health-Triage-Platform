export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export type CareLevel = "home_care" | "clinic_visit" | "emergency_room";
export type SeverityBand = "low" | "moderate" | "high" | "critical";

/** Optional structured context for multi-turn / history-aware triage */
export interface PatientTriageContext {
  age_band?: "child" | "adult" | "senior";
  chronic_conditions?: string;
  allergies?: string;
  medications?: string;
  language?: "en" | "hi" | "kn";
}

export interface TriageResponse {
  session_id: string;
  ai_message: string;
  follow_up_question: string;
  timestamp: string;
  care_level: CareLevel;
  risk_score: number;
  severity: SeverityBand;
  is_emergency: boolean;
  nlp_symptoms: string[];
  nlp_entities_summary: string;
  red_flags: string[];
  care_recommendation_title: string;
  accessibility_note: string;
  /** Rule-engine or model confidence 0–100 (when provided). */
  ai_confidence?: number;
  emergency_recommendation?: string | null;
  hospital_recommendation?: string | null;
}
