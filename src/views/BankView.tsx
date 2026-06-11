import { useMemo, useState } from "react";
import type { ContentItem } from "../types";
import { useApp } from "../state/AppContext";
import { CHANNEL_ICONS, FORMAT_LABELS } from "../data/constants";
import { bankHealth, daysUntil, todayISO } from "../logic/rules";
import { EmptyState, Modal, Pill, StatusBadge, fmtDate } from "../components/ui";

export function BankView({ onOpen }: { onOpen: (id: string) => void }) {
  const app = useApp();
  const [scheduling, setScheduling] = useState<ContentItem | null>(null);
  const [date, setDate] = useState(todayISO());

  const banked = useMemo(() => app.items.filter((it) => it.isBanked), [app.items]);
  const evergreen = banked.filter((it) => it.bankType === "evergreen" && it.status !== "expired");
  const trend = banked.filter((it) => it.bankType === "trend" && it.status !== "expired");
  const expired = banked.filter((it) => it.status === "expired");

  const readyCount = banked.filter((it) => it.status !== "expired").length;
  const health = bankHealth(readyCount, app.config);
  const healthStyle = {
    kurang: "bg-rose-100 text-rose-700 border-rose-300",
    sehat: "bg-green-100 text-green-700 border-green-300",
    menumpuk: "bg-amber-100 text-amber-700 border-amber-300",
  }[health];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Content Bank</h1>
          <p className="text-sm text-slate-500">Stok konten siap pakai untuk mengisi slot kosong kalender.</p>
        </div>
        <div className={`rounded-lg border px-4 py-2 text-sm font-semibold ${healthStyle}`}>
          Kesehatan bank: {health.toUpperCase()} — {readyCount} konten
          <span className="font-normal"> (sehat: {app.config.bankHealthyMin}–{app.config.bankHealthyMax})</span>
        </div>
      </div>

      <Section title={`Evergreen (${evergreen.length})`} hint="Tanpa expiry — aman disimpan lama.">
        {evergreen.length === 0
          ? <EmptyState>Belum ada konten evergreen di bank.</EmptyState>
          : <CardGrid items={evergreen} onOpen={onOpen} onSchedule={setScheduling} />}
      </Section>

      <Section title={`Trend (${trend.length})`} hint="Punya tanggal kedaluwarsa — pakai sebelum basi.">
        {trend.length === 0
          ? <EmptyState>Belum ada konten trend di bank.</EmptyState>
          : <CardGrid items={trend} onOpen={onOpen} onSchedule={setScheduling} showCountdown />}
      </Section>

      {expired.length > 0 && (
        <Section title={`Expired (${expired.length})`} hint="Lewat masa berlaku — arsipkan atau hapus.">
          <CardGrid items={expired} onOpen={onOpen} onSchedule={setScheduling} expired />
        </Section>
      )}

      {scheduling && (
        <Modal title={`Jadwalkan: ${scheduling.title}`} onClose={() => setScheduling(null)}>
          <p className="mb-3 text-sm text-slate-600">
            Konten keluar dari bank dan masuk kalender tayang.
          </p>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setScheduling(null)}>Batal</button>
            <button
              className="btn-primary"
              onClick={() => {
                app.scheduleFromBank(scheduling.id, date);
                setScheduling(null);
              }}
            >
              Jadwalkan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-base font-bold">{title}</h2>
        <span className="text-xs text-slate-400">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function CardGrid({
  items, onOpen, onSchedule, showCountdown, expired,
}: {
  items: ContentItem[];
  onOpen: (id: string) => void;
  onSchedule: (item: ContentItem) => void;
  showCountdown?: boolean;
  expired?: boolean;
}) {
  const app = useApp();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => {
        const left = it.expiryDate ? daysUntil(it.expiryDate) : null;
        const urgent = showCountdown && left != null && left <= 7;
        return (
          <div key={it.id} className={`card p-3 ${urgent ? "border-rose-300 ring-1 ring-rose-200" : ""} ${expired ? "opacity-60" : ""}`}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-400">{it.id}</span>
              <StatusBadge status={it.status} />
            </div>
            <button className="text-left text-sm font-medium hover:text-indigo-600 cursor-pointer" onClick={() => onOpen(it.id)}>
              {it.title || "(tanpa judul)"}
            </button>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold">{it.channel.map((c) => CHANNEL_ICONS[c]).join(" ")}</span>
              <span>{FORMAT_LABELS[it.format]}</span>
              {it.pillar && <Pill>{it.pillar}</Pill>}
            </div>
            {showCountdown && it.expiryDate && (
              <div className={`mt-2 text-xs font-semibold ${urgent ? "text-rose-600" : "text-slate-500"}`}>
                {left! >= 0 ? `⏳ ${left} hari lagi (expiry ${fmtDate(it.expiryDate)})` : `Expired ${fmtDate(it.expiryDate)}`}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {!expired && (
                <button className="btn-primary !px-2.5 !py-1 text-xs" onClick={() => onSchedule(it)}>Jadwalkan</button>
              )}
              {expired && (
                <button
                  className="btn-secondary !px-2.5 !py-1 text-xs"
                  onClick={() => app.updateItem(it.id, { isBanked: false, status: "batal" }, "di-archive dari bank (expired)")}
                >
                  Archive
                </button>
              )}
              <button className="btn-secondary !px-2.5 !py-1 text-xs" onClick={() => onOpen(it.id)}>Detail</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
