"""
Compatibility shim — exposes run_cv_assessment and run_evidence_analysis
with the original flat signatures so portal/app.py imports work unchanged:

    from agent01_cv import run_cv_assessment
"""

import os
from groq import Groq
from agent01_cv.cv import assess_claim, prepare_image, MODEL
from agent01_cv.evidence import run_evidence_analysis as _run_evidence_analysis


def _get_client() -> Groq:
    return Groq(api_key=os.getenv("GROQ_API_KEY"))


def run_cv_assessment(
    move_in_paths: list,
    move_out_paths: list,
    landlord_claims: list,
) -> dict:
    """Original flat signature — creates Groq client internally."""
    client = _get_client()
    move_in_b64  = prepare_image(move_in_paths[0])
    move_out_b64 = prepare_image(move_out_paths[0])

    assessments = []
    for claim in landlord_claims:
        result = assess_claim(
            move_in_b64=move_in_b64,
            move_out_b64=move_out_b64,
            claim_item=claim["item"],
            claim_description=claim.get("description", ""),
            claim_amount=float(claim.get("amount_thb", 0)),
            client=client,
        )
        assessments.append(result)

    disputed = sum(1 for a in assessments if a.get("supports_landlord_claim") == "NO")
    return {
        "claim_assessments": assessments,
        "summary": {
            "total_claims": len(assessments),
            "supported_claims": sum(1 for a in assessments if a.get("supports_landlord_claim") == "YES"),
            "disputed_claims": disputed,
            "partial_claims": sum(1 for a in assessments if a.get("supports_landlord_claim") == "PARTIAL"),
            "low_confidence_items": [a["item"] for a in assessments if (a.get("confidence") or 0) < 0.4],
            "total_disputed_amount": sum(
                float(landlord_claims[i].get("amount_thb", 0))
                for i, a in enumerate(assessments)
                if a.get("supports_landlord_claim") == "NO"
            ),
            "assessment_notes": f"{disputed} of {len(assessments)} claims disputed by photo evidence.",
        },
        "model_used": MODEL,
        "images_used": {"move_in": move_in_paths[0], "move_out": move_out_paths[0]},
    }


def run_evidence_analysis(
    screenshot_paths: list,
    manual_landlord_promises: str = "",
    manual_tenant_promises: str = "",
) -> dict:
    """Original flat signature — creates Groq client internally."""
    return _run_evidence_analysis(
        screenshot_paths=screenshot_paths,
        manual_landlord_promises=manual_landlord_promises,
        manual_tenant_promises=manual_tenant_promises,
        client=_get_client(),
    )
