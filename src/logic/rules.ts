import type {
  AppData, BrandConfig, Channel, ContentItem, Industry, Stage, TeamMember,
} from "../types";
import { PRODUCTION_STAGES, STAGES } from "../data/constants";

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ID format "YYMM-XXX" (§2.1), counter per bulan
export function generateId(counters: Record<string, number>, date = new Date()): {
  id: string;
  counters: Record<string, number>;
} {
  const yymm = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const next = (counters[yymm] ?? 0) + 1;
  return {
    id: `${yymm}-${String(next).padStart(3, "0")}`,
    counters: { ...counters, [yymm]: next },
  };
}

// ===== Brief Gate (§5.2) =====

export function isBriefComplete(item: ContentItem): boolean {
  return Boolean(
    item.brief.objective.trim() &&
    item.brief.keyMessage.trim() &&
    item.brief.reference.trim()
  );
}

/** true bila perpindahan stage terkena Brief Gate (perlu konfirmasi override). */
export function briefGateBlocks(item: ContentItem, targetStage: Stage): boolean {
  const fromEarly = ["brief", "riset", "strategy", "ideation", "planning"].includes(item.stage);
  return fromEarly && PRODUCTION_STAGES.includes(targetStage) && !isBriefComplete(item);
}

// ===== Stage / status =====

export function nextStage(stage: Stage): Stage | null {
  const i = STAGES.indexOf(stage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

/** Status default yang masuk akal saat stage berubah (user tetap bisa override manual). */
export function suggestStatusForStage(item: ContentItem, stage: Stage): ContentItem["status"] {
  if (item.status === "batal" || item.status === "expired") return item.status;
  if (item.isBanked) return "bank";
  switch (stage) {
    case "brief": case "riset": case "strategy": case "ideation":
      return isBriefComplete(item) ? "brief_ok" : "ide";
    case "planning":
      return "brief_ok";
    case "copywriting": case "take": case "design": case "editing":
      return item.status === "revisi" ? "revisi" : "produksi";
    case "upload":
      return item.needsApproval && item.approvalStatus !== "approved" ? "review" : "siap";
    case "analisis":
      return item.results && Object.keys(item.results).length > 0 ? "dianalisis" : "tayang";
  }
}

// ===== Approval (§5.5) =====

export function autoNeedsApproval(item: Pick<ContentItem, "contentType">, config: BrandConfig): boolean {
  if (!config.approvalEnabled) return false;
  return ["kol", "affiliate", "ads"].includes(item.contentType);
}

/** Konten needsApproval tidak boleh siap/tayang sebelum approved (§5.5). */
export function approvalBlocks(item: ContentItem, targetStatus: ContentItem["status"]): boolean {
  return (
    item.needsApproval &&
    item.approvalStatus !== "approved" &&
    (targetStatus === "siap" || targetStatus === "tayang")
  );
}

// ===== Banking (§5.4) =====

export function computeExpiry(bankedAt: string, config: BrandConfig): string {
  const d = new Date(bankedAt);
  d.setDate(d.getDate() + config.defaultTrendExpiryDays);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(dateISO: string): number {
  const ms = new Date(dateISO).getTime() - new Date(todayISO()).getTime();
  return Math.ceil(ms / 86400000);
}

/** Job harian: tandai konten trend yang lewat expiry → expired. Return item yang berubah. */
export function runExpiryJob(items: ContentItem[], user: string): ContentItem[] {
  const today = todayISO();
  return items.map((it) => {
    if (
      it.isBanked && it.bankType === "trend" && it.expiryDate &&
      it.expiryDate < today && it.status !== "expired" && it.status !== "batal"
    ) {
      return {
        ...it,
        status: "expired" as const,
        updatedAt: nowISO(),
        activityLog: [
          ...it.activityLog,
          { timestamp: nowISO(), user, action: "auto-expired (lewat expiry date)" },
        ],
      };
    }
    return it;
  });
}

export type BankHealth = "kurang" | "sehat" | "menumpuk";

export function bankHealth(readyCount: number, config: BrandConfig): BankHealth {
  if (readyCount < config.bankHealthyMin) return "kurang";
  if (readyCount > config.bankHealthyMax) return "menumpuk";
  return "sehat";
}

// ===== Auto-rekomendasi config dari jumlah member (§3.1) =====

export function recommendConfigForTeamSize(memberCount: number): Partial<BrandConfig> {
  if (memberCount <= 4) {
    return { approvalEnabled: false, handoffTrackingEnabled: false, roleBasedViewsEnabled: false };
  }
  if (memberCount <= 9) {
    return { approvalEnabled: true, handoffTrackingEnabled: true, roleBasedViewsEnabled: true };
  }
  return { approvalEnabled: true, handoffTrackingEnabled: true, roleBasedViewsEnabled: true };
}

// ===== Default industri (§6) =====

export function industryDefaults(industry: Industry): Partial<BrandConfig> {
  switch (industry) {
    case "beauty": return { defaultTrendExpiryDays: 8 };
    case "fashion": return { defaultTrendExpiryDays: 10 };
    case "fnb": return { defaultTrendExpiryDays: 14 };
    case "jasa": return { defaultTrendExpiryDays: 30, bankHealthyMin: 7, bankHealthyMax: 21 };
    case "tech": return { defaultTrendExpiryDays: 30, bankHealthyMin: 7, bankHealthyMax: 21 };
    case "ecommerce": return { defaultTrendExpiryDays: 14 };
    default: return { defaultTrendExpiryDays: 14 };
  }
}

// ===== Konsistensi posting (§5.7) =====

export interface PostingConsistency {
  channel: Channel;
  target: number;
  actual: number;
}

export function postingConsistencyThisWeek(items: ContentItem[], config: BrandConfig): PostingConsistency[] {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Senin
  const startISO = weekStart.toISOString().slice(0, 10);
  const endISO = todayISO();

  return config.channels.map((channel) => {
    const target = config.weeklyPostTargets[channel] ?? 0;
    const actual = items.filter(
      (it) =>
        (it.status === "tayang" || it.status === "dianalisis") &&
        it.channel.includes(channel) &&
        it.scheduledDate != null &&
        it.scheduledDate >= startISO &&
        it.scheduledDate <= endISO
    ).length;
    return { channel, target, actual };
  });
}

// ===== Beban tim (§5.8) =====

export const ACTIVE_STATUSES = ["ide", "brief_ok", "produksi", "review", "revisi"];

export function workloadByPIC(items: ContentItem[], members: TeamMember[]): { member: TeamMember; count: number }[] {
  return members
    .filter((m) => m.active)
    .map((member) => ({
      member,
      count: items.filter(
        (it) => it.currentPIC === member.id && ACTIVE_STATUSES.includes(it.status)
      ).length,
    }));
}

// ===== Cycle time & metrik kesehatan sistem (§4.6) =====

export function cycleTimeDays(item: ContentItem): number | null {
  const published = item.activityLog.find((e) => e.action.includes("tayang"));
  if (!published) return null;
  const ms = new Date(published.timestamp).getTime() - new Date(item.createdAt).getTime();
  return Math.round((ms / 86400000) * 10) / 10;
}

export function defaultMember(config: BrandConfig, currentUserId: string | null): string {
  if (currentUserId) {
    const m = config.members.find((x) => x.id === currentUserId);
    if (m) return m.name;
  }
  return "sistem";
}

export function memberName(config: BrandConfig, id: string | null | undefined): string {
  if (!id) return "—";
  return config.members.find((m) => m.id === id)?.name ?? id;
}

// ===== Helper data baru =====

export function emptyAppData(config: BrandConfig): AppData {
  return { config, items: [], reports: [], currentUserId: config.members[0]?.id ?? null, idCounters: {} };
}
