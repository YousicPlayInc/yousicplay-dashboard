"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_ASSUMPTIONS } from "@/lib/defaults";
import { computeAll, type Assumptions } from "@/lib/calculations";
import { currency, pct, num } from "@/lib/format";
import { Card, Metric, Input, StatusBadge } from "@/components/ui";

const TABS = [
  "Inflection Points",
  "AI Agent Teams",
  "Token Expenses",
  "Rule of 10",
  "Team & Economics",
  "GTM Strategy",
  "Marketing & Growth",
  "Partnerships & PR",
  "Ask Summary",
];

const AGENT_TEAMS = [
  {
    founder: "Founder 1: CTO",
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
    founder: "Founder 2: CPO",
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
    founder: "Founder 3: CMO",
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
    founder: "Founder 4: CEO",
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

export default function Dashboard() {
  const [tab, setTab] = useState(0);
  const [a, setA] = useState<Assumptions>({ ...DEFAULT_ASSUMPTIONS });
  const [loaded, setLoaded] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load assumptions from Supabase on mount
  useEffect(() => {
    async function load() {
      if (!supabase) { setLoaded(true); return; }
      try {
        const { data } = await supabase.from("assumptions").select("key, value");
        if (data && data.length > 0) {
          const fromDb: Assumptions = { ...DEFAULT_ASSUMPTIONS };
          data.forEach((row: { key: string; value: number }) => {
            fromDb[row.key] = Number(row.value);
          });
          setA(fromDb);
        }
      } catch {
        // Use defaults if Supabase not configured
      }
      setLoaded(true);
    }
    load();
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("assumptions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assumptions" },
        (payload) => {
          const row = payload.new as { key: string; value: number } | undefined;
          if (row) {
            setA((prev) => ({ ...prev, [row.key]: Number(row.value) }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Persist a single key to Supabase (debounced)
  const persistKey = useCallback((key: string, value: number) => {
    if (!supabase) return;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      try {
        await supabase
          .from("assumptions")
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      } catch {
        // Silently fail if Supabase not configured
      }
    }, 500);
  }, []);

  const u = useCallback(
    (key: string) => (val: number) => {
      setA((prev) => ({ ...prev, [key]: val }));
      persistKey(key, val);
    },
    [persistKey]
  );

  const calc = useMemo(() => computeAll(a), [a]);

  const totalAgentCost = AGENT_TEAMS.reduce(
    (s, t) => s + t.agents.reduce((s2, ag) => s2 + ag.cost, 0),
    0
  );

  // Marketing initiatives (local state)
  const [mktInitiatives] = useState([
    { name: "TikTok/Reels: 'Watch me learn this in 60 sec'", agent: "Social Media Agent", phase: "M1", status: "planned", notes: "Viral music learning clips" },
    { name: "Creator Partnership Program", agent: "Community Agent", phase: "M2", status: "planned", notes: "Music influencers teach on platform" },
    { name: "SEO Content Engine", agent: "SEO Agent", phase: "M1", status: "planned", notes: "'How to play [song] on [instrument]' pages" },
    { name: "Product Hunt / HN Launch", agent: "Marketing + CEO", phase: "M1", status: "planned", notes: "Coordinated launch day push" },
    { name: "Referral Program: 'Teach a Friend'", agent: "Growth Agent", phase: "M3", status: "planned", notes: "Free month for referrals" },
    { name: "Email Drip: Cognitive Benefits", agent: "Email Agent", phase: "M2", status: "planned", notes: "Neuro-science angle for retention" },
    { name: "App Store Optimization", agent: "SEO Agent", phase: "M2", status: "planned", notes: "Keywords, screenshots, reviews" },
    { name: "Paid Acquisition (Meta/Google)", agent: "Ad Ops Agent", phase: "M3", status: "planned", notes: "Lookalike audiences from early users" },
    { name: "Community Discord Launch", agent: "Community Agent", phase: "M1", status: "planned", notes: "Practice buddies, challenges" },
    { name: "PR: 'AI teaches music + tracks your brain'", agent: "CEO + PR Agent", phase: "M2", status: "planned", notes: "TechCrunch, Wired, music press" },
  ]);

  const [partnerships] = useState([
    { category: "Health & Wellness", partner: "Cognitive health clinics / therapists", value: "Music therapy + brain metrics", timeline: "M6-M12", status: "research", revenue: "B2B licensing" },
    { category: "Health & Wellness", partner: "Elder care / memory programs", value: "Neuroplasticity through music", timeline: "M9-M18", status: "research", revenue: "Institutional licenses" },
    { category: "Entertainment", partner: "Spotify / Apple Music", value: "Learn-to-play integration", timeline: "M12+", status: "aspirational", revenue: "API partnership rev share" },
    { category: "Entertainment", partner: "YouTube Music creators", value: "Embedded lesson widgets", timeline: "M6-M12", status: "outreach", revenue: "Affiliate / co-marketing" },
    { category: "Music Industry", partner: "Guitar Center / Sweetwater", value: "Bundled with instrument purchase", timeline: "M6-M12", status: "outreach", revenue: "Bundle licensing" },
    { category: "Music Industry", partner: "Independent music teachers", value: "White-label lesson tools", timeline: "M3-M9", status: "planned", revenue: "B2B SaaS" },
    { category: "Education", partner: "K-12 music programs", value: "Classroom supplement tool", timeline: "M9-M18", status: "research", revenue: "School/district licenses" },
    { category: "Education", partner: "Universities (music + neuroscience)", value: "Research partnerships + data", timeline: "M6-M18", status: "outreach", revenue: "Grants + institutional" },
    { category: "PR / Media", partner: "TechCrunch, Wired, WIRED", value: "AI + neuroscience + music angle", timeline: "M1-M3", status: "planned", revenue: "Earned media / awareness" },
    { category: "PR / Media", partner: "Music education publications", value: "Thought leadership + reviews", timeline: "M2-M6", status: "planned", revenue: "Earned media / authority" },
  ]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900/40 to-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Yousic Play</h1>
            <p className="text-sm text-slate-400">Pre-Seed Financial Model &amp; Launch Dashboard</p>
          </div>
          <div className="flex gap-4 text-center">
            <Metric label="Raise" value={currency(a.raise)} />
            <Metric label="18-Mo ARR" value={currency(calc.arrM18)} good />
            <Metric label="Agents" value={calc.totalAgents} />
            <Metric label="Break-Even" value={`M${calc.breakEvenMonth}`} good />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 bg-slate-800/50 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex">
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === i
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* TAB 0: INFLECTION POINTS */}
        {tab === 0 && (
          <div className="space-y-6">
            <Card title="Pricing Tiers">
              <p className="text-xs text-slate-400 mb-3">14-day full Pro trial on signup. No payment upfront.</p>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Guest</p>
                  <p className="text-lg font-bold font-mono text-white mt-1">No account</p>
                  <p className="text-xs text-slate-400 mt-2">Zero-friction entry</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Free</p>
                  <p className="text-lg font-bold font-mono text-white mt-1">$0</p>
                  <p className="text-xs text-slate-400 mt-2">Assessment + limited experience</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 border border-blue-500/40">
                  <p className="text-xs text-white uppercase tracking-wide">Pro</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold font-mono text-white">${a.proMonthly}</span>
                    <span className="text-xs text-slate-400">/mo</span>
                  </div>
                  <p className="text-xs text-white">${a.proAnnual}/yr (save 55%)</p>
                  <p className="text-xs text-slate-400 mt-2">Full personalized growth system</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 border border-blue-500/40">
                  <p className="text-xs text-white uppercase tracking-wide">Studio</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold font-mono text-white">${a.studioMonthly}</span>
                    <span className="text-xs text-slate-400">/mo</span>
                  </div>
                  <p className="text-xs text-white">${a.studioAnnual}/yr (save 42%)</p>
                  <p className="text-xs text-slate-400 mt-2">Community + performance layer</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs text-slate-500 bg-slate-800/50 rounded p-3">
                <div><span className="text-slate-400 block">Blended ARPU (M6)</span><span className="text-white font-mono">${calc.blendedArpuM6?.toFixed(2)}/mo</span></div>
                <div><span className="text-slate-400 block">Blended ARPU (M12)</span><span className="text-white font-mono">${calc.blendedArpuM12?.toFixed(2)}/mo</span></div>
                <div><span className="text-slate-400 block">Blended ARPU (M18)</span><span className="text-white font-mono">${calc.blendedArpuM18?.toFixed(2)}/mo</span></div>
                <div><span className="text-slate-400 block">Tier mix</span><span className="text-slate-300">Studio grows 15%→25%→35%</span></div>
              </div>
            </Card>

            <Card title="Core Assumptions (edit these)">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input label="Raise Amount" value={a.raise} onChange={u("raise")} prefix="$" />
                <Input label="Pro Monthly" value={a.proMonthly} onChange={u("proMonthly")} prefix="$" />
                <Input label="Pro Annual" value={a.proAnnual} onChange={u("proAnnual")} prefix="$" />
                <Input label="Studio Monthly" value={a.studioMonthly} onChange={u("studioMonthly")} prefix="$" />
                <Input label="Studio Annual" value={a.studioAnnual} onChange={u("studioAnnual")} prefix="$" />
                <Input label="Free→Paid Conv %" value={(a.convRate * 100).toFixed(1)} onChange={(v) => u("convRate")(v / 100)} suffix="%" />
                <Input label="Monthly Churn %" value={(a.churn * 100).toFixed(1)} onChange={(v) => u("churn")(v / 100)} suffix="%" />
                <Input label="Viral K-Factor" value={a.viralK} onChange={u("viralK")} />
                <Input label="Activation Rate %" value={(a.activationRate * 100).toFixed(0)} onChange={(v) => u("activationRate")(v / 100)} suffix="%" />
                <Input label="# Founders" value={a.founders} onChange={u("founders")} />
              </div>
            </Card>

            <Card title="User Growth Targets (edit these)">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Registered Users @ M6" value={a.usersM6} onChange={u("usersM6")} />
                <Input label="Registered Users @ M12" value={a.usersM12} onChange={u("usersM12")} />
                <Input label="Registered Users @ M18" value={a.usersM18} onChange={u("usersM18")} />
              </div>
            </Card>

            <Card title="AI Consumer Platform Benchmarks (2025-2026)">
              <p className="text-xs text-slate-400 mb-3">How we calibrated our targets — sourced from a16z, Sensor Tower, Duolingo, and market data.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2">Benchmark</th>
                      <th className="text-right py-2">Data Point</th>
                      <th className="text-left py-2 pl-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {[
                      ["Median AI consumer app ARR (Year 1)", "$4.2M", "a16z, 2025"],
                      ["Median AI enterprise app ARR (Year 1)", "$2.1M", "a16z, 2025"],
                      ["AI app downloads growth (H1 2025)", "+67% HoH", "Sensor Tower"],
                      ["AI app consumer spend (2025 → 2026)", "$5B → $10B+", "Sensor Tower / Appfigures"],
                      ["Duolingo MAU growth (AI-powered)", "+24% YoY to 128M", "Duolingo Q2 2025"],
                      ["Duolingo free-to-paid conversion", "7% of MAU", "Duolingo Q1 2025"],
                      ["Duolingo DAU growth (AI features)", "+51% YoY", "Duolingo 2025"],
                      ["AI consumer app free-to-paid rate", "2-5% (freemium)", "Industry avg, 2025"],
                      ["AI consumer paid retention (M1-M6)", "On par with pre-AI SaaS", "a16z retention study"],
                      ["AI paid sub growth (Claude)", "+200% YoY", "a16z, Jan 2026"],
                      ["AI paid sub growth (Gemini)", "+258% YoY", "a16z, Jan 2026"],
                      ["Online music ed market (2026)", "$4.6B, 15.2% CAGR", "Mordor Intelligence"],
                      ["Time in gen AI apps (2025)", "48B hours (3.6× YoY)", "Sensor Tower"],
                    ].map(([metric, val, source], i) => (
                      <tr key={i} className={`border-b border-slate-800 ${i % 2 !== 0 ? "bg-slate-800/30" : ""}`}>
                        <td className="py-1.5">{metric}</td>
                        <td className="py-1.5 text-right font-mono text-white font-medium">{val}</td>
                        <td className="py-1.5 pl-3 text-xs text-slate-500">{source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "6-Month Inflection", sub: "Trial-to-paid validated", bench: "AI apps avg 2-5% conversion; Duolingo at 7%", users: a.usersM6, mau: calc.mauM6, paid: calc.paidM6, mrr: calc.mrrM6, arr: calc.arrM6, wow: a.wowM6, arpu: calc.blendedArpuM6 },
                { label: "12-Month Inflection", sub: "On pace vs median AI consumer ($4.2M ARR)", bench: "Median AI consumer app hits $4.2M ARR by M12 (a16z)", users: a.usersM12, mau: calc.mauM12, paid: calc.paidM12, mrr: calc.mrrM12, arr: calc.arrM12, wow: a.wowM12, arpu: calc.blendedArpuM12 },
                { label: "18-Month Inflection", sub: "Retention proven, seed-ready", bench: "AI paid retention matches pre-AI SaaS M1-M6 (a16z)", users: a.usersM18, mau: calc.mauM18, paid: calc.paidM18, mrr: calc.mrrM18, arr: calc.arrM18, wow: a.wowM18, arpu: calc.blendedArpuM18 },
              ].map((ip, i) => (
                <Card key={i} title={ip.label}>
                  <p className="text-xs text-slate-500 mb-1">{ip.sub}</p>
                  <p className="text-xs text-white/70 mb-3 italic">{ip.bench}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Registered Users</span><span className="text-sm font-mono">{num(ip.users)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">MAU</span><span className="text-sm font-mono">{num(ip.mau)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Paid Subscribers</span><span className="text-sm font-mono text-emerald-400">{num(ip.paid)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Blended ARPU</span><span className="text-sm font-mono">${ip.arpu?.toFixed(2)}/mo</span></div>
                    <div className="border-t border-slate-700 my-2" />
                    <div className="flex justify-between"><span className="text-xs text-slate-400">MRR</span><span className="text-sm font-mono text-emerald-400">{currency(ip.mrr)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">ARR (run-rate)</span><span className="text-sm font-mono font-bold text-emerald-400">{currency(ip.arr)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">WoW Growth</span><span className="text-sm font-mono">{pct(ip.wow)}</span></div>
                  </div>
                </Card>
              ))}
            </div>

            <Card title="How Our Targets Compare">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">vs. Median AI Consumer App (a16z)</p>
                  <p className="text-slate-300">Median hits $4.2M ARR by M12. Our M12 target of {currency(calc.arrM12)} is conservative — we&apos;re a niche vertical, not a horizontal AI tool. Reaching even 10% of median validates the model.</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">vs. Duolingo&apos;s AI Acceleration</p>
                  <p className="text-slate-300">Duolingo&apos;s AI features drove 51% DAU growth and 7% free-to-paid conversion. Our {pct(a.convRate)} conversion target is conservative vs. Duolingo but realistic for a new brand without their distribution.</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">vs. AI App Market Growth</p>
                  <p className="text-slate-300">AI app downloads grew 67% HoH in 2025, consumer spend tripled to $5B. Music education ($4.6B) is under-penetrated by AI — we&apos;re riding both tailwinds simultaneously.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 1: AI AGENT TEAMS */}
        {tab === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card><Metric label="Founders" value={a.founders} /></Card>
              <Card><Metric label="Total Agents" value={calc.totalAgents} good /></Card>
              <Card><Metric label="Trad. Headcount Replaced" value={calc.tradHeadcount} /></Card>
              <Card><Metric label="Annual Savings" value={currency(calc.tradCost - totalAgentCost * 12)} good /></Card>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <Card><Metric label="Headcount Reduction" value="71%" sub="14 → 4 people" good /></Card>
              <Card><Metric label="Cost Reduction" value="98%" sub={`$1.5M → ${currency(totalAgentCost * 12)}/yr`} good /></Card>
              <Card><Metric label="Agent Cost/mo" value={currency(totalAgentCost)} sub="All 40 agents combined" /></Card>
            </div>

            {AGENT_TEAMS.map((team, ti) => (
              <Card key={ti} title={team.founder}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2 pr-4">Agent</th>
                        <th className="text-left py-2 pr-4">Function</th>
                        <th className="text-right py-2">$/mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.agents.map((ag, ai) => (
                        <tr key={ai} className="border-b border-slate-800">
                          <td className="py-1.5 pr-4 font-medium">{ag.name}</td>
                          <td className="py-1.5 pr-4 text-slate-400">{ag.fn}</td>
                          <td className="py-1.5 text-right font-mono text-white">${ag.cost}</td>
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td className="py-2" colSpan={2}>Subtotal</td>
                        <td className="py-2 text-right font-mono text-emerald-400">
                          ${team.agents.reduce((s, ag) => s + ag.cost, 0)}/mo
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 2: TOKEN EXPENSES */}
        {tab === 2 && (
          <div className="space-y-6">
            <Card title="Token Cost Assumptions (edit these)">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Cost/User/Mo @ M6" value={a.tokenCostPerUserM6} onChange={u("tokenCostPerUserM6")} prefix="$" />
                <Input label="Cost/User/Mo @ M12" value={a.tokenCostPerUserM12} onChange={u("tokenCostPerUserM12")} prefix="$" />
                <Input label="Cost/User/Mo @ M18" value={a.tokenCostPerUserM18} onChange={u("tokenCostPerUserM18")} prefix="$" />
                <Input label="Internal Agent Cost/Mo" value={a.agentCostMo} onChange={u("agentCostMo")} prefix="$" />
                <Input label="18-Mo Price Decline Factor" value={(a.priceDecline18mo * 100).toFixed(0)} onChange={(v) => u("priceDecline18mo")(v / 100)} suffix="%" />
              </div>
            </Card>

            <Card title="API Pricing Reference (March 2026)">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2">Model</th>
                    <th className="text-right py-2">Input $/1M tok</th>
                    <th className="text-right py-2">Output $/1M tok</th>
                    <th className="text-left py-2 pl-4">Use Case</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {[
                    ["Claude Sonnet 4.6", "$3.00", "$15.00", "Lesson gen, complex reasoning"],
                    ["Claude Haiku 4.5", "$0.80", "$4.00", "Quick responses, routing"],
                    ["GPT-4o-mini", "$0.15", "$0.60", "Simple tasks, embeddings"],
                    ["Whisper", "$0.006/sec", "–", "Audio transcription"],
                  ].map(([model, input, output, useCase], idx) => (
                    <tr key={idx} className="border-b border-slate-800">
                      <td className="py-1.5 font-medium">{model}</td>
                      <td className="py-1.5 text-right font-mono text-white">{input}</td>
                      <td className="py-1.5 text-right font-mono text-white">{output}</td>
                      <td className="py-1.5 pl-4 text-slate-400">{useCase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Month 6", mau: calc.mauM6, cpu: a.tokenCostPerUserM6, token: calc.tokenM6, agent: a.agentCostMo },
                { label: "Month 12", mau: calc.mauM12, cpu: a.tokenCostPerUserM12, token: calc.tokenM12, agent: a.agentCostMo },
                { label: "Month 18", mau: calc.mauM18, cpu: a.tokenCostPerUserM18, token: calc.tokenM18, agent: a.agentCostMo },
              ].map((p, i) => (
                <Card key={i} title={p.label}>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-slate-400">MAU</span><span className="font-mono">{num(p.mau)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Cost/User/Mo</span><span className="font-mono text-white">${p.cpu.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">User-Facing Tokens</span><span className="font-mono">{currency(p.token)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Internal Agents</span><span className="font-mono">{currency(p.agent)}</span></div>
                    <div className="border-t border-slate-700 my-1" />
                    <div className="flex justify-between font-bold"><span className="text-xs">Total Monthly</span><span className="font-mono text-emerald-400">{currency(p.token + p.agent)}</span></div>
                    {i === 2 && (
                      <>
                        <div className="border-t border-slate-700 my-1" />
                        <div className="flex justify-between"><span className="text-xs text-slate-400">W/ Price Decline</span><span className="font-mono text-emerald-400">{currency(calc.tokenAdj18 + p.agent)}</span></div>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <Card title="18-Month Cumulative Token Spend">
              <div className="flex items-center gap-8">
                <Metric label="Estimated Range" value="$72K – $95K" good />
                <Metric label="With Price Declines" value="$50K – $70K" good />
                <div className="text-xs text-slate-400 flex-1">LLM token prices are dropping ~80% YoY. Your per-user cost decreases from $0.64 to $0.46 even as usage increases. Price declines compound in your favor as you scale.</div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: RULE OF 10 */}
        {tab === 3 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">Ed Kang CFXO Framework — what investors expect in the AI agent economy. All metrics auto-calculate from your assumptions.</p>
            {[
              { rule: "10× Less Reliance on Manual Staff", target: `${a.founders} founders vs ${calc.tradHeadcount} traditional`, m6: `${Math.round((1 - a.founders / calc.tradHeadcount) * 100)}% reduction`, m12: `${Math.round((1 - a.founders / calc.tradHeadcount) * 100)}% reduction`, m18: "85% reduction", how: `${a.founders} founders + ${calc.totalAgents} AI agents replace ${calc.tradHeadcount}-person team`, status: "hit" },
              { rule: "10× More Spent on Tokens vs Staff", target: "Token spend > salary spend", m6: `${currency(calc.tokenM6 + a.agentCostMo)} tokens vs $0 salaries`, m12: `${currency(calc.tokenM12 + a.agentCostMo)} tokens`, m18: `${currency(calc.tokenM18 + a.agentCostMo)} tokens`, how: "Zero employee salaries; all operational cost goes to AI compute", status: "hit" },
              { rule: "10% More Automation Every Week", target: "10% productivity gain/week", m6: `${Math.round(calc.totalAgents * 0.75)} active agents`, m12: `${Math.round(calc.totalAgents * 0.875)} active agents`, m18: `${calc.totalAgents} active agents`, how: "New agents deployed monthly; each automates a previously manual function", status: "hit" },
              { rule: "10% Week-over-Week Traction", target: "10% WoW on key metric", m6: `${pct(a.wowM6)} WoW`, m12: `${pct(a.wowM12)} WoW`, m18: `${pct(a.wowM18)} WoW`, how: `Viral K-factor of ${a.viralK} drives organic; tracked via MAU growth`, status: a.wowM18 >= 0.10 ? "hit" : "on_track" },
              { rule: "10× Smaller Rounds, Less Dilution", target: "Raise only what you need", m6: `${currency(a.raise)} vs $1.5M trad.`, m12: "10× capital efficiency", m18: "Seed at higher valuation", how: `${currency(a.raise)} pre-seed does what $1.5M used to; agents eliminate salary burn`, status: "hit" },
              { rule: "1 Founder = 10 Agents", target: `Each runs ${a.agentsPerFounder} agents`, m6: "~7.5 agents/founder", m12: "~8.75 agents/founder", m18: `${a.agentsPerFounder} agents/founder`, how: "Progressive deployment: critical agents first, specialized by M12-M18", status: "hit" },
            ].map((r, i) => (
              <Card key={i}>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-white">{r.rule}</h4>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{r.how}</p>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div><span className="text-xs text-slate-500 block">Target</span><span className="text-white font-mono">{r.target}</span></div>
                      <div><span className="text-xs text-slate-500 block">M6</span><span className="font-mono">{r.m6}</span></div>
                      <div><span className="text-xs text-slate-500 block">M12</span><span className="font-mono">{r.m12}</span></div>
                      <div><span className="text-xs text-slate-500 block">M18</span><span className="font-mono">{r.m18}</span></div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 4: TEAM & UNIT ECONOMICS */}
        {tab === 4 && (
          <div className="space-y-6">
            <Card title="Founder Compensation (edit these)">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Total Founder Pay/mo (M1-6)" value={a.founderPayM1_6} onChange={u("founderPayM1_6")} prefix="$" />
                <Input label="Total Founder Pay/mo (M7-12)" value={a.founderPayM7_12} onChange={u("founderPayM7_12")} prefix="$" />
                <Input label="Total Founder Pay/mo (M13-18)" value={a.founderPayM13_18} onChange={u("founderPayM13_18")} prefix="$" />
              </div>
            </Card>

            <Card title="Unit Economics">
              <div className="grid grid-cols-4 gap-6">
                <Metric label="LTV" value={currency(calc.ltv)} sub={`$${calc.blendedArpuM12?.toFixed(2)} ARPU / ${pct(a.churn)} churn`} good />
                <Metric label="CAC" value={`$${calc.cac.toFixed(2)}`} sub="Blended acq cost" />
                <Metric label="LTV:CAC" value={`${calc.ltvCac.toFixed(0)}:1`} sub="Target: >3:1" good={calc.ltvCac > 3} />
                <Metric label="Gross Margin (M18)" value={pct(calc.grossMarginM18)} sub="After token costs" good={calc.grossMarginM18 > 0.7} />
              </div>
            </Card>

            <Card title="18-Month Quarterly P&L">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2">Quarter</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Token/Infra</th>
                      <th className="text-right py-2">Founders</th>
                      <th className="text-right py-2">Marketing</th>
                      <th className="text-right py-2">Total Cost</th>
                      <th className="text-right py-2">Net</th>
                      <th className="text-right py-2">Cash Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.cashFlow.map((q, i) => (
                      <tr key={i} className="border-b border-slate-800">
                        <td className="py-2 font-medium">M{i * 3 + 1}-{i * 3 + 3}</td>
                        <td className="py-2 text-right font-mono text-emerald-400">{currency(q.rev)}</td>
                        <td className="py-2 text-right font-mono">{currency(q.token)}</td>
                        <td className="py-2 text-right font-mono">{currency(q.founder)}</td>
                        <td className="py-2 text-right font-mono">{currency(q.mkt)}</td>
                        <td className="py-2 text-right font-mono text-red-400">{currency(q.totalCost)}</td>
                        <td className={`py-2 text-right font-mono font-bold ${q.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{currency(q.net)}</td>
                        <td className={`py-2 text-right font-mono ${q.cash >= 0 ? "text-white" : "text-red-400"}`}>{currency(q.cash)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 5: GTM STRATEGY */}
        {tab === 5 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-800 to-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Go-To-Market Strategy</h2>
              <p className="text-sm text-slate-400">Each phase maps directly to an inflection point. The GTM motion shifts as we prove out each stage.</p>
            </div>

            {/* Phase 1 */}
            <Card title={`Phase 1: Launch & First Revenue (M0–M6) → ${currency(calc.arrM6)} ARR`}>
              <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-white uppercase tracking-wide">Inflection Point Target</span>
                    <p className="text-sm text-white font-medium mt-0.5">First {num(calc.paidM6)} paid subscribers — prove willingness-to-pay</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">MRR</span>
                    <p className="text-emerald-400 font-mono font-bold">{currency(calc.mrrM6)}</p>
                  </div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">GTM Motion</th><th className="text-left py-2">Channel / Tactic</th><th className="text-left py-2">Agent Owner</th><th className="text-left py-2">Success Metric</th><th className="text-right py-2">Budget</th>
                </tr></thead>
                <tbody>
                  {[
                    ["Community-Led Launch", "Discord + Reddit + music forums", "Community Agent", "2,000 waitlist → 500 beta users", "$500"],
                    ["Content SEO", "'How to play [X] on [instrument]' long-tail pages", "SEO Agent", "5,000 organic visits/mo by M4", "$300"],
                    ["Product Hunt + HN Launch", "Coordinated launch day (week 1)", "CEO + Marketing Agents", "Top 5 Product of the Day", "$200"],
                    ["Short-Form Video", "TikTok/Reels: 'I learned this in 60 sec'", "Social Media + Video Agent", "3 videos/week, 50K total views", "$400"],
                    ["Creator Seeding", "Send free Pro to 50 music micro-influencers", "Influencer Agent", "10 organic posts, 200 signups", "$500"],
                    ["Founder-Led Socials", "Twitter/LinkedIn: build-in-public + neuro-science insights", "CEO", "1,000 followers, 5 press inbounds", "$0"],
                    ["Referral V1", "'Teach a Friend' — both get 1 free month", "Growth Agent", "K-factor ≥ 1.3", "$300"],
                  ].map(([motion, channel, agent, metric, budget], i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 font-medium">{motion}</td>
                      <td className="py-2 text-slate-400">{channel}</td>
                      <td className="py-2 text-white">{agent}</td>
                      <td className="py-2 text-slate-300">{metric}</td>
                      <td className="py-2 text-right font-mono text-white">{budget}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>Phase 1 Budget: ~{currency(a.mktBudgetM1_6 * 6)}</span>
                <span>|</span>
                <span>CAC Target: &lt;$3.00</span>
                <span>|</span>
                <span>Primary Channel: Organic + Community</span>
              </div>
            </Card>

            {/* Phase 2 */}
            <Card title={`Phase 2: Scale & Validate Economics (M6–M12) → ${currency(calc.arrM12)} ARR`}>
              <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-white uppercase tracking-wide">Inflection Point Target</span>
                    <p className="text-sm text-white font-medium mt-0.5">{num(calc.paidM12)} paid users, unit economics validated, seed-raise ready</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">MRR</span>
                    <p className="text-emerald-400 font-mono font-bold">{currency(calc.mrrM12)}</p>
                  </div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">GTM Motion</th><th className="text-left py-2">Channel / Tactic</th><th className="text-left py-2">Agent Owner</th><th className="text-left py-2">Success Metric</th><th className="text-right py-2">Budget</th>
                </tr></thead>
                <tbody>
                  {[
                    ["Paid Acquisition (Unlock)", "Meta + Google — lookalikes from M1-6 converters", "Ad Ops Agent", "CAC < $6, ROAS > 3×", "$1,500/mo"],
                    ["SEO Scaling", "500+ indexed lesson pages, programmatic content", "SEO Agent + Curriculum Agent", "25K organic visits/mo", "$500/mo"],
                    ["Email Lifecycle Engine", "Onboard → Habit → Upsell → Win-back drips", "Email Agent", "40% open rate, 8% upgrade rate", "$200/mo"],
                    ["Neuro-Science PR Push", "'Music literally rewires your brain' data stories", "PR Agent + Neuro Agent", "3-5 press placements (TechCrunch, Wired)", "$500"],
                    ["Music Teacher Partnerships", "White-label tools for indie teachers", "Partnerships Agent", "20 teachers onboarded → 500 students", "$300/mo"],
                    ["App Store Launch", "iOS + Android with ASO optimization", "SEO Agent + Frontend Builder", "4.5+ star rating, 5K downloads/mo", "$400/mo"],
                    ["Studio Tier Launch", `Advanced features at $${a.studioMonthly}/mo`, "CPO + Product Agents", "15% of paid users upgrade to Studio", "$0"],
                  ].map(([motion, channel, agent, metric, budget], i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 font-medium">{motion}</td>
                      <td className="py-2 text-slate-400">{channel}</td>
                      <td className="py-2 text-white">{agent}</td>
                      <td className="py-2 text-slate-300">{metric}</td>
                      <td className="py-2 text-right font-mono text-slate-300">{budget}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>Phase 2 Budget: ~{currency(a.mktBudgetM7_12 * 6)}</span>
                <span>|</span>
                <span>CAC Target: &lt;$6.00</span>
                <span>|</span>
                <span>Primary Channel: Paid + SEO + Partnerships</span>
              </div>
            </Card>

            {/* Phase 3 */}
            <Card title={`Phase 3: Growth Mode & Break-Even (M12–M18) → ${currency(calc.arrM18)} ARR`}>
              <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-white uppercase tracking-wide">Inflection Point Target</span>
                    <p className="text-sm text-white font-medium mt-0.5">{num(calc.paidM18)} paid users, approaching break-even, strong seed/A- position</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">MRR</span>
                    <p className="text-emerald-400 font-mono font-bold">{currency(calc.mrrM18)}</p>
                  </div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">GTM Motion</th><th className="text-left py-2">Channel / Tactic</th><th className="text-left py-2">Agent Owner</th><th className="text-left py-2">Success Metric</th><th className="text-right py-2">Budget</th>
                </tr></thead>
                <tbody>
                  {[
                    ["B2B2C: School Districts", "Pilot programs with 5-10 K-12 music departments", "Partnerships + CEO", "500 student seats, $50K pipeline", "$1,000/mo"],
                    ["Health & Wellness Channel", "Cognitive health clinics prescribing music practice", "Partnerships + Neuro Agent", "3 clinic partnerships, 200 users", "$500/mo"],
                    ["Scaled Paid Acquisition", "Expand to YouTube, Spotify ads, podcast sponsorships", "Ad Ops + Video Agent", "CAC < $8 across channels", "$3,000/mo"],
                    ["Entertainment Partnerships", "YouTube creator embedded lessons, retailer bundles", "Partnerships Agent", "2 signed deals, 1,000 referred users", "$500/mo"],
                    ["International Expansion (V1)", "Localize for Spanish + Portuguese markets", "Localization + SEO Agent", "10% of new signups from LATAM", "$500/mo"],
                    ["Referral V2 + Viral Loops", "Social proof: brain-scan shareable cards", "Growth + Neuro Agent", "K-factor ≥ 1.5", "$300/mo"],
                    ["Seed Fundraise (from strength)", "Investor outreach with proven metrics", "CEO + IR Agent", "$1-2M seed at $8-12M valuation", "$0"],
                  ].map(([motion, channel, agent, metric, budget], i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 font-medium">{motion}</td>
                      <td className="py-2 text-slate-400">{channel}</td>
                      <td className="py-2 text-white">{agent}</td>
                      <td className="py-2 text-slate-300">{metric}</td>
                      <td className="py-2 text-right font-mono text-slate-300">{budget}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>Phase 3 Budget: ~{currency(a.mktBudgetM13_18 * 6)}</span>
                <span>|</span>
                <span>CAC Target: &lt;$8.00</span>
                <span>|</span>
                <span>Primary Channel: B2B2C + Scaled Paid + Partnerships</span>
              </div>
            </Card>

            {/* Channel Mix Evolution */}
            <Card title="Channel Mix Evolution">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { phase: "M0–M6", mix: [["Organic/Community", 45], ["Content/SEO", 25], ["Creator/Referral", 20], ["Paid", 10]] as [string, number][], pi: 0 },
                  { phase: "M6–M12", mix: [["Paid Acquisition", 30], ["SEO/Content", 25], ["Partnerships", 20], ["Organic/Referral", 25]] as [string, number][], pi: 1 },
                  { phase: "M12–M18", mix: [["B2B2C/Partnerships", 30], ["Paid Acquisition", 30], ["SEO/Content", 20], ["Organic/Referral", 20]] as [string, number][], pi: 2 },
                ].map((p) => (
                  <div key={p.phase} className="space-y-2">
                    <p className="text-sm font-medium text-center">{p.phase}</p>
                    {p.mix.map(([ch, pctVal], ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <div className="w-24 text-xs text-slate-400 text-right">{ch}</div>
                        <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                          <div className={`h-full rounded-full ${p.pi === 0 ? "bg-blue-500" : p.pi === 1 ? "bg-blue-400" : "bg-blue-300"}`} style={{ width: `${pctVal}%` }} />
                        </div>
                        <span className="text-xs font-mono w-8">{pctVal}%</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 text-center mt-3">Strategy shifts from community-led organic (cheapest) → proven paid channels → B2B2C revenue diversification</p>
            </Card>

            {/* GTM Agents by Phase */}
            <Card title="GTM Agents by Phase">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-white font-medium text-xs uppercase mb-2">Phase 1 (M0-M6): 6 Agents Active</p>
                  {["Social Media Agent", "SEO Agent", "Community Agent", "Video Agent", "Email Agent", "Influencer Agent"].map((ag, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 border-b border-slate-800">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-slate-300">{ag}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-white font-medium text-xs uppercase mb-2">Phase 2 (M6-M12): +3 Agents</p>
                  {["Ad Ops Agent", "PR Agent", "Partnerships Agent", "App Store Agent", "Analytics Agent (scaled)", "Curriculum Agent (SEO)"].map((ag, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 border-b border-slate-800">
                      <span className={`w-2 h-2 rounded-full ${i < 3 ? "bg-blue-400" : "bg-blue-500/50"}`} />
                      <span className="text-slate-300">{ag} {i >= 3 && <span className="text-xs text-slate-500">(expanded)</span>}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-white font-medium text-xs uppercase mb-2">Phase 3 (M12-M18): +2 Agents</p>
                  {["Localization Agent", "B2B Sales Agent", "IR Agent (fundraise)", "All Phase 1+2 agents", "Neuro Agent (partnerships)", "Growth Agent (viral v2)"].map((ag, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 border-b border-slate-800">
                      <span className={`w-2 h-2 rounded-full ${i < 3 ? "bg-blue-300" : "bg-blue-400/50"}`} />
                      <span className="text-slate-300">{ag} {i >= 3 && <span className="text-xs text-slate-500">(continued)</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 6: MARKETING & GROWTH */}
        {tab === 6 && (
          <div className="space-y-6">
            <Card title="Marketing Budget (edit these)">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Monthly Mkt Budget (M1-6)" value={a.mktBudgetM1_6} onChange={u("mktBudgetM1_6")} prefix="$" />
                <Input label="Monthly Mkt Budget (M7-12)" value={a.mktBudgetM7_12} onChange={u("mktBudgetM7_12")} prefix="$" />
                <Input label="Monthly Mkt Budget (M13-18)" value={a.mktBudgetM13_18} onChange={u("mktBudgetM13_18")} prefix="$" />
              </div>
              <div className="mt-3 text-xs text-slate-400">18-month total marketing spend: {currency((a.mktBudgetM1_6 * 6) + (a.mktBudgetM7_12 * 6) + (a.mktBudgetM13_18 * 6))}</div>
            </Card>

            <Card title="Launch & Growth Initiatives">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2">Initiative</th>
                    <th className="text-left py-2">Assigned Agent</th>
                    <th className="text-center py-2">Phase</th>
                    <th className="text-center py-2">Status</th>
                    <th className="text-left py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {mktInitiatives.map((init, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 font-medium">{init.name}</td>
                      <td className="py-2 text-slate-400">{init.agent}</td>
                      <td className="py-2 text-center font-mono text-white">{init.phase}</td>
                      <td className="py-2 text-center"><StatusBadge status={init.status === "planned" ? "on_track" : init.status} /></td>
                      <td className="py-2 text-slate-400">{init.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Growth Flywheel">
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {[
                  { step: "1", label: "User describes a musical idea", icon: "\uD83C\uDFB5" },
                  { step: "2", label: "AI teaches them to play it", icon: "\uD83E\uDD16" },
                  { step: "3", label: "Brain metrics show progress", icon: "\uD83E\uDDE0" },
                  { step: "4", label: "User shares on social media", icon: "\uD83D\uDCF1" },
                  { step: "5", label: "Friends see it → sign up", icon: "\uD83D\uDD04" },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-xs text-slate-400">Step {s.step}</div>
                    <div className="text-xs font-medium mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center text-xs text-slate-400">Viral K-factor: {a.viralK} — each user brings in {a.viralK} new users on average</div>
            </Card>
          </div>
        )}

        {/* TAB 7: PARTNERSHIPS & PR */}
        {tab === 7 && (
          <div className="space-y-6">
            {["Health & Wellness", "Entertainment", "Music Industry", "Education", "PR / Media"].map((cat) => (
              <Card key={cat} title={cat}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2">Partner Type</th>
                      <th className="text-left py-2">Value Prop</th>
                      <th className="text-center py-2">Timeline</th>
                      <th className="text-center py-2">Status</th>
                      <th className="text-left py-2">Revenue Model</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerships.filter((p) => p.category === cat).map((p, i) => (
                      <tr key={i} className="border-b border-slate-800">
                        <td className="py-2 font-medium">{p.partner}</td>
                        <td className="py-2 text-slate-400">{p.value}</td>
                        <td className="py-2 text-center font-mono text-white">{p.timeline}</td>
                        <td className="py-2 text-center"><StatusBadge status={p.status === "research" ? "on_track" : p.status === "aspirational" ? "at_risk" : p.status === "planned" ? "on_track" : "hit"} /></td>
                        <td className="py-2 text-slate-400">{p.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 8: ASK SUMMARY */}
        {tab === 8 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900/30 to-slate-800 rounded-xl border border-blue-500/30 p-8 text-center">
              <p className="text-sm text-white uppercase tracking-wide mb-2">The Ask</p>
              <p className="text-xl font-light text-white italic">
                &quot;We are raising <span className="font-bold text-emerald-400">{currency(a.raise)}</span> to secure our first <span className="font-bold text-emerald-400">{num(calc.paidM6)}+</span> paid subscribers and validate unit economics within 6 months.&quot;
              </p>
            </div>

            <Card title="Use of Funds">
              <div className="space-y-3">
                {[
                  { cat: "AI/Token Credits & Infra", pct: 37, amt: a.raise * 0.37, note: "LLM APIs, hosting, audio processing" },
                  { cat: "Founder Stipends", pct: 40, amt: a.raise * 0.40, note: `${a.founders} founders, minimal living stipends` },
                  { cat: "Marketing & Growth", pct: 13, amt: a.raise * 0.13, note: "Paid acquisition, content, community" },
                  { cat: "Legal, Tools & Ops", pct: 7, amt: a.raise * 0.07, note: "Entity setup, tools, compliance" },
                  { cat: "Buffer", pct: 3, amt: a.raise * 0.03, note: "Contingency" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-48 text-sm font-medium">{f.cat}</div>
                    <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full flex items-center pl-2"
                        style={{ width: `${f.pct}%` }}
                      >
                        <span className="text-xs font-mono text-white">{currency(f.amt)}</span>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-mono text-white">{f.pct}%</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-4 gap-4">
              <Card><Metric label="6-Mo ARR" value={currency(calc.arrM6)} sub={`${num(calc.paidM6)} paid users`} /></Card>
              <Card><Metric label="12-Mo ARR" value={currency(calc.arrM12)} sub={`${num(calc.paidM12)} paid users`} good /></Card>
              <Card><Metric label="18-Mo ARR" value={currency(calc.arrM18)} sub={`${num(calc.paidM18)} paid users`} good /></Card>
              <Card><Metric label="LTV:CAC" value={`${calc.ltvCac.toFixed(0)}:1`} sub="Exceptional efficiency" good /></Card>
            </div>

            <Card title="Investor Narrative">
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                <p>Yousic Play sits at the intersection of three massive, converging markets: <span className="text-white font-medium">online music education ($4.6B → $9.4B by 2031)</span>, <span className="text-white font-medium">AI consumer apps ($10B+ in 2026)</span>, and <span className="text-white font-medium">neuroscience-backed wellness</span>.</p>
                <p>With {a.founders} founders running {calc.totalAgents} AI agents, we deliver the output of a {calc.tradHeadcount}-person team at {pct(totalAgentCost * 12 / calc.tradCost)} of the cost. Our {currency(a.raise)} pre-seed buys 18 months of runway — 6 months to hit our first inflection point ({num(calc.paidM6)}+ paid users, validated unit economics) and 12 months to raise from a position of strength.</p>
                <p className="font-medium text-white">Every dollar goes to tokens, not salaries. That&apos;s the new math of AI-first startups.</p>
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-6 py-3 text-center text-xs text-slate-600">
        Yousic Play Financial Model — All blue values are editable assumptions — Calculations update in real time
      </div>
    </div>
  );
}
