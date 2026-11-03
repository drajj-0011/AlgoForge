"use client";

import { useState } from "react";
import { useReveal } from "@/lib/useReveal";

const COMMANDS = [
  "# run it locally",
  "git clone https://github.com/you/algoforge.git",
  "cd algoforge && npm install",
  "# add MONGODB_URI to .env — no migration needed",
  "npm run dev                 # → localhost:3000",
  "",
  "# publish it as your own showpiece repo",
  "gh repo create algoforge --public --source=. --push",
];

const TREE: { depth: number; name: string; note?: string; hot?: boolean }[] = [
  { depth: 0, name: "algoforge/" },
  { depth: 1, name: "src/lib/", note: "the engine" },
  { depth: 2, name: "algorithms.ts", note: "5 searches, one pure API", hot: true },
  { depth: 2, name: "heap.ts", note: "binary min-heap", hot: true },
  { depth: 2, name: "mazes.ts", note: "division · backtracker · noise", hot: true },
  { depth: 2, name: "analysis.ts", note: "server-side run auditor", hot: true },
  { depth: 1, name: "src/components/lab/", note: "canvas + control deck" },
  { depth: 2, name: "Lab.tsx", note: "single-rAF render loop" },
  { depth: 2, name: "Controls.tsx", note: "12 live instruments" },
  { depth: 1, name: "src/app/api/", note: "runs · stats · analyze" },
  { depth: 1, name: "src/db/runs.ts", note: "mongo + postgres adapter", hot: true },
  { depth: 1, name: "src/db/schema.ts", note: "optional drizzle schema" },
  { depth: 1, name: "README.md", note: "badges, gifs, architecture" },
];

function Badge({ left, right, color }: { left: string; right: string; color: string }) {
  return (
    <span className="flex overflow-hidden rounded font-mono text-[9px] font-semibold tracking-wider">
      <span className="bg-ink-700 px-2 py-1 text-slate-300">{left}</span>
      <span className="px-2 py-1 text-ink-950" style={{ background: color }}>{right}</span>
    </span>
  );
}

export default function GitHubSection() {
  const revealRef = useReveal<HTMLElement>();
  const [copied, setCopied] = useState(false);

  const copyCommands = async () => {
    const text = COMMANDS.filter((c) => c && !c.startsWith("#")).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section id="ship" ref={revealRef} className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="reveal mb-8">
        <p className="eyebrow">04 / ship it</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your next <span className="text-grad">star-magnet repo.</span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          AlgoForge is structured like a repo people actually star: a dependency-free
          algorithm engine, an isomorphic core shared by client and server, a real
          database ledger, and a README story worth reading.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* left: badges + terminal */}
        <div className="reveal flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge left="build" right="passing" color="#a3e635" />
            <Badge left="typescript" right="strict" color="#22d3ee" />
            <Badge left="engine deps" right="zero" color="#e879f9" />
            <Badge left="database" right="mongo / postgres" color="#fbbf24" />
            <Badge left="license" right="MIT" color="#a78bfa" />
          </div>
          <div className="panel flex-1 overflow-hidden">
            <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-ember/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-flare/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-volt/80" />
                <span className="ml-2 font-mono text-[10px] text-slate-500">zsh — algoforge</span>
              </span>
              <button type="button" onClick={copyCommands} className="btn !px-2.5 !py-1 text-[9px]">
                {copied ? "✓ COPIED" : "COPY"}
              </button>
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-loose">
              {COMMANDS.map((c, i) =>
                c === "" ? (
                  <div key={i}>&nbsp;</div>
                ) : c.startsWith("#") ? (
                  <div key={i} className="text-slate-600">{c}</div>
                ) : (
                  <div key={i} className="text-slate-300">
                    <span className="mr-2 select-none text-volt">$</span>
                    {c.includes("#") ? (
                      <>
                        {c.split("#")[0]}
                        <span className="text-slate-600">#{c.split("#")[1]}</span>
                      </>
                    ) : (
                      c
                    )}
                  </div>
                ),
              )}
            </pre>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { n: "5", l: "algorithms" },
              { n: "3", l: "maze generators" },
              { n: "4", l: "heuristic functions" },
              { n: "1", l: "rAF loop, ever" },
            ].map((s) => (
              <div key={s.l} className="panel px-3 py-3 text-center">
                <p className="font-mono text-xl font-bold text-neon">{s.n}</p>
                <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* right: file tree */}
        <div className="reveal panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-400">
              repository anatomy
            </span>
            <span className="font-mono text-[9px] text-slate-600">tree · main</span>
          </div>
          <div className="px-4 py-3 font-mono text-[11.5px] leading-[1.9]">
            {TREE.map((t, i) => (
              <div key={i} className="flex items-baseline whitespace-nowrap">
                <span className="select-none text-slate-700">
                  {"│  ".repeat(Math.max(0, t.depth - 1))}
                  {t.depth > 0 ? "├─ " : ""}
                </span>
                <span className={t.depth < 2 && t.name.endsWith("/") ? "font-semibold text-viol" : t.hot ? "text-neon" : "text-slate-300"}>
                  {t.name}
                </span>
                {t.note && (
                  <span className="ml-3 truncate text-[10px] text-slate-600"># {t.note}</span>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-edge px-4 py-3.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-slate-500">why it earns stars</p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-slate-400">
              <li className="flex gap-2"><span className="text-volt">✓</span> Pure TypeScript engine — readable in one sitting, testable without a browser</li>
              <li className="flex gap-2"><span className="text-volt">✓</span> The same code animates the canvas and audits runs on the server</li>
              <li className="flex gap-2"><span className="text-volt">✓</span> Real persistence: seeded MongoDB ledger, plus a Drizzle/PostgreSQL fallback</li>
              <li className="flex gap-2"><span className="text-volt">✓</span> Optional GPT layer that degrades to a deterministic analyst — never breaks</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}