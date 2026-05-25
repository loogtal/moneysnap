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
    # ตัดเวลาออกถ้ามี
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
    # ลอง format อื่น
    for fmt in ("%d/%m/%Y", "%Y/%m/%d", "%d/%m/%y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def extract_slip_data(image_path: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY ไม่ได้ตั้งค่า")
        raise RuntimeError("ไม่พบ ANTHROPIC_API_KEY — กรุณาตั้งค่าใน Railway environment variables")

    import anthropic

    suffix = Path(image_path).suffix.lower()
    media_type = MEDIA_TYPES.get(suffix, "image/jpeg")

    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    client = anthropic.Anthropic(api_key=api_key)
    system = (
        "คุณเป็นผู้เชี่ยวชาญด้านการอ่านสลิปธนาคารไทย "
        "ตอบเฉพาะ JSON เท่านั้น ห้ามมีคำอธิบายใดๆ นอก JSON"
    )
    instruction = """อ่านสลิปธนาคารไทยในภาพนี้แล้วสกัดข้อมูลให้ครบถ้วน

ตอบในรูปแบบ JSON นี้เท่านั้น:
{
  "sender_name": "ชื่อผู้โอน/ผู้ส่ง (ถ้าไม่มีให้ใส่ null)",
  "receiver_name": "ชื่อผู้รับเงิน (ถ้าไม่มีให้ใส่ null)",
  "amount": 0.0,
  "bank_name": "ชื่อธนาคาร เช่น KBank กสิกรไทย SCB ไทยพาณิชย์ กรุงเทพ BBL กรุงไทย KTB TTB TMB ออมสิน",
  "date_str": "วันที่ในรูปแบบ DD/MM/YYYY (ถ้าไม่มีให้ใส่ null)",
  "transaction_type": "income หรือ expense",
  "raw_text": "ข้อความทั้งหมดที่อ่านได้จากสลิป"
}

กฎสำคัญ:
- amount: ตัวเลขจำนวนเงินที่โอน/รับ ไม่รวมยอดคงเหลือ ให้เป็น float เช่น 1500.00
- date_str: แปลงเป็น DD/MM/YYYY เสมอ ถ้าปีเป็นพ.ศ. ให้ลบ 543 ก่อน
- transaction_type: "income" ถ้าเงินเข้า/รับโอน, "expense" ถ้าโอนออก/จ่ายเงิน
- bank_name: ดูจากโลโก้หรือชื่อที่ปรากฏในสลิป
- raw_text: คัดลอกข้อความทั้งหมดในสลิปเพื่อใช้จำแนกประเภท
- ถ้าไม่แน่ใจค่าไหนให้ใส่ null อย่าเดา"""
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            system=system,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                    {"type": "text", "text": instruction},
                ],
            }],
        )
        raw = response.content[0].text.strip()
        logger.info("Claude raw response: %s", raw)
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
