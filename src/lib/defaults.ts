// ─── Channel & Phase Types ───────────────────────────────────────────

export interface ChannelAllocation {
  channelId: string;
  label: string;
  budgetPct: number;       // 0-1, fraction of phase marketing budget
  cpa: number;             // cost per acquired signup
  signupToActiveRate: number; // channel-specific signup→active conversion
}

export interface PhaseConfig {
  months: number;
  monthlyMktBudget: number;
  founderPayMonthly: number;
  infraMonthly: number;
  channels: ChannelAllocation[];
}

export interface PartnershipConfig {
  id: string;
  partner: string;
  category: string;
  usersM6: number;
  usersM12: number;
  usersM18: number;
  status: string;
}

export interface Assumptions {
  raise: number;
  proMonthly: number;
  proAnnual: number;
  studioMonthly: number;
  studioAnnual: number;
  convRate: number;
  churn: number;
  viralK: number;
  founders: number;
  agentsPerFounder: number;
  tokenCostPerUserM6: number;
  tokenCostPerUserM12: number;
  tokenCostPerUserM18: number;
  priceDecline18mo: number;
  phases: [PhaseConfig, PhaseConfig, PhaseConfig];
  partnerships: PartnershipConfig[];
}

// ─── Default Channels ────────────────────────────────────────────────

const PHASE1_CHANNELS: ChannelAllocation[] = [
  { channelId: "organic_seo", label: "Organic / SEO / ASO", budgetPct: 0.30, cpa: 0.50, signupToActiveRate: 0.35 },
  { channelId: "tiktok_content", label: "TikTok / Reels", budgetPct: 0.25, cpa: 1.50, signupToActiveRate: 0.20 },
  { channelId: "influencer", label: "Influencer (Music Teachers)", budgetPct: 0.20, cpa: 3.00, signupToActiveRate: 0.30 },
  { channelId: "paid_social", label: "Paid Social (Meta/TikTok)", budgetPct: 0.10, cpa: 8.00, signupToActiveRate: 0.25 },
  { channelId: "app_store", label: "App Store Featuring", budgetPct: 0.15, cpa: 2.00, signupToActiveRate: 0.25 },
];

const PHASE2_CHANNELS: ChannelAllocation[] = [
  { channelId: "organic_seo", label: "Organic / SEO / ASO", budgetPct: 0.20, cpa: 0.50, signupToActiveRate: 0.38 },
  { channelId: "tiktok_content", label: "TikTok / Reels", budgetPct: 0.15, cpa: 1.25, signupToActiveRate: 0.22 },
  { channelId: "influencer", label: "Influencer (Music Teachers)", budgetPct: 0.15, cpa: 2.50, signupToActiveRate: 0.32 },
  { channelId: "paid_social", label: "Paid Social (Meta/TikTok)", budgetPct: 0.30, cpa: 6.00, signupToActiveRate: 0.25 },
  { channelId: "app_store", label: "App Store Featuring", budgetPct: 0.20, cpa: 1.75, signupToActiveRate: 0.28 },
];

const PHASE3_CHANNELS: ChannelAllocation[] = [
  { channelId: "organic_seo", label: "Organic / SEO / ASO", budgetPct: 0.15, cpa: 0.45, signupToActiveRate: 0.40 },
  { channelId: "tiktok_content", label: "TikTok / Reels", budgetPct: 0.10, cpa: 1.00, signupToActiveRate: 0.25 },
  { channelId: "influencer", label: "Influencer (Music Teachers)", budgetPct: 0.10, cpa: 2.00, signupToActiveRate: 0.35 },
  { channelId: "paid_social", label: "Paid Social (Meta/TikTok)", budgetPct: 0.35, cpa: 5.50, signupToActiveRate: 0.25 },
  { channelId: "app_store", label: "App Store Featuring", budgetPct: 0.10, cpa: 1.50, signupToActiveRate: 0.30 },
  { channelId: "b2b2c", label: "B2B2C Partnerships", budgetPct: 0.20, cpa: 4.00, signupToActiveRate: 0.30 },
];

// ─── Default Partnerships ────────────────────────────────────────────

const DEFAULT_PARTNERSHIPS: PartnershipConfig[] = [
  { id: "apple_health", partner: "Apple Health / HealthKit", category: "Health & Wellness", usersM6: 0, usersM12: 500, usersM18: 3000, status: "on_track" },
  { id: "spotify", partner: "Spotify (Practice Playlists)", category: "Music Platform", usersM6: 0, usersM12: 200, usersM18: 2000, status: "on_track" },
  { id: "music_teachers", partner: "Music Teacher Marketplace", category: "Education", usersM6: 100, usersM12: 800, usersM18: 2500, status: "on_track" },
  { id: "school_districts", partner: "School Districts Pilot", category: "B2B2C", usersM6: 0, usersM12: 300, usersM18: 5000, status: "at_risk" },
  { id: "youtube_music", partner: "YouTube Music Integration", category: "Music Platform", usersM6: 0, usersM12: 0, usersM18: 1500, status: "on_track" },
  { id: "headspace", partner: "Headspace / Calm (Wellness)", category: "Health & Wellness", usersM6: 0, usersM12: 0, usersM18: 1000, status: "on_track" },
];

// ─── Full Default Assumptions ────────────────────────────────────────

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  raise: 150000,
  proMonthly: 14.99,
  proAnnual: 79.99,
  studioMonthly: 24.99,
  studioAnnual: 149.99,
  convRate: 0.04,
  churn: 0.12,
  viralK: 0.6,
  founders: 4,
  agentsPerFounder: 10,
  tokenCostPerUserM6: 0.64,
  tokenCostPerUserM12: 0.49,
  tokenCostPerUserM18: 0.46,
  priceDecline18mo: 0.50,
  phases: [
    { months: 6, monthlyMktBudget: 1000, founderPayMonthly: 5000, infraMonthly: 500, channels: PHASE1_CHANNELS },
    { months: 6, monthlyMktBudget: 2500, founderPayMonthly: 9000, infraMonthly: 500, channels: PHASE2_CHANNELS },
    { months: 6, monthlyMktBudget: 5000, founderPayMonthly: 15000, infraMonthly: 500, channels: PHASE3_CHANNELS },
  ],
  partnerships: DEFAULT_PARTNERSHIPS,
};

// ─── Flatten / Unflatten for Supabase ────────────────────────────────

export function flattenAssumptions(a: Assumptions): Record<string, number> {
  const flat: Record<string, number> = {};
  // Top-level scalars
  for (const key of ["raise","proMonthly","proAnnual","studioMonthly","studioAnnual","convRate","churn","viralK","founders","agentsPerFounder","tokenCostPerUserM6","tokenCostPerUserM12","tokenCostPerUserM18","priceDecline18mo"] as const) {
    flat[key] = a[key];
  }
  // Phases
  a.phases.forEach((p, pi) => {
    flat[`phase${pi}_mktBudget`] = p.monthlyMktBudget;
    flat[`phase${pi}_founderPay`] = p.founderPayMonthly;
    flat[`phase${pi}_infra`] = p.infraMonthly;
    p.channels.forEach((c) => {
      flat[`phase${pi}_ch_${c.channelId}_pct`] = c.budgetPct;
      flat[`phase${pi}_ch_${c.channelId}_cpa`] = c.cpa;
      flat[`phase${pi}_ch_${c.channelId}_conv`] = c.signupToActiveRate;
    });
  });
  // Partnerships
  a.partnerships.forEach((p) => {
    flat[`partner_${p.id}_m6`] = p.usersM6;
    flat[`partner_${p.id}_m12`] = p.usersM12;
    flat[`partner_${p.id}_m18`] = p.usersM18;
  });
  return flat;
}

export function unflattenAssumptions(flat: Record<string, number>, base: Assumptions): Assumptions {
  const a = JSON.parse(JSON.stringify(base)) as Assumptions;
  // Top-level scalars
  for (const key of ["raise","proMonthly","proAnnual","studioMonthly","studioAnnual","convRate","churn","viralK","founders","agentsPerFounder","tokenCostPerUserM6","tokenCostPerUserM12","tokenCostPerUserM18","priceDecline18mo"] as const) {
    if (flat[key] !== undefined) a[key] = flat[key];
  }
  // Phases
  a.phases.forEach((p, pi) => {
    if (flat[`phase${pi}_mktBudget`] !== undefined) p.monthlyMktBudget = flat[`phase${pi}_mktBudget`];
    if (flat[`phase${pi}_founderPay`] !== undefined) p.founderPayMonthly = flat[`phase${pi}_founderPay`];
    if (flat[`phase${pi}_infra`] !== undefined) p.infraMonthly = flat[`phase${pi}_infra`];
    p.channels.forEach((c) => {
      if (flat[`phase${pi}_ch_${c.channelId}_pct`] !== undefined) c.budgetPct = flat[`phase${pi}_ch_${c.channelId}_pct`];
      if (flat[`phase${pi}_ch_${c.channelId}_cpa`] !== undefined) c.cpa = flat[`phase${pi}_ch_${c.channelId}_cpa`];
      if (flat[`phase${pi}_ch_${c.channelId}_conv`] !== undefined) c.signupToActiveRate = flat[`phase${pi}_ch_${c.channelId}_conv`];
    });
  });
  // Partnerships
  a.partnerships.forEach((p) => {
    if (flat[`partner_${p.id}_m6`] !== undefined) p.usersM6 = flat[`partner_${p.id}_m6`];
    if (flat[`partner_${p.id}_m12`] !== undefined) p.usersM12 = flat[`partner_${p.id}_m12`];
    if (flat[`partner_${p.id}_m18`] !== undefined) p.usersM18 = flat[`partner_${p.id}_m18`];
  });
  return a;
}
