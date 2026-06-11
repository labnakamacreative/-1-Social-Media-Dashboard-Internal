/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import type { Status } from "../types";
import { STATUS_COLORS, STATUS_LABELS } from "../data/constants";

export function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_COLORS[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Modal({
  title, onClose, children, wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`card w-full ${wide ? "max-w-5xl" : "max-w-2xl"} my-6`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    red: "bg-rose-100 text-rose-700 border-rose-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    green: "bg-green-100 text-green-700 border-green-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({
  label, value, sub, alert,
}: { label: string; value: ReactNode; sub?: ReactNode; alert?: boolean }) {
  return (
    <div className={`card p-4 ${alert ? "border-rose-300 bg-rose-50" : ""}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${alert ? "text-rose-600" : "text-slate-800"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="card flex items-center justify-center p-10 text-sm text-slate-400">
      {children}
    </div>
  );
}

export function ConfirmDialog({
  message, confirmLabel = "Lanjutkan", onConfirm, onCancel,
}: {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="Konfirmasi" onClose={onCancel}>
      <p className="text-sm text-slate-700">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onCancel}>Batal</button>
        <button className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}rb`;
  return String(Math.round(n * 100) / 100);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
