# Fitur Arisan — Design Spec

- **Tanggal:** 2026-11-07
- **Sumber kebutuhan:** `arisan.md`
- **Branch acuan:** `main` (branch `develop` belum ada)
- **Status:** Draft — menunggu review

## 1. Tujuan

Menambahkan menu **Arisan** agar user bisa membuat dan mengikuti arisan bulanan bersama orang lain (lintas keluarga), mengundi pemenang tiap bulan memakai spin wheel, mencatat pembayaran iuran secara manual, serta menerima notifikasi (in-app, web push, email).

**Kriteria sukses:**
- Admin bisa membuat arisan dan membagikan kode join; user lain bisa join dengan kode tersebut.
- Admin memutar spin wheel; pemenang ditentukan server, tercatat, dan hilang dari roda periode berikutnya.
- Pemenang menerima notifikasi selamat (in-app + push + email via OneSignal).
- Admin bisa menandai iuran lunas per anggota per periode; anggota yang belum bayar menerima pengingat H-1 jatuh tempo.
- Arisan otomatis selesai saat semua anggota sudah menang.

## 2. Keputusan Utama

| Topik | Keputusan |
|---|---|
| Kepemilikan arisan | Berdiri sendiri, **tidak** terikat `familyId`. Siapa pun yang login dan punya kode bisa join. |
| Admin | Pembuat arisan = ADMIN, sekaligus **peserta** (ikut bayar & bisa menang). |
| Yang memutar roda | Hanya admin. |
| Penentu pemenang | **Server** (`crypto.randomInt`); browser hanya menganimasikan roda ke hasil server. |
| Lifecycle | `OPEN` (pendaftaran) → `ACTIVE` (setelah "Mulai Arisan", keanggotaan dikunci) → `COMPLETED` (otomatis setelah semua menang). |
| Jumlah periode | N = jumlah anggota saat arisan dimulai; 1 periode = 1 bulan. |
| Pembayaran | Manual, ditandai **admin saja**. Tanpa payment gateway. |
| Notifikasi | Pusat notifikasi in-app (tabel `Notification`) + OneSignal (web push & email). |
| Pengingat | Vercel Cron harian 08:00 WIB, kirim ke anggota yang belum bayar dengan jatuh tempo besok. |
| Tanggal | `paymentDueDay` & `drawDay` dibatasi 1–28. Semua perhitungan tanggal di zona Asia/Jakarta (WIB). |
| Waktu kocokan | Admin boleh mengundi kapan saja (tidak dikunci ke `drawDay`); bila ada yang belum bayar periode berjalan, tampil peringatan (tidak memblokir). |

## 3. Scope

### In Scope
- Buat arisan (nama, iuran per bulan, tanggal jatuh tempo bayar, tanggal kocokan, bulan mulai).
- Generate kode join (`nanoid(8)`) & generate ulang kode (saat OPEN).
- Join arisan dengan kode (hanya saat OPEN).
- List anggota; admin bisa mengeluarkan anggota saat OPEN.
- Mulai arisan (min. 2 anggota) → generate periode & tagihan.
- Spin wheel untuk mengundi pemenang; pemenang langsung di-flag dan dihapus dari roda.
- Notifikasi selamat ke pemenang (in-app + push + email).
- Pencatatan pembayaran iuran manual oleh admin.
- Pengingat H-1 jatuh tempo (cron) untuk yang belum bayar.
- Pusat notifikasi in-app (lonceng + badge belum dibaca + tandai dibaca).
- Status COMPLETED otomatis.

### Out of Scope
- Integrasi payment gateway, upload bukti transfer, konfirmasi bayar oleh anggota.
- Edit/hapus arisan setelah ACTIVE.
- Anggota keluar sendiri; pindah admin.
- Undi ulang / membatalkan pemenang.
- Kocokan otomatis tepat di `drawDay`.
- Satu anggota memegang lebih dari satu slot.
- Denda keterlambatan.
- Realtime (anggota melihat roda berputar live).

## 4. Database (Prisma)

Tambahan pada `prisma/schema.prisma`. Model lama tidak diubah, kecuali relasi balik di `User`.

```prisma
enum ArisanStatus {
  OPEN
  ACTIVE
  COMPLETED
}

enum ArisanRole {
  ADMIN
  MEMBER
}

model Arisan {
  id                 String       @id @default(cuid())
  name               String
  contributionAmount Float
  paymentDueDay      Int          // 1–28
  drawDay            Int          // 1–28
  startMonth         DateTime     // tanggal 1 bulan pertama (WIB)
  joinCode           String       @unique
  status             ArisanStatus @default(OPEN)
  createdById        String
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  createdBy          User         @relation("ArisanCreatedBy", fields: [createdById], references: [id])
  members            ArisanMember[]
  periods            ArisanPeriod[]
}

model ArisanMember {
  id        String          @id @default(cuid())
  arisanId  String
  userId    String
  role      ArisanRole      @default(MEMBER)
  hasWon    Boolean         @default(false)
  joinedAt  DateTime        @default(now())
  arisan    Arisan          @relation(fields: [arisanId], references: [id], onDelete: Cascade)
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  wonPeriod ArisanPeriod?   @relation("ArisanPeriodWinner")
  payments  ArisanPayment[]

  @@unique([arisanId, userId])
}

model ArisanPeriod {
  id             String          @id @default(cuid())
  arisanId       String
  periodNumber   Int
  dueDate        DateTime
  drawDate       DateTime
  winnerMemberId String?         @unique
  drawnAt        DateTime?
  arisan         Arisan          @relation(fields: [arisanId], references: [id], onDelete: Cascade)
  winner         ArisanMember?   @relation("ArisanPeriodWinner", fields: [winnerMemberId], references: [id])
  payments       ArisanPayment[]

  @@unique([arisanId, periodNumber])
}

model ArisanPayment {
  id             String       @id @default(cuid())
  periodId       String
  memberId       String
  isPaid         Boolean      @default(false)
  paidAt         DateTime?
  reminderSentAt DateTime?
  period         ArisanPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade)
  member         ArisanMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([periodId, memberId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  url       String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
}

// Tambahan relasi di model User:
//   arisanMembers  ArisanMember[]
//   arisansCreated Arisan[]       @relation("ArisanCreatedBy")
//   notifications  Notification[]
```

### Aturan data
- **Periode berjalan** = `ArisanPeriod` dengan `periodNumber` terkecil yang `winnerMemberId IS NULL`.
- Periode ke-`n`: bulan = `startMonth + (n-1)` bulan; `dueDate` = tanggal `paymentDueDay` bulan itu; `drawDate` = tanggal `drawDay` bulan itu (WIB, disimpan sebagai UTC).
- **Pot** = `contributionAmount × jumlah anggota` (dihitung, tidak disimpan).
- Saat start: N periode + N×N `ArisanPayment` (`isPaid=false`) dibuat dalam satu transaksi.
- Admin tidak bisa dikeluarkan; minimal 1 ADMIN per arisan (pembuat).

## 5. API Contract

Konvensi (mengikuti route existing):
- Auth via `getServerSession(authOptions)`; tidak login → `401 { error: "Unauthorized" }`.
- Error: `{ error: string }` berbahasa Indonesia. `500 { error: "Terjadi kesalahan" }` + `console.error`.
- **Anggota** = user harus member arisan tsb, jika tidak → `404 { error: "Arisan tidak ditemukan" }`.
- **Admin** = member dengan role ADMIN, jika bukan → `403 { error: "Hanya admin yang dapat melakukan aksi ini" }`.
- Uang dalam Rupiah (number).

### 5.1 `GET /api/arisan` — Login
List arisan yang diikuti user.
```json
{ "arisans": [{ "id": "...", "name": "Arisan RT", "status": "ACTIVE",
  "contributionAmount": 500000, "memberCount": 8, "myRole": "ADMIN",
  "currentPeriodNumber": 2, "totalPeriods": 8 }] }
```
`currentPeriodNumber`/`totalPeriods` = `null` saat OPEN.

### 5.2 `POST /api/arisan` — Login
Body:
```json
{ "name": "Arisan RT", "contributionAmount": 500000,
  "paymentDueDay": 5, "drawDay": 10, "startMonth": "2026-12" }
```
Validasi (`400`): `name` wajib; `contributionAmount > 0`; `paymentDueDay` & `drawDay` integer 1–28; `startMonth` format `YYYY-MM` dan tidak sebelum bulan berjalan.
Efek: buat `Arisan` (status OPEN, `joinCode = nanoid(8)`) + `ArisanMember` pembuat sebagai ADMIN.
Response `201 { "arisan": { ... , "joinCode": "Ab3dE9xZ" } }`.

### 5.3 `GET /api/arisan/[id]` — Anggota
```json
{
  "arisan": { "id", "name", "status", "contributionAmount", "paymentDueDay",
              "drawDay", "startMonth", "joinCode": "hanya untuk admin, selain itu null" },
  "myMemberId": "...", "myRole": "ADMIN",
  "members": [{ "id", "userId", "name", "email", "role", "hasWon" }],
  "periods": [{ "id", "periodNumber", "dueDate", "drawDate", "drawnAt",
                "winner": { "memberId", "name" } | null,
                "payments": [{ "id", "memberId", "isPaid", "paidAt" }] }],
  "currentPeriodNumber": 2,
  "potAmount": 4000000
}
```

### 5.4 `POST /api/arisan/join` — Login
Body `{ "joinCode": "Ab3dE9xZ" }`.
- Kode kosong → `400 "Kode arisan wajib diisi"`
- Tidak ditemukan → `404 "Kode arisan tidak valid"`
- Status ≠ OPEN → `400 "Arisan sudah dimulai, tidak bisa bergabung"`
- Sudah member → `400 "Anda sudah tergabung di arisan ini"`
Response `{ "arisan": { "id", "name" } }`.

### 5.5 `POST /api/arisan/[id]/regenerate-code` — Admin, status OPEN
Status ≠ OPEN → `400`. Response `{ "joinCode": "..." }`.

### 5.6 `DELETE /api/arisan/[id]/members/[memberId]` — Admin, status OPEN
- Status ≠ OPEN → `400 "Anggota hanya bisa dikeluarkan sebelum arisan dimulai"`
- Target ADMIN → `400 "Admin tidak bisa dikeluarkan"`
- Member bukan milik arisan ini → `404`
Response `{ "success": true }`.

### 5.7 `POST /api/arisan/[id]/start` — Admin, status OPEN
- Anggota < 2 → `400 "Minimal 2 anggota untuk memulai arisan"`
- Status ≠ OPEN → `400`
Efek (satu `prisma.$transaction`): status → ACTIVE, buat N `ArisanPeriod` + N×N `ArisanPayment`. Kirim notifikasi in-app + OneSignal ke semua anggota: "Arisan {nama} dimulai" (di luar transaksi, best-effort).
Response `{ "arisan": { ... } }`.

### 5.8 `POST /api/arisan/[id]/draw` — Admin, status ACTIVE
Dalam satu `prisma.$transaction`:
1. Ambil periode berjalan; tidak ada → `400 "Semua periode sudah diundi"`.
2. Ambil kandidat = member `hasWon = false`; pilih dengan `crypto.randomInt(kandidat.length)`.
3. `updateMany` periode `where { id, winnerMemberId: null }` set `winnerMemberId`, `drawnAt = now`. Jika `count === 0` → `409 "Periode ini sudah diundi"`.
4. Update member `hasWon = true`.
5. Jika ini periode terakhir → arisan status COMPLETED.

Setelah commit (best-effort, error hanya di-log):
- Pemenang: "🎉 Selamat {nama}! Anda menerima arisan {nama arisan} periode {bulan tahun} sebesar Rp{pot}".
- Anggota lain: "{nama} menerima arisan {nama arisan} periode {bulan tahun}".

Response:
```json
{ "period": { "id", "periodNumber" },
  "winner": { "memberId": "...", "name": "Budi" },
  "isCompleted": false }
```

### 5.9 `PATCH /api/arisan/[id]/payments/[paymentId]` — Admin
Body `{ "isPaid": true }`. Payment harus milik periode arisan ini (selain itu `404`). `isPaid=true` → `paidAt = now`; `false` → `paidAt = null`.
Response `{ "payment": { "id", "isPaid", "paidAt" } }`.

### 5.10 `GET /api/cron/arisan-reminder` — Cron
Header `Authorization: Bearer ${CRON_SECRET}`, selain itu `401`.
Cari `ArisanPayment` dengan `isPaid=false`, `reminderSentAt=null`, `period.dueDate` jatuh pada **besok (WIB)**, arisan ACTIVE. Untuk tiap payment: kirim "Pengingat: iuran arisan {nama} Rp{iuran} jatuh tempo besok ({tanggal})", lalu set `reminderSentAt = now`.
Response `{ "sent": 3 }`.
`vercel.json`: `{ "crons": [{ "path": "/api/cron/arisan-reminder", "schedule": "0 1 * * *" }] }` (08:00 WIB).

### 5.11 Notifikasi in-app — Login
- `GET /api/notifications` → `{ "notifications": [{ "id", "title", "message", "url", "isRead", "createdAt" }], "unreadCount": 2 }` (20 terbaru, urut `createdAt desc`).
- `PATCH /api/notifications/[id]` body `{ "isRead": true }` → hanya milik user sendiri, selain itu `404`. Response `{ "notification": { ... } }`.
- `POST /api/notifications/read-all` → `{ "updated": 2 }`.

## 6. Komponen & Modul

| Unit | Tanggung jawab |
|---|---|
| `src/lib/arisan.ts` | Logika murni (tanpa Prisma): `buildPeriodDates(startMonth, n, dueDay, drawDay)`, `pickWinner(candidates, randomInt)`, `getCurrentPeriod(periods)`, `calcPot(amount, memberCount)`, `wheelStopAngle(segmentIndex, segmentCount, extraTurns)`, `tomorrowRangeWIB(now)`. Diuji unit test. |
| `src/lib/arisan-access.ts` | Helper server: `getArisanMembership(arisanId, email)` → `{ member, arisan }` atau `null`; dipakai semua route untuk cek Anggota/Admin. |
| `src/lib/notify.ts` | `sendNotification({ userIds, title, message, url })`: (1) `prisma.notification.createMany`, (2) panggil `onesignal.ts`. Error OneSignal di-catch & di-log, tidak dilempar. |
| `src/lib/onesignal.ts` | Wrapper REST OneSignal (`POST https://api.onesignal.com/notifications`, header `Authorization: Key ${ONESIGNAL_REST_API_KEY}`). Kirim dua request: push (`target_channel: "push"`, `headings`, `contents`, `url`) dan email (`target_channel: "email"`, `email_subject`, `email_body`), keduanya dengan `include_aliases: { external_id: userIds }`. Jika env kosong → skip dengan `console.warn`. |
| `src/components/onesignal-init.tsx` | Client component: load SDK `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js`, `OneSignal.init({ appId })`, `OneSignal.login(session.user.id)`, `OneSignal.User.addEmail(session.user.email)`. Dipasang di dashboard layout. |
| `src/components/notification-bell.tsx` | Lonceng + badge `unreadCount`, dropdown 20 notifikasi, klik → tandai dibaca & navigasi ke `url`, tombol "Tandai semua dibaca". Polling 60 detik saat `document.visibilityState === "visible"`. |
| `src/components/arisan/spin-wheel.tsx` | Roda SVG; props `{ members: {id,name}[], winnerId: string \| null, onSpinEnd }`. Saat `winnerId` di-set, rotasi ke `wheelStopAngle(...)` dengan transisi CSS ~5 detik `cubic-bezier(0.17,0.67,0.12,0.99)`, lalu `onSpinEnd`. Warna segmen bergiliran dari palet tetap. |
| `public/OneSignalSDKWorker.js` | `importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");` |

**Catatan:** `session.user.id` sudah tersedia lewat callback session di `src/lib/auth.ts`.

## 7. UI

### Navigasi
Tambah `{ label: "Arisan", href: "/arisan", icon: Users }` setelah "Budget" di `navItems` (`src/app/(dashboard)/layout.tsx`). `NotificationBell` dipasang di header mobile (sebelah tombol menu) dan di header sidebar desktop. `OneSignalInit` dirender sekali di layout. Pengecekan nav aktif memakai `pathname.startsWith(item.href)` agar `/arisan/[id]` tetap menyorot menu Arisan.

### `/arisan`
- List kartu arisan: nama, badge status (Pendaftaran / Berjalan / Selesai), iuran, "Periode x/N", badge "Admin".
- Tombol **Buat Arisan** → form: Nama, Iuran per bulan (`CurrencyInput`), Tanggal jatuh tempo (select 1–28), Tanggal kocokan (select 1–28), Bulan mulai (`<input type="month">`).
- Tombol **Join Arisan** → input kode → sukses redirect ke `/arisan/[id]`.
- Tombol **Aktifkan notifikasi** (memanggil `OneSignal.Notifications.requestPermission()`), disembunyikan bila izin sudah diberikan.
- Empty state bila belum ikut arisan.

### `/arisan/[id]`
1. **Header** — nama, status, iuran, pot, jadwal ("Bayar tiap tgl 5, kocokan tiap tgl 10"). Admin + OPEN: kode join + tombol salin + "Buat kode baru" + "Mulai Arisan" (konfirmasi inline).
2. **Anggota** — nama, badge Admin, ✅ "Sudah menerima (periode x)". Admin + OPEN: tombol keluarkan (kecuali admin).
3. **Kocokan** (ACTIVE) — `SpinWheel` berisi anggota `hasWon=false`. Admin: tombol "Putar" (disabled saat berputar); peringatan "x anggota belum bayar periode ini" bila ada. Setelah berhenti → modal "🎉 {nama} menerima arisan periode {bulan}!" → tutup → refetch (pemenang hilang dari roda). Jika tersisa 1 kandidat, roda tetap diputar (satu segmen penuh). Non-admin: roda statis.
4. **Pembayaran periode berjalan** (ACTIVE) — daftar anggota + status Lunas/Belum + tanggal bayar; admin bisa toggle checkbox.
5. **Riwayat** — tabel periode: bulan, tanggal kocokan, pemenang / "Belum diundi".
6. Status COMPLETED: bagian Kocokan diganti banner "Arisan selesai 🎉".

## 8. Error Handling

- Semua route dibungkus `try/catch` → `500` dengan log.
- Race condition draw dicegah oleh `updateMany ... where winnerMemberId: null` + unique `winnerMemberId` → `409`.
- Kegagalan OneSignal tidak menggagalkan aksi utama; notifikasi in-app tetap tersimpan.
- UI menampilkan pesan `error` dari API apa adanya; tombol aksi disabled selama request.
- Cron idempoten via `reminderSentAt`.

## 9. Environment Variables

Tambah ke `.env.example`:
```
# OneSignal (https://dashboard.onesignal.com) — Web Push + Email
NEXT_PUBLIC_ONESIGNAL_APP_ID=""
ONESIGNAL_REST_API_KEY=""

# Vercel Cron
CRON_SECRET=""
```

**Setup manual (di luar kode):** buat app OneSignal, aktifkan Web Push (site URL = domain Vercel & `http://localhost:3000` untuk dev) dan Email (konfigurasi domain pengirim), isi env di Vercel.

## 10. Testing

- Tambah **Vitest** (devDependency) + script `"test": "vitest run"`.
- Unit test `src/lib/arisan.ts`:
  - `buildPeriodDates`: lintas tahun (Des → Jan), tanggal 28, hasil di WIB.
  - `pickWinner`: hanya dari kandidat, index sesuai `randomInt` yang di-inject, error bila kandidat kosong.
  - `getCurrentPeriod`: periode terkecil tanpa pemenang; `null` bila semua terundi.
  - `calcPot`.
  - `wheelStopAngle`: pointer di tengah segmen target, selalu ≥ `extraTurns × 360`.
  - `tomorrowRangeWIB`: batas hari benar di sekitar tengah malam WIB.
- Verifikasi manual (checklist di plan): alur create → join (akun kedua) → start → bayar → draw sampai COMPLETED, double-click draw, akses non-anggota (`404`), non-admin (`403`), cron dengan/ tanpa secret, notifikasi push/email/in-app.
- `npm run build` & `npm run lint` lulus.

## 11. Migrasi

`npx prisma migrate dev --name add_arisan_and_notifications` (dijalankan developer). Tidak ada perubahan data existing.
