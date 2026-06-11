import type { AppData, BrandConfig, ContentItem, Stage, Status } from "../types";
import { DEFAULT_ATTRIBUTE_OPTIONS, DAY_NAMES } from "./constants";
import { generateId, nowISO } from "../logic/rules";

export function defaultConfig(): BrandConfig {
  return {
    brandName: "Brand Saya",
    industry: "umum",
    primaryGoals: ["awareness", "engagement"],
    channels: ["instagram", "tiktok"],
    members: [
      { id: "m1", name: "Andi", roles: ["lead", "strategist"], active: true },
      { id: "m2", name: "Bela", roles: ["copywriter", "smo"], active: true },
      { id: "m3", name: "Caca", roles: ["videographer", "editor"], active: true },
      { id: "m4", name: "Dion", roles: ["designer"], active: true },
      { id: "m5", name: "Eka", roles: ["analyst", "researcher"], active: true },
    ],
    rolesEnabled: ["lead", "strategist", "copywriter", "smo", "videographer", "editor", "designer", "analyst", "researcher"],
    approvalEnabled: true,
    handoffTrackingEnabled: true,
    roleBasedViewsEnabled: true,
    bankHealthyMin: 4,
    bankHealthyMax: 8,
    defaultTrendExpiryDays: 14,
    pillars: [
      { name: "Edukasi", description: "Konten edukatif seputar produk & industri" },
      { name: "Hiburan", description: "Konten relatable / menghibur" },
      { name: "Produk", description: "Showcase & promo produk" },
      { name: "Komunitas", description: "UGC, testimoni, interaksi" },
    ],
    hashtagSets: [
      { pillar: "Edukasi", tags: ["#tips", "#edukasi"] },
      { pillar: "Produk", tags: ["#produkbaru", "#promo"] },
    ],
    postingTimes: [
      { channel: "instagram", times: ["12:00", "19:00"] },
      { channel: "tiktok", times: ["18:00", "21:00"] },
    ],
    weeklyPostTargets: { instagram: 4, tiktok: 3 },
    attributeOptions: {
      ...DEFAULT_ATTRIBUTE_OPTIONS,
      talentNames: ["Talent A", "Talent B", "Founder"],
    },
    durationBuckets: [15, 30, 60],
  };
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysAhead(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

interface SeedSpec {
  title: string;
  stage: Stage;
  status: Status;
  pic: string | null;
  pillar: string;
  format: ContentItem["format"];
  channel: ContentItem["channel"];
  schedOffset?: number;       // hari relatif hari ini (negatif = lampau)
  deadlineOffset?: number;
  banked?: "evergreen" | "trend";
  expiryOffset?: number;
  briefDone?: boolean;
  contentType?: ContentItem["contentType"];
  approval?: ContentItem["approvalStatus"];
  results?: ContentItem["results"];
  attrs?: ContentItem["attributes"];
  insight?: string;
  campaign?: string;
}

const PUBLISHED: SeedSpec[] = [
  {
    title: "5 kesalahan pemula yang bikin hasil gagal", stage: "analisis", status: "dianalisis",
    pic: "m5", pillar: "Edukasi", format: "reels", channel: ["instagram", "tiktok"], schedOffset: -25,
    results: { views: 48200, likes: 3100, comments: 240, shares: 890, saves: 1500, reach: 39000, retention1s: 78, completionRate: 41 },
    attrs: { hookType: "pertanyaan", hasTalent: true, talentNames: ["Talent A"], talentCount: 1, talentGender: "perempuan", concept: "listicle", storyStructure: "listicle", heuristicBias: ["curiosity_gap"], durationSec: 32, visualStyle: "raw_authentic", background: "studio", soundType: "voiceover", ctaType: "save", ctaPlacement: "akhir", captionStyle: "listicle" },
    insight: "Hook pertanyaan + format listicle mendorong saves tinggi.",
  },
  {
    title: "Sehari jadi admin: behind the scene", stage: "analisis", status: "dianalisis",
    pic: "m5", pillar: "Hiburan", format: "reels", channel: ["instagram"], schedOffset: -22,
    results: { views: 12400, likes: 980, comments: 85, shares: 120, saves: 95, reach: 11000, retention1s: 55, completionRate: 28 },
    attrs: { hookType: "identifikasi_langsung", hasTalent: true, talentNames: ["Talent B"], talentCount: 1, talentGender: "laki", concept: "vlog", storyStructure: "day_in_life", durationSec: 48, visualStyle: "raw_authentic", background: "kantor", soundType: "trending_sound", ctaType: "comment", ctaPlacement: "akhir", captionStyle: "pendek" },
  },
  {
    title: "Kenapa produk kamu nggak dilirik? Ini alasannya", stage: "analisis", status: "dianalisis",
    pic: "m5", pillar: "Edukasi", format: "tiktok_video", channel: ["tiktok"], schedOffset: -20,
    results: { views: 67500, likes: 5200, comments: 410, shares: 1450, saves: 2100, reach: 58000, retention1s: 82, completionRate: 47 },
    attrs: { hookType: "pertanyaan", hasTalent: true, talentNames: ["Talent A"], talentCount: 1, talentGender: "perempuan", concept: "storytelling", storyStructure: "problem_solution", heuristicBias: ["curiosity_gap", "pattern_interrupt"], durationSec: 28, visualStyle: "raw_authentic", background: "studio", soundType: "voiceover", ctaType: "share", ctaPlacement: "akhir", captionStyle: "pendek" },
    insight: "Pertanyaan pain-point di 3 detik pertama menahan retention di atas 80%.",
  },
  {
    title: "Tutorial lengkap: setup dalam 60 detik", stage: "analisis", status: "dianalisis",
    pic: "m5", pillar: "Edukasi", format: "reels", channel: ["instagram"], schedOffset: -18,
    results: { views: 31000, likes: 2400, comments: 190, shares: 640, saves: 1850, reach: 27500, retention1s: 71, completionRate: 38 },
    attrs: { hookType: "headline_text", hasTalent: false, concept: "tutorial", storyStructure: "tutorial_steps", durationSec: 58, visualStyle: "polished_studio", background: "studio", soundType: "voiceover", ctaType: "save", ctaPlacement: "caption", captionStyle: "listicle" },
  },
  {
    title: "Carousel: 7 mitos yang masih dipercaya", stage: "analisis", status: "dianalisis",
    pic: "m5", pillar: "Edukasi", format: "carousel", channel: ["instagram"], schedOffset: -15,
    results: { views: 18900, likes: 1500, comments: 130, shares: 410, saves: 980, reach: 16800 },
    attrs: { hookType: "statement_kontroversial", hasTalent: false, concept: "listicle", storyStructure: "listicle", heuristicBias: ["cognitive_dissonance"], slideCount: 8, visualStyle: "text_heavy", background: "desain_flat", ctaType: "save", ctaPlacement: "akhir", captionStyle: "panjang_storytelling" },
  },
  {
    title: "Reaksi jujur customer pertama kali coba", stage: "analisis", status: "dianalisis",
    pic: "m5", pillar: "Komunitas", format: "tiktok_video", channel: ["tiktok"], schedOffset: -12,
    contentType: "ugc",
    results: { views: 8900, likes: 620, comments: 48, shares: 75, saves: 60, reach: 8100, retention1s: 49, completionRate: 22 },
    attrs: { hookType: "social_proof", hasTalent: true, talentNames: ["Talent B"], talentCount: 1, talentGender: "laki", concept: "review", storyStructure: "before_after", heuristicBias: ["social_proof"], durationSec: 75, visualStyle: "ugc_style", background: "outdoor", soundType: "original_audio", ctaType: "beli", ctaPlacement: "tengah", captionStyle: "pendek" },
  },
  {
    title: "POV: kamu baru tahu fitur tersembunyi ini", stage: "analisis", status: "dianalisis",
    pic: "m5", pillar: "Produk", format: "reels", channel: ["instagram", "tiktok"], schedOffset: -9,
    results: { views: 54300, likes: 4100, comments: 350, shares: 1230, saves: 1700, reach: 47000, retention1s: 80, completionRate: 44 },
    attrs: { hookType: "curiosity_gap", hasTalent: true, talentNames: ["Talent A"], talentCount: 1, talentGender: "perempuan", concept: "pov", storyStructure: "pov", heuristicBias: ["curiosity_gap", "fomo"], durationSec: 24, visualStyle: "raw_authentic", background: "studio", soundType: "trending_sound", ctaType: "share", ctaPlacement: "akhir", captionStyle: "pendek" },
    insight: "Durasi <30s + curiosity gap konsisten menghasilkan share rate tinggi.",
  },
  {
    title: "Live recap: QnA bareng founder", stage: "analisis", status: "dianalisis",
    pic: "m5", pillar: "Komunitas", format: "long_video", channel: ["youtube"], schedOffset: -7,
    results: { views: 3200, likes: 210, comments: 95, shares: 30, saves: 40, reach: 3000, retention1s: 38, completionRate: 15 },
    attrs: { hookType: "identifikasi_langsung", hasTalent: true, talentNames: ["Founder"], talentCount: 1, talentGender: "laki", concept: "interview", durationSec: 1800, visualStyle: "polished_studio", background: "studio", soundType: "original_audio", ctaType: "follow", ctaPlacement: "awal", captionStyle: "minimal" },
  },
  {
    title: "3 cara pakai produk yang jarang diketahui", stage: "analisis", status: "tayang",
    pic: "m2", pillar: "Produk", format: "reels", channel: ["instagram"], schedOffset: -3,
    results: { views: 21000, likes: 1700, comments: 140, shares: 520, saves: 1100, reach: 19000, retention1s: 74, completionRate: 40 },
    attrs: { hookType: "curiosity_gap", hasTalent: true, talentNames: ["Talent A"], talentCount: 1, talentGender: "perempuan", concept: "tutorial", storyStructure: "listicle", heuristicBias: ["curiosity_gap"], durationSec: 27, visualStyle: "raw_authentic", background: "studio", soundType: "voiceover", ctaType: "save", ctaPlacement: "akhir", captionStyle: "listicle" },
  },
  {
    title: "Story estafet: tebak-tebakan produk", stage: "analisis", status: "tayang",
    pic: "m2", pillar: "Hiburan", format: "story", channel: ["instagram"], schedOffset: -1,
    results: { views: 5400, likes: 320, comments: 28, shares: 15, saves: 10, reach: 5100 },
    attrs: { hookType: "pertanyaan", hasTalent: false, concept: "skit", ctaType: "dm", ctaPlacement: "akhir", captionStyle: "minimal" },
  },
];

const IN_PROGRESS: SeedSpec[] = [
  {
    title: "Kolab KOL: review jujur 1 minggu pemakaian", stage: "editing", status: "review",
    pic: "m3", pillar: "Produk", format: "reels", channel: ["instagram", "tiktok"],
    contentType: "kol", approval: "pending", deadlineOffset: 2, briefDone: true, campaign: "Launch Q2",
    attrs: { hookType: "social_proof", hasTalent: true, talentNames: ["Talent B"], concept: "review", durationSec: 45 },
  },
  {
    title: "Carousel edukasi: panduan memilih varian", stage: "design", status: "produksi",
    pic: "m4", pillar: "Edukasi", format: "carousel", channel: ["instagram"],
    deadlineOffset: -1, briefDone: true,
    attrs: { hookType: "headline_text", concept: "listicle", slideCount: 7 },
  },
  {
    title: "Script video: mitos vs fakta bahan baku", stage: "copywriting", status: "produksi",
    pic: "m2", pillar: "Edukasi", format: "tiktok_video", channel: ["tiktok"],
    deadlineOffset: 3, briefDone: true,
    attrs: { hookType: "statement_kontroversial", concept: "debat" },
  },
  {
    title: "Take konten: unboxing kemasan baru", stage: "take", status: "produksi",
    pic: "m3", pillar: "Produk", format: "reels", channel: ["instagram"],
    deadlineOffset: 1, briefDone: true, campaign: "Launch Q2",
    attrs: { hookType: "visual_surprise", hasTalent: true, talentNames: ["Talent A"] },
  },
  {
    title: "Ads retargeting: promo akhir bulan", stage: "planning", status: "revisi",
    pic: "m1", pillar: "Produk", format: "single_post", channel: ["instagram"],
    contentType: "ads", approval: "revisi", deadlineOffset: 4, briefDone: true,
  },
  {
    title: "Ide: seri mini drama kantor", stage: "ideation", status: "ide",
    pic: "m1", pillar: "Hiburan", format: "reels", channel: ["instagram", "tiktok"],
  },
  {
    title: "Riset tren audio minggu ini", stage: "riset", status: "ide",
    pic: "m5", pillar: "Hiburan", format: "tiktok_video", channel: ["tiktok"],
  },
  {
    title: "Konten tutorial lanjutan (scheduled)", stage: "upload", status: "siap",
    pic: "m2", pillar: "Edukasi", format: "reels", channel: ["instagram"],
    schedOffset: 2, briefDone: true,
    attrs: { hookType: "pertanyaan", concept: "tutorial", durationSec: 30 },
  },
  {
    title: "Showcase varian warna baru (scheduled)", stage: "upload", status: "siap",
    pic: "m2", pillar: "Produk", format: "carousel", channel: ["instagram"],
    schedOffset: 5, briefDone: true, campaign: "Launch Q2",
    attrs: { hookType: "visual_surprise", slideCount: 5 },
  },
];

const BANKED: SeedSpec[] = [
  {
    title: "Evergreen: FAQ paling sering ditanya", stage: "upload", status: "bank",
    pic: null, pillar: "Edukasi", format: "carousel", channel: ["instagram"],
    banked: "evergreen", briefDone: true,
    attrs: { hookType: "pertanyaan", concept: "listicle", slideCount: 6 },
  },
  {
    title: "Evergreen: tips perawatan dasar", stage: "upload", status: "bank",
    pic: null, pillar: "Edukasi", format: "reels", channel: ["instagram", "tiktok"],
    banked: "evergreen", briefDone: true,
    attrs: { hookType: "headline_text", concept: "tutorial", durationSec: 35 },
  },
  {
    title: "Trend: tempel audio viral minggu ini", stage: "upload", status: "bank",
    pic: null, pillar: "Hiburan", format: "tiktok_video", channel: ["tiktok"],
    banked: "trend", expiryOffset: 4, briefDone: true,
    attrs: { soundType: "trending_sound", durationSec: 15 },
  },
  {
    title: "Trend: format komparasi yang lagi rame", stage: "upload", status: "bank",
    pic: null, pillar: "Hiburan", format: "reels", channel: ["instagram"],
    banked: "trend", expiryOffset: 10, briefDone: true,
    attrs: { hookType: "curiosity_gap", durationSec: 20 },
  },
];

function buildItem(spec: SeedSpec, id: string, idx: number): ContentItem {
  const created = daysAgo(35 - idx);
  const sched = spec.schedOffset != null
    ? iso(spec.schedOffset >= 0 ? daysAhead(spec.schedOffset) : daysAgo(-spec.schedOffset))
    : null;
  const attrs = { ...(spec.attrs ?? {}) };
  if (sched && (spec.status === "tayang" || spec.status === "dianalisis")) {
    attrs.postDay = attrs.postDay ?? DAY_NAMES[new Date(sched).getDay()];
    attrs.postHour = attrs.postHour ?? [12, 18, 19, 21][idx % 4];
  }
  const briefDone = spec.briefDone ?? (spec.results != null || spec.banked != null);
  const needsApproval = ["kol", "affiliate", "ads"].includes(spec.contentType ?? "organik");
  return {
    id,
    title: spec.title,
    campaign: spec.campaign,
    channel: spec.channel,
    format: spec.format,
    pillar: spec.pillar,
    contentType: spec.contentType ?? "organik",
    stage: spec.stage,
    status: spec.status,
    priority: idx % 5 === 0 ? "tinggi" : "sedang",
    hook: briefDone ? "Hook 3 detik pertama untuk konten ini." : "",
    brief: briefDone
      ? {
          objective: "Meningkatkan awareness & engagement pillar terkait.",
          keyMessage: "Pesan utama konten dalam satu kalimat.",
          reference: "https://contoh-referensi.example.com",
        }
      : { objective: "", keyMessage: "", reference: "" },
    copy: briefDone ? "Caption/script final konten." : "",
    assetLinks: [],
    currentPIC: spec.pic,
    assignments: spec.pic ? { [spec.stage]: spec.pic } : {},
    receivedAt: created.toISOString(),
    stageDeadline: spec.deadlineOffset != null
      ? iso(spec.deadlineOffset >= 0 ? daysAhead(spec.deadlineOffset) : daysAgo(-spec.deadlineOffset))
      : undefined,
    needsApproval,
    reviewers: needsApproval ? ["m1"] : [],
    approvalStatus: spec.approval ?? (needsApproval ? "pending" : "tidak_perlu"),
    revisionCount: spec.approval === "revisi" ? 1 : 0,
    scheduledDate: sched,
    isBanked: spec.banked != null,
    bankedAt: spec.banked ? iso(daysAgo(5)) : undefined,
    bankType: spec.banked,
    expiryDate: spec.banked === "trend"
      ? iso(spec.expiryOffset! >= 0 ? daysAhead(spec.expiryOffset!) : daysAgo(-spec.expiryOffset!))
      : spec.banked === "evergreen" ? null : undefined,
    results: spec.results,
    insight: spec.insight,
    attributes: attrs,
    notes: "",
    version: 1,
    createdAt: created.toISOString(),
    updatedAt: nowISO(),
    activityLog: [
      { timestamp: created.toISOString(), user: "Andi", action: "konten dibuat" },
      ...(spec.status === "tayang" || spec.status === "dianalisis"
        ? [{ timestamp: new Date(sched ?? created.toISOString()).toISOString(), user: "Bela", action: "status: siap → tayang" }]
        : []),
    ],
  };
}

export function seedAppData(): AppData {
  const config = defaultConfig();
  let counters: Record<string, number> = {};
  const items: ContentItem[] = [];
  const specs = [...PUBLISHED, ...IN_PROGRESS, ...BANKED];
  specs.forEach((spec, idx) => {
    const refDate = spec.schedOffset != null && spec.schedOffset < 0 ? daysAgo(-spec.schedOffset) : new Date();
    const gen = generateId(counters, refDate);
    counters = gen.counters;
    items.push(buildItem(spec, gen.id, idx));
  });
  return { config, items, reports: [], currentUserId: "m1", idCounters: counters };
}
