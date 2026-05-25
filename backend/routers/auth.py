from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.auth_utils import create_token

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
        },
    }


@router.get("/me")
def me(db: Session = Depends(get_db)):
    from backend.auth_utils import get_current_user
    # This endpoint is kept simple; use get_current_user as dependency in routes
    return {"ok": True}
