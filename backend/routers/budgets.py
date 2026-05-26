from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db, _is_sqlite
from backend.models import Budget, User
from backend.auth_utils import get_current_user

router = APIRouter()

CATEGORIES = ["food", "shopping", "transport", "bills", "health", "entertainment", "other"]


class BudgetSet(BaseModel):
    amount: float


@router.get("")
def get_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month = datetime.now().strftime("%Y-%m")
    date_expr = "strftime('%Y-%m', transaction_date)" if _is_sqlite else "to_char(transaction_date, 'YYYY-MM')"

    spent_rows = db.execute(
        text(
            f"SELECT category, SUM(amount) AS spent FROM transactions "
            f"WHERE user_id = :uid AND transaction_type = 'expense' AND {date_expr} = :month "
            f"GROUP BY category"
        ),
        {"uid": current_user.id, "month": month},
    ).fetchall()
    spent_map = {row.category: float(row.spent or 0) for row in spent_rows}

    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    budget_map = {b.category: b.amount for b in budgets}

    result = []
    for cat in CATEGORIES:
        budget_amt = budget_map.get(cat)
        spent = spent_map.get(cat, 0.0)
        result.append({
            "category": cat,
            "budget": budget_amt,
            "spent": spent,
            "percent": round((spent / budget_amt * 100) if budget_amt else 0, 1),
        })
    return {"month": month, "budgets": result}


@router.put("/{category}")
def set_budget(
    category: str,
    body: BudgetSet,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if category not in CATEGORIES:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid category")

    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category == category,
    ).first()

    if existing:
        existing.amount = body.amount
    else:
        db.add(Budget(user_id=current_user.id, category=category, amount=body.amount))
    db.commit()
    return {"ok": True, "category": category, "amount": body.amount}


@router.delete("/{category}")
def delete_budget(
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category == category,
    ).delete()
    db.commit()
    return {"ok": True}
