import { useMemo, useState } from "react";
import type { AnalysisReport, RankingMetric } from "../types";
import { useApp } from "../state/AppContext";
import {
  CHANNEL_LABELS, DEFAULT_METRIC_RATIONALE, METRIC_LABELS, RANKING_METRICS,
} from "../data/constants";
import { cycleTimeDays, todayISO, workloadByPIC } from "../logic/rules";
import { buildAnalysisReport } from "../logic/analysis";
import { EmptyState, Field, Modal, Pill, StatCard, fmtDate } from "../components/ui";
import { ReportView } from "./ReportView";

export function AnalyticsView({ onOpen }: { onOpen: (id: string) => void }) {
  const app = useApp();
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const openReport = app.data.reports.find((r) => r.id === openReportId);

  // ===== Metrik kesehatan sistem (§4.6) =====
  const health = useMemo(() => {
    const published = app.items.filter((it) => it.status === "tayang" || it.status === "dianalisis");
    const cycles = published.map(cycleTimeDays).filter((c): c is number => c != null);
    const avgCycle = cycles.length ? Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10 : null;

    const withRevision = app.items.filter((it) => it.revisionCount > 0).length;
    const revisionRate = app.items.length ? Math.round((withRevision / app.items.length) * 100) : 0;

    const withDeadline = app.items.filter((it) => it.stageDeadline);
    const today = todayISO();
    const overdue = withDeadline.filter(
      (it) => it.stageDeadline! < today && !["tayang", "dianalisis", "batal", "expired"].includes(it.status)
    ).length;
    const onTimeRate = withDeadline.length
      ? Math.round(((withDeadline.length - overdue) / withDeadline.length) * 100)
      : 100;

    return { avgCycle, revisionRate, onTimeRate, workload: workloadByPIC(app.items, app.config.members) };
  }, [app.items, app.config.members]);

  const insights = useMemo(
    () => app.items.filter((it) => it.insight?.trim()),
    [app.items]
  );

  if (openReport) {
    return <ReportView report={openReport} onBack={() => setOpenReportId(null)} onOpenItem={onOpen} />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Analytics — Analysis Engine</h1>
          <p className="text-sm text-slate-500">
            Metodologi 6-step: Overview → Detail → Ranking → Pattern → Kesimpulan → Saran.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ Buat Analysis Report</button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Cycle time rata-rata" value={health.avgCycle != null ? `${health.avgCycle} hari` : "—"} sub="brief → tayang" />
        <StatCard label="Revision rate" value={`${health.revisionRate}%`} sub="konten yang pernah revisi — tinggi = sinyal masalah brief" alert={health.revisionRate > 40} />
        <StatCard label="On-time rate" value={`${health.onTimeRate}%`} sub="konten ber-deadline yang tidak terlambat" alert={health.onTimeRate < 70} />
        <StatCard
          label="Beban tertinggi"
          value={(() => {
            const top = [...health.workload].sort((a, b) => b.count - a.count)[0];
            return top ? `${top.member.name} (${top.count})` : "—";
          })()}
          sub="konten aktif per PIC"
        />
      </div>

      <div className="mb-5">
        <h2 className="mb-2 text-base font-bold">Analysis Reports</h2>
        {app.data.reports.length === 0 ? (
          <EmptyState>Belum ada report. Buat report pertama untuk periode mingguan/bulanan.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {app.data.reports.map((r) => (
              <div key={r.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{r.period.label}</span>
                  <Pill tone="indigo">{r.cadence}</Pill>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {fmtDate(r.period.start)} – {fmtDate(r.period.end)} · {r.overview.contentCount} konten
                  {r.scope.channel && ` · ${CHANNEL_LABELS[r.scope.channel]}`}
                  {r.scope.pillar && ` · ${r.scope.pillar}`}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Metrik: {r.metricsUsed.map((m) => METRIC_LABELS[m]).join(", ")}
                </div>
                {r.dataQualityFlags.length > 0 && (
                  <div className="mt-1.5"><Pill tone="amber">⚠ {r.dataQualityFlags.length} flag kualitas data</Pill></div>
                )}
                <div className="mt-3 flex gap-2">
                  <button className="btn-primary !px-2.5 !py-1 text-xs" onClick={() => setOpenReportId(r.id)}>Buka</button>
                  <button
                    className="btn-secondary !px-2.5 !py-1 text-xs"
                    onClick={() => window.confirm("Hapus report ini?") && app.deleteReport(r.id)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-base font-bold">Insight Terkumpul ({insights.length})</h2>
        <p className="mb-2 text-xs text-slate-500">Insight dari konten tayang — bahan bakar ide berikutnya (loop spiral).</p>
        {insights.length === 0 ? (
          <EmptyState>Belum ada insight. Isi field insight pada konten yang sudah tayang.</EmptyState>
        ) : (
          <div className="space-y-2">
            {insights.map((it) => (
              <div key={it.id} className="card flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{it.insight}</div>
                  <button className="text-xs text-slate-400 hover:text-indigo-600 cursor-pointer" onClick={() => onOpen(it.id)}>
                    dari {it.id} — {it.title}
                  </button>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    app.createIdeaFrom(it.title, `Dari insight konten ${it.id} "${it.title}": ${it.insight}`);
                    alert("Ide baru dibuat di stage Ideation.");
                  }}
                >
                  Jadikan Ide
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {creating && (
        <CreateReportModal
          onClose={() => setCreating(false)}
          onCreated={(r) => { setCreating(false); setOpenReportId(r.id); }}
        />
      )}
    </div>
  );
}

function CreateReportModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (r: AnalysisReport) => void;
}) {
  const app = useApp();
  const today = todayISO();
  const [cadence, setCadence] = useState<"mingguan" | "bulanan" | "custom">("bulanan");
  const [start, setStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [end, setEnd] = useState(today);
  const [label, setLabel] = useState("");
  const [channel, setChannel] = useState("");
  const [pillar, setPillar] = useState("");
  const [campaign, setCampaign] = useState("");
  const [metrics, setMetrics] = useState<RankingMetric[]>(["views", "shares", "retention1s"]);

  const setCadenceAndRange = (c: typeof cadence) => {
    setCadence(c);
    const d = new Date();
    if (c === "mingguan") d.setDate(d.getDate() - 6);
    if (c === "bulanan") d.setDate(d.getDate() - 29);
    if (c !== "custom") {
      setStart(d.toISOString().slice(0, 10));
      setEnd(today);
    }
  };

  const campaigns = [...new Set(app.items.map((it) => it.campaign).filter(Boolean))] as string[];
  const salesGoal = app.config.primaryGoals.some((g) => g === "sales" || g === "leads");
  const availableMetrics = RANKING_METRICS.filter(
    (m) => salesGoal || (m !== "linkClicks" && m !== "conversions")
  );

  const create = () => {
    const built = buildAnalysisReport(app.items, app.config, {
      start, end, cadence,
      label: label.trim() || `${cadence === "mingguan" ? "Mingguan" : cadence === "bulanan" ? "Bulanan" : "Custom"} ${fmtDate(start)} – ${fmtDate(end)}`,
      scope: {
        channel: (channel || undefined) as AnalysisReport["scope"]["channel"],
        pillar: pillar || undefined,
        campaign: campaign || undefined,
      },
      metrics,
    });
    onCreated(app.saveReport(built));
  };

  return (
    <Modal title="Buat Analysis Report" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Kadens" hint="Menentukan kedalaman template analisis.">
          <select className="input" value={cadence} onChange={(e) => setCadenceAndRange(e.target.value as typeof cadence)}>
            <option value="mingguan">Mingguan (quick wins)</option>
            <option value="bulanan">Bulanan (analisis penuh)</option>
            <option value="custom">Custom range</option>
          </select>
        </Field>
        <Field label="Label report">
          <input className="input" placeholder="mis. Juni 2026" value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label="Mulai">
          <input type="date" className="input" value={start} onChange={(e) => { setStart(e.target.value); setCadence("custom"); }} />
        </Field>
        <Field label="Sampai">
          <input type="date" className="input" value={end} onChange={(e) => { setEnd(e.target.value); setCadence("custom"); }} />
        </Field>
        <Field label="Scope channel (opsional)">
          <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">Semua channel</option>
            {app.config.channels.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field label="Scope pillar (opsional)">
          <select className="input" value={pillar} onChange={(e) => setPillar(e.target.value)}>
            <option value="">Semua pillar</option>
            {app.config.pillars.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
        {campaigns.length > 0 && (
          <Field label="Scope campaign (opsional)">
            <select className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)}>
              <option value="">Semua campaign</option>
              {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        )}
        <div className="col-span-2">
          <Field label={`Metrik ranking (${metrics.length} dipilih, minimal 3)`}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 md:grid-cols-3">
              {availableMetrics.map((m) => (
                <label key={m} className="flex items-center gap-1 text-sm" title={DEFAULT_METRIC_RATIONALE[m]}>
                  <input
                    type="checkbox"
                    checked={metrics.includes(m)}
                    onChange={(e) =>
                      setMetrics(e.target.checked ? [...metrics, m] : metrics.filter((x) => x !== m))
                    }
                  />
                  {METRIC_LABELS[m]}
                  {DEFAULT_METRIC_RATIONALE[m] && <span className="text-slate-300" title={DEFAULT_METRIC_RATIONALE[m]}>ⓘ</span>}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Default Views (output), Shares (shareability), Retention 1s (kekuatan hook — khusus video).
            </p>
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Batal</button>
        <button className="btn-primary" disabled={metrics.length < 3 || start > end} onClick={create}>
          Hitung & Buat Report
        </button>
      </div>
    </Modal>
  );
}
