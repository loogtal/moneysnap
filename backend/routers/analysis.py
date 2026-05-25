from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db
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

    result = db.execute(
        text(
            "SELECT category, SUM(amount) AS total, COUNT(*) AS count "
            "FROM transactions WHERE strftime('%Y-%m', transaction_date) = :month "
            "GROUP BY category"
        ),
        {"month": month},
    )
    monthly_data = [dict(row._mapping) for row in result]
    tips = get_spending_tips({"month": month, "categories": monthly_data})
    return {"month": month, "tips": tips, "summary": monthly_data}
