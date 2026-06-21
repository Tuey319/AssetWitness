# Agent 02 — Conversation & evidence extraction: reads screenshots via Llama 4 Scout, surfaces landlord/tenant promises

import os
import json
import re
import base64
from io import BytesIO

from dotenv import load_dotenv
from groq import Groq
from PIL import Image

load_dotenv()

MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def _encode_image(image_path: str) -> str:
    """Resize to max 1024px longest side, return base64 JPEG string."""
    img = Image.open(image_path).convert("RGB")
    w, h = img.size
    if max(w, h) > 1024:
        scale = 1024 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def extract_from_screenshot(image_path: str, screenshot_index: int) -> dict:
    """
    Send one conversation screenshot to Llama 4 Scout.
    Returns structured extraction of messages, promises, and tone.
    """
    system_prompt = (
        "You are an expert at reading chat screenshots (LINE, WhatsApp, iMessage, SMS, email). "
        "Extract the full conversation text and identify any statements relevant to a rental deposit dispute. "
        "Respond only in valid JSON. No prose."
    )

    user_text = f"""This is conversation screenshot #{screenshot_index + 1} from a Thai rental deposit dispute.

Extract all readable text and identify key statements.

Return this exact JSON:
{{
  "readable": true or false,
  "platform": "LINE" or "WhatsApp" or "SMS" or "email" or "other" or "unknown",
  "language": "th" or "en" or "mixed",
  "messages": [
    {{
      "sender": "landlord" or "tenant" or "unknown",
      "text": "exact message text",
      "timestamp": "date/time if visible, else null"
    }}
  ],
  "landlord_promises": [
    "direct quote or paraphrase of any promise, commitment, or statement made by the landlord"
  ],
  "tenant_promises": [
    "direct quote or paraphrase of any promise, commitment, or statement made by the tenant"
  ],
  "deposit_mentions": [
    "any sentence that mentions deposit, refund, deduction, damage, repair costs"
  ],
  "overall_tone": "cooperative" or "disputed" or "threatening" or "neutral",
  "key_date": "most relevant date mentioned, or null",
  "notes": "anything unusual, unreadable sections, or important context"
}}

Rules:
- If the screenshot is unreadable or not a conversation, set readable to false and leave arrays empty
- Preserve original Thai text in the messages array — do not translate
- Classify sender as landlord/tenant based on chat bubble side or name labels when visible
- landlord_promises and tenant_promises should capture anything that could be used as evidence"""

    b64 = _encode_image(image_path)

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    {"type": "text", "text": user_text},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ]},
            ],
            temperature=0.1,
            max_tokens=1200,
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
        "readable": False,
        "platform": "unknown",
        "language": "unknown",
        "messages": [],
        "landlord_promises": [],
        "tenant_promises": [],
        "deposit_mentions": [],
        "overall_tone": "neutral",
        "key_date": None,
        "notes": "extraction failed — manual review required",
    }


def run_evidence_analysis(
    screenshot_paths: list,
    manual_landlord_promises: str = "",
    manual_tenant_promises: str = "",
) -> dict:
    """
    Process all conversation screenshots plus manually entered promises.
    Returns a unified evidence summary ready for the legal pipeline.
    """
    screenshot_results = []
    for i, path in enumerate(screenshot_paths):
        result = extract_from_screenshot(path, i)
        result["source_file"] = os.path.basename(path)
        screenshot_results.append(result)

    # Aggregate across all screenshots
    all_landlord_promises = []
    all_tenant_promises   = []
    all_deposit_mentions  = []
    all_messages          = []
    platforms_seen        = set()
    unreadable_count      = 0

    for r in screenshot_results:
        if not r.get("readable"):
            unreadable_count += 1
            continue
        all_landlord_promises.extend(r.get("landlord_promises") or [])
        all_tenant_promises.extend(r.get("tenant_promises") or [])
        all_deposit_mentions.extend(r.get("deposit_mentions") or [])
        all_messages.extend(r.get("messages") or [])
        if r.get("platform"):
            platforms_seen.add(r["platform"])

    # Merge manual entries
    if manual_landlord_promises.strip():
        for line in manual_landlord_promises.strip().splitlines():
            line = line.strip("•-– ").strip()
            if line:
                all_landlord_promises.append(f"[Manual] {line}")

    if manual_tenant_promises.strip():
        for line in manual_tenant_promises.strip().splitlines():
            line = line.strip("•-– ").strip()
            if line:
                all_tenant_promises.append(f"[Manual] {line}")

    # Build a plain-text summary for the RAG pipeline
    summary_lines = []
    if all_landlord_promises:
        summary_lines.append("LANDLORD STATEMENTS/PROMISES:")
        summary_lines.extend(f"  • {p}" for p in all_landlord_promises)
    if all_tenant_promises:
        summary_lines.append("TENANT STATEMENTS/PROMISES:")
        summary_lines.extend(f"  • {p}" for p in all_tenant_promises)
    if all_deposit_mentions:
        summary_lines.append("DEPOSIT-RELATED MENTIONS:")
        summary_lines.extend(f"  • {m}" for m in all_deposit_mentions)

    evidence_text = "\n".join(summary_lines) if summary_lines else "No evidence extracted."

    return {
        "screenshots_processed": len(screenshot_paths),
        "screenshots_unreadable": unreadable_count,
        "platforms_detected": list(platforms_seen),
        "screenshot_details": screenshot_results,
        "all_landlord_promises": all_landlord_promises,
        "all_tenant_promises":   all_tenant_promises,
        "all_deposit_mentions":  all_deposit_mentions,
        "total_messages_extracted": len(all_messages),
        "evidence_text": evidence_text,   # ← injected into RAG legal analysis
        "model_used": MODEL,
    }
