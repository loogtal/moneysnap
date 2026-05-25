import os
from typing import Dict

import httpx

API_KEY = os.environ.get("GOOGLE_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent"


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
        resp = httpx.post(
            GEMINI_URL,
            params={"key": API_KEY},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return "ขออภัย เกิดข้อผิดพลาดในการเรียกใช้งาน AI โปรดลองอีกครั้ง"
