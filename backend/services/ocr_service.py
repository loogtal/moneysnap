import base64
import io
import json
import logging
import os
import re
import time
from datetime import datetime
from pathlib import Path

import httpx
from PIL import Image

from backend.services.gemini_limiter import acquire

logger = logging.getLogger(__name__)

MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
_DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-lite")
GEMINI_URL = f"{_GEMINI_BASE}/{_DEFAULT_MODEL}:generateContent"

# Fallback models tried in order if the primary model has quota=0
_FALLBACK_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
]


def _gemini_post(api_key: str, payload: dict) -> dict:
    """Try primary model first, then fallbacks if quota=0."""
    models = [_DEFAULT_MODEL] + [m for m in _FALLBACK_MODELS if m != _DEFAULT_MODEL]
    last_err = None
    for model in models:
        url = f"{_GEMINI_BASE}/{model}:generateContent"
        acquire()
        resp = httpx.post(url, params={"key": api_key}, json=payload, timeout=60)
        if resp.status_code == 429:
            body = resp.json()
            msg = body.get("error", {}).get("message", "")
            if "limit: 0" in msg:
                logger.warning("Model %s has quota=0, trying next model", model)
                last_err = RuntimeError(f"Model {model} ไม่มีสิทธิ์ใช้กับ key นี้")
                continue
            logger.warning("Gemini 429 on %s — waiting 30s", model)
            time.sleep(30)
            acquire()
            resp = httpx.post(url, params={"key": api_key}, json=payload, timeout=60)
            if resp.status_code == 429:
                last_err = RuntimeError("Gemini API เกินโควต้า กรุณารอ 1 นาทีแล้วลองใหม่")
                continue
        if resp.status_code in (400, 404):
            logger.warning("Model %s not available (%s), trying next", model, resp.status_code)
            last_err = RuntimeError(f"Model {model} ไม่พร้อมใช้งาน ({resp.status_code})")
            continue
        if resp.status_code == 403:
            raise RuntimeError("GOOGLE_API_KEY ไม่มีสิทธิ์ ตรวจสอบว่าสร้างจาก aistudio.google.com/apikey")
        resp.raise_for_status()
        logger.info("Using model: %s", model)
        return resp.json()
    raise last_err or RuntimeError("ไม่พบ Gemini model ที่ใช้งานได้ ตรวจสอบ API key ใน Railway")


def parse_date(date_str: str):
    if not date_str:
        return None
    date_str = str(date_str).strip().replace("-", "/").replace(".", "/").split(" ")[0]
    parts = date_str.split("/")
    try:
        if len(parts) == 3:
            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
            if year < 100:
                year += 2000
            if year > 2500:
                year -= 543
            return datetime(year, month, day)
    except (ValueError, IndexError):
        pass
    for fmt in ("%d/%m/%Y", "%Y/%m/%d", "%d/%m/%y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def extract_slip_data(image_path: str, hint: str = None) -> dict:
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        raise RuntimeError("ไม่พบ GOOGLE_API_KEY — กรุณาตั้งค่าใน Railway environment variables")

    suffix = Path(image_path).suffix.lower()
    media_type = MEDIA_TYPES.get(suffix, "image/jpeg")

    try:
        img = Image.open(image_path)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        max_side = 1280
        if max(img.width, img.height) > max_side:
            img.thumbnail((max_side, max_side), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=75, optimize=True)
        image_b64 = base64.b64encode(buf.getvalue()).decode()
        media_type = "image/jpeg"
    except Exception as img_err:
        logger.warning("Image compression failed (%s), using raw file", img_err)
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode()

    hint_section = f"\n\nหมายเหตุจากผู้ใช้: {hint}" if hint else ""
    prompt = f"""อ่านสลิปธนาคารไทยหรือหลักฐานการชำระเงินในภาพนี้แล้วสกัดข้อมูล

รองรับ: สลิปโอนเงินธนาคาร, PromptPay, QR Payment, บัตรเครดิต/เดบิต

ตอบในรูปแบบ JSON นี้เท่านั้น ห้ามมีข้อความอื่นนอก JSON:
{{
  "sender_name": "ชื่อผู้โอน/ผู้ส่ง — ถ้า PromptPay ให้ใส่ชื่อเจ้าของบัญชีต้นทาง (null ถ้าไม่มี)",
  "receiver_name": "ชื่อผู้รับเงิน — ถ้า PromptPay ให้ใส่ชื่อผู้รับหรือชื่อร้านค้า (null ถ้าไม่มี)",
  "amount": 0.0,
  "bank_name": "ธนาคาร เช่น KBank SCB BBL KTB TTB BAY CIMB UOB หรือ PromptPay",
  "date_str": "วันที่ DD/MM/YYYY (null ถ้าไม่มี)",
  "transaction_type": "income หรือ expense",
  "raw_text": "ข้อความทั้งหมดที่อ่านได้จากสลิป"
}}

กฎสำคัญ:
- amount = จำนวนเงินที่โอน ไม่ใช่ยอดคงเหลือ
- date_str = รูปแบบ DD/MM/YYYY เท่านั้น หากเป็น พ.ศ. ให้ลบ 543 ก่อน
- transaction_type = expense ถ้าผู้ใช้จ่ายเงิน, income ถ้าผู้ใช้รับเงิน
- bank_name = "PromptPay" ถ้าเป็นสลิป PromptPay หรือ QR Payment{hint_section}"""

    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": media_type, "data": image_b64}},
                {"text": prompt},
            ]
        }]
    }

    try:
        resp_data = _gemini_post(api_key, payload)
        raw = resp_data["candidates"][0]["content"]["parts"][0]["text"].strip()
        logger.info("Gemini response: %s", raw)
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError(f"ไม่พบ JSON: {raw[:200]}")
        result = json.loads(match.group())
        result["transaction_date"] = parse_date(result.get("date_str"))
        result.setdefault("raw_text", "")
        result.setdefault("amount", 0.0)
        result.setdefault("bank_name", "ไม่ระบุ")
        result.setdefault("sender_name", None)
        result.setdefault("receiver_name", None)
        result.setdefault("transaction_type", "expense")
        return result
    except Exception as e:
        logger.error("extract_slip_data error: %s", e, exc_info=True)
        raise
