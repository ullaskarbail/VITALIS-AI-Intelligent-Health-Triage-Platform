/**
 * Scalable symptom-group severity classifier for offline / rule-based triage.
 * Add new groups by appending to SYMPTOM_GROUPS — no engine rewrite required.
 */

import type { CareLevel, PatientTriageContext, SeverityBand } from "./types";

export type SymptomTier = "critical" | "high" | "moderate";

export interface SymptomGroup {
  id: string;
  tier: SymptomTier;
  /** Human-readable red-flag line when this group matches */
  redFlag: string;
  patterns: RegExp[];
}

export interface SeverityAssessment {
  severity: SeverityBand;
  care_level: CareLevel;
  risk_score: number;
  is_emergency: boolean;
  matched_groups: string[];
  red_flags: string[];
  confidence_score: number;
  emergency_recommendation: string | null;
  hospital_recommendation: string | null;
}

/** Ordered for documentation; matching uses tier priority, not array order. */
export const SYMPTOM_GROUPS: SymptomGroup[] = [
  // —— CRITICAL (emergency room + emergency UI) ——
  {
    id: "respiratory_critical",
    tier: "critical",
    redFlag: "Severe breathing difficulty or respiratory distress — call 108 / emergency services if active now",
    patterns: [
      /\b(can'?t|cannot)\s+breathe\b/i,
      /\b(unable|difficult)\s+to\s+breathe\b/i,
      /\bstruggling\s+to\s+breathe\b/i,
      /\bshortness\s+of\s+breath\b/i,
      /\bshort\s+of\s+breath\b/i,
      /\bbreathing\s+difficult/i,
      /\bsevere\s+dyspnea\b/i,
      /\bgasping\s+for\s+(air|breath)\b/i,
      /\bchoking\b/i,
      /\bnot\s+breathing\b/i,
      /\bstopped\s+breathing\b/i,
      /\blow\s+oxygen\b/i,
      /\boxygen\s+(level\s+)?(drop|low|sat)/i,
      /\bspo2\s*(below|<)\s*\d{2}\b/i,
      /\bsats?\s+(in\s+)?(the\s+)?(70|6\d|5\d)\b/i,
      /\bcyanosis\b/i,
      /\bblue\s+lips\b/i,
      /\blips\s+turning\s+blue\b/i,
      /\bsevere\s+asthma\s+attack\b/i,
      /\basthma\s+attack\b/i,
      /\bstatus\s+asthmaticus\b/i,
    ],
  },
  {
    id: "cardiac_critical",
    tier: "critical",
    redFlag: "Possible cardiac emergency — seek immediate emergency care",
    patterns: [
      /\bchest\s+pain\b/i,
      /\bheart\s+attack\b/i,
      /\bcrushing\s+chest\b/i,
      /\bpain\s+radiating\s+to\s+(arm|jaw)\b/i,
      /\bsevere\s+chest\s+pressure\b/i,
    ],
  },
  {
    id: "neuro_critical",
    tier: "critical",
    redFlag: "Possible stroke, seizure, or altered consciousness — emergency evaluation needed",
    patterns: [
      /\bstroke\b/i,
      /\bface\s+drooping\b/i,
      /\bslurred\s+speech\b/i,
      /\bone\s+side\s+(weak|numb|paraly)/i,
      /\bsudden\s+weakness\b/i,
      /\bparalysis\b/i,
      /\bcan'?t\s+move\s+(my\s+)?(arm|leg|limb)\b/i,
      /\bseizure\b/i,
      /\bconvuls/i,
      /\bfitting\b/i,
      /\bunconscious\b/i,
      /\bunresponsive\b/i,
      /\bpassed\s+out\s+and\s+(won'?t|not)\s+wake\b/i,
      /\bnot\s+waking\s+up\b/i,
      /\bsudden\s+confusion\b/i,
      /\bworst\s+headache\b/i,
    ],
  },
  {
    id: "metabolic_critical",
    tier: "critical",
    redFlag: "Possible diabetic or metabolic emergency — urgent hospital care",
    patterns: [
      /\bdiabetic\s+(emergency|coma|ketoacidosis)\b/i,
      /\bdka\b/i,
      /\bketoacidosis\b/i,
      /\bvery\s+high\s+blood\s+sugar\b/i,
      /\bblood\s+sugar\s+(over|above|>\s*)\s*(300|400|500)\b/i,
      /\bglucose\s+(over|above|>\s*)\s*(300|400|500)\b/i,
      /\bsevere\s+hypoglyc/i,
      /\blow\s+blood\s+sugar\s+.*\b(unconscious|seizure|confus)/i,
      /\bsugar\s+level\s+very\s+high\b/i,
    ],
  },
  {
    id: "bleeding_critical",
    tier: "critical",
    redFlag: "Heavy or uncontrolled bleeding — emergency care",
    patterns: [
      /\bsevere\s+bleeding\b/i,
      /\bheavy\s+bleeding\b/i,
      /\buncontrolled\s+bleeding\b/i,
      /\bbleeding\s+won'?t\s+stop\b/i,
      /\bspurting\s+blood\b/i,
    ],
  },
  {
    id: "allergy_critical",
    tier: "critical",
    redFlag: "Possible anaphylaxis — use epinephrine if prescribed and call emergency services",
    patterns: [
      /\banaphylaxis\b/i,
      /\banaphylactic\b/i,
      /\bthroat\s+(swelling|closing)\b/i,
      /\btongue\s+swelling\b/i,
      /\bsevere\s+allergic\s+reaction\b/i,
    ],
  },
  {
    id: "mental_critical",
    tier: "critical",
    redFlag: "Mental health emergency — seek immediate crisis support or emergency services",
    patterns: [
      /\bsuicid/i,
      /\bkill\s+myself\b/i,
      /\bwant\s+to\s+die\b/i,
      /\bend\s+my\s+life\b/i,
      /\bself[\s-]?harm\b/i,
      /\bhurt\s+myself\b/i,
    ],
  },
  {
    id: "toxic_critical",
    tier: "critical",
    redFlag: "Possible poisoning or overdose — emergency department",
    patterns: [/\boverdose\b/i, /\bpoison/i, /\btook\s+too\s+many\s+pills\b/i],
  },

  // —— HIGH (urgent clinic / hospital soon) ——
  {
    id: "respiratory_high",
    tier: "high",
    redFlag: "Significant breathing symptoms — urgent medical assessment today",
    patterns: [
      /\bwheez/i,
      /\busing\s+inhaler\s+(constantly|repeatedly)\b/i,
      /\bbreathless\b/i,
      /\blabou?red\s+breathing\b/i,
      /\brapid\s+breathing\b/i,
      /\bfast\s+breathing\b/i,
    ],
  },
  {
    id: "fever_high",
    tier: "high",
    redFlag: "High or severe fever — seek prompt in-person evaluation",
    patterns: [
      /\bsevere\s+fever\b/i,
      /\bhigh\s+fever\b/i,
      /\b104\s*°?\s*f\b/i,
      /\b40\.?\s*°?\s*c\b/i,
      /\bvery\s+high\s+temperature\b/i,
      /\bfever\s+not\s+(coming\s+)?down\b/i,
      /\bfebrile\s+seizure\b/i,
    ],
  },
  {
    id: "infection_high",
    tier: "high",
    redFlag: "Possible serious infection — urgent clinical review",
    patterns: [
      /\bsepsis\b/i,
      /\bsevere\s+infection\b/i,
      /\bspreading\s+redness\b/i,
      /\bcellulitis\b/i,
      /\bmeningitis\b/i,
      /\bstiff\s+neck\s+.*\bfever\b/i,
    ],
  },
  {
    id: "dehydration_high",
    tier: "high",
    redFlag: "Severe dehydration signs — may need IV fluids in hospital",
    patterns: [
      /\bsevere\s+dehydrat/i,
      /\bno\s+urine\b/i,
      /\bnot\s+urinating\b/i,
      /\bdry\s+mouth\s+.*\bdizzy\b/i,
      /\bcannot\s+keep\s+fluids\s+down\b/i,
    ],
  },
  {
    id: "syncope_high",
    tier: "high",
    redFlag: "Fainting or collapse — needs same-day medical assessment",
    patterns: [
      /\bfainted\b/i,
      /\bfainting\b/i,
      /\bpassed\s+out\b/i,
      /\bcollapsed\b/i,
      /\bsyncope\b/i,
      /\blost\s+consciousness\b/i,
    ],
  },
  {
    id: "bleeding_high",
    tier: "high",
    redFlag: "Active bleeding — seek urgent care if ongoing",
    patterns: [
      /\bvomit(ing)?\s+blood\b/i,
      /\bblood\s+in\s+(stool|vomit|sputum|phlegm)\b/i,
      /\bcoughing\s+blood\b/i,
      /\bbleeding\s+heavily\b/i,
    ],
  },
  {
    id: "allergy_high",
    tier: "high",
    redFlag: "Allergic reaction — monitor closely; seek care if worsening",
    patterns: [
      /\ballergic\s+reaction\b/i,
      /\bhives\s+.*\bswelling\b/i,
      /\blip\s+swelling\b/i,
    ],
  },
  {
    id: "diabetes_high",
    tier: "high",
    redFlag: "Uncontrolled blood sugar symptoms — urgent diabetes care",
    patterns: [
      /\bhigh\s+blood\s+sugar\b/i,
      /\bblood\s+sugar\s+(high|elevated)\b/i,
      /\bfruity\s+breath\b/i,
      /\bexcessive\s+thirst\b/i,
      /\bfrequent\s+urination\b/i,
      /\bglucose\s+very\s+high\b/i,
    ],
  },
  {
    id: "pain_high",
    tier: "high",
    redFlag: "Severe pain — same-day clinical evaluation recommended",
    patterns: [
      /\bsevere\s+pain\b/i,
      /\bworst\s+pain\b/i,
      /\b10\s*\/\s*10\s+pain\b/i,
      /\bunbearable\s+pain\b/i,
    ],
  },

  // —— MODERATE (clinic visit) ——
  {
    id: "clinic_general",
    tier: "moderate",
    redFlag: "Symptoms may need outpatient evaluation within 24–48 hours",
    patterns: [
      /\bpersistent\s+pain\b/i,
      /\bworse\s+over\s+(days|weeks)\b/i,
      /\bdehydrat/i,
      /\binfection\b/i,
      /\buti\b/i,
      /\bpregnant\b.*\bpain\b/i,
      /\bmoderate\s+fever\b/i,
    ],
  },
];

const TIER_RANK: Record<SymptomTier, number> = { critical: 3, high: 2, moderate: 1 };

function tierToSeverity(tier: SymptomTier): SeverityBand {
  if (tier === "critical") return "critical";
  if (tier === "high") return "high";
  return "moderate";
}

function tierToCare(tier: SymptomTier): CareLevel {
  if (tier === "critical") return "emergency_room";
  if (tier === "high") return "clinic_visit";
  return "clinic_visit";
}

function tierToRisk(tier: SymptomTier, matchCount: number): number {
  const base = tier === "critical" ? 92 : tier === "high" ? 72 : 52;
  return Math.min(99, base + Math.min(6, matchCount) * 2);
}

export function matchSymptomGroups(text: string): { group: SymptomGroup; matched: boolean }[] {
  const t = text.trim();
  if (!t) return [];
  return SYMPTOM_GROUPS.map((group) => ({
    group,
    matched: group.patterns.some((p) => p.test(t)),
  }));
}

/** Contextual boosts when chronic history + acute wording align */
function applyContextModifiers(
  text: string,
  ctx: PatientTriageContext | undefined,
  currentTier: SymptomTier | null
): { tier: SymptomTier | null; flags: string[] } {
  const lower = text.toLowerCase();
  const chronic = (ctx?.chronic_conditions || "").toLowerCase();
  const flags: string[] = [];
  let tier = currentTier;

  const bump = (to: SymptomTier, flag: string) => {
    if (!tier || TIER_RANK[to] > TIER_RANK[tier]) tier = to;
    flags.push(flag);
  };

  if (chronic.includes("diabet") || chronic.includes("diabetes")) {
    flags.push("Diabetes history reported");
    if (/\b(sugar|glucose|insulin|keto|thirst|urinat)/i.test(lower)) {
      bump("high", "Diabetes history with acute glucose-related symptoms");
    }
    if (/\b(unconscious|confus|vomit|fruity|dka)/i.test(lower)) {
      bump("critical", "Diabetes history with possible metabolic emergency");
    }
  }

  if (/\basthma\b/i.test(chronic) || /\b(asthma|copd)\b/i.test(lower)) {
    if (/\b(breath|wheez|inhaler|oxygen)\b/i.test(lower)) {
      bump("high", "Respiratory disease history with acute breathing symptoms");
    }
  }

  if (chronic.includes("heart") || chronic.includes("cardiac")) {
    flags.push("Cardiac history reported");
    if (/\b(pain|breath|pressure|palpitat|dizzy)\b/i.test(lower)) {
      bump("high", "Cardiac history with concerning acute symptoms");
    }
  }

  if (ctx?.age_band === "senior") {
    if (/\b(fever|confus|fall|weak|breath)\b/i.test(lower)) {
      bump("high", "Senior patient with acute constitutional or respiratory symptoms");
    }
  }

  const allergies = (ctx?.allergies || "").toLowerCase();
  if (allergies.length > 2) flags.push("Allergies on file");
  if (allergies && /\b(swelling|hive|rash|itch|reaction)\b/i.test(lower)) {
    bump("high", "Known allergies with possible reaction symptoms");
  }

  return { tier, flags };
}

export function classifySymptomSeverity(
  text: string,
  ctx?: PatientTriageContext
): SeverityAssessment {
  const matches = matchSymptomGroups(text).filter((m) => m.matched);
  let topTier: SymptomTier | null = null;

  for (const { group } of matches) {
    if (!topTier || TIER_RANK[group.tier] > TIER_RANK[topTier]) {
      topTier = group.tier;
    }
  }

  const ctxMod = applyContextModifiers(text, ctx, topTier);
  topTier = ctxMod.tier;

  const red_flags = [
    ...matches.map((m) => m.group.redFlag),
    ...ctxMod.flags.filter((f) => !matches.some((m) => m.group.redFlag === f)),
  ];
  const uniqueFlags = [...new Set(red_flags)];

  const matched_groups = matches.map((m) => m.group.id);

  if (!topTier) {
    return {
      severity: "low",
      care_level: "home_care",
      risk_score: 22,
      is_emergency: false,
      matched_groups: [],
      red_flags: ctxMod.flags,
      confidence_score: 55,
      emergency_recommendation: null,
      hospital_recommendation: null,
    };
  }

  const severity = tierToSeverity(topTier);
  const care_level = tierToCare(topTier);
  const risk_score = tierToRisk(topTier, matched_groups.length);
  const is_emergency = topTier === "critical";

  const confidence_score = Math.min(
    98,
    62 +
      matched_groups.length * 8 +
      (topTier === "critical" ? 12 : topTier === "high" ? 6 : 0) +
      (ctxMod.flags.length > 0 ? 5 : 0)
  );

  const emergency_recommendation = is_emergency
    ? "Call 108 (India) or your local emergency number now if symptoms are active. Go to the nearest emergency department — do not drive yourself if unsafe."
    : null;

  const hospital_recommendation =
    topTier === "high" || topTier === "critical"
      ? "Seek in-person care at a clinic or hospital today; use emergency services if symptoms worsen rapidly."
      : topTier === "moderate"
        ? "Schedule clinic or primary-care evaluation within 24–48 hours if symptoms persist."
        : null;

  return {
    severity,
    care_level,
    risk_score,
    is_emergency,
    matched_groups,
    red_flags: uniqueFlags,
    confidence_score,
    emergency_recommendation,
    hospital_recommendation,
  };
}

/** Shared acute detector for YouTube gate + emergency UI hooks */
export function detectAcuteSeriousCondition(raw: string): boolean {
  const a = classifySymptomSeverity(raw);
  return a.severity === "critical" || a.severity === "high";
}

export function shouldActivateEmergencyAlert(assessment: SeverityAssessment): boolean {
  return assessment.is_emergency || assessment.severity === "critical";
}
