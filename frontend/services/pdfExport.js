import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const CAT_LABELS = {
  th: {
    food: "อาหาร", shopping: "ช้อปปิ้ง", transport: "การเดินทาง",
    bills: "บิล/ค่าใช้จ่าย", health: "สุขภาพ", entertainment: "บันเทิง", other: "อื่นๆ",
  },
  en: {
    food: "Food", shopping: "Shopping", transport: "Transport",
    bills: "Bills", health: "Health", entertainment: "Entertainment", other: "Other",
  },
};

function catLabel(cat, lang) {
  return CAT_LABELS[lang]?.[cat] ?? CAT_LABELS.en[cat] ?? cat;
}

export async function exportMonthlyReport({ transactions, month, language, userName }) {
  const lang = language === "th" ? "th" : "en";
  const isEn = lang === "en";

  const income = transactions.filter((t) => t.transaction_type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const expense = transactions.filter((t) => t.transaction_type !== "income").reduce((s, t) => s + (t.amount || 0), 0);
  const net = income - expense;

  const dateLocale = isEn ? "en-US" : "th-TH";
  const monthLabel = new Date(month + "-01").toLocaleDateString(dateLocale, { year: "numeric", month: "long" });
  const nowLabel = new Date().toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" });

  const rows = transactions
    .slice()
    .sort((a, b) => (b.transaction_date ?? "").localeCompare(a.transaction_date ?? ""))
    .map((t) => {
      const isIncome = t.transaction_type === "income";
      const colorClass = isIncome ? "green" : "red";
      const sign = isIncome ? "+" : "-";
      const cat = catLabel(t.category || "other", lang);
      const date = t.transaction_date?.slice(0, 10) ?? (isEn ? "No date" : "ไม่ระบุ");
      const name = t.receiver_name || (isEn ? "Unknown" : "ไม่ระบุ");
      return `<tr>
        <td>${date}</td>
        <td>${name}</td>
        <td class="${colorClass}">${isEn ? (isIncome ? "Income" : "Expense") : (isIncome ? "รายรับ" : "รายจ่าย")}</td>
        <td>${cat}</td>
        <td class="${colorClass}" style="text-align:right">${sign}฿${(t.amount ?? 0).toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  const L = isEn
    ? { income: "Income", expense: "Expense", net: "Net", txSection: "Transactions", date: "Date", desc: "Description", type: "Type", category: "Category", amount: "Amount" }
    : { income: "รายรับ", expense: "รายจ่าย", net: "คงเหลือ", txSection: "รายการธุรกรรม", date: "วันที่", desc: "รายละเอียด", type: "ประเภท", category: "หมวดหมู่", amount: "จำนวนเงิน" };

  const netColor = net >= 0 ? "green" : "red";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; padding: 28px 24px; font-size: 13px; }
    h1 { color: #2d6cdf; font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
    .summary { display: flex; gap: 10px; margin-bottom: 24px; }
    .box { flex: 1; border: 1px solid #e0e7ff; border-radius: 10px; padding: 14px; text-align: center; background: #f8f9ff; }
    .box-label { font-size: 11px; color: #888; margin-bottom: 4px; }
    .box-value { font-size: 18px; font-weight: 800; }
    .green { color: #16a34a; } .red { color: #ef4444; } .blue { color: #2d6cdf; }
    .section-title { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; font-size: 11px; font-weight: 700; text-align: left; padding: 7px 8px; border-bottom: 2px solid #e0e7ff; color: #555; }
    td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; font-size: 12px; vertical-align: middle; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 28px; font-size: 11px; color: #aaa; text-align: center; }
  </style>
</head>
<body>
  <h1>MoneySnap</h1>
  <div class="sub">${L.txSection} · ${monthLabel}${userName ? " · " + userName : ""} · ${nowLabel}</div>

  <div class="summary">
    <div class="box">
      <div class="box-label">${L.income}</div>
      <div class="box-value green">฿${income.toFixed(0)}</div>
    </div>
    <div class="box">
      <div class="box-label">${L.expense}</div>
      <div class="box-value red">฿${expense.toFixed(0)}</div>
    </div>
    <div class="box">
      <div class="box-label">${L.net}</div>
      <div class="box-value ${netColor}">฿${Math.abs(net).toFixed(0)}</div>
    </div>
  </div>

  <div class="section-title">${L.txSection} (${transactions.length})</div>
  <table>
    <thead>
      <tr>
        <th>${L.date}</th>
        <th>${L.desc}</th>
        <th>${L.type}</th>
        <th>${L.category}</th>
        <th style="text-align:right">${L.amount}</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5" style="text-align:center;color:#888;padding:16px">${isEn ? "No transactions" : "ไม่มีรายการ"}</td></tr>`}
    </tbody>
  </table>

  <div class="footer">Generated by MoneySnap</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `MoneySnap ${monthLabel}`,
      UTI: "com.adobe.pdf",
    });
  }
}
