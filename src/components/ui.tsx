"use client";

import React from "react";

export function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-sm font-semibold text-white uppercase tracking-wide">{title}</h3>}
          {action}
        </div>
      )}
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
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
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

export function TextInput({
  label,
  value,
  onChange,
  small = false,
  placeholder = "",
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  small?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={`flex flex-col ${small ? "gap-0.5" : "gap-1"}`}>
      {label && <label className="text-xs text-slate-400 font-medium">{label}</label>}
      <div className="flex items-center bg-slate-950 border border-slate-600 rounded px-2 py-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent text-amber-400 text-sm w-full outline-none"
        />
      </div>
    </div>
  );
}

export function AddButton({ onClick, label = "Add" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-400/30 rounded hover:bg-emerald-400/10 transition-colors"
    >
      <span>+</span> {label}
    </button>
  );
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-red-400/60 hover:text-red-400 text-xs px-1.5 py-0.5 rounded hover:bg-red-400/10 transition-colors"
      title="Remove"
    >
      ×
    </button>
  );
}

export function EditToggle({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
        editing
          ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
          : "bg-slate-700/50 text-slate-400 border border-slate-600 hover:text-white"
      }`}
    >
      {editing ? "Done" : "Edit"}
    </button>
  );
}

const STATUS_STYLES: Record<string, string> = {
  hit: "bg-blue-400/20 text-emerald-400",
  on_track: "bg-blue-500/20 text-white",
  at_risk: "bg-yellow-500/20 text-yellow-400",
  miss: "bg-red-500/20 text-red-400",
};

const STATUS_OPTIONS = ["on_track", "at_risk", "hit", "miss"] as const;

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.on_track}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function StatusSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs font-medium text-amber-400 outline-none cursor-pointer"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{s.replace("_", " ")}</option>
      ))}
    </select>
  );
}
