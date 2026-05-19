/**
 * Offline heuristic triage (NLP-lite + risk scoring) when the API is unavailable.
 * Severity classification: frontend/src/lib/triageSeverity.ts
 */

import type { CareLevel, PatientTriageContext, SeverityBand, TriageResponse } from "./types";
import {
  classifySymptomSeverity,
  shouldActivateEmergencyAlert,
  type SeverityAssessment,
} from "./triageSeverity";

function extractSymptomTokens(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const stop = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "i", "my", "me", "is", "am", "are", "was", "been", "have", "has", "it", "this", "that", "very", "some", "any",
  ]);
  const words = cleaned.split(/\s+/).filter((w) => w.length > 3 && !stop.has(w));
  return [...new Set(words)].slice(0, 12);
}

function assessMentalHealthScreen(text: string): {
  care_level: CareLevel;
  severity: SeverityBand;
  risk_score: number;
  is_emergency: boolean;
  red_flags: string[];
} | null {
  if (!/\[mental_health_screen\]/i.test(text)) return null;

  const crisisMatch = /crisis\s*flag:\s*true/i.test(text);
  const m = text.match(/interest=(\d+),\s*mood=(\d+),\s*anxiety=(\d+),\s*worry=(\d+)/i);
  const scores = m ? [1, 2, 3, 4].map((i) => parseInt(m[i]!, 10)) : [0, 0, 0, 0];
  const total = scores.reduce((a, b) => a + b, 0);

  if (crisisMatch) {
    return {
      care_level: "emergency_room",
      severity: "critical",
      risk_score: 92,
      is_emergency: true,
      red_flags: [
        "Mental health crisis flag reported — seek immediate professional or emergency support.",
      ],
    };
  }
  if (total >= 10) {
    return {
      care_level: "clinic_visit",
      severity: "high",
      risk_score: 68,
      is_emergency: false,
      red_flags: ["Elevated mental health screen scores — prompt clinical follow-up recommended"],
    };
  }
  if (total >= 6) {
    return {
      care_level: "clinic_visit",
      severity: "moderate",
      risk_score: 54,
      is_emergency: false,
      red_flags: [],
    };
  }
  if (total >= 4) {
    return {
      care_level: "clinic_visit",
      severity: "moderate",
      risk_score: 28 + total * 2,
      is_emergency: false,
      red_flags: [],
    };
  }
  return {
    care_level: "home_care",
    severity: "low",
    risk_score: 28 + total * 2,
    is_emergency: false,
    red_flags: [],
  };
}

function applyMildSymptomHeuristics(
  lower: string,
  base: SeverityAssessment
): Pick<SeverityAssessment, "care_level" | "severity" | "risk_score"> {
  if (base.severity !== "low") return base;

  if (lower.includes("pain") || lower.includes("hurt") || lower.includes("ache")) {
    return { care_level: "clinic_visit", severity: "moderate", risk_score: 48 };
  }
  if (lower.includes("cough") || lower.includes("cold") || lower.includes("mild")) {
    return { care_level: "home_care", severity: "low", risk_score: 28 };
  }
  if (lower.includes("fever") && lower.includes("days")) {
    return { care_level: "clinic_visit", severity: "moderate", risk_score: 58 };
  }
  return base;
}

export function runLocalTriage(
  message: string,
  ctx: PatientTriageContext | undefined,
  sessionId: string
): TriageResponse {
  const text = message.trim();
  const lower = text.toLowerCase();
  const nlp_symptoms = extractSymptomTokens(text);
  const lang = ctx?.language || "en";

  let care_level: CareLevel = "home_care";
  let severity: SeverityBand = "low";
  let risk_score = 22;
  let is_emergency = false;
  let red_flags: string[] = [];
  let confidence_score = 55;
  let emergency_recommendation: string | null = null;
  let hospital_recommendation: string | null = null;

  const mh = assessMentalHealthScreen(text);
  if (mh) {
    care_level = mh.care_level;
    severity = mh.severity;
    risk_score = mh.risk_score;
    is_emergency = mh.is_emergency;
    red_flags = mh.red_flags;
    confidence_score = mh.is_emergency ? 88 : 75;
  } else {
    const assessed = classifySymptomSeverity(text, ctx);
    const mild = applyMildSymptomHeuristics(lower, assessed);
    care_level = mild.care_level;
    severity = mild.severity;
    risk_score = mild.risk_score;
    is_emergency = shouldActivateEmergencyAlert(assessed);
    red_flags = assessed.red_flags;
    confidence_score = assessed.confidence_score;
    emergency_recommendation = assessed.emergency_recommendation;
    hospital_recommendation = assessed.hospital_recommendation;

    if (severity === "low" && !assessed.matched_groups.length) {
      is_emergency = false;
    } else if (assessed.severity === "critical") {
      is_emergency = true;
      care_level = "emergency_room";
      severity = "critical";
      risk_score = Math.max(risk_score, assessed.risk_score);
    }
  }

  if (ctx?.age_band === "senior" && care_level === "home_care" && risk_score < 40) {
    risk_score = Math.min(55, risk_score + 12);
  }

  const L = {
    en: {
      erFlag: "High-acuity pattern detected — seek emergency care if symptoms are current",
      titleEr: "Emergency department — immediate in-person evaluation",
      titleClinicUrgent: "Urgent clinic / hospital — same-day evaluation",
      titleClinic: "Clinic or primary care — schedule evaluation",
      titleHome: "Home care — self-management & monitoring",
      aiEr: `Triage (offline engine): Possible emergency pattern from your description. {title}. {extra} This is not a diagnosis—if you are in danger, call 108 or your local emergency number now.`,
      aiHigh: `Triage (offline engine): Your symptoms suggest urgent medical attention. {title}. {extra} Seek in-person care today if symptoms are ongoing.`,
      aiClinic: `Triage (offline engine): Your symptoms may warrant a clinician visit soon. {title}. Bring medications list and symptom timeline.`,
      aiHome: `Triage (offline engine): Pattern suggests self-care with monitoring may be reasonable. {title}. Seek care if symptoms worsen or new red flags appear.`,
      followEr: "Are these symptoms happening right now? If yes, call 108 / emergency services immediately. If not, when did they begin?",
      followHigh: "Are symptoms worsening in the last hour? Any difficulty breathing, chest pain, or confusion?",
      followOther: "Can you share onset timing, severity 1–10, and any chronic conditions or medications?",
      access:
        "Designed for low-bandwidth and rural use: this offline pass runs entirely in your browser when the cloud triage link is down—connect when possible for fuller NLP analysis.",
      nlpEmpty: "No structured tokens extracted",
      conf: "Rule-engine confidence",
    },
    hi: {
      erFlag: "उच्च-गंभीरता संकेत — लक्षण वर्तमान हों तो तुरंत आपात देखभाल",
      titleEr: "आपात कक्ष — तुरंत व्यक्तिगत मूल्यांकन",
      titleClinicUrgent: "तत्काल क्लिनिक / अस्पताल — आज ही मूल्यांकन",
      titleClinic: "क्लिनिक / प्राथमिक देखभाल — जल्द मुलाकात",
      titleHome: "घर पर देखभाल — निगरानी और स्व-प्रबंधन",
      aiEr: `ट्राइज (ऑफ़लाइन): आपात संभावना। {title}. {extra} निदान नहीं—खतरे में 108 या आपात नंबर।`,
      aiHigh: `ट्राइज (ऑफ़लाइन): तत्काल चिकित्सा आवश्यक। {title}. {extra} लक्षण जारी हों तो आज ही देखभाल।`,
      aiClinic: `ट्राइज (ऑफ़लाइन): चिकित्सक मुलाकात जल्द उपयुक्त। {title}. दवाएँ और समय लाएँ।`,
      aiHome: `ट्राइज (ऑफ़लाइन): घर पर देखभाल संभव। {title}. बिगड़ने पर सहायता लें।`,
      followEr: "क्या ये लक्षण अभी हैं? हाँ तो तुरंत 108 / आपात सेवा।",
      followHigh: "पिछले एक घंटे में बिगड़ रहे हैं? साँस, छाती, भ्रम?",
      followOther: "शुरुआत, गंभीरता 1–10, दीर्घ रोग/दवाएँ बताएँ।",
      access: "कम बैंडविड्थ: ब्राउज़र में ऑफ़लाइन ट्राइज।",
      nlpEmpty: "संरचित टोकन नहीं मिले",
      conf: "नियम इंजन विश्वास",
    },
    kn: {
      erFlag: "ಉನ್ನತ ತೀವ್ರತೆ — ಲಕ್ಷಣಗಳಿದ್ದರೆ ತಕ್ಷಣ ತುರ್ತು ಆರೈಕೆ",
      titleEr: "ತುರ್ತು ಕೊಠಡಿ — ತಕ್ಷಣ ಮೌಲ್ಯಮಾಪನ",
      titleClinicUrgent: "ತುರ್ತು ಕ್ಲಿನಿಕ್ / ಆಸ್ಪತ್ರೆ — ಇಂದೇ ಮೌಲ್ಯಮಾಪನ",
      titleClinic: "ಕ್ಲಿನಿಕ್ / ಪ್ರಾಥಮಿಕ ಆರೈಕೆ — ಶೀಘ್ರ ಭೇಟಿ",
      titleHome: "ಮನೆ ಆರೈಕೆ — ಮೇಲ್ವಿಚಾರಣೆ",
      aiEr: `ಟ್ರೈಜ್ (ಆಫ್‌ಲೈನ್): ತುರ್ತು ಸಾಧ್ಯತೆ. {title}. {extra} ರೋಗನಿರ್ಣಯ ಅಲ್ಲ—108 ಅಥವಾ ತುರ್ತು ಸಂಖ್ಯೆ.`,
      aiHigh: `ಟ್ರೈಜ್ (ಆಫ್‌ಲೈನ್): ತುರ್ತು ವೈದ್ಯಕೀಯ ಗಮನ. {title}. {extra} ಇಂದೇ ಆರೈಕೆ.`,
      aiClinic: `ಟ್ರೈಜ್: ವೈದ್ಯರ ಭೇಟಿ ಶಿಫಾರಸು. {title}. ಔಷಧಿ ಪಟ್ಟಿ ತನ್ನಿ.`,
      aiHome: `ಟ್ರೈಜ್: ಮನೆ ಆರೈಕೆ ಸಾಧ್ಯ. {title}. ಹದಗೆಡಿದರೆ ಸಹಾಯ.`,
      followEr: "ಈಗಲೇ ಲಕ್ಷಣಗಳೇ? ಹೌದು 108 / ತುರ್ತು ಸೇವೆ.",
      followHigh: "ಕಳೆದ ಒಂದು ಗಂಟೆಯಲ್ಲಿ ಹದಗೆಡಿದಿದೆಯೇ? ಉಸಿರಾಟ, ಎದೆ ನೋವು?",
      followOther: "ಪ್ರಾರಂಭ, ತೀವ್ರತೆ 1–10, ದೀರ್ಘಕಾಲಿಕ/ಔಷಧಿ.",
      access: "ಕಡಿಮೆ ಬ್ಯಾಂಡ್‌ವಿಡ್ತ್: ಆಫ್‌ಲೈನ್ ಟ್ರೈಜ್.",
      nlpEmpty: "ವಿನ್ಯಾಸಗೊಳಿಸಿದ ಟೋಕನ್‌ಗಳಿಲ್ಲ",
      conf: "ನಿಯಮ ಎಂಜಿನ್ ವಿಶ್ವಾಸ",
    },
  };

  const bundle = L[lang === "hi" || lang === "kn" ? lang : "en"];

  if (is_emergency && !red_flags.some((f) => f.includes(bundle.erFlag.slice(0, 12)))) {
    red_flags.unshift(bundle.erFlag);
  }

  const careTitle =
    care_level === "emergency_room"
      ? bundle.titleEr
      : care_level === "clinic_visit" && severity === "high"
        ? bundle.titleClinicUrgent
        : care_level === "clinic_visit"
          ? bundle.titleClinic
          : bundle.titleHome;

  const extra =
    emergency_recommendation || hospital_recommendation
      ? (emergency_recommendation || hospital_recommendation)!
      : "";

  const ai_message =
    care_level === "emergency_room"
      ? bundle.aiEr.replace("{title}", careTitle).replace("{extra}", extra)
      : severity === "high"
        ? bundle.aiHigh.replace("{title}", careTitle).replace("{extra}", extra)
        : care_level === "clinic_visit"
          ? bundle.aiClinic.replace("{title}", careTitle).replace("{extra}", "")
          : bundle.aiHome.replace("{title}", careTitle).replace("{extra}", "");

  const follow =
    care_level === "emergency_room"
      ? bundle.followEr
      : severity === "high"
        ? bundle.followHigh
        : bundle.followOther;

  const nlp_entities_summary = nlp_symptoms.length
    ? (lang === "hi" ? "टोकन: " : lang === "kn" ? "ಟೋಕನ್‌ಗಳು: " : "Tokens: ") +
      nlp_symptoms.slice(0, 6).join(", ") +
      ` · ${bundle.conf} ${confidence_score}%`
    : bundle.nlpEmpty;

  return {
    session_id: sessionId,
    ai_message,
    follow_up_question: follow,
    timestamp: new Date().toISOString(),
    care_level,
    risk_score,
    severity,
    is_emergency,
    nlp_symptoms,
    nlp_entities_summary,
    red_flags,
    care_recommendation_title: careTitle,
    accessibility_note: bundle.access,
    ai_confidence: confidence_score,
    emergency_recommendation,
    hospital_recommendation,
  };
}
