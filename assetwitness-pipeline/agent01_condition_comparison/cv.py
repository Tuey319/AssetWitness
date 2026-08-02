"""
Condition Comparison agent — compares a space's prior recorded condition
against its condition at this handover, using Groq Llama-4-Scout. Photo pairs
are downloaded from S3 (or local paths in demo mode) before assessment.
"""

import base64
import json
import re
from io import BytesIO

from groq import Groq
from PIL import Image

try:
    from langsmith import traceable
except ImportError:
    def traceable(**_):
        def _wrap(fn): return fn
        return _wrap

# TODO: Ensure GROQ_API_KEY is set in .env
# TODO: Verify model availability — check https://console.groq.com for latest Scout model ID
MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def _get_groq_client(api_key: str) -> Groq:
    """Return a Groq client. api_key comes from shared/config.py at startup."""
    return Groq(api_key=api_key)


def prepare_image(image_path: str) -> str:
    """
    Load an image, resize to max 1024px on the longest side, encode as base64 JPEG.

    Args:
        image_path: Local file path (download from S3 first if needed).

    Returns:
        Base64-encoded JPEG string.
    """
    img = Image.open(image_path).convert("RGB")
    w, h = img.size
    if max(w, h) > 1024:
        scale = 1024 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@traceable(name="agent01/assess_condition_item", run_type="llm")
def assess_condition_item(
    prior_b64s: list[str],
    current_b64s: list[str],
    item_name: str,
    item_description: str,
    estimated_cost: float,
    client: Groq,
) -> dict:
    """
    Send all prior-condition and current-condition images and one item to
    Groq Llama-4-Scout.

    Args:
        prior_b64s: Base64 JPEGs of the space's last recorded condition.
        current_b64s: Base64 JPEGs from this handover.
        item_name: Name of the item/area being assessed.
        item_description: Description of what's being checked (from the handover checklist).
        estimated_cost: Estimated remediation/repair cost in THB, if a change is found.
        client: Groq client instance.

    Returns:
        Raw assessment dict from Groq, or a failure stub on parse error.
    """
    system_prompt = (
        "You are a neutral property condition assessor for a state asset handover. "
        "You compare a space's prior recorded condition against its condition at this "
        "handover, for a specific item or area. You are fair and objective — you note "
        "real changes but also recognise normal wear and tear from ordinary use. "
        "You do not take the side of the outgoing occupant, the incoming occupant, "
        "or the asset owner. Respond only in valid JSON. No prose. No explanation."
    )

    n_prior = len(prior_b64s)
    n_current = len(current_b64s)

    user_text = f"""Assess this handover condition item by comparing the photos.

PRIOR CONDITION PHOTOS: {n_prior} image(s) follow — the space's last recorded condition.
CURRENT CONDITION PHOTOS: {n_current} image(s) follow after — this handover's photos.

ITEM: {item_name}
CHECKLIST NOTE: {item_description}
ESTIMATED REMEDIATION COST IF CHANGED: {estimated_cost} THB

Look across ALL provided photos to find this item and assess the change.

Return this exact JSON:
{{
  "item": "the item name",
  "prior_condition": "describe what you see for this item across all prior-condition photos",
  "current_condition": "describe what you see for this item across all current-condition photos",
  "change_detected": true or false,
  "change_description": "what specifically changed, or 'no change detected'",
  "wear_and_tear": true or false,
  "wear_and_tear_reason": "why you classified it as wear and tear or not",
  "likely_occupant_caused": true or false or null,
  "confidence": a float from 0.0 to 1.0,
  "confidence_reason": "brief reason for this confidence level",
  "low_visibility": true or false,
  "notes": "lighting issues, angle differences, or unclear areas"
}}

Rules:
- wear_and_tear is true if the change looks like normal aging from regular use, not negligence
- likely_occupant_caused is null only if you genuinely cannot determine from the photos
- low_visibility is true if lighting, angle, or photo quality makes assessment difficult
- If the item is not visible in any photo, set confidence below 0.3 and explain in notes
- Do not invent a change that is not visible"""

    content: list[dict] = [{"type": "text", "text": user_text}]
    for b64 in prior_b64s:
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
    content.append({"type": "text", "text": f"Current-condition photos ({n_current}):"})
    for b64 in current_b64s:
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})

    raw = ""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content},
            ],
            temperature=0.1,
            max_tokens=800,
        )
        raw = response.choices[0].message.content.strip()
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]+\}", raw)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    except Exception:
        pass

    return {
        "item": item_name,
        "prior_condition": "assessment failed",
        "current_condition": "assessment failed",
        "change_detected": None,
        "change_description": "could not assess",
        "wear_and_tear": None,
        "wear_and_tear_reason": "",
        "likely_occupant_caused": None,
        "confidence": 0.0,
        "confidence_reason": "model returned unparseable response",
        "low_visibility": True,
        "notes": "assessment failed — manual review required",
    }
