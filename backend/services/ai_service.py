import os
from typing import Dict

API_KEY = os.environ.get("GOOGLE_API_KEY", "")


def get_spending_tips(monthly_data: Dict) -> str:
    if not API_KEY:
        return "ยังไม่สามารถเชื่อมต่อ AI ได้ โปรดตั้งค่า GOOGLE_API_KEY แล้วรีสตาร์ท backend"

    try:
        import google.generativeai as genai
        genai.configure(api_key=API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""วิเคราะห์ข้อมูลการใช้จ่ายของผู้ใช้และให้คำแนะนำในการประหยัดเงิน:

ข้อมูลการใช้จ่ายเดือนนี้:
{monthly_data}

กรุณา:
1. สรุปพฤติกรรมการใช้จ่าย
2. ระบุหมวดที่ใช้จ่ายมากเกินไป
3. แนะนำวิธีประหยัดที่ทำได้จริง 3 ข้อ
4. ประมาณการว่าจะประหยัดได้เท่าไรต่อเดือน

ตอบเป็นภาษาไทย สั้น กระชับ เป็นมิตร"""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        return "ขออภัย เกิดข้อผิดพลาดในการเรียกใช้งาน AI โปรดลองอีกครั้งในภายหลัง"
