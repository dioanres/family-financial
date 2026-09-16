"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, X, Pencil, Download, Filter, AlertCircle, CheckCircle } from "lucide-react";

interface Transaction {
  id: string; amount: number; type: string; description: string | null; date: string;
  categoryId: string | null; category: { id: string; name: string; icon: string | null; color: string | null } | null;
}
interface Category { id: string; name: string; icon: string | null; color: string | null; }

const defaultForm = { amount: "", type: "EXPENSE", description: "", date: new Date().toISOString().split("T")[0], categoryId: "" };

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "", categoryId: "", from: "", to: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchFiltered(); }, [filters]);

  async function fetchAll() {
    try {
      const catRes = await fetch("/api/categories");
      setCategories((await catRes.json()).categories || []);
    } catch (e) { console.error(e); }
  }

  async function fetchFiltered() {
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const res = await fetch(`/api/transactions?${params}`);
      setTransactions((await res.json()).transactions || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  function openAdd() { setEditingId(null); setForm(defaultForm); setShowForm(true); }
  function openEdit(t: Transaction) {
    setEditingId(t.id);
    setForm({ amount: String(t.amount), type: t.type, description: t.description || "", date: new Date(t.date).toISOString().split("T")[0], categoryId: t.categoryId || "" });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingId ? `/api/transactions/${editingId}` : "/api/transactions";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setForm(defaultForm);
        fetchFiltered();
        showToast("success", editingId ? "Transaksi berhasil diperbarui" : "Transaksi berhasil ditambahkan");
      } else {
        showToast("error", data.error || "Gagal menyimpan transaksi");
      }
    } catch (e) {
      showToast("error", "Terjadi kesalahan jaringan");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchFiltered();
  }

  function exportCSV() {
    const headers = ["Tanggal", "Tipe", "Kategori", "Keterangan", "Jumlah"];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString("id-ID"),
      t.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
      t.category?.name || "-",
      t.description || "-",
      String(t.amount),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transaksi_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const categoryChart = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string; total: number }>();
    transactions.filter(t => t.type === "EXPENSE" && t.category).forEach(t => {
      const key = t.categoryId!;
      const prev = map.get(key);
      if (prev) { prev.total += t.amount; } else { map.set(key, { name: t.category!.name, icon: t.category!.icon || "", color: t.category!.color || "#6b7280", total: t.amount }); }
    });
    const arr = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const max = arr[0]?.total || 1;
    return arr.map(c => ({ ...c, pct: Math.round((c.total / max) * 100) }));
  }, [transactions]);

  const hasActiveFilters = filters.type || filters.categoryId || filters.from || filters.to;

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
          <h1 className="text-2xl font-bold tracking-tight">Keuangan</h1>
          <p className="text-muted-foreground mt-1">Kelola pemasukan dan pengeluaran</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent">
            <Download size={16} /> CSV
          </button>
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Saldo</span>
            <div className="rounded-lg bg-primary/10 p-2"><Wallet size={16} className="text-primary" /></div>
          </div>
          <p className={`mt-2 text-xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatCurrency(balance)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pemasukan</span>
            <div className="rounded-lg bg-emerald-50 p-2"><TrendingUp size={16} className="text-emerald-600" /></div>
          </div>
          <p className="mt-2 text-xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pengeluaran</span>
            <div className="rounded-lg bg-orange-50 p-2"><TrendingDown size={16} className="text-orange-600" /></div>
          </div>
          <p className="mt-2 text-xl font-bold text-orange-600">{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <button onClick={() => setShowFilters(!showFilters)} className="flex w-full items-center gap-2 p-4 text-sm font-medium">
          <Filter size={16} /> Filter {hasActiveFilters && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Aktif</span>}
        </button>
        {showFilters && (
          <div className="border-t p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipe</label>
                <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="">Semua</option>
                  <option value="INCOME">Pemasukan</option>
                  <option value="EXPENSE">Pengeluaran</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kategori</label>
                <select value={filters.categoryId} onChange={e => setFilters({ ...filters, categoryId: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="">Semua</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Dari</label>
                <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Sampai</label>
                <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={() => setFilters({ type: "", categoryId: "", from: "", to: "" })} className="mt-3 text-xs text-destructive hover:underline">Reset filter</button>
            )}
          </div>
        )}
      </div>

      {categoryChart.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Pengeluaran per Kategori</h2>
          <div className="space-y-3">
            {categoryChart.map(c => (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{c.icon} {c.name}</span>
                  <span className="font-medium">{formatCurrency(c.total)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-accent overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Edit Transaksi" : "Tambah Transaksi"}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-lg p-1 hover:bg-accent"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: "EXPENSE" })} className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${form.type === "EXPENSE" ? "bg-orange-100 text-orange-700 border border-orange-300" : "border bg-background"}`}>Pengeluaran</button>
                <button type="button" onClick={() => setForm({ ...form, type: "INCOME" })} className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${form.type === "INCOME" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "border bg-background"}`}>Pemasukan</button>
              </div>
              <div>
                <label className="text-sm font-medium">Jumlah (Rp)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0" placeholder="0" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Keterangan</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Contoh: Belanja pasar" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Kategori</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Tanpa kategori</option>
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Tanggal</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">{editingId ? "Simpan Perubahan" : "Simpan"}</button>
            </form>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Riwayat Transaksi ({transactions.length})</h2>
        {transactions.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <div className="text-4xl mb-3">{hasActiveFilters ? "🔍" : "💸"}</div>
            <h3 className="text-lg font-semibold">{hasActiveFilters ? "Tidak ada transaksi ditemukan" : "Belum ada transaksi"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{hasActiveFilters ? "Coba ubah filter pencarian." : "Mulai catat pemasukan dan pengeluaran Anda."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="group flex items-center justify-between rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${t.type === "INCOME" ? "bg-emerald-50" : "bg-orange-50"}`}>
                    {t.type === "INCOME" ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-orange-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.description || (t.type === "INCOME" ? "Pemasukan" : "Pengeluaran")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.category && <span>{t.category.icon} {t.category.name} · </span>}
                      {new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${t.type === "INCOME" ? "text-emerald-600" : "text-orange-600"}`}>
                    {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(t)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-blue-50 hover:text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}