import { useMemo, useState } from "react";
import type {
  AnalysisReport, ConclusionItem, ContentItem, PatternGroup, PatternPoint,
  RecommendationItem,
} from "../types";
import { useApp } from "../state/AppContext";
import { FORMAT_LABELS, METRIC_LABELS } from "../data/constants";
import { attributeCompleteness, getMetricValue } from "../logic/analysis";
import { EmptyState, Field, Modal, Pill, fmtDate, fmtNum } from "../components/ui";
import { BulkAttributeModal } from "../components/BulkAttributeModal";

const LABEL_TONE: Record<string, string> = {
  RELASIONAL: "green", KORELASI: "blue", HIPOTESIS: "amber", NON_RELASIONAL: "slate",
};

export function ReportView({
  report, onBack, onOpenItem,
}: {
  report: AnalysisReport;
  onBack: () => void;
  onOpenItem: (id: string) => void;
}) {
  const app = useApp();
  const [bulkEdit, setBulkEdit] = useState(false);
  const [showAllFactors, setShowAllFactors] = useState(report.cadence !== "mingguan");

  const periodItems = useMemo(
    () =>
      app.items.filter(
        (it) =>
          (it.status === "tayang" || it.status === "dianalisis") &&
          it.scheduledDate &&
          it.scheduledDate >= report.period.start &&
          it.scheduledDate <= report.period.end &&
          (!report.scope.channel || it.channel.includes(report.scope.channel)) &&
          (!report.scope.pillar || it.pillar === report.scope.pillar) &&
          (!report.scope.campaign || it.campaign === report.scope.campaign)
      ),
    [app.items, report]
  );
  const itemsById = useMemo(() => new Map(periodItems.map((it) => [it.id, it])), [periodItems]);
  const itemTitle = (id: string) => itemsById.get(id)?.title ?? app.items.find((i) => i.id === id)?.title ?? id;

  // §13.7 — banner pengayaan konteks
  const enrichment = useMemo(() => {
    const rankedIds = new Set(report.rankings.flatMap((g) => g.items.map((i) => i.contentId)));
    const ranked = periodItems.filter((it) => rankedIds.has(it.id));
    if (!ranked.length) return null;
    const low = ranked.filter((it) => {
      const c = attributeCompleteness(it);
      return c.filled / c.total < 0.5;
    });
    if (!low.length) return null;
    const missingCount: Record<string, number> = {};
    for (const it of ranked) {
      for (const f of attributeCompleteness(it).missing) missingCount[f] = (missingCount[f] ?? 0) + 1;
    }
    const worst = Object.entries(missingCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { lowCount: low.length, rankedCount: ranked.length, worst };
  }, [periodItems, report.rankings]);

  const allPatternPoints: PatternPoint[] = useMemo(
    () => [
      ...report.patterns.flatMap((g) => g.points.filter((p) => !p.noPattern && !p.missingData)),
      ...report.absencePatterns,
    ],
    [report]
  );

  return (
    <div className="max-w-5xl">
      <button className="mb-2 text-sm text-indigo-600 hover:underline cursor-pointer" onClick={onBack}>← Kembali ke Analytics</button>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Report: {report.period.label}</h1>
        <Pill tone="indigo">{report.cadence}</Pill>
        <span className="text-sm text-slate-500">
          {fmtDate(report.period.start)} – {fmtDate(report.period.end)} · {report.overview.contentCount} konten dianalisis
        </span>
      </div>

      {report.dataQualityFlags.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3">
          {report.dataQualityFlags.map((f, i) => (
            <div key={i} className="text-sm text-amber-800">⚠ {f}</div>
          ))}
        </div>
      )}

      {enrichment && (
        <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 p-3">
          <div className="text-sm font-semibold text-rose-800">Pengayaan Konteks dibutuhkan</div>
          <p className="mt-0.5 text-sm text-rose-700">
            {enrichment.lowCount} dari {enrichment.rankedCount} konten ter-ranking punya kelengkapan atribut &lt;50% — pattern analysis kurang tajam.
            Faktor paling sering kosong: {enrichment.worst.map(([f, n]) => `${f} (${n} konten)`).join(", ")}.
            Sistem tidak menebak atribut yang kosong.
          </p>
          <button className="btn-danger mt-2" onClick={() => setBulkEdit(true)}>Isi atribut massal →</button>
        </div>
      )}

      <StepSection no={1} title="Overview — gambaran besar">
        <OverviewSection report={report} onOpenItem={onOpenItem} itemTitle={itemTitle} />
      </StepSection>

      <StepSection no={2} title="Detail — breakdown per konten">
        <DetailSection items={periodItems} onOpenItem={onOpenItem} />
      </StepSection>

      <StepSection no={3} title="Ranking — Top & Worst multi-metrik">
        <RankingSection report={report} onOpenItem={onOpenItem} itemTitle={itemTitle} />
      </StepSection>

      <StepSection no={4} title="Pattern Analysis — per kelompok ranking">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Pattern dibaca terpisah per kelompok (tiap metrik di-drive faktor berbeda). Label:
            <Pill tone="green">RELASIONAL</Pill> ada mekanisme kausal · <Pill tone="blue">KORELASI</Pill> konsisten, mekanisme belum jelas · <Pill tone="amber">HIPOTESIS</Pill> 1–2 data point.
          </p>
          <label className="flex shrink-0 items-center gap-1 text-xs">
            <input type="checkbox" checked={showAllFactors} onChange={(e) => setShowAllFactors(e.target.checked)} />
            tampilkan semua faktor
          </label>
        </div>
        {report.patterns.map((g, gi) => (
          <PatternGroupCard key={gi} group={g} report={report} showAll={showAllFactors} />
        ))}
        {report.absencePatterns.length > 0 && (
          <div className="card mt-3 p-3">
            <div className="mb-1 text-sm font-bold">Absence Patterns — belum pernah dicoba</div>
            {report.absencePatterns.map((p) => (
              <div key={p.id} className="py-0.5 text-sm text-slate-600">◌ {p.statement}</div>
            ))}
          </div>
        )}
      </StepSection>

      <StepSection no={5} title="Kesimpulan — benang merah (manual / AI-assisted)">
        <ConclusionsSection report={report} allPatterns={allPatternPoints} />
      </StepSection>

      <StepSection no={6} title="Saran — actionable, dua kategori">
        <RecommendationsSection report={report} />
      </StepSection>

      {bulkEdit && (
        <BulkAttributeModal items={periodItems} onClose={() => setBulkEdit(false)} />
      )}
    </div>
  );
}

function StepSection({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{no}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ===== Step 1 =====

function OverviewSection({
  report, onOpenItem, itemTitle,
}: {
  report: AnalysisReport;
  onOpenItem: (id: string) => void;
  itemTitle: (id: string) => string;
}) {
  const o = report.overview;
  return (
    <div className="card p-4">
      <div className="mb-3 text-sm">
        <b>{o.contentCount} konten</b> dianalisis
        {o.prevContentCount > 0 && <span className="text-slate-500"> (periode sebelumnya: {o.prevContentCount})</span>}
        {" · "}per format: {Object.entries(o.byFormat).map(([f, n]) => `${FORMAT_LABELS[f as keyof typeof FORMAT_LABELS] ?? f} ${n}`).join(", ") || "—"}
        {" · "}per channel: {Object.entries(o.byChannel).map(([c, n]) => `${c} ${n}`).join(", ") || "—"}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {o.metrics.map((m) => (
          <div key={m.metric} className="rounded-md border border-slate-200 p-2.5">
            <div className="text-xs font-semibold text-slate-500">{METRIC_LABELS[m.metric] ?? m.metric}</div>
            <div className="text-lg font-bold">{fmtNum(m.total)}</div>
            <div className="text-xs text-slate-400">rata-rata {fmtNum(m.average)}</div>
            {m.deltaPct != null ? (
              <div className={`text-xs font-semibold ${m.deltaPct >= 0 ? "text-green-600" : "text-rose-600"}`}>
                {m.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(m.deltaPct)}% vs periode lalu ({fmtNum(m.prevTotal)})
              </div>
            ) : (
              <div className="text-xs text-slate-300">tanpa pembanding periode lalu</div>
            )}
          </div>
        ))}
      </div>
      {o.pareto && (
        <div className="mt-3 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          <b>Distribusi Pareto:</b> {o.pareto.topPct}% konten teratas menyumbang <b>{o.pareto.viewsPct}%</b> total views —
          {o.pareto.viewsPct >= 60 ? " performa terkonsentrasi di sedikit konten." : " performa relatif merata."}
        </div>
      )}
      {o.outliers.length > 0 && (
        <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <b>Anomali (outlier &gt;2σ):</b>{" "}
          {o.outliers.map((out, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <button className="underline cursor-pointer" onClick={() => onOpenItem(out.contentId)}>
                {itemTitle(out.contentId)}
              </button>{" "}
              ({METRIC_LABELS[out.metric]} {fmtNum(out.value)} vs rata-rata {fmtNum(out.average)})
            </span>
          ))}
        </div>
      )}
      {o.structuralAnomalies.map((s, i) => (
        <div key={i} className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <b>Anomali struktural:</b> {s}
        </div>
      ))}
    </div>
  );
}

// ===== Step 2 =====

function DetailSection({ items, onOpenItem }: { items: ContentItem[]; onOpenItem: (id: string) => void }) {
  const metrics = ["views", "engagement", "er", "shares", "saves", "retention1s"] as const;
  const averages = useMemo(() => {
    const avg: Record<string, number> = {};
    for (const m of metrics) {
      const vals = items.map((it) => getMetricValue(it, m)).filter((v): v is number => v != null);
      avg[m] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    return avg;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (!items.length) return <EmptyState>Tidak ada konten tayang dalam periode & scope ini.</EmptyState>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500">Konten</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500">Atribut kunci</th>
            {metrics.map((m) => (
              <th key={m} className="px-2 py-2 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{METRIC_LABELS[m]}</th>
            ))}
            <th className="px-2 py-2 text-right text-xs font-semibold text-slate-500">Atribut</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const comp = attributeCompleteness(it);
            return (
              <tr key={it.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                <td className="max-w-52 px-2 py-1.5">
                  <button className="text-left font-medium hover:text-indigo-600 cursor-pointer" onClick={() => onOpenItem(it.id)}>
                    {it.title}
                  </button>
                  <div className="text-xs text-slate-400">
                    {FORMAT_LABELS[it.format]} · {it.pillar} · {fmtDate(it.scheduledDate)}
                    {it.attributes.durationSec != null && ` · ${it.attributes.durationSec}s`}
                  </div>
                </td>
                <td className="max-w-44 px-2 py-1.5 text-xs text-slate-500">
                  {[
                    it.attributes.hookType && `hook: ${it.attributes.hookType}`,
                    it.attributes.concept,
                    it.attributes.talentNames?.join(", "),
                    it.attributes.ctaType && `CTA: ${it.attributes.ctaType}`,
                  ].filter(Boolean).join(" · ") || "—"}
                </td>
                {metrics.map((m) => {
                  const v = getMetricValue(it, m);
                  const avg = averages[m];
                  const ratio = v != null && avg > 0 ? v / avg : null;
                  return (
                    <td key={m} className="px-2 py-1.5 text-right whitespace-nowrap">
                      <div className="font-medium">{fmtNum(v)}</div>
                      {ratio != null && Math.abs(ratio - 1) > 0.15 && (
                        <div className={`text-[10px] font-semibold ${ratio > 1 ? "text-green-600" : "text-rose-500"}`}>
                          {ratio > 1 ? `${ratio.toFixed(1)}× rata-rata` : `${Math.round((1 - ratio) * 100)}% di bawah`}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-right text-xs">
                  <span className={comp.filled / comp.total < 0.5 ? "font-semibold text-rose-500" : "text-slate-400"}>
                    {comp.filled}/{comp.total}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===== Step 3 =====

function RankingSection({
  report, onOpenItem, itemTitle,
}: {
  report: AnalysisReport;
  onOpenItem: (id: string) => void;
  itemTitle: (id: string) => string;
}) {
  if (!report.rankings.length) return <EmptyState>Tidak ada data metrik untuk ranking. Isi hasil (results) pada konten tayang.</EmptyState>;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {report.rankings.map((g, i) => (
          <div key={i} className="card p-3">
            <div className={`mb-2 text-sm font-bold ${g.direction === "top" ? "text-green-700" : "text-rose-700"}`}>
              {g.direction === "top" ? "🏆 Top" : "🔻 Worst"} by {METRIC_LABELS[g.metric]}
            </div>
            <ol className="space-y-1.5">
              {g.items.map((ri, idx) => (
                <li key={ri.contentId} className="text-sm">
                  <span className="mr-1 font-bold text-slate-400">{idx + 1}.</span>
                  <button className="font-medium hover:text-indigo-600 cursor-pointer" onClick={() => onOpenItem(ri.contentId)}>
                    {itemTitle(ri.contentId)}
                  </button>
                  <span className="ml-1 font-semibold text-slate-600">({fmtNum(ri.value)})</span>
                  <div className="text-xs text-slate-400">{ri.attributesSummary}</div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {report.crossRanking.length > 0 && (
        <div className="card mt-3 border-indigo-200 p-3">
          <div className="mb-1 text-sm font-bold">Cross-Ranking Insight</div>
          {report.crossRanking.map((c, i) => (
            <div key={i} className="py-0.5 text-sm">
              <Pill tone={c.kind === "konsisten" ? "green" : "amber"}>
                {c.kind === "konsisten" ? "konsisten" : "diagnosa silang"}
              </Pill>{" "}
              <button className="font-medium hover:text-indigo-600 cursor-pointer" onClick={() => onOpenItem(c.contentId)}>
                {itemTitle(c.contentId)}
              </button>
              : <span className="text-slate-600">{c.detail}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ===== Step 4 =====

function PatternGroupCard({
  group, report, showAll,
}: {
  group: PatternGroup;
  report: AnalysisReport;
  showAll: boolean;
}) {
  const app = useApp();
  const [editing, setEditing] = useState<PatternPoint | null>(null);

  const visible = showAll
    ? group.points
    : group.points.filter((p) => !p.noPattern && !p.missingData).slice(0, 7);

  const savePoint = (point: PatternPoint) => {
    const patterns = report.patterns.map((g) =>
      g === group || (g.metric === group.metric && g.direction === group.direction)
        ? { ...g, points: g.points.map((p) => (p.id === point.id ? point : p)) }
        : g
    );
    app.updateReport(report.id, { patterns });
    setEditing(null);
  };

  return (
    <div className="card mb-3 p-3">
      <div className={`mb-2 text-sm font-bold ${group.direction === "top" ? "text-green-700" : "text-rose-700"}`}>
        Pattern — {group.direction === "top" ? "Top" : "Worst"} by {METRIC_LABELS[group.metric]}
      </div>
      {visible.length === 0 && <div className="text-sm text-slate-400">Tidak ada pattern menonjol di kelompok ini.</div>}
      <div className="space-y-1">
        {visible.map((p) => (
          <div key={p.id} className={`flex items-start gap-2 rounded px-2 py-1 text-sm ${p.missingData ? "bg-rose-50" : p.noPattern ? "opacity-60" : ""}`}>
            <Pill tone={LABEL_TONE[p.label]}>{p.label}</Pill>
            {p.kind === "cross" && <Pill tone="purple">formula</Pill>}
            {p.kind === "differentiator" && <Pill tone="indigo">differentiator</Pill>}
            <div className="flex-1">
              {p.statement}
              {p.mechanism && <div className="text-xs text-slate-500">Mekanisme: {p.mechanism}</div>}
            </div>
            {!p.missingData && !p.noPattern && (
              <button className="shrink-0 text-xs text-indigo-500 hover:underline cursor-pointer" onClick={() => setEditing(p)}>
                label
              </button>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <Modal title="Ubah label pattern" onClose={() => setEditing(null)}>
          <p className="mb-3 text-sm text-slate-600">{editing.statement}</p>
          <Field label="Label keyakinan">
            <select
              className="input"
              value={editing.label}
              onChange={(e) => setEditing({ ...editing, label: e.target.value as PatternPoint["label"] })}
            >
              <option value="RELASIONAL">RELASIONAL — ada mekanisme kausal masuk akal</option>
              <option value="KORELASI">KORELASI — konsisten, mekanisme belum jelas</option>
              <option value="HIPOTESIS">HIPOTESIS — 1–2 data point, perlu validasi</option>
            </select>
          </Field>
          {editing.label === "RELASIONAL" && (
            <div className="mt-3">
              <Field label="Mekanisme (wajib untuk RELASIONAL) — kenapa pattern ini bekerja?" hint="Algoritmik / psikologis / praktis.">
                <textarea className="input" rows={2} value={editing.mechanism ?? ""}
                  onChange={(e) => setEditing({ ...editing, mechanism: e.target.value })} />
              </Field>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setEditing(null)}>Batal</button>
            <button
              className="btn-primary"
              disabled={editing.label === "RELASIONAL" && !editing.mechanism?.trim()}
              onClick={() => savePoint(editing)}
            >
              Simpan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===== Step 5 =====

const CONCLUSION_TEMPLATES = [
  "Faktor relasional: [faktor] terbukti berpengaruh karena [mekanisme]…",
  "Faktor non-relasional: [faktor] ternyata kebetulan — berhenti mengejarnya…",
  "Diagnosa silang: [metrik A] vs [metrik B] menunjukkan…",
  "Differentiator kunci Top vs Worst: …",
  "Winning formula: kombinasi [faktor 1] + [faktor 2] + [faktor 3]…",
  "Losing formula: kombinasi yang harus dihindari…",
];

function ConclusionsSection({ report, allPatterns }: { report: AnalysisReport; allPatterns: PatternPoint[] }) {
  const app = useApp();
  const [draft, setDraft] = useState<ConclusionItem | null>(null);

  const target = report.cadence === "mingguan" ? "2–3" : "10–13";

  const save = () => {
    if (!draft) return;
    const exists = report.conclusions.some((c) => c.id === draft.id);
    app.updateReport(report.id, {
      conclusions: exists
        ? report.conclusions.map((c) => (c.id === draft.id ? draft : c))
        : [...report.conclusions, draft],
    });
    setDraft(null);
  };

  return (
    <div className="card p-4">
      <p className="mb-3 text-xs text-slate-500">
        Target {target} poin ({report.cadence}). Dorong: faktor relasional, faktor non-relasional (kebetulan),
        diagnosa silang, differentiator, winning/losing formula. Tiap poin traceable ke pattern asal.
      </p>
      {report.conclusions.length === 0 && <EmptyState>Belum ada kesimpulan. Tambahkan dari pattern di Step 4.</EmptyState>}
      <div className="space-y-2">
        {report.conclusions.map((c, i) => (
          <div key={c.id} className="rounded-md border border-slate-200 p-2.5">
            <div className="flex items-start gap-2">
              <span className="font-bold text-slate-400">{i + 1}.</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{c.statement}</div>
                <div className="text-xs text-slate-500">{c.explanation}</div>
                {c.patternRefs.length > 0 && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    Dari pattern: {c.patternRefs.map((id) => allPatterns.find((p) => p.id === id)?.statement ?? id).join(" · ")}
                  </div>
                )}
              </div>
              <Pill tone={LABEL_TONE[c.label]}>{c.label === "NON_RELASIONAL" ? "NON-RELASIONAL" : c.label}</Pill>
              <button className="text-xs text-indigo-500 hover:underline cursor-pointer" onClick={() => setDraft(c)}>edit</button>
              <button
                className="text-xs text-rose-500 hover:underline cursor-pointer"
                onClick={() => app.updateReport(report.id, { conclusions: report.conclusions.filter((x) => x.id !== c.id) })}
              >
                hapus
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        className="btn-secondary mt-3"
        onClick={() =>
          setDraft({
            id: `con-${Date.now().toString(36)}`,
            statement: "", explanation: "", label: "RELASIONAL", patternRefs: [],
          })
        }
      >
        + Tambah kesimpulan
      </button>

      {draft && (
        <Modal title="Kesimpulan" onClose={() => setDraft(null)}>
          <div className="space-y-3">
            <Field label="Pernyataan" hint={`Template: ${CONCLUSION_TEMPLATES[report.conclusions.length % CONCLUSION_TEMPLATES.length]}`}>
              <input className="input" value={draft.statement} onChange={(e) => setDraft({ ...draft, statement: e.target.value })} />
            </Field>
            <Field label="Penjelasan">
              <textarea className="input" rows={2} value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
            </Field>
            <Field label="Label">
              <select className="input" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value as ConclusionItem["label"] })}>
                <option value="RELASIONAL">RELASIONAL — berpengaruh nyata</option>
                <option value="NON_RELASIONAL">NON-RELASIONAL — terbukti kebetulan</option>
              </select>
            </Field>
            <Field label="Referensi pattern (traceability)">
              <div className="max-h-44 space-y-1 overflow-y-auto rounded border border-slate-200 p-2">
                {allPatterns.map((p) => (
                  <label key={p.id} className="flex items-start gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={draft.patternRefs.includes(p.id)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          patternRefs: e.target.checked
                            ? [...draft.patternRefs, p.id]
                            : draft.patternRefs.filter((x) => x !== p.id),
                        })
                      }
                    />
                    {p.statement}
                  </label>
                ))}
                {allPatterns.length === 0 && <span className="text-xs text-slate-400">Tidak ada pattern terhitung.</span>}
              </div>
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setDraft(null)}>Batal</button>
            <button className="btn-primary" disabled={!draft.statement.trim()} onClick={save}>Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===== Step 6 =====

function RecommendationsSection({ report }: { report: AnalysisReport }) {
  const app = useApp();
  const [draft, setDraft] = useState<RecommendationItem | null>(null);

  const save = () => {
    if (!draft) return;
    const exists = report.recommendations.some((r) => r.id === draft.id);
    app.updateReport(report.id, {
      recommendations: exists
        ? report.recommendations.map((r) => (r.id === draft.id ? draft : r))
        : [...report.recommendations, draft],
    });
    setDraft(null);
  };

  const makeIdea = (rec: RecommendationItem) => {
    const idea = app.createIdeaFrom(
      rec.title,
      `Dari saran report "${report.period.label}" (${rec.kind === "data" ? "based on data" : "eksploratif"}): ${rec.title}.\nAlasan: ${rec.reason}\nEksekusi: ${rec.execution}\nMetrik ukur: ${rec.measureMetric}`
    );
    app.updateReport(report.id, {
      recommendations: report.recommendations.map((r) =>
        r.id === rec.id ? { ...r, createdIdeaId: idea.id } : r
      ),
    });
    alert(`Ide konten ${idea.id} dibuat di stage Ideation.`);
  };

  const renderGroup = (kind: "data" | "eksploratif") => {
    const recs = report.recommendations.filter((r) => r.kind === kind);
    return (
      <div className={`card p-3 ${kind === "data" ? "border-green-200" : "border-purple-200"}`}>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
          {kind === "data" ? (
            <><Pill tone="green">BASED ON DATA</Pill> ditarik dari kesimpulan, traceable</>
          ) : (
            <><Pill tone="purple">EKSPLORATIF</Pill> eksperimen di luar data (absence pattern)</>
          )}
        </div>
        {recs.length === 0 && <div className="text-sm text-slate-400">Belum ada saran {kind === "data" ? "berbasis data" : "eksploratif"}.</div>}
        <div className="space-y-2">
          {recs.map((r) => (
            <div key={r.id} className="rounded-md border border-slate-200 p-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Pill tone={r.priority === "high" ? "red" : r.priority === "medium" ? "amber" : "slate"}>
                  {r.priority} impact
                </Pill>
                <span className="font-semibold">{r.title}</span>
                <span className="ml-auto flex gap-2">
                  <button className="text-xs text-indigo-500 hover:underline cursor-pointer" onClick={() => setDraft(r)}>edit</button>
                  <button
                    className="text-xs text-rose-500 hover:underline cursor-pointer"
                    onClick={() => app.updateReport(report.id, { recommendations: report.recommendations.filter((x) => x.id !== r.id) })}
                  >
                    hapus
                  </button>
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-600"><b>Alasan:</b> {r.reason}</div>
              <div className="text-xs text-slate-600"><b>Eksekusi:</b> {r.execution}</div>
              <div className="text-xs text-slate-600"><b>Metrik ukur:</b> {r.measureMetric}</div>
              {r.conclusionRefs.length > 0 && (
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Dari kesimpulan: {r.conclusionRefs.map((id) => report.conclusions.find((c) => c.id === id)?.statement ?? id).join(" · ")}
                </div>
              )}
              <div className="mt-2">
                {r.createdIdeaId ? (
                  <Pill tone="green">✓ Ide dibuat: {r.createdIdeaId}</Pill>
                ) : (
                  <button className="btn-primary !px-2.5 !py-1 text-xs" onClick={() => makeIdea(r)}>
                    Jadikan Ide Konten
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">
        ❌ "buat konten lebih engaging" (generik). ✅ "Produksi 3–4 Reels 25–40 detik/minggu dengan hook pertanyaan,
        pakai Talent A; ukur views, completion rate, share rate" (briefable).
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {renderGroup("data")}
        {renderGroup("eksploratif")}
      </div>
      <button
        className="btn-secondary mt-3"
        onClick={() =>
          setDraft({
            id: `rec-${Date.now().toString(36)}`,
            kind: "data", title: "", reason: "", execution: "", measureMetric: "",
            priority: "medium", conclusionRefs: [],
          })
        }
      >
        + Tambah saran
      </button>

      {draft && (
        <Modal title="Saran" onClose={() => setDraft(null)}>
          <div className="space-y-3">
            <Field label="Kategori">
              <select className="input" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as RecommendationItem["kind"] })}>
                <option value="data">Based on Data — traceable ke kesimpulan</option>
                <option value="eksploratif">Eksploratif — eksperimen + rencana test</option>
              </select>
            </Field>
            <Field label="Judul aksi spesifik (briefable)">
              <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label={draft.kind === "data" ? "Alasan (referensi pattern/kesimpulan)" : "Reasoning kenapa layak dicoba"}>
              <textarea className="input" rows={2} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
            </Field>
            <Field label={draft.kind === "data" ? "Cara eksekusi" : "Rencana test"}>
              <textarea className="input" rows={2} value={draft.execution} onChange={(e) => setDraft({ ...draft, execution: e.target.value })} />
            </Field>
            <Field label="Metrik ukur keberhasilan">
              <input className="input" value={draft.measureMetric} onChange={(e) => setDraft({ ...draft, measureMetric: e.target.value })} />
            </Field>
            <Field label="Prioritas dampak">
              <select className="input" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as RecommendationItem["priority"] })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
            {draft.kind === "data" && (
              <Field label="Kesimpulan asal (traceability)">
                <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-slate-200 p-2">
                  {report.conclusions.map((c) => (
                    <label key={c.id} className="flex items-start gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={draft.conclusionRefs.includes(c.id)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            conclusionRefs: e.target.checked
                              ? [...draft.conclusionRefs, c.id]
                              : draft.conclusionRefs.filter((x) => x !== c.id),
                          })
                        }
                      />
                      {c.statement}
                    </label>
                  ))}
                  {report.conclusions.length === 0 && <span className="text-xs text-slate-400">Belum ada kesimpulan (Step 5).</span>}
                </div>
              </Field>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setDraft(null)}>Batal</button>
            <button className="btn-primary" disabled={!draft.title.trim()} onClick={save}>Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
