import base64
import json
import os
import re
from datetime import datetime
from pathlib import Path

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
    date_str = date_str.replace("-", "/")
    parts = date_str.split("/")
    try:
        if len(parts) == 3:
            day, month, year = map(int, parts)
            if year < 100:
                year += 2000
            if year > 2500:
                year -= 543
            return datetime(year, month, day)
    except ValueError:
        return None
    return None


def extract_slip_data(image_path: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {
            "raw_text": "",
            "amount": 0.0,
            "bank_name": "ไม่ระบุ",
            "transaction_date": None,
            "sender_name": None,
            "receiver_name": None,
            "transaction_type": "expense",
        }

    import anthropic

    suffix = Path(image_path).suffix.lower()
    media_type = MEDIA_TYPES.get(suffix, "image/jpeg")

    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    client = anthropic.Anthropic(api_key=api_key)
    instruction = (
        'วิเคราะห์สลิปธนาคารไทยนี้ ตอบเฉพาะ JSON ไม่มีคำอธิบาย:\n'
        '{"sender_name":null,"receiver_name":null,"amount":0.0,'
        '"bank_name":null,"date_str":null,'
        '"transaction_type":"expense","raw_text":""}\n'
        'transaction_type ให้ใส่ "income" ถ้าเป็นการรับเงิน, "expense" ถ้าเป็นการจ่ายเงิน'
    )
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                    {"type": "text", "text": instruction},
                ],
            }],
        )
        raw = response.content[0].text.strip()
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON in response")
        data = json.loads(match.group())
        data["transaction_date"] = parse_date(data.get("date_str"))
        data.setdefault("raw_text", "")
        data.setdefault("amount", 0.0)
        data.setdefault("bank_name", "ไม่ระบุ")
        data.setdefault("sender_name", None)
        data.setdefault("receiver_name", None)
        data.setdefault("transaction_type", "expense")
        return data
    except Exception:
        return {
            "raw_text": "",
            "amount": 0.0,
            "bank_name": "ไม่ระบุ",
            "transaction_date": None,
            "sender_name": None,
            "receiver_name": None,
            "transaction_type": "expense",
        }
