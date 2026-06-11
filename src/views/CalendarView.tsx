import { useMemo, useState } from "react";
import type { ViewKey } from "../App";
import { useApp } from "../state/AppContext";
import { CHANNEL_ICONS, FORMAT_LABELS, STATUS_COLORS } from "../data/constants";
import { todayISO } from "../logic/rules";

function isoOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarView({ onOpen, goTo }: { onOpen: (id: string) => void; goTo: (v: ViewKey) => void }) {
  const app = useApp();
  const [mode, setMode] = useState<"bulan" | "minggu">("bulan");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  });
  const [dragOver, setDragOver] = useState<string | null>(null);

  const today = todayISO();
  const scheduled = useMemo(
    () => app.items.filter((it) => it.scheduledDate && it.status !== "batal"),
    [app.items]
  );
  const byDate = useMemo(() => {
    const map: Record<string, typeof scheduled> = {};
    for (const it of scheduled) (map[it.scheduledDate!] ??= []).push(it);
    return map;
  }, [scheduled]);

  const days: string[] = useMemo(() => {
    if (mode === "minggu") {
      const base = new Date(cursor.y, cursor.m, cursor.d);
      const monday = new Date(base);
      monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
      });
    }
    const first = new Date(cursor.y, cursor.m, 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
    });
  }, [mode, cursor]);

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const navigate = (dir: number) => {
    if (mode === "bulan") {
      const d = new Date(cursor.y, cursor.m + dir, 1);
      setCursor({ y: d.getFullYear(), m: d.getMonth(), d: 1 });
    } else {
      const d = new Date(cursor.y, cursor.m, cursor.d + dir * 7);
      setCursor({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });
    }
  };

  // slot kosong: hari ke depan dalam tampilan tanpa konten terjadwal (§4.2)
  const emptyUpcoming = days.filter((d) => d >= today && !(byDate[d]?.length)).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Calendar</h1>
          <p className="text-sm text-slate-500">
            Drag konten ke tanggal lain untuk re-schedule. {emptyUpcoming > 0 && (
              <span className="text-amber-600 font-medium">{emptyUpcoming} slot kosong ke depan — jaga konsistensi posting.</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => goTo("bank")}>Isi slot dari Bank →</button>
          <div className="flex rounded-md border border-slate-300 overflow-hidden">
            {(["bulan", "minggu"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-sm font-medium cursor-pointer ${mode === m ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}>
                {m === "bulan" ? "Bulanan" : "Mingguan"}
              </button>
            ))}
          </div>
          <button className="btn-secondary" onClick={() => navigate(-1)}>←</button>
          <span className="text-sm font-semibold w-36 text-center">{monthLabel}</span>
          <button className="btn-secondary" onClick={() => navigate(1)}>→</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <div key={d} className="px-2 py-1.5 text-center text-xs font-bold uppercase text-slate-500">{d}</div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${mode === "minggu" ? "" : ""}`}>
          {days.map((date) => {
            const inMonth = mode === "minggu" || date.slice(5, 7) === String(cursor.m + 1).padStart(2, "0");
            const items = byDate[date] ?? [];
            const isToday = date === today;
            const isEmptyFuture = date >= today && items.length === 0 && inMonth;
            return (
              <div
                key={date}
                className={`min-h-24 border-b border-r border-slate-100 p-1 ${
                  !inMonth ? "bg-slate-50 opacity-50" : isEmptyFuture ? "bg-amber-50/50" : ""
                } ${dragOver === date ? "bg-indigo-50 ring-1 ring-inset ring-indigo-300" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(date); }}
                onDragLeave={() => setDragOver((d) => (d === date ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) app.scheduleItem(id, date);
                }}
              >
                <div className={`mb-1 text-right text-xs ${isToday ? "font-bold text-indigo-600" : "text-slate-400"}`}>
                  {Number(date.slice(8))}{isToday ? " · hari ini" : ""}
                </div>
                <div className="space-y-1">
                  {items.map((it) => {
                    const c = STATUS_COLORS[it.status];
                    return (
                      <div
                        key={it.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", it.id)}
                        onClick={() => onOpen(it.id)}
                        className={`cursor-pointer rounded border px-1.5 py-1 text-[11px] leading-tight ${c.bg} ${c.text} ${c.border}`}
                        title={it.title}
                      >
                        <span className="font-bold">{it.channel.map((ch) => CHANNEL_ICONS[ch]).join(" ")}</span>{" "}
                        <span className="opacity-70">{FORMAT_LABELS[it.format]}</span>
                        <div className="truncate font-medium">{it.title || "(tanpa judul)"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
