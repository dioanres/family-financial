"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { SpinWheel } from "@/components/arisan/spin-wheel";
import { Copy, RefreshCw, UserMinus, Check, ShieldCheck } from "lucide-react";

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: "ADMIN" | "MEMBER";
  hasWon: boolean;
}

interface Payment {
  id: string;
  memberId: string;
  isPaid: boolean;
  paidAt: string | null;
}

interface Period {
  id: string;
  periodNumber: number;
  dueDate: string;
  drawDate: string;
  drawnAt: string | null;
  winner: { memberId: string; name: string | null } | null;
  payments: Payment[];
}

interface ArisanDetail {
  arisan: {
    id: string;
    name: string;
    status: "OPEN" | "ACTIVE" | "COMPLETED";
    contributionAmount: number;
    paymentDueDay: number;
    drawDay: number;
    startMonth: string;
    joinCode: string | null;
  };
  myMemberId: string;
  myRole: "ADMIN" | "MEMBER";
  members: Member[];
  periods: Period[];
  currentPeriodNumber: number | null;
  potAmount: number;
}

export default function ArisanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<ArisanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [drawWinnerId, setDrawWinnerId] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/arisan/${id}`);
      const d = await res.json();
      if (res.ok) setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCode() {
    if (data?.arisan.joinCode) navigator.clipboard.writeText(data.arisan.joinCode);
  }

  async function handleRegenerateCode() {
    setError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/arisan/${id}/regenerate-code`, { method: "POST" });
      const d = await res.json();
      if (res.ok) fetchData();
      else setError(d.error || "Gagal membuat kode baru");
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMakeAdmin(memberId: string, name: string | null) {
    if (!confirm(`Jadikan ${name} admin arisan ini?`)) return;
    setError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/arisan/${id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      const d = await res.json();
      if (res.ok) fetchData();
      else setError(d.error || "Gagal menjadikan admin");
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Keluarkan anggota ini?")) return;
    setError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/arisan/${id}/members/${memberId}`, { method: "DELETE" });
      const d = await res.json();
      if (res.ok) fetchData();
      else setError(d.error || "Gagal mengeluarkan anggota");
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStart() {
    if (!confirm("Mulai arisan sekarang? Keanggotaan akan dikunci.")) return;
    setError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/arisan/${id}/start`, { method: "POST" });
      const d = await res.json();
      if (res.ok) fetchData();
      else setError(d.error || "Gagal memulai arisan");
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDraw() {
    setError("");
    setSpinning(true);
    try {
      const res = await fetch(`/api/arisan/${id}/draw`, { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        setDrawWinnerId(d.winner.memberId);
      } else {
        setError(d.error || "Gagal mengundi");
        setSpinning(false);
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
      setSpinning(false);
    }
  }

  function handleSpinEnd() {
    setSpinning(false);
    setShowWinnerModal(true);
  }

  function closeWinnerModal() {
    setShowWinnerModal(false);
    setDrawWinnerId(null);
    fetchData();
  }

  async function handleTogglePayment(payment: Payment) {
    setError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/arisan/${id}/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !payment.isPaid }),
      });
      const d = await res.json();
      if (res.ok) fetchData();
      else setError(d.error || "Gagal memperbarui pembayaran");
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Memuat...</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Arisan tidak ditemukan</p>;

  const { arisan, members, periods, myRole, currentPeriodNumber, potAmount } = data;
  const isAdmin = myRole === "ADMIN";
  const currentPeriod = periods.find((p) => p.periodNumber === currentPeriodNumber) || null;
  const candidateMembers = members.filter((m) => !m.hasWon);
  const unpaidCount = currentPeriod ? currentPeriod.payments.filter((p) => !p.isPaid).length : 0;
  const winnerMember = drawWinnerId ? members.find((m) => m.id === drawWinnerId) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{arisan.name}</h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {arisan.status === "OPEN" ? "Pendaftaran" : arisan.status === "ACTIVE" ? "Berjalan" : "Selesai"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Iuran {formatCurrency(arisan.contributionAmount)} / bulan &middot; Total Terima Arisan {formatCurrency(potAmount)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bayar tiap tgl {arisan.paymentDueDay}, kocokan tiap tgl {arisan.drawDay}
        </p>

        {isAdmin && arisan.status === "OPEN" && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-muted px-3 py-1.5 text-sm font-mono">{arisan.joinCode}</code>
            <button onClick={handleCopyCode} className="rounded-lg border border-border p-2 hover:bg-accent transition-colors">
              <Copy size={14} />
            </button>
            <button
              onClick={handleRegenerateCode}
              disabled={actionLoading}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} /> Buat kode baru
            </button>
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="ml-auto rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Mulai Arisan
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold text-foreground">Anggota</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>{m.name}</span>
                {m.role === "ADMIN" && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Admin</span>
                )}
                {m.hasWon && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Check size={12} /> Sudah menerima
                  </span>
                )}
              </div>
              {isAdmin && m.role !== "ADMIN" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMakeAdmin(m.id, m.name)}
                    disabled={actionLoading}
                    className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <ShieldCheck size={14} /> Jadikan admin
                  </button>
                  {arisan.status === "OPEN" && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      disabled={actionLoading}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {arisan.status === "ACTIVE" && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold text-foreground">Kocokan</h2>
          {unpaidCount > 0 && (
            <p className="mb-3 text-xs text-yellow-600">{unpaidCount} anggota belum bayar periode ini</p>
          )}
          <SpinWheel
            members={(drawWinnerId ? members : candidateMembers).filter((m) => !m.hasWon || m.id === drawWinnerId)}
            winnerId={drawWinnerId}
            onSpinEnd={handleSpinEnd}
          />
          {isAdmin && (
            <button
              onClick={handleDraw}
              disabled={spinning || candidateMembers.length === 0}
              className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {spinning ? "Memutar..." : "Putar"}
            </button>
          )}
        </div>
      )}

      {arisan.status === "COMPLETED" && (
        <div className="rounded-lg border border-border bg-card p-5 text-center">
          <p className="font-medium text-foreground">Arisan selesai 🎉</p>
        </div>
      )}

      {arisan.status === "ACTIVE" && currentPeriod && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold text-foreground">Pembayaran periode berjalan</h2>
          <ul className="space-y-2">
            {currentPeriod.payments.map((p) => {
              const member = members.find((m) => m.id === p.memberId);
              return (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{member?.name}</span>
                  <label className="flex items-center gap-2">
                    <span className={p.isPaid ? "text-green-600" : "text-muted-foreground"}>
                      {p.isPaid ? "Lunas" : "Belum"}
                    </span>
                    {isAdmin && (
                      <input
                        type="checkbox"
                        disabled={actionLoading}
                        checked={p.isPaid}
                        onChange={() => handleTogglePayment(p)}
                        className="h-4 w-4"
                      />
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold text-foreground">Riwayat</h2>
        <table className="w-full text-sm">
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-2">Periode {p.periodNumber}</td>
                <td className="py-2 text-muted-foreground">
                  {new Date(p.drawDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Jakarta",
                  })}
                </td>
                <td className="py-2 text-right">{p.winner ? p.winner.name : "Belum diundi"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showWinnerModal && winnerMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 text-center">
            <p className="text-lg font-semibold">🎉 {winnerMember.name} menerima arisan periode ini!</p>
            <button
              onClick={closeWinnerModal}
              className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
