import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export async function shareMonthSummary({ month, income, expense, net, byCategory, language }) {
  const isEn = language === "en";
  const title = isEn ? `MoneySnap — ${month}` : `MoneySnap — สรุปเดือน ${month}`;
  const incomeLabel = isEn ? "Income" : "รายรับ";
  const expenseLabel = isEn ? "Expense" : "รายจ่าย";
  const netLabel = isEn ? "Net" : "คงเหลือ";
  const topLabel = isEn ? "Top Spending" : "ค่าใช้จ่ายสูงสุด";
  const netColor = net >= 0 ? "#16a34a" : "#ef4444";
  const fmt = (n) => `฿${Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;

  const CAT_TH = { food: "อาหาร", shopping: "ช้อปปิ้ง", transport: "การเดินทาง", bills: "บิล", health: "สุขภาพ", entertainment: "บันเทิง", other: "อื่นๆ" };
  const CAT_EN = { food: "Food", shopping: "Shopping", transport: "Transport", bills: "Bills", health: "Health", entertainment: "Entertainment", other: "Other" };
  const CAT = isEn ? CAT_EN : CAT_TH;
  const CAT_COLOR = { food: "#f97316", shopping: "#8b5cf6", transport: "#14b8a6", bills: "#0ea5e9", health: "#ec4899", entertainment: "#facc15", other: "#6b7280" };

  const topCats = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxCat = topCats[0]?.[1] || 1;

  const catRows = topCats.map(([key, val]) => {
    const pct = Math.round((val / maxCat) * 100);
    const color = CAT_COLOR[key] || "#6b7280";
    const label = CAT[key] || key;
    return `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:13px;color:#555">${label}</span>
          <span style="font-size:13px;font-weight:700;color:#111">${fmt(val)}</span>
        </div>
        <div style="height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
        </div>
      </div>`;
  }).join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, 'Helvetica Neue', sans-serif; margin: 0; background: #f8f9ff; }
  .card { background: white; border-radius: 20px; margin: 20px; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .logo { font-size: 28px; font-weight: 900; color: #2d6cdf; text-align: center; margin-bottom: 4px; }
  .month { font-size: 14px; color: #888; text-align: center; margin-bottom: 24px; }
  .row { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { flex: 1; background: #f8f9ff; border-radius: 14px; padding: 14px; text-align: center; }
  .stat-label { font-size: 11px; color: #888; margin-bottom: 6px; }
  .stat-value { font-size: 22px; font-weight: 800; }
  .section-title { font-size: 13px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
  .footer { text-align: center; font-size: 11px; color: #bbb; margin-top: 20px; }
</style></head>
<body>
<div class="card">
  <div class="logo">💰 MoneySnap</div>
  <div class="month">${month}</div>
  <div class="row">
    <div class="stat">
      <div class="stat-label">${incomeLabel}</div>
      <div class="stat-value" style="color:#16a34a">${fmt(income)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">${expenseLabel}</div>
      <div class="stat-value" style="color:#ef4444">${fmt(expense)}</div>
    </div>
  </div>
  <div class="stat" style="text-align:center;background:#f8f9ff;border-radius:14px;padding:14px;margin-bottom:20px">
    <div class="stat-label">${netLabel}</div>
    <div class="stat-value" style="color:${netColor}">${net >= 0 ? "+" : "-"}${fmt(net)}</div>
  </div>
  ${topCats.length > 0 ? `<div class="section-title">${topLabel}</div>${catRows}` : ""}
  <div class="footer">MoneySnap · ${new Date().toLocaleDateString(isEn ? "en-US" : "th-TH", { year: "numeric", month: "long", day: "numeric" })}</div>
</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html, width: 400, height: 650 });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
  }
}
