/* eslint-disable react-refresh/only-export-components */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type { ReactNode } from "react";
import type {
  AnalysisReport, AppData, BrandConfig, ContentItem, Stage, Status,
} from "../types";
import { dataStore } from "../data/store";
import { seedAppData } from "../data/seed";
import {
  approvalBlocks, autoNeedsApproval, briefGateBlocks, computeExpiry,
  generateId, memberName, nowISO, runExpiryJob, suggestStatusForStage,
} from "../logic/rules";
import { STAGE_LABELS, STATUS_LABELS } from "../data/constants";

interface MoveStageResult {
  ok: boolean;
  blockedBy?: "brief_gate" | "approval";
  message?: string;
}

interface AppContextValue {
  data: AppData;
  config: BrandConfig;
  items: ContentItem[];
  currentUser: string | null;

  setCurrentUser(id: string | null): void;
  updateConfig(config: BrandConfig): void;

  createItem(partial?: Partial<ContentItem>): ContentItem;
  updateItem(id: string, patch: Partial<ContentItem>, logAction?: string): void;
  deleteItem(id: string): void;

  moveStage(id: string, target: Stage, opts?: { override?: boolean }): MoveStageResult;
  setStatus(id: string, status: Status, opts?: { override?: boolean }): MoveStageResult;
  scheduleItem(id: string, date: string | null): void;
  bankItem(id: string, bankType: "evergreen" | "trend"): void;
  scheduleFromBank(id: string, date: string): void;
  approve(id: string, note?: string): void;
  requestRevision(id: string, note: string): void;
  markPublished(id: string): void;
  createIdeaFrom(sourceTitle: string, note: string): ContentItem;

  saveReport(report: Omit<AnalysisReport, "id" | "createdAt">): AnalysisReport;
  updateReport(id: string, patch: Partial<AnalysisReport>): void;
  deleteReport(id: string): void;

  replaceAll(data: AppData): void;
  resetToSeed(): void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp harus dipakai di dalam AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => {
    const loaded = dataStore.load();
    const base = loaded ?? seedAppData();
    // Job expiry banking dijalankan saat app dibuka (§5.4)
    return { ...base, items: runExpiryJob(base.items, "sistem") };
  });

  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      dataStore.save(data);
      return;
    }
    dataStore.save(data);
  }, [data]);

  const userName = useCallback(
    (d: AppData) => memberName(d.config, d.currentUserId) === "—" ? "sistem" : memberName(d.config, d.currentUserId),
    []
  );

  const log = useCallback((d: AppData, item: ContentItem, action: string, note?: string): ContentItem => ({
    ...item,
    updatedAt: nowISO(),
    activityLog: [...item.activityLog, { timestamp: nowISO(), user: userName(d), action, note }],
  }), [userName]);

  const patchItem = useCallback((id: string, fn: (item: ContentItem, d: AppData) => ContentItem) => {
    setData((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? fn(it, d) : it)),
    }));
  }, []);

  const value = useMemo<AppContextValue>(() => {
    const createItem = (partial?: Partial<ContentItem>): ContentItem => {
      const gen = generateId(data.idCounters);
      const base: ContentItem = {
        id: gen.id,
        title: "",
        channel: [data.config.channels[0] ?? "instagram"],
        format: "reels",
        pillar: data.config.pillars[0]?.name ?? "",
        contentType: "organik",
        stage: "brief",
        status: "ide",
        priority: "sedang",
        hook: "",
        brief: { objective: "", keyMessage: "", reference: "" },
        copy: "",
        assetLinks: [],
        currentPIC: null,
        assignments: {},
        needsApproval: false,
        reviewers: [],
        approvalStatus: "tidak_perlu",
        revisionCount: 0,
        scheduledDate: null,
        isBanked: false,
        attributes: {},
        notes: "",
        version: 1,
        createdAt: nowISO(),
        updatedAt: nowISO(),
        activityLog: [{ timestamp: nowISO(), user: userName(data), action: "konten dibuat" }],
        ...partial,
      };
      base.needsApproval = partial?.needsApproval ?? autoNeedsApproval(base, data.config);
      if (base.needsApproval && base.approvalStatus === "tidak_perlu") base.approvalStatus = "pending";
      setData((d) => ({ ...d, idCounters: gen.counters, items: [base, ...d.items] }));
      return base;
    };

    const updateItem = (id: string, patch: Partial<ContentItem>, logAction?: string) => {
      patchItem(id, (it, d) => {
        let next: ContentItem = { ...it, ...patch, updatedAt: nowISO() };
        // approval otomatis saat contentType berubah (§5.5)
        if (patch.contentType && patch.contentType !== it.contentType) {
          const needs = autoNeedsApproval(next, d.config);
          next = {
            ...next,
            needsApproval: needs,
            approvalStatus: needs
              ? (next.approvalStatus === "tidak_perlu" ? "pending" : next.approvalStatus)
              : "tidak_perlu",
          };
        }
        return logAction ? log(d, next, logAction) : next;
      });
    };

    const moveStage = (id: string, target: Stage, opts?: { override?: boolean }): MoveStageResult => {
      const item = data.items.find((it) => it.id === id);
      if (!item || item.stage === target) return { ok: true };

      if (briefGateBlocks(item, target) && !opts?.override) {
        return {
          ok: false,
          blockedBy: "brief_gate",
          message: "Brief belum lengkap (objective, key message, reference) — ini penyebab utama revisi. Lanjutkan dengan override?",
        };
      }

      patchItem(id, (it, d) => {
        let next: ContentItem = { ...it, stage: target };
        // Handoff logic (§5.3)
        if (d.config.handoffTrackingEnabled) {
          const nextPIC = it.assignments[target] ?? it.currentPIC;
          next = { ...next, currentPIC: nextPIC ?? null, receivedAt: nowISO() };
        }
        next = { ...next, status: suggestStatusForStage(next, target) };
        let logged = log(d, next, `stage: ${STAGE_LABELS[it.stage]} → ${STAGE_LABELS[target]}`,
          opts?.override ? "override Brief Gate (brief belum lengkap)" : undefined);
        if (d.config.handoffTrackingEnabled && next.currentPIC && next.currentPIC !== it.currentPIC) {
          logged = {
            ...logged,
            activityLog: [...logged.activityLog, {
              timestamp: nowISO(), user: userName(d),
              action: `handoff PIC: ${memberName(d.config, it.currentPIC)} → ${memberName(d.config, next.currentPIC)}`,
            }],
          };
        }
        return logged;
      });
      return { ok: true };
    };

    const setStatus = (id: string, status: Status, opts?: { override?: boolean }): MoveStageResult => {
      const item = data.items.find((it) => it.id === id);
      if (!item || item.status === status) return { ok: true };
      if (approvalBlocks(item, status) && !opts?.override) {
        return {
          ok: false,
          blockedBy: "approval",
          message: `Konten ini butuh approval (status approval: ${item.approvalStatus}). Tidak bisa di-set "${STATUS_LABELS[status]}" sebelum approved.`,
        };
      }
      patchItem(id, (it, d) =>
        log(d, { ...it, status }, `status: ${STATUS_LABELS[it.status]} → ${STATUS_LABELS[status]}`)
      );
      return { ok: true };
    };

    const scheduleItem = (id: string, date: string | null) => {
      patchItem(id, (it, d) =>
        log(d, { ...it, scheduledDate: date },
          date ? `dijadwalkan tayang ${date}` : "jadwal tayang dihapus")
      );
    };

    const bankItem = (id: string, bankType: "evergreen" | "trend") => {
      patchItem(id, (it, d) => {
        const bankedAt = nowISO().slice(0, 10);
        return log(d, {
          ...it,
          isBanked: true,
          bankType,
          bankedAt,
          scheduledDate: null,
          status: "bank",
          expiryDate: bankType === "trend" ? computeExpiry(bankedAt, d.config) : null,
        }, `masuk bank (${bankType})`);
      });
    };

    const scheduleFromBank = (id: string, date: string) => {
      patchItem(id, (it, d) =>
        log(d, {
          ...it,
          isBanked: false,
          scheduledDate: date,
          status: it.needsApproval && it.approvalStatus !== "approved" ? "review" : "siap",
        }, `keluar bank, dijadwalkan tayang ${date}`)
      );
    };

    const approve = (id: string, note?: string) => {
      patchItem(id, (it, d) =>
        log(d, { ...it, approvalStatus: "approved" }, "approved", note)
      );
    };

    const requestRevision = (id: string, note: string) => {
      patchItem(id, (it, d) => {
        // kembalikan ke PIC produksi terkait bila ada (§5.5)
        const prodPIC = it.assignments.editing ?? it.assignments.take ??
          it.assignments.design ?? it.assignments.copywriting ?? it.currentPIC;
        return log(d, {
          ...it,
          approvalStatus: "revisi",
          status: "revisi",
          revisionCount: it.revisionCount + 1,
          currentPIC: prodPIC ?? it.currentPIC,
        }, "revisi diminta", note);
      });
    };

    const markPublished = (id: string) => {
      patchItem(id, (it, d) =>
        log(d, {
          ...it,
          status: "tayang",
          stage: "analisis",
          scheduledDate: it.scheduledDate ?? nowISO().slice(0, 10),
          isBanked: false,
        }, "status: → tayang")
      );
    };

    const createIdeaFrom = (sourceTitle: string, note: string): ContentItem => {
      return createItem({
        title: `Ide dari: ${sourceTitle}`,
        stage: "ideation",
        status: "ide",
        notes: note,
      });
    };

    const saveReport = (report: Omit<AnalysisReport, "id" | "createdAt">): AnalysisReport => {
      const full: AnalysisReport = {
        ...report,
        id: `rep-${Date.now().toString(36)}`,
        createdAt: nowISO(),
      };
      setData((d) => ({ ...d, reports: [full, ...d.reports] }));
      return full;
    };

    const updateReport = (id: string, patch: Partial<AnalysisReport>) => {
      setData((d) => ({
        ...d,
        reports: d.reports.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }));
    };

    return {
      data,
      config: data.config,
      items: data.items,
      currentUser: data.currentUserId,
      setCurrentUser: (id) => setData((d) => ({ ...d, currentUserId: id })),
      updateConfig: (config) => setData((d) => ({ ...d, config })),
      createItem,
      updateItem,
      deleteItem: (id) => setData((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) })),
      moveStage,
      setStatus,
      scheduleItem,
      bankItem,
      scheduleFromBank,
      approve,
      requestRevision,
      markPublished,
      createIdeaFrom,
      saveReport,
      updateReport,
      deleteReport: (id) => setData((d) => ({ ...d, reports: d.reports.filter((r) => r.id !== id) })),
      replaceAll: (newData) => setData({ ...newData, items: runExpiryJob(newData.items, "sistem") }),
      resetToSeed: () => setData(seedAppData()),
    };
  }, [data, log, patchItem, userName]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
