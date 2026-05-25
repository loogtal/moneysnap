import os
from typing import Dict

try:
    import anthropic
except ImportError:
    anthropic = None

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-6"


def get_spending_tips(monthly_data: Dict, language: str = "th") -> str:
    if not API_KEY or anthropic is None:
        return (
            "ยังไม่สามารถเชื่อมต่อ AI ได้ โปรดตั้งค่า ANTHROPIC_API_KEY "
            "แล้วรีสตาร์ท backend"
        )

    client = anthropic.Anthropic(api_key=API_KEY)
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
        response = client.messages.create(
            model=MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception:
        return "ขออภัย เกิดข้อผิดพลาดในการเรียกใช้งาน AI โปรดลองอีกครั้งในภายหลัง"
