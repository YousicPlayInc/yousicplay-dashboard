"use client";

import React from "react";

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
      {title && <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">{title}</h3>}
      {children}
    </div>
  );
}

export function Metric({
  label,
  value,
  sub,
  good,
}: {
  label: string;
  value: string | number;
  sub?: string;
  good?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-lg font-bold font-mono ${
          good === false ? "text-red-400" : good ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  prefix = "",
  suffix = "",
  small = false,
}: {
  label?: string;
  value: number | string;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  small?: boolean;
}) {
  return (
    <div className={`flex flex-col ${small ? "gap-0.5" : "gap-1"}`}>
      {label && <label className="text-xs text-slate-400 font-medium">{label}</label>}
      <div className="flex items-center bg-slate-950 border border-slate-600 rounded px-2 py-1">
        {prefix && <span className="text-amber-400 text-sm mr-1">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-transparent text-amber-400 text-sm w-full outline-none font-mono"
        />
        {suffix && <span className="text-amber-400 text-sm ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    hit: "bg-blue-400/20 text-emerald-400",
    on_track: "bg-blue-500/20 text-white",
    at_risk: "bg-yellow-500/20 text-yellow-400",
    miss: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s[status] || s.on_track}`}>
      {status.replace("_", " ")}
    </span>
  );
}
