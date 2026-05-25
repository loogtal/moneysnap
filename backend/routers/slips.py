import uuid
from pathlib import Path

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
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="ต้องอัปโหลดไฟล์รูปภาพเท่านั้น")

    suffix = Path(file.filename).suffix if file.filename else ".jpg"
    file_path = UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"
    with file_path.open("wb") as buffer:
        buffer.write(await file.read())

    slip_data = extract_slip_data(str(file_path))
    category = categorize(slip_data["raw_text"])
    transaction_type = slip_data.get("transaction_type", "expense")

    transaction = Transaction(
        slip_image_path=str(file_path),
        sender_name=slip_data.get("sender_name"),
        receiver_name=slip_data.get("receiver_name"),
        amount=slip_data.get("amount", 0.0),
        bank_name=slip_data.get("bank_name"),
        transaction_date=slip_data.get("transaction_date"),
        transaction_type=transaction_type,
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
