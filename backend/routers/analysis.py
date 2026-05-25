from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db, _is_sqlite
from backend.models import TipsCache, User
from backend.auth_utils import get_current_user
from backend.services.ai_service import get_spending_tips

router = APIRouter()


@router.get("/monthly")
def monthly_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    date_expr = "strftime('%Y-%m', transaction_date)" if _is_sqlite else "to_char(transaction_date, 'YYYY-MM')"
    result = db.execute(
        text(
            f"SELECT {date_expr} AS month, transaction_type, category, "
            f"SUM(amount) AS total, COUNT(*) AS count "
            f"FROM transactions WHERE user_id = :uid "
            f"GROUP BY {date_expr}, transaction_type, category "
            f"ORDER BY month DESC"
        ),
        {"uid": current_user.id},
    )
    return {"summary": [dict(row._mapping) for row in result]}


@router.post("/ai-tips")
def ai_tips(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month = payload.get("month")
    if not month:
        raise HTTPException(status_code=400, detail="ต้องระบุเดือนในรูปแบบ YYYY-MM")

    cache_key = f"{current_user.id}_{month}"
    cached = db.query(TipsCache).filter(TipsCache.month == cache_key).first()
    if cached:
        return {"month": month, "tips": cached.tips, "cached": True}

    date_expr = "strftime('%Y-%m', transaction_date)" if _is_sqlite else "to_char(transaction_date, 'YYYY-MM')"
    result = db.execute(
        text(
            f"SELECT category, SUM(amount) AS total, COUNT(*) AS count "
            f"FROM transactions WHERE {date_expr} = :month AND user_id = :uid "
            f"GROUP BY category"
        ),
        {"month": month, "uid": current_user.id},
    )
    monthly_data = [dict(row._mapping) for row in result]

    try:
        tips = get_spending_tips({"month": month, "categories": monthly_data})
    except Exception:
        tips = ""

    if tips:
        db.merge(TipsCache(month=cache_key, tips=tips))
        db.commit()

    return {"month": month, "tips": tips, "summary": monthly_data}


@router.delete("/ai-tips/{month}")
def clear_tips_cache(
    month: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cache_key = f"{current_user.id}_{month}"
    db.query(TipsCache).filter(TipsCache.month == cache_key).delete()
    db.commit()
    return {"ok": True, "month": month}
