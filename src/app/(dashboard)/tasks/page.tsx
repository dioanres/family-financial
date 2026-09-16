"use client";

import { useState, useEffect } from "react";
import { Plus, Check, Clock, AlertCircle, Trash2, X, CheckCircle } from "lucide-react";

interface Task {
  id: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "LOW", dueDate: "" });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setForm({ title: "", description: "", priority: "LOW", dueDate: "" });
        fetchTasks();
        showToast("success", "Tugas berhasil ditambahkan");
      } else {
        showToast("error", data.error || "Gagal menyimpan tugas");
      }
    } catch (e) {
      showToast("error", "Terjadi kesalahan jaringan");
    }
  }

  async function toggleStatus(task: Task) {
    const nextStatus = task.status === "COMPLETED" ? "PENDING" : task.status === "PENDING" ? "IN_PROGRESS" : "COMPLETED";
    await fetch("/api/tasks/" + task.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    fetchTasks();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus tugas ini?")) return;
    await fetch("/api/tasks/" + id, { method: "DELETE" });
    fetchTasks();
  }

  const statusIcon = (status: string) => {
    if (status === "COMPLETED") return <Check size={16} className="text-emerald-600" />;
    if (status === "IN_PROGRESS") return <Clock size={16} className="text-blue-600" />;
    return <AlertCircle size={16} className="text-muted-foreground" />;
  };

  const priorityColor = (p: string) => {
    if (p === "HIGH") return "bg-red-50 text-red-700";
    if (p === "MEDIUM") return "bg-yellow-50 text-yellow-700";
    return "bg-gray-50 text-gray-600";
  };

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
          <h1 className="text-2xl font-bold tracking-tight">Tugas</h1>
          <p className="text-muted-foreground mt-1">Kelola tugas rumah tangga</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Tambah
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Tambah Tugas</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-accent"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Judul</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Nama tugas" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Deskripsi</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detail tugas (opsional)" rows={3} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium">Prioritas</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="LOW">Rendah</option>
                  <option value="MEDIUM">Sedang</option>
                  <option value="HIGH">Tinggi</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Batas Waktu</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Simpan</button>
            </form>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-semibold">Belum ada tugas</h3>
          <p className="mt-2 text-sm text-muted-foreground">Tambahkan tugas untuk mengelola pekerjaan rumah tangga.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className={`flex items-center gap-3 rounded-xl border bg-card p-4 ${task.status === "COMPLETED" ? "opacity-60" : ""}`}>
              <button onClick={() => toggleStatus(task)} className="rounded-lg border-2 p-1.5 hover:bg-accent transition-colors">
                {statusIcon(task.status)}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === "COMPLETED" ? "line-through" : ""}`}>{task.title}</p>
                {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                {task.dueDate && <p className="text-xs text-muted-foreground mt-1">📅 {new Date(task.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</p>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(task.priority)}`}>
                {task.priority === "HIGH" ? "Tinggi" : task.priority === "MEDIUM" ? "Sedang" : "Rendah"}
              </span>
              <button onClick={() => handleDelete(task.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
