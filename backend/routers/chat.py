import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Transaction
from backend.auth_utils import get_current_user
from backend.services.ocr_service import _gemini_post

router = APIRouter()


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


@router.post("")
async def chat_endpoint(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI ไม่พร้อมใช้งาน")
    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages")

    recent_txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.desc())
        .limit(50)
        .all()
    )

    tx_lines = []
    for tx in recent_txs:
        date = tx.transaction_date.strftime("%Y-%m-%d") if tx.transaction_date else "N/A"
        tx_lines.append(
            f"- {date}: {tx.transaction_type} ฿{(tx.amount or 0):.0f} ({tx.category or 'other'}) {tx.receiver_name or ''}"
        )

    tx_context = "\n".join(tx_lines) if tx_lines else "ยังไม่มีข้อมูลธุรกรรม"

    system_text = f"""คุณคือผู้ช่วยทางการเงินส่วนตัว ชื่อ MoneySnap AI
ช่วยวิเคราะห์และให้คำแนะนำเกี่ยวกับการใช้จ่ายของผู้ใช้

ข้อมูลธุรกรรมล่าสุด (50 รายการ):
{tx_context}

คำแนะนำในการตอบ:
- ตอบเป็นภาษาไทยหรืออังกฤษตามภาษาที่ผู้ใช้ถาม
- ตอบกระชับ ชัดเจน ใช้ตัวเลขจริงจากข้อมูล
- ให้คำแนะนำที่ปฏิบัติได้จริง"""

    conv_parts = [system_text + "\n\n---\n\n"]
    for msg in req.messages[:-1]:
        prefix = "ผู้ใช้" if msg.role == "user" else "MoneySnap AI"
        conv_parts.append(f"{prefix}: {msg.content}\n\n")

    last = req.messages[-1]
    conv_parts.append(f"ผู้ใช้: {last.content}\n\nMoneySnap AI:")

    payload = {
        "contents": [{"parts": [{"text": "".join(conv_parts)}]}],
        "generationConfig": {"maxOutputTokens": 600, "temperature": 0.8},
    }

    try:
        resp = _gemini_post(api_key, payload)
        answer = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
        return {"reply": answer}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI ไม่สามารถตอบได้: {str(e)[:100]}")
