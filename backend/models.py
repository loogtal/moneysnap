from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func

from backend.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
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
