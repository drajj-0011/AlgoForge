import type { NewRun } from "@/db/schema";

interface SeedSpec {
  algorithm: string;
  heuristic: string;
  cols: number;
  rows: number;
  maze: string;
  wallCount: number;
  visited: number;
  pathLength: number;
  pathCost: number;
  computeMs: number;
  pilot: string;
  hoursAgo: number;
}

const SPECS: SeedSpec[] = [
  { algorithm: "astar", heuristic: "manhattan", cols: 61, rows: 29, maze: "division", wallCount: 402, visited: 356, pathLength: 92, pathCost: 92, computeMs: 1.62, pilot: "nova-k", hoursAgo: 1.2 },
  { algorithm: "dijkstra", heuristic: "manhattan", cols: 61, rows: 29, maze: "division", wallCount: 402, visited: 1104, pathLength: 92, pathCost: 92, computeMs: 4.87, pilot: "gr1dlock", hoursAgo: 2.1 },
  { algorithm: "astar", heuristic: "octile", cols: 55, rows: 31, maze: "backtracker", wallCount: 812, visited: 611, pathLength: 187, pathCost: 209.4, computeMs: 3.05, pilot: "m4z3runner", hoursAgo: 3.4 },
  { algorithm: "greedy", heuristic: "manhattan", cols: 61, rows: 29, maze: "scatter", wallCount: 486, visited: 148, pathLength: 118, pathCost: 143, computeMs: 0.71, pilot: "hexa", hoursAgo: 4.9 },
  { algorithm: "bfs", heuristic: "manhattan", cols: 49, rows: 25, maze: "none", wallCount: 0, visited: 1043, pathLength: 60, pathCost: 60, computeMs: 2.24, pilot: "ada.loops", hoursAgo: 6.3 },
  { algorithm: "dfs", heuristic: "manhattan", cols: 55, rows: 31, maze: "backtracker", wallCount: 812, visited: 764, pathLength: 421, pathCost: 421, computeMs: 1.98, pilot: "kernelpanik", hoursAgo: 8.7 },
  { algorithm: "astar", heuristic: "euclidean", cols: 67, rows: 33, maze: "scatter", wallCount: 512, visited: 402, pathLength: 104, pathCost: 122.6, computeMs: 2.11, pilot: "nova-k", hoursAgo: 11.5 },
  { algorithm: "dijkstra", heuristic: "manhattan", cols: 67, rows: 33, maze: "scatter", wallCount: 512, visited: 1687, pathLength: 98, pathCost: 103.2, computeMs: 7.42, pilot: "pathfinder_pk", hoursAgo: 14.2 },
  { algorithm: "greedy", heuristic: "octile", cols: 61, rows: 29, maze: "division", wallCount: 396, visited: 201, pathLength: 134, pathCost: 151.8, computeMs: 0.94, pilot: "hexa", hoursAgo: 18.6 },
  { algorithm: "bfs", heuristic: "manhattan", cols: 61, rows: 29, maze: "division", wallCount: 402, visited: 1098, pathLength: 92, pathCost: 92, computeMs: 2.67, pilot: "gr1dlock", hoursAgo: 23.1 },
  { algorithm: "astar", heuristic: "manhattan", cols: 73, rows: 35, maze: "backtracker", wallCount: 1204, visited: 934, pathLength: 246, pathCost: 246, computeMs: 4.38, pilot: "m4z3runner", hoursAgo: 29.8 },
  { algorithm: "dfs", heuristic: "manhattan", cols: 61, rows: 29, maze: "scatter", wallCount: 486, visited: 512, pathLength: 302, pathCost: 355, computeMs: 1.45, pilot: "kernelpanik", hoursAgo: 36.4 },
  { algorithm: "astar", heuristic: "octile", cols: 67, rows: 33, maze: "none", wallCount: 96, visited: 214, pathLength: 78, pathCost: 88.9, computeMs: 1.08, pilot: "ada.loops", hoursAgo: 44.9 },
  { algorithm: "greedy", heuristic: "euclidean", cols: 49, rows: 25, maze: "none", wallCount: 64, visited: 87, pathLength: 66, pathCost: 71, computeMs: 0.42, pilot: "pathfinder_pk", hoursAgo: 52.3 },
];

export function seedRuns(): NewRun[] {
  const now = Date.now();
  return SPECS.map((s) => ({
    algorithm: s.algorithm,
    heuristic: s.heuristic,
    cols: s.cols,
    rows: s.rows,
    maze: s.maze,
    wallCount: s.wallCount,
    visited: s.visited,
    pathLength: s.pathLength,
    pathCost: s.pathCost,
    computeMs: s.computeMs,
    efficiency: Math.round((s.pathLength / s.visited) * 1000) / 10,
    pilot: s.pilot,
    createdAt: new Date(now - s.hoursAgo * 3600_000),
  }));
}