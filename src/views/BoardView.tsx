import { useState } from "react";
import type { ContentItem, Stage, Status } from "../types";
import { useApp } from "../state/AppContext";
import {
  CHANNEL_ICONS, FORMAT_LABELS, STAGES, STAGE_LABELS, STATUSES,
  STATUS_COLORS, STATUS_LABELS,
} from "../data/constants";
import { memberName, todayISO } from "../logic/rules";
import { FilterBar, useContentFilters } from "../components/Filters";
import { ConfirmDialog, StatusBadge } from "../components/ui";

export function BoardView({ onOpen }: { onOpen: (id: string) => void }) {
  const app = useApp();
  const [mode, setMode] = useState<"stage" | "status">("stage");
  const { filters, setFilters, filtered } = useContentFilters(app.items);
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const today = todayISO();
  const columns: string[] = mode === "stage" ? STAGES : STATUSES;
  const colItems = (col: string) =>
    filtered.filter((it) => (mode === "stage" ? it.stage === col : it.status === col));

  const handleDrop = (col: string, id: string) => {
    setDragOver(null);
    if (mode === "stage") {
      const res = app.moveStage(id, col as Stage);
      if (!res.ok && res.message) {
        setConfirm({ message: res.message, action: () => app.moveStage(id, col as Stage, { override: true }) });
      }
    } else {
      const res = app.setStatus(id, col as Status);
      if (!res.ok && res.message) alert(res.message);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Board</h1>
          <p className="text-sm text-slate-500">Drag kartu antar kolom untuk memindahkan {mode === "stage" ? "tahap" : "status"}.</p>
        </div>
        <div className="flex rounded-md border border-slate-300 overflow-hidden">
          {(["stage", "status"] as const).map((m) => (
            <button
              key={m}
              className={`px-3 py-1.5 text-sm font-medium cursor-pointer ${mode === m ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}
              onClick={() => setMode(m)}
            >
              Per {m === "stage" ? "Tahap" : "Status"}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-3 mb-3">
        <FilterBar filters={filters} setFilters={setFilters} items={app.items} />
      </div>

      <div className="flex flex-1 gap-3 overflow-x-auto pb-3">
        {columns.map((col) => {
          const items = colItems(col);
          const label = mode === "stage" ? STAGE_LABELS[col as Stage] : STATUS_LABELS[col as Status];
          return (
            <div
              key={col}
              className={`flex w-60 shrink-0 flex-col rounded-lg border bg-slate-50 ${
                dragOver === col ? "border-indigo-400 bg-indigo-50" : "border-slate-200"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
              onDragLeave={() => setDragOver((d) => (d === col ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) handleDrop(col, id);
              }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
                <span className="rounded-full bg-slate-200 px-1.5 text-xs font-semibold text-slate-600">{items.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {items.map((it) => (
                  <BoardCard key={it.id} item={it} today={today} onOpen={onOpen} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel="Override & pindahkan"
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function BoardCard({ item, today, onOpen }: { item: ContentItem; today: string; onOpen: (id: string) => void }) {
  const app = useApp();
  const overdue = item.stageDeadline && item.stageDeadline < today &&
    !["tayang", "dianalisis", "batal", "expired"].includes(item.status);
  const c = STATUS_COLORS[item.status];
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
      onClick={() => onOpen(item.id)}
      className={`cursor-pointer rounded-md border bg-white p-2.5 shadow-sm hover:shadow ${
        overdue ? "border-rose-400 ring-1 ring-rose-300" : c.border
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] text-slate-400">{item.id}</span>
        <StatusBadge status={item.status} />
      </div>
      <div className="text-sm font-medium leading-snug text-slate-800">{item.title || "(tanpa judul)"}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
        <span className="font-semibold">{item.channel.map((ch) => CHANNEL_ICONS[ch]).join(" ")}</span>
        <span>{FORMAT_LABELS[item.format]}</span>
        {item.currentPIC && <span>· {memberName(app.config, item.currentPIC)}</span>}
        {item.stageDeadline && (
          <span className={overdue ? "font-bold text-rose-600" : ""}>
            ⏰ {item.stageDeadline}{overdue ? " (lewat!)" : ""}
          </span>
        )}
        {item.priority === "tinggi" && <span className="font-semibold text-amber-600">prioritas tinggi</span>}
      </div>
    </div>
  );
}
