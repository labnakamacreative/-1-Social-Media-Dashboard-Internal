// ===== Enum & tipe dasar (§2.2–2.4) =====

export type Channel = "instagram" | "tiktok" | "youtube" | "other";

export type ContentFormat =
  | "reels" | "carousel" | "story" | "single_post"
  | "short" | "tiktok_video"
  | "long_video" | "yt_short"
  | "live";

export type Stage =
  | "brief"
  | "riset"
  | "strategy"
  | "ideation"
  | "planning"
  | "copywriting"
  | "take"
  | "design"
  | "editing"
  | "upload"
  | "analisis";

export type Status =
  | "ide"
  | "brief_ok"
  | "produksi"
  | "review"
  | "revisi"
  | "siap"
  | "tayang"
  | "dianalisis"
  | "bank"
  | "expired"
  | "batal";

export type ContentType = "organik" | "kol" | "affiliate" | "ads" | "ugc";
export type Priority = "tinggi" | "sedang" | "rendah";
export type ApprovalStatus = "tidak_perlu" | "pending" | "approved" | "revisi";
export type BankType = "evergreen" | "trend";

// ===== ActivityEntry (§2.6) =====

export interface ActivityEntry {
  timestamp: string;
  user: string;
  action: string;
  note?: string;
}

// ===== ContentAttributes (§2.7) =====

export interface ContentAttributes {
  hookType?: string;
  hookMechanism?: string;

  hasTalent?: boolean;
  talentNames?: string[];
  talentCount?: number;
  talentGender?: "laki" | "perempuan" | "campuran";

  concept?: string;
  storyStructure?: string;
  scriptPattern?: string;

  heuristicBias?: string[];

  durationSec?: number;
  slideCount?: number;
  visualStyle?: string;
  background?: string;
  soundType?: string;

  ctaType?: string;
  ctaPlacement?: "awal" | "tengah" | "akhir" | "caption";
  captionStyle?: string;

  postDay?: string;
  postHour?: number;

  custom?: Record<string, string>;
}

// ===== Results (§2.1 + §2.7) =====

export interface ContentResults {
  views?: number;
  engagement?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  linkClicks?: number;
  conversions?: number;
  retention1s?: number;     // % penonton melewati detik pertama
  completionRate?: number;  // % menonton sampai selesai
}

// ===== ContentItem (§2.1) =====

export interface ContentItem {
  id: string;                    // format "YYMM-XXX"
  title: string;
  campaign?: string;

  channel: Channel[];
  format: ContentFormat;
  pillar: string;
  contentType: ContentType;

  stage: Stage;
  status: Status;
  priority: Priority;

  hook: string;
  brief: {
    objective: string;
    keyMessage: string;
    reference: string;
  };
  copy: string;
  assetLinks: string[];

  currentPIC: string | null;
  assignments: Partial<Record<Stage, string>>;
  receivedAt?: string;
  stageDeadline?: string;

  needsApproval: boolean;
  reviewers: string[];
  approvalStatus: ApprovalStatus;
  revisionCount: number;

  scheduledDate: string | null;
  isBanked: boolean;
  bankedAt?: string;
  expiryDate?: string | null;
  bankType?: BankType;

  results?: ContentResults;
  insight?: string;

  attributes: ContentAttributes;

  notes: string;
  version: number;
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
  activityLog: ActivityEntry[];
}

// ===== BrandConfig (§3) =====

export type Role =
  | "lead" | "strategist" | "researcher" | "creative" | "copywriter"
  | "videographer" | "designer" | "editor" | "smo" | "analyst"
  | "kol_coord" | "performance";

export type Goal = "awareness" | "engagement" | "sales" | "leads" | "community";

export type Industry = "beauty" | "fashion" | "fnb" | "jasa" | "tech" | "ecommerce" | "umum";

export interface TeamMember {
  id: string;
  name: string;
  roles: Role[];
  active: boolean;
}

export interface BrandConfig {
  brandName: string;
  industry: Industry;
  primaryGoals: Goal[];
  channels: Channel[];

  members: TeamMember[];
  rolesEnabled: Role[];

  approvalEnabled: boolean;
  handoffTrackingEnabled: boolean;
  roleBasedViewsEnabled: boolean;

  bankHealthyMin: number;
  bankHealthyMax: number;
  defaultTrendExpiryDays: number;

  pillars: { name: string; description: string }[];
  hashtagSets: { pillar: string; tags: string[] }[];
  postingTimes: { channel: Channel; times: string[] }[];
  brandGuidelineUrl?: string;

  // Target posting per minggu per channel (untuk konsistensi posting §5.7)
  weeklyPostTargets: Partial<Record<Channel, number>>;

  // Daftar nilai atribut yang bisa dikelola di Settings (§2.7)
  attributeOptions: {
    hookType: string[];
    concept: string[];
    storyStructure: string[];
    heuristicBias: string[];
    visualStyle: string[];
    soundType: string[];
    ctaType: string[];
    captionStyle: string[];
    talentNames: string[];
  };

  // Bucket durasi untuk pattern analysis (§13.4), dalam detik (batas atas tiap bucket)
  durationBuckets: number[];
}

// ===== Analysis Engine (§13) =====

export type RankingMetric =
  | "views" | "shares" | "retention1s" | "saves" | "comments"
  | "engagement" | "er" | "completionRate" | "linkClicks" | "conversions";

export type PatternLabel = "RELASIONAL" | "KORELASI" | "HIPOTESIS";
export type PatternKind = "recurring" | "correlation" | "anomaly" | "absence" | "cross" | "differentiator";

export interface MetricSummary {
  metric: string;
  total: number;
  average: number;
  prevTotal?: number;
  prevAverage?: number;
  deltaPct?: number; // delta total vs periode sebelumnya
}

export interface OverviewResult {
  contentCount: number;
  prevContentCount: number;
  byFormat: Record<string, number>;
  byChannel: Record<string, number>;
  metrics: MetricSummary[];
  outliers: { contentId: string; metric: string; value: number; average: number }[];
  pareto: { topPct: number; viewsPct: number } | null;
  structuralAnomalies: string[];
}

export interface RankingItem {
  contentId: string;
  value: number;
  attributesSummary: string;
}

export interface RankingGroup {
  metric: RankingMetric;
  direction: "top" | "worst";
  items: RankingItem[];
}

export interface CrossRankingInsight {
  contentId: string;
  kind: "konsisten" | "diagnosa_silang";
  detail: string;
}

export interface PatternPoint {
  id: string;
  factor: string;
  statement: string;            // bahasa pattern: "X dari Y ... adalah ..."
  count: number;
  total: number;
  value: string;
  kind: PatternKind;
  label: PatternLabel;
  mechanism?: string;           // wajib bila RELASIONAL
  noPattern?: boolean;          // distribusi merata
  missingData?: boolean;        // atribut kosong
}

export interface PatternGroup {
  metric: RankingMetric;
  direction: "top" | "worst";
  points: PatternPoint[];
}

export interface ConclusionItem {
  id: string;
  statement: string;
  explanation: string;
  label: "RELASIONAL" | "NON_RELASIONAL";
  patternRefs: string[];        // id PatternPoint asal
}

export interface RecommendationItem {
  id: string;
  kind: "data" | "eksploratif";
  title: string;
  reason: string;
  execution: string;
  measureMetric: string;
  priority: "high" | "medium" | "low";
  conclusionRefs: string[];     // untuk saran berbasis data
  createdIdeaId?: string;       // id ContentItem hasil "Jadikan Ide Konten"
}

export interface AnalysisReport {
  id: string;
  period: { start: string; end: string; label: string };
  cadence: "mingguan" | "bulanan" | "custom";
  scope: { channel?: Channel; pillar?: string; campaign?: string };
  metricsUsed: RankingMetric[];
  overview: OverviewResult;
  rankings: RankingGroup[];
  crossRanking: CrossRankingInsight[];
  patterns: PatternGroup[];
  absencePatterns: PatternPoint[];
  conclusions: ConclusionItem[];
  recommendations: RecommendationItem[];
  dataQualityFlags: string[];
  createdAt: string;
}

// ===== Root state yang dipersist =====

export interface AppData {
  config: BrandConfig;
  items: ContentItem[];
  reports: AnalysisReport[];
  currentUserId: string | null;  // "login" sederhana: pilih anggota aktif
  idCounters: Record<string, number>; // per "YYMM" → counter
}
