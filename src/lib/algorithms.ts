import { MinHeap } from "./heap";
import type { AlgoId, HeuristicId, SearchOptions, SearchResult } from "./types";

const SQRT2 = Math.SQRT2;

export function heuristicValue(
  dx: number,
  dy: number,
  id: HeuristicId,
): number {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  switch (id) {
    case "manhattan":
      return ax + ay;
    case "euclidean":
      return Math.sqrt(ax * ax + ay * ay);
    case "octile":
      return Math.max(ax, ay) + (SQRT2 - 1) * Math.min(ax, ay);
    case "chebyshev":
      return Math.max(ax, ay);
  }
}

interface Neighbor {
  idx: number;
  step: number;
}

function forEachNeighbor(
  u: number,
  cols: number,
  rows: number,
  walls: Uint8Array,
  diagonal: boolean,
  visit: (n: Neighbor) => void,
): void {
  const x = u % cols;
  const y = (u / cols) | 0;
  // Orthogonal
  if (x > 0 && !walls[u - 1]) visit({ idx: u - 1, step: 1 });
  if (x < cols - 1 && !walls[u + 1]) visit({ idx: u + 1, step: 1 });
  if (y > 0 && !walls[u - cols]) visit({ idx: u - cols, step: 1 });
  if (y < rows - 1 && !walls[u + cols]) visit({ idx: u + cols, step: 1 });
  if (!diagonal) return;
  // Diagonal — never cut through two touching walls
  if (x > 0 && y > 0 && !walls[u - cols - 1] && !walls[u - 1] && !walls[u - cols])
    visit({ idx: u - cols - 1, step: SQRT2 });
  if (x < cols - 1 && y > 0 && !walls[u - cols + 1] && !walls[u + 1] && !walls[u - cols])
    visit({ idx: u - cols + 1, step: SQRT2 });
  if (x > 0 && y < rows - 1 && !walls[u + cols - 1] && !walls[u - 1] && !walls[u + cols])
    visit({ idx: u + cols - 1, step: SQRT2 });
  if (x < cols - 1 && y < rows - 1 && !walls[u + cols + 1] && !walls[u + 1] && !walls[u + cols])
    visit({ idx: u + cols + 1, step: SQRT2 });
}

function reconstruct(parent: Int32Array, start: number, end: number): number[] {
  const path: number[] = [];
  let cur = end;
  let guard = parent.length + 1;
  while (cur !== -1 && guard-- > 0) {
    path.push(cur);
    if (cur === start) break;
    cur = parent[cur];
  }
  path.reverse();
  return path[0] === start ? path : [];
}

function pathTrueCost(
  path: number[],
  cols: number,
  weights: Uint8Array,
): number {
  let cost = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const dx = Math.abs((a % cols) - (b % cols));
    const dy = Math.abs(((a / cols) | 0) - ((b / cols) | 0));
    const step = dx + dy === 2 ? SQRT2 : 1;
    cost += step * weights[b];
  }
  return cost;
}

/**
 * Runs a full search synchronously and returns a replayable trace.
 * Pure + isomorphic: the same engine powers the canvas, the benchmark
 * track and the server-side AI analyst.
 */
export function runSearch(
  algo: AlgoId,
  cols: number,
  rows: number,
  walls: Uint8Array,
  weights: Uint8Array,
  start: number,
  end: number,
  opts: SearchOptions,
): SearchResult {
  const t0 = performance.now();
  const n = cols * rows;
  const parent = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const gScore = new Float64Array(n).fill(Infinity);
  const hScore =
    algo === "astar" || algo === "greedy" ? new Float64Array(n) : null;
  const ex = end % cols;
  const ey = (end / cols) | 0;
  const h = (i: number): number => {
    const v = heuristicValue((i % cols) - ex, ((i / cols) | 0) - ey, opts.heuristic);
    if (hScore) hScore[i] = v;
    return v;
  };

  const visitOrder: number[] = [];
  let maxFrontier = 0;
  let found = false;

  gScore[start] = 0;

  if (algo === "bfs" || algo === "dfs") {
    const seen = new Uint8Array(n);
    const container: number[] = [start];
    seen[start] = 1;
    while (container.length > 0) {
      const u = algo === "bfs" ? container.shift()! : container.pop()!;
      if (closed[u]) continue;
      closed[u] = 1;
      visitOrder.push(u);
      if (container.length > maxFrontier) maxFrontier = container.length;
      if (u === end) {
        found = true;
        break;
      }
      forEachNeighbor(u, cols, rows, walls, opts.diagonal, ({ idx, step }) => {
        if (seen[idx] || closed[idx]) return;
        seen[idx] = 1;
        parent[idx] = u;
        gScore[idx] = gScore[u] + step * weights[idx];
        container.push(idx);
      });
    }
  } else {
    const open = new MinHeap();
    const startP = algo === "greedy" ? h(start) : algo === "astar" ? h(start) : 0;
    open.push(start, startP);
    while (open.size > 0) {
      const u = open.pop();
      if (closed[u]) continue;
      closed[u] = 1;
      visitOrder.push(u);
      if (open.size > maxFrontier) maxFrontier = open.size;
      if (u === end) {
        found = true;
        break;
      }
      forEachNeighbor(u, cols, rows, walls, opts.diagonal, ({ idx, step }) => {
        if (closed[idx]) return;
        const tentative = gScore[u] + step * weights[idx];
        if (algo === "greedy") {
          if (gScore[idx] !== Infinity) return;
          gScore[idx] = tentative;
          parent[idx] = u;
          open.push(idx, h(idx));
        } else if (tentative < gScore[idx] - 1e-9) {
          gScore[idx] = tentative;
          parent[idx] = u;
          open.push(idx, algo === "astar" ? tentative + h(idx) : tentative);
        }
      });
    }
  }

  const path = found ? reconstruct(parent, start, end) : [];
  const computeMs = performance.now() - t0;
  return {
    algo,
    visitOrder,
    path,
    found: found && path.length > 0,
    visited: visitOrder.length,
    pathLength: Math.max(0, path.length - 1),
    pathCost: path.length > 1 ? pathTrueCost(path, cols, weights) : 0,
    computeMs,
    maxFrontier,
    gScore,
    hScore,
  };
}

/** Quick reachability probe used to keep generated mazes solvable. */
export function isReachable(
  cols: number,
  rows: number,
  walls: Uint8Array,
  start: number,
  end: number,
  diagonal: boolean,
): boolean {
  const seen = new Uint8Array(cols * rows);
  const queue: number[] = [start];
  seen[start] = 1;
  while (queue.length > 0) {
    const u = queue.shift()!;
    if (u === end) return true;
    forEachNeighbor(u, cols, rows, walls, diagonal, ({ idx }) => {
      if (!seen[idx]) {
        seen[idx] = 1;
        queue.push(idx);
      }
    });
  }
  return false;
}