from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import extract, nullslast
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Transaction, User
from backend.auth_utils import get_current_user
from backend.services.category_service import categorize
from backend.services.csv_parser import parse_bank_csv

router = APIRouter()


class TransactionUpdate(BaseModel):
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None
    amount: Optional[float] = None
    bank_name: Optional[str] = None
    transaction_type: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    transaction_date: Optional[str] = None


def _serialize(item: Transaction) -> dict:
    return {
        "id": item.id,
        "sender_name": item.sender_name,
        "receiver_name": item.receiver_name,
        "amount": item.amount,
        "bank_name": item.bank_name,
        "transaction_date": item.transaction_date.isoformat() if item.transaction_date else None,
        "transaction_type": item.transaction_type,
        "category": item.category,
        "note": item.note,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.get("")
def list_transactions(
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if year and month:
        query = query.filter(extract("year", Transaction.transaction_date) == year)
        query = query.filter(extract("month", Transaction.transaction_date) == month)
    elif year:
        query = query.filter(extract("year", Transaction.transaction_date) == year)

    if category:
        query = query.filter(Transaction.category == category)
    if type:
        query = query.filter(Transaction.transaction_type == type)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Transaction.receiver_name.ilike(term) |
            Transaction.sender_name.ilike(term) |
            Transaction.note.ilike(term)
        )

    total = query.count()
    items = (
        query.order_by(nullslast(Transaction.transaction_date.desc()))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"page": page, "page_size": page_size, "total": total, "results": [_serialize(t) for t in items]}


@router.get("/{transaction_id}")
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="ไม่พบธุรกรรม")
    return _serialize(transaction)


@router.patch("/{transaction_id}")
def update_transaction(
    transaction_id: int,
    update: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="ไม่พบธุรกรรม")

    data = update.model_dump(exclude_none=True)
    if "transaction_date" in data and data["transaction_date"]:
        try:
            data["transaction_date"] = datetime.fromisoformat(data["transaction_date"])
        except ValueError:
            data["transaction_date"] = None

    for field, value in data.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    return _serialize(transaction)


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="ไม่พบธุรกรรม")
    db.delete(transaction)
    db.commit()
    return {"ok": True}


@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="ต้องอัปโหลดไฟล์ .csv เท่านั้น")

    content = await file.read()
    rows = parse_bank_csv(content)

    if not rows:
        raise HTTPException(status_code=422, detail="ไม่พบข้อมูลในไฟล์ หรือรูปแบบ CSV ไม่รองรับ")

    imported = 0
    for row in rows:
        description = row.get("note") or ""
        category = categorize(description)
        transaction = Transaction(
            user_id=current_user.id,
            amount=row["amount"],
            transaction_type=row["transaction_type"],
            transaction_date=row["transaction_date"],
            bank_name=row.get("bank_name"),
            note=description,
            category=category,
            sender_name=row.get("sender_name"),
            receiver_name=row.get("receiver_name"),
        )
        db.add(transaction)
        imported += 1

    db.commit()
    return {"imported": imported, "bank": rows[0].get("bank_name") if rows else None}
