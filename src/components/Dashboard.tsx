"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_ASSUMPTIONS, flattenAssumptions, unflattenAssumptions, type Assumptions } from "@/lib/defaults";
import { computeAll } from "@/lib/calculations";
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
  const [a, setA] = useState<Assumptions>(JSON.parse(JSON.stringify(DEFAULT_ASSUMPTIONS)));
  const [loaded, setLoaded] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load assumptions from Supabase on mount
  useEffect(() => {
    async function load() {
      if (!supabase) { setLoaded(true); return; }
      try {
        const { data, error } = await supabase.from("assumptions").select("key, value");
        if (!error && data && data.length > 0) {
          const flat: Record<string, number> = {};
          data.forEach((row: { key: string; value: number }) => {
            flat[row.key] = Number(row.value);
          });
          setA(unflattenAssumptions(flat, DEFAULT_ASSUMPTIONS));
        }
      } catch {
        // Use defaults
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
            // Re-flatten current state, apply the change, unflatten back
            setA((prev) => {
              const flat = flattenAssumptions(prev);
              flat[row.key] = Number(row.value);
              return unflattenAssumptions(flat, DEFAULT_ASSUMPTIONS);
            });
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
        const { error } = await supabase
          .from("assumptions")
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) console.error("Save error:", error.message);
      } catch (e) {
        console.error("Save exception:", e);
      }
    }, 500);
  }, []);

  // Update a top-level scalar assumption
  const u = useCallback(
    (key: string) => (val: number) => {
      setA((prev) => ({ ...prev, [key]: val }));
      persistKey(key, val);
    },
    [persistKey]
  );

  // Update a phase-level assumption
  const uPhase = useCallback(
    (phaseIdx: number, field: string) => (val: number) => {
      setA((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as Assumptions;
        if (field === "monthlyMktBudget") next.phases[phaseIdx].monthlyMktBudget = val;
        else if (field === "founderPayMonthly") next.phases[phaseIdx].founderPayMonthly = val;
        else if (field === "infraMonthly") next.phases[phaseIdx].infraMonthly = val;
        return next;
      });
      const flatKey = field === "monthlyMktBudget" ? `phase${phaseIdx}_mktBudget`
        : field === "founderPayMonthly" ? `phase${phaseIdx}_founderPay`
        : `phase${phaseIdx}_infra`;
      persistKey(flatKey, val);
    },
    [persistKey]
  );

  // Update a channel assumption within a phase
  const uChannel = useCallback(
    (phaseIdx: number, channelId: string, field: "budgetPct" | "cpa" | "signupToActiveRate") => (val: number) => {
      setA((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as Assumptions;
        const ch = next.phases[phaseIdx].channels.find(c => c.channelId === channelId);
        if (ch) ch[field] = val;
        return next;
      });
      const flatField = field === "budgetPct" ? "pct" : field === "cpa" ? "cpa" : "conv";
      persistKey(`phase${phaseIdx}_ch_${channelId}_${flatField}`, val);
    },
    [persistKey]
  );

  // Update a partnership user estimate
  const uPartner = useCallback(
    (partnerId: string, milestone: "usersM6" | "usersM12" | "usersM18") => (val: number) => {
      setA((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as Assumptions;
        const p = next.partnerships.find(pp => pp.id === partnerId);
        if (p) p[milestone] = val;
        return next;
      });
      const flatKey = `partner_${partnerId}_${milestone === "usersM6" ? "m6" : milestone === "usersM12" ? "m12" : "m18"}`;
      persistKey(flatKey, val);
    },
    [persistKey]
  );

  const calc = useMemo(() => computeAll(a), [a]);

  const totalAgentCost = AGENT_TEAMS.reduce(
    (s, t) => s + t.agents.reduce((s2, ag) => s2 + ag.cost, 0),
    0
  );

  // Marketing initiatives (local state)
  const mktInitiatives = [
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
  ];

  const PHASE_LABELS = ["M0–M6", "M7–M12", "M13–M18"];

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
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Guest</p>
                  <p className="text-lg font-bold font-mono text-white mt-1">No account</p>
                  <p className="text-xs text-slate-400 mt-2">Zero-friction entry</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Free</p>
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
              <div className="grid grid-cols-4 gap-3 text-xs text-slate-400 bg-slate-800/50 rounded p-3">
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
                <Input label="# Founders" value={a.founders} onChange={u("founders")} />
              </div>
            </Card>

            {/* Derived User Growth — now computed from channels, not manual */}
            <Card title="Derived User Growth (from marketing channels)">
              <p className="text-xs text-slate-400 mb-3">These numbers are calculated from your channel budgets, CPAs, and viral amplification. Edit them on the Marketing &amp; Growth tab.</p>
              <div className="grid grid-cols-3 gap-4">
                {calc.phases.map((p, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{p.label}</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Direct Signups</span><span className="font-mono">{num(p.directSignups)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Partnership Users</span><span className="font-mono">{num(p.partnershipUsers)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Viral Users (K={a.viralK})</span><span className="font-mono">{num(p.viralUsers)}</span></div>
                      <div className="border-t border-slate-700 my-1" />
                      <div className="flex justify-between font-medium"><span>Total Signups</span><span className="font-mono">{num(p.totalSignups)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Active Users (MAU)</span><span className="font-mono">{num(p.totalActiveUsers)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Paid Subscribers</span><span className="font-mono text-emerald-400">{num(p.paidUsers)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-slate-400 bg-slate-800/50 rounded p-3">
                <div>Cumulative signups M6: <span className="text-white font-mono">{num(calc.totalSignupsM6)}</span></div>
                <div>Cumulative signups M12: <span className="text-white font-mono">{num(calc.totalSignupsM12)}</span></div>
                <div>Cumulative signups M18: <span className="text-white font-mono">{num(calc.totalSignupsM18)}</span></div>
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
                        <td className="py-1.5 pl-3 text-xs text-slate-400">{source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "6-Month Inflection", sub: "Trial-to-paid validated", bench: "AI apps avg 2-5% conversion; Duolingo at 7%", mau: calc.mauM6, paid: calc.paidM6, mrr: calc.mrrM6, arr: calc.arrM6, arpu: calc.blendedArpuM6, signups: calc.totalSignupsM6 },
                { label: "12-Month Inflection", sub: "On pace vs median AI consumer ($4.2M ARR)", bench: "Median AI consumer app hits $4.2M ARR by M12 (a16z)", mau: calc.mauM12, paid: calc.paidM12, mrr: calc.mrrM12, arr: calc.arrM12, arpu: calc.blendedArpuM12, signups: calc.totalSignupsM12 },
                { label: "18-Month Inflection", sub: "Retention proven, seed-ready", bench: "AI paid retention matches pre-AI SaaS M1-M6 (a16z)", mau: calc.mauM18, paid: calc.paidM18, mrr: calc.mrrM18, arr: calc.arrM18, arpu: calc.blendedArpuM18, signups: calc.totalSignupsM18 },
              ].map((ip, i) => (
                <Card key={i} title={ip.label}>
                  <p className="text-xs text-slate-400 mb-1">{ip.sub}</p>
                  <p className="text-xs text-white/70 mb-3 italic">{ip.bench}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Total Signups</span><span className="text-sm font-mono">{num(ip.signups)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">MAU</span><span className="text-sm font-mono">{num(ip.mau)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Paid Subscribers</span><span className="text-sm font-mono text-emerald-400">{num(ip.paid)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Blended ARPU</span><span className="text-sm font-mono">${ip.arpu?.toFixed(2)}/mo</span></div>
                    <div className="border-t border-slate-700 my-2" />
                    <div className="flex justify-between"><span className="text-xs text-slate-400">MRR</span><span className="text-sm font-mono text-emerald-400">{currency(ip.mrr)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">ARR (run-rate)</span><span className="text-sm font-mono font-bold text-emerald-400">{currency(ip.arr)}</span></div>
                  </div>
                </Card>
              ))}
            </div>

            <Card title="How Our Targets Compare">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-1">vs. Median AI Consumer App (a16z)</p>
                  <p className="text-slate-300">Median hits $4.2M ARR by M12. Our M12 target of {currency(calc.arrM12)} is conservative — we&apos;re a niche vertical, not a horizontal AI tool. Reaching even 10% of median validates the model.</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">vs. Duolingo&apos;s AI Acceleration</p>
                  <p className="text-slate-300">Duolingo&apos;s AI features drove 51% DAU growth and 7% free-to-paid conversion. Our {pct(a.convRate)} conversion target is conservative vs. Duolingo but realistic for a new brand without their distribution.</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">vs. AI App Market Growth</p>
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
                { label: "Month 6", mau: calc.mauM6, cpu: a.tokenCostPerUserM6, token: calc.tokenM6 },
                { label: "Month 12", mau: calc.mauM12, cpu: a.tokenCostPerUserM12, token: calc.tokenM12 },
                { label: "Month 18", mau: calc.mauM18, cpu: a.tokenCostPerUserM18, token: calc.tokenM18 },
              ].map((p, i) => (
                <Card key={i} title={p.label}>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-slate-400">MAU</span><span className="font-mono">{num(p.mau)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Cost/User/Mo</span><span className="font-mono text-white">${p.cpu.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">User-Facing Tokens</span><span className="font-mono">{currency(p.token)}</span></div>
                    <div className="border-t border-slate-700 my-1" />
                    <div className="flex justify-between font-bold"><span className="text-xs">Monthly Total</span><span className="font-mono text-emerald-400">{currency(p.token)}</span></div>
                    {i === 2 && (
                      <>
                        <div className="border-t border-slate-700 my-1" />
                        <div className="flex justify-between"><span className="text-xs text-slate-400">W/ Price Decline</span><span className="font-mono text-emerald-400">{currency(calc.tokenAdj18)}</span></div>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RULE OF 10 */}
        {tab === 3 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">Ed Kang CFXO Framework — what investors expect in the AI agent economy. All metrics auto-calculate from your assumptions.</p>
            {[
              { rule: "10× Less Reliance on Manual Staff", target: `${a.founders} founders vs ${calc.tradHeadcount} traditional`, m6: `${Math.round((1 - a.founders / calc.tradHeadcount) * 100)}% reduction`, m12: `${Math.round((1 - a.founders / calc.tradHeadcount) * 100)}% reduction`, m18: "85% reduction", how: `${a.founders} founders + ${calc.totalAgents} AI agents replace ${calc.tradHeadcount}-person team`, status: "hit" },
              { rule: "10× More Spent on Tokens vs Staff", target: "Token spend > salary spend", m6: `${currency(calc.tokenM6)} tokens vs $0 salaries`, m12: `${currency(calc.tokenM12)} tokens`, m18: `${currency(calc.tokenM18)} tokens`, how: "Zero employee salaries; all operational cost goes to AI compute", status: "hit" },
              { rule: "10% More Automation Every Week", target: "10% productivity gain/week", m6: `${Math.round(calc.totalAgents * 0.75)} active agents`, m12: `${Math.round(calc.totalAgents * 0.875)} active agents`, m18: `${calc.totalAgents} active agents`, how: "New agents deployed monthly; each automates a previously manual function", status: "hit" },
              { rule: "10% Week-over-Week Traction", target: "10% WoW on key metric", m6: "5% WoW", m12: "3% WoW", m18: "2% WoW", how: `Viral K-factor of ${a.viralK} drives organic; tracked via MAU growth`, status: "on_track" },
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
                      <div><span className="text-xs text-slate-400 block">Target</span><span className="text-white font-mono">{r.target}</span></div>
                      <div><span className="text-xs text-slate-400 block">M6</span><span className="font-mono">{r.m6}</span></div>
                      <div><span className="text-xs text-slate-400 block">M12</span><span className="font-mono">{r.m12}</span></div>
                      <div><span className="text-xs text-slate-400 block">M18</span><span className="font-mono">{r.m18}</span></div>
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
                <Input label="Total Founder Pay/mo (M1-6)" value={a.phases[0].founderPayMonthly} onChange={uPhase(0, "founderPayMonthly")} prefix="$" />
                <Input label="Total Founder Pay/mo (M7-12)" value={a.phases[1].founderPayMonthly} onChange={uPhase(1, "founderPayMonthly")} prefix="$" />
                <Input label="Total Founder Pay/mo (M13-18)" value={a.phases[2].founderPayMonthly} onChange={uPhase(2, "founderPayMonthly")} prefix="$" />
              </div>
            </Card>

            <Card title="Unit Economics (derived)">
              <div className="grid grid-cols-4 gap-6">
                <Metric label="LTV" value={currency(calc.ltv)} sub={`$${calc.blendedArpuM12?.toFixed(2)} ARPU / ${pct(a.churn)} churn`} good />
                <Metric label="CAC (derived)" value={`$${calc.cac.toFixed(2)}`} sub="Total mkt spend / total signups" />
                <Metric label="LTV:CAC" value={`${calc.ltvCac.toFixed(0)}:1`} sub="Target: >3:1" good={calc.ltvCac > 3} />
                <Metric label="Gross Margin (M18)" value={pct(calc.grossMarginM18)} sub="After token costs" good={calc.grossMarginM18 > 0.7} />
              </div>
            </Card>

            <Card title="18-Month Quarterly P&L (derived from channels)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2">Quarter</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Tokens</th>
                      <th className="text-right py-2">Founders</th>
                      <th className="text-right py-2">Marketing</th>
                      <th className="text-right py-2">Infra</th>
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
                        <td className="py-2 text-right font-mono">{currency(q.infra)}</td>
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
              <p className="text-sm text-slate-400">Each phase maps directly to an inflection point. User numbers are derived from your channel config on the Marketing tab.</p>
            </div>

            {calc.phases.map((phase, pi) => (
              <Card key={pi} title={`Phase ${pi + 1}: ${PHASE_LABELS[pi]} → ${currency(phase.arr)} ARR`}>
                <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs text-white uppercase tracking-wide">Derived from Channels</span>
                      <p className="text-sm text-white font-medium mt-0.5">{num(phase.paidUsers)} paid subscribers from {num(phase.totalSignups)} signups</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">MRR</span>
                      <p className="text-emerald-400 font-mono font-bold">{currency(phase.mrr)}</p>
                    </div>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2">Channel</th>
                    <th className="text-right py-2">Budget %</th>
                    <th className="text-right py-2">Spend</th>
                    <th className="text-right py-2">CPA</th>
                    <th className="text-right py-2">Signups</th>
                    <th className="text-right py-2">Active</th>
                  </tr></thead>
                  <tbody>
                    {phase.channels.map((ch, ci) => (
                      <tr key={ci} className="border-b border-slate-800">
                        <td className="py-1.5 font-medium">{ch.label}</td>
                        <td className="py-1.5 text-right font-mono">{(ch.budgetPct * 100).toFixed(0)}%</td>
                        <td className="py-1.5 text-right font-mono">{currency(ch.spend)}</td>
                        <td className="py-1.5 text-right font-mono">${ch.cpa.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono">{num(ch.signups)}</td>
                        <td className="py-1.5 text-right font-mono text-emerald-400">{num(ch.activeUsers)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-slate-800 text-slate-400">
                      <td className="py-1.5">+ Partnership Users</td>
                      <td colSpan={4}></td>
                      <td className="py-1.5 text-right font-mono">{num(phase.partnershipUsers)}</td>
                    </tr>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <td className="py-1.5">+ Viral (K={a.viralK})</td>
                      <td colSpan={4}></td>
                      <td className="py-1.5 text-right font-mono">{num(phase.viralUsers)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right font-mono">{currency(phase.mktBudget)}</td>
                      <td colSpan={2}></td>
                      <td className="py-2 text-right font-mono">{num(phase.totalSignups)}</td>
                      <td className="py-2 text-right font-mono text-emerald-400">{num(phase.totalActiveUsers)}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            ))}

            {/* Channel Mix Visual */}
            <Card title="Channel Mix Evolution">
              <div className="grid grid-cols-3 gap-4">
                {calc.phases.map((phase, pi) => (
                  <div key={pi} className="space-y-2">
                    <p className="text-sm font-medium text-center">{PHASE_LABELS[pi]}</p>
                    {phase.channels.map((ch, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <div className="w-20 text-xs text-slate-400 text-right truncate">{ch.label.split(" ")[0]}</div>
                        <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                          <div className={`h-full rounded-full ${pi === 0 ? "bg-blue-500" : pi === 1 ? "bg-blue-400" : "bg-blue-300"}`} style={{ width: `${ch.budgetPct * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono w-8">{(ch.budgetPct * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 6: MARKETING & GROWTH */}
        {tab === 6 && (
          <div className="space-y-6">
            <Card title="Marketing Budget by Phase (edit these)">
              <div className="grid grid-cols-3 gap-4">
                {a.phases.map((phase, pi) => (
                  <Input key={pi} label={`Monthly Budget ${PHASE_LABELS[pi]}`} value={phase.monthlyMktBudget} onChange={uPhase(pi, "monthlyMktBudget")} prefix="$" />
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                18-month total: {currency(a.phases.reduce((s, p) => s + p.monthlyMktBudget * p.months, 0))}
                {" | "}Derived CAC: ${calc.cac.toFixed(2)}
              </div>
            </Card>

            {/* Channel Config per Phase */}
            {a.phases.map((phase, pi) => (
              <Card key={pi} title={`Channel Config: ${PHASE_LABELS[pi]} — ${currency(phase.monthlyMktBudget * phase.months)} total`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2">Channel</th>
                        <th className="text-right py-2 w-24">Budget %</th>
                        <th className="text-right py-2 w-24">CPA ($)</th>
                        <th className="text-right py-2 w-24">Conv %</th>
                        <th className="text-right py-2">6-Mo Spend</th>
                        <th className="text-right py-2">Signups</th>
                        <th className="text-right py-2">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {phase.channels.map((ch, ci) => {
                        const phaseResult = calc.phases[pi].channels[ci];
                        return (
                          <tr key={ci} className="border-b border-slate-800">
                            <td className="py-1.5 font-medium">{ch.label}</td>
                            <td className="py-1.5">
                              <Input small value={(ch.budgetPct * 100).toFixed(0)} onChange={(v) => uChannel(pi, ch.channelId, "budgetPct")(v / 100)} suffix="%" />
                            </td>
                            <td className="py-1.5">
                              <Input small value={ch.cpa} onChange={uChannel(pi, ch.channelId, "cpa")} prefix="$" />
                            </td>
                            <td className="py-1.5">
                              <Input small value={(ch.signupToActiveRate * 100).toFixed(0)} onChange={(v) => uChannel(pi, ch.channelId, "signupToActiveRate")(v / 100)} suffix="%" />
                            </td>
                            <td className="py-1.5 text-right font-mono text-slate-300">{currency(phaseResult?.spend || 0)}</td>
                            <td className="py-1.5 text-right font-mono">{num(phaseResult?.signups || 0)}</td>
                            <td className="py-1.5 text-right font-mono text-emerald-400">{num(phaseResult?.activeUsers || 0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-slate-400">
                  <span>Phase total signups: {num(calc.phases[pi].directSignups)}</span>
                  <span>+ Viral: {num(calc.phases[pi].viralUsers)}</span>
                  <span>+ Partners: {num(calc.phases[pi].partnershipUsers)}</span>
                  <span>= <span className="text-white">{num(calc.phases[pi].totalSignups)} total</span></span>
                </div>
              </Card>
            ))}

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
            <Card title="Partnership User Projections (edit these)">
              <p className="text-xs text-slate-400 mb-3">Estimated users each partnership will drive. These flow into the growth model and affect total user projections across all tabs.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2">Partner</th>
                      <th className="text-left py-2">Category</th>
                      <th className="text-center py-2">Status</th>
                      <th className="text-right py-2 w-28">Users M6</th>
                      <th className="text-right py-2 w-28">Users M12</th>
                      <th className="text-right py-2 w-28">Users M18</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.partnerships.map((p) => (
                      <tr key={p.id} className="border-b border-slate-800">
                        <td className="py-1.5 font-medium">{p.partner}</td>
                        <td className="py-1.5 text-slate-400">{p.category}</td>
                        <td className="py-1.5 text-center"><StatusBadge status={p.status} /></td>
                        <td className="py-1.5"><Input small value={p.usersM6} onChange={uPartner(p.id, "usersM6")} /></td>
                        <td className="py-1.5"><Input small value={p.usersM12} onChange={uPartner(p.id, "usersM12")} /></td>
                        <td className="py-1.5"><Input small value={p.usersM18} onChange={uPartner(p.id, "usersM18")} /></td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-2" colSpan={3}>Total Partnership Users</td>
                      <td className="py-2 text-right font-mono text-emerald-400">{num(a.partnerships.reduce((s, p) => s + p.usersM6, 0))}</td>
                      <td className="py-2 text-right font-mono text-emerald-400">{num(a.partnerships.reduce((s, p) => s + p.usersM12, 0))}</td>
                      <td className="py-2 text-right font-mono text-emerald-400">{num(a.partnerships.reduce((s, p) => s + p.usersM18, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Partnership Value Summary">
              <div className="grid grid-cols-3 gap-4">
                <Metric label="Total Partner Users (18mo)" value={num(calc.totalPartnerUsers)} good />
                <Metric label="% of Total Signups" value={pct(calc.totalPartnerUsers / (calc.totalSignupsM18 || 1))} />
                <Metric label="Effective CPA" value="$0" sub="Zero-cost acquisition channel" good />
              </div>
            </Card>
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
        Yousic Play Financial Model — Amber values are editable assumptions — All numbers flow from channel config → users → revenue
      </div>
    </div>
  );
}
