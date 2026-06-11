import type {
  AnalysisReport, BrandConfig, Channel, ContentItem, CrossRankingInsight,
  OverviewResult, PatternGroup, PatternPoint, RankingGroup, RankingMetric,
} from "../types";
import {
  DAY_NAMES, KEY_ATTRIBUTE_FIELDS, METRIC_LABELS, PATTERN_FACTORS, VIDEO_FORMATS,
} from "../data/constants";

// ===== Nilai metrik per konten =====

export function getMetricValue(item: ContentItem, metric: RankingMetric | "likes" | "reach"): number | null {
  const r = item.results;
  if (!r) return null;
  switch (metric) {
    case "engagement": {
      if (r.engagement != null) return r.engagement;
      const parts = [r.likes, r.comments, r.shares, r.saves].filter((x) => x != null) as number[];
      return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
    }
    case "er": {
      const eng = getMetricValue(item, "engagement");
      const base = r.reach ?? r.views;
      if (eng == null || !base) return null;
      return Math.round((eng / base) * 10000) / 100;
    }
    default:
      return (r as Record<string, number | undefined>)[metric] ?? null;
  }
}

// ===== Kelengkapan atribut (§13.7) =====

export function attributeCompleteness(item: ContentItem): { filled: number; total: number; missing: string[] } {
  const attrs = item.attributes as Record<string, unknown>;
  const missing: string[] = [];
  let filled = 0;
  for (const f of KEY_ATTRIBUTE_FIELDS) {
    const v = attrs[f];
    const isFilled = Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";
    if (isFilled) filled++;
    else missing.push(f);
  }
  return { filled, total: KEY_ATTRIBUTE_FIELDS.length, missing };
}

// ===== Ekstraksi nilai faktor untuk pattern (§13.4) =====

export function bucketDuration(sec: number, buckets: number[]): string {
  let prev = 0;
  for (const b of buckets) {
    if (sec < b) return prev === 0 ? `<${b}s` : `${prev}–${b}s`;
    prev = b;
  }
  return `>${prev}s`;
}

export function derivePostDay(item: ContentItem): string | undefined {
  if (item.attributes.postDay) return item.attributes.postDay;
  if (item.scheduledDate) return DAY_NAMES[new Date(item.scheduledDate).getDay()];
  return undefined;
}

/** Nilai sebuah faktor untuk satu konten. Array = faktor multi-nilai. null = data kosong. */
export function factorValues(item: ContentItem, factorKey: string, config: BrandConfig): string[] | null {
  const a = item.attributes;
  switch (factorKey) {
    case "hookType": return a.hookType ? [a.hookType] : null;
    case "talentNames": return a.talentNames?.length ? a.talentNames : null;
    case "talentGender": return a.talentGender ? [a.talentGender] : null;
    case "durationBucket":
      return a.durationSec != null ? [bucketDuration(a.durationSec, config.durationBuckets)] : null;
    case "concept": return a.concept ? [a.concept] : null;
    case "storyStructure": return a.storyStructure ? [a.storyStructure] : null;
    case "heuristicBias": return a.heuristicBias?.length ? a.heuristicBias : null;
    case "visualStyle": return a.visualStyle ? [a.visualStyle] : null;
    case "background": return a.background ? [a.background] : null;
    case "soundType": return a.soundType ? [a.soundType] : null;
    case "ctaType": return a.ctaType ? [a.ctaType] : null;
    case "captionStyle": return a.captionStyle ? [a.captionStyle] : null;
    case "slideCount": return a.slideCount != null ? [`${a.slideCount} slide`] : null;
    case "postDay": {
      const d = derivePostDay(item);
      return d ? [d] : null;
    }
    case "postHour": {
      const h = a.postHour;
      return h != null ? [`${String(h).padStart(2, "0")}:00`] : null;
    }
    case "format": return [item.format];
    case "pillar": return item.pillar ? [item.pillar] : null;
    default: {
      // faktor custom
      const v = a.custom?.[factorKey];
      return v ? [v] : null;
    }
  }
}

/** Semua faktor yang relevan untuk dianalisis, termasuk key custom yang muncul di data. */
export function allFactors(items: ContentItem[]): { key: string; label: string }[] {
  const customKeys = new Set<string>();
  for (const it of items) {
    for (const k of Object.keys(it.attributes.custom ?? {})) customKeys.add(k);
  }
  return [
    ...PATTERN_FACTORS,
    ...[...customKeys].map((k) => ({ key: k, label: `Custom: ${k}` })),
  ];
}

// ===== Step 1: Overview (§13.1) =====

const OVERVIEW_METRICS: (RankingMetric | "reach")[] = ["views", "engagement", "er", "reach", "shares", "saves"];

function sumAvg(items: ContentItem[], metric: RankingMetric | "reach"): { total: number; avg: number; n: number } {
  const vals = items.map((it) => getMetricValue(it, metric)).filter((v): v is number => v != null);
  const total = vals.reduce((a, b) => a + b, 0);
  return { total, avg: vals.length ? total / vals.length : 0, n: vals.length };
}

export function computeOverview(
  items: ContentItem[],
  prevItems: ContentItem[],
  config: BrandConfig
): OverviewResult {
  const byFormat: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  for (const it of items) {
    byFormat[it.format] = (byFormat[it.format] ?? 0) + 1;
    for (const c of it.channel) byChannel[c] = (byChannel[c] ?? 0) + 1;
  }

  const salesGoal = config.primaryGoals.some((g) => g === "sales" || g === "leads");
  const metricKeys = salesGoal ? [...OVERVIEW_METRICS, "linkClicks", "conversions"] as (RankingMetric | "reach")[] : OVERVIEW_METRICS;

  const metrics = metricKeys.map((m) => {
    const cur = sumAvg(items, m);
    const prev = sumAvg(prevItems, m);
    // metrik rasio (%) dibandingkan lewat rata-rata, bukan jumlah
    const isRatio = m === "er";
    const curBase = isRatio ? cur.avg : cur.total;
    const prevBase = isRatio ? prev.avg : prev.total;
    return {
      metric: m,
      total: Math.round(curBase * 100) / 100,
      average: Math.round(cur.avg * 100) / 100,
      prevTotal: prev.n ? Math.round(prevBase * 100) / 100 : undefined,
      prevAverage: prev.n ? Math.round(prev.avg * 100) / 100 : undefined,
      deltaPct: prev.n && prevBase !== 0
        ? Math.round(((curBase - prevBase) / prevBase) * 1000) / 10
        : undefined,
    };
  });

  // Outlier: > 2× standar deviasi dari rata-rata (views & engagement)
  const outliers: OverviewResult["outliers"] = [];
  for (const m of ["views", "engagement"] as RankingMetric[]) {
    const pairs = items
      .map((it) => ({ id: it.id, v: getMetricValue(it, m) }))
      .filter((p): p is { id: string; v: number } => p.v != null);
    if (pairs.length < 3) continue;
    const mean = pairs.reduce((a, p) => a + p.v, 0) / pairs.length;
    const sd = Math.sqrt(pairs.reduce((a, p) => a + (p.v - mean) ** 2, 0) / pairs.length);
    if (sd === 0) continue;
    for (const p of pairs) {
      if (Math.abs(p.v - mean) > 2 * sd) {
        outliers.push({ contentId: p.id, metric: m, value: p.v, average: Math.round(mean) });
      }
    }
  }

  // Pareto: top 20% konten menyumbang berapa % views
  let pareto: OverviewResult["pareto"] = null;
  const viewPairs = items
    .map((it) => getMetricValue(it, "views"))
    .filter((v): v is number => v != null)
    .sort((a, b) => b - a);
  if (viewPairs.length >= 5) {
    const totalViews = viewPairs.reduce((a, b) => a + b, 0);
    const topN = Math.max(1, Math.round(viewPairs.length * 0.2));
    const topViews = viewPairs.slice(0, topN).reduce((a, b) => a + b, 0);
    if (totalViews > 0) {
      pareto = {
        topPct: Math.round((topN / viewPairs.length) * 100),
        viewsPct: Math.round((topViews / totalViews) * 100),
      };
    }
  }

  // Anomali struktural: arah metrik berlawanan vs periode lalu
  const structuralAnomalies: string[] = [];
  const find = (m: string) => metrics.find((x) => x.metric === m);
  const pairsToCheck: [string, string][] = [["views", "er"], ["views", "engagement"], ["reach", "engagement"]];
  for (const [a, b] of pairsToCheck) {
    const ma = find(a); const mb = find(b);
    if (ma?.deltaPct != null && mb?.deltaPct != null &&
        Math.abs(ma.deltaPct) > 10 && Math.abs(mb.deltaPct) > 10 &&
        Math.sign(ma.deltaPct) !== Math.sign(mb.deltaPct)) {
      const dir = (d: number) => (d > 0 ? "naik" : "turun");
      structuralAnomalies.push(
        `${METRIC_LABELS[a]} ${dir(ma.deltaPct)} ${Math.abs(ma.deltaPct)}% tapi ${METRIC_LABELS[b]} ${dir(mb.deltaPct)} ${Math.abs(mb.deltaPct)}% — arah berlawanan. ` +
        `Kemungkinan: distribusi melebar ke audiens baru yang kurang relevan, atau kualitas interaksi berubah. Perlu dicek per konten.`
      );
    }
  }

  return {
    contentCount: items.length,
    prevContentCount: prevItems.length,
    byFormat,
    byChannel,
    metrics,
    outliers,
    pareto,
    structuralAnomalies,
  };
}

// ===== Step 3: Ranking (§13.3) =====

export function rankingSize(contentCount: number): number {
  return Math.max(3, Math.round(contentCount * 0.1));
}

function attributesSummary(item: ContentItem): string {
  const a = item.attributes;
  const parts: string[] = [item.format];
  if (a.hookType) parts.push(`hook: ${a.hookType}`);
  if (a.talentNames?.length) parts.push(`talent: ${a.talentNames.join(", ")}`);
  else if (a.hasTalent === false) parts.push("tanpa talent");
  if (a.concept) parts.push(a.concept);
  if (a.durationSec != null) parts.push(`${a.durationSec}s`);
  return parts.join(" · ");
}

export function computeRankings(items: ContentItem[], metrics: RankingMetric[]): RankingGroup[] {
  const n = rankingSize(items.length);
  const groups: RankingGroup[] = [];
  for (const metric of metrics) {
    const eligible = metric === "retention1s" || metric === "completionRate"
      ? items.filter((it) => VIDEO_FORMATS.includes(it.format))
      : items;
    const scored = eligible
      .map((it) => ({ it, v: getMetricValue(it, metric) }))
      .filter((p): p is { it: ContentItem; v: number } => p.v != null)
      .sort((a, b) => b.v - a.v);
    if (!scored.length) continue;
    const k = Math.min(n, scored.length);
    groups.push({
      metric,
      direction: "top",
      items: scored.slice(0, k).map((p) => ({
        contentId: p.it.id, value: p.v, attributesSummary: attributesSummary(p.it),
      })),
    });
    groups.push({
      metric,
      direction: "worst",
      items: scored.slice(-k).reverse().map((p) => ({
        contentId: p.it.id, value: p.v, attributesSummary: attributesSummary(p.it),
      })),
    });
  }
  return groups;
}

// Cross-ranking insight (§13.3.4)
export function computeCrossRanking(rankings: RankingGroup[]): CrossRankingInsight[] {
  const topAppear: Record<string, RankingMetric[]> = {};
  const worstAppear: Record<string, RankingMetric[]> = {};
  for (const g of rankings) {
    for (const it of g.items) {
      const map = g.direction === "top" ? topAppear : worstAppear;
      (map[it.contentId] ??= []).push(g.metric);
    }
  }
  const insights: CrossRankingInsight[] = [];
  for (const [id, ms] of Object.entries(topAppear)) {
    if (ms.length >= 2) {
      insights.push({
        contentId: id,
        kind: "konsisten",
        detail: `Top di ${ms.length} metrik sekaligus (${ms.map((m) => METRIC_LABELS[m]).join(", ")}) — konsisten lintas metrik, kandidat winning formula.`,
      });
    }
    const wm = worstAppear[id];
    if (wm?.length) {
      insights.push({
        contentId: id,
        kind: "diagnosa_silang",
        detail: `Top di ${ms.map((m) => METRIC_LABELS[m]).join(", ")} tapi Worst di ${wm.map((m) => METRIC_LABELS[m]).join(", ")} — diagnosa silang: cek apakah masalahnya di distribusi/hook awal, bukan kualitas konten keseluruhan.`,
      });
    }
  }
  return insights;
}

// ===== Step 4: Pattern Analysis (§13.4) =====

let patternIdSeq = 0;
function pid(): string {
  return `pat-${Date.now().toString(36)}-${(patternIdSeq++).toString(36)}`;
}

const GROUP_LABEL = (g: { metric: RankingMetric; direction: "top" | "worst" }) =>
  `${g.direction === "top" ? "Top" : "Worst"} by ${METRIC_LABELS[g.metric]}`;

export function computePatterns(
  rankings: RankingGroup[],
  itemsById: Map<string, ContentItem>,
  config: BrandConfig,
  periodItems: ContentItem[]
): PatternGroup[] {
  const factors = allFactors(periodItems);
  return rankings.map((g) => {
    const groupItems = g.items
      .map((ri) => itemsById.get(ri.contentId))
      .filter((it): it is ContentItem => Boolean(it));
    const total = groupItems.length;
    const points: PatternPoint[] = [];
    const groupLabel = GROUP_LABEL(g);

    for (const factor of factors) {
      const counts: Record<string, number> = {};
      let withData = 0;
      for (const it of groupItems) {
        const vals = factorValues(it, factor.key, config);
        if (!vals) continue;
        withData++;
        for (const v of new Set(vals)) counts[v] = (counts[v] ?? 0) + 1;
      }

      if (withData === 0) {
        points.push({
          id: pid(), factor: factor.label, statement:
            `Data belum cukup — lengkapi atribut ${factor.label} pada konten ${groupLabel}.`,
          count: 0, total, value: "", kind: "recurring", label: "HIPOTESIS", missingData: true,
        });
        continue;
      }

      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const [topValue, topCount] = entries[0];
      const dominant = topCount >= 2 && topCount / withData >= 0.5 && entries.filter(([, c]) => c === topCount).length === 1;

      if (!dominant) {
        points.push({
          id: pid(), factor: factor.label,
          statement: `Tidak ada pattern konsisten di faktor ${factor.label} untuk ${groupLabel} (distribusi merata).`,
          count: topCount, total: withData, value: "", kind: "recurring", label: "HIPOTESIS", noPattern: true,
        });
        continue;
      }

      // Bahasa pattern "X dari Y" (§13.4)
      points.push({
        id: pid(), factor: factor.label,
        statement: `${topCount} dari ${withData} ${groupLabel} dari segi ${factor.label} adalah "${topValue}".`,
        count: topCount, total: withData, value: topValue,
        kind: "recurring",
        label: topCount >= 3 ? "KORELASI" : "HIPOTESIS",
      });
    }

    // Cross-pattern: kombinasi 2 faktor yang muncul bersama di mayoritas kelompok
    const crossPoints = computeCrossPatterns(groupItems, factors, config, groupLabel, total);
    points.push(...crossPoints);

    return { metric: g.metric, direction: g.direction, points };
  });
}

function computeCrossPatterns(
  groupItems: ContentItem[],
  factors: { key: string; label: string }[],
  config: BrandConfig,
  groupLabel: string,
  total: number
): PatternPoint[] {
  if (groupItems.length < 2) return [];
  const points: PatternPoint[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      const comboCounts: Record<string, number> = {};
      let withBoth = 0;
      for (const it of groupItems) {
        const va = factorValues(it, factors[i].key, config);
        const vb = factorValues(it, factors[j].key, config);
        if (!va || !vb) continue;
        withBoth++;
        comboCounts[`${va[0]}|${vb[0]}`] = (comboCounts[`${va[0]}|${vb[0]}`] ?? 0) + 1;
      }
      if (withBoth < 2) continue;
      for (const [combo, count] of Object.entries(comboCounts)) {
        if (count >= 2 && count / withBoth >= 0.67) {
          const [va, vb] = combo.split("|");
          const key = `${factors[i].label}=${va}+${factors[j].label}=${vb}`;
          if (seen.has(key)) continue;
          seen.add(key);
          points.push({
            id: pid(), factor: `${factors[i].label} × ${factors[j].label}`,
            statement: `Kandidat formula: ${factors[i].label} "${va}" + ${factors[j].label} "${vb}" muncul di ${count} dari ${withBoth} ${groupLabel}.`,
            count, total, value: combo, kind: "cross",
            label: count >= 3 ? "KORELASI" : "HIPOTESIS",
          });
        }
      }
    }
  }
  // batasi agar tidak membanjiri UI
  return points.sort((a, b) => b.count - a.count).slice(0, 5);
}

/** Differentiator: nilai faktor yang selalu ada di Top dan tak pernah di Worst (atau sebaliknya). */
export function computeDifferentiators(
  rankings: RankingGroup[],
  itemsById: Map<string, ContentItem>,
  config: BrandConfig,
  periodItems: ContentItem[]
): PatternPoint[] {
  const factors = allFactors(periodItems);
  const points: PatternPoint[] = [];
  const metrics = [...new Set(rankings.map((g) => g.metric))];
  for (const metric of metrics) {
    const top = rankings.find((g) => g.metric === metric && g.direction === "top");
    const worst = rankings.find((g) => g.metric === metric && g.direction === "worst");
    if (!top || !worst) continue;
    const topItems = top.items.map((i) => itemsById.get(i.contentId)).filter(Boolean) as ContentItem[];
    const worstItems = worst.items.map((i) => itemsById.get(i.contentId)).filter(Boolean) as ContentItem[];
    // konten yang muncul di kedua sisi tidak bisa jadi differentiator
    const worstIds = new Set(worstItems.map((i) => i.id));
    const cleanTop = topItems.filter((i) => !worstIds.has(i.id));
    if (cleanTop.length < 2) continue;

    for (const factor of factors) {
      const topVals = cleanTop.map((it) => factorValues(it, factor.key, config));
      if (topVals.some((v) => !v)) continue;
      const worstValSet = new Set(
        worstItems.flatMap((it) => factorValues(it, factor.key, config) ?? [])
      );
      // nilai yang ada di SEMUA top
      const candidate = (topVals[0] as string[]).filter((v) =>
        topVals.every((tv) => tv!.includes(v))
      );
      for (const v of candidate) {
        if (!worstValSet.has(v)) {
          points.push({
            id: pid(), factor: factor.label,
            statement: `Differentiator (${METRIC_LABELS[metric]}): ${factor.label} "${v}" ada di SEMUA Top (${cleanTop.length}) dan tidak pernah ada di Worst.`,
            count: cleanTop.length, total: cleanTop.length, value: v,
            kind: "differentiator",
            label: cleanTop.length >= 3 ? "KORELASI" : "HIPOTESIS",
          });
        }
      }
    }
  }
  return points;
}

/** Absence pattern: nilai enum yang frekuensinya 0 di seluruh periode (§13.4 jenis 4). */
export function computeAbsencePatterns(periodItems: ContentItem[], config: BrandConfig): PatternPoint[] {
  const points: PatternPoint[] = [];
  const checks: { key: keyof BrandConfig["attributeOptions"]; factorKey: string; label: string }[] = [
    { key: "hookType", factorKey: "hookType", label: "Hook" },
    { key: "concept", factorKey: "concept", label: "Konsep" },
    { key: "storyStructure", factorKey: "storyStructure", label: "Struktur Cerita" },
    { key: "visualStyle", factorKey: "visualStyle", label: "Gaya Visual" },
    { key: "soundType", factorKey: "soundType", label: "Sound" },
    { key: "ctaType", factorKey: "ctaType", label: "CTA" },
  ];
  for (const chk of checks) {
    const used = new Set(
      periodItems.flatMap((it) => factorValues(it, chk.factorKey, config) ?? [])
    );
    const unused = config.attributeOptions[chk.key].filter(
      (v) => v !== "lainnya" && v !== "tidak_ada" && !used.has(v)
    );
    if (unused.length && used.size > 0) {
      points.push({
        id: pid(), factor: chk.label,
        statement: `Belum pernah dicoba periode ini — ${chk.label}: ${unused.join(", ")}. Peluang eksplorasi.`,
        count: 0, total: periodItems.length, value: unused.join(","),
        kind: "absence", label: "HIPOTESIS",
      });
    }
  }
  return points;
}

// ===== Data quality flags (§13.3.5, §13.7) =====

export function computeDataQualityFlags(periodItems: ContentItem[], rankedIds: Set<string>): string[] {
  const flags: string[] = [];
  if (periodItems.length < 30) {
    flags.push(
      `Dengan ${periodItems.length} konten, pattern perlu divalidasi di periode berikutnya — sample belum optimal (<30).`
    );
  }
  const ranked = periodItems.filter((it) => rankedIds.has(it.id));
  if (ranked.length) {
    const lowAttr = ranked.filter((it) => {
      const c = attributeCompleteness(it);
      return c.filled / c.total < 0.5;
    });
    if (lowAttr.length > 0) {
      flags.push(
        `${lowAttr.length} dari ${ranked.length} konten ter-ranking punya kelengkapan atribut <50% — pattern analysis kurang tajam. Lengkapi atribut via bulk edit.`
      );
    }
  }
  return flags;
}

// ===== Builder report lengkap =====

export function buildAnalysisReport(
  allItems: ContentItem[],
  config: BrandConfig,
  opts: {
    start: string;
    end: string;
    label: string;
    cadence: "mingguan" | "bulanan" | "custom";
    scope: { channel?: Channel; pillar?: string; campaign?: string };
    metrics: RankingMetric[];
  }
): Omit<AnalysisReport, "id" | "createdAt"> {
  const inScope = (it: ContentItem) =>
    (!opts.scope.channel || it.channel.includes(opts.scope.channel)) &&
    (!opts.scope.pillar || it.pillar === opts.scope.pillar) &&
    (!opts.scope.campaign || it.campaign === opts.scope.campaign);

  const published = allItems.filter(
    (it) => (it.status === "tayang" || it.status === "dianalisis") && it.scheduledDate && inScope(it)
  );
  const periodItems = published.filter(
    (it) => it.scheduledDate! >= opts.start && it.scheduledDate! <= opts.end
  );

  // periode pembanding: rentang sama persis sebelum start
  const lenMs = new Date(opts.end).getTime() - new Date(opts.start).getTime();
  const prevEnd = new Date(new Date(opts.start).getTime() - 86400000).toISOString().slice(0, 10);
  const prevStart = new Date(new Date(prevEnd).getTime() - lenMs).toISOString().slice(0, 10);
  const prevItems = published.filter(
    (it) => it.scheduledDate! >= prevStart && it.scheduledDate! <= prevEnd
  );

  const overview = computeOverview(periodItems, prevItems, config);
  const rankings = computeRankings(periodItems, opts.metrics);
  const crossRanking = computeCrossRanking(rankings);
  const itemsById = new Map(periodItems.map((it) => [it.id, it]));
  const patterns = computePatterns(rankings, itemsById, config, periodItems);
  const differentiators = computeDifferentiators(rankings, itemsById, config, periodItems);
  // differentiator ditempel ke kelompok top terkait
  for (const d of differentiators) {
    const m = d.statement.match(/\((.+?)\)/);
    const grp = patterns.find(
      (p) => p.direction === "top" && METRIC_LABELS[p.metric] === m?.[1]
    );
    (grp ?? patterns[0])?.points.push(d);
  }
  const absencePatterns = computeAbsencePatterns(periodItems, config);
  const rankedIds = new Set(rankings.flatMap((g) => g.items.map((i) => i.contentId)));
  const dataQualityFlags = computeDataQualityFlags(periodItems, rankedIds);

  return {
    period: { start: opts.start, end: opts.end, label: opts.label },
    cadence: opts.cadence,
    scope: opts.scope,
    metricsUsed: opts.metrics,
    overview,
    rankings,
    crossRanking,
    patterns,
    absencePatterns,
    conclusions: [],
    recommendations: [],
    dataQualityFlags,
  };
}
