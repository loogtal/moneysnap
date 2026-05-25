import uuid
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Transaction
from backend.services.ocr_service import extract_slip_data
from backend.services.category_service import categorize

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/scan")
async def scan_slip(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Allow content_type=None (React Native sometimes omits it)
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="ต้องอัปโหลดไฟล์รูปภาพเท่านั้น")

    suffix = Path(file.filename).suffix if file.filename else ".jpg"
    if not suffix or suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        suffix = ".jpg"
    file_path = UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"
    with file_path.open("wb") as buffer:
        buffer.write(await file.read())

    try:
        slip_data = extract_slip_data(str(file_path))
    except RuntimeError as e:
        msg = str(e)
        status = 429 if ("429" in msg or "โควต้า" in msg or "quota" in msg.lower()) else 503
        raise HTTPException(status_code=status, detail=msg)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise HTTPException(status_code=429, detail="Gemini API เกินโควต้า กรุณารอ 1 นาทีแล้วลองใหม่")
        raise HTTPException(status_code=500, detail=f"Gemini API error: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"วิเคราะห์สลิปไม่สำเร็จ: {e}")

    category = categorize(slip_data.get("raw_text", ""))
    transaction = Transaction(
        slip_image_path=str(file_path),
        sender_name=slip_data.get("sender_name"),
        receiver_name=slip_data.get("receiver_name"),
        amount=slip_data.get("amount", 0.0),
        bank_name=slip_data.get("bank_name"),
        transaction_date=slip_data.get("transaction_date"),
        transaction_type=slip_data.get("transaction_type", "expense"),
        category=category,
        note=None,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return {
        "id": transaction.id,
        "sender_name": transaction.sender_name,
        "receiver_name": transaction.receiver_name,
        "amount": transaction.amount,
        "bank_name": transaction.bank_name,
        "transaction_date": transaction.transaction_date.isoformat() if transaction.transaction_date else None,
        "transaction_type": transaction.transaction_type,
        "category": transaction.category,
    }


@router.get("/test-api")
def test_gemini_api():
    """Quick endpoint to verify GOOGLE_API_KEY is set and Gemini responds."""
    import os, httpx as _httpx
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY ไม่ได้ตั้งค่าใน Railway")
    try:
        resp = _httpx.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent",
            params={"key": api_key},
            json={"contents": [{"parts": [{"text": "reply: ok"}]}]},
            timeout=15,
        )
        if resp.status_code == 429:
            return {"status": "rate_limited", "detail": "API key ใช้งานได้แต่ถูก rate limit อยู่"}
        resp.raise_for_status()
        return {"status": "ok", "model": "gemini-2.0-flash-lite"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
