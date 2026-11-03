"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";

const LINKS = [
  { id: "lab", label: "The Lab" },
  { id: "ledger", label: "Run Ledger" },
  { id: "algorithms", label: "Algorithms" },
  { id: "ship", label: "Ship It" },
];

export default function Nav() {
  const [active, setActive] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-edge bg-ink-950/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div
        className="absolute left-0 top-0 h-[2px] bg-gradient-to-r from-neon via-viol to-mag transition-[width] duration-150"
        style={{ width: `${progress * 100}%` }}
      />
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Algo<span className="text-neon">Forge</span>
          </span>
          <span className="mt-0.5 hidden rounded border border-edge bg-ink-800/70 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-viol sm:inline">
            v1.0
          </span>
        </a>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={`rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                active === l.id
                  ? "bg-neon/10 text-neon"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>
        <a href="#lab" className="btn btn-primary !py-2 text-[11px]">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 1.5v9l8-4.5-8-4.5z" />
          </svg>
          Launch Lab
        </a>
      </nav>
    </header>
  );
}