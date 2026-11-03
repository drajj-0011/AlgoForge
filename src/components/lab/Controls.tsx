"use client";

import type { AlgoId, BrushId, HeuristicId, MazeId, Phase } from "@/lib/types";
import { ALGOS, ALGO_IDS, HEURISTICS, MAZES, speedToRate } from "@/lib/meta";

export interface LabSettings {
  algo: AlgoId;
  heuristic: HeuristicId;
  diagonal: boolean;
  speed: number;
  cellSize: number;
  density: number;
  mazeId: MazeId;
  brush: BrushId;
  glow: boolean;
  showGrid: boolean;
  instant: boolean;
  soundOn: boolean;
  pilot: string;
}

export const DEFAULT_SETTINGS: LabSettings = {
  algo: "astar",
  heuristic: "manhattan",
  diagonal: false,
  speed: 55,
  cellSize: 24,
  density: 28,
  mazeId: "division",
  brush: "wall",
  glow: true,
  showGrid: true,
  instant: false,
  soundOn: true,
  pilot: "you",
};

interface Props {
  settings: LabSettings;
  onChange: (patch: Partial<LabSettings>) => void;
  phase: Phase;
  onVisualize: () => void;
  onBenchmark: () => void;
  onGenerate: () => void;
  onRandomize: () => void;
  onClearBoard: () => void;
  onClearPath: () => void;
  onReset: () => void;
  onExportPng: () => void;
  onExportJson: () => void;
}

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="mb-2.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.26em] text-slate-500">
      {children}
      <span className="h-px flex-1 bg-edge" />
    </p>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between font-mono text-[10px] tracking-wider">
        <span className="text-slate-400">{label}</span>
        <span className="text-neon">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(90deg, #0e7490, #22d3ee ${pct}%, #17203a ${pct}%)`,
        }}
        aria-label={label}
      />
    </label>
  );
}

function Toggle({
  label,
  on,
  onChange,
  hint,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-ink-800/50"
    >
      <span className="font-mono text-[10px] tracking-wider text-slate-400">
        {label}
        {hint && <span className="ml-1.5 text-slate-600">{hint}</span>}
      </span>
      <span
        className={`relative h-4 w-8 shrink-0 rounded-full border transition-colors ${
          on ? "border-neon/60 bg-neon/25" : "border-edge bg-ink-800"
        }`}
      >
        <span
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-all ${
            on ? "left-[18px] bg-neon shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "left-[3px] bg-slate-500"
          }`}
        />
      </span>
    </button>
  );
}

export default function Controls({
  settings: s,
  onChange,
  phase,
  onVisualize,
  onBenchmark,
  onGenerate,
  onRandomize,
  onClearBoard,
  onClearPath,
  onReset,
  onExportPng,
  onExportJson,
}: Props) {
  const busy = phase === "running" || phase === "tracing";
  const heuristicActive = s.algo === "astar" || s.algo === "greedy";

  return (
    <aside className="panel lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-slate-400">
          Control deck
        </span>
        <button
          type="button"
          onClick={() => onChange({ soundOn: !s.soundOn })}
          aria-pressed={s.soundOn}
          title={s.soundOn ? "Mute all lab sounds" : "Unmute lab sounds"}
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] tracking-widest transition-colors ${
            s.soundOn
              ? "border-volt/50 bg-volt/10 text-volt"
              : "border-edge bg-ink-800 text-slate-500"
          }`}
        >
          {s.soundOn ? (
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2 4.5 5H2v6h2.5L8 14V2z" />
              <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2 4.5 5H2v6h2.5L8 14V2z" />
              <path d="M10.5 6l4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          )}
          {s.soundOn ? "SFX ON" : "MUTED"}
        </button>
      </div>

      <div className="space-y-5 px-4 py-4">
        {/* primary actions */}
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={onVisualize}
            className={`btn w-full !py-3 text-[13px] ${busy ? "btn-danger !border-ember/60 !text-ember" : "btn-primary"}`}
          >
            {busy ? (
              <>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="2" y="2" width="8" height="8" rx="1" />
                </svg>
                ABORT SEARCH
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M2 1.5v9l8-4.5-8-4.5z" />
                </svg>
                VISUALIZE {ALGOS[s.algo].short}
              </>
            )}
          </button>
          <button type="button" onClick={onBenchmark} disabled={busy} className="btn btn-volt w-full">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 12V7M7 12V2M12 12V5" />
            </svg>
            BENCHMARK ALL FIVE
          </button>
        </div>

        {/* algorithm */}
        <div>
          <GroupLabel>algorithm</GroupLabel>
          <div className="space-y-1.5">
            {ALGO_IDS.map((id) => {
              const a = ALGOS[id];
              const active = s.algo === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange({ algo: id })}
                  className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all"
                  style={{
                    borderColor: active ? `${a.color}88` : "rgba(148,163,255,0.12)",
                    background: active ? a.dim : "rgba(12,18,36,0.5)",
                    boxShadow: active ? `0 0 16px -6px ${a.color}` : "none",
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: a.color, boxShadow: active ? `0 0 8px ${a.color}` : "none" }}
                    />
                    <span className={`font-display text-[13px] font-semibold ${active ? "text-white" : "text-slate-300"}`}>
                      {a.name}
                    </span>
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-slate-500">
                    {a.tag.split("·")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* steering */}
        <div>
          <GroupLabel>steering</GroupLabel>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] tracking-wider text-slate-400">
              heuristic {!heuristicActive && <span className="text-slate-600">(informed only)</span>}
            </span>
            <select
              className="lab-select w-full rounded-md border border-edge bg-ink-800/80 px-2.5 py-2 font-mono text-[11px] text-slate-200 disabled:opacity-40"
              value={s.heuristic}
              disabled={!heuristicActive}
              onChange={(e) => onChange({ heuristic: e.target.value as HeuristicId })}
            >
              {HEURISTICS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} — {h.formula}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2">
            <Toggle label="Diagonal moves" hint="8-way" on={s.diagonal} onChange={(v) => onChange({ diagonal: v })} />
          </div>
        </div>

        {/* board */}
        <div>
          <GroupLabel>world builder</GroupLabel>
          <div className="flex gap-2">
            <select
              className="lab-select min-w-0 flex-1 rounded-md border border-edge bg-ink-800/80 px-2.5 py-2 font-mono text-[11px] text-slate-200"
              value={s.mazeId}
              onChange={(e) => onChange({ mazeId: e.target.value as MazeId })}
              aria-label="Maze generator"
            >
              {MAZES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={onGenerate} disabled={busy} className="btn !px-3 !py-2 text-[10px]">
              CARVE
            </button>
          </div>
          <div className="mt-3 space-y-3">
            <Slider
              label="Wall density"
              value={s.density}
              min={10}
              max={45}
              display={`${s.density}%`}
              onChange={(v) => onChange({ density: v })}
            />
            <Slider
              label="Cell size"
              value={s.cellSize}
              min={14}
              max={34}
              step={2}
              display={`${s.cellSize}px`}
              onChange={(v) => onChange({ cellSize: v })}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {(
              [
                { id: "wall", label: "WALL", swatch: "#1a2340" },
                { id: "weight", label: "MUD ×5", swatch: "#fbbf24" },
                { id: "erase", label: "ERASE", swatch: "transparent" },
              ] as { id: BrushId; label: string; swatch: string }[]
            ).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onChange({ brush: b.id })}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-1 py-2 font-mono text-[9px] tracking-wider transition-all ${
                  s.brush === b.id
                    ? "border-neon/60 bg-neon/10 text-neon"
                    : "border-edge bg-ink-800/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-[2px] border border-edge"
                  style={{ background: b.swatch }}
                />
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* playback */}
        <div>
          <GroupLabel>playback & render</GroupLabel>
          <Slider
            label="Replay speed"
            value={s.speed}
            min={0}
            max={100}
            display={`${speedToRate(s.speed).toLocaleString()}/s`}
            onChange={(v) => onChange({ speed: v })}
          />
          <div className="mt-2 space-y-0.5">
            <Toggle label="Instant solve" hint="skip replay" on={s.instant} onChange={(v) => onChange({ instant: v })} />
            <Toggle label="Glow FX" hint="path bloom" on={s.glow} onChange={(v) => onChange({ glow: v })} />
            <Toggle label="Grid lines" on={s.showGrid} onChange={(v) => onChange({ showGrid: v })} />
          </div>
        </div>

        {/* pilot */}
        <div>
          <GroupLabel>pilot callsign</GroupLabel>
          <input
            type="text"
            value={s.pilot}
            maxLength={24}
            onChange={(e) => onChange({ pilot: e.target.value })}
            placeholder="you"
            className="w-full rounded-md border border-edge bg-ink-800/80 px-2.5 py-2 font-mono text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-neon/50"
            aria-label="Pilot callsign for the run ledger"
          />
        </div>

        {/* actions */}
        <div>
          <GroupLabel>board actions</GroupLabel>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={onClearPath} className="btn !px-2 !py-2 text-[10px]">
              CLEAR PATH
            </button>
            <button type="button" onClick={onClearBoard} disabled={busy} className="btn !px-2 !py-2 text-[10px]">
              CLEAR BOARD
            </button>
            <button type="button" onClick={onRandomize} disabled={busy} className="btn !px-2 !py-2 text-[10px]">
              ⚄ RANDOMIZE
            </button>
            <button type="button" onClick={onReset} disabled={busy} className="btn btn-danger !px-2 !py-2 text-[10px]">
              ↺ RESET ALL
            </button>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={onExportPng} className="btn !px-2 !py-2 text-[10px]">
              ↓ PNG
            </button>
            <button type="button" onClick={onExportJson} className="btn !px-2 !py-2 text-[10px]">
              ↓ JSON
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}