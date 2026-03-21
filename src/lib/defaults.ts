// ─── Types ───────────────────────────────────────────────────────────

export interface ChannelAllocation {
  channelId: string;
  label: string;
  budgetPct: number;
  cpa: number;
  signupToActiveRate: number;
}

export interface GtmMotion {
  id: string;
  motion: string;
  channel: string;
  agent: string;
  metric: string;
  budget: string;
}

export interface PhaseConfig {
  id: string;
  label: string;
  months: number;
  monthlyMktBudget: number;
  founderPayMonthly: number;
  infraMonthly: number;
  channels: ChannelAllocation[];
  gtmMotions: GtmMotion[];
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

export interface AgentConfig {
  name: string;
  fn: string;
  cost: number;
}

export interface FounderConfig {
  id: string;
  title: string;
  agents: AgentConfig[];
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
  tokenCostPerUserM6: number;
  tokenCostPerUserM12: number;
  tokenCostPerUserM18: number;
  priceDecline18mo: number;
  phases: PhaseConfig[];
  partnerships: PartnershipConfig[];
  founders: FounderConfig[];
}

// Scalar keys that persist as individual key/value pairs
export const SCALAR_KEYS = [
  "raise", "proMonthly", "proAnnual", "studioMonthly", "studioAnnual",
  "convRate", "churn", "viralK",
  "tokenCostPerUserM6", "tokenCostPerUserM12", "tokenCostPerUserM18",
  "priceDecline18mo",
] as const;

// ─── Defaults ────────────────────────────────────────────────────────

const DEFAULT_FOUNDERS: FounderConfig[] = [
  {
    id: "cto", title: "Founder 1: CTO",
    agents: [
      { name: "Code Architect", fn: "System design & code gen", cost: 150 },
      { name: "Frontend Builder", fn: "UI/UX implementation", cost: 120 },
      { name: "Backend Builder", fn: "API & database dev", cost: 120 },
      { name: "AI/ML Pipeline", fn: "Music AI model integration", cost: 200 },
      { name: "Code Reviewer", fn: "PR reviews & quality", cost: 80 },
      { name: "DevOps Agent", fn: "CI/CD & monitoring", cost: 150 },
      { name: "Testing Agent", fn: "Automated QA", cost: 100 },
      { name: "Docs Agent", fn: "Technical docs", cost: 60 },
      { name: "Security Agent", fn: "Vuln scanning", cost: 80 },
      { name: "Data Pipeline", fn: "ETL & analytics", cost: 100 },
    ],
  },
  {
    id: "cpo", title: "Founder 2: CPO",
    agents: [
      { name: "UX Researcher", fn: "User interviews & analysis", cost: 80 },
      { name: "Design Agent", fn: "UI mockups & design system", cost: 100 },
      { name: "Content Writer", fn: "Lesson scripts & copy", cost: 60 },
      { name: "Curriculum Agent", fn: "Music lesson sequencing", cost: 80 },
      { name: "Audio Processing", fn: "Music file analysis", cost: 120 },
      { name: "Accessibility Agent", fn: "WCAG compliance", cost: 40 },
      { name: "Localization Agent", fn: "Multi-language support", cost: 50 },
      { name: "A/B Test Agent", fn: "Experiment design & analysis", cost: 60 },
      { name: "Onboarding Agent", fn: "New user flow optimization", cost: 50 },
      { name: "Feedback Agent", fn: "User feedback synthesis", cost: 40 },
    ],
  },
  {
    id: "cmo", title: "Founder 3: CMO",
    agents: [
      { name: "Social Media Agent", fn: "Content & scheduling", cost: 80 },
      { name: "SEO Agent", fn: "Keywords & optimization", cost: 100 },
      { name: "Ad Ops Agent", fn: "Paid campaign mgmt", cost: 120 },
      { name: "Community Agent", fn: "Discord/forum moderation", cost: 60 },
      { name: "Analytics Agent", fn: "Growth metrics", cost: 80 },
      { name: "Email Agent", fn: "Drip campaigns", cost: 60 },
      { name: "PR Agent", fn: "Media outreach & pitches", cost: 70 },
      { name: "Influencer Agent", fn: "Creator partnerships", cost: 60 },
      { name: "Video Agent", fn: "Short-form video creation", cost: 90 },
      { name: "Brand Agent", fn: "Brand voice & guidelines", cost: 40 },
    ],
  },
  {
    id: "ceo", title: "Founder 4: CEO",
    agents: [
      { name: "Finance Agent", fn: "Bookkeeping & forecasting", cost: 50 },
      { name: "Investor Relations", fn: "Deck updates & data rooms", cost: 40 },
      { name: "Legal Agent", fn: "Contract review", cost: 40 },
      { name: "CS Agent Tier 1", fn: "User support", cost: 80 },
      { name: "CS Agent Tier 2", fn: "Escalation & bugs", cost: 60 },
      { name: "Scheduling Agent", fn: "Calendar mgmt", cost: 30 },
      { name: "Research Agent", fn: "Market & competitor intel", cost: 60 },
      { name: "Partnerships Agent", fn: "Outreach & deal tracking", cost: 50 },
      { name: "Neuro-Science Agent", fn: "Brain metrics content", cost: 80 },
      { name: "Recruiting Agent", fn: "Talent sourcing (if needed)", cost: 40 },
    ],
  },
];

const DEFAULT_PHASES: PhaseConfig[] = [
  {
    id: "phase1", label: "Launch & First Revenue", months: 6, monthlyMktBudget: 1000, founderPayMonthly: 5000, infraMonthly: 500,
    channels: [
      { channelId: "organic_seo", label: "Organic / SEO / ASO", budgetPct: 0.30, cpa: 0.50, signupToActiveRate: 0.35 },
      { channelId: "tiktok_content", label: "TikTok / Reels", budgetPct: 0.25, cpa: 1.50, signupToActiveRate: 0.20 },
      { channelId: "influencer", label: "Influencer (Music Teachers)", budgetPct: 0.20, cpa: 3.00, signupToActiveRate: 0.30 },
      { channelId: "paid_social", label: "Paid Social (Meta/TikTok)", budgetPct: 0.10, cpa: 8.00, signupToActiveRate: 0.25 },
      { channelId: "app_store", label: "App Store Featuring", budgetPct: 0.15, cpa: 2.00, signupToActiveRate: 0.25 },
    ],
    gtmMotions: [
      { id: "g1", motion: "Community-Led Launch", channel: "Discord + Reddit + music forums", agent: "Community Agent", metric: "2,000 waitlist → 500 beta users", budget: "$500" },
      { id: "g2", motion: "Content SEO", channel: "'How to play [X]' long-tail pages", agent: "SEO Agent", metric: "5,000 organic visits/mo by M4", budget: "$300" },
      { id: "g3", motion: "Product Hunt + HN Launch", channel: "Coordinated launch day", agent: "CEO + Marketing Agents", metric: "Top 5 Product of the Day", budget: "$200" },
      { id: "g4", motion: "Short-Form Video", channel: "TikTok/Reels: 'I learned this in 60 sec'", agent: "Social Media + Video Agent", metric: "3 videos/week, 50K total views", budget: "$400" },
      { id: "g5", motion: "Creator Seeding", channel: "Send free Pro to 50 music micro-influencers", agent: "Influencer Agent", metric: "10 organic posts, 200 signups", budget: "$500" },
    ],
  },
  {
    id: "phase2", label: "Scale & Validate Economics", months: 6, monthlyMktBudget: 2500, founderPayMonthly: 9000, infraMonthly: 500,
    channels: [
      { channelId: "organic_seo", label: "Organic / SEO / ASO", budgetPct: 0.20, cpa: 0.50, signupToActiveRate: 0.38 },
      { channelId: "tiktok_content", label: "TikTok / Reels", budgetPct: 0.15, cpa: 1.25, signupToActiveRate: 0.22 },
      { channelId: "influencer", label: "Influencer (Music Teachers)", budgetPct: 0.15, cpa: 2.50, signupToActiveRate: 0.32 },
      { channelId: "paid_social", label: "Paid Social (Meta/TikTok)", budgetPct: 0.30, cpa: 6.00, signupToActiveRate: 0.25 },
      { channelId: "app_store", label: "App Store Featuring", budgetPct: 0.20, cpa: 1.75, signupToActiveRate: 0.28 },
    ],
    gtmMotions: [
      { id: "g6", motion: "Paid Acquisition (Unlock)", channel: "Meta + Google — lookalikes", agent: "Ad Ops Agent", metric: "CAC < $6, ROAS > 3×", budget: "$1,500/mo" },
      { id: "g7", motion: "SEO Scaling", channel: "500+ indexed lesson pages", agent: "SEO + Curriculum Agent", metric: "25K organic visits/mo", budget: "$500/mo" },
      { id: "g8", motion: "Email Lifecycle Engine", channel: "Onboard → Habit → Upsell drips", agent: "Email Agent", metric: "40% open rate, 8% upgrade", budget: "$200/mo" },
      { id: "g9", motion: "Music Teacher Partnerships", channel: "White-label tools for indie teachers", agent: "Partnerships Agent", metric: "20 teachers → 500 students", budget: "$300/mo" },
    ],
  },
  {
    id: "phase3", label: "Growth Mode & Break-Even", months: 6, monthlyMktBudget: 5000, founderPayMonthly: 15000, infraMonthly: 500,
    channels: [
      { channelId: "organic_seo", label: "Organic / SEO / ASO", budgetPct: 0.15, cpa: 0.45, signupToActiveRate: 0.40 },
      { channelId: "tiktok_content", label: "TikTok / Reels", budgetPct: 0.10, cpa: 1.00, signupToActiveRate: 0.25 },
      { channelId: "influencer", label: "Influencer (Music Teachers)", budgetPct: 0.10, cpa: 2.00, signupToActiveRate: 0.35 },
      { channelId: "paid_social", label: "Paid Social (Meta/TikTok)", budgetPct: 0.35, cpa: 5.50, signupToActiveRate: 0.25 },
      { channelId: "app_store", label: "App Store Featuring", budgetPct: 0.10, cpa: 1.50, signupToActiveRate: 0.30 },
      { channelId: "b2b2c", label: "B2B2C Partnerships", budgetPct: 0.20, cpa: 4.00, signupToActiveRate: 0.30 },
    ],
    gtmMotions: [
      { id: "g10", motion: "B2B2C: School Districts", channel: "Pilot programs with 5-10 K-12 music depts", agent: "Partnerships + CEO", metric: "500 student seats, $50K pipeline", budget: "$1,000/mo" },
      { id: "g11", motion: "Health & Wellness Channel", channel: "Cognitive health clinics", agent: "Partnerships + Neuro Agent", metric: "3 clinic partnerships, 200 users", budget: "$500/mo" },
      { id: "g12", motion: "Scaled Paid Acquisition", channel: "YouTube, Spotify ads, podcasts", agent: "Ad Ops + Video Agent", metric: "CAC < $8 across channels", budget: "$3,000/mo" },
      { id: "g13", motion: "International Expansion (V1)", channel: "Localize for Spanish + Portuguese", agent: "Localization + SEO Agent", metric: "10% of new signups from LATAM", budget: "$500/mo" },
    ],
  },
];

const DEFAULT_PARTNERSHIPS: PartnershipConfig[] = [
  { id: "apple_health", partner: "Apple Health / HealthKit", category: "Health & Wellness", usersM6: 0, usersM12: 500, usersM18: 3000, status: "on_track" },
  { id: "spotify", partner: "Spotify (Practice Playlists)", category: "Music Platform", usersM6: 0, usersM12: 200, usersM18: 2000, status: "on_track" },
  { id: "music_teachers", partner: "Music Teacher Marketplace", category: "Education", usersM6: 100, usersM12: 800, usersM18: 2500, status: "on_track" },
  { id: "school_districts", partner: "School Districts Pilot", category: "B2B2C", usersM6: 0, usersM12: 300, usersM18: 5000, status: "at_risk" },
  { id: "youtube_music", partner: "YouTube Music Integration", category: "Music Platform", usersM6: 0, usersM12: 0, usersM18: 1500, status: "on_track" },
  { id: "headspace", partner: "Headspace / Calm (Wellness)", category: "Health & Wellness", usersM6: 0, usersM12: 0, usersM18: 1000, status: "on_track" },
];

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  raise: 150000,
  proMonthly: 14.99,
  proAnnual: 79.99,
  studioMonthly: 24.99,
  studioAnnual: 149.99,
  convRate: 0.04,
  churn: 0.12,
  viralK: 0.6,
  tokenCostPerUserM6: 0.64,
  tokenCostPerUserM12: 0.49,
  tokenCostPerUserM18: 0.46,
  priceDecline18mo: 0.50,
  phases: DEFAULT_PHASES,
  partnerships: DEFAULT_PARTNERSHIPS,
  founders: DEFAULT_FOUNDERS,
};

// ─── Supabase Persistence ────────────────────────────────────────────
// Scalars → individual key/value rows
// Complex arrays (founders, phases, partnerships) → JSON string rows

export function toSupabaseRows(a: Assumptions): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = [];
  for (const key of SCALAR_KEYS) {
    rows.push({ key, value: String(a[key]) });
  }
  rows.push({ key: "_founders_json", value: JSON.stringify(a.founders) });
  rows.push({ key: "_phases_json", value: JSON.stringify(a.phases) });
  rows.push({ key: "_partnerships_json", value: JSON.stringify(a.partnerships) });
  return rows;
}

export function fromSupabaseRows(rows: { key: string; value: string }[], base: Assumptions): Assumptions {
  const a = JSON.parse(JSON.stringify(base)) as Assumptions;
  for (const row of rows) {
    if (row.key === "_founders_json") {
      try { a.founders = JSON.parse(row.value); } catch { /* use default */ }
    } else if (row.key === "_phases_json") {
      try { a.phases = JSON.parse(row.value); } catch { /* use default */ }
    } else if (row.key === "_partnerships_json") {
      try { a.partnerships = JSON.parse(row.value); } catch { /* use default */ }
    } else if (SCALAR_KEYS.includes(row.key as typeof SCALAR_KEYS[number])) {
      (a as Record<string, unknown>)[row.key] = Number(row.value);
    }
  }
  return a;
}
