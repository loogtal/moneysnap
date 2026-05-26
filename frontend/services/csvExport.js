import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function exportTransactionsCSV({ transactions, month, language }) {
  const isEn = language === "en";

  const headers = isEn
    ? ["Date", "Receiver", "Sender", "Amount", "Type", "Category", "Bank", "Note"]
    : ["วันที่", "ผู้รับ", "ผู้ส่ง", "จำนวนเงิน", "ประเภท", "หมวดหมู่", "ธนาคาร", "หมายเหตุ"];

  const CAT = isEn
    ? { food: "Food", shopping: "Shopping", transport: "Transport", bills: "Bills", health: "Health", entertainment: "Entertainment", other: "Other" }
    : { food: "อาหาร", shopping: "ช้อปปิ้ง", transport: "การเดินทาง", bills: "บิล", health: "สุขภาพ", entertainment: "บันเทิง", other: "อื่นๆ" };

  function esc(val) {
    if (val == null) return "";
    const s = String(val).replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  }

  const rows = transactions
    .slice()
    .sort((a, b) => (b.transaction_date ?? "").localeCompare(a.transaction_date ?? ""))
    .map((tx) => [
      esc(tx.transaction_date?.slice(0, 10) ?? ""),
      esc(tx.receiver_name ?? ""),
      esc(tx.sender_name ?? ""),
      esc(tx.amount?.toFixed(2) ?? "0.00"),
      esc(tx.transaction_type === "income" ? (isEn ? "Income" : "รายรับ") : (isEn ? "Expense" : "รายจ่าย")),
      esc(CAT[tx.category] ?? tx.category ?? ""),
      esc(tx.bank_name ?? ""),
      esc(tx.note ?? ""),
    ].join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const filename = `moneysnap_${month}.csv`;
  const fileUri = FileSystem.cacheDirectory + filename;

  await FileSystem.writeAsStringAsync(fileUri, "﻿" + csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: `MoneySnap ${month}`,
      UTI: "public.comma-separated-values-text",
    });
  }
}
