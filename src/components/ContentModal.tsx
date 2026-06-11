import { useState } from "react";
import type { ContentItem, ContentResults, Stage, Status, Channel } from "../types";
import { useApp } from "../state/AppContext";
import {
  CHANNELS, CHANNEL_LABELS, CONTENT_TYPES, CONTENT_TYPE_LABELS, FORMATS,
  FORMAT_LABELS, PRIORITIES, STAGES, STAGE_LABELS, STATUSES, STATUS_LABELS,
  VIDEO_FORMATS,
} from "../data/constants";
import { isBriefComplete, memberName, nextStage } from "../logic/rules";
import { attributeCompleteness } from "../logic/analysis";
import { ConfirmDialog, Field, Modal, Pill, StatusBadge, fmtDate } from "./ui";
import { AttributeForm } from "./AttributeForm";

type Tab = "umum" | "brief" | "atribut" | "hasil" | "log";

const RESULT_FIELDS: { key: keyof ContentResults; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "reach", label: "Reach" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
  { key: "retention1s", label: "Retention 1s (%)" },
  { key: "completionRate", label: "Completion Rate (%)" },
];

export function ContentModal({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const app = useApp();
  const [tab, setTab] = useState<Tab>("umum");
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const item = app.items.find((it) => it.id === itemId);
  if (!item) return null;

  const salesGoal = app.config.primaryGoals.some((g) => g === "sales" || g === "leads");
  const completeness = attributeCompleteness(item);
  const upd = (patch: Partial<ContentItem>) => app.updateItem(item.id, patch);

  const tryMoveStage = (target: Stage) => {
    const res = app.moveStage(item.id, target);
    if (!res.ok && res.message) {
      setConfirm({
        message: res.message,
        action: () => app.moveStage(item.id, target, { override: true }),
      });
    }
  };

  const trySetStatus = (status: Status) => {
    const res = app.setStatus(item.id, status);
    if (!res.ok && res.message) alert(res.message);
  };

  const next = nextStage(item.stage);

  return (
    <Modal title={`${item.id} — ${item.title || "(tanpa judul)"}`} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <StatusBadge status={item.status} />
        <Pill tone="indigo">{STAGE_LABELS[item.stage]}</Pill>
        <Pill>{FORMAT_LABELS[item.format]}</Pill>
        {item.channel.map((c) => <Pill key={c} tone="blue">{CHANNEL_LABELS[c]}</Pill>)}
        {item.needsApproval && (
          <Pill tone={item.approvalStatus === "approved" ? "green" : item.approvalStatus === "revisi" ? "red" : "amber"}>
            Approval: {item.approvalStatus}
          </Pill>
        )}
        {!isBriefComplete(item) && <Pill tone="red">Brief belum lengkap</Pill>}
        <span className="ml-auto text-xs text-slate-400">
          PIC: {memberName(app.config, item.currentPIC)} · Revisi: {item.revisionCount}× · v{item.version}
        </span>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {([
          ["umum", "Umum"],
          ["brief", "Brief & Copy"],
          ["atribut", `Atribut (${completeness.filled}/${completeness.total})`],
          ["hasil", "Hasil & Insight"],
          ["log", `Aktivitas (${item.activityLog.length})`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px cursor-pointer ${
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "umum" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Field label="Judul / Angle (1 kalimat)">
              <input className="input" value={item.title} onChange={(e) => upd({ title: e.target.value })} />
            </Field>
          </div>
          <Field label="Campaign (opsional)">
            <input className="input" value={item.campaign ?? ""} onChange={(e) => upd({ campaign: e.target.value || undefined })} />
          </Field>

          <Field label="Channel (multi)">
            <div className="flex flex-wrap gap-2 pt-1">
              {CHANNELS.filter((c) => app.config.channels.includes(c) || item.channel.includes(c)).map((c) => (
                <label key={c} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={item.channel.includes(c)}
                    onChange={(e) => {
                      const ch: Channel[] = e.target.checked
                        ? [...item.channel, c]
                        : item.channel.filter((x) => x !== c);
                      if (ch.length) upd({ channel: ch });
                    }}
                  />
                  {CHANNEL_LABELS[c]}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Format">
            <select className="input" value={item.format} onChange={(e) => upd({ format: e.target.value as ContentItem["format"] })}>
              {FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
            </select>
          </Field>
          <Field label="Pillar">
            <select className="input" value={item.pillar} onChange={(e) => upd({ pillar: e.target.value })}>
              <option value="">—</option>
              {app.config.pillars.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </Field>

          <Field label="Tipe Konten">
            <select className="input" value={item.contentType} onChange={(e) => upd({ contentType: e.target.value as ContentItem["contentType"] })}>
              {CONTENT_TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}
            </select>
          </Field>
          <Field label="Prioritas">
            <select className="input" value={item.priority} onChange={(e) => upd({ priority: e.target.value as ContentItem["priority"] })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={item.status} onChange={(e) => trySetStatus(e.target.value as Status)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>

          <Field label="Tahap (Stage)">
            <select className="input" value={item.stage} onChange={(e) => tryMoveStage(e.target.value as Stage)}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="PIC saat ini">
            <select className="input" value={item.currentPIC ?? ""} onChange={(e) => upd({ currentPIC: e.target.value || null })}>
              <option value="">—</option>
              {app.config.members.filter((m) => m.active).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Deadline tahap ini">
            <input type="date" className="input" value={item.stageDeadline ?? ""} onChange={(e) => upd({ stageDeadline: e.target.value || undefined })} />
          </Field>

          <Field label="Tanggal tayang (scheduled)">
            <input type="date" className="input" value={item.scheduledDate ?? ""} onChange={(e) => app.scheduleItem(item.id, e.target.value || null)} />
          </Field>
          {app.config.handoffTrackingEnabled && (
            <div className="md:col-span-2">
              <Field label="Assignment PIC per tahap" hint="Dipakai untuk handoff otomatis saat tahap maju.">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {STAGES.map((s) => (
                    <div key={s} className="flex items-center gap-1">
                      <span className="text-xs text-slate-500 w-20 truncate">{STAGE_LABELS[s]}</span>
                      <select
                        className="input !py-1 text-xs"
                        value={item.assignments[s] ?? ""}
                        onChange={(e) => upd({ assignments: { ...item.assignments, [s]: e.target.value || undefined } })}
                      >
                        <option value="">—</option>
                        {app.config.members.filter((m) => m.active).map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Field>
            </div>
          )}

          <div className="md:col-span-3">
            <Field label="Catatan (revisi/kendala)">
              <textarea className="input" rows={2} value={item.notes} onChange={(e) => upd({ notes: e.target.value })} />
            </Field>
          </div>

          {app.config.approvalEnabled && (
            <>
              <Field label="Perlu approval?">
                <label className="flex items-center gap-2 pt-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={item.needsApproval}
                    onChange={(e) => upd({
                      needsApproval: e.target.checked,
                      approvalStatus: e.target.checked
                        ? (item.approvalStatus === "tidak_perlu" ? "pending" : item.approvalStatus)
                        : "tidak_perlu",
                    })}
                  />
                  Wajib approve sebelum siap/tayang
                </label>
              </Field>
              <div className="md:col-span-2">
                <Field label="Reviewer">
                  <div className="flex flex-wrap gap-2 pt-1">
                    {app.config.members.filter((m) => m.active).map((m) => (
                      <label key={m.id} className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={item.reviewers.includes(m.id)}
                          onChange={(e) => upd({
                            reviewers: e.target.checked
                              ? [...item.reviewers, m.id]
                              : item.reviewers.filter((r) => r !== m.id),
                          })}
                        />
                        {m.name}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "brief" && (
        <div className="grid grid-cols-1 gap-4">
          {!isBriefComplete(item) && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Brief Gate aktif: konten tidak bisa maju ke produksi sebelum 3 field brief terisi.
            </div>
          )}
          <Field label="Objective — tujuan konten *">
            <textarea className="input" rows={2} value={item.brief.objective}
              onChange={(e) => upd({ brief: { ...item.brief, objective: e.target.value } })} />
          </Field>
          <Field label="Key Message — pesan utama 1 kalimat *">
            <input className="input" value={item.brief.keyMessage}
              onChange={(e) => upd({ brief: { ...item.brief, keyMessage: e.target.value } })} />
          </Field>
          <Field label="Reference — link/deskripsi contoh *">
            <input className="input" value={item.brief.reference}
              onChange={(e) => upd({ brief: { ...item.brief, reference: e.target.value } })} />
          </Field>
          <Field label="Hook — pembuka 3 detik / kalimat pertama">
            <input className="input" value={item.hook} onChange={(e) => upd({ hook: e.target.value })} />
          </Field>
          <Field label="Copy — caption/script final (atau link dokumen)">
            <textarea className="input" rows={4} value={item.copy} onChange={(e) => upd({ copy: e.target.value })} />
          </Field>
          <Field label="Asset links (satu per baris)" hint="Link folder/file: footage, design, final.">
            <textarea
              className="input" rows={3}
              value={item.assetLinks.join("\n")}
              onChange={(e) => upd({ assetLinks: e.target.value.split("\n").filter(Boolean) })}
            />
          </Field>
        </div>
      )}

      {tab === "atribut" && (
        <AttributeForm
          attributes={item.attributes}
          isVideo={VIDEO_FORMATS.includes(item.format)}
          isCarousel={item.format === "carousel"}
          onChange={(attributes) => upd({ attributes })}
        />
      )}

      {tab === "hasil" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {RESULT_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label}>
              <input
                type="number" className="input"
                value={item.results?.[key] ?? ""}
                onChange={(e) => upd({
                  results: { ...item.results, [key]: e.target.value === "" ? undefined : Number(e.target.value) },
                })}
              />
            </Field>
          ))}
          {salesGoal && (
            <>
              <Field label="Link Clicks">
                <input type="number" className="input" value={item.results?.linkClicks ?? ""}
                  onChange={(e) => upd({ results: { ...item.results, linkClicks: e.target.value === "" ? undefined : Number(e.target.value) } })} />
              </Field>
              <Field label="Conversions">
                <input type="number" className="input" value={item.results?.conversions ?? ""}
                  onChange={(e) => upd({ results: { ...item.results, conversions: e.target.value === "" ? undefined : Number(e.target.value) } })} />
              </Field>
            </>
          )}
          <div className="col-span-2 md:col-span-4">
            <Field label="Insight — 1 kalimat pelajaran (jadi input ide berikutnya)">
              <textarea className="input" rows={2} value={item.insight ?? ""}
                onChange={(e) => upd({ insight: e.target.value || undefined })} />
            </Field>
          </div>
          {item.insight && (
            <div className="col-span-2 md:col-span-4">
              <button
                className="btn-primary"
                onClick={() => {
                  app.createIdeaFrom(item.title, `Dari insight konten ${item.id} "${item.title}": ${item.insight}`);
                  alert("Ide baru dibuat di stage Ideation.");
                }}
              >
                Jadikan Ide Baru dari Insight
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "log" && (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {[...item.activityLog].reverse().map((e, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-xs text-slate-400 whitespace-nowrap align-top">
                    {fmtDate(e.timestamp)} {new Date(e.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-1.5 pr-3 text-xs text-slate-500 align-top">{e.user}</td>
                  <td className="py-1.5 align-top">
                    {e.action}
                    {e.note && <div className="text-xs text-slate-400">{e.note}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        {next && (
          <button className="btn-primary" onClick={() => tryMoveStage(next)}>
            Maju ke {STAGE_LABELS[next]} →
          </button>
        )}
        {!item.isBanked && item.status !== "tayang" && item.status !== "dianalisis" && (
          <>
            <button className="btn-secondary" onClick={() => app.bankItem(item.id, "evergreen")}>Bank (Evergreen)</button>
            <button className="btn-secondary" onClick={() => app.bankItem(item.id, "trend")}>Bank (Trend)</button>
          </>
        )}
        {item.status !== "tayang" && item.status !== "dianalisis" && (
          <button
            className="btn-secondary"
            onClick={() => {
              const res = app.setStatus(item.id, "tayang");
              if (res.ok) app.markPublished(item.id);
              else alert(res.message);
            }}
          >
            Tandai Tayang
          </button>
        )}
        <button className="btn-danger ml-auto" onClick={() => setConfirmDelete(true)}>Hapus</button>
      </div>

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel="Override & lanjutkan"
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          message={`Hapus konten ${item.id} "${item.title}"? Tindakan ini tidak bisa dibatalkan.`}
          confirmLabel="Hapus"
          onConfirm={() => { app.deleteItem(item.id); onClose(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}
