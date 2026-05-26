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


def _run_migrations(connection):
    """Apply schema migrations for existing deployments."""
    # Add user_id to transactions if the column is missing
    try:
        connection.execute(text("ALTER TABLE transactions ADD COLUMN user_id INTEGER"))
        connection.commit()
    except Exception:
        connection.rollback()

    # Recreate monthly_summary view (idempotent via CREATE OR REPLACE / IF NOT EXISTS)
    if _is_sqlite:
        connection.execute(text("DROP VIEW IF EXISTS monthly_summary"))
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
    connection.commit()


def init_db() -> None:
    from backend.models import User, Transaction, TipsCache, Budget  # noqa: F401
    Base.metadata.create_all(bind=engine)
    with engine.connect() as connection:
        _run_migrations(connection)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
