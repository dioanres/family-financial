"use client";

import { useState, useEffect } from "react";
import { Plus, Check, Trash2, X, AlertCircle, CheckCircle } from "lucide-react";

interface ShoppingItem { id: string; name: string; quantity: number; unit: string | null; isBought: boolean; }

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", quantity: "1", unit: "" });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    try { const res = await fetch("/api/shopping"); const data = await res.json(); setItems(data.items || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/shopping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantity: parseInt(form.quantity) || 1 }) });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setForm({ name: "", quantity: "1", unit: "" });
        fetchItems();
        showToast("success", "Barang berhasil ditambahkan");
      } else {
        showToast("error", data.error || "Gagal menyimpan barang");
      }
    } catch (e) {
      showToast("error", "Terjadi kesalahan jaringan");
    }
  }

  async function toggleBought(item: ShoppingItem) {
    await fetch(`/api/shopping/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBought: !item.isBought }) });
    fetchItems();
  }

  async function handleDelete(id: string) { await fetch(`/api/shopping/${id}`, { method: "DELETE" }); fetchItems(); }

  const unbought = items.filter((i) => !i.isBought);
  const bought = items.filter((i) => i.isBought);

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
        <div><h1 className="text-2xl font-bold tracking-tight">Belanja</h1><p className="text-muted-foreground mt-1">Daftar belanja keluarga</p></div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus size={16} /> Tambah</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 mx-4">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Tambah Item</h2><button onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-accent"><X size={20} /></button></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium">Nama Barang</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Contoh: Beras" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-sm font-medium">Jumlah</label><input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} min="1" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div className="flex-1"><label className="text-sm font-medium">Satuan</label><input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, liter, pcs" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Tambah</button>
            </form>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center"><div className="text-4xl mb-3">🛒</div><h3 className="text-lg font-semibold">Daftar belanja kosong</h3><p className="mt-2 text-sm text-muted-foreground">Tambahkan item yang perlu dibeli.</p></div>
      ) : (
        <>
          {unbought.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Perlu Dibeli ({unbought.length})</h2>
              <div className="space-y-2">
                {unbought.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                    <button onClick={() => toggleBought(item)} className="rounded-lg border-2 p-1.5 hover:bg-accent"><div className="w-4 h-4" /></button>
                    <div className="flex-1"><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.quantity} {item.unit || "pcs"}</p></div>
                    <button onClick={() => handleDelete(item.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {bought.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sudah Dibeli ({bought.length})</h2>
              <div className="space-y-2">
                {bought.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-card p-4 opacity-60">
                    <button onClick={() => toggleBought(item)} className="rounded-lg bg-emerald-100 p-1.5"><Check size={16} className="text-emerald-600" /></button>
                    <div className="flex-1"><p className="text-sm font-medium line-through">{item.name}</p><p className="text-xs text-muted-foreground">{item.quantity} {item.unit || "pcs"}</p></div>
                    <button onClick={() => handleDelete(item.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
