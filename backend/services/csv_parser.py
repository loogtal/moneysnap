import csv
import io
import re
from datetime import datetime
from typing import Optional


def _clean_amount(value: str) -> float:
    if not value:
        return 0.0
    cleaned = re.sub(r"[^\d.]", "", value.replace(",", ""))
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def _parse_date(value: str) -> Optional[datetime]:
    value = value.strip()
    if not value:
        return None

    # Normalize separators
    value = re.sub(r"[.\-]", "/", value)
    # Take only the date part if datetime
    date_part = value.split(" ")[0].split("T")[0]
    parts = date_part.split("/")

    if len(parts) == 3:
        try:
            a, b, c = int(parts[0]), int(parts[1]), int(parts[2])
        except ValueError:
            pass
        else:
            # Detect Buddhist Era (year > 2500) in any position
            if c > 2500:
                c -= 543
            elif a > 2500:
                a -= 543
            # Year heuristic: 4-digit in position c → DD/MM/YYYY
            if c > 31:
                day, month, year = a, b, c
            # 4-digit in position a → YYYY/MM/DD
            elif a > 31:
                year, month, day = a, b, c
            else:
                day, month, year = a, b, c
            if year < 100:
                year += 2000
            try:
                return datetime(year, month, day)
            except ValueError:
                pass

    for fmt in ("%d/%m/%Y", "%Y/%m/%d", "%d/%m/%y"):
        try:
            return datetime.strptime(date_part, fmt)
        except ValueError:
            continue
    return None


# Keyword sets for each bank
_BANK_KEYWORDS = {
    "KBank": ["กสิกร", "kasikorn", "kbank"],
    "SCB": ["ไทยพาณิชย์", "scb", "siam commercial"],
    "BBL": ["กรุงเทพ", "bangkok bank", "bbl"],
    "KTB": ["กรุงไทย", "krungthai", "ktb"],
    "TTB": ["ทหารไทย", "ธนชาต", "ttb", "tmb"],
    "BAY": ["กรุงศรี", "ayudhya", "bay", "krungsri"],
    "CIMB": ["cimb"],
    "UOB": ["uob", "ยูโอบี"],
    "GSB": ["ออมสิน", "gsb", "government savings"],
    "BAAC": ["ธกส", "baac", "agriculture"],
    "KKP": ["เกียรตินาคิน", "knk", "kkp"],
}


def _detect_bank(text: str) -> str:
    lower = text.lower()
    for bank, keywords in _BANK_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return bank
    return "Unknown"


def _detect_columns(headers: list[str]) -> dict:
    lowered = [h.lower().strip() for h in headers]
    col_map = {}
    for i, h in enumerate(lowered):
        if "วันที่" in h or "date" in h or "เวลา" in h:
            col_map.setdefault("date", i)
        if any(w in h for w in ["รายละเอียด", "รายการ", "description", "detail", "note", "รายรับรายจ่าย", "channel"]):
            col_map.setdefault("description", i)
        if any(w in h for w in ["เดบิต", "debit", "ถอน", "withdrawal", "จ่าย", "รายจ่าย"]):
            col_map.setdefault("debit", i)
        if any(w in h for w in ["เครดิต", "credit", "ฝาก", "deposit", "รับ", "รายรับ"]):
            col_map.setdefault("credit", i)
        if "จำนวน" in h and "debit" not in col_map and "credit" not in col_map:
            col_map.setdefault("amount", i)
        if any(w in h for w in ["ประเภท", "type", "transaction type"]):
            col_map.setdefault("tx_type", i)
    return col_map


def _extract_receiver(description: str) -> Optional[str]:
    """Best-effort extraction of a receiver name from Thai bank description text."""
    if not description:
        return None
    # Patterns like "โอนเงิน ไปยัง [account] ชื่อ" or "ผู้รับ: Name"
    for pattern in [
        r"ผู้รับ[:\s]+(.+)",
        r"ไปยัง\s+\S+\s+(.+)",
        r"TO\s+\S+\s+(.+)",
        r"TRANSFER TO\s+(.+)",
    ]:
        m = re.search(pattern, description, re.IGNORECASE)
        if m:
            name = m.group(1).strip()
            if 2 <= len(name) <= 60:
                return name
    return None


def _is_footer_row(row: list[str]) -> bool:
    """Skip summary/total rows that appear at the bottom of statements."""
    joined = " ".join(row).lower()
    return any(w in joined for w in ["ยอดรวม", "total", "รวม", "grand total", "subtotal", "balance forward"])


def parse_bank_csv(content: bytes) -> list[dict]:
    # Try common encodings
    for encoding in ("utf-8-sig", "utf-8", "tis-620", "cp874"):
        try:
            text = content.decode(encoding)
            break
        except (UnicodeDecodeError, LookupError):
            continue
    else:
        text = content.decode("utf-8", errors="replace")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return []

    # Detect bank from first few rows of the file
    header_text = " ".join(" ".join(r) for r in rows[:8])
    bank = _detect_bank(header_text)

    # Find the header row (first row containing date + debit/credit keywords)
    header_idx = None
    headers = []
    for i, row in enumerate(rows):
        joined = " ".join(row).lower()
        has_date = "วันที่" in joined or "date" in joined
        has_amount = any(w in joined for w in ["เดบิต", "debit", "เครดิต", "credit", "ถอน", "ฝาก", "จำนวน"])
        if has_date and has_amount:
            header_idx = i
            headers = row
            break

    if header_idx is None or not headers:
        return []

    col_map = _detect_columns(headers)
    if "date" not in col_map:
        return []

    transactions = []
    for row in rows[header_idx + 1:]:
        if not row or all(cell.strip() == "" for cell in row):
            continue
        if _is_footer_row(row):
            continue
        if len(row) <= max(col_map.values(), default=0):
            continue

        date_val = row[col_map["date"]].strip() if "date" in col_map else ""
        description = row[col_map["description"]].strip() if "description" in col_map else ""
        debit = _clean_amount(row[col_map["debit"]]) if "debit" in col_map else 0.0
        credit = _clean_amount(row[col_map["credit"]]) if "credit" in col_map else 0.0

        # Some banks use a single amount + type column
        if debit == 0 and credit == 0 and "amount" in col_map:
            raw_amount = _clean_amount(row[col_map["amount"]])
            if "tx_type" in col_map:
                tx_type_str = row[col_map["tx_type"]].lower().strip()
                if any(w in tx_type_str for w in ["debit", "ถอน", "จ่าย", "expense", "dr"]):
                    debit = raw_amount
                else:
                    credit = raw_amount
            else:
                # Negative amounts → debit
                raw_cell = row[col_map["amount"]].strip()
                if raw_cell.startswith("-"):
                    debit = raw_amount
                else:
                    credit = raw_amount

        if debit == 0 and credit == 0:
            continue

        parsed_date = _parse_date(date_val)
        if not parsed_date:
            continue

        amount = debit if debit > 0 else credit
        tx_type = "expense" if debit > 0 else "income"
        receiver_name = _extract_receiver(description)

        transactions.append({
            "transaction_date": parsed_date,
            "amount": amount,
            "transaction_type": tx_type,
            "bank_name": bank,
            "note": description,
            "sender_name": None,
            "receiver_name": receiver_name,
        })

    return transactions
