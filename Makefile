.PHONY: install-backend install-frontend start-backend start-frontend

install-backend:
	cd backend && python3 -m venv .venv && ./.venv/bin/python -m pip install --upgrade pip setuptools wheel && ./.venv/bin/python -m pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

start-backend:
	cd backend && PYTHONPATH=".." ./.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

start-frontend:
	cd frontend && npx expo start
