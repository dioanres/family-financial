import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">🏡</div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Catatan Keluarga
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Kelola keuangan, tugas, dan agenda keluarga Anda dalam satu tempat.
          Sederhana, transparan, dan mudah digunakan bersama.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Buat Akun Baru
          </Link>
        </div>
      </div>
    </main>
  );
}
