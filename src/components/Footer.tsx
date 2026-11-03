import Logo from "./Logo";
import { ALGO_IDS, ALGOS } from "@/lib/meta";

export default function Footer() {
  return (
    <footer className="relative border-t border-edge bg-ink-950/80">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row">
        <div className="flex items-center gap-3">
          <Logo size={24} />
          <div>
            <p className="font-display text-sm font-bold text-white">
              Algo<span className="text-neon">Forge</span>
            </p>
            <p className="font-mono text-[10px] tracking-wider text-slate-500">
              search · optimize · explain
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ALGO_IDS.map((id) => (
            <span
              key={id}
              title={ALGOS[id].name}
              className="h-2 w-2 rounded-full"
              style={{ background: ALGOS[id].color, boxShadow: `0 0 8px ${ALGOS[id].color}` }}
            />
          ))}
        </div>
        <p className="text-center font-mono text-[10px] leading-relaxed tracking-wider text-slate-500">
          NEXT.JS 16 · MONGODB / POSTGRESQL · CANVAS 2D
          <br />
          crafted as an open-source showpiece — MIT licensed
        </p>
      </div>
    </footer>
  );
}