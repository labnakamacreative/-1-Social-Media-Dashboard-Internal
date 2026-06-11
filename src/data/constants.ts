import type {
  Status, Stage, Channel, ContentFormat, ContentType, Role, Goal,
  Industry, RankingMetric, Priority,
} from "../types";

// Urutan 11 tahap (§2.3)
export const STAGES: Stage[] = [
  "brief", "riset", "strategy", "ideation", "planning",
  "copywriting", "take", "design", "editing", "upload", "analisis",
];

export const STAGE_LABELS: Record<Stage, string> = {
  brief: "Brief",
  riset: "Riset",
  strategy: "Strategy",
  ideation: "Ideation",
  planning: "Planning",
  copywriting: "Copywriting",
  take: "Take Konten",
  design: "Design",
  editing: "Editing",
  upload: "Upload",
  analisis: "Analisis",
};

// Tahap produksi — target Brief Gate (§5.2)
export const PRODUCTION_STAGES: Stage[] = ["copywriting", "take", "design", "editing"];

export const STATUSES: Status[] = [
  "ide", "brief_ok", "produksi", "review", "revisi", "siap",
  "tayang", "dianalisis", "bank", "expired", "batal",
];

export const STATUS_LABELS: Record<Status, string> = {
  ide: "Ide",
  brief_ok: "Brief OK",
  produksi: "Produksi",
  review: "Review",
  revisi: "Revisi",
  siap: "Siap",
  tayang: "Tayang",
  dianalisis: "Dianalisis",
  bank: "Bank",
  expired: "Expired",
  batal: "Batal",
};

// Warna konsisten per status di seluruh UI (§2.4)
export const STATUS_COLORS: Record<Status, { bg: string; text: string; border: string }> = {
  ide:        { bg: "bg-slate-200",   text: "text-slate-700",   border: "border-slate-300" },
  brief_ok:   { bg: "bg-sky-100",     text: "text-sky-700",     border: "border-sky-300" },
  produksi:   { bg: "bg-yellow-100",  text: "text-yellow-700",  border: "border-yellow-300" },
  review:     { bg: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-300" },
  revisi:     { bg: "bg-pink-100",    text: "text-pink-700",    border: "border-pink-300" },
  siap:       { bg: "bg-green-100",   text: "text-green-700",   border: "border-green-300" },
  tayang:     { bg: "bg-emerald-200", text: "text-emerald-800", border: "border-emerald-400" },
  dianalisis: { bg: "bg-blue-200",    text: "text-blue-800",    border: "border-blue-400" },
  bank:       { bg: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-300" },
  expired:    { bg: "bg-slate-300",   text: "text-slate-600",   border: "border-slate-400" },
  batal:      { bg: "bg-slate-100",   text: "text-slate-400 line-through", border: "border-slate-200" },
};

export const CHANNELS: Channel[] = ["instagram", "tiktok", "youtube", "other"];

export const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  other: "Lainnya",
};

export const CHANNEL_ICONS: Record<Channel, string> = {
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  other: "··",
};

export const FORMATS: ContentFormat[] = [
  "reels", "carousel", "story", "single_post", "short", "tiktok_video",
  "long_video", "yt_short", "live",
];

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  reels: "Reels",
  carousel: "Carousel",
  story: "Story",
  single_post: "Single Post",
  short: "Short",
  tiktok_video: "TikTok Video",
  long_video: "Long Video",
  yt_short: "YT Short",
  live: "Live",
};

export const VIDEO_FORMATS: ContentFormat[] = [
  "reels", "short", "tiktok_video", "long_video", "yt_short", "live",
];

export const CONTENT_TYPES: ContentType[] = ["organik", "kol", "affiliate", "ads", "ugc"];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  organik: "Organik",
  kol: "KOL",
  affiliate: "Affiliate",
  ads: "Ads",
  ugc: "UGC",
};

export const PRIORITIES: Priority[] = ["tinggi", "sedang", "rendah"];

export const ROLES: Role[] = [
  "lead", "strategist", "researcher", "creative", "copywriter",
  "videographer", "designer", "editor", "smo", "analyst", "kol_coord", "performance",
];

export const ROLE_LABELS: Record<Role, string> = {
  lead: "Lead / SM Manager",
  strategist: "Strategist",
  researcher: "Researcher",
  creative: "Creative Director",
  copywriter: "Copywriter",
  videographer: "Videographer",
  designer: "Designer",
  editor: "Editor",
  smo: "Social Media Officer",
  analyst: "Analyst",
  kol_coord: "KOL Coordinator",
  performance: "Performance (Ads)",
};

export const GOALS: Goal[] = ["awareness", "engagement", "sales", "leads", "community"];

export const GOAL_LABELS: Record<Goal, string> = {
  awareness: "Awareness",
  engagement: "Engagement",
  sales: "Sales",
  leads: "Leads",
  community: "Community",
};

export const INDUSTRIES: Industry[] = ["beauty", "fashion", "fnb", "jasa", "tech", "ecommerce", "umum"];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  beauty: "Beauty",
  fashion: "Fashion",
  fnb: "F&B",
  jasa: "Jasa",
  tech: "Tech",
  ecommerce: "E-commerce",
  umum: "Umum",
};

export const RANKING_METRICS: RankingMetric[] = [
  "views", "shares", "retention1s", "saves", "comments", "engagement",
  "er", "completionRate", "linkClicks", "conversions",
];

export const METRIC_LABELS: Record<string, string> = {
  views: "Views",
  shares: "Shares",
  retention1s: "Retention 1s",
  saves: "Saves",
  comments: "Comments",
  engagement: "Engagement",
  er: "Engagement Rate",
  completionRate: "Completion Rate",
  linkClicks: "Link Clicks",
  conversions: "Conversions",
  likes: "Likes",
  reach: "Reach",
};

// Rasional metrik ranking default (tooltip §13.3)
export const DEFAULT_METRIC_RATIONALE: Partial<Record<RankingMetric, string>> = {
  views: "Output/hasil akhir — ukuran jangkauan konten.",
  shares: "Kausal — mengukur shareability, sinyal kualitas terkuat ke algoritma.",
  retention1s: "Kausal — kekuatan hook 3 detik pertama (khusus video).",
};

// Default daftar nilai atribut (§2.7) — bisa diubah di Settings
export const DEFAULT_ATTRIBUTE_OPTIONS = {
  hookType: [
    "pertanyaan", "statement_kontroversial", "visual_surprise",
    "threat_pain_point", "curiosity_gap", "identifikasi_langsung",
    "social_proof", "headline_text", "lainnya",
  ],
  concept: [
    "interview", "tutorial", "storytelling", "skit", "review",
    "listicle", "pov", "vlog", "showcase", "debat", "lainnya",
  ],
  storyStructure: [
    "problem_solution", "before_after", "day_in_life",
    "listicle", "tutorial_steps", "pov", "lainnya",
  ],
  heuristicBias: [
    "pattern_interrupt", "cognitive_dissonance", "social_proof", "scarcity",
    "fomo", "curiosity_gap", "authority", "reciprocity",
  ],
  visualStyle: ["raw_authentic", "polished_studio", "cinematic", "text_heavy", "ugc_style", "lainnya"],
  soundType: ["trending_sound", "original_audio", "voiceover", "no_sound"],
  ctaType: ["follow", "save", "comment", "share", "link", "dm", "beli", "tidak_ada"],
  captionStyle: ["pendek", "panjang_storytelling", "listicle", "minimal"],
  talentNames: [] as string[],
};

export const DAY_NAMES = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];

// Faktor pattern analysis (§13.4) yang dihitung dari atribut konten
export const PATTERN_FACTORS: { key: string; label: string }[] = [
  { key: "hookType", label: "Hook" },
  { key: "talentNames", label: "Talent" },
  { key: "talentGender", label: "Gender Talent" },
  { key: "durationBucket", label: "Durasi" },
  { key: "concept", label: "Konsep" },
  { key: "storyStructure", label: "Struktur Cerita" },
  { key: "heuristicBias", label: "Trigger Psikologis" },
  { key: "visualStyle", label: "Gaya Visual" },
  { key: "background", label: "Latar/Setting" },
  { key: "soundType", label: "Sound" },
  { key: "ctaType", label: "CTA" },
  { key: "captionStyle", label: "Gaya Caption" },
  { key: "slideCount", label: "Jumlah Slide" },
  { key: "postDay", label: "Hari Posting" },
  { key: "postHour", label: "Jam Posting" },
  { key: "format", label: "Format" },
  { key: "pillar", label: "Pillar" },
];

// Field atribut kunci untuk perhitungan kelengkapan (§13.7)
export const KEY_ATTRIBUTE_FIELDS = [
  "hookType", "hasTalent", "concept", "storyStructure", "heuristicBias",
  "visualStyle", "background", "soundType", "ctaType", "ctaPlacement",
  "captionStyle", "durationSec", "postDay", "postHour",
];
