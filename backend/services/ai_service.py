import os
import time
from typing import Dict

import httpx

from backend.services.gemini_limiter import acquire

API_KEY = os.environ.get("GOOGLE_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"


def _post_with_retry(payload: dict, max_retries: int = 2) -> dict:
    for attempt in range(max_retries):
        acquire()  # enforce rate limit
        resp = httpx.post(
            GEMINI_URL,
            params={"key": API_KEY},
            json=payload,
            timeout=60,
        )
        if resp.status_code == 429:
            if attempt < max_retries - 1:
                time.sleep(30)
                continue
            raise RuntimeError("rate_limited")
        resp.raise_for_status()
        return resp.json()


def get_spending_tips(monthly_data: Dict) -> str:
    if not API_KEY:
        return "ยังไม่สามารถเชื่อมต่อ AI ได้ โปรดตั้งค่า GOOGLE_API_KEY"

    prompt = f"""วิเคราะห์ข้อมูลการใช้จ่ายของผู้ใช้และให้คำแนะนำในการประหยัดเงิน:

ข้อมูลการใช้จ่ายเดือนนี้:
{monthly_data}

กรุณา:
1. สรุปพฤติกรรมการใช้จ่าย
2. ระบุหมวดที่ใช้จ่ายมากเกินไป
3. แนะนำวิธีประหยัดที่ทำได้จริง 3 ข้อ
4. ประมาณการว่าจะประหยัดได้เท่าไรต่อเดือน

ตอบเป็นภาษาไทย สั้น กระชับ เป็นมิตร"""

    try:
        data = _post_with_retry({"contents": [{"parts": [{"text": prompt}]}]})
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return "ขออภัย เกิดข้อผิดพลาดในการเรียกใช้งาน AI โปรดลองอีกครั้ง"
