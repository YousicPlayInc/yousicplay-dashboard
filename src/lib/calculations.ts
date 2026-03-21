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
  reinvestMkt: number;
  infra: number;
  totalCost: number;
  net: number;
  cash: number;
  mau: number;
  paidUsers: number;
  mrr: number;
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
  totalReinvested: number;
  // UOF dollar amounts
  uofMktDollars: number;
  uofFounderDollars: number;
  uofInfraDollars: number;
  uofAgentsDollars: number;
  uofReserveDollars: number;
}

// ─── Blended ARPU by tier mix ────────────────────────────────────────

function blendedArpu(a: Assumptions, studioPct: number): number {
  const proPct = 1 - studioPct;
  return proPct * (0.6 * a.proMonthly + 0.4 * a.proAnnual / 12)
       + studioPct * (0.6 * a.studioMonthly + 0.4 * a.studioAnnual / 12);
}

// Active users generated per dollar of marketing spend (with viral amplification)
function activeUsersPerDollar(phase: PhaseConfig, viralK: number): number {
  const K = Math.min(viralK, 0.95);
  let aPerD = 0;
  for (const ch of phase.channels) {
    if (ch.cpa > 0) {
      aPerD += (ch.budgetPct / ch.cpa) * ch.signupToActiveRate;
    }
  }
  return aPerD / (1 - K);
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

  // ─── Quarterly Cash Flow: Forward Simulation with Reinvestment ──────
  // Revenue earned each quarter can be reinvested into marketing,
  // creating a compounding growth loop.

  const quarters: QuarterData[] = [];
  let cashPos = a.raise;
  let cumulativeMAU = 0;
  let reinvestCarry = 0; // surplus from prior quarter to reinvest
  const retainRate3mo = Math.pow(1 - a.churn, 3);
  const studioPcts = [0.15, 0.15, 0.25, 0.25, 0.35, 0.35];
  const tokenCosts = [a.tokenCostPerUserM6, a.tokenCostPerUserM6, a.tokenCostPerUserM12, a.tokenCostPerUserM12, a.tokenCostPerUserM18, a.tokenCostPerUserM18];
  let totalReinvested = 0;

  // UOF-derived budgets: raise × category% spread with phase ramp
  // Phase ramp weights: [0.5, 1.0, 1.5] so early phases spend less, later more
  const rampWeights = [0.5, 0.5, 1.0, 1.0, 1.5, 1.5]; // per quarter
  const rampWeightSum = rampWeights.reduce((s, w) => s + w, 0);
  const totalMktFromRaise = a.raise * a.uofMarketing;
  const totalFounderFromRaise = a.raise * a.uofFounderPay;
  const totalInfraFromRaise = a.raise * a.uofInfra;

  for (let qi = 0; qi < 6; qi++) {
    const phaseIdx = Math.floor(qi / 2);
    const phase = a.phases[phaseIdx];
    const isFirstQtrOfPhase = qi % 2 === 0;

    // Marketing: UOF-derived base + reinvested surplus from prior quarter
    const baseMkt = Math.round(totalMktFromRaise * rampWeights[qi] / rampWeightSum);
    const reinvestMkt = reinvestCarry;
    reinvestCarry = 0;
    const totalMkt = baseMkt + reinvestMkt;
    totalReinvested += reinvestMkt;

    // New active users from marketing spend (using phase channel efficiency)
    const efficiency = activeUsersPerDollar(phase, a.viralK);
    const mktActive = Math.round(totalMkt * efficiency);

    // Partnership users this quarter (split evenly across 2 quarters per phase)
    const partnerPhaseUsers = [partnerM6, partnerM12, partnerM18][phaseIdx] || 0;
    const partnerQtr = Math.round(partnerPhaseUsers * (isFirstQtrOfPhase ? 0.4 : 0.6));
    const K = Math.min(a.viralK, 0.95);
    const partnerActive = Math.round(partnerQtr * 0.30 * (1 + K / (1 - K)));

    const newActive = mktActive + partnerActive;

    // Apply quarterly churn to existing MAU, add new users
    cumulativeMAU = Math.round(cumulativeMAU * retainRate3mo) + newActive;

    // Revenue from current MAU
    const arpu = blendedArpu(a, studioPcts[qi]);
    const paidUsers = Math.round(cumulativeMAU * a.convRate);
    const mrr = paidUsers * arpu;
    const qRev = Math.round(mrr * 3);

    // Costs — founder pay & infra also UOF-derived with ramp
    const qToken = Math.round(cumulativeMAU * tokenCosts[qi] * 3);
    const qFounder = Math.round(totalFounderFromRaise * rampWeights[qi] / rampWeightSum);
    const qInfra = Math.round(totalInfraFromRaise * rampWeights[qi] / rampWeightSum);
    const totalCost = qToken + qFounder + totalMkt + qInfra;
    const net = qRev - totalCost;

    cashPos += net;

    // Reinvestment: deploy a share of remaining cash into next quarter's marketing
    // "Once we pay all operational costs, the rest goes back into marketing"
    const remainingQuarters = Math.max(1, 6 - qi - 1); // quarters left after this one
    const deployableCash = Math.max(0, cashPos);
    reinvestCarry = Math.round(deployableCash * a.reinvestPct / remainingQuarters);

    quarters.push({
      label: `Q${qi + 1}`,
      rev: qRev,
      token: qToken,
      founder: qFounder,
      mkt: baseMkt,
      reinvestMkt,
      infra: qInfra,
      totalCost,
      net,
      cash: cashPos,
      mau: cumulativeMAU,
      paidUsers,
      mrr,
    });
  }

  // Derive milestone metrics from simulation (end of Q2, Q4, Q6)
  const simMauM6 = quarters[1]?.mau || 0;
  const simMauM12 = quarters[3]?.mau || 0;
  const simMauM18 = quarters[5]?.mau || 0;
  const simPaidM6 = quarters[1]?.paidUsers || 0;
  const simPaidM12 = quarters[3]?.paidUsers || 0;
  const simPaidM18 = quarters[5]?.paidUsers || 0;
  const simMrrM6 = quarters[1]?.mrr || 0;
  const simMrrM12 = quarters[3]?.mrr || 0;
  const simMrrM18 = quarters[5]?.mrr || 0;

  const totalRev = quarters.reduce((s, q) => s + q.rev, 0);
  const totalCostSum = quarters.reduce((s, q) => s + q.totalCost, 0);

  // CAC = total marketing spend (base + reinvested) / total signups
  const totalMktSpend = quarters.reduce((s, q) => s + q.mkt + q.reinvestMkt, 0);
  const totalDirectSignups = phases.reduce((s, p) => s + p.directSignups, 0);
  const cac = totalDirectSignups > 0 ? totalMktSpend / totalDirectSignups : 0;

  const ltv = arpuM12 / a.churn;

  // Break-even month: first quarter where net > 0
  let breakEvenMonth = 18;
  for (let i = 0; i < quarters.length; i++) {
    if (quarters[i].net > 0) {
      breakEvenMonth = (i + 1) * 3;
      break;
    }
  }

  return {
    phases,
    // Use simulation-derived metrics (includes reinvestment compounding)
    mauM6: simMauM6, mauM12: simMauM12, mauM18: simMauM18,
    paidM6: simPaidM6, paidM12: simPaidM12, paidM18: simPaidM18,
    mrrM6: simMrrM6, mrrM12: simMrrM12, mrrM18: simMrrM18,
    arrM6: simMrrM6 * 12, arrM12: simMrrM12 * 12, arrM18: simMrrM18 * 12,
    blendedArpuM6: arpuM6, blendedArpuM12: arpuM12, blendedArpuM18: arpuM18,
    totalSignupsM6: cumSignupsM6, totalSignupsM12: cumSignupsM12, totalSignupsM18: cumSignupsM18,
    tokenM6: simMauM6 * a.tokenCostPerUserM6,
    tokenM12: simMauM12 * a.tokenCostPerUserM12,
    tokenM18: simMauM18 * a.tokenCostPerUserM18,
    tokenAdj18: simMauM18 * a.tokenCostPerUserM18 * a.priceDecline18mo,
    totalAgents, founderCount, totalAgentCostMo, tradHeadcount, tradCost,
    cashFlow: quarters,
    totalRev, totalCost: totalCostSum,
    ltv, cac, ltvCac: cac > 0 ? ltv / cac : 0,
    grossMarginM18: 1 - (a.tokenCostPerUserM18 / arpuM18),
    breakEvenMonth,
    totalPartnerUsers: partnerM6 + partnerM12 + partnerM18,
    totalReinvested,
    uofMktDollars: Math.round(a.raise * a.uofMarketing),
    uofFounderDollars: Math.round(a.raise * a.uofFounderPay),
    uofInfraDollars: Math.round(a.raise * a.uofInfra),
    uofAgentsDollars: Math.round(a.raise * a.uofAgents),
    uofReserveDollars: Math.round(a.raise * a.uofReserve),
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
