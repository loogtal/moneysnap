from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Transaction

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
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)

    if year and month:
        query = query.filter(func.strftime("%Y", Transaction.transaction_date) == str(year))
        query = query.filter(func.strftime("%m", Transaction.transaction_date) == f"{month:02d}")
    elif year:
        query = query.filter(func.strftime("%Y", Transaction.transaction_date) == str(year))

    if category:
        query = query.filter(Transaction.category == category)
    if type:
        query = query.filter(Transaction.transaction_type == type)

    total = query.count()
    items = (
        query.order_by(Transaction.transaction_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"page": page, "page_size": page_size, "total": total, "results": [_serialize(t) for t in items]}


@router.get("/{transaction_id}")
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="ไม่พบธุรกรรม")
    return _serialize(transaction)


@router.patch("/{transaction_id}")
def update_transaction(transaction_id: int, update: TransactionUpdate, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
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
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="ไม่พบธุรกรรม")
    db.delete(transaction)
    db.commit()
    return {"ok": True}
