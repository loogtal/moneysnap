import sys
from contextlib import asynccontextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import slips, transactions, analysis, auth, budgets, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.database import init_db
    init_db()
    yield


app = FastAPI(title="MoneySnap", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(slips.router, prefix="/api/slips", tags=["slips"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


@app.get("/health")
def health():
    return {"ok": True}
