from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False)         # "google", "apple", "guest"
    provider_id = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TipsCache(Base):
    __tablename__ = "tips_cache"
    # month is stored as "{user_id}_{YYYY-MM}" to support per-user caching
    # without requiring a schema migration on the existing table
    month = Column(String, primary_key=True)
    tips = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    slip_image_path = Column(String, nullable=True)
    sender_name = Column(String, nullable=True)
    receiver_name = Column(String, nullable=True)
    amount = Column(Float, nullable=False, default=0.0)
    bank_name = Column(String, nullable=True)
    transaction_date = Column(DateTime, nullable=True)
    transaction_type = Column(String, nullable=True)
    category = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
