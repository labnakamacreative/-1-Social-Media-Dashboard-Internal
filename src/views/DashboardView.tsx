import { useMemo } from "react";
import type { ViewKey } from "../App";
import { useApp } from "../state/AppContext";
import { CHANNEL_LABELS, STATUS_LABELS, STATUS_COLORS } from "../data/constants";
import type { Status } from "../types";
import {
  bankHealth, postingConsistencyThisWeek, todayISO, workloadByPIC,
} from "../logic/rules";
import { getMetricValue } from "../logic/analysis";
import { StatCard, StatusBadge, fmtNum } from "../components/ui";

export function DashboardView({ onOpen, goTo }: { onOpen: (id: string) => void; goTo: (v: ViewKey) => void }) {
  const app = useApp();
  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";

  const stats = useMemo(() => {
    const thisMonth = app.items.filter((it) => it.updatedAt >= monthStart);
    const byStatus: Partial<Record<Status, number>> = {};
    for (const it of thisMonth) byStatus[it.status] = (byStatus[it.status] ?? 0) + 1;

    const overdue = app.items.filter(
      (it) => it.stageDeadline && it.stageDeadline < today &&
        !["tayang", "dianalisis", "batal", "expired"].includes(it.status)
    );
    const banked = app.items.filter((it) => it.isBanked && it.status !== "expired");
    const consistency = postingConsistencyThisWeek(app.items, app.config);
    const workload = workloadByPIC(app.items, app.config.members);

    // funnel produksi (§4.9)
    const funnel = {
      ide: app.items.filter((it) => ["ide", "brief_ok"].includes(it.status)).length,
      produksi: app.items.filter((it) => ["produksi", "review", "revisi"].includes(it.status)).length,
      siap: app.items.filter((it) => it.status === "siap" || it.status === "bank").length,
      tayang: app.items.filter((it) => it.status === "tayang").length,
      dianalisis: app.items.filter((it) => it.status === "dianalisis").length,
    };

    const salesGoal = app.config.primaryGoals.some((g) => g === "sales" || g === "leads");
    const published = app.items.filter((it) => it.status === "tayang" || it.status === "dianalisis");
    const clicks = published.reduce((a, it) => a + (it.results?.linkClicks ?? 0), 0);
    const conversions = published.reduce((a, it) => a + (it.results?.conversions ?? 0), 0);
    const totalViews = published.reduce((a, it) => a + (getMetricValue(it, "views") ?? 0), 0);

    return { byStatus, overdue, banked, consistency, workload, funnel, salesGoal, clicks, conversions, totalViews };
  }, [app.items, app.config, today, monthStart]);

  const health = bankHealth(stats.banked.length, app.config);
  const avgLoad = stats.workload.length
    ? stats.workload.reduce((a, w) => a + w.count, 0) / stats.workload.length
    : 0;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold">Dashboard — {app.config.brandName}</h1>
        <p className="text-sm text-slate-500">Ringkasan eksekutif. Goals: {app.config.primaryGoals.join(", ")}.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-5">
        <StatCard label="Total konten" value={app.items.length} sub={`${stats.funnel.produksi} sedang produksi`} />
        <StatCard
          label="Lewat deadline"
          value={stats.overdue.length}
          alert={stats.overdue.length > 0}
          sub={stats.overdue.length ? "perlu perhatian sekarang" : "semua on-track"}
        />
        <StatCard
          label="Kesehatan bank"
          value={health.toUpperCase()}
          alert={health === "kurang"}
          sub={`${stats.banked.length} konten siap pakai (target ${app.config.bankHealthyMin}–${app.config.bankHealthyMax})`}
        />
        <StatCard label="Total views (tayang)" value={fmtNum(stats.totalViews)} sub="seluruh konten terpublikasi" />
        {stats.salesGoal && (
          <>
            <StatCard label="Link clicks" value={fmtNum(stats.clicks)} />
            <StatCard label="Conversions" value={fmtNum(stats.conversions)} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Funnel Produksi</h2>
          <div className="flex items-center gap-1.5 text-center text-xs">
            {(
              [
                ["Ide", stats.funnel.ide, "bg-slate-200 text-slate-700"],
                ["Produksi", stats.funnel.produksi, "bg-yellow-100 text-yellow-700"],
                ["Siap", stats.funnel.siap, "bg-green-100 text-green-700"],
                ["Tayang", stats.funnel.tayang, "bg-emerald-200 text-emerald-800"],
                ["Dianalisis", stats.funnel.dianalisis, "bg-blue-200 text-blue-800"],
              ] as [string, number, string][]
            ).map(([label, n, cls], i) => (
              <div key={label} className="flex flex-1 items-center gap-1.5">
                {i > 0 && <span className="text-slate-300">→</span>}
                <div className={`flex-1 rounded-md py-2 ${cls}`}>
                  <div className="text-lg font-bold">{n}</div>
                  <div>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Konsistensi Posting Minggu Ini</h2>
          {stats.consistency.map(({ channel, target, actual }) => (
            <div key={channel} className="mb-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{CHANNEL_LABELS[channel]}</span>
                <span className={actual < target ? "font-semibold text-amber-600" : "text-green-600"}>
                  {actual}/{target} tayang{actual < target ? " — di bawah target" : " ✓"}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full ${actual < target ? "bg-amber-400" : "bg-green-500"}`}
                  style={{ width: `${target ? Math.min(100, (actual / target) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
          <button className="mt-1 text-xs text-indigo-600 hover:underline cursor-pointer" onClick={() => goTo("calendar")}>
            Lihat slot kosong di kalender →
          </button>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Konten per Status (update bulan ini)</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byStatus).map(([s, n]) => {
              const c = STATUS_COLORS[s as Status];
              return (
                <div key={s} className={`rounded-md border px-3 py-1.5 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}>
                  {STATUS_LABELS[s as Status]}: <b>{n}</b>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Beban per PIC (konten aktif)</h2>
          {stats.workload.map(({ member, count }) => {
            const overload = avgLoad > 0 && count > avgLoad * 1.75 && count >= 3;
            return (
              <div key={member.id} className="mb-1.5 flex items-center justify-between text-sm">
                <span>{member.name}</span>
                <span className={`font-semibold ${overload ? "text-rose-600" : "text-slate-600"}`}>
                  {count}{overload ? " ⚠ overload" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {stats.overdue.length > 0 && (
        <div className="card mt-4 border-rose-200 p-4">
          <h2 className="mb-2 text-sm font-bold text-rose-700">⚠ Konten Lewat Deadline</h2>
          <div className="space-y-1">
            {stats.overdue.map((it) => (
              <button key={it.id} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-rose-50 cursor-pointer" onClick={() => onOpen(it.id)}>
                <span className="font-mono text-[10px] text-slate-400">{it.id}</span>
                <StatusBadge status={it.status} />
                <span className="truncate font-medium">{it.title}</span>
                <span className="ml-auto whitespace-nowrap text-xs font-semibold text-rose-600">deadline {it.stageDeadline}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
