# SlipSense AI

Full-stack AI receipt/slip scanning app for Thai bank transfer slips.

## Required tools

- Python 3.11
- Node.js + npm
- Expo CLI (optional, can run with `npx expo start`)

## Backend setup

```bash
cd "/Users/loogtal/SlipSense AI/backend"
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
```

### Run backend

จาก root project:

```bash
cd "/Users/loogtal/SlipSense AI"
./backend/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

หรือจาก backend folder:

```bash
cd "/Users/loogtal/SlipSense AI/backend"
PYTHONPATH=".." ./.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

## Frontend setup

```bash
cd "/Users/loogtal/SlipSense AI/frontend"
npm install
```

### Run frontend

```bash
cd "/Users/loogtal/SlipSense AI/frontend"
npx expo start
```

## Quick start

จาก root project ให้ใช้ Makefile:

```bash
cd "/Users/loogtal/SlipSense AI"
make install-backend
make install-frontend
make start-backend
# ใน terminal อื่น:
make start-frontend
```

## Notes

- ตั้งค่า `ANTHROPIC_API_KEY` ใน environment เพื่อให้ AI tips ทำงาน
- backend จะให้ API ที่ `http://127.0.0.1:8000`
- frontend จะเชื่อมต่อกับ backend ผ่าน `frontend/config.js`
