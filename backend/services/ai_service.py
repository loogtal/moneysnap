import os
import time
from typing import Dict

import httpx

from backend.services.gemini_limiter import acquire

API_KEY = os.environ.get("GOOGLE_API_KEY", "")
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
_DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-lite")
_FALLBACK_MODELS = ["gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash"]


def _post_with_retry(payload: dict) -> dict:
    models = [_DEFAULT_MODEL] + [m for m in _FALLBACK_MODELS if m != _DEFAULT_MODEL]
    for model in models:
        url = f"{_GEMINI_BASE}/{model}:generateContent"
        acquire()
        resp = httpx.post(url, params={"key": API_KEY}, json=payload, timeout=60)
        if resp.status_code == 429:
            body = resp.json()
            if "limit: 0" in body.get("error", {}).get("message", ""):
                continue
            time.sleep(30)
            acquire()
            resp = httpx.post(url, params={"key": API_KEY}, json=payload, timeout=60)
            if resp.status_code == 429:
                continue
        if resp.status_code in (400, 404):
            continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError("ไม่พบ Gemini model ที่ใช้งานได้")


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
