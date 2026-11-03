"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALGOS, ALGO_IDS, MAZE_LABEL } from "@/lib/meta";
import { useReveal } from "@/lib/useReveal";
import type { AlgoId, RunRecord } from "@/lib/types";

type SortKey = "recent" | "efficient" | "explored" | "cost" | "fastest";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Latest first" },
  { id: "efficient", label: "Most efficient" },
  { id: "explored", label: "Most explored" },
  { id: "cost", label: "Cheapest path" },
  { id: "fastest", label: "Fastest compute" },
];

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const AVATAR_COLORS = ["#22d3ee", "#a78bfa", "#fbbf24", "#fb7185", "#a3e635", "#60a5fa", "#e879f9"];
function pilotColor(pilot: string): string {
  let h = 0;
  for (let i = 0; i < pilot.length; i++) h = (h * 31 + pilot.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function Leaderboard() {
  const revealRef = useReveal<HTMLElement>();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | AlgoId>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [undo, setUndo] = useState<RunRecord | null>(null);
  const knownIds = useRef<Set<number>>(new Set());

  const load = useCallback(async (flashNew: boolean) => {
    try {
      const res = await fetch("/api/runs");
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as { runs: RunRecord[] };
      if (flashNew && data.runs.length > 0 && !knownIds.current.has(data.runs[0].id)) {
        setFlashId(data.runs[0].id);
        window.setTimeout(() => setFlashId(null), 1800);
      }
      knownIds.current = new Set(data.runs.map((r) => r.id));
      setRuns(data.runs);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const onRuns = () => void load(true);
    window.addEventListener("algoforge:runs", onRuns);
    return () => window.removeEventListener("algoforge:runs", onRuns);
  }, [load]);

  /* undo window */
  useEffect(() => {
    if (!undo) return;
    const id = window.setTimeout(() => setUndo(null), 5200);
    return () => window.clearTimeout(id);
  }, [undo]);

  const deleteRun = (run: RunRecord) => {
    setRuns((rs) => rs.filter((r) => r.id !== run.id));
    setUndo(run);
    if (expanded === run.id) setExpanded(null);
    fetch(`/api/runs/${run.id}`, { method: "DELETE" }).catch(() => {});
  };

  const restoreRun = () => {
    if (!undo) return;
    const run = undo;
    setUndo(null);
    setRuns((rs) => [run, ...rs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(run),
    })
      .then(() => void load(true))
      .catch(() => {});
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = runs.filter((r) => {
      if (filter !== "all" && r.algorithm !== filter) return false;
      if (!q) return true;
      return (
        r.pilot.toLowerCase().includes(q) ||
        r.algorithm.toLowerCase().includes(q) ||
        (MAZE_LABEL[r.maze] ?? r.maze).toLowerCase().includes(q) ||
        `${r.cols}x${r.rows}`.includes(q)
      );
    });
    switch (sort) {
      case "efficient":
        list = [...list].sort((a, b) => b.efficiency - a.efficiency);
        break;
      case "explored":
        list = [...list].sort((a, b) => b.visited - a.visited);
        break;
      case "cost":
        list = [...list].sort((a, b) => a.pathCost - b.pathCost);
        break;
      case "fastest":
        list = [...list].sort((a, b) => a.computeMs - b.computeMs);
        break;
      default:
        list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  }, [runs, filter, query, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: runs.length };
    for (const id of ALGO_IDS) c[id] = runs.filter((r) => r.algorithm === id).length;
    return c;
  }, [runs]);

  return (
    <section id="ledger" ref={revealRef} className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">02 / the run ledger</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Every search, <span className="text-grad">on the record.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            Completed runs stream into MongoDB or PostgreSQL, selected by your environment. Filter by algorithm,
            hunt for a pilot, re-sort the field — deletions are undoable for five seconds.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-edge bg-ink-900/80 px-3 py-1.5 font-mono text-[10px] tracking-wider text-slate-400">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-volt" />
          LIVE · {runs.length} RUNS
        </span>
      </div>

      {/* toolbar */}
      <div className="reveal panel mb-4 flex flex-wrap items-center gap-2 px-3 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md border px-2.5 py-1.5 font-mono text-[10px] tracking-wider transition-colors ${
              filter === "all" ? "border-neon/60 bg-neon/10 text-neon" : "border-edge text-slate-400 hover:text-slate-200"
            }`}
          >
            ALL {counts.all}
          </button>
          {ALGO_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(filter === id ? "all" : id)}
              className="rounded-md border px-2.5 py-1.5 font-mono text-[10px] tracking-wider transition-colors"
              style={{
                borderColor: filter === id ? `${ALGOS[id].color}99` : "rgba(148,163,255,0.14)",
                background: filter === id ? ALGOS[id].dim : "transparent",
                color: filter === id ? ALGOS[id].color : "#94a3b8",
              }}
            >
              {ALGOS[id].short} {counts[id]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search pilot / maze / board…"
            className="w-full min-w-0 rounded-md border border-edge bg-ink-800/80 px-3 py-1.5 font-mono text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-neon/50 sm:w-52"
            aria-label="Search runs"
          />
          <select
            className="lab-select rounded-md border border-edge bg-ink-800/80 px-2.5 py-1.5 font-mono text-[11px] text-slate-200"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort runs"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* table */}
      <div className="reveal panel overflow-hidden">
        <div className="hidden items-center gap-3 border-b border-edge px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 md:flex">
          <span className="w-7">#</span>
          <span className="w-8" />
          <span className="flex-1">pilot / algorithm / world</span>
          <span className="w-20 text-right">explored</span>
          <span className="hidden w-20 text-right lg:block">cost</span>
          <span className="hidden w-20 text-right lg:block">compute</span>
          <span className="hidden w-24 text-right xl:block">efficiency</span>
          <span className="w-16 text-right">when</span>
          <span className="w-7" />
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="font-mono text-sm text-ember">Ledger unreachable.</p>
            <button type="button" className="btn" onClick={() => { setLoading(true); void load(false); }}>
              Retry connection
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="font-mono text-sm text-slate-400">No runs match this cut.</p>
            <button type="button" className="btn" onClick={() => { setFilter("all"); setQuery(""); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="max-h-[560px] divide-y divide-edge overflow-y-auto">
            {filtered.map((r, i) => {
              const a = ALGOS[r.algorithm];
              const isOpen = expanded === r.id;
              return (
                <li key={r.id} className={flashId === r.id ? "row-flash" : ""}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-800/40"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`w-7 shrink-0 font-mono text-[11px] ${
                        i === 0 ? "font-bold text-flare" : i === 1 ? "font-bold text-slate-300" : i === 2 ? "font-bold text-[#d0885a]" : "text-slate-600"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-[11px] font-bold sm:flex"
                      style={{
                        color: pilotColor(r.pilot),
                        borderColor: `${pilotColor(r.pilot)}44`,
                        background: `${pilotColor(r.pilot)}11`,
                      }}
                    >
                      {r.pilot.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-display text-[13px] font-semibold text-slate-200">
                          {r.pilot}
                        </span>
                        <span
                          className="shrink-0 rounded px-1.5 py-px font-mono text-[9px] font-semibold tracking-wider"
                          style={{ color: a.color, background: a.dim, border: `1px solid ${a.color}44` }}
                        >
                          {a.short}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">
                        {r.cols}×{r.rows} · {MAZE_LABEL[r.maze] ?? r.maze} · {r.wallCount} walls
                      </span>
                    </span>
                    <span className="w-20 shrink-0 text-right font-mono text-[12px] text-slate-300">
                      {r.visited.toLocaleString()}
                    </span>
                    <span className="hidden w-20 shrink-0 text-right font-mono text-[12px] text-mag lg:block">
                      {r.pathCost.toFixed(1)}
                    </span>
                    <span className="hidden w-20 shrink-0 text-right font-mono text-[12px] text-flare lg:block">
                      {r.computeMs.toFixed(2)}ms
                    </span>
                    <span className="hidden w-24 shrink-0 xl:block">
                      <span className="mb-1 block text-right font-mono text-[10px] text-blu">
                        {r.efficiency.toFixed(1)}%
                      </span>
                      <span className="block h-1 overflow-hidden rounded-full bg-ink-800">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-blu/50 to-blu"
                          style={{ width: `${Math.min(100, r.efficiency)}%` }}
                        />
                      </span>
                    </span>
                    <span className="w-16 shrink-0 text-right font-mono text-[10px] text-slate-500">
                      {timeAgo(r.createdAt)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRun(r);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          deleteRun(r);
                        }
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-slate-600 transition-colors hover:border-ember/50 hover:bg-ember/10 hover:text-ember"
                      aria-label={`Delete run ${r.id}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                        <path d="M2 3.5h10M5.5 3.5V2h3v1.5M3.5 3.5l.7 8.5h5.6l.7-8.5M5.8 6v4M8.2 6v4" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="anim-in grid grid-cols-2 gap-3 border-t border-edge bg-ink-900/60 px-5 py-4 sm:grid-cols-4">
                      {[
                        { k: "heuristic", v: r.heuristic },
                        { k: "path steps", v: String(r.pathLength) },
                        { k: "true cost", v: r.pathCost.toFixed(2) },
                        { k: "compute", v: `${r.computeMs.toFixed(3)} ms` },
                        { k: "board cells", v: (r.cols * r.rows).toLocaleString() },
                        { k: "wall density", v: `${((r.wallCount / (r.cols * r.rows)) * 100).toFixed(1)}%` },
                        { k: "efficiency", v: `${r.efficiency.toFixed(1)}%` },
                        { k: "logged", v: new Date(r.createdAt).toLocaleString() },
                      ].map((d) => (
                        <div key={d.k}>
                          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">{d.k}</p>
                          <p className="mt-0.5 font-mono text-[12px] text-slate-300">{d.v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* undo toast */}
      {undo && (
        <div className="anim-in fixed bottom-6 right-4 z-50 w-72 overflow-hidden rounded-lg border border-ember/40 bg-ink-900/95 shadow-2xl backdrop-blur-md sm:right-6" role="status">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="font-mono text-[11px] text-slate-300">
              Run <span className="text-ember">#{undo.id}</span> deleted
            </p>
            <button type="button" onClick={restoreRun} className="btn !border-neon/50 !px-3 !py-1 text-[10px] !text-neon">
              UNDO
            </button>
          </div>
          <div className="h-0.5 bg-ink-800">
            <div
              className="h-full bg-gradient-to-r from-ember to-flare"
              style={{ animation: "undo-drain 5.2s linear forwards" }}
            />
          </div>
          <style>{`@keyframes undo-drain { from { width: 100%; } to { width: 0%; } }`}</style>
        </div>
      )}
    </section>
  );
}
