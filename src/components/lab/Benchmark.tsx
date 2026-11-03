"use client";

import { ALGOS } from "@/lib/meta";
import type { AlgoId, BenchmarkRow } from "@/lib/types";

interface Props {
  rows: BenchmarkRow[] | null;
  onRun: () => void;
  onPick: (algo: AlgoId) => void;
  busy: boolean;
}

export default function Benchmark({ rows, onRun, onPick, busy }: Props) {
  const solved = rows?.filter((r) => r.found) ?? [];
  const maxVisited = rows ? Math.max(1, ...rows.map((r) => r.visited)) : 1;
  const leastWork = solved.length
    ? solved.reduce((a, b) => (b.visited < a.visited ? b : a)).algo
    : null;
  const cheapest = solved.length
    ? solved.reduce((a, b) => (b.pathCost < a.pathCost ? b : a)).algo
    : null;
  const fastest = solved.length
    ? solved.reduce((a, b) => (b.computeMs < a.computeMs ? b : a)).algo
    : null;

  return (
    <div className="panel flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.26em] text-slate-400">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 12V7M7 12V2M12 12V5" />
          </svg>
          Benchmark track
        </span>
        <button type="button" onClick={onRun} disabled={busy} className="btn !px-3 !py-1.5 text-[10px]">
          {rows ? "RE-RACE" : "RACE"}
        </button>
      </div>

      {!rows ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="flex items-end gap-1.5" aria-hidden="true">
            {[10, 22, 14, 28, 18].map((h, i) => (
              <span
                key={i}
                className="w-2.5 rounded-sm opacity-40"
                style={{ height: h, background: Object.values(ALGOS)[i].color }}
              />
            ))}
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-slate-500">
            Race all five algorithms across the{" "}
            <span className="text-slate-300">exact board on screen</span> — same walls,
            same mud, same heuristic — and see who works least, pays least, and finishes first.
          </p>
          <button type="button" onClick={onRun} disabled={busy} className="btn btn-volt mt-1">
            Run the race
          </button>
        </div>
      ) : (
        <div className="flex-1 space-y-2.5 px-4 py-4">
          {rows.map((r) => {
            const a = ALGOS[r.algo];
            const pct = Math.max(2, (r.visited / maxVisited) * 100);
            return (
              <button
                key={r.algo}
                type="button"
                onClick={() => onPick(r.algo)}
                title={`Arm ${a.name} in the lab`}
                className="group block w-full rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-edge hover:bg-ink-800/40"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-mono text-[11px] font-semibold" style={{ color: a.color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.color }} />
                    {a.name}
                    <span className="flex gap-1">
                      {r.algo === leastWork && (
                        <span className="rounded bg-neon/15 px-1 py-px text-[8px] tracking-wider text-neon">LEAST WORK</span>
                      )}
                      {r.algo === cheapest && (
                        <span className="rounded bg-volt/15 px-1 py-px text-[8px] tracking-wider text-volt">CHEAPEST</span>
                      )}
                      {r.algo === fastest && (
                        <span className="rounded bg-flare/15 px-1 py-px text-[8px] tracking-wider text-flare">FASTEST</span>
                      )}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {r.found ? (
                      <>
                        <span className="text-slate-300">{r.visited.toLocaleString()}</span> exp ·{" "}
                        cost <span className="text-slate-300">{r.pathCost.toFixed(1)}</span> ·{" "}
                        <span className="text-slate-300">{r.computeMs.toFixed(2)}ms</span>
                      </>
                    ) : (
                      <span className="text-ember">NO ROUTE · {r.visited.toLocaleString()} exp</span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-800/90">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-125"
                    style={{
                      width: `${pct}%`,
                      background: r.found
                        ? `linear-gradient(90deg, ${a.color}55, ${a.color})`
                        : "linear-gradient(90deg, rgba(251,113,133,0.25), rgba(251,113,133,0.5))",
                      boxShadow: r.found ? `0 0 10px -2px ${a.color}` : "none",
                    }}
                  />
                </div>
              </button>
            );
          })}
          <p className="pt-1 text-center font-mono text-[9px] tracking-wider text-slate-600">
            bar length = nodes explored · click a lane to arm that algorithm
          </p>
        </div>
      )}
    </div>
  );
}