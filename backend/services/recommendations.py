"""
Acne Detection Predictor Service

Multi-signal acne detection combining:
1. YOLOv8-based face detection (HuggingFace pre-trained)
2. Multi-spectral pigmentation analysis (M-Index + LAB a* + HSV V)
3. Color analysis across HSV, LAB, YCrCb for inflammation detection
4. Texture analysis using Laplacian variance and Gabor filters
5. Local contrast analysis for bump detection
6. Morphological analysis for spot shape/size
"""

import logging
import os
from typing import Dict, List

logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")

YOLO_FACE_MODEL_PATH = os.path.join(MODELS_DIR, "YOLO-face.pt")

os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)



def _generate_recommendations(acne_count: int, severity: str, pigment_data: Dict, dryness_data: Dict, spot_types: Dict = None) -> Dict:
    """
    Generate personalized skincare, lifestyle, and medical recommendations.
    Returns both a flat list and a structured AM/PM routine.
    """
    recs = []
    conflicts = []
    clarity = pigment_data.get("clarity_score", 100)
    hydration = dryness_data.get("hydration_score", 100)
    roughness = dryness_data.get("roughness_score", 0)
    flakes = dryness_data.get("flakes_count", 0)
    pigment_intensity = pigment_data.get("intensity", "Low")
    types = spot_types or {}

    has_dryness = hydration < 70
    has_acne = acne_count > 0
    has_pigmentation = clarity < 85

    # ── Conflict Detection ──
    if has_dryness and has_acne:
        conflicts.append({
            "message": "Your skin shows both dryness and acne. Avoid over-exfoliating — use gentle actives only.",
            "severity": "warning"
        })

    # ── ACNE RECOMMENDATIONS ──
    if severity == "Severe":
        recs.append({
            "id": "med_derma",
            "title": "Dermatologist Consultation",
            "description": "Severe acne detected across multiple facial zones. Professional extraction and prescription-strength treatment (isotretinoin, antibiotics) may be necessary.",
            "priority": "high",
            "category": "medical",
            "why": f"Detected {acne_count} active lesions across the face.",
            "conflictsWith": []
        })

    if types.get("inflammatory", 0) > 0 or types.get("papule", 0) > 0:
        recs.append({
            "id": "acne_bpo",
            "title": "Benzoyl Peroxide 2.5%",
            "description": "Apply a thin layer to affected areas after cleansing in the evening. Kills acne-causing bacteria and reduces inflammation. Start with 2.5% to minimize irritation.",
            "priority": "high" if acne_count > 10 else "medium",
            "category": "skincare",
            "why": f"Detected {types.get('inflammatory', 0) + types.get('papule', 0)} inflamed/inflammatory lesions.",
            "conflictsWith": ["retinol"]
        })

    if types.get("blackhead", 0) > 0:
        recs.append({
            "id": "acne_bha",
            "title": "Salicylic Acid 2% BHA",
            "description": "Oil-soluble exfoliant that penetrates deep into pores to dissolve blackhead-causing sebum. Use 2-3 times per week in the evening.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Detected {types.get('blackhead', 0)} blackhead(s) — BHA targets clogged pores.",
            "conflictsWith": ["aha_lactic"]
        })

    if types.get("whitehead", 0) > 0:
        recs.append({
            "id": "acne_adapalene",
            "title": "Adapalene 0.1% (Differin)",
            "description": "Topical retinoid that normalizes skin cell turnover to prevent pore clogging. Apply a pea-sized amount to entire face at night. Expect mild peeling for 2-4 weeks.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Detected {types.get('whitehead', 0)} whitehead(s) — adapalene prevents comedone formation.",
            "conflictsWith": ["benzoyl_peroxide", "aha_lactic"]
        })

    if types.get("pustule", 0) > 0:
        recs.append({
            "id": "acne_niacinamide",
            "title": "Niacinamide 10% Serum",
            "description": "Regulates sebum production and reduces the redness associated with pustules. Apply after cleansing, before moisturizer. Gentle enough for daily use.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Detected {types.get('pustule', 0)} pustule(s) — niacinamide controls oil and calms inflammation.",
            "conflictsWith": []
        })

    if has_acne and acne_count <= 5:
        recs.append({
            "id": "acne_teatree",
            "title": "Tea Tree Oil Spot Treatment",
            "description": "Apply directly to individual spots using a cotton swab. Natural antibacterial that reduces mild blemishes without drying the surrounding skin.",
            "priority": "low",
            "category": "skincare",
            "why": "Mild acne — spot treatment is sufficient.",
            "conflictsWith": []
        })

    # ── PIGMENTATION RECOMMENDATIONS ──
    if clarity < 70:
        recs.append({
            "id": "pig_retinol",
            "title": "Retinol 0.5% (PM)",
            "description": "Accelerates cell turnover to fade dark spots and even skin tone. Start with 0.3% if new to retinol. Apply 2-3 nights per week, gradually increasing. Always pair with sunscreen.",
            "priority": "high",
            "category": "skincare",
            "why": f"Pigmentation clarity is low ({clarity}%) — retinol promotes skin renewal.",
            "conflictsWith": ["benzoyl_peroxide", "aha_lactic", "bha"]
        })

    if clarity < 85:
        recs.append({
            "id": "pig_vitc",
            "title": "Vitamin C 15-20% Serum (AM)",
            "description": "Powerful antioxidant that inhibits melanin production and brightens existing hyperpigmentation. Apply to clean skin in the morning before sunscreen.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Pigmentation clarity at {clarity}% — Vitamin C brightens and protects.",
            "conflictsWith": ["retinol"]
        })
        recs.append({
            "id": "pig_alpha_arbutin",
            "title": "Alpha Arbutin 2% Serum",
            "description": "Gentle melanin inhibitor that fades dark spots without irritation. Can be layered with Vitamin C in the morning or used alone.",
            "priority": "medium",
            "category": "skincare",
            "why": "Supplement to Vitamin C for targeted spot fading.",
            "conflictsWith": []
        })

    if pigment_intensity in ["High", "Moderate"]:
        recs.append({
            "id": "pig_sunscreen",
            "title": "SPF 50+ Broad Spectrum (AM)",
            "description": "Mineral sunscreen (zinc oxide/titanium dioxide) prevents UV-triggered melanin production that worsens pigmentation. Reapply every 2 hours if outdoors. Non-negotiable with any brightening routine.",
            "priority": "high",
            "category": "skincare",
            "why": f"Pigmentation intensity: {pigment_intensity} — UV exposure will darken existing spots.",
            "conflictsWith": []
        })

    if clarity < 70 and clarity >= 50:
        recs.append({
            "id": "pig_kojic",
            "title": "Kojic Acid Cream",
            "description": "Natural tyrosinase inhibitor derived from mushrooms. Apply to dark spots at night for 4-8 weeks for visible fading.",
            "priority": "medium",
            "category": "skincare",
            "why": "Moderate pigmentation — kojic acid targets specific dark spots.",
            "conflictsWith": ["retinol"]
        })

    # ── DRYNESS / TEXTURE RECOMMENDATIONS ──
    if hydration < 50:
        recs.append({
            "id": "dry_ha_ceramide",
            "title": "Hyaluronic Acid + Ceramide Moisturizer",
            "description": "Hyaluronic acid draws moisture into the skin while ceramides repair the protective barrier. Apply to damp skin to lock in hydration. Use morning and night.",
            "priority": "high",
            "category": "skincare",
            "why": f"Hydration critically low ({hydration}%) — barrier repair is urgent.",
            "conflictsWith": []
        })
        recs.append({
            "id": "dry_water",
            "title": "Increase Water Intake",
            "description": "Drink at least 2-3 liters of water daily. Dehydrated skin produces excess oil to compensate, worsening both dryness and acne.",
            "priority": "high",
            "category": "lifestyle",
            "why": "Internal hydration directly impacts skin barrier function.",
            "conflictsWith": []
        })
    elif hydration < 70:
        recs.append({
            "id": "dry_ha",
            "title": "Hyaluronic Acid Serum",
            "description": "Lightweight humectant that plumps and hydrates without heaviness. Apply to damp skin, layer moisturizer on top.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Hydration at {hydration}% — needs moisture boost.",
            "conflictsWith": []
        })

    if roughness > 8:
        recs.append({
            "id": "dry_urea",
            "title": "Urea 10% Moisturizer",
            "description": "Urea is both a humectant and mild exfoliant that smooths rough, flaky patches while hydrating. Apply to rough areas at night.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Roughness score elevated ({roughness}%) — urea smooths and hydrates simultaneously.",
            "conflictsWith": ["retinol"]
        })
    elif roughness > 5:
        recs.append({
            "id": "dry_aha_lactic",
            "title": "Lactic Acid 5% (Gentle AHA)",
            "description": "Mild chemical exfoliant that removes dead skin cells and improves texture. Use 2 times per week in the evening. Gentler than glycolic acid for dry skin.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Roughness at {roughness}% — gentle exfoliation improves texture.",
            "conflictsWith": ["bha", "retinol", "adapalene"]
        })

    if flakes > 5:
        recs.append({
            "id": "dry_occlusive",
            "title": "Occlusive Barrier Balm",
            "description": "Rich balm (petrolatum, shea butter, squalane) seals in moisture and prevents transepidermal water loss. Apply as the last step in your evening routine over all other products.",
            "priority": "high",
            "category": "skincare",
            "why": f"Detected {flakes} dry flakes — occlusive layer prevents further moisture loss.",
            "conflictsWith": []
        })

    # ── LIFESTYLE RECOMMENDATIONS ──
    if has_acne or has_pigmentation:
        recs.append({
            "id": "life_pillow",
            "title": "Clean Pillowcase Every 2-3 Days",
            "description": "Pillowcases accumulate bacteria, oil, and dead skin that transfer to your face. Use silk or satin to reduce friction and bacterial buildup.",
            "priority": "low",
            "category": "lifestyle",
            "why": "Reducing bacterial transfer helps prevent breakouts and irritation.",
            "conflictsWith": []
        })

    if has_acne:
        recs.append({
            "id": "life_diet",
            "title": "Reduce High-Glycemic Foods & Dairy",
            "description": "Studies link high-glycemic foods (sugar, white bread) and dairy (skim milk) to increased acne. Consider reducing intake for 4-6 weeks to observe changes.",
            "priority": "low",
            "category": "lifestyle",
            "why": "Dietary triggers can exacerbate hormonal acne.",
            "conflictsWith": []
        })

    if severity in ["Severe", "Moderate"] or has_dryness:
        recs.append({
            "id": "life_sleep",
            "title": "Prioritize 7-9 Hours of Sleep",
            "description": "Sleep deprivation increases cortisol, which triggers inflammation and excess oil production. Maintain a consistent sleep schedule for skin repair.",
            "priority": "medium",
            "category": "lifestyle",
            "why": "Skin regenerates during sleep — poor sleep slows healing.",
            "conflictsWith": []
        })

    # ── DEFAULT: Skin is clear ──
    if not recs:
        recs.append({
            "id": "maint_routine",
            "title": "Gentle Maintenance Routine",
            "description": "Your skin analysis looks excellent! Maintain with: gentle cleanser → lightweight moisturizer → SPF 30+ daily. Avoid over-washing or using harsh products.",
            "priority": "low",
            "category": "skincare",
            "why": "No significant concerns detected.",
            "conflictsWith": []
        })

    # ── BUILD AM/PM ROUTINE ──
    routine = _build_routine(recs, has_acne, has_pigmentation, has_dryness)

    return {
        "recommendations": recs,
        "conflicts": conflicts,
        "routine": routine,
    }


def _build_routine(recs: List[Dict], has_acne: bool, has_pigmentation: bool, has_dryness: bool) -> Dict:
    """Structure recommendations into an AM/PM skincare routine."""
    rec_ids = {r["id"] for r in recs}

    morning = []
    evening = []

    # ── MORNING ──
    morning.append({"step": 1, "product": "Gentle Cleanser", "action": "Splash with lukewarm water and cleanse", "id": "cleanse_am"})
    morning.append({"step": 2, "product": "Toner (optional)", "action": "Pat into skin for pH balance", "id": "toner_am"})

    if "pig_vitc" in rec_ids:
        morning.append({"step": 3, "product": "Vitamin C Serum", "action": "Apply 4-5 drops to face and neck, avoid eye area", "id": "pig_vitc"})
        morning.append({"step": 4, "product": "Moisturizer", "action": "Apply to damp skin", "id": "moist_am"})
    elif "dry_ha_ceramide" in rec_ids or "dry_ha" in rec_ids:
        morning.append({"step": 3, "product": "Hyaluronic Acid Serum", "action": "Apply to damp skin, layer moisturizer on top", "id": "dry_ha"})
        morning.append({"step": 4, "product": "Moisturizer", "action": "Apply generously", "id": "moist_am"})
    else:
        morning.append({"step": 3, "product": "Moisturizer", "action": "Apply to face and neck", "id": "moist_am"})

    if "pig_sunscreen" in rec_ids:
        morning.append({"step": 5, "product": "SPF 50+ Sunscreen", "action": "Apply 2 finger-lengths to face. Reapply every 2 hours if outdoors.", "id": "pig_sunscreen"})
    else:
        morning.append({"step": 5, "product": "SPF 30+ Sunscreen", "action": "Apply as the last step before makeup", "id": "spf_maint"})

    # ── EVENING ──
    evening.append({"step": 1, "product": "Oil Cleanser / Micellar Water", "action": "Remove sunscreen and makeup first", "id": "cleanse_prem"})

    if "acne_bha" in rec_ids:
        evening.append({"step": 2, "product": "Salicylic Acid Cleanser", "action": "Massage for 60 seconds, rinse thoroughly", "id": "acne_bha"})
    elif "acne_bpo" in rec_ids:
        evening.append({"step": 2, "product": "Benzoyl Peroxide Wash 2.5%", "action": "Lather, leave on for 2-3 minutes, rinse", "id": "acne_bpo_wash"})
    else:
        evening.append({"step": 2, "product": "Gentle Cleanser", "action": "Double cleanse if wearing makeup/sunscreen", "id": "cleanse_pm"})

    step = 3
    if "acne_adapalene" in rec_ids:
        evening.append({"step": step, "product": "Adapalene 0.1%", "action": "Pea-sized amount for entire face. Avoid eye area. Use every other night initially.", "id": "acne_adapalene"})
        step += 1
    elif "pig_retinol" in rec_ids:
        evening.append({"step": step, "product": "Retinol 0.5%", "action": "Apply pea-sized amount to entire face. Start 2x/week, build up tolerance.", "id": "pig_retinol"})
        step += 1

    if "acne_niacinamide" in rec_ids:
        evening.append({"step": step, "product": "Niacinamide 10% Serum", "action": "Apply a few drops, wait 1 minute before next step", "id": "acne_niacinamide"})
        step += 1

    if "acne_teatree" in rec_ids:
        evening.append({"step": step, "product": "Tea Tree Oil (diluted)", "action": "Dab onto individual spots with cotton swab", "id": "acne_teatree"})
        step += 1

    if "dry_ha_ceramide" in rec_ids or "dry_ha" in rec_ids:
        evening.append({"step": step, "product": "Hyaluronic Acid + Ceramide Moisturizer", "action": "Apply to damp skin as the final layer", "id": "dry_ha_ceramide"})
        step += 1
    else:
        evening.append({"step": step, "product": "Night Moisturizer", "action": "Apply generously, focus on dry areas", "id": "moist_pm"})
        step += 1

    if "dry_occlusive" in rec_ids:
        evening.append({"step": step, "product": "Occlusive Barrier Balm", "action": "Apply thin layer over moisturizer on very dry patches", "id": "dry_occlusive"})
        step += 1

    tips = []
    if "acne_adapalene" in rec_ids and "pig_vitc" in rec_ids:
        tips.append("Use Vitamin C in the morning and Adapalene at night — never mix in the same routine.")
    if "acne_bha" in rec_ids and "pig_retinol" in rec_ids:
        tips.append("Alternate nights: BHA on one night, Retinol on the next. Do not use together.")
    if has_dryness and has_acne:
        tips.append("Your skin is dry AND acne-prone — use gentle, non-stripping cleansers only.")
    if "pig_sunscreen" in rec_ids:
        tips.append("Sunscreen is non-negotiable with any brightening routine. UV exposure reverses progress.")
    tips.append("Introduce new active ingredients one at a time, waiting 2 weeks between each.")
    tips.append("Patch test new products on your jawline for 48 hours before full-face use.")

    return {
        "morning": morning,
        "evening": evening,
        "tips": tips,
    }
