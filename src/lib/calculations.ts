import type { Assumptions, PhaseConfig } from "./defaults";

// ─── Output Types ────────────────────────────────────────────────────

export interface ChannelResult {
  channelId: string;
  label: string;
  budgetPct: number;
  spend: number;        // total $ spent in phase
  cpa: number;
  signups: number;      // raw signups acquired
  activeUsers: number;  // signups × signupToActiveRate
  signupToActiveRate: number;
}

export interface PhaseResult {
  label: string;
  months: number;
  mktBudget: number;          // total phase marketing spend
  channels: ChannelResult[];
  directSignups: number;      // from paid channels
  partnershipUsers: number;   // from partnerships
  viralUsers: number;         // from viral amplification
  totalSignups: number;       // direct + partnership + viral
  totalActiveUsers: number;   // total active (MAU proxy)
  paidUsers: number;
  mrr: number;
  arr: number;
  blendedArpu: number;
}

export interface QuarterData {
  label: string;
  rev: number;
  token: number;
  founder: number;
  mkt: number;
  infra: number;
  totalCost: number;
  net: number;
  cash: number;
}

export interface Calculations {
  phases: [PhaseResult, PhaseResult, PhaseResult];
  // Convenience aliases (cumulative at end of each phase)
  mauM6: number;
  mauM12: number;
  mauM18: number;
  paidM6: number;
  paidM12: number;
  paidM18: number;
  mrrM6: number;
  mrrM12: number;
  mrrM18: number;
  arrM6: number;
  arrM12: number;
  arrM18: number;
  blendedArpuM6: number;
  blendedArpuM12: number;
  blendedArpuM18: number;
  totalSignupsM6: number;
  totalSignupsM12: number;
  totalSignupsM18: number;
  tokenM6: number;
  tokenM12: number;
  tokenM18: number;
  tokenAdj18: number;
  totalAgents: number;
  founderCount: number;
  totalAgentCostMo: number;
  tradHeadcount: number;
  tradCost: number;
  cashFlow: QuarterData[];
  totalRev: number;
  totalCost: number;
  ltv: number;
  cac: number;
  ltvCac: number;
  grossMarginM18: number;
  breakEvenMonth: number;
  totalPartnerUsers: number;
}

// ─── Blended ARPU by tier mix ────────────────────────────────────────

function blendedArpu(a: Assumptions, studioPct: number): number {
  const proPct = 1 - studioPct;
  return proPct * (0.6 * a.proMonthly + 0.4 * a.proAnnual / 12)
       + studioPct * (0.6 * a.studioMonthly + 0.4 * a.studioAnnual / 12);
}

// ─── Compute phase users from channels ──────────────────────────────

function computePhase(
  a: Assumptions,
  phase: PhaseConfig,
  phaseIndex: number,
  studioPct: number,
  partnerUsers: number,
): PhaseResult {
  const labels = ["M0–M6", "M7–M12", "M13–M18"];
  const totalMktSpend = phase.monthlyMktBudget * phase.months;

  // Channel-by-channel user acquisition
  const channels: ChannelResult[] = phase.channels.map(ch => {
    const spend = totalMktSpend * ch.budgetPct;
    const signups = ch.cpa > 0 ? Math.round(spend / ch.cpa) : 0;
    const activeUsers = Math.round(signups * ch.signupToActiveRate);
    return {
      channelId: ch.channelId,
      label: ch.label,
      budgetPct: ch.budgetPct,
      spend,
      cpa: ch.cpa,
      signups,
      activeUsers,
      signupToActiveRate: ch.signupToActiveRate,
    };
  });

  const directSignups = channels.reduce((s, c) => s + c.signups, 0);

  // Viral amplification: V = (direct + partners) × K / (1 - K), capped at 3x
  const baseUsers = directSignups + partnerUsers;
  const K = Math.min(a.viralK, 0.95); // cap to avoid infinity
  const viralUsers = Math.round(baseUsers * K / (1 - K));

  const totalSignups = directSignups + partnerUsers + viralUsers;
  // Active users = weighted average of channel-specific activation + partnership/viral at global rate
  const directActive = channels.reduce((s, c) => s + c.activeUsers, 0);
  const globalActivationRate = directSignups > 0
    ? directActive / directSignups
    : 0.30;
  const partnerActive = Math.round(partnerUsers * 0.30); // partnerships convert at ~30%
  const viralActive = Math.round(viralUsers * globalActivationRate);
  const totalActiveUsers = directActive + partnerActive + viralActive;

  const paidUsers = Math.round(totalActiveUsers * a.convRate);
  const arpu = blendedArpu(a, studioPct);
  const mrr = paidUsers * arpu;
  const arr = mrr * 12;

  return {
    label: labels[phaseIndex],
    months: phase.months,
    mktBudget: totalMktSpend,
    channels,
    directSignups,
    partnershipUsers: partnerUsers,
    viralUsers,
    totalSignups,
    totalActiveUsers,
    paidUsers,
    mrr,
    arr,
    blendedArpu: arpu,
  };
}

// ─── Main Computation ────────────────────────────────────────────────

export function computeAll(a: Assumptions): Calculations {
  // Partnership users per phase
  const partnerM6 = a.partnerships.reduce((s, p) => s + p.usersM6, 0);
  const partnerM12 = a.partnerships.reduce((s, p) => s + p.usersM12, 0);
  const partnerM18 = a.partnerships.reduce((s, p) => s + p.usersM18, 0);

  // Studio tier mix grows over time: 15% → 25% → 35%
  const p0 = computePhase(a, a.phases[0], 0, 0.15, partnerM6);
  const p1 = computePhase(a, a.phases[1], 1, 0.25, partnerM12);
  const p2 = computePhase(a, a.phases[2], 2, 0.35, partnerM18);

  const phases: [PhaseResult, PhaseResult, PhaseResult] = [p0, p1, p2];

  // Cumulative users (each phase adds to total)
  const cumSignupsM6 = p0.totalSignups;
  const cumSignupsM12 = cumSignupsM6 + p1.totalSignups;
  const cumSignupsM18 = cumSignupsM12 + p2.totalSignups;

  // MAU at each milestone = cumulative active (with churn applied to prior cohorts)
  // Simplified: each phase's active users represent that phase's steady-state MAU
  // Prior cohorts retain at (1 - churn)^6 over a 6-month phase
  const retainRate6mo = Math.pow(1 - a.churn, 6);
  const mauM6 = p0.totalActiveUsers;
  const mauM12 = Math.round(mauM6 * retainRate6mo + p1.totalActiveUsers);
  const mauM18 = Math.round(mauM12 * retainRate6mo + p2.totalActiveUsers);

  const paidM6 = Math.round(mauM6 * a.convRate);
  const paidM12 = Math.round(mauM12 * a.convRate);
  const paidM18 = Math.round(mauM18 * a.convRate);

  const arpuM6 = blendedArpu(a, 0.15);
  const arpuM12 = blendedArpu(a, 0.25);
  const arpuM18 = blendedArpu(a, 0.35);

  const mrrM6 = paidM6 * arpuM6;
  const mrrM12 = paidM12 * arpuM12;
  const mrrM18 = paidM18 * arpuM18;

  // Token costs
  const tokenM6 = mauM6 * a.tokenCostPerUserM6;
  const tokenM12 = mauM12 * a.tokenCostPerUserM12;
  const tokenM18 = mauM18 * a.tokenCostPerUserM18;
  const tokenAdj18 = tokenM18 * a.priceDecline18mo;

  // Team (derived from founders array)
  const totalAgents = a.founders.reduce((s, f) => s + f.agents.length, 0);
  const founderCount = a.founders.length;
  const totalAgentCostMo = a.founders.reduce((s, f) => s + f.agents.reduce((s2, ag) => s2 + ag.cost, 0), 0);
  const tradHeadcount = 14;
  const tradCost = 1500000;

  // ─── Quarterly Cash Flow (derived, not hardcoded) ──────────────────
  // 6 quarters, each 3 months. Linearly interpolate within each phase.
  const quarters: QuarterData[] = [];
  let cashPos = a.raise;

  for (let qi = 0; qi < 6; qi++) {
    const phaseIdx = Math.floor(qi / 2); // 0,0,1,1,2,2
    const isSecondHalf = qi % 2 === 1;
    const phase = a.phases[phaseIdx];
    const phaseResult = phases[phaseIdx];

    // Revenue ramps within phase: Q1 of phase = ~40% of phase MRR, Q2 = ~70%
    // (users accumulate through the phase)
    const mrrFraction = isSecondHalf ? 0.85 : 0.40;
    const mauFraction = isSecondHalf ? 0.85 : 0.45;

    const qRev = Math.round(phaseResult.mrr * mrrFraction * 3);
    const qMau = phaseResult.totalActiveUsers * mauFraction;
    const tokenCostPerUser = [a.tokenCostPerUserM6, a.tokenCostPerUserM12, a.tokenCostPerUserM18][phaseIdx];
    const qToken = Math.round(qMau * tokenCostPerUser * 3);
    const qFounder = phase.founderPayMonthly * 3;
    const qMkt = phase.monthlyMktBudget * 3;
    const qInfra = phase.infraMonthly * 3;
    const totalCost = qToken + qFounder + qMkt + qInfra;
    const net = qRev - totalCost;
    cashPos += net;

    quarters.push({
      label: `Q${qi + 1}`,
      rev: qRev,
      token: qToken,
      founder: qFounder,
      mkt: qMkt,
      infra: qInfra,
      totalCost,
      net,
      cash: cashPos,
    });
  }

  const totalRev = quarters.reduce((s, q) => s + q.rev, 0);
  const totalCostSum = quarters.reduce((s, q) => s + q.totalCost, 0);

  // CAC = total marketing spend / total signups acquired (derived)
  const totalMktSpend = a.phases.reduce((s, p) => s + p.monthlyMktBudget * p.months, 0);
  const totalDirectSignups = phases.reduce((s, p) => s + p.directSignups, 0);
  const cac = totalDirectSignups > 0 ? totalMktSpend / totalDirectSignups : 0;

  const ltv = arpuM12 / a.churn;

  // Break-even month: find first quarter where net > 0
  let breakEvenMonth = 18;
  for (let i = 0; i < quarters.length; i++) {
    if (quarters[i].net > 0) {
      breakEvenMonth = (i + 1) * 3;
      break;
    }
  }

  return {
    phases,
    mauM6, mauM12, mauM18,
    paidM6, paidM12, paidM18,
    mrrM6, mrrM12, mrrM18,
    arrM6: mrrM6 * 12, arrM12: mrrM12 * 12, arrM18: mrrM18 * 12,
    blendedArpuM6: arpuM6, blendedArpuM12: arpuM12, blendedArpuM18: arpuM18,
    totalSignupsM6: cumSignupsM6, totalSignupsM12: cumSignupsM12, totalSignupsM18: cumSignupsM18,
    tokenM6, tokenM12, tokenM18, tokenAdj18,
    totalAgents, founderCount, totalAgentCostMo, tradHeadcount, tradCost,
    cashFlow: quarters,
    totalRev, totalCost: totalCostSum,
    ltv, cac, ltvCac: cac > 0 ? ltv / cac : 0,
    grossMarginM18: 1 - (a.tokenCostPerUserM18 / arpuM18),
    breakEvenMonth,
    totalPartnerUsers: partnerM6 + partnerM12 + partnerM18,
  };
}

// ─── Reverse Engineering: Target ARR → Required Raise ───────────────

export interface ReverseResult {
  multiplier: number;
  scaledBudgets: { label: string; monthly: number; total: number }[];
  totalMktSpend18mo: number;
  requiredRaise: number;
  projected: Calculations;
}

export function reverseEngineer(a: Assumptions): ReverseResult {
  const K = Math.min(a.viralK, 0.95);
  const retainRate6mo = Math.pow(1 - a.churn, 6);
  const arpu12 = blendedArpu(a, 0.25); // 25% studio mix at M12

  // Required MAU at M12 to hit target ARR
  const requiredMAU = a.targetARR12 / (12 * a.convRate * arpu12);

  // Per-phase efficiency: how many active users per dollar of marketing spend
  function phaseEfficiency(phase: PhaseConfig) {
    let signupsPerDollar = 0;
    let activePerDollar = 0;
    for (const ch of phase.channels) {
      if (ch.cpa > 0) {
        signupsPerDollar += ch.budgetPct / ch.cpa;
        activePerDollar += (ch.budgetPct / ch.cpa) * ch.signupToActiveRate;
      }
    }
    const globalRate = signupsPerDollar > 0 ? activePerDollar / signupsPerDollar : 0.30;
    return { activePerDollar, globalRate };
  }

  const eff0 = phaseEfficiency(a.phases[0]);
  const eff1 = a.phases.length > 1 ? phaseEfficiency(a.phases[1]) : eff0;

  // Partner contributions (independent of marketing spend)
  const partnerM6 = a.partnerships.reduce((s, p) => s + p.usersM6, 0);
  const partnerM12 = a.partnerships.reduce((s, p) => s + p.usersM12, 0);
  const pf0 = partnerM6 * (0.30 + eff0.globalRate * K / (1 - K));
  const pf1 = partnerM12 * (0.30 + eff1.globalRate * K / (1 - K));

  // Current phase spends
  const spend0 = a.phases[0].monthlyMktBudget * a.phases[0].months;
  const spend1 = a.phases.length > 1 ? a.phases[1].monthlyMktBudget * a.phases[1].months : 0;

  // MAU at M12 = (phase1Active × retainRate) + phase2Active
  // where phaseActive = spend × activePerDollar / (1-K) + partnerFixed
  // Solve: requiredMAU = k × [spend0 × eff0/(1-K) × retain + spend1 × eff1/(1-K)]
  //                     + [pf0 × retain + pf1]
  const mktCoeff = spend0 * eff0.activePerDollar / (1 - K) * retainRate6mo
                 + spend1 * eff1.activePerDollar / (1 - K);
  const partnerFixed = pf0 * retainRate6mo + pf1;

  const k = mktCoeff > 0 ? (requiredMAU - partnerFixed) / mktCoeff : 1;
  const multiplier = Math.max(k, 0.1); // floor at 10%

  // Create scaled assumptions
  const scaledA = JSON.parse(JSON.stringify(a)) as Assumptions;
  for (let i = 0; i < scaledA.phases.length; i++) {
    scaledA.phases[i].monthlyMktBudget = Math.round(a.phases[i].monthlyMktBudget * multiplier);
  }

  // Run full model with scaled budgets to get accurate costs/revenue
  const projected = computeAll(scaledA);

  // Required raise = peak cumulative cash deficit + 10% buffer
  // q.net = q.rev - q.totalCost (independent of raise)
  let minCum = 0;
  let cum = 0;
  for (const q of projected.cashFlow) {
    cum += q.net;
    if (cum < minCum) minCum = cum;
  }
  const requiredRaise = Math.max(0, Math.ceil(-minCum * 1.10 / 1000) * 1000);

  const totalMktSpend18mo = scaledA.phases.reduce((s, p) => s + p.monthlyMktBudget * p.months, 0);

  return {
    multiplier,
    scaledBudgets: scaledA.phases.map((p, i) => ({
      label: `Phase ${i + 1}`,
      monthly: p.monthlyMktBudget,
      total: p.monthlyMktBudget * p.months,
    })),
    totalMktSpend18mo,
    requiredRaise,
    projected,
  };
}
