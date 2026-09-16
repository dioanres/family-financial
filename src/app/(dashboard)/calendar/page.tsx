"use client";

import { useState, useEffect } from "react";
import { Plus, MapPin, Trash2, X, AlertCircle, CheckCircle } from "lucide-react";

interface CalendarEvent { id: string; title: string; description: string | null; startTime: string; endTime: string | null; location: string | null; }

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", startTime: "", endTime: "", location: "" });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => { fetchEvents(); }, []);

  async function fetchEvents() {
    try { const res = await fetch("/api/events"); const data = await res.json(); setEvents(data.events || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setForm({ title: "", description: "", startTime: "", endTime: "", location: "" });
        fetchEvents();
        showToast("success", "Acara berhasil ditambahkan");
      } else {
        showToast("error", data.error || "Gagal menyimpan acara");
      }
    } catch (e) {
      showToast("error", "Terjadi kesalahan jaringan");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus acara ini?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" }); fetchEvents();
  }

  function fmtDate(start: string, end: string | null) {
    const s = new Date(start);
    let str = s.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    str += " \u00b7 " + s.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    if (end) str += " - " + new Date(end).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return str;
  }

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
        <div><h1 className="text-2xl font-bold tracking-tight">Kalender</h1><p className="text-muted-foreground mt-1">Agenda dan jadwal keluarga</p></div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus size={16} /> Tambah</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 mx-4">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Tambah Acara</h2><button onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-accent"><X size={20} /></button></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium">Judul</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Nama acara" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-sm font-medium">Deskripsi</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detail acara" rows={2} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-sm font-medium">Mulai</label><input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div className="flex-1"><label className="text-sm font-medium">Selesai</label><input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div><label className="text-sm font-medium">Lokasi</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Tempat acara" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Simpan</button>
            </form>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center"><div className="text-4xl mb-3">📅</div><h3 className="text-lg font-semibold">Belum ada acara</h3><p className="mt-2 text-sm text-muted-foreground">Tambahkan acara dan jadwal keluarga Anda.</p></div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">{event.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{"\ud83d\udd50"} {fmtDate(event.startTime, event.endTime)}</p>
                  {event.location && <p className="text-sm text-muted-foreground mt-1"><MapPin size={14} className="inline mr-1" />{event.location}</p>}
                  {event.description && <p className="text-sm text-muted-foreground mt-2">{event.description}</p>}
                </div>
                <button onClick={() => handleDelete(event.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
