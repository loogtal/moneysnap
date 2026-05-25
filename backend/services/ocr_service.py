import base64
import json
import os
import re
from datetime import datetime
from pathlib import Path

BANK_NAMES = [
    "กสิกรไทย", "กรุงเทพ", "ไทยพาณิชย์", "กรุงไทย", "ทหารไทย",
    "KBANK", "BBL", "SCB", "KTB", "TMB", "TTB", "กรุงศรี", "ออมสิน",
]

MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

_easyocr_reader = None


def _get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        import easyocr
        _easyocr_reader = easyocr.Reader(["th", "en"], gpu=False)
    return _easyocr_reader


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


def _extract_amount(full_text: str) -> float:
    amounts = re.findall(r"\b\d{1,3}(?:[.,]\d{3})*(?:\.\d{2})?\b", full_text)
    if not amounts:
        return 0.0
    candidate = amounts[-1].replace(",", "")
    try:
        return float(candidate)
    except ValueError:
        return 0.0


def _extract_name(full_text: str, markers):
    for marker in markers:
        match = re.search(rf"{marker}\s*([฀-๿\w\s\/-]+)", full_text)
        if match:
            return match.group(1).strip().split("\n")[0]
    return None


def _extract_with_vision(image_path: str) -> dict | None:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None
    try:
        import anthropic
    except ImportError:
        return None

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
            return None
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
        return None


def _extract_with_easyocr(image_path: str) -> dict:
    import cv2
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"ไม่พบไฟล์รูปภาพ: {image_path}")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.bilateralFilter(gray, 11, 17, 17)
    _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    reader = _get_easyocr_reader()
    results = reader.readtext(thresh, detail=0)
    full_text = " ".join(results)

    dates = re.findall(r"\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}", full_text)
    date_str = dates[0] if dates else None

    income_keywords = ["รับโอน", "ได้รับ", "เงินเข้า", "โอนเข้า", "รับเงิน"]
    transaction_type = "income" if any(kw in full_text for kw in income_keywords) else "expense"

    return {
        "raw_text": full_text,
        "amount": _extract_amount(full_text),
        "bank_name": next((b for b in BANK_NAMES if b in full_text), "ไม่ระบุ"),
        "transaction_date": parse_date(date_str),
        "date_str": date_str,
        "sender_name": _extract_name(full_text, ["จาก", "ผู้ส่ง", "ส่งจาก"]),
        "receiver_name": _extract_name(full_text, ["ถึง", "ผู้รับ", "รับที่"]),
        "transaction_type": transaction_type,
    }


def extract_slip_data(image_path: str) -> dict:
    """Try Claude Vision first; fall back to EasyOCR if API key is absent."""
    result = _extract_with_vision(image_path)
    if result is not None:
        return result
    return _extract_with_easyocr(image_path)
