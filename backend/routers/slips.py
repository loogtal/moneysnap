import uuid
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Transaction, User
from backend.auth_utils import get_current_user
from backend.services.ocr_service import extract_slip_data
from backend.services.category_service import categorize

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/scan")
async def scan_slip(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="ต้องอัปโหลดไฟล์รูปภาพเท่านั้น")

    suffix = Path(file.filename).suffix if file.filename else ".jpg"
    if not suffix or suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        suffix = ".jpg"
    file_path = UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="ไฟล์ใหญ่เกินไป (สูงสุด 20 MB)")
    with file_path.open("wb") as buffer:
        buffer.write(raw)

    try:
        slip_data = extract_slip_data(str(file_path))
    except RuntimeError as e:
        file_path.unlink(missing_ok=True)
        msg = str(e)
        status = 429 if ("429" in msg or "โควต้า" in msg or "quota" in msg.lower()) else 503
        raise HTTPException(status_code=status, detail=msg)
    except httpx.HTTPStatusError as e:
        file_path.unlink(missing_ok=True)
        if e.response.status_code == 429:
            raise HTTPException(status_code=429, detail="Gemini API เกินโควต้า กรุณารอ 1 นาทีแล้วลองใหม่")
        raise HTTPException(status_code=500, detail=f"Gemini API error: {e.response.status_code}")
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"วิเคราะห์สลิปไม่สำเร็จ: {e}")

    category = categorize(slip_data.get("raw_text", ""))
    transaction = Transaction(
        user_id=current_user.id,
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


@router.get("/list-models")
def list_models():
    """List Gemini models available for the current API key."""
    import os, httpx as _httpx
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        return {"error": "GOOGLE_API_KEY not set"}
    try:
        resp = _httpx.get(
            "https://generativelanguage.googleapis.com/v1beta/models",
            params={"key": api_key},
            timeout=15,
        )
        resp.raise_for_status()
        names = [m["name"] for m in resp.json().get("models", []) if "generateContent" in m.get("supportedGenerationMethods", [])]
        return {"models": names}
    except Exception as e:
        return {"error": str(e)}


@router.get("/test-api")
def test_gemini_api():
    """Check GOOGLE_API_KEY format without consuming quota."""
    import os
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        return {"status": "no_key", "detail": "GOOGLE_API_KEY ไม่ได้ตั้งค่าใน Railway Variables"}
    if not api_key.startswith("AIza"):
        return {"status": "invalid_format", "detail": "Key ผิดรูปแบบ ต้องขึ้นต้นด้วย AIza", "preview": f"{api_key[:8]}...{api_key[-4:]}"}
    return {"status": "ok", "preview": f"{api_key[:8]}...{api_key[-4:]}"}
