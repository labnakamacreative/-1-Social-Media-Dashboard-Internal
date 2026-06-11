# Social Media Dashboard — Internal (All-in-One, In-House)

Dashboard social media management untuk tim konten in-house: satu konten = satu entitas
yang hidup dari **brief sampai analisis** (11 tahap), dengan **Analysis Engine 6-step**
sebagai modul pembeda. Dibangun sesuai spesifikasi `BRIEF UNTUK CLAUDE CODE`.

## Menjalankan

```bash
npm install
npm run dev      # development (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # serve hasil build
```

Aplikasi langsung terisi **data demo** saat pertama dibuka (bisa di-reset/diganti lewat
Settings → Reset / Import JSON).

## Stack

- React 19 + TypeScript + Vite + Tailwind CSS v4
- Tanpa backend (v1) — persistensi di `localStorage` lewat lapisan abstraksi `DataStore`
  (`src/data/store.ts`), siap diganti backend (Supabase/Postgres) tanpa mengubah UI
- Export/Import JSON + Export CSV untuk backup & migrasi

## Fitur (mengacu acceptance criteria brief §10 & §13.9)

| Area | Implementasi |
|---|---|
| Content Item | Seluruh field §2.1 + atribut pattern §2.7, ID auto `YYMM-XXX`, activity log |
| 11 tahap | brief → riset → strategy → ideation → planning → copywriting → take → design → editing → upload → analisis |
| Board (kanban) | Kolom per tahap **atau** per status (toggle), drag-and-drop, alarm deadline merah, filter lengkap |
| Calendar | Bulanan + mingguan, drag re-schedule, indikator slot kosong, tombol "isi slot dari Bank" |
| Content Bank | Evergreen vs Trend, countdown & alarm expiry (≤7 hari), auto-expired (job saat app dibuka), health indicator, "jadwalkan dari bank" |
| Pipeline/List | Tabel master, kolom show/hide, sort/filter/search, inline edit (stage, status, PIC, deadline) |
| Brief Gate | Blokir maju ke produksi bila brief belum lengkap, override + tercatat di log |
| Approval | Auto `needsApproval` untuk KOL/affiliate/ads, blokir siap/tayang sebelum approved, inbox dengan SLA 24 jam, revisi → revisionCount++ & kembali ke PIC produksi |
| My Queue | Antrian per PIC urut deadline, tombol "selesai & serahkan" (handoff otomatis) |
| Handoff | PIC per tahap (`assignments`), auto-set PIC + `receivedAt` saat tahap maju, tercatat di log |
| Settings | Seluruh BrandConfig: tim, role, pillar, goals, banking, bucket durasi, daftar nilai atribut, auto-rekomendasi config saat jumlah member berubah (§3.1) |
| Goal-agnostic | Field/metrik sales (linkClicks, conversions) hanya tampil bila goal sales/leads |
| Industri | Pilihan industri men-set default expiry/bank (§6), user bisa override |
| Dashboard | Funnel produksi, konsistensi posting vs target, kesehatan bank, beban per PIC, alarm deadline |

### Analysis Engine (§13) — lapisan deterministik penuh, tanpa AI

- **Step 1 Overview:** agregat + delta vs periode sebelumnya, outlier >2σ, distribusi Pareto, anomali struktural (arah metrik berlawanan)
- **Step 2 Detail:** tabel per konten dengan badge "X× rata-rata" + kelengkapan atribut
- **Step 3 Ranking:** Top/Worst per metrik, proporsi `max(3, 10%)`, ≥3 metrik (default Views/Shares/Retention 1s + rasional), cross-ranking insight otomatis (konsisten lintas metrik / diagnosa silang)
- **Step 4 Pattern:** per kelompok ranking, bahasa "X dari Y", label RELASIONAL/KORELASI/HIPOTESIS (bisa diubah user, RELASIONAL wajib mekanisme), cross-pattern (kandidat formula), differentiator Top-vs-Worst, absence pattern, bucket durasi konfigurabel
- **Step 5 Kesimpulan:** form terstruktur, traceable ke pattern, label RELASIONAL/NON-RELASIONAL, template 6 jenis poin
- **Step 6 Saran:** dua kategori (Based on Data / Eksploratif), prioritas impact, **"Jadikan Ide Konten"** → Content Item baru ber-stage ideation (menutup loop)
- Flag kualitas data (<30 konten, atribut <50%) + banner Pengayaan Konteks dengan **bulk edit atribut per faktor**
- Kedalaman per kadens: mingguan menampilkan pattern paling mencolok saja, bulanan penuh (toggle "tampilkan semua faktor")
- Report tersimpan sebagai entitas `AnalysisReport`, bisa dibuka ulang

## Struktur kode

```
src/
  types.ts              # seluruh skema (ContentItem, BrandConfig, AnalysisReport)
  data/
    constants.ts        # enum, label, warna status, faktor pattern
    store.ts            # DataStore abstraction + localStorage + export/import
    seed.ts             # data demo (relatif terhadap tanggal hari ini)
  logic/
    rules.ts            # brief gate, handoff, banking/expiry, approval, auto-rekomendasi, konsistensi, beban tim
    analysis.ts         # Analysis Engine deterministik (overview, ranking, pattern, absence, flags)
  state/AppContext.tsx  # state + seluruh aksi workflow (single source of truth)
  components/           # UI bersama: modal konten, form atribut, bulk edit, filter
  views/                # Dashboard, Board, Calendar, Bank, Pipeline, MyQueue, Approvals, Analytics, Report, Settings
```

## Asumsi & keputusan teknis (dicatat sesuai instruksi brief)

1. **Persistensi:** `localStorage` (aplikasi lokal mandiri, diizinkan §9). Abstraksi `DataStore` membuat migrasi ke IndexedDB/backend hanya mengganti satu file.
2. **"Login":** pemilih anggota aktif di sidebar (tanpa autentikasi) — cukup untuk role-based view & audit trail v1.
3. **Reminder isi hasil (§5.6):** diimplementasikan sebagai status `tayang` yang tetap terlihat menonjol + field results/insight di modal konten; tanpa notifikasi push (tidak ada backend).
4. **SLA approval:** fixed 24 jam (highlight merah bila lewat); bisa dijadikan config di v2.
5. **Pattern otomatis:** nilai dominan dihitung bila muncul di ≥50% anggota kelompok dan ≥2 konten; ≥3 konten → KORELASI, kurang → HIPOTESIS. Upgrade ke RELASIONAL dilakukan user dengan mengisi mekanisme (sistem tidak mengarang kausalitas).
6. **Lapisan naratif AI (§13.0 lapisan 2):** belum diimplementasikan (opsional terakhir per §13.10); seluruh lapisan deterministik berfungsi penuh dan form manual tersedia.
7. **Pareto:** dihitung sebagai kontribusi views dari 20% konten teratas.
8. **Cross-pattern:** kombinasi 2 faktor yang muncul di ≥67% kelompok (maks 5 ditampilkan per kelompok agar UI tidak banjir).
9. **Approval inbox:** konten tanpa reviewer spesifik tampil untuk semua user (asumsi tim kecil); bila reviewer di-set, hanya tampil bagi reviewer tersebut.
