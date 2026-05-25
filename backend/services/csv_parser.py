import csv
import io
from datetime import datetime
from typing import Optional


def _clean_amount(value: str) -> float:
    if not value:
        return 0.0
    return float(value.replace(",", "").strip() or 0)


def _parse_date(value: str) -> Optional[datetime]:
    value = value.strip()
    formats = [
        "%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d",
        "%d-%m-%Y", "%d %b %Y", "%Y/%m/%d",
        "%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(value.split(" ")[0] if len(value) > 10 and " " in value else value, fmt.split(" ")[0])
        except ValueError:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    return None


def _detect_bank_and_columns(headers: list[str]) -> dict:
    lowered = [h.lower().strip() for h in headers]

    def has(keyword):
        return any(keyword in h for h in lowered)

    if has("เดบิต") or has("เครดิต") or has("debit") or has("credit"):
        if has("เกียรตินาคิน") or has("knk"):
            bank = "KKP"
        elif has("กสิกร") or has("kasikorn") or has("kbank"):
            bank = "KBank"
        elif has("ไทยพาณิชย์") or has("scb"):
            bank = "SCB"
        elif has("กรุงเทพ") or has("bangkok") or has("bbl"):
            bank = "BBL"
        elif has("ทหารไทย") or has("ttb") or has("tmb"):
            bank = "TTB"
        elif has("กรุงไทย") or has("ktb"):
            bank = "KTB"
        else:
            bank = "Unknown"

        col_map = {}
        for i, h in enumerate(lowered):
            if "วันที่" in h or "date" in h:
                col_map.setdefault("date", i)
            if "รายละเอียด" in h or "รายการ" in h or "description" in h or "detail" in h:
                col_map.setdefault("description", i)
            if ("เดบิต" in h or "debit" in h or "ถอน" in h or "withdrawal" in h) and "จำนวน" in h or h in ("เดบิต", "debit", "withdrawal", "ถอน"):
                col_map.setdefault("debit", i)
            if ("เครดิต" in h or "credit" in h or "ฝาก" in h or "deposit" in h) and "จำนวน" in h or h in ("เครดิต", "credit", "deposit", "ฝาก"):
                col_map.setdefault("credit", i)

        return {"bank": bank, "col_map": col_map}

    return {"bank": "Unknown", "col_map": {}}


def parse_bank_csv(content: bytes) -> list[dict]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("tis-620", errors="replace")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)

    header_idx = None
    headers = []
    for i, row in enumerate(rows):
        joined = " ".join(row).lower()
        if ("วันที่" in joined or "date" in joined) and ("เดบิต" in joined or "debit" in joined or "ถอน" in joined or "เครดิต" in joined or "credit" in joined or "ฝาก" in joined):
            header_idx = i
            headers = row
            break

    if header_idx is None:
        return []

    info = _detect_bank_and_columns(headers)
    col_map = info["col_map"]
    bank = info["bank"]

    if "date" not in col_map:
        return []

    transactions = []
    for row in rows[header_idx + 1:]:
        if not row or all(cell.strip() == "" for cell in row):
            continue
        if len(row) <= max(col_map.values(), default=0):
            continue

        date_val = row[col_map["date"]].strip() if "date" in col_map else ""
        description = row[col_map["description"]].strip() if "description" in col_map else ""
        debit = _clean_amount(row[col_map["debit"]]) if "debit" in col_map else 0.0
        credit = _clean_amount(row[col_map["credit"]]) if "credit" in col_map else 0.0

        if debit == 0 and credit == 0:
            continue

        parsed_date = _parse_date(date_val)
        if not parsed_date:
            continue

        amount = debit if debit > 0 else credit
        tx_type = "expense" if debit > 0 else "income"

        transactions.append({
            "transaction_date": parsed_date,
            "amount": amount,
            "transaction_type": tx_type,
            "bank_name": bank,
            "note": description,
            "sender_name": None,
            "receiver_name": None,
        })

    return transactions
