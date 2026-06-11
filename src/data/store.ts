import type { AppData } from "../types";

/**
 * Lapisan abstraksi penyimpanan (§9).
 * v1: localStorage. v2: tinggal ganti implementasi (Supabase/Postgres/dll)
 * tanpa mengubah UI — UI hanya bicara lewat interface ini.
 */
export interface DataStore {
  load(): AppData | null;
  save(data: AppData): void;
  clear(): void;
}

const STORAGE_KEY = "smd-dashboard-v1";

export class LocalStorageDataStore implements DataStore {
  load(): AppData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AppData;
    } catch (e) {
      console.error("Gagal memuat data dari localStorage:", e);
      return null;
    }
  }

  save(data: AppData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Gagal menyimpan data ke localStorage:", e);
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const dataStore: DataStore = new LocalStorageDataStore();

// ===== Export / Import (§9) =====

export function exportJSON(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smd-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(data: AppData): void {
  const cols = [
    "id", "title", "campaign", "channel", "format", "pillar", "contentType",
    "stage", "status", "priority", "hook", "currentPIC", "scheduledDate",
    "isBanked", "bankType", "expiryDate", "views", "engagement", "shares",
    "saves", "insight", "notes",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = data.items.map((it) =>
    [
      it.id, it.title, it.campaign ?? "", it.channel.join("|"), it.format,
      it.pillar, it.contentType, it.stage, it.status, it.priority, it.hook,
      it.currentPIC ?? "", it.scheduledDate ?? "", it.isBanked,
      it.bankType ?? "", it.expiryDate ?? "", it.results?.views ?? "",
      it.results?.engagement ?? "", it.results?.shares ?? "",
      it.results?.saves ?? "", it.insight ?? "", it.notes,
    ].map(esc).join(",")
  );
  const csv = [cols.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smd-konten-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as AppData;
        if (!data.config || !Array.isArray(data.items)) {
          throw new Error("Format file tidak valid — bukan backup dashboard ini.");
        }
        resolve(data);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
