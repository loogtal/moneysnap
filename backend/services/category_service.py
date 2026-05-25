CATEGORY_KEYWORDS = {
    "food": ["ร้านอาหาร", "ข้าว", "coffee", "กาแฟ", "ส้มตำ", "ก๋วยเตี๋ยว", "pizza", "mcd", "kfc", "อาหาร"],
    "shopping": ["mall", "lazada", "shopee", "เซ็นทรัล", "โลตัส", "bigc", "makro", "ช้อปปิ้ง", "แฟชั่น"],
    "transport": ["grab", "bolt", "แท็กซี่", "bts", "mrt", "น้ำมัน", "ปตท", "รถไฟ", "มอเตอร์ไซค์"],
    "bills": ["ค่าไฟ", "ค่าน้ำ", "ค่าเน็ต", "ค่าโทรศัพท์", "ais", "dtac", "true", "bill", "บิล"],
    "health": ["โรงพยาบาล", "คลินิก", "ร้านยา", "hospital", "pharmacy", "เภสัช"],
    "entertainment": ["netflix", "spotify", "cinema", "โรงหนัง", "คาราโอเกะ", "บันเทิง", "movie"],
}


def categorize(text: str) -> str:
    text_lower = text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw.lower() in text_lower for kw in keywords):
            return category
    return "other"
