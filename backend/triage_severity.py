"""
Scalable symptom-group severity classifier (mirrors frontend/src/lib/triageSeverity.ts).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal, Optional

SeverityBand = Literal["low", "moderate", "high", "critical"]
CareLevel = Literal["home_care", "clinic_visit", "emergency_room"]
SymptomTier = Literal["critical", "high", "moderate"]

TIER_RANK: dict[SymptomTier, int] = {"critical": 3, "high": 2, "moderate": 1}


@dataclass(frozen=True)
class SymptomGroup:
    id: str
    tier: SymptomTier
    red_flag: str
    patterns: tuple[str, ...]


SYMPTOM_GROUPS: tuple[SymptomGroup, ...] = (
    SymptomGroup(
        "respiratory_critical",
        "critical",
        "Severe breathing difficulty or respiratory distress — call 108 / emergency services if active now",
        (
            r"can'?t\s+breathe",
            r"cannot\s+breathe",
            r"unable\s+to\s+breathe",
            r"difficult\s+to\s+breathe",
            r"struggling\s+to\s+breathe",
            r"shortness\s+of\s+breath",
            r"short\s+of\s+breath",
            r"breathing\s+difficult",
            r"gasping\s+for\s+(air|breath)",
            r"choking",
            r"not\s+breathing",
            r"low\s+oxygen",
            r"oxygen\s+(level\s+)?(drop|low|sat)",
            r"cyanosis",
            r"blue\s+lips",
            r"severe\s+asthma\s+attack",
            r"asthma\s+attack",
        ),
    ),
    SymptomGroup(
        "cardiac_critical",
        "critical",
        "Possible cardiac emergency — seek immediate emergency care",
        (r"chest\s+pain", r"heart\s+attack", r"crushing\s+chest", r"severe\s+chest\s+pressure"),
    ),
    SymptomGroup(
        "neuro_critical",
        "critical",
        "Possible stroke, seizure, or altered consciousness — emergency evaluation needed",
        (
            r"\bstroke\b",
            r"face\s+drooping",
            r"slurred\s+speech",
            r"one\s+side\s+(weak|numb|paraly)",
            r"\bparalysis\b",
            r"\bseizure\b",
            r"convuls",
            r"\bunconscious\b",
            r"unresponsive",
            r"not\s+waking\s+up",
        ),
    ),
    SymptomGroup(
        "metabolic_critical",
        "critical",
        "Possible diabetic or metabolic emergency — urgent hospital care",
        (
            r"diabetic\s+(emergency|coma|ketoacidosis)",
            r"\bdka\b",
            r"ketoacidosis",
            r"very\s+high\s+blood\s+sugar",
            r"blood\s+sugar\s+(over|above|>)\s*(300|400|500)",
            r"severe\s+hypoglyc",
        ),
    ),
    SymptomGroup(
        "bleeding_critical",
        "critical",
        "Heavy or uncontrolled bleeding — emergency care",
        (r"severe\s+bleeding", r"heavy\s+bleeding", r"uncontrolled\s+bleeding", r"bleeding\s+won'?t\s+stop"),
    ),
    SymptomGroup(
        "allergy_critical",
        "critical",
        "Possible anaphylaxis — emergency services if worsening",
        (r"anaphylaxis", r"anaphylactic", r"throat\s+(swelling|closing)", r"severe\s+allergic\s+reaction"),
    ),
    SymptomGroup(
        "mental_critical",
        "critical",
        "Mental health emergency — seek immediate crisis support",
        (r"suicid", r"kill\s+myself", r"self[\s-]?harm", r"hurt\s+myself"),
    ),
    SymptomGroup("toxic_critical", "critical", "Possible poisoning or overdose", (r"overdose", r"poison")),
    SymptomGroup(
        "respiratory_high",
        "high",
        "Significant breathing symptoms — urgent medical assessment today",
        (r"wheez", r"breathless", r"rapid\s+breathing", r"fast\s+breathing"),
    ),
    SymptomGroup(
        "fever_high",
        "high",
        "High or severe fever — seek prompt in-person evaluation",
        (r"severe\s+fever", r"high\s+fever", r"104", r"40\.?\s*°?\s*c", r"fever\s+not\s+(coming\s+)?down"),
    ),
    SymptomGroup(
        "infection_high",
        "high",
        "Possible serious infection — urgent clinical review",
        (r"sepsis", r"severe\s+infection", r"meningitis"),
    ),
    SymptomGroup(
        "dehydration_high",
        "high",
        "Severe dehydration signs — may need IV fluids",
        (r"severe\s+dehydrat", r"no\s+urine", r"not\s+urinating", r"cannot\s+keep\s+fluids\s+down"),
    ),
    SymptomGroup(
        "syncope_high",
        "high",
        "Fainting or collapse — needs same-day assessment",
        (r"fainted", r"fainting", r"passed\s+out", r"collapsed", r"syncope"),
    ),
    SymptomGroup(
        "bleeding_high",
        "high",
        "Active bleeding — seek urgent care if ongoing",
        (r"vomit(ing)?\s+blood", r"blood\s+in\s+(stool|vomit)", r"coughing\s+blood"),
    ),
    SymptomGroup(
        "diabetes_high",
        "high",
        "Uncontrolled blood sugar symptoms — urgent diabetes care",
        (r"high\s+blood\s+sugar", r"fruity\s+breath", r"excessive\s+thirst"),
    ),
    SymptomGroup(
        "pain_high",
        "high",
        "Severe pain — same-day clinical evaluation recommended",
        (r"severe\s+pain", r"worst\s+pain", r"unbearable\s+pain"),
    ),
    SymptomGroup(
        "clinic_general",
        "moderate",
        "Symptoms may need outpatient evaluation within 24–48 hours",
        (r"persistent\s+pain", r"dehydrat", r"\binfection\b", r"\buti\b"),
    ),
)


@dataclass
class SeverityAssessment:
    severity: SeverityBand
    care_level: CareLevel
    risk_score: int
    is_emergency: bool
    matched_groups: list[str]
    red_flags: list[str]
    confidence_score: int
    emergency_recommendation: Optional[str]
    hospital_recommendation: Optional[str]


def _match_groups(text: str) -> list[SymptomGroup]:
    t = text.strip()
    if not t:
        return []
    return [g for g in SYMPTOM_GROUPS if any(re.search(p, t, re.I) for p in g.patterns)]


def _apply_context(text: str, ctx: Any, tier: Optional[SymptomTier]) -> tuple[Optional[SymptomTier], list[str]]:
    lower = text.lower()
    chronic = (getattr(ctx, "chronic_conditions", None) or "").lower() if ctx else ""
    flags: list[str] = []

    def bump(to: SymptomTier, flag: str) -> None:
        nonlocal tier
        if tier is None or TIER_RANK[to] > TIER_RANK[tier]:
            tier = to
        flags.append(flag)

    if "diabet" in chronic:
        flags.append("Diabetes history reported")
        if re.search(r"(sugar|glucose|insulin|keto|thirst)", lower):
            bump("high", "Diabetes history with acute glucose-related symptoms")
        if re.search(r"(unconscious|confus|vomit|fruity|dka)", lower):
            bump("critical", "Diabetes history with possible metabolic emergency")

    if "heart" in chronic or "cardiac" in chronic:
        flags.append("Cardiac history reported")
        if re.search(r"(pain|breath|pressure|palpitat)", lower):
            bump("high", "Cardiac history with concerning acute symptoms")

    if ctx and getattr(ctx, "age_band", None) == "senior" and re.search(r"(fever|confus|fall|weak|breath)", lower):
        bump("high", "Senior patient with acute symptoms")

    allergies = (getattr(ctx, "allergies", None) or "").lower() if ctx else ""
    if len(allergies) > 2:
        flags.append("Allergies on file")

    return tier, flags


def classify_symptom_severity(text: str, ctx: Any = None) -> SeverityAssessment:
    matches = _match_groups(text)
    top: Optional[SymptomTier] = None
    for g in matches:
        if top is None or TIER_RANK[g.tier] > TIER_RANK[top]:
            top = g.tier

    top, ctx_flags = _apply_context(text, ctx, top)
    red_flags = list(dict.fromkeys([g.red_flag for g in matches] + ctx_flags))
    matched_ids = [g.id for g in matches]

    if top is None:
        return SeverityAssessment(
            severity="low",
            care_level="home_care",
            risk_score=22,
            is_emergency=False,
            matched_groups=[],
            red_flags=ctx_flags,
            confidence_score=55,
            emergency_recommendation=None,
            hospital_recommendation=None,
        )

    severity: SeverityBand = "critical" if top == "critical" else "high" if top == "high" else "moderate"
    care_level: CareLevel = "emergency_room" if top == "critical" else "clinic_visit"
    risk_score = min(99, (92 if top == "critical" else 72 if top == "high" else 52) + min(6, len(matched_ids)) * 2)
    is_emergency = top == "critical"
    confidence = min(98, 62 + len(matched_ids) * 8 + (12 if top == "critical" else 6 if top == "high" else 0))

    emergency_rec = (
        "Call 108 (India) or your local emergency number now if symptoms are active. Go to the nearest emergency department."
        if is_emergency
        else None
    )
    if top in ("critical", "high"):
        hospital_rec = (
            "Seek in-person care at a clinic or hospital today; use emergency services if symptoms worsen rapidly."
        )
    elif top == "moderate":
        hospital_rec = "Schedule clinic evaluation within 24–48 hours if symptoms persist."
    else:
        hospital_rec = None

    return SeverityAssessment(
        severity=severity,
        care_level=care_level,
        risk_score=risk_score,
        is_emergency=is_emergency,
        matched_groups=matched_ids,
        red_flags=red_flags,
        confidence_score=confidence,
        emergency_recommendation=emergency_rec,
        hospital_recommendation=hospital_rec,
    )


def should_activate_emergency_alert(assessment: SeverityAssessment) -> bool:
    return assessment.is_emergency or assessment.severity == "critical"
