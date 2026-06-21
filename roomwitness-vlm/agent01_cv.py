# Agent 01 — CV damage comparison: uses Llama 4 Scout via Groq to assess landlord claims against move-in/move-out photos

import os
import base64
import json
import re
import sys
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq
from PIL import Image

load_dotenv()

MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def prepare_image(image_path: str) -> str:
    """Resize to max 1024px on longest side, encode as base64 JPEG."""
    img = Image.open(image_path).convert("RGB")
    max_side = 1024
    w, h = img.size
    if max(w, h) > max_side:
        scale = max_side / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def assess_claim(
    move_in_b64: str,
    move_out_b64: str,
    claim_item: str,
    claim_description: str,
    claim_amount: float,
) -> dict:
    """Call Groq with both images and one claim, return structured assessment dict."""
    system_prompt = (
        "You are a professional property damage assessor. "
        "You compare move-in and move-out photos to evaluate specific landlord damage claims. "
        "You are fair and objective — you identify real damage but also recognise normal wear and tear. "
        "Respond only in valid JSON. No prose. No explanation."
    )

    user_text = f"""Evaluate this landlord damage claim by comparing the two room photos.

Image 1 = move-in condition (tenant's photo)
Image 2 = move-out condition (landlord's photo)

CLAIM ITEM: {claim_item}
LANDLORD SAYS: {claim_description}
AMOUNT CLAIMED: {claim_amount} THB

Return this exact JSON:
{{
  "item": "the claim item name",
  "move_in_condition": "describe what you see for this item in image 1",
  "move_out_condition": "describe what you see for this item in image 2",
  "change_detected": true or false,
  "change_description": "what specifically changed, or 'no change detected'",
  "wear_and_tear": true or false,
  "wear_and_tear_reason": "why you classified it as wear and tear or not",
  "likely_tenant_caused": true or false or null,
  "supports_landlord_claim": "YES" or "NO" or "PARTIAL",
  "confidence": a float from 0.0 to 1.0,
  "confidence_reason": "brief reason for this confidence level",
  "low_visibility": true or false,
  "notes": "anything important such as lighting issues, angle differences, or unclear areas"
}}

Rules:
- wear_and_tear is true if the change looks like normal aging from regular use, not negligence
- likely_tenant_caused is null only if you genuinely cannot determine from the photos
- low_visibility is true if lighting, angle, or photo quality makes assessment difficult
- If the claimed item is not visible in either photo, set confidence below 0.3 and explain in notes
- Do not invent damage that is not visible"""

    content = [
        {"type": "text", "text": user_text},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{move_in_b64}"}},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{move_out_b64}"}},
    ]

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
        # Try to salvage a JSON block from the response
        match = re.search(r"\{[\s\S]+\}", raw)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    except Exception:
        pass

    return {
        "item": claim_item,
        "move_in_condition": "assessment failed",
        "move_out_condition": "assessment failed",
        "change_detected": None,
        "change_description": "could not assess",
        "wear_and_tear": None,
        "wear_and_tear_reason": "",
        "likely_tenant_caused": None,
        "supports_landlord_claim": "PARTIAL",
        "confidence": 0.0,
        "confidence_reason": "model returned unparseable response",
        "low_visibility": True,
        "notes": "assessment failed — manual review required",
    }


def run_cv_assessment(
    move_in_paths: list,
    move_out_paths: list,
    landlord_claims: list,
) -> dict:
    """Main entry point. Accepts lists of image paths and claim dicts, returns full assessment."""
    move_in_b64 = prepare_image(move_in_paths[0])
    move_out_b64 = prepare_image(move_out_paths[0])

    assessments = []
    for claim in landlord_claims:
        result = assess_claim(
            move_in_b64=move_in_b64,
            move_out_b64=move_out_b64,
            claim_item=claim["item"],
            claim_description=claim["description"],
            claim_amount=float(claim.get("amount_thb", 0)),
        )
        assessments.append(result)

    supported = sum(1 for a in assessments if a.get("supports_landlord_claim") == "YES")
    disputed = sum(1 for a in assessments if a.get("supports_landlord_claim") == "NO")
    partial = sum(1 for a in assessments if a.get("supports_landlord_claim") == "PARTIAL")
    low_conf = [a["item"] for a in assessments if (a.get("confidence") or 0) < 0.4]
    total_disputed_amount = sum(
        float(landlord_claims[i].get("amount_thb", 0))
        for i, a in enumerate(assessments)
        if a.get("supports_landlord_claim") == "NO"
    )

    summary = {
        "total_claims": len(assessments),
        "supported_claims": supported,
        "disputed_claims": disputed,
        "partial_claims": partial,
        "low_confidence_items": low_conf,
        "total_disputed_amount": total_disputed_amount,
        "assessment_notes": f"{disputed} of {len(assessments)} claims disputed by photo evidence.",
    }

    return {
        "claim_assessments": assessments,
        "summary": summary,
        "model_used": MODEL,
        "images_used": {
            "move_in": move_in_paths[0],
            "move_out": move_out_paths[0],
        },
    }


if __name__ == "__main__":
    test_claims = [
        {
            "item": "bedroom wall paint",
            "description": "severe paint damage and stains on bedroom wall",
            "amount_thb": 5000.0,
        },
        {
            "item": "bathroom tiles",
            "description": "cracked floor tile near shower",
            "amount_thb": 3000.0,
        },
    ]

    print("RoomWitness — Agent 01 CV Test")
    print(f"Using model: {MODEL}")
    print("─" * 50)
    print("NOTE: Add real move-in and move-out photos to test.")
    print("For now running with placeholder paths.")
    print("Replace move_in_test.jpg and move_out_test.jpg")
    print("with real room photos before running.")
    print("─" * 50)

    move_in = sys.argv[1] if len(sys.argv) > 1 else "move_in_test.jpg"
    move_out = sys.argv[2] if len(sys.argv) > 2 else "move_out_test.jpg"

    if not os.path.exists(move_in) or not os.path.exists(move_out):
        print(f"Image files not found: {move_in}, {move_out}")
        print("Usage: python agent01_cv.py move_in.jpg move_out.jpg")
        sys.exit(1)

    result = run_cv_assessment(
        move_in_paths=[move_in],
        move_out_paths=[move_out],
        landlord_claims=test_claims,
    )

    print(json.dumps(result, ensure_ascii=False, indent=2))
