"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, X, Pencil, AlertCircle, CheckCircle, Target, TrendingDown, DollarSign } from "lucide-react";

interface Category { id: string; name: string; icon: string | null; color: string | null; }
interface Budget {
  id: string; name: string; amount: number; spent: number; startDate: string; endDate: string;
  categoryId: string | null; category: Category | null;
}

const defaultForm = { name: "", amount: "", startDate: "", endDate: "", categoryId: "" };
const defaultExpenseForm = { amount: "", description: "", date: "" };

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Quick-add expense state
  const [quickAddBudgetId, setQuickAddBudgetId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [expenseLoading, setExpenseLoading] = useState(false);

  // Transaction list state per budget
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
  const [budgetTransactions, setBudgetTransactions] = useState<Record<string, { id: string; amount: number; description: string | null; date: string }[]>>({});
  const [txLoading, setTxLoading] = useState(false);


  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchBudgets(); }, [month]);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) { console.error(e); }
  }

  async function fetchBudgets() {
    try {
      const res = await fetch(`/api/budgets?month=${month}`);
      const data = await res.json();
      setBudgets(data.budgets || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  function openAdd() {
    const [y, m] = month.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = new Date(y, m, 0);
    const endStr = `${y}-${String(m).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    setEditingId(null);
    setForm({ name: "", amount: "", startDate: start, endDate: endStr, categoryId: "" });
    setShowForm(true);
  }

  function openEdit(b: Budget) {
    setEditingId(b.id);
    setForm({
      name: b.name || "",
      amount: String(b.amount),
      startDate: new Date(b.startDate).toISOString().split("T")[0],
      endDate: new Date(b.endDate).toISOString().split("T")[0],
      categoryId: b.categoryId || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingId ? `/api/budgets/${editingId}` : "/api/budgets";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setForm(defaultForm);
        fetchBudgets();
        showToast("success", editingId ? "Budget berhasil diperbarui" : "Budget berhasil ditambahkan");
      } else {
        showToast("error", data.error || "Gagal menyimpan budget");
      }
    } catch (e) {
      showToast("error", "Terjadi kesalahan jaringan");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus budget ini?")) return;
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    fetchBudgets();
    showToast("success", "Budget berhasil dihapus");
  }

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function openQuickAdd(budget: Budget) {
    setExpandedBudgetId(null); // close transaction list
    setQuickAddBudgetId(budget.id);
    setExpenseForm({
      amount: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
  }

  async function handleQuickAddExpense(e: React.FormEvent, budget: Budget) {
    e.preventDefault();
    setExpenseLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(expenseForm.amount),
          type: "EXPENSE",
          description: expenseForm.description,
          date: expenseForm.date,
          categoryId: budget.categoryId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuickAddBudgetId(null);
        setExpenseForm(defaultExpenseForm);
        fetchBudgets();
        showToast("success", "Pengeluaran berhasil ditambahkan");
      } else {
        showToast("error", data.error || "Gagal menambah pengeluaran");
      }
    } catch (e) {
      showToast("error", "Terjadi kesalahan jaringan");
    } finally {
      setExpenseLoading(false);
    }
  }

  async function fetchBudgetTransactions(budget: Budget) {
    if (expandedBudgetId === budget.id) {
      setExpandedBudgetId(null);
      return;
    }
    setQuickAddBudgetId(null); // close quick-add form
    setExpandedBudgetId(budget.id);
    if (budgetTransactions[budget.id]) return; // already fetched

    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "EXPENSE");
      if (budget.categoryId) params.set("categoryId", budget.categoryId);
      params.set("from", new Date(budget.startDate).toISOString().split("T")[0]);
      params.set("to", new Date(budget.endDate).toISOString().split("T")[0]);
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setBudgetTransactions(prev => ({ ...prev, [budget.id]: data.transactions || [] }));
    } catch (e) { console.error(e); } finally { setTxLoading(false); }
  }

  const chartData = useMemo(() => {
    return budgets.map(b => {
      const categoryName = b.category?.name || "Tanpa Kategori";
      const budgetName = b.name || categoryName;
      const icon = b.category?.icon || "📋";
      const color = b.category?.color || "#6b7280";
      const pct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
      return { ...b, categoryName, budgetName, icon, color, pct, remaining: b.amount - b.spent };
    });
  }, [budgets]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }, [month]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="text-muted-foreground">Memuat...</div></div>;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-top-2 ${toast.type === "error" ? "bg-destructive text-destructive-foreground" : "bg-emerald-600 text-white"}`}>
          {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
          <p className="text-muted-foreground mt-1">Kelola anggaran pengeluaran keluarga</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus size={16} /> Tambah</button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => changeMonth(-1)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">&larr;</button>
        <span className="text-sm font-semibold min-w-[140px] text-center">{monthLabel}</span>
        <button onClick={() => changeMonth(1)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">&rarr;</button>
      </div>

      {/* Summary cards */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(budgets.reduce((s, b) => s + b.amount, 0))}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Terpakai</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(budgets.reduce((s, b) => s + b.spent, 0))}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Sisa Budget</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(budgets.reduce((s, b) => s + (b.amount - b.spent), 0))}</p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">📊 Budget vs Aktual</h2>
          <div className="space-y-4">
            {chartData.map((item) => (
              <div key={item.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.icon} {item.budgetName}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(item.spent)} / {formatCurrency(item.amount)}
                    <span className={`ml-2 font-semibold ${item.pct > 100 ? "text-red-600" : item.pct > 80 ? "text-orange-600" : "text-emerald-600"}`}>
                      {item.pct}%
                    </span>
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(item.pct, 100)}%`,
                      backgroundColor: item.pct > 100 ? "#ef4444" : item.pct > 80 ? "#f97316" : item.color,
                    }}
                  />
                </div>
                {item.pct > 100 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Melebihi budget {formatCurrency(Math.abs(item.remaining))}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Edit Budget" : "Tambah Budget"}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-lg p-1 hover:bg-accent"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nama Budget</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Makanan Bulanan, Transportasi Januari" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Kategori</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Tanpa Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Nominal Budget</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="500000" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium">Tanggal Mulai</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Tanggal Selesai</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Simpan</button>
            </form>
          </div>
        </div>
      )}



      {/* Budget list */}
      {budgets.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-semibold">Belum ada budget</h3>
          <p className="mt-2 text-sm text-muted-foreground">Buat budget untuk mengontrol pengeluaran bulanan Anda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chartData.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{item.icon} {item.budgetName}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.pct > 100 ? "bg-red-50 text-red-700" : item.pct > 80 ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {item.pct}%
                    </span>
                  </div>
                  {item.budgetName !== item.categoryName && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.categoryName}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(item.startDate).toLocaleDateString("id-ID")} — {new Date(item.endDate).toLocaleDateString("id-ID")}
                  </p>
                  <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(item.pct, 100)}%`, backgroundColor: item.pct > 100 ? "#ef4444" : item.color }} />
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span>Terpakai: <strong>{formatCurrency(item.spent)}</strong></span>
                    <span>Sisa: <strong className={item.remaining < 0 ? "text-red-600" : "text-emerald-600"}>{formatCurrency(item.remaining)}</strong></span>
                  </div>
                </div>
                <div className="flex gap-1 ml-3">
                  <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => openQuickAdd(item)} className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 flex items-center justify-center gap-2">
                  <DollarSign size={15} /> Tambah Pengeluaran
                </button>
                <button onClick={() => fetchBudgetTransactions(item)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium flex items-center justify-center gap-2 ${expandedBudgetId === item.id ? "border-primary bg-primary/5 text-primary" : "border-muted-foreground/20 hover:bg-accent"}`}>
                  <TrendingDown size={15} /> Lihat Pengeluaran
                </button>
              </div>

              {/* Transaction list */}
              {expandedBudgetId === item.id && (
                <div className="mt-3 pt-3 border-t">
                  {txLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-3">Memuat...</p>
                  ) : (budgetTransactions[item.id]?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">Belum ada pengeluaran</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">📋 {budgetTransactions[item.id]?.length} transaksi</p>
                      {budgetTransactions[item.id]?.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{tx.description || "Tanpa keterangan"}</p>
                            <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("id-ID")}</p>
                          </div>
                          <span className="ml-3 font-semibold text-red-600">{formatCurrency(tx.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick-add expense form */}
              {quickAddBudgetId === item.id && (
                <form onSubmit={(e) => handleQuickAddExpense(e, item)} className="mt-4 pt-4 border-t space-y-3">
                  <p className="text-sm font-medium text-emerald-700">➕ Tambah Pengeluaran</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required placeholder="Nominal" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="flex-1">
                      <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Keterangan (opsional)" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setQuickAddBudgetId(null)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">Batal</button>
                    <button type="submit" disabled={expenseLoading} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                      {expenseLoading ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
