export interface Assumptions {
  [key: string]: number;
}

export interface QuarterData {
  label: string;
  rev: number;
  token: number;
  founder: number;
  mkt: number;
  totalCost: number;
  net: number;
  cash: number;
}

export interface Calculations {
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
  tokenM6: number;
  tokenM12: number;
  tokenM18: number;
  tokenAdj18: number;
  totalAgents: number;
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
}

export function computeAll(a: Assumptions): Calculations {
  const mauM6 = a.usersM6 * a.activationRate;
  const mauM12 = a.usersM12 * a.activationRate;
  const mauM18 = a.usersM18 * a.activationRate;
  const paidM6 = Math.round(mauM6 * a.convRate);
  const paidM12 = Math.round(mauM12 * a.convRate);
  const paidM18 = Math.round(mauM18 * a.convRate);

  const blendedArpuM6 =
    0.85 * (0.6 * a.proMonthly + 0.4 * a.proAnnual / 12) +
    0.15 * (0.6 * a.studioMonthly + 0.4 * a.studioAnnual / 12);
  const blendedArpuM12 =
    0.75 * (0.6 * a.proMonthly + 0.4 * a.proAnnual / 12) +
    0.25 * (0.6 * a.studioMonthly + 0.4 * a.studioAnnual / 12);
  const blendedArpuM18 =
    0.65 * (0.6 * a.proMonthly + 0.4 * a.proAnnual / 12) +
    0.35 * (0.6 * a.studioMonthly + 0.4 * a.studioAnnual / 12);

  const mrrM6 = paidM6 * blendedArpuM6;
  const mrrM12 = paidM12 * blendedArpuM12;
  const mrrM18 = paidM18 * blendedArpuM18;
  const arrM6 = mrrM6 * 12;
  const arrM12 = mrrM12 * 12;
  const arrM18 = mrrM18 * 12;

  const tokenM6 = mauM6 * a.tokenCostPerUserM6;
  const tokenM12 = mauM12 * a.tokenCostPerUserM12;
  const tokenM18 = mauM18 * a.tokenCostPerUserM18;
  const tokenAdj18 = tokenM18 * a.priceDecline18mo;

  const totalAgents = a.founders * a.agentsPerFounder;
  const tradHeadcount = 14;
  const tradCost = 1500000;

  const q1Rev = 500, q2Rev = 4500, q3Rev = 20000, q4Rev = 53000, q5Rev = 103000, q6Rev = 172000;
  const q1Token = 1500, q2Token = 5500, q3Token = 10000, q4Token = 18000, q5Token = 30000, q6Token = 45000;

  const quarters = [
    { label: "Q1", rev: q1Rev, token: q1Token, founder: a.founderPayM1_6, mkt: a.mktBudgetM1_6 * 3 },
    { label: "Q2", rev: q2Rev, token: q2Token, founder: a.founderPayM1_6, mkt: a.mktBudgetM1_6 * 3 },
    { label: "Q3", rev: q3Rev, token: q3Token, founder: a.founderPayM7_12, mkt: a.mktBudgetM7_12 * 3 },
    { label: "Q4", rev: q4Rev, token: q4Token, founder: a.founderPayM7_12, mkt: a.mktBudgetM7_12 * 3 },
    { label: "Q5", rev: q5Rev, token: q5Token, founder: a.founderPayM13_18, mkt: a.mktBudgetM13_18 * 3 },
    { label: "Q6", rev: q6Rev, token: q6Token, founder: a.founderPayM13_18, mkt: a.mktBudgetM13_18 * 3 },
  ];

  let cashPos = a.raise;
  const cashFlow: QuarterData[] = quarters.map((q) => {
    const totalCost = q.token + q.founder + q.mkt + 1500;
    const net = q.rev - totalCost;
    cashPos += net;
    return { ...q, totalCost, net, cash: cashPos };
  });

  const totalRev = cashFlow.reduce((s, q) => s + q.rev, 0);
  const totalCostSum = cashFlow.reduce((s, q) => s + q.totalCost, 0);
  const ltv = blendedArpuM12 / a.churn;
  const cac = 4.0;

  return {
    mauM6, mauM12, mauM18, paidM6, paidM12, paidM18,
    mrrM6, mrrM12, mrrM18, arrM6, arrM12, arrM18,
    blendedArpuM6, blendedArpuM12, blendedArpuM18,
    tokenM6, tokenM12, tokenM18, tokenAdj18,
    totalAgents, tradHeadcount, tradCost,
    cashFlow, totalRev, totalCost: totalCostSum,
    ltv, cac, ltvCac: ltv / cac,
    grossMarginM18: 1 - (a.tokenCostPerUserM18 / blendedArpuM18),
    breakEvenMonth: cashFlow[4]?.net > 0 ? 14 : 16,
  };
}
