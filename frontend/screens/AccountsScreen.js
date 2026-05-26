import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../contexts/AppContext";

const ACCOUNTS_KEY = "wallet_accounts";
const CURRENCY_CACHE_KEY = "currency_rates_cache";
const CURRENCIES = ["THB","USD","EUR","JPY","GBP","CNY","SGD","AUD","KRW","MYR","HKD"];
const EMOJIS = ["💳","🏦","💵","💴","💶","🏧","💰","🐖","🎰","🌐","✈️","🏠"];

const EMPTY_FORM = { name: "", currency: "THB", balance: "", emoji: "💳" };

export default function AccountsScreen() {
  const { colors, t, language } = useApp();
  const [accounts, setAccounts] = useState([]);
  const [rates, setRates] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { loadAccounts(); loadRates(); }, []);

  async function loadAccounts() {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY).catch(() => null);
    if (raw) setAccounts(JSON.parse(raw));
  }

  async function loadRates() {
    try {
      const cached = await AsyncStorage.getItem(CURRENCY_CACHE_KEY).catch(() => null);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (parsed.ts || 0);
        if (parsed.rates && age < 24 * 60 * 60 * 1000) {
          setRates(parsed.rates);
          return;
        }
      }
      const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      if (json.result === "success" && json.rates) {
        setRates(json.rates);
        await AsyncStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify({ rates: json.rates, ts: Date.now() })).catch(() => {});
      }
    } catch {}
  }

  async function save(list) {
    setAccounts(list);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)).catch(() => {});
  }

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(acc) {
    setEditId(acc.id);
    setForm({ name: acc.name, currency: acc.currency, balance: String(acc.balance), emoji: acc.emoji });
    setModalVisible(true);
  }

  function handleSave() {
    const bal = parseFloat(form.balance);
    if (!form.name.trim()) { Alert.alert(t("error"), t("accountNameRequired")); return; }
    if (isNaN(bal) || bal < 0) { Alert.alert(t("error"), t("invalidAmount")); return; }
    if (editId) {
      save(accounts.map((a) => a.id === editId ? { ...a, name: form.name.trim(), currency: form.currency, balance: bal, emoji: form.emoji } : a));
    } else {
      save([...accounts, { id: Date.now().toString(), name: form.name.trim(), currency: form.currency, balance: bal, emoji: form.emoji }]);
    }
    setModalVisible(false);
  }

  function handleDelete(id) {
    Alert.alert(t("account"), t("deleteDebtConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => save(accounts.filter((a) => a.id !== id)) },
    ]);
  }

  function toTHB(amount, currency) {
    if (!rates || currency === "THB") return amount;
    const inUSD = amount / (rates[currency] || 1);
    return inUSD * (rates["THB"] || 1);
  }

  const totalTHB = accounts.reduce((sum, a) => sum + toTHB(a.balance, a.currency), 0);
  const s = styles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("accountsTitle")}</Text>

      {/* Total */}
      <View style={[s.totalCard, { backgroundColor: colors.primary }]}>
        <Text style={s.totalLabel}>{t("accountTotalTHB")}</Text>
        <Text style={s.totalValue}>฿{totalTHB.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
        {!rates && <Text style={{ color: "#ffffff88", fontSize: 11, marginTop: 4 }}>{t("currencyFail")}</Text>}
      </View>

      {/* Accounts list */}
      {accounts.length === 0 ? (
        <Text style={{ color: colors.subtext, textAlign: "center", marginTop: 32, fontSize: 15 }}>{t("accountEmpty")}</Text>
      ) : (
        accounts.map((acc) => {
          const thb = toTHB(acc.balance, acc.currency);
          return (
            <TouchableOpacity key={acc.id} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => openEdit(acc)}>
              <View style={s.cardRow}>
                <Text style={{ fontSize: 28 }}>{acc.emoji}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{acc.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.subtext }}>{acc.currency}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
                    {acc.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {acc.currency}
                  </Text>
                  {acc.currency !== "THB" && rates && (
                    <Text style={{ fontSize: 12, color: colors.subtext }}>≈ ฿{thb.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(acc.id)}>
                <Text style={{ color: colors.danger, fontSize: 12 }}>{t("delete")}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      )}

      <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
        <Text style={s.addBtnText}>+ {t("accountAdd")}</Text>
      </TouchableOpacity>

      {/* Edit/Add Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{editId ? t("edit") : t("accountAdd")}</Text>

            <Text style={s.modalLabel}>{t("accountName")}</Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder={t("accountNameHint")}
              placeholderTextColor={colors.subtext}
            />

            <Text style={s.modalLabel}>{t("currencyFrom")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.chip, form.currency === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setForm((p) => ({ ...p, currency: c }))}
                >
                  <Text style={[s.chipText, form.currency === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.modalLabel}>{t("accountBalance")}</Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={form.balance}
              onChangeText={(v) => setForm((p) => ({ ...p, balance: v }))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.subtext}
            />

            <Text style={s.modalLabel}>{t("icon")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiChip, form.emoji === e && { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
                  onPress={() => setForm((p) => ({ ...p, emoji: e }))}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.chip, flex: 1 }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleSave}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 16 },
  totalCard: { borderRadius: 14, padding: 20, marginBottom: 16, alignItems: "center" },
  totalLabel: { fontSize: 12, fontWeight: "700", color: "#ffffff99", textTransform: "uppercase", letterSpacing: 0.8 },
  totalValue: { fontSize: 32, fontWeight: "800", color: "#fff", marginTop: 4 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardRow: { flexDirection: "row", alignItems: "center" },
  deleteBtn: { marginTop: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, alignSelf: "flex-end" },
  addBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  modal: { borderRadius: 20, borderWidth: 1, padding: 24, margin: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: "700", color: c.sectionLabel, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: c.border, marginRight: 8, backgroundColor: c.chip },
  chipText: { fontSize: 13, fontWeight: "600", color: c.chipText },
  emojiChip: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginRight: 8 },
  modalBtn: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
});
