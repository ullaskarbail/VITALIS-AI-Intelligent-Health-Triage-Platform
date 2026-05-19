import type { PatientTriageContext, TriageResponse } from "./types";

export type MedicationRecommendation = {
  id: string;
  name: string;
  purpose: string;
  note: string;
  priority: "otc_education" | "discuss_with_doctor" | "emergency";
};

function corpus(triage: TriageResponse, patient: PatientTriageContext | null): string {
  return [
    triage.ai_message,
    triage.nlp_symptoms?.join(" ") ?? "",
    triage.nlp_entities_summary ?? "",
    patient?.chronic_conditions ?? "",
    patient?.medications ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function conflictsAllergy(name: string, allergies: string): boolean {
  if (!allergies.trim()) return false;
  const a = allergies.toLowerCase();
  const tokens = name.toLowerCase().split(/[\s,/+-]+/).filter((t) => t.length > 3);
  return tokens.some((t) => a.includes(t));
}

function push(
  list: MedicationRecommendation[],
  seen: Set<string>,
  item: Omit<MedicationRecommendation, "id">,
  allergies: string
) {
  const key = item.name.toLowerCase();
  if (seen.has(key)) return;
  if (conflictsAllergy(item.name, allergies)) return;
  seen.add(key);
  list.push({ ...item, id: crypto.randomUUID() });
}

/** Educational medication guidance from triage (not a prescription). */
export function buildMedicationRecommendations(
  triage: TriageResponse | null,
  patient: PatientTriageContext | null
): MedicationRecommendation[] {
  if (!triage) return [];

  const text = corpus(triage, patient);
  const allergies = (patient?.allergies || "").toLowerCase();
  const recs: MedicationRecommendation[] = [];
  const seen = new Set<string>();

  const add = (item: Omit<MedicationRecommendation, "id">) => {
    push(recs, seen, item, allergies);
  };

  if (triage.is_emergency || triage.severity === "critical") {
    add({
      name: "Emergency evaluation first",
      purpose: "Urgent in-person care",
      note: "Do not delay calling 108 / emergency services for critical symptoms. Self-medication is not a substitute.",
      priority: "emergency",
    });
  }

  if (/\basthma\b|wheez|inhaler|bronchodilat/.test(text)) {
    add({
      name: "Rescue inhaler (if already prescribed)",
      purpose: "Bronchospasm relief",
      note: "Use your prescribed salbutamol/levalbuterol as directed. Seek ER if not improving within minutes.",
      priority: "discuss_with_doctor",
    });
  }

  if (/\b(breath|dyspnea|shortness)/.test(text) && !triage.is_emergency) {
    add({
      name: "Urgent clinical review",
      purpose: "Breathing symptoms",
      note: "Breathing difficulty needs same-day assessment; do not rely only on home remedies.",
      priority: "discuss_with_doctor",
    });
  }

  if (/\bfever|temperature|pyrex/.test(text)) {
    add({
      name: "Paracetamol (acetaminophen)",
      purpose: "Fever & mild pain (educational)",
      note: "Follow package dosing; avoid duplicate cold products containing paracetamol. Not for children without clinician advice.",
      priority: "otc_education",
    });
  }

  if (/\bcough|cold|sore throat|throat/.test(text)) {
    add({
      name: "Warm fluids & steam inhalation",
      purpose: "Supportive upper-respiratory care",
      note: "Honey/lemon warm drinks may soothe cough (avoid honey in infants). Saline nasal rinse if tolerated.",
      priority: "otc_education",
    });
  }

  if (/\bpain|ache|headache|migraine/.test(text) && triage.severity !== "critical") {
    add({
      name: "Analgesic (pharmacist-guided)",
      purpose: "Pain relief education",
      note: "Paracetamol or ibuprofen may be discussed with a pharmacist if no kidney/stomach/bleeding risks. Take with food if using NSAIDs.",
      priority: "otc_education",
    });
  }

  if (/\bdiabet|blood sugar|glucose|insulin|dka|keto/.test(text)) {
    add({
      name: "Continue prescribed diabetes medicines",
      purpose: "Glycemic control",
      note: "Monitor glucose as directed. Seek emergency care for very high sugar with vomiting, confusion, or fruity breath.",
      priority: "discuss_with_doctor",
    });
  }

  if (/\bdehydrat|vomit|diarrh|fluid/.test(text)) {
    add({
      name: "Oral rehydration salts (ORS)",
      purpose: "Rehydration support",
      note: "Small frequent sips of ORS or clean fluids. Seek care if unable to keep fluids down or reduced urination.",
      priority: "otc_education",
    });
  }

  if (/\ballerg|hive|rash|itch|anaphyl/.test(text)) {
    add({
      name: "Antihistamine (if no contraindication)",
      purpose: "Mild allergic symptoms",
      note: "Discuss cetirizine/loratadine with pharmacist. For throat swelling or breathing issues, call emergency services immediately.",
      priority: "discuss_with_doctor",
    });
  }

  if (/\banxiety|panic|stress|worry|mood/.test(text)) {
    add({
      name: "Non-drug coping + professional support",
      purpose: "Mental health adjunct",
      note: "Breathing exercises and crisis helplines (e.g. Tele MANAS 14416 in India). Medication only via a licensed prescriber.",
      priority: "discuss_with_doctor",
    });
  }

  if (patient?.medications?.trim()) {
    add({
      name: "Review current medicines with clinician",
      purpose: "Medication reconciliation",
      note: `You listed: ${patient.medications.trim()}. Confirm doses and interactions before adding anything new.`,
      priority: "discuss_with_doctor",
    });
  }

  if (recs.length === 0 || (recs.length === 1 && recs[0]?.priority === "emergency")) {
    add({
      name: "Pharmacist / clinician consult",
      purpose: "Personalized medication plan",
      note: "Based on your triage summary, an in-person review is needed before specific medicine suggestions.",
      priority: "discuss_with_doctor",
    });
  }

  return recs.slice(0, 8);
}
