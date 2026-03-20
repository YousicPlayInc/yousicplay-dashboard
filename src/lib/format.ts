export function currency(n: number): string {
  if (n === undefined || n === null || isNaN(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${n < 0 ? "(" : ""}$${(abs / 1e6).toFixed(1)}M${n < 0 ? ")" : ""}`;
  if (abs >= 1e3) return `${n < 0 ? "(" : ""}$${(abs / 1e3).toFixed(1)}K${n < 0 ? ")" : ""}`;
  return `${n < 0 ? "(" : ""}$${abs.toFixed(0)}${n < 0 ? ")" : ""}`;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function num(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${Math.round(n)}`;
}
