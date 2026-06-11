import { useMemo, useState } from "react";
import { useApp } from "../state/AppContext";
import {
  CHANNEL_ICONS, FORMAT_LABELS, STAGE_LABELS,
} from "../data/constants";
import { ACTIVE_STATUSES, memberName, nextStage, todayISO } from "../logic/rules";
import { ConfirmDialog, EmptyState, StatusBadge, fmtDate } from "../components/ui";

export function MyQueueView({ onOpen }: { onOpen: (id: string) => void }) {
  const app = useApp();
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);

  const today = todayISO();
  const mine = useMemo(
    () =>
      app.items
        .filter((it) => it.currentPIC === app.currentUser && ACTIVE_STATUSES.includes(it.status))
        .sort((a, b) => (a.stageDeadline ?? "9999").localeCompare(b.stageDeadline ?? "9999")),
    [app.items, app.currentUser]
  );

  const handoff = (id: string) => {
    const item = app.items.find((it) => it.id === id);
    if (!item) return;
    const next = nextStage(item.stage);
    if (!next) return;
    const res = app.moveStage(id, next);
    if (!res.ok && res.message) {
      setConfirm({ message: res.message, action: () => app.moveStage(id, next, { override: true }) });
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold">My Queue — {memberName(app.config, app.currentUser)}</h1>
        <p className="text-sm text-slate-500">Antrian tugas pribadi, diurutkan deadline. {mine.length} konten aktif di tanganmu.</p>
      </div>

      {mine.length === 0 ? (
        <EmptyState>Antrian kosong — tidak ada konten aktif yang dipegang user ini. 🎉</EmptyState>
      ) : (
        <div className="space-y-2">
          {mine.map((it) => {
            const overdue = it.stageDeadline && it.stageDeadline < today;
            const next = nextStage(it.stage);
            const nextPIC = next ? it.assignments[next] : undefined;
            return (
              <div key={it.id} className={`card flex flex-wrap items-center gap-3 p-3 ${overdue ? "border-rose-300 bg-rose-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">{it.id}</span>
                    <StatusBadge status={it.status} />
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                      {STAGE_LABELS[it.stage]}
                    </span>
                  </div>
                  <button className="mt-0.5 block truncate text-left text-sm font-medium hover:text-indigo-600 cursor-pointer" onClick={() => onOpen(it.id)}>
                    {it.title || "(tanpa judul)"}
                  </button>
                  <div className="text-xs text-slate-500">
                    {it.channel.map((c) => CHANNEL_ICONS[c]).join(" ")} · {FORMAT_LABELS[it.format]}
                    {it.stageDeadline && (
                      <span className={overdue ? " font-bold text-rose-600" : ""}>
                        {" "}· deadline {fmtDate(it.stageDeadline)}{overdue ? " (lewat!)" : ""}
                      </span>
                    )}
                  </div>
                </div>
                {next && (
                  <button className="btn-primary" onClick={() => handoff(it.id)}>
                    Selesai & serahkan → {STAGE_LABELS[next]}
                    {nextPIC ? ` (${memberName(app.config, nextPIC)})` : ""}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel="Override & serahkan"
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
