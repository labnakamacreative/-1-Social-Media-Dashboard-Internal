import { useMemo, useState } from "react";
import { AppProvider, useApp } from "./state/AppContext";
import { DashboardView } from "./views/DashboardView";
import { PipelineView } from "./views/PipelineView";
import { BoardView } from "./views/BoardView";
import { CalendarView } from "./views/CalendarView";
import { BankView } from "./views/BankView";
import { MyQueueView } from "./views/MyQueueView";
import { ApprovalsView } from "./views/ApprovalsView";
import { AnalyticsView } from "./views/AnalyticsView";
import { SettingsView } from "./views/SettingsView";
import { ContentModal } from "./components/ContentModal";

export type ViewKey =
  | "dashboard" | "board" | "calendar" | "bank" | "pipeline"
  | "queue" | "approvals" | "analytics" | "settings";

function Shell() {
  const app = useApp();
  const [view, setView] = useState<ViewKey>("dashboard");
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const pendingApprovals = useMemo(
    () => app.items.filter((it) => it.needsApproval && it.approvalStatus === "pending").length,
    [app.items]
  );

  const nav: { key: ViewKey; label: string; show: boolean; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard", show: true },
    { key: "board", label: "Board", show: true },
    { key: "calendar", label: "Calendar", show: true },
    { key: "bank", label: "Content Bank", show: true },
    { key: "pipeline", label: "Pipeline (Master)", show: true },
    { key: "queue", label: "My Queue", show: app.config.roleBasedViewsEnabled },
    { key: "approvals", label: "Approval Inbox", show: app.config.approvalEnabled, badge: pendingApprovals },
    { key: "analytics", label: "Analytics", show: true },
    { key: "settings", label: "Settings", show: true },
  ];

  const openItem = (id: string) => setOpenItemId(id);

  const newContent = () => {
    const item = app.createItem();
    setOpenItemId(item.id);
  };

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="text-sm font-bold text-indigo-700">{app.config.brandName}</div>
          <div className="text-xs text-slate-400">Social Media Dashboard</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {nav.filter((n) => n.show).map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={`mb-0.5 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium cursor-pointer ${
                view === n.key ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {n.label}
              {n.badge ? (
                <span className="rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">{n.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button className="btn-primary w-full justify-center" onClick={newContent}>+ Konten Baru</button>
          <div className="mt-3">
            <label className="label">Sedang login sebagai</label>
            <select
              className="input"
              value={app.currentUser ?? ""}
              onChange={(e) => app.setCurrentUser(e.target.value || null)}
            >
              {app.config.members.filter((m) => m.active).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-5">
        {view === "dashboard" && <DashboardView onOpen={openItem} goTo={setView} />}
        {view === "board" && <BoardView onOpen={openItem} />}
        {view === "calendar" && <CalendarView onOpen={openItem} goTo={setView} />}
        {view === "bank" && <BankView onOpen={openItem} />}
        {view === "pipeline" && <PipelineView onOpen={openItem} onNew={newContent} />}
        {view === "queue" && app.config.roleBasedViewsEnabled && <MyQueueView onOpen={openItem} />}
        {view === "approvals" && app.config.approvalEnabled && <ApprovalsView onOpen={openItem} />}
        {view === "analytics" && <AnalyticsView onOpen={openItem} />}
        {view === "settings" && <SettingsView />}
      </main>

      {openItemId && <ContentModal itemId={openItemId} onClose={() => setOpenItemId(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
