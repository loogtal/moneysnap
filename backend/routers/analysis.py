from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db, _is_sqlite
from backend.models import TipsCache
from backend.services.ai_service import get_spending_tips

router = APIRouter()


@router.get("/monthly")
def monthly_summary(db: Session = Depends(get_db)):
    result = db.execute(
        text("SELECT month, transaction_type, category, total, count FROM monthly_summary ORDER BY month DESC")
    )
    return {"summary": [dict(row._mapping) for row in result]}


@router.post("/ai-tips")
def ai_tips(payload: dict, db: Session = Depends(get_db)):
    month = payload.get("month")
    if not month:
        raise HTTPException(status_code=400, detail="ต้องระบุเดือนในรูปแบบ YYYY-MM")

    # Check persistent DB cache first
    cached = db.query(TipsCache).filter(TipsCache.month == month).first()
    if cached:
        return {"month": month, "tips": cached.tips, "cached": True}

    date_expr = "strftime('%Y-%m', transaction_date)" if _is_sqlite else "to_char(transaction_date, 'YYYY-MM')"
    result = db.execute(
        text(
            f"SELECT category, SUM(amount) AS total, COUNT(*) AS count "
            f"FROM transactions WHERE {date_expr} = :month "
            f"GROUP BY category"
        ),
        {"month": month},
    )
    monthly_data = [dict(row._mapping) for row in result]
    try:
        tips = get_spending_tips({"month": month, "categories": monthly_data})
    except Exception:
        tips = ""

    # Cache result (even if empty) so we don't retry Gemini on every request
    db.merge(TipsCache(month=month, tips=tips))
    db.commit()

    return {"month": month, "tips": tips, "summary": monthly_data}


@router.delete("/ai-tips/{month}")
def clear_tips_cache(month: str, db: Session = Depends(get_db)):
    """Clear cached tips for a month so AI regenerates fresh tips."""
    db.query(TipsCache).filter(TipsCache.month == month).delete()
    db.commit()
    return {"ok": True, "month": month}
