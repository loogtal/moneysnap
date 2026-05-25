import base64
import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


def parse_date(date_str: str):
    if not date_str:
        return None
    date_str = str(date_str).strip().replace("-", "/").replace(".", "/")
    date_str = date_str.split(" ")[0]
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
        logger.error("GOOGLE_API_KEY ไม่ได้ตั้งค่า")
        raise RuntimeError("ไม่พบ GOOGLE_API_KEY — กรุณาตั้งค่าใน Railway environment variables")

    import google.generativeai as genai
    from google.generativeai.types import HarmCategory, HarmBlockThreshold

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    suffix = Path(image_path).suffix.lower()
    media_type = MEDIA_TYPES.get(suffix, "image/jpeg")

    with open(image_path, "rb") as f:
        image_data = f.read()

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

กฎสำคัญ:
- amount: เงินที่โอน/รับ ไม่ใช่ยอดคงเหลือ
- date_str: แปลงเป็น DD/MM/YYYY เสมอ ถ้าปีเป็นพ.ศ.ให้ลบ 543
- transaction_type: "income"=รับเงิน, "expense"=จ่าย/โอนออก
- raw_text: คัดลอกข้อความทั้งหมดในสลิป"""

    try:
        response = model.generate_content(
            [{"mime_type": media_type, "data": base64.b64encode(image_data).decode()}, prompt],
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            },
        )
        raw = response.text.strip()
        logger.info("Gemini raw response: %s", raw)
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError(f"ไม่พบ JSON ใน response: {raw[:200]}")
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
