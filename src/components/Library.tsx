"use client";

import { ALGOS, ALGO_IDS } from "@/lib/meta";
import { useReveal } from "@/lib/useReveal";
import type { AlgoId } from "@/lib/types";

function armAlgo(algo: AlgoId) {
  window.dispatchEvent(new CustomEvent("algoforge:pick", { detail: algo }));
}

function Prop({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider">
      <span className={on ? "text-volt" : "text-slate-600"}>{on ? "✓" : "✕"}</span>
      <span className={on ? "text-slate-400" : "text-slate-600"}>{label}</span>
    </span>
  );
}

const CHOOSER: { need: string; algo: AlgoId }[] = [
  { need: "Optimal path, fast as possible", algo: "astar" },
  { need: "Weighted terrain, zero assumptions", algo: "dijkstra" },
  { need: "Fewest steps, unweighted grid", algo: "bfs" },
  { need: "Tiny memory / maze carving", algo: "dfs" },
  { need: "Raw speed, detours acceptable", algo: "greedy" },
];

export default function Library() {
  const revealRef = useReveal<HTMLElement>();
  return (
    <section id="algorithms" ref={revealRef} className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="reveal mb-8">
        <p className="eyebrow">03 / the dossiers</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Know your <span className="text-grad">searchers.</span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          Five strategies, five personalities. Each dossier ships with complexity bounds,
          guarantees, and the exact pseudocode the engine runs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ALGO_IDS.map((id, idx) => {
          const a = ALGOS[id];
          return (
            <article
              key={id}
              className="reveal panel group relative flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
              style={{ transitionDelay: `${idx * 40}ms` }}
            >
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${a.color}, transparent)` }} />
              <div className="flex flex-1 flex-col px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">{a.name}</h3>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: a.color }}>
                      {a.tag}
                    </p>
                  </div>
                  <span
                    className="rounded-lg border px-2 py-1 font-mono text-[11px] font-bold"
                    style={{ color: a.color, borderColor: `${a.color}55`, background: a.dim }}
                  >
                    {a.short}
                  </span>
                </div>
                <p className="mt-3 flex-1 text-[13px] leading-relaxed text-slate-400">{a.blurb}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded border border-edge bg-ink-800/70 px-2 py-1 font-mono text-[9px] text-slate-300">
                    time {a.time}
                  </span>
                  <span className="rounded border border-edge bg-ink-800/70 px-2 py-1 font-mono text-[9px] text-slate-300">
                    space {a.space}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <Prop label="informed" on={a.informed} />
                  <Prop label="weight-aware" on={a.weighted} />
                  <Prop label="optimal*" on={id === "astar" || id === "dijkstra"} />
                </div>
                <p className="mt-2 font-mono text-[9px] leading-relaxed text-slate-600">* {a.optimal}</p>
                <details className="group/code mt-3 rounded-lg border border-edge bg-ink-950/70">
                  <summary className="cursor-pointer list-none px-3 py-2 font-mono text-[10px] tracking-wider text-slate-500 transition-colors hover:text-neon">
                    <span className="mr-1.5 inline-block transition-transform group-open/code:rotate-90">▸</span>
                    PSEUDOCODE
                  </summary>
                  <pre className="overflow-x-auto border-t border-edge px-3 py-2.5 font-mono text-[10px] leading-relaxed text-slate-400">
                    {a.pseudocode.map((line, i) => (
                      <div key={i} className="flex">
                        <span className="mr-3 w-4 shrink-0 select-none text-right text-slate-700">{i + 1}</span>
                        <span style={line.includes("←") ? { color: "#9fd8e8" } : undefined}>{line}</span>
                      </div>
                    ))}
                  </pre>
                </details>
                <a
                  href="#lab"
                  onClick={() => armAlgo(id)}
                  className="btn mt-4 w-full !py-2 text-[10px]"
                  style={{ borderColor: `${a.color}44` }}
                >
                  RUN {a.short} IN THE LAB →
                </a>
              </div>
            </article>
          );
        })}

        {/* chooser card */}
        <article className="reveal panel relative flex flex-col overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-volt via-neon to-mag" />
          <div className="flex flex-1 flex-col px-5 py-4">
            <h3 className="font-display text-lg font-bold text-white">Which one do I ship?</h3>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-volt">
              field guide
            </p>
            <div className="mt-4 flex-1 space-y-2">
              {CHOOSER.map((c) => (
                <a
                  key={c.algo}
                  href="#lab"
                  onClick={() => armAlgo(c.algo)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-edge bg-ink-900/60 px-3 py-2.5 transition-all hover:border-neon/40 hover:bg-ink-800/70"
                >
                  <span className="text-[12px] text-slate-400">{c.need}</span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
                    style={{ color: ALGOS[c.algo].color, background: ALGOS[c.algo].dim }}
                  >
                    {ALGOS[c.algo].short} →
                  </span>
                </a>
              ))}
            </div>
            <p className="mt-4 font-mono text-[9px] leading-relaxed text-slate-600">
              rule of thumb: if you can estimate the remaining distance without lying,
              A* is almost always the answer.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
