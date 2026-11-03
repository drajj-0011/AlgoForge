"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runSearch } from "@/lib/algorithms";
import { generateMaze, generateTerrain } from "@/lib/mazes";
import { ALGOS, ALGO_IDS, speedToRate } from "@/lib/meta";
import { labSound } from "@/lib/sound";
import { useReveal } from "@/lib/useReveal";
import type {
  AlgoId,
  AnalysisPayload,
  AnalysisResult,
  BenchmarkRow,
  MazeId,
  Phase,
  SearchResult,
} from "@/lib/types";
import Controls, { DEFAULT_SETTINGS, type LabSettings } from "./Controls";
import Benchmark from "./Benchmark";
import Analyst from "./Analyst";

interface Board {
  cols: number;
  rows: number;
  walls: Uint8Array;
  weights: Uint8Array;
  start: number;
  end: number;
}

interface Anim {
  result: SearchResult | null;
  revealedAt: Float64Array;
  visitIdx: number;
  pathIdx: number;
  acc: number;
  pathAcc: number;
  lastT: number;
  lastMetrics: number;
}

interface LiveMetrics {
  visited: number;
  pathLength: number;
  pathCost: number;
  computeMs: number;
  efficiency: number;
}

const freshAnim = (n: number): Anim => ({
  result: null,
  revealedAt: new Float64Array(n),
  visitIdx: 0,
  pathIdx: 0,
  acc: 0,
  pathAcc: 0,
  lastT: 0,
  lastMetrics: 0,
});

function hexRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const PHASE_LABEL: Record<Phase, string> = {
  idle: "READY — DRAW WALLS, DROP MUD, OR GENERATE A MAZE",
  running: "EXPANDING FRONTIER…",
  tracing: "TRACING ROUTE BACK TO SOURCE…",
  done: "ROUTE LOCKED · RUN LOGGED TO LEDGER",
  failed: "NO ROUTE — TARGET SEALED OFF",
};

export default function Lab() {
  const revealRef = useReveal<HTMLElement>();
  const [settings, setSettings] = useState<LabSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkRow[] | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<string>("");
  const [boardDims, setBoardDims] = useState<string>("");
  const [mazeOrigin, setMazeOrigin] = useState<string>("none");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "warn" } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerW = useRef(0);
  const boardRef = useRef<Board | null>(null);
  const animRef = useRef<Anim>(freshAnim(0));
  const phaseRef = useRef<Phase>("idle");
  const settingsRef = useRef(settings);
  const mazeOriginRef = useRef(mazeOrigin);
  const hoverCellRef = useRef(-1);
  const dragRef = useRef<{ mode: "paint" | "start" | "end" | null; erase: boolean; last: number }>({
    mode: null,
    erase: false,
    last: -1,
  });
  const analysisPayloadRef = useRef<AnalysisPayload | null>(null);
  const frameRef = useRef<(t: number) => void>(() => {});
  const demoPendingRef = useRef(true);
  const visualizeRef = useRef<(silent?: boolean) => void>(() => {});

  settingsRef.current = settings;
  phaseRef.current = phase;
  mazeOriginRef.current = mazeOrigin;

  const notify = useCallback((msg: string, tone: "ok" | "warn" = "ok") => {
    setToast({ msg, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(id);
  }, [toast]);

  /* ── persistence prefs ── */
  useEffect(() => {
    try {
      const pilot = localStorage.getItem("algoforge:pilot");
      const sound = localStorage.getItem("algoforge:sound");
      setSettings((s) => ({
        ...s,
        pilot: pilot ?? s.pilot,
        soundOn: sound === null ? s.soundOn : sound === "1",
      }));
      labSound.setEnabled(sound === null ? true : sound === "1");
    } catch {
      /* private mode */
    }
  }, []);

  const update = useCallback((patch: Partial<LabSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      if (patch.soundOn !== undefined) {
        labSound.setEnabled(patch.soundOn);
        try {
          localStorage.setItem("algoforge:sound", patch.soundOn ? "1" : "0");
        } catch { /* noop */ }
      }
      if (patch.pilot !== undefined) {
        try {
          localStorage.setItem("algoforge:pilot", patch.pilot);
        } catch { /* noop */ }
      }
      return next;
    });
  }, []);

  /* ── board lifecycle ── */
  const clearOverlay = useCallback((alsoPanels = true) => {
    const b = boardRef.current;
    animRef.current = freshAnim(b ? b.cols * b.rows : 0);
    phaseRef.current = "idle";
    setPhase("idle");
    setMetrics(null);
    setHoverInfo("");
    if (alsoPanels) {
      setAnalysis(null);
      setAnalyzing(false);
      setBenchmark(null);
    }
  }, []);

  const rebuildBoard = useCallback(
    (cols: number, rows: number) => {
      const start = ((rows / 2) | 0) * cols + Math.max(1, (cols * 0.12) | 0);
      const end = ((rows / 2) | 0) * cols + Math.min(cols - 2, (cols * 0.88) | 0);
      boardRef.current = {
        cols,
        rows,
        walls: new Uint8Array(cols * rows),
        weights: new Uint8Array(cols * rows).fill(1),
        start,
        end,
      };
      setBoardDims(`${cols}×${rows}`);
      setMazeOrigin("none");
      clearOverlay();
      // First-visit demo: carve a maze and let A* solve it unattended,
      // so the lab is alive before the visitor touches anything.
      if (demoPendingRef.current) {
        demoPendingRef.current = false;
        let seen = false;
        try {
          seen = sessionStorage.getItem("algoforge:demo") === "1";
        } catch { /* private mode */ }
        if (!seen && cols >= 12) {
          try {
            sessionStorage.setItem("algoforge:demo", "1");
          } catch { /* private mode */ }
          window.setTimeout(() => {
            const bb = boardRef.current;
            if (!bb || phaseRef.current !== "idle" || mazeOriginRef.current !== "none") return;
            const ss = settingsRef.current;
            bb.walls = generateMaze("division", bb.cols, bb.rows, bb.start, bb.end, ss.density / 100, ss.diagonal);
            setMazeOrigin("division");
            window.setTimeout(() => {
              if (phaseRef.current === "idle") visualizeRef.current(true);
            }, 400);
          }, 600);
        }
      }
    },
    [clearOverlay],
  );

  const sizeBoard = useCallback(() => {
    const w = containerW.current;
    if (w <= 0) return;
    const cell = settingsRef.current.cellSize;
    const targetH = Math.max(340, Math.min(560, w * 0.5));
    const cols = Math.max(12, Math.floor(w / cell));
    const rows = Math.max(10, Math.floor(targetH / cell));
    const b = boardRef.current;
    if (!b || b.cols !== cols || b.rows !== rows) rebuildBoard(cols, rows);
  }, [rebuildBoard]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      containerW.current = entries[0].contentRect.width;
      sizeBoard();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [sizeBoard]);

  useEffect(() => {
    sizeBoard();
  }, [settings.cellSize, sizeBoard]);

  /* ── run completion: ledger + analyst ── */
  const saveRun = useCallback((result: SearchResult) => {
    const b = boardRef.current;
    if (!b) return;
    const s = settingsRef.current;
    let wallCount = 0;
    for (let i = 0; i < b.walls.length; i++) wallCount += b.walls[i];
    const payload = {
      algorithm: s.algo,
      heuristic: s.heuristic,
      cols: b.cols,
      rows: b.rows,
      maze: mazeOriginRef.current,
      wallCount,
      visited: result.visited,
      pathLength: result.pathLength,
      pathCost: Math.round(result.pathCost * 100) / 100,
      computeMs: Math.round(result.computeMs * 1000) / 1000,
      efficiency:
        Math.round((result.pathLength / Math.max(1, result.visited)) * 1000) / 10,
      pilot: s.pilot.trim() || "you",
    };
    fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.run) {
          window.dispatchEvent(new CustomEvent("algoforge:runs"));
          notify(`Run #${d.run.id} logged to the ledger`);
        }
      })
      .catch(() => notify("Ledger offline — run not saved", "warn"));
  }, [notify]);

  const requestAnalysis = useCallback(() => {
    const payload = analysisPayloadRef.current;
    if (!payload) return;
    setAnalyzing(true);
    setAnalysis(null);
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.analysis) setAnalysis(d.analysis as AnalysisResult);
        else notify("Analyst unavailable", "warn");
      })
      .catch(() => notify("Analyst unavailable", "warn"))
      .finally(() => setAnalyzing(false));
  }, [notify]);

  const finish = useCallback(
    (found: boolean) => {
      const anim = animRef.current;
      const result = anim.result;
      const b = boardRef.current;
      if (!result || !b) return;
      if (phaseRef.current === "done" || phaseRef.current === "failed") return;
      phaseRef.current = found ? "done" : "failed";
      setPhase(phaseRef.current);
      setMetrics({
        visited: result.visited,
        pathLength: result.pathLength,
        pathCost: result.pathCost,
        computeMs: result.computeMs,
        efficiency:
          Math.round((result.pathLength / Math.max(1, result.visited)) * 1000) / 10,
      });
      const s = settingsRef.current;
      const wallIdx: number[] = [];
      const weightIdx: number[] = [];
      for (let i = 0; i < b.walls.length; i++) {
        if (b.walls[i]) wallIdx.push(i);
        else if (b.weights[i] > 1) weightIdx.push(i);
      }
      analysisPayloadRef.current = {
        board: {
          cols: b.cols,
          rows: b.rows,
          walls: wallIdx,
          weights: weightIdx,
          start: b.start,
          end: b.end,
        },
        algo: s.algo,
        heuristic: s.heuristic,
        diagonal: s.diagonal,
        maze: (mazeOriginRef.current === "custom" ? "scatter" : mazeOriginRef.current) as MazeId,
        result: {
          visited: result.visited,
          pathLength: result.pathLength,
          pathCost: result.pathCost,
          computeMs: result.computeMs,
          found,
        },
      };
      if (found) {
        labSound.chime();
        saveRun(result);
      } else {
        labSound.thud();
        notify("Target unreachable — the analyst will explain", "warn");
      }
      requestAnalysis();
    },
    [notify, requestAnalysis, saveRun],
  );

  /* ── actions ── */
  const visualize = useCallback((silent = false) => {
    const b = boardRef.current;
    if (!b) return;
    if (!silent) labSound.unlock();
    if (phaseRef.current === "running" || phaseRef.current === "tracing") {
      clearOverlay();
      notify("Search aborted", "warn");
      return;
    }
    clearOverlay();
    const s = settingsRef.current;
    const result = runSearch(
      s.algo,
      b.cols,
      b.rows,
      b.walls,
      b.weights,
      b.start,
      b.end,
      { diagonal: s.diagonal, heuristic: s.heuristic },
    );
    const anim = freshAnim(b.cols * b.rows);
    anim.result = result;
    anim.lastT = performance.now();
    animRef.current = anim;
    setMetrics({ visited: 0, pathLength: 0, pathCost: 0, computeMs: result.computeMs, efficiency: 0 });
    if (s.instant) {
      const t = performance.now();
      for (const i of result.visitOrder) anim.revealedAt[i] = t - 900;
      anim.visitIdx = result.visitOrder.length;
      anim.pathIdx = result.path.length;
      finish(result.found);
    } else {
      phaseRef.current = "running";
      setPhase("running");
    }
  }, [clearOverlay, finish, notify]);

  const benchmarkAll = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    labSound.unlock();
    const s = settingsRef.current;
    const rows: BenchmarkRow[] = ALGO_IDS.map((algo) => {
      const r = runSearch(algo, b.cols, b.rows, b.walls, b.weights, b.start, b.end, {
        diagonal: s.diagonal,
        heuristic: s.heuristic,
      });
      return {
        algo,
        visited: r.visited,
        pathLength: r.pathLength,
        pathCost: Math.round(r.pathCost * 100) / 100,
        computeMs: Math.round(r.computeMs * 1000) / 1000,
        found: r.found,
      };
    });
    setBenchmark(rows);
    labSound.tick(0.95);
  }, []);

  const generate = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    labSound.unlock();
    const s = settingsRef.current;
    b.walls = generateMaze(s.mazeId, b.cols, b.rows, b.start, b.end, s.density / 100, s.diagonal);
    b.weights =
      s.mazeId === "scatter"
        ? generateTerrain(b.cols, b.rows, 0.5)
        : new Uint8Array(b.cols * b.rows).fill(1);
    b.weights[b.start] = 1;
    b.weights[b.end] = 1;
    setMazeOrigin(s.mazeId);
    clearOverlay();
  }, [clearOverlay]);

  const randomize = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    labSound.unlock();
    const s = settingsRef.current;
    const midRow = (b.rows / 2) | 0;
    b.start = midRow * b.cols + 1 + ((Math.random() * (b.cols / 3)) | 0);
    b.end = midRow * b.cols + b.cols - 2 - ((Math.random() * (b.cols / 3)) | 0);
    b.walls = generateMaze("scatter", b.cols, b.rows, b.start, b.end, s.density / 100, s.diagonal);
    b.weights = generateTerrain(b.cols, b.rows, 0.65);
    b.weights[b.start] = 1;
    b.weights[b.end] = 1;
    setMazeOrigin("scatter");
    clearOverlay();
    notify("Fresh world rolled");
  }, [clearOverlay, notify]);

  const clearBoard = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    b.walls.fill(0);
    b.weights.fill(1);
    setMazeOrigin("none");
    clearOverlay();
  }, [clearOverlay]);

  const resetAll = useCallback(() => {
    setSettings((s) => ({
      ...DEFAULT_SETTINGS,
      pilot: s.pilot,
      soundOn: s.soundOn,
    }));
    const b = boardRef.current;
    if (b) {
      b.start = ((b.rows / 2) | 0) * b.cols + Math.max(1, (b.cols * 0.12) | 0);
      b.end = ((b.rows / 2) | 0) * b.cols + Math.min(b.cols - 2, (b.cols * 0.88) | 0);
    }
    clearBoard();
    notify("Lab reset to defaults");
  }, [clearBoard, notify]);

  const exportPng = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = `algoforge-${settingsRef.current.algo}-${boardDims}.png`;
    a.click();
    notify("Board exported as PNG");
  }, [boardDims, notify]);

  const exportJson = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    const s = settingsRef.current;
    const data = {
      generator: "AlgoForge v1.0",
      exportedAt: new Date().toISOString(),
      settings: s,
      board: {
        cols: b.cols,
        rows: b.rows,
        start: b.start,
        end: b.end,
        walls: Array.from(b.walls),
        weights: Array.from(b.weights),
      },
      lastRun: animRef.current.result
        ? {
            algo: animRef.current.result.algo,
            visited: animRef.current.result.visited,
            path: animRef.current.result.path,
            pathCost: animRef.current.result.pathCost,
            computeMs: animRef.current.result.computeMs,
          }
        : null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `algoforge-board-${boardDims}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Board + trace exported as JSON");
  }, [boardDims, notify]);

  const actionsRef = useRef({ visualize, benchmarkAll, generate, clearOverlay });
  actionsRef.current = { visualize, benchmarkAll, generate, clearOverlay };
  visualizeRef.current = visualize;

  /* ── keyboard + cross-component events ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        actionsRef.current.visualize();
      } else if (e.key === "m" || e.key === "M") actionsRef.current.generate();
      else if (e.key === "b" || e.key === "B") actionsRef.current.benchmarkAll();
      else if (e.key === "c" || e.key === "C") actionsRef.current.clearOverlay();
    };
    const onPick = (e: Event) => {
      const algo = (e as CustomEvent<AlgoId>).detail;
      if (ALGO_IDS.includes(algo)) {
        setSettings((s) => ({ ...s, algo }));
        notify(`${ALGOS[algo].name} armed in the lab`);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("algoforge:pick", onPick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("algoforge:pick", onPick);
    };
  }, [notify]);

  /* ── pointer painting ── */
  const cellAt = (e: React.PointerEvent): number => {
    const cv = canvasRef.current;
    const b = boardRef.current;
    if (!cv || !b) return -1;
    const rect = cv.getBoundingClientRect();
    const cell = rect.width / b.cols;
    const x = Math.floor((e.clientX - rect.left) / cell);
    const y = Math.floor((e.clientY - rect.top) / cell);
    if (x < 0 || y < 0 || x >= b.cols || y >= b.rows) return -1;
    return y * b.cols + x;
  };

  const paintCell = (c: number) => {
    const b = boardRef.current;
    if (!b || c === b.start || c === b.end) return;
    const brush = settingsRef.current.brush;
    const erase = dragRef.current.erase;
    if (brush === "wall") {
      b.walls[c] = erase ? 0 : 1;
      if (!erase) b.weights[c] = 1;
    } else if (brush === "weight") {
      if (!b.walls[c]) b.weights[c] = erase ? 1 : 5;
    } else {
      b.walls[c] = 0;
      b.weights[c] = 1;
    }
    if (animRef.current.result) clearOverlay();
    setMazeOrigin("custom");
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current === "running" || phaseRef.current === "tracing") {
      notify("Search in flight — abort or wait", "warn");
      return;
    }
    const b = boardRef.current;
    const c = cellAt(e);
    if (!b || c < 0) return;
    labSound.unlock();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (c === b.start) dragRef.current = { mode: "start", erase: false, last: c };
    else if (c === b.end) dragRef.current = { mode: "end", erase: false, last: c };
    else {
      const brush = settingsRef.current.brush;
      const erase =
        brush === "erase" ||
        (brush === "wall" && b.walls[c] === 1) ||
        (brush === "weight" && b.weights[c] > 1);
      dragRef.current = { mode: "paint", erase, last: c };
      paintCell(c);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = boardRef.current;
    const c = cellAt(e);
    hoverCellRef.current = c;
    if (!b) return;
    // inspection readout
    const res = animRef.current.result;
    if (c >= 0 && res && (phaseRef.current === "done" || phaseRef.current === "failed")) {
      const x = c % b.cols;
      const y = (c / b.cols) | 0;
      const g = res.gScore ? res.gScore[c] : Infinity;
      const h = res.hScore ? res.hScore[c] : null;
      const parts = [`(${x},${y})`];
      if (b.walls[c]) parts.push("wall");
      else {
        parts.push(Number.isFinite(g) ? `g ${g.toFixed(1)}` : "g ∞");
        if (h !== null) parts.push(`h ${h.toFixed(1)}`, `f ${(g + h).toFixed(1)}`);
        if (b.weights[c] > 1) parts.push("mud ×5");
      }
      setHoverInfo(parts.join(" · "));
    } else if (c < 0) setHoverInfo("");
    const drag = dragRef.current;
    if (!drag.mode || c < 0) return;
    if (drag.mode === "paint") {
      const last = drag.last;
      const lx = last % b.cols;
      const ly = (last / b.cols) | 0;
      const cx = c % b.cols;
      const cy = (c / b.cols) | 0;
      const steps = Math.max(Math.abs(cx - lx), Math.abs(cy - ly));
      for (let k = 1; k <= steps; k++) {
        const ix = Math.round(lx + ((cx - lx) * k) / steps);
        const iy = Math.round(ly + ((cy - ly) * k) / steps);
        paintCell(iy * b.cols + ix);
      }
      paintCell(c);
      drag.last = c;
    } else {
      const other = drag.mode === "start" ? b.end : b.start;
      if (c !== other && !b.walls[c]) {
        if (drag.mode === "start") b.start = c;
        else b.end = c;
        if (animRef.current.result) clearOverlay();
        drag.last = c;
      }
    }
  };

  const onPointerUp = () => {
    dragRef.current.mode = null;
  };

  /* ── the single render/replay loop ── */
  frameRef.current = (t: number) => {
    const b = boardRef.current;
    const cv = canvasRef.current;
    if (!b || !cv) return;
    if (!ctxRef.current) ctxRef.current = cv.getContext("2d");
    const ctx = ctxRef.current;
    if (!ctx) return;
    const s = settingsRef.current;
    const anim = animRef.current;
    const ph = phaseRef.current;
    const dt = anim.lastT === 0 ? 16 : Math.min(64, t - anim.lastT);
    anim.lastT = t;

    /* advance replay */
    if (ph === "running" && anim.result) {
      const total = anim.result.visitOrder.length;
      anim.acc += (speedToRate(s.speed) * dt) / 1000;
      const n = Math.floor(anim.acc);
      if (n > 0) {
        anim.acc -= n;
        const upto = Math.min(total, anim.visitIdx + n);
        for (; anim.visitIdx < upto; anim.visitIdx++) {
          anim.revealedAt[anim.result.visitOrder[anim.visitIdx]] = t;
        }
        labSound.tick(anim.visitIdx / Math.max(1, total));
        if (t - anim.lastMetrics > 90) {
          anim.lastMetrics = t;
          setMetrics((m) => (m ? { ...m, visited: anim.visitIdx } : m));
        }
      }
      if (anim.visitIdx >= total) {
        if (anim.result.found) {
          phaseRef.current = "tracing";
          setPhase("tracing");
        } else finish(false);
      }
    } else if (ph === "tracing" && anim.result) {
      const total = anim.result.path.length;
      const rate = Math.max(18, total / 0.85);
      anim.pathAcc += (rate * dt) / 1000;
      const next = Math.min(total, Math.floor(anim.pathAcc));
      if (next > anim.pathIdx) {
        anim.pathIdx = next;
        labSound.tick(0.6 + 0.4 * (next / Math.max(1, total)));
      }
      if (anim.pathIdx >= total) finish(true);
    }

    /* draw */
    const cell = s.cellSize;
    const w = b.cols * cell;
    const h = b.rows * cell;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#070b16";
    ctx.fillRect(0, 0, w, h);

    const [ar, ag, ab] = hexRgb(ALGOS[s.algo].color);
    const visitPrefix = `rgba(${ar},${ag},${ab},`;

    for (let i = 0; i < b.cols * b.rows; i++) {
      const x = (i % b.cols) * cell;
      const y = ((i / b.cols) | 0) * cell;
      if (b.walls[i]) {
        ctx.fillStyle = "#1a2340";
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ctx.fillStyle = "rgba(190,205,255,0.13)";
        ctx.fillRect(x + 1, y + 1, cell - 2, 2);
        continue;
      }
      if (b.weights[i] > 1) {
        ctx.fillStyle = "rgba(251,191,36,0.13)";
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        if (cell >= 15) {
          const cx0 = x + cell / 2;
          const cy0 = y + cell / 2;
          const r = cell * 0.14;
          ctx.fillStyle = "rgba(251,191,36,0.6)";
          ctx.beginPath();
          ctx.moveTo(cx0, cy0 - r);
          ctx.lineTo(cx0 + r, cy0);
          ctx.lineTo(cx0, cy0 + r);
          ctx.lineTo(cx0 - r, cy0);
          ctx.closePath();
          ctx.fill();
        }
      }
      const ra = anim.revealedAt[i];
      if (ra > 0) {
        const age = t - ra;
        const alpha = 0.15 + Math.max(0, 1 - age / 650) * 0.45;
        ctx.fillStyle = `${visitPrefix}${alpha.toFixed(3)})`;
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }

    /* grid lines */
    if (s.showGrid && cell >= 13) {
      ctx.strokeStyle = "rgba(148,163,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx <= b.cols; gx++) {
        ctx.moveTo(gx * cell + 0.5, 0);
        ctx.lineTo(gx * cell + 0.5, h);
      }
      for (let gy = 0; gy <= b.rows; gy++) {
        ctx.moveTo(0, gy * cell + 0.5);
        ctx.lineTo(w, gy * cell + 0.5);
      }
      ctx.stroke();
    }

    /* path */
    if (anim.result && anim.pathIdx > 1) {
      const path = anim.result.path;
      const n = anim.pathIdx;
      ctx.save();
      if (s.glow) {
        ctx.shadowColor = "rgba(163,230,53,0.9)";
        ctx.shadowBlur = 14;
      }
      ctx.strokeStyle = "#a3e635";
      ctx.lineWidth = Math.max(3, cell * 0.24);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash([cell * 0.72, cell * 0.4]);
      ctx.lineDashOffset = -(t / 26) % (cell * 1.12);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const cx0 = (path[i] % b.cols) * cell + cell / 2;
        const cy0 = ((path[i] / b.cols) | 0) * cell + cell / 2;
        if (i === 0) ctx.moveTo(cx0, cy0);
        else ctx.lineTo(cx0, cy0);
      }
      ctx.stroke();
      ctx.restore();
    }

    /* endpoints */
    const drawEndpoint = (idx: number, color: string, isStart: boolean) => {
      const cx0 = (idx % b.cols) * cell + cell / 2;
      const cy0 = ((idx / b.cols) | 0) * cell + cell / 2;
      const pulse = 1 + Math.sin(t / 420) * 0.12;
      ctx.save();
      if (s.glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = color;
      const r = cell * 0.34;
      roundRectPath(ctx, cx0 - r, cy0 - r, r * 2, r * 2, r * 0.45);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx0, cy0, cell * 0.52 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#04121a";
      if (isStart) {
        const tr = cell * 0.14;
        ctx.beginPath();
        ctx.moveTo(cx0 - tr * 0.7, cy0 - tr);
        ctx.lineTo(cx0 + tr, cy0);
        ctx.lineTo(cx0 - tr * 0.7, cy0 + tr);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(cx0, cy0, cell * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    drawEndpoint(b.start, "#22d3ee", true);
    drawEndpoint(b.end, "#e879f9", false);

    /* hover highlight */
    const hc = hoverCellRef.current;
    if (hc >= 0 && ph !== "running" && ph !== "tracing" && !dragRef.current.mode) {
      ctx.strokeStyle = "rgba(240,253,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect((hc % b.cols) * cell + 1, ((hc / b.cols) | 0) * cell + 1, cell - 2, cell - 2);
    }

    if (ph === "failed") {
      ctx.fillStyle = "rgba(244,63,94,0.05)";
      ctx.fillRect(0, 0, w, h);
    }
  };

  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      frameRef.current(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── UI ── */
  const busy = phase === "running" || phase === "tracing";
  const algoColor = ALGOS[settings.algo].color;

  return (
    <section id="lab" ref={revealRef} className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">01 / the lab</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Draw a world. <span className="text-grad">Unleash the search.</span>
          </h2>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[10px] text-slate-500 lg:flex">
          {[["SPACE", "run"], ["M", "maze"], ["B", "benchmark"], ["C", "clear"]].map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <kbd className="rounded border border-edge bg-ink-800 px-1.5 py-0.5 text-[9px] text-neon">{k}</kbd>
              {v}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* board column */}
        <div className="reveal min-w-0">
          <div className="panel overflow-hidden">
            {/* board header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#1a2340] ring-1 ring-edge" /> wall
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-flare/25 ring-1 ring-flare/50" /> mud ×5
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-neon" /> source
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-mag" /> target
                </span>
              </div>
              <span className="font-mono text-[10px] tracking-wider text-slate-500">
                {boardDims} · {hoverInfo || "drag nodes · paint terrain"}
              </span>
            </div>
            {/* canvas */}
            <div ref={containerRef} className="flex justify-center overflow-hidden bg-[#070b16] p-2 sm:p-3">
              <canvas
                ref={canvasRef}
                className="max-w-full cursor-crosshair rounded-md"
                style={{ touchAction: "none" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={() => {
                  hoverCellRef.current = -1;
                  setHoverInfo("");
                }}
                aria-label="Pathfinding board — click and drag to draw walls"
              />
            </div>
            {/* status strip */}
            <div className="flex items-center gap-2.5 border-t border-edge px-4 py-2.5">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${busy ? "live-dot" : ""}`}
                style={{
                  background: phase === "failed" ? "#fb7185" : phase === "done" ? "#a3e635" : algoColor,
                  boxShadow: `0 0 8px ${phase === "failed" ? "#fb7185" : phase === "done" ? "#a3e635" : algoColor}`,
                }}
              />
              <span className="truncate font-mono text-[10px] tracking-[0.14em] text-slate-400">
                {PHASE_LABEL[phase]}
              </span>
            </div>
          </div>

          {/* metrics */}
          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-5">
            {[
              { label: "explored", value: metrics ? metrics.visited.toLocaleString() : "—", color: algoColor },
              { label: "path steps", value: metrics && phase !== "running" ? String(metrics.pathLength) : "—", color: "#a3e635" },
              { label: "path cost", value: metrics && phase !== "running" ? metrics.pathCost.toFixed(1) : "—", color: "#e879f9" },
              { label: "compute", value: metrics ? `${metrics.computeMs.toFixed(2)}ms` : "—", color: "#fbbf24" },
              { label: "efficiency", value: metrics && phase === "done" ? `${metrics.efficiency.toFixed(1)}%` : "—", color: "#60a5fa" },
            ].map((m) => (
              <div key={m.label} className="bg-ink-900/90 px-3 py-3 text-center">
                <p className="font-mono text-base font-bold sm:text-lg" style={{ color: m.color }}>
                  {m.value}
                </p>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* control deck */}
        <div className="reveal min-w-0">
          <Controls
            settings={settings}
            onChange={update}
            phase={phase}
            onVisualize={() => visualize()}
            onBenchmark={benchmarkAll}
            onGenerate={generate}
            onRandomize={randomize}
            onClearBoard={clearBoard}
            onClearPath={() => clearOverlay()}
            onReset={resetAll}
            onExportPng={exportPng}
            onExportJson={exportJson}
          />
        </div>
      </div>

      {/* analysis row */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="reveal min-w-0">
          <Benchmark rows={benchmark} onRun={benchmarkAll} onPick={(a) => update({ algo: a })} busy={busy} />
        </div>
        <div className="reveal min-w-0">
          <Analyst analysis={analysis} analyzing={analyzing} phase={phase} onRetry={requestAnalysis} />
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div
          className={`anim-in fixed bottom-6 left-4 z-50 flex items-center gap-2.5 rounded-lg border px-4 py-3 font-mono text-xs shadow-2xl backdrop-blur-md sm:left-6 ${
            toast.tone === "ok"
              ? "border-neon/40 bg-ink-900/95 text-neon"
              : "border-flare/40 bg-ink-900/95 text-flare"
          }`}
          role="status"
        >
          <span className="text-sm">{toast.tone === "ok" ? "◈" : "◇"}</span>
          {toast.msg}
        </div>
      )}
    </section>
  );
}
