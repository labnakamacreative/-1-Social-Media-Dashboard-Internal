import { useMemo, useState } from "react";
import type { ContentItem } from "../types";
import { useApp } from "../state/AppContext";
import { CHANNEL_ICONS, CONTENT_TYPE_LABELS, FORMAT_LABELS, STAGE_LABELS } from "../data/constants";
import { memberName } from "../logic/rules";
import { EmptyState, Modal, Pill, StatusBadge } from "../components/ui";

const SLA_HOURS = 24;

export function ApprovalsView({ onOpen }: { onOpen: (id: string) => void }) {
  const app = useApp();
  const [revising, setRevising] = useState<ContentItem | null>(null);
  const [note, setNote] = useState("");
  const [now] = useState(() => Date.now());

  const pending = useMemo(
    () =>
      app.items.filter(
        (it) =>
          it.needsApproval &&
          it.approvalStatus === "pending" &&
          (it.reviewers.length === 0 || !app.currentUser || it.reviewers.includes(app.currentUser))
      ),
    [app.items, app.currentUser]
  );

  const pendingHours = (it: ContentItem): number => {
    // pending sejak update approval terakhir / sejak konten dibuat
    const lastDecision = [...it.activityLog].reverse().find(
      (e) => e.action === "approved" || e.action === "revisi diminta"
    );
    const since = lastDecision?.timestamp ?? it.receivedAt ?? it.createdAt;
    return Math.round((now - new Date(since).getTime()) / 3600000);
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold">Approval Inbox</h1>
        <p className="text-sm text-slate-500">
          Konten menunggu keputusan reviewer ({memberName(app.config, app.currentUser)}). SLA: {SLA_HOURS} jam.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState>Tidak ada konten menunggu approval. ✅</EmptyState>
      ) : (
        <div className="space-y-2">
          {pending.map((it) => {
            const hours = pendingHours(it);
            const overSLA = hours > SLA_HOURS;
            return (
              <div key={it.id} className={`card flex flex-wrap items-center gap-3 p-3 ${overSLA ? "border-rose-300 bg-rose-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">{it.id}</span>
                    <StatusBadge status={it.status} />
                    <Pill tone="purple">{CONTENT_TYPE_LABELS[it.contentType]}</Pill>
                    <Pill tone="indigo">{STAGE_LABELS[it.stage]}</Pill>
                    <span className={`text-xs font-semibold ${overSLA ? "text-rose-600" : "text-slate-400"}`}>
                      pending {hours} jam{overSLA ? " — lewat SLA!" : ""}
                    </span>
                  </div>
                  <button className="mt-0.5 block truncate text-left text-sm font-medium hover:text-indigo-600 cursor-pointer" onClick={() => onOpen(it.id)}>
                    {it.title || "(tanpa judul)"}
                  </button>
                  <div className="text-xs text-slate-500">
                    {it.channel.map((c) => CHANNEL_ICONS[c]).join(" ")} · {FORMAT_LABELS[it.format]} ·
                    PIC: {memberName(app.config, it.currentPIC)} · revisi sebelumnya: {it.revisionCount}×
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={() => app.approve(it.id)}>Approve</button>
                  <button className="btn-danger" onClick={() => { setRevising(it); setNote(""); }}>Minta Revisi</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {revising && (
        <Modal title={`Minta revisi: ${revising.title}`} onClose={() => setRevising(null)}>
          <p className="mb-2 text-sm text-slate-600">
            Catatan revisi wajib diisi — dikembalikan ke PIC produksi & revisionCount naik.
          </p>
          <textarea
            className="input" rows={3} autoFocus
            placeholder="Apa yang perlu diperbaiki?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setRevising(null)}>Batal</button>
            <button
              className="btn-danger"
              disabled={!note.trim()}
              onClick={() => {
                app.requestRevision(revising.id, note.trim());
                setRevising(null);
              }}
            >
              Kirim Revisi
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
