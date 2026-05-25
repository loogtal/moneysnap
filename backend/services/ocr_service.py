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

logger = logging.getLogger(__name__)

MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"


def _gemini_post(api_key: str, payload: dict, max_retries: int = 3) -> dict:
    for attempt in range(max_retries):
        resp = httpx.post(
            GEMINI_URL,
            params={"key": api_key},
            json=payload,
            timeout=60,
        )
        if resp.status_code == 429:
            if attempt < max_retries - 1:
                wait = 2 ** (attempt + 1)
                logger.warning("Gemini 429 — retrying in %ds (attempt %d)", wait, attempt + 1)
                time.sleep(wait)
                continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError("Gemini API เกินโควต้า กรุณาลองอีกครั้งใน 1 นาที")


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


def extract_slip_data(image_path: str) -> dict:
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

    prompt = """อ่านสลิปธนาคารไทยในภาพนี้แล้วสกัดข้อมูลให้ครบถ้วน

ตอบในรูปแบบ JSON นี้เท่านั้น ห้ามมีข้อความอื่นนอก JSON:
{
  "sender_name": "ชื่อผู้โอน/ผู้ส่ง (null ถ้าไม่มี)",
  "receiver_name": "ชื่อผู้รับเงิน (null ถ้าไม่มี)",
  "amount": 0.0,
  "bank_name": "ชื่อธนาคาร เช่น KBank SCB BBL KTB TTB",
  "date_str": "วันที่ DD/MM/YYYY (null ถ้าไม่มี)",
  "transaction_type": "income หรือ expense",
  "raw_text": "ข้อความทั้งหมดที่อ่านได้จากสลิป"
}

กฎ: amount=เงินโอนไม่ใช่ยอดคงเหลือ, date_str=DD/MM/YYYY (ลบ543ถ้าพ.ศ.), transaction_type=income/expense"""

    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": media_type, "data": image_b64}},
                {"text": prompt},
            ]
        }]
    }

    try:
        data = _gemini_post(api_key, payload)
        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        logger.info("Gemini response: %s", raw)
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError(f"ไม่พบ JSON: {raw[:200]}")
        data = json.loads(match.group())
        data["transaction_date"] = parse_date(data.get("date_str"))
        data.setdefault("raw_text", "")
        data.setdefault("amount", 0.0)
        data.setdefault("bank_name", "ไม่ระบุ")
        data.setdefault("sender_name", None)
        data.setdefault("receiver_name", None)
        data.setdefault("transaction_type", "expense")
        return data
    except Exception as e:
        logger.error("extract_slip_data error: %s", e, exc_info=True)
        raise
