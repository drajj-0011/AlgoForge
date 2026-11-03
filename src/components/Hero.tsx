"use client";

import { useEffect, useRef, useState } from "react";
import { ALGO_IDS, ALGOS } from "@/lib/meta";
import type { LabStats } from "@/lib/types";

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || value <= 0) return;
    started.current = true;
    const t0 = performance.now();
    const dur = 1300;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span>
      {display.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

const C = 26; // svg cell size
const px = (x: number) => x * C + C / 2;

const WALLS: [number, number][] = [
  [4, 3], [4, 4], [4, 5], [4, 6], [4, 7],
  [7, 1], [7, 2], [7, 3], [7, 4], [7, 5],
  [10, 5], [10, 6], [10, 7],
  [2, 1], [2, 2], [12, 2], [5, 8],
];

const VISITED: [number, number][] = [
  [1, 3], [1, 5], [2, 3], [2, 4], [2, 5], [2, 6], [3, 1], [3, 2],
  [3, 3], [3, 4], [3, 5], [3, 6], [4, 2], [5, 2], [5, 3], [5, 4],
  [5, 5], [5, 6], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 7],
  [7, 6], [8, 5], [8, 6], [8, 7], [9, 4], [9, 5], [9, 6], [10, 4],
  [11, 3], [11, 5], [11, 4],
];

const PATH: [number, number][] = [
  [1, 4], [2, 4], [3, 4], [3, 3], [3, 2], [4, 2], [5, 2], [6, 2],
  [6, 3], [6, 4], [6, 5], [6, 6], [7, 6], [8, 6], [9, 6], [9, 5],
  [9, 4], [10, 4], [11, 4],
];

const TICKER = [
  "A* = Dijkstra + a heuristic that never lies",
  "binary heap · O(log n) frontier ops",
  "Manhattan is admissible on 4-way grids",
  "Octile unlocks diagonal optimality",
  "BFS ripples · DFS plunges",
  "greedy is fast until the maze says no",
  "recursive division builds chambers",
  "the backtracker carves perfect mazes",
  "every run audited against ground truth",
];

export default function Hero() {
  const [stats, setStats] = useState<LabStats | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.stats) setStats(d.stats as LabStats);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const pathD = PATH.map(([x, y], i) => `${i === 0 ? "M" : "L"}${px(x)},${px(y)}`).join(" ");

  return (
    <section id="top" className="relative overflow-hidden pt-28 md:pt-36">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        {/* copy */}
        <div>
          <p className="eyebrow anim-in flex items-center gap-3" style={{ animationDelay: "0.05s" }}>
            <span className="inline-block h-px w-8 bg-neon/60" />
            open-source algorithm laboratory
          </p>
          <h1
            className="anim-in mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl xl:text-7xl"
            style={{ animationDelay: "0.15s" }}
          >
            Watch algorithms
            <br />
            <span className="text-grad">think.</span>
          </h1>
          <p
            className="anim-in mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
            style={{ animationDelay: "0.28s" }}
          >
            Draw a world. Unleash five search algorithms on it. Benchmark them
            head-to-head, audit every path against ground truth, and let the
            analyst engine explain <em className="text-slate-200 not-italic">why</em> each
            decision was made — all persisted to a live MongoDB or PostgreSQL ledger.
          </p>
          <div className="anim-in mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.4s" }}>
            <a href="#lab" className="btn btn-primary !px-6 !py-3 text-[13px]">
              Enter the lab
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#ledger" className="btn !px-6 !py-3 text-[13px]">
              Read the run ledger
            </a>
          </div>
          {/* live stats */}
          <div
            className="anim-in mt-10 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-xl border border-edge bg-edge"
            style={{ animationDelay: "0.52s" }}
          >
            {[
              { label: "runs logged", value: stats?.totalRuns ?? 0, suffix: "" },
              { label: "nodes explored", value: stats?.nodesExplored ?? 0, suffix: "" },
              { label: "algorithms", value: 5, suffix: "" },
            ].map((s) => (
              <div key={s.label} className="bg-ink-900/90 px-4 py-3.5">
                <p className="font-mono text-xl font-bold text-neon sm:text-2xl">
                  {s.value > 0 ? <CountUp value={s.value} suffix={s.suffix} /> : "—"}
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          {/* algo legend */}
          <div className="anim-in mt-6 flex flex-wrap gap-2" style={{ animationDelay: "0.62s" }}>
            {ALGO_IDS.map((id) => (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-full border border-edge bg-ink-900/70 px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-300"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: ALGOS[id].color, boxShadow: `0 0 6px ${ALGOS[id].color}` }}
                />
                {ALGOS[id].short}
              </span>
            ))}
          </div>
        </div>

        {/* animated board */}
        <div className="anim-in relative" style={{ animationDelay: "0.35s" }}>
          <div className="panel relative overflow-hidden p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.2em] text-slate-500">
                LIVE TRACE · A* / MANHATTAN
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-volt">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-volt" />
                SOLVING
              </span>
            </div>
            <svg viewBox="0 0 364 260" className="w-full" role="img" aria-label="Animated A* pathfinding trace">
              <defs>
                <pattern id="hgrid" width={C} height={C} patternUnits="userSpaceOnUse">
                  <path d={`M ${C} 0 L 0 0 0 ${C}`} fill="none" stroke="rgba(148,163,255,0.08)" strokeWidth="1" />
                </pattern>
                <filter id="hglow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3.2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width="364" height="260" fill="#070b16" rx="8" />
              <rect width="364" height="260" fill="url(#hgrid)" rx="8" />
              {VISITED.map(([x, y], i) => (
                <rect
                  key={`v${i}`}
                  className="hero-cell"
                  x={x * C + 2}
                  y={y * C + 2}
                  width={C - 4}
                  height={C - 4}
                  rx="4"
                  fill="rgba(34,211,238,0.30)"
                  style={{ animationDelay: `${(i % 12) * 0.22}s` }}
                />
              ))}
              {WALLS.map(([x, y], i) => (
                <rect
                  key={`w${i}`}
                  x={x * C + 1.5}
                  y={y * C + 1.5}
                  width={C - 3}
                  height={C - 3}
                  rx="4"
                  fill="#1c2745"
                  stroke="rgba(148,163,255,0.22)"
                  strokeWidth="1"
                />
              ))}
              <path d={pathD} fill="none" stroke="rgba(163,230,53,0.24)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              <path d={pathD} className="hero-path" fill="none" stroke="#a3e635" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#hglow)" />
              <circle cx={px(1)} cy={px(4)} r="7.5" fill="#22d3ee" filter="url(#hglow)" />
              <circle cx={px(1)} cy={px(4)} r="11.5" fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth="1.5" />
              <circle cx={px(11)} cy={px(4)} r="7.5" fill="#e879f9" filter="url(#hglow)" />
              <circle cx={px(11)} cy={px(4)} r="11.5" fill="none" stroke="rgba(232,121,249,0.5)" strokeWidth="1.5" />
            </svg>
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px]">
              <div className="rounded-md border border-edge bg-ink-900/80 px-2.5 py-2">
                <span className="text-slate-500">EXPLORED </span>
                <span className="text-neon">35</span>
              </div>
              <div className="rounded-md border border-edge bg-ink-900/80 px-2.5 py-2">
                <span className="text-slate-500">PATH </span>
                <span className="text-volt">18</span>
              </div>
              <div className="rounded-md border border-edge bg-ink-900/80 px-2.5 py-2">
                <span className="text-slate-500">COST </span>
                <span className="text-mag">18.0</span>
              </div>
            </div>
          </div>
          <div className="float-chip absolute -left-3 -top-4 rounded-lg border border-neon/40 bg-ink-900/95 px-3 py-1.5 font-mono text-[11px] text-neon shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]">
            f(n) = g(n) + h(n)
          </div>
          <div
            className="float-chip absolute -bottom-4 right-6 rounded-lg border border-viol/40 bg-ink-900/95 px-3 py-1.5 font-mono text-[11px] text-viol shadow-[0_0_24px_-6px_rgba(167,139,250,0.6)]"
            style={{ animationDelay: "1.4s" }}
          >
            O(E log V)
          </div>
        </div>
      </div>

      {/* fact ticker */}
      <div className="relative border-y border-edge bg-ink-900/60 py-3 backdrop-blur-sm">
        <div className="flex overflow-hidden" aria-hidden="true">
          <div className="ticker-track flex shrink-0 items-center gap-8 pr-8">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-8 whitespace-nowrap font-mono text-[11px] tracking-wider text-slate-500">
                {t}
                <span className="text-neon/60">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}