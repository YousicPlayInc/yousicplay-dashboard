"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_ASSUMPTIONS, SCALAR_KEYS, fromSupabaseRows, type Assumptions, type FounderConfig, type AgentConfig, type PartnershipConfig, type PhaseConfig, type GtmMotion, type ChannelAllocation } from "@/lib/defaults";
import { computeAll, reverseEngineer } from "@/lib/calculations";
import { currency, pct, num } from "@/lib/format";
import { Card, Metric, Input, TextInput, AddButton, RemoveButton, EditToggle, StatusBadge, StatusSelect } from "@/components/ui";

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

let _idCounter = Date.now();
function uid() { return `_${_idCounter++}`; }

export default function Dashboard() {
  const [tab, setTab] = useState(0);
  const [a, setA] = useState<Assumptions>(JSON.parse(JSON.stringify(DEFAULT_ASSUMPTIONS)));
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const toggleEdit = (key: string) => setEditing(prev => ({ ...prev, [key]: !prev[key] }));

  // ─── Supabase Load ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!supabase) { setLoaded(true); return; }
      try {
        const { data, error } = await supabase.from("assumptions").select("key, value");
        if (!error && data && data.length > 0) {
          setA(fromSupabaseRows(data as { key: string; value: string }[], DEFAULT_ASSUMPTIONS));
        }
      } catch { /* use defaults */ }
      setLoaded(true);
    }
    load();
  }, []);

  // ─── Supabase Real-time ────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("assumptions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "assumptions" }, (payload) => {
        const row = payload.new as { key: string; value: string } | undefined;
        if (!row) return;
        setA((prev) => {
          if (row.key === "_founders_json") {
            try { return { ...prev, founders: JSON.parse(row.value) }; } catch { return prev; }
          } else if (row.key === "_phases_json") {
            try { return { ...prev, phases: JSON.parse(row.value) }; } catch { return prev; }
          } else if (row.key === "_partnerships_json") {
            try { return { ...prev, partnerships: JSON.parse(row.value) }; } catch { return prev; }
          } else if (SCALAR_KEYS.includes(row.key as typeof SCALAR_KEYS[number])) {
            return { ...prev, [row.key]: Number(row.value) };
          }
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── Persist helpers ───────────────────────────────────────────────
  const persistKey = useCallback((key: string, value: string) => {
    if (!supabase) return;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("assumptions")
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) console.error("Save error:", error.message);
      } catch (e) { console.error("Save exception:", e); }
    }, 500);
  }, []);

  // Update a scalar assumption
  const u = useCallback(
    (key: string) => (val: number) => {
      setA((prev) => ({ ...prev, [key]: val }));
      persistKey(key, String(val));
    }, [persistKey]
  );

  // Update entire founders array and persist as JSON
  const updateFounders = useCallback((fn: (prev: FounderConfig[]) => FounderConfig[]) => {
    setA((prev) => {
      const next = fn(JSON.parse(JSON.stringify(prev.founders)));
      persistKey("_founders_json", JSON.stringify(next));
      return { ...prev, founders: next };
    });
  }, [persistKey]);

  // Update entire phases array and persist as JSON
  const updatePhases = useCallback((fn: (prev: PhaseConfig[]) => PhaseConfig[]) => {
    setA((prev) => {
      const next = fn(JSON.parse(JSON.stringify(prev.phases)));
      persistKey("_phases_json", JSON.stringify(next));
      return { ...prev, phases: next };
    });
  }, [persistKey]);

  // Update entire partnerships array and persist as JSON
  const updatePartnerships = useCallback((fn: (prev: PartnershipConfig[]) => PartnershipConfig[]) => {
    setA((prev) => {
      const next = fn(JSON.parse(JSON.stringify(prev.partnerships)));
      persistKey("_partnerships_json", JSON.stringify(next));
      return { ...prev, partnerships: next };
    });
  }, [persistKey]);

  const calc = useMemo(() => computeAll(a), [a]);
  const reverse = useMemo(() => reverseEngineer(a), [a]);

  // Apply recommended budgets and raise from reverse engineering
  const applyRecommended = useCallback(() => {
    // Scale marketing budgets
    updatePhases((phases) => {
      for (let i = 0; i < phases.length; i++) {
        phases[i].monthlyMktBudget = reverse.scaledBudgets[i]?.monthly ?? phases[i].monthlyMktBudget;
      }
      return phases;
    });
    // Set raise
    u("raise")(reverse.requiredRaise);
  }, [reverse, updatePhases, u]);

  const PHASE_LABELS = a.phases.map((p, i) => {
    const startMonth = a.phases.slice(0, i).reduce((s, pp) => s + pp.months, 0);
    return `M${startMonth}–M${startMonth + p.months}`;
  });

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
      <div className="bg-gradient-to-r from-slate-900 via-blue-900/40 to-slate-900 border-b border-slate-700 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Yousic Play</h1>
            <p className="text-xs sm:text-sm text-slate-400">Pre-Seed Financial Model &amp; Launch Dashboard</p>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:gap-4 text-center">
            <Metric label="Raise" value={currency(a.raise)} />
            <Metric label="18-Mo ARR" value={currency(calc.arrM18)} good />
            <Metric label="Agents" value={calc.totalAgents} />
            <Metric label="Break-Even" value={`M${calc.breakEvenMonth}`} good />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 bg-slate-800/50 overflow-x-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto flex">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-6">

        {/* ═══ TAB 0: INFLECTION POINTS ═══ */}
        {tab === 0 && (
          <div className="space-y-6">

            {/* Reverse Engineering: Target → Required Raise */}
            <div className="bg-gradient-to-r from-blue-900/30 to-slate-800 rounded-xl border border-blue-500/30 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Reverse-Engineered from Target</p>
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
                    <div>
                      <label className="text-xs text-slate-400 font-medium block mb-1">Target M12 ARR</label>
                      <div className="flex items-center bg-slate-950 border border-slate-600 rounded px-3 py-1.5">
                        <span className="text-amber-400 text-sm mr-1">$</span>
                        <input type="number" value={a.targetARR12} onChange={(e) => u("targetARR12")(parseFloat(e.target.value) || 0)} className="bg-transparent text-amber-400 text-lg font-bold w-36 outline-none font-mono" />
                      </div>
                    </div>
                    <div className="text-sm text-slate-400">
                      Current projection: <span className={`font-mono font-bold ${calc.arrM12 >= a.targetARR12 ? "text-emerald-400" : "text-red-400"}`}>{currency(calc.arrM12)}</span>
                      {calc.arrM12 < a.targetARR12 && <span className="text-red-400 ml-1">({currency(a.targetARR12 - calc.arrM12)} gap)</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-400">Required Raise</p>
                      <p className="text-lg font-bold font-mono text-emerald-400">{currency(reverse.requiredRaise)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Total Mkt Spend (18mo)</p>
                      <p className="text-lg font-bold font-mono text-white">{currency(reverse.totalMktSpend18mo)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Projected M12 ARR</p>
                      <p className="text-lg font-bold font-mono text-emerald-400">{currency(reverse.projected.arrM12)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Budget Multiplier</p>
                      <p className="text-lg font-bold font-mono text-white">{reverse.multiplier.toFixed(1)}×</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Required Monthly Marketing Budgets</p>
                    {reverse.scaledBudgets.map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{b.label} ({PHASE_LABELS[i] || `Phase ${i+1}`})</span>
                        <span className="font-mono text-white">{currency(b.monthly)}/mo <span className="text-slate-400">({currency(b.total)} total)</span></span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <button onClick={applyRecommended} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                      Apply Recommended Budgets &amp; Raise
                    </button>
                    <p className="text-xs text-slate-400">Sets raise to {currency(reverse.requiredRaise)} and scales all phase marketing budgets</p>
                  </div>
                </div>

                <div className="sm:w-48 bg-slate-900/60 rounded-lg p-3 border border-slate-700 space-y-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">At Target</p>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">MAU</span><span className="font-mono">{num(reverse.projected.mauM12)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Paid</span><span className="font-mono text-emerald-400">{num(reverse.projected.paidM12)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">MRR</span><span className="font-mono text-emerald-400">{currency(reverse.projected.mrrM12)}</span></div>
                  <div className="border-t border-slate-700 my-1" />
                  <div className="flex justify-between text-sm"><span className="text-slate-400">18mo Rev</span><span className="font-mono">{currency(reverse.projected.totalRev)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">18mo Cost</span><span className="font-mono text-red-400">{currency(reverse.projected.totalCost)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Break-Even</span><span className="font-mono">M{reverse.projected.breakEvenMonth}</span></div>
                </div>
              </div>
            </div>

            <Card title="Pricing Tiers">
              <p className="text-xs text-slate-400 mb-3">14-day full Pro trial on signup. No payment upfront.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400 bg-slate-800/50 rounded p-3">
                <div><span className="block">Blended ARPU (M6)</span><span className="text-white font-mono">${calc.blendedArpuM6?.toFixed(2)}/mo</span></div>
                <div><span className="block">Blended ARPU (M12)</span><span className="text-white font-mono">${calc.blendedArpuM12?.toFixed(2)}/mo</span></div>
                <div><span className="block">Blended ARPU (M18)</span><span className="text-white font-mono">${calc.blendedArpuM18?.toFixed(2)}/mo</span></div>
                <div><span className="block">Tier mix</span><span className="text-slate-300">Studio grows 15%→25%→35%</span></div>
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
              </div>
            </Card>

            <Card title="Derived User Growth (from marketing channels)">
              <p className="text-xs text-slate-400 mb-3">Calculated from channel budgets, CPAs, and viral amplification. Edit on the Marketing &amp; Growth tab.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {calc.phases.map((p, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{p.label}</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Direct Signups</span><span className="font-mono">{num(p.directSignups)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Partnership Users</span><span className="font-mono">{num(p.partnershipUsers)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Viral Users (K={a.viralK})</span><span className="font-mono">{num(p.viralUsers)}</span></div>
                      <div className="border-t border-slate-700 my-1" />
                      <div className="flex justify-between font-medium"><span>Total Signups</span><span className="font-mono">{num(p.totalSignups)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Active (MAU)</span><span className="font-mono">{num(p.totalActiveUsers)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Paid Subscribers</span><span className="font-mono text-emerald-400">{num(p.paidUsers)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="AI Consumer Benchmarks (2025-2026)">
              <p className="text-xs text-slate-400 mb-3">Sourced from a16z, Sensor Tower, Duolingo, and market data.</p>
              <div className="overflow-x-auto -mx-4 px-4"><table className="w-full text-sm min-w-[480px]">
                <thead><tr className="text-xs text-slate-400 border-b border-slate-700"><th className="text-left py-2">Benchmark</th><th className="text-right py-2">Data Point</th><th className="text-left py-2 pl-3">Source</th></tr></thead>
                <tbody className="text-slate-300">
                  {[
                    ["Median AI consumer app ARR (Year 1)", "$4.2M", "a16z, 2025"],
                    ["AI app downloads growth (H1 2025)", "+67% HoH", "Sensor Tower"],
                    ["Duolingo free-to-paid conversion", "7% of MAU", "Duolingo Q1 2025"],
                    ["AI consumer app free-to-paid rate", "2-5% (freemium)", "Industry avg, 2025"],
                    ["Online music ed market (2026)", "$4.6B, 15.2% CAGR", "Mordor Intelligence"],
                  ].map(([m, v, s], i) => (
                    <tr key={i} className={`border-b border-slate-800 ${i % 2 !== 0 ? "bg-slate-800/30" : ""}`}>
                      <td className="py-1.5">{m}</td>
                      <td className="py-1.5 text-right font-mono text-white font-medium">{v}</td>
                      <td className="py-1.5 pl-3 text-xs text-slate-400">{s}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "6-Month Inflection", mau: calc.mauM6, paid: calc.paidM6, mrr: calc.mrrM6, arr: calc.arrM6, arpu: calc.blendedArpuM6, signups: calc.totalSignupsM6 },
                { label: "12-Month Inflection", mau: calc.mauM12, paid: calc.paidM12, mrr: calc.mrrM12, arr: calc.arrM12, arpu: calc.blendedArpuM12, signups: calc.totalSignupsM12 },
                { label: "18-Month Inflection", mau: calc.mauM18, paid: calc.paidM18, mrr: calc.mrrM18, arr: calc.arrM18, arpu: calc.blendedArpuM18, signups: calc.totalSignupsM18 },
              ].map((ip, i) => (
                <Card key={i} title={ip.label}>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Signups</span><span className="text-sm font-mono">{num(ip.signups)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">MAU</span><span className="text-sm font-mono">{num(ip.mau)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Paid</span><span className="text-sm font-mono text-emerald-400">{num(ip.paid)}</span></div>
                    <div className="border-t border-slate-700 my-2" />
                    <div className="flex justify-between"><span className="text-xs text-slate-400">MRR</span><span className="text-sm font-mono text-emerald-400">{currency(ip.mrr)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">ARR</span><span className="text-sm font-mono font-bold text-emerald-400">{currency(ip.arr)}</span></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB 1: AI AGENT TEAMS ═══ */}
        {tab === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card><Metric label="Founders" value={calc.founderCount} /></Card>
              <Card><Metric label="Total Agents" value={calc.totalAgents} good /></Card>
              <Card><Metric label="Agent Cost/mo" value={currency(calc.totalAgentCostMo)} /></Card>
              <Card><Metric label="Annual Savings" value={currency(calc.tradCost - calc.totalAgentCostMo * 12)} good /></Card>
            </div>

            {a.founders.map((founder, fi) => (
              <Card key={founder.id} title={editing[`founder_${fi}`] ? undefined : founder.title} action={<EditToggle editing={!!editing[`founder_${fi}`]} onToggle={() => toggleEdit(`founder_${fi}`)} />}>
                {editing[`founder_${fi}`] && (
                  <div className="flex items-center gap-2 mb-3">
                    <TextInput small value={founder.title} onChange={(val) => updateFounders(f => { f[fi].title = val; return f; })} />
                    <RemoveButton onClick={() => { updateFounders(f => f.filter((_, i) => i !== fi)); toggleEdit(`founder_${fi}`); }} />
                  </div>
                )}
                <div className="overflow-x-auto -mx-4 px-4"><table className="w-full text-sm min-w-[400px]">
                  <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2">Agent</th><th className="text-left py-2">Function</th><th className="text-right py-2">$/mo</th>{editing[`founder_${fi}`] && <th className="w-8"></th>}
                  </tr></thead>
                  <tbody>
                    {founder.agents.map((ag, ai) => (
                      <tr key={ai} className="border-b border-slate-800">
                        {editing[`founder_${fi}`] ? (
                          <>
                            <td className="py-1"><TextInput small value={ag.name} onChange={(val) => updateFounders(f => { f[fi].agents[ai].name = val; return f; })} /></td>
                            <td className="py-1"><TextInput small value={ag.fn} onChange={(val) => updateFounders(f => { f[fi].agents[ai].fn = val; return f; })} /></td>
                            <td className="py-1 w-24"><Input small value={ag.cost} onChange={(val) => updateFounders(f => { f[fi].agents[ai].cost = val; return f; })} prefix="$" /></td>
                            <td className="py-1"><RemoveButton onClick={() => updateFounders(f => { f[fi].agents.splice(ai, 1); return f; })} /></td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 pr-4 font-medium">{ag.name}</td>
                            <td className="py-1.5 pr-4 text-slate-400">{ag.fn}</td>
                            <td className="py-1.5 text-right font-mono text-white">${ag.cost}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-2" colSpan={2}>Subtotal</td>
                      <td className="py-2 text-right font-mono text-emerald-400">${founder.agents.reduce((s, ag) => s + ag.cost, 0)}/mo</td>
                      {editing[`founder_${fi}`] && <td></td>}
                    </tr>
                  </tbody>
                </table></div>
                {editing[`founder_${fi}`] && (
                  <div className="mt-2">
                    <AddButton label="Add Agent" onClick={() => updateFounders(f => { f[fi].agents.push({ name: "New Agent", fn: "Function", cost: 50 }); return f; })} />
                  </div>
                )}
              </Card>
            ))}

            {editing.addFounder !== false && (
              <AddButton label="Add Founder" onClick={() => updateFounders(f => [...f, { id: uid(), title: `Founder ${f.length + 1}`, agents: [{ name: "New Agent", fn: "Function", cost: 50 }] }])} />
            )}
          </div>
        )}

        {/* ═══ TAB 2: TOKEN EXPENSES ═══ */}
        {tab === 2 && (
          <div className="space-y-6">
            <Card title="Token Cost Assumptions (edit these)">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Input label="Cost/User/Mo @ M6" value={a.tokenCostPerUserM6} onChange={u("tokenCostPerUserM6")} prefix="$" />
                <Input label="Cost/User/Mo @ M12" value={a.tokenCostPerUserM12} onChange={u("tokenCostPerUserM12")} prefix="$" />
                <Input label="Cost/User/Mo @ M18" value={a.tokenCostPerUserM18} onChange={u("tokenCostPerUserM18")} prefix="$" />
                <Input label="18-Mo Price Decline Factor" value={(a.priceDecline18mo * 100).toFixed(0)} onChange={(v) => u("priceDecline18mo")(v / 100)} suffix="%" />
              </div>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Month 6", mau: calc.mauM6, cpu: a.tokenCostPerUserM6, token: calc.tokenM6 },
                { label: "Month 12", mau: calc.mauM12, cpu: a.tokenCostPerUserM12, token: calc.tokenM12 },
                { label: "Month 18", mau: calc.mauM18, cpu: a.tokenCostPerUserM18, token: calc.tokenM18 },
              ].map((p, i) => (
                <Card key={i} title={p.label}>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-slate-400">MAU</span><span className="font-mono">{num(p.mau)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Cost/User/Mo</span><span className="font-mono">${p.cpu.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-slate-400">Monthly Total</span><span className="font-mono text-emerald-400">{currency(p.token)}</span></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB 3: RULE OF 10 ═══ */}
        {tab === 3 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">Ed Kang CFXO Framework — all metrics derived from your assumptions.</p>
            {[
              { rule: "10× Less Reliance on Manual Staff", target: `${calc.founderCount} founders vs ${calc.tradHeadcount} traditional`, status: "hit", how: `${calc.founderCount} founders + ${calc.totalAgents} AI agents replace ${calc.tradHeadcount}-person team` },
              { rule: "10× More Spent on Tokens vs Staff", target: "Token spend > salary spend", status: "hit", how: "Zero employee salaries; all operational cost goes to AI compute" },
              { rule: "1 Founder = 10 Agents", target: `Avg ${(calc.totalAgents / (calc.founderCount || 1)).toFixed(0)} agents/founder`, status: "hit", how: "Progressive deployment: critical agents first, specialized by M12-M18" },
              { rule: "10× Smaller Rounds, Less Dilution", target: `${currency(a.raise)} vs $1.5M trad.`, status: "hit", how: `${currency(a.raise)} pre-seed does what $1.5M used to; agents eliminate salary burn` },
            ].map((r, i) => (
              <Card key={i}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-white">{r.rule}</h4>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-slate-400 mb-2">{r.how}</p>
                <div className="text-sm font-mono text-white">{r.target}</div>
              </Card>
            ))}
          </div>
        )}

        {/* ═══ TAB 4: TEAM & ECONOMICS ═══ */}
        {tab === 4 && (
          <div className="space-y-6">
            <Card title="Founder Compensation by Phase (edit these)">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {a.phases.map((phase, pi) => (
                  <Input key={pi} label={`Founder Pay/mo (${PHASE_LABELS[pi]})`} value={phase.founderPayMonthly} onChange={(val) => updatePhases(p => { p[pi].founderPayMonthly = val; return p; })} prefix="$" />
                ))}
              </div>
            </Card>

            <Card title="Unit Economics (derived)">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <Metric label="LTV" value={currency(calc.ltv)} sub={`$${calc.blendedArpuM12?.toFixed(2)} / ${pct(a.churn)} churn`} good />
                <Metric label="CAC (derived)" value={`$${calc.cac.toFixed(2)}`} sub="Total mkt / signups" />
                <Metric label="LTV:CAC" value={`${calc.ltvCac.toFixed(0)}:1`} good={calc.ltvCac > 3} />
                <Metric label="Gross Margin (M18)" value={pct(calc.grossMarginM18)} good={calc.grossMarginM18 > 0.7} />
              </div>
            </Card>

            <Card title="Quarterly P&L (derived)">
              <div className="overflow-x-auto -mx-4 px-4"><table className="w-full text-sm min-w-[600px]">
                <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">Quarter</th><th className="text-right py-2">Revenue</th><th className="text-right py-2">Tokens</th><th className="text-right py-2">Founders</th><th className="text-right py-2">Marketing</th><th className="text-right py-2">Total Cost</th><th className="text-right py-2">Net</th><th className="text-right py-2">Cash</th>
                </tr></thead>
                <tbody>
                  {calc.cashFlow.map((q, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 font-medium">{q.label}</td>
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
              </table></div>
            </Card>
          </div>
        )}

        {/* ═══ TAB 5: GTM STRATEGY ═══ */}
        {tab === 5 && (
          <div className="space-y-6">
            {a.phases.map((phase, pi) => (
              <Card key={phase.id} title={`Phase ${pi + 1}: ${phase.label} (${PHASE_LABELS[pi]}) → ${currency(calc.phases[pi]?.arr || 0)} ARR`}>
                <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs text-white uppercase tracking-wide">Derived from Channels</span>
                      <p className="text-sm text-white font-medium mt-0.5">{num(calc.phases[pi]?.paidUsers || 0)} paid from {num(calc.phases[pi]?.totalSignups || 0)} signups</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">MRR</span>
                      <p className="text-emerald-400 font-mono font-bold">{currency(calc.phases[pi]?.mrr || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Channel breakdown */}
                <div className="overflow-x-auto -mx-4 px-4"><table className="w-full text-sm mb-4 min-w-[420px]">
                  <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2">Channel</th><th className="text-right py-2">Budget %</th><th className="text-right py-2">Spend</th><th className="text-right py-2">Signups</th><th className="text-right py-2">Active</th>
                  </tr></thead>
                  <tbody>
                    {(calc.phases[pi]?.channels || []).map((ch, ci) => (
                      <tr key={ci} className="border-b border-slate-800">
                        <td className="py-1.5">{ch.label}</td>
                        <td className="py-1.5 text-right font-mono">{(ch.budgetPct * 100).toFixed(0)}%</td>
                        <td className="py-1.5 text-right font-mono">{currency(ch.spend)}</td>
                        <td className="py-1.5 text-right font-mono">{num(ch.signups)}</td>
                        <td className="py-1.5 text-right font-mono text-emerald-400">{num(ch.activeUsers)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>

                {/* GTM Motions */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">GTM Motions</p>
                  <EditToggle editing={!!editing[`gtm_${pi}`]} onToggle={() => toggleEdit(`gtm_${pi}`)} />
                </div>
                <div className="overflow-x-auto -mx-4 px-4"><table className="w-full text-sm min-w-[560px]">
                  <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2">Motion</th><th className="text-left py-2">Channel</th><th className="text-left py-2">Agent</th><th className="text-left py-2">Metric</th><th className="text-right py-2">Budget</th>{editing[`gtm_${pi}`] && <th className="w-8"></th>}
                  </tr></thead>
                  <tbody>
                    {phase.gtmMotions.map((g, gi) => (
                      <tr key={g.id} className="border-b border-slate-800">
                        {editing[`gtm_${pi}`] ? (
                          <>
                            <td className="py-1"><TextInput small value={g.motion} onChange={(val) => updatePhases(p => { p[pi].gtmMotions[gi].motion = val; return p; })} /></td>
                            <td className="py-1"><TextInput small value={g.channel} onChange={(val) => updatePhases(p => { p[pi].gtmMotions[gi].channel = val; return p; })} /></td>
                            <td className="py-1"><TextInput small value={g.agent} onChange={(val) => updatePhases(p => { p[pi].gtmMotions[gi].agent = val; return p; })} /></td>
                            <td className="py-1"><TextInput small value={g.metric} onChange={(val) => updatePhases(p => { p[pi].gtmMotions[gi].metric = val; return p; })} /></td>
                            <td className="py-1 w-24"><TextInput small value={g.budget} onChange={(val) => updatePhases(p => { p[pi].gtmMotions[gi].budget = val; return p; })} /></td>
                            <td className="py-1"><RemoveButton onClick={() => updatePhases(p => { p[pi].gtmMotions.splice(gi, 1); return p; })} /></td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 pr-4 font-medium">{g.motion}</td>
                            <td className="py-1.5 pr-4 text-slate-400">{g.channel}</td>
                            <td className="py-1.5 pr-4 text-slate-400">{g.agent}</td>
                            <td className="py-1.5 pr-4 text-slate-400">{g.metric}</td>
                            <td className="py-1.5 text-right font-mono text-white">{g.budget}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                {editing[`gtm_${pi}`] && (
                  <div className="mt-2 flex gap-2">
                    <AddButton label="Add Motion" onClick={() => updatePhases(p => { p[pi].gtmMotions.push({ id: uid(), motion: "New Motion", channel: "", agent: "", metric: "", budget: "$0" }); return p; })} />
                    <RemoveButton onClick={() => updatePhases(p => p.filter((_, i) => i !== pi))} />
                  </div>
                )}
              </Card>
            ))}

            <AddButton label="Add Phase" onClick={() => updatePhases(p => [...p, {
              id: uid(), label: `Phase ${p.length + 1}`, months: 6, monthlyMktBudget: 5000, founderPayMonthly: 15000, infraMonthly: 500,
              channels: [{ channelId: "organic_seo", label: "Organic / SEO", budgetPct: 0.30, cpa: 0.50, signupToActiveRate: 0.35 }, { channelId: "paid_social", label: "Paid Social", budgetPct: 0.70, cpa: 6.00, signupToActiveRate: 0.25 }],
              gtmMotions: [],
            }])} />
          </div>
        )}

        {/* ═══ TAB 6: MARKETING & GROWTH ═══ */}
        {tab === 6 && (
          <div className="space-y-6">
            <Card title="Marketing Budget by Phase (edit these)">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {a.phases.map((phase, pi) => (
                  <Input key={pi} label={`Monthly Budget ${PHASE_LABELS[pi]}`} value={phase.monthlyMktBudget} onChange={(val) => updatePhases(p => { p[pi].monthlyMktBudget = val; return p; })} prefix="$" />
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Total: {currency(a.phases.reduce((s, p) => s + p.monthlyMktBudget * p.months, 0))} | CAC: ${calc.cac.toFixed(2)}
              </div>
            </Card>

            {a.phases.map((phase, pi) => (
              <Card key={phase.id} title={`Channel Config: ${PHASE_LABELS[pi]} — ${currency(phase.monthlyMktBudget * phase.months)} total`} action={<EditToggle editing={!!editing[`channels_${pi}`]} onToggle={() => toggleEdit(`channels_${pi}`)} />}>
                <div className="overflow-x-auto -mx-4 px-4"><table className="w-full text-sm min-w-[640px]">
                  <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2">Channel</th><th className="text-right py-2 w-20">Budget %</th><th className="text-right py-2 w-20">CPA ($)</th><th className="text-right py-2 w-20">Conv %</th><th className="text-right py-2">Spend</th><th className="text-right py-2">Signups</th><th className="text-right py-2">Active</th>{editing[`channels_${pi}`] && <th className="w-8"></th>}
                  </tr></thead>
                  <tbody>
                    {phase.channels.map((ch, ci) => {
                      const cr = calc.phases[pi]?.channels[ci];
                      return (
                        <tr key={ci} className="border-b border-slate-800">
                          {editing[`channels_${pi}`] ? (
                            <>
                              <td className="py-1"><TextInput small value={ch.label} onChange={(val) => updatePhases(p => { p[pi].channels[ci].label = val; return p; })} /></td>
                              <td className="py-1"><Input small value={(ch.budgetPct * 100).toFixed(0)} onChange={(v) => updatePhases(p => { p[pi].channels[ci].budgetPct = v / 100; return p; })} suffix="%" /></td>
                              <td className="py-1"><Input small value={ch.cpa} onChange={(v) => updatePhases(p => { p[pi].channels[ci].cpa = v; return p; })} prefix="$" /></td>
                              <td className="py-1"><Input small value={(ch.signupToActiveRate * 100).toFixed(0)} onChange={(v) => updatePhases(p => { p[pi].channels[ci].signupToActiveRate = v / 100; return p; })} suffix="%" /></td>
                              <td className="py-1 text-right font-mono text-slate-300">{currency(cr?.spend || 0)}</td>
                              <td className="py-1 text-right font-mono">{num(cr?.signups || 0)}</td>
                              <td className="py-1 text-right font-mono text-emerald-400">{num(cr?.activeUsers || 0)}</td>
                              <td className="py-1"><RemoveButton onClick={() => updatePhases(p => { p[pi].channels.splice(ci, 1); return p; })} /></td>
                            </>
                          ) : (
                            <>
                              <td className="py-1.5 pr-4 font-medium">{ch.label}</td>
                              <td className="py-1.5 text-right font-mono">{(ch.budgetPct * 100).toFixed(0)}%</td>
                              <td className="py-1.5 text-right font-mono">${ch.cpa.toFixed(2)}</td>
                              <td className="py-1.5 text-right font-mono">{(ch.signupToActiveRate * 100).toFixed(0)}%</td>
                              <td className="py-1.5 text-right font-mono text-slate-300">{currency(cr?.spend || 0)}</td>
                              <td className="py-1.5 text-right font-mono">{num(cr?.signups || 0)}</td>
                              <td className="py-1.5 text-right font-mono text-emerald-400">{num(cr?.activeUsers || 0)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
                {editing[`channels_${pi}`] && (
                  <div className="mt-2 flex gap-2">
                    <AddButton label="Add Channel" onClick={() => updatePhases(p => { p[pi].channels.push({ channelId: uid(), label: "New Channel", budgetPct: 0.10, cpa: 5.00, signupToActiveRate: 0.25 }); return p; })} />
                  </div>
                )}
                <div className="mt-2 text-xs text-slate-400">
                  Direct: {num(calc.phases[pi]?.directSignups || 0)} + Viral: {num(calc.phases[pi]?.viralUsers || 0)} + Partners: {num(calc.phases[pi]?.partnershipUsers || 0)} = <span className="text-white">{num(calc.phases[pi]?.totalSignups || 0)} total</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ═══ TAB 7: PARTNERSHIPS & PR ═══ */}
        {tab === 7 && (
          <div className="space-y-6">
            <Card title="Partnership User Projections" action={<EditToggle editing={!!editing.partnerships} onToggle={() => toggleEdit("partnerships")} />}>
              <p className="text-xs text-slate-400 mb-3">Estimated users each partnership drives. These flow into the growth model across all tabs.</p>
              <div className="overflow-x-auto -mx-4 px-4"><table className="w-full text-sm min-w-[580px]">
                <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">Partner</th><th className="text-left py-2">Category</th><th className="text-center py-2">Status</th><th className="text-right py-2 w-24">Users M6</th><th className="text-right py-2 w-24">Users M12</th><th className="text-right py-2 w-24">Users M18</th>{editing.partnerships && <th className="w-8"></th>}
                </tr></thead>
                <tbody>
                  {a.partnerships.map((p, pi) => (
                    <tr key={p.id} className="border-b border-slate-800">
                      {editing.partnerships ? (
                        <>
                          <td className="py-1"><TextInput small value={p.partner} onChange={(val) => updatePartnerships(ps => { ps[pi].partner = val; return ps; })} /></td>
                          <td className="py-1"><TextInput small value={p.category} onChange={(val) => updatePartnerships(ps => { ps[pi].category = val; return ps; })} /></td>
                          <td className="py-1 text-center"><StatusSelect value={p.status} onChange={(val) => updatePartnerships(ps => { ps[pi].status = val; return ps; })} /></td>
                          <td className="py-1"><Input small value={p.usersM6} onChange={(val) => updatePartnerships(ps => { ps[pi].usersM6 = val; return ps; })} /></td>
                          <td className="py-1"><Input small value={p.usersM12} onChange={(val) => updatePartnerships(ps => { ps[pi].usersM12 = val; return ps; })} /></td>
                          <td className="py-1"><Input small value={p.usersM18} onChange={(val) => updatePartnerships(ps => { ps[pi].usersM18 = val; return ps; })} /></td>
                          <td className="py-1"><RemoveButton onClick={() => updatePartnerships(ps => ps.filter((_, i) => i !== pi))} /></td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 pr-4 font-medium">{p.partner}</td>
                          <td className="py-1.5 pr-4 text-slate-400">{p.category}</td>
                          <td className="py-1.5 text-center"><StatusBadge status={p.status} /></td>
                          <td className="py-1.5 text-right font-mono text-white">{num(p.usersM6)}</td>
                          <td className="py-1.5 text-right font-mono text-white">{num(p.usersM12)}</td>
                          <td className="py-1.5 text-right font-mono text-white">{num(p.usersM18)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2" colSpan={3}>Total</td>
                    <td className="py-2 text-right font-mono text-emerald-400">{num(a.partnerships.reduce((s, p) => s + p.usersM6, 0))}</td>
                    <td className="py-2 text-right font-mono text-emerald-400">{num(a.partnerships.reduce((s, p) => s + p.usersM12, 0))}</td>
                    <td className="py-2 text-right font-mono text-emerald-400">{num(a.partnerships.reduce((s, p) => s + p.usersM18, 0))}</td>
                    {editing.partnerships && <td></td>}
                  </tr>
                </tbody>
              </table></div>
              {editing.partnerships && (
                <div className="mt-2">
                  <AddButton label="Add Partnership" onClick={() => updatePartnerships(ps => [...ps, { id: uid(), partner: "New Partner", category: "Category", usersM6: 0, usersM12: 0, usersM18: 0, status: "on_track" }])} />
                </div>
              )}
            </Card>

            <Card title="Partnership Value Summary">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Metric label="Total Partner Users (18mo)" value={num(calc.totalPartnerUsers)} good />
                <Metric label="% of Total Signups" value={pct(calc.totalPartnerUsers / (calc.totalSignupsM18 || 1))} />
                <Metric label="Effective CPA" value="$0" sub="Zero-cost acquisition" good />
              </div>
            </Card>
          </div>
        )}

        {/* ═══ TAB 8: ASK SUMMARY ═══ */}
        {tab === 8 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900/30 to-slate-800 rounded-xl border border-blue-500/30 p-5 sm:p-8 text-center">
              <p className="text-sm text-white uppercase tracking-wide mb-2">The Ask</p>
              <p className="text-base sm:text-xl font-light text-white italic">
                &quot;We are raising <span className="font-bold text-emerald-400">{currency(a.raise)}</span> to secure our first <span className="font-bold text-emerald-400">{num(calc.paidM6)}+</span> paid subscribers and validate unit economics within {a.phases[0]?.months || 6} months.&quot;
              </p>
            </div>

            <Card title="Use of Funds">
              <div className="space-y-3">
                {[
                  { cat: "AI/Token Credits & Infra", p: 37, note: "LLM APIs, hosting, audio processing" },
                  { cat: "Founder Stipends", p: 40, note: `${calc.founderCount} founders, minimal stipends` },
                  { cat: "Marketing & Growth", p: 13, note: "Paid acquisition, content, community" },
                  { cat: "Legal, Tools & Ops", p: 7, note: "Entity setup, tools, compliance" },
                  { cat: "Buffer", p: 3, note: "Contingency" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 sm:gap-3">
                    <div className="w-28 sm:w-48 text-xs sm:text-sm font-medium shrink-0">{f.cat}</div>
                    <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full flex items-center pl-2" style={{ width: `${f.p}%` }}>
                        <span className="text-xs font-mono text-white">{currency(a.raise * f.p / 100)}</span>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-mono text-white">{f.p}%</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card><Metric label="6-Mo ARR" value={currency(calc.arrM6)} sub={`${num(calc.paidM6)} paid`} /></Card>
              <Card><Metric label="12-Mo ARR" value={currency(calc.arrM12)} sub={`${num(calc.paidM12)} paid`} good /></Card>
              <Card><Metric label="18-Mo ARR" value={currency(calc.arrM18)} sub={`${num(calc.paidM18)} paid`} good /></Card>
              <Card><Metric label="LTV:CAC" value={`${calc.ltvCac.toFixed(0)}:1`} good /></Card>
            </div>

            <Card title="Investor Narrative">
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                <p>Yousic Play sits at the intersection of three massive, converging markets: <span className="text-white font-medium">online music education ($4.6B → $9.4B by 2031)</span>, <span className="text-white font-medium">AI consumer apps ($10B+ in 2026)</span>, and <span className="text-white font-medium">neuroscience-backed wellness</span>.</p>
                <p>With {calc.founderCount} founders running {calc.totalAgents} AI agents, we deliver the output of a {calc.tradHeadcount}-person team at {pct(calc.totalAgentCostMo * 12 / calc.tradCost)} of the cost. Our {currency(a.raise)} pre-seed buys 18 months of runway.</p>
                <p className="font-medium text-white">Every dollar goes to tokens, not salaries. That&apos;s the new math of AI-first startups.</p>
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-6 py-3 text-center text-xs text-slate-600">
        Yousic Play Financial Model — Amber values are editable — All numbers flow from channels → users → revenue
      </div>
    </div>
  );
}
