"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Plus, Users, X, BellRing } from "lucide-react";

interface ArisanSummary {
  id: string;
  name: string;
  status: "OPEN" | "ACTIVE" | "COMPLETED";
  contributionAmount: number;
  memberCount: number;
  myRole: "ADMIN" | "MEMBER";
  currentPeriodNumber: number | null;
  totalPeriods: number | null;
}

const statusLabel: Record<string, string> = {
  OPEN: "Pendaftaran",
  ACTIVE: "Berjalan",
  COMPLETED: "Selesai",
};

const defaultForm = { name: "", contributionAmount: "", paymentDueDay: "5", drawDay: "10", startMonth: "" };

export default function ArisanPage() {
  const [arisans, setArisans] = useState<ArisanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    fetchArisans();
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (appId && "Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  async function fetchArisans() {
    try {
      const res = await fetch("/api/arisan");
      const data = await res.json();
      setArisans(data.arisans || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/arisan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contributionAmount: Number(form.contributionAmount),
          paymentDueDay: Number(form.paymentDueDay),
          drawDay: Number(form.drawDay),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setForm(defaultForm);
        fetchArisans();
      } else {
        setError(data.error || "Gagal membuat arisan");
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/arisan/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = `/arisan/${data.arisan.id}`;
      } else {
        setError(data.error || "Gagal join arisan");
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnableNotifications() {
    const w = window as any;
    if (w.OneSignalDeferred) {
      w.OneSignalDeferred.push(async (OneSignal: any) => {
        await OneSignal.Notifications.requestPermission();
        setPushEnabled(Notification.permission === "granted");
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Arisan</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinForm(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Join Arisan
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Buat Arisan
          </button>
        </div>
      </div>

      {!pushEnabled && (
        <button
          onClick={handleEnableNotifications}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          <BellRing size={16} />
          Aktifkan notifikasi
        </button>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : arisans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Users size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Anda belum ikut arisan apapun.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {arisans.map((a) => (
            <Link
              key={a.id}
              href={`/arisan/${a.id}`}
              className="block rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{a.name}</h3>
                {a.myRole === "ADMIN" && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Admin
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{statusLabel[a.status]}</p>
              <p className="mt-2 text-sm text-foreground">{formatCurrency(a.contributionAmount)} / bulan</p>
              <p className="mt-1 text-xs text-muted-foreground">{a.memberCount} anggota</p>
              {a.currentPeriodNumber !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Periode {a.currentPeriodNumber}/{a.totalPeriods}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Buat Arisan</h2>
              <button onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Nama</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Iuran per bulan</label>
                <CurrencyInput
                  value={form.contributionAmount}
                  onChange={(v) => setForm({ ...form, contributionAmount: v })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Tanggal jatuh tempo</label>
                  <select
                    value={form.paymentDueDay}
                    onChange={(e) => setForm({ ...form, paymentDueDay: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Tanggal kocokan</label>
                  <select
                    value={form.drawDay}
                    onChange={(e) => setForm({ ...form, drawDay: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Bulan mulai</label>
                <input
                  type="month"
                  required
                  value={form.startMonth}
                  onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Simpan
              </button>
            </form>
          </div>
        </div>
      )}

      {showJoinForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Join Arisan</h2>
              <button onClick={() => setShowJoinForm(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Masukkan kode arisan"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
