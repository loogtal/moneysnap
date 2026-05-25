from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db, _is_sqlite
from backend.models import User
from backend.auth_utils import create_token, get_current_user

router = APIRouter()


class LoginRequest(BaseModel):
    provider: str
    provider_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    picture: Optional[str] = None


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.provider == req.provider,
        User.provider_id == req.provider_id,
    ).first()

    if user:
        if req.name is not None:
            user.name = req.name
        if req.email is not None:
            user.email = req.email
        if req.picture is not None:
            user.picture = req.picture
        db.commit()
        db.refresh(user)
    else:
        user = User(
            provider=req.provider,
            provider_id=req.provider_id,
            name=req.name,
            email=req.email,
            picture=req.picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token(user.id)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "picture": user.picture,
            "provider": user.provider,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month = datetime.now().strftime("%Y-%m")
    date_expr = "strftime('%Y-%m', transaction_date)" if _is_sqlite else "to_char(transaction_date, 'YYYY-MM')"

    row = db.execute(
        text(
            f"SELECT COUNT(*) AS total_count, "
            f"SUM(CASE WHEN transaction_type='income' THEN amount ELSE 0 END) AS income, "
            f"SUM(CASE WHEN transaction_type='expense' THEN amount ELSE 0 END) AS expense, "
            f"COUNT(DISTINCT {date_expr}) AS active_months "
            f"FROM transactions WHERE user_id = :uid"
        ),
        {"uid": current_user.id},
    ).first()

    month_row = db.execute(
        text(
            f"SELECT COUNT(*) AS count, "
            f"SUM(CASE WHEN transaction_type='income' THEN amount ELSE 0 END) AS income, "
            f"SUM(CASE WHEN transaction_type='expense' THEN amount ELSE 0 END) AS expense "
            f"FROM transactions WHERE user_id = :uid AND {date_expr} = :month"
        ),
        {"uid": current_user.id, "month": month},
    ).first()

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "picture": current_user.picture,
        "provider": current_user.provider,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "all_time": {
            "total_count": int(row.total_count or 0),
            "income": float(row.income or 0),
            "expense": float(row.expense or 0),
            "active_months": int(row.active_months or 0),
        },
        "this_month": {
            "month": month,
            "count": int(month_row.count or 0),
            "income": float(month_row.income or 0),
            "expense": float(month_row.expense or 0),
        },
    }
