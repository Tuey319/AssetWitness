"""
Compatibility shim — exposes run_cv_assessment with a flat signature:

    from agent01_condition_comparison import run_cv_assessment
"""

import os
from groq import Groq
from agent01_condition_comparison.cv import assess_condition_item, prepare_image, MODEL

try:
    from langsmith import traceable
except ImportError:
    def traceable(**_):
        def _wrap(fn): return fn
        return _wrap


def _get_client() -> Groq:
    return Groq(api_key=os.getenv("GROQ_API_KEY"))


@traceable(name="agent01/run_cv_assessment", run_type="chain")
def run_cv_assessment(
    prior_paths: list,
    current_paths: list,
    condition_items: list,
) -> dict:
    """Flat signature — creates Groq client internally."""
    client = _get_client()
    prior_b64s = [prepare_image(p) for p in prior_paths if p]
    current_b64s = [prepare_image(p) for p in current_paths if p]

    assessments = []
    for item in condition_items:
        result = assess_condition_item(
            prior_b64s=prior_b64s,
            current_b64s=current_b64s,
            item_name=item["item"],
            item_description=item.get("description", ""),
            estimated_cost=float(item.get("estimated_cost_thb", 0)),
            client=client,
        )
        assessments.append(result)

    return {
        "item_assessments": assessments,
        "model_used": MODEL,
        "images_used": {"prior": prior_paths, "current": current_paths},
    }
