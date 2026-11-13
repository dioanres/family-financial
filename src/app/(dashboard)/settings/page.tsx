"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Users, Copy, Check } from "lucide-react";

interface Family { id: string; name: string; inviteCode: string | null; }
interface FamilyMember { id: string; role: string; nickname: string | null; user: { name: string | null; email: string | null; }; }

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [profileName, setProfileName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  useEffect(() => { fetchFamily(); }, []);
  useEffect(() => { setProfileName(session?.user?.name || ""); }, [session?.user?.name]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setProfileSuccess("Profil berhasil diperbarui");
      await updateSession({ name: data.user.name });
    } catch {
      setProfileError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function fetchFamily() {
    try {
      const res = await fetch("/api/family");
      const data = await res.json();
      if (data.family) { setFamily(data.family); setMembers(data.family.members || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const res = await fetch("/api/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: familyName }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setShowCreate(false); fetchFamily();
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const res = await fetch("/api/family/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setShowJoin(false); fetchFamily();
  }

  function copyCode() { if (family?.inviteCode) { navigator.clipboard.writeText(family.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000); } }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="text-muted-foreground">Memuat...</div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1><p className="text-muted-foreground mt-1">Kelola akun dan keluarga Anda</p></div>
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Profil</h2>
        {profileError && <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{profileError}</div>}
        {profileSuccess && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600">{profileSuccess}</div>}
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nama</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
              placeholder="Nama Anda"
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Password Saat Ini</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Isi jika ingin ganti password"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {profileSaving ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </form>
      </div>

      {!family ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-8 text-center">
            <div className="text-4xl mb-3">{"\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d\udc66"}</div>
            <h3 className="text-lg font-semibold">Buat atau Gabung Keluarga</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">Buat keluarga baru atau bergabung menggunakan kode undangan.</p>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={() => setShowCreate(true)} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Buat Keluarga</button>
              <button onClick={() => setShowJoin(true)} className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent">Gabung</button>
            </div>
          </div>

          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md rounded-xl bg-card p-6 mx-4">
                <h2 className="text-lg font-semibold mb-4">Buat Keluarga</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div><label className="text-sm font-medium">Nama Keluarga</label><input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} required placeholder="Keluarga Bahagia" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Buat</button>
                    <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent">Batal</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showJoin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md rounded-xl bg-card p-6 mx-4">
                <h2 className="text-lg font-semibold mb-4">Gabung Keluarga</h2>
                <form onSubmit={handleJoin} className="space-y-4">
                  <div><label className="text-sm font-medium">Kode Undangan</label><input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required placeholder="Masukkan kode" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Gabung</button>
                    <button type="button" onClick={() => setShowJoin(false)} className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent">Batal</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">{"\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d\udc66"} {family.name}</h2>
            {family.inviteCode && (
              <div className="flex items-center gap-3 rounded-lg bg-accent p-4">
                <div className="flex-1"><p className="text-sm font-medium">Kode Undangan</p><p className="text-xs text-muted-foreground mt-1">Bagikan kode ini untuk mengundang anggota keluarga</p></div>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-background px-3 py-1.5 text-sm font-mono font-bold">{family.inviteCode}</code>
                  <button onClick={copyCode} className="rounded-lg p-2 hover:bg-background transition-colors">{copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-muted-foreground" />}</button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4"><Users size={18} className="inline mr-2" />Anggota Keluarga</h2>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg bg-accent p-4">
                  <div><p className="text-sm font-medium">{member.nickname || member.user.name || "Anggota"}</p><p className="text-xs text-muted-foreground">{member.user.email}</p></div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{member.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
