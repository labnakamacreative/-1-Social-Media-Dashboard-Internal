import { useMemo, useState } from "react";
import type { ContentItem, Stage, Status } from "../types";
import { useApp } from "../state/AppContext";
import {
  CHANNEL_ICONS, FORMAT_LABELS, STAGES, STAGE_LABELS, STATUSES, STATUS_LABELS,
} from "../data/constants";
import { memberName, todayISO } from "../logic/rules";
import { FilterBar, useContentFilters } from "../components/Filters";
import { fmtDate, fmtNum } from "../components/ui";

type SortKey = "id" | "title" | "stage" | "status" | "pic" | "deadline" | "scheduled" | "views";

const ALL_COLUMNS = [
  "channel", "format", "pillar", "campaign", "tipe", "stage", "status", "prioritas",
  "pic", "deadline", "scheduled", "views", "revisi",
] as const;
type Column = (typeof ALL_COLUMNS)[number];

export function PipelineView({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const app = useApp();
  const { filters, setFilters, filtered } = useContentFilters(app.items);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDesc, setSortDesc] = useState(true);
  const [visibleCols, setVisibleCols] = useState<Set<Column>>(
    new Set<Column>(["channel", "format", "pillar", "stage", "status", "pic", "deadline", "scheduled", "views"])
  );
  const [showColPicker, setShowColPicker] = useState(false);

  const sorted = useMemo(() => {
    const val = (it: ContentItem): string | number => {
      switch (sortKey) {
        case "id": return it.id;
        case "title": return it.title;
        case "stage": return STAGES.indexOf(it.stage);
        case "status": return STATUSES.indexOf(it.status);
        case "pic": return memberName(app.config, it.currentPIC);
        case "deadline": return it.stageDeadline ?? "9999";
        case "scheduled": return it.scheduledDate ?? "9999";
        case "views": return it.results?.views ?? -1;
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a); const vb = val(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDesc ? -cmp : cmp;
    });
  }, [filtered, sortKey, sortDesc, app.config]);

  const th = (key: SortKey | null, label: string) => (
    <th
      className={`px-2 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap ${key ? "cursor-pointer hover:text-slate-700" : ""}`}
      onClick={() => {
        if (!key) return;
        if (sortKey === key) setSortDesc(!sortDesc);
        else { setSortKey(key); setSortDesc(false); }
      }}
    >
      {label}{sortKey === key ? (sortDesc ? " ↓" : " ↑") : ""}
    </th>
  );

  const today = todayISO();
  const show = (c: Column) => visibleCols.has(c);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pipeline — Tabel Master</h1>
          <p className="text-sm text-slate-500">{sorted.length} dari {app.items.length} konten. Semua view lain turunan dari koleksi ini.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button className="btn-secondary" onClick={() => setShowColPicker(!showColPicker)}>Kolom ▾</button>
            {showColPicker && (
              <div className="absolute right-0 z-10 mt-1 w-44 card p-2">
                {ALL_COLUMNS.map((c) => (
                  <label key={c} className="flex items-center gap-2 px-1 py-0.5 text-sm">
                    <input
                      type="checkbox"
                      checked={visibleCols.has(c)}
                      onChange={(e) => {
                        const next = new Set(visibleCols);
                        if (e.target.checked) next.add(c); else next.delete(c);
                        setVisibleCols(next);
                      }}
                    />
                    {c}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={onNew}>+ Konten Baru</button>
        </div>
      </div>

      <div className="card p-3 mb-3">
        <FilterBar filters={filters} setFilters={setFilters} items={app.items} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {th("id", "ID")}
              {th("title", "Judul")}
              {show("channel") && th(null, "Channel")}
              {show("format") && th(null, "Format")}
              {show("pillar") && th(null, "Pillar")}
              {show("campaign") && th(null, "Campaign")}
              {show("tipe") && th(null, "Tipe")}
              {show("stage") && th("stage", "Tahap")}
              {show("status") && th("status", "Status")}
              {show("prioritas") && th(null, "Prio")}
              {show("pic") && th("pic", "PIC")}
              {show("deadline") && th("deadline", "Deadline")}
              {show("scheduled") && th("scheduled", "Tayang")}
              {show("views") && th("views", "Views")}
              {show("revisi") && th(null, "Rev")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((it) => {
              const overdue = it.stageDeadline && it.stageDeadline < today &&
                !["tayang", "dianalisis", "batal", "expired"].includes(it.status);
              return (
                <tr key={it.id} className={`border-b border-slate-100 hover:bg-slate-50 ${overdue ? "bg-rose-50" : ""}`}>
                  <td className="px-2 py-1.5 font-mono text-xs text-slate-500 whitespace-nowrap">{it.id}</td>
                  <td className="px-2 py-1.5 max-w-64">
                    <button className="text-left font-medium text-slate-800 hover:text-indigo-600 cursor-pointer truncate block w-full" onClick={() => onOpen(it.id)}>
                      {it.title || "(tanpa judul)"}
                    </button>
                  </td>
                  {show("channel") && (
                    <td className="px-2 py-1.5 text-xs text-slate-500 whitespace-nowrap">
                      {it.channel.map((c) => CHANNEL_ICONS[c]).join(" ")}
                    </td>
                  )}
                  {show("format") && <td className="px-2 py-1.5 text-xs whitespace-nowrap">{FORMAT_LABELS[it.format]}</td>}
                  {show("pillar") && <td className="px-2 py-1.5 text-xs whitespace-nowrap">{it.pillar || "—"}</td>}
                  {show("campaign") && <td className="px-2 py-1.5 text-xs whitespace-nowrap">{it.campaign ?? "—"}</td>}
                  {show("tipe") && <td className="px-2 py-1.5 text-xs whitespace-nowrap">{it.contentType}</td>}
                  {show("stage") && (
                    <td className="px-2 py-1.5">
                      <select
                        className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs cursor-pointer"
                        value={it.stage}
                        onChange={(e) => {
                          const res = app.moveStage(it.id, e.target.value as Stage);
                          if (!res.ok && res.message && window.confirm(res.message)) {
                            app.moveStage(it.id, e.target.value as Stage, { override: true });
                          }
                        }}
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                      </select>
                    </td>
                  )}
                  {show("status") && (
                    <td className="px-2 py-1.5">
                      <select
                        className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs cursor-pointer"
                        value={it.status}
                        onChange={(e) => {
                          const res = app.setStatus(it.id, e.target.value as Status);
                          if (!res.ok && res.message) alert(res.message);
                        }}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                  )}
                  {show("prioritas") && <td className="px-2 py-1.5 text-xs">{it.priority}</td>}
                  {show("pic") && (
                    <td className="px-2 py-1.5">
                      <select
                        className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs cursor-pointer"
                        value={it.currentPIC ?? ""}
                        onChange={(e) => app.updateItem(it.id, { currentPIC: e.target.value || null })}
                      >
                        <option value="">—</option>
                        {app.config.members.filter((m) => m.active).map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  {show("deadline") && (
                    <td className={`px-2 py-1.5 text-xs whitespace-nowrap ${overdue ? "font-semibold text-rose-600" : ""}`}>
                      <input
                        type="date"
                        className="bg-transparent cursor-pointer"
                        value={it.stageDeadline ?? ""}
                        onChange={(e) => app.updateItem(it.id, { stageDeadline: e.target.value || undefined })}
                      />
                    </td>
                  )}
                  {show("scheduled") && <td className="px-2 py-1.5 text-xs whitespace-nowrap">{fmtDate(it.scheduledDate)}</td>}
                  {show("views") && <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap">{fmtNum(it.results?.views)}</td>}
                  {show("revisi") && <td className="px-2 py-1.5 text-xs text-center">{it.revisionCount}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Tidak ada konten yang cocok dengan filter.</div>}
      </div>
    </div>
  );
}
