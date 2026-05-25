import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./moneysnap.db")

# Railway PostgreSQL URLs start with postgres:// — SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _create_monthly_summary_view(connection):
    if _is_sqlite:
        connection.execute(text(
            """
            CREATE VIEW IF NOT EXISTS monthly_summary AS
            SELECT
                strftime('%Y-%m', transaction_date) AS month,
                transaction_type,
                category,
                SUM(amount) AS total,
                COUNT(*) AS count
            FROM transactions
            GROUP BY month, transaction_type, category;
            """
        ))
    else:
        connection.execute(text(
            """
            CREATE OR REPLACE VIEW monthly_summary AS
            SELECT
                to_char(transaction_date, 'YYYY-MM') AS month,
                transaction_type,
                category,
                SUM(amount) AS total,
                COUNT(*) AS count
            FROM transactions
            GROUP BY to_char(transaction_date, 'YYYY-MM'), transaction_type, category;
            """
        ))


def init_db() -> None:
    from backend.models import Transaction, TipsCache  # noqa: F401 — ensure all tables are registered
    Base.metadata.create_all(bind=engine)
    with engine.connect() as connection:
        _create_monthly_summary_view(connection)
        connection.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
