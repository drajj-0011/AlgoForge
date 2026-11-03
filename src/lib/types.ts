export type AlgoId = "astar" | "dijkstra" | "bfs" | "dfs" | "greedy";
export type HeuristicId = "manhattan" | "euclidean" | "chebyshev" | "octile";
export type MazeId = "none" | "scatter" | "division" | "backtracker";
export type BrushId = "wall" | "weight" | "erase";
export type Phase = "idle" | "running" | "tracing" | "done" | "failed";

export interface SearchOptions {
  diagonal: boolean;
  heuristic: HeuristicId;
}

export interface SearchResult {
  algo: AlgoId;
  /** Cell indices in the order the algorithm expanded them. */
  visitOrder: number[];
  /** Cell indices from start to end (empty when unreachable). */
  path: number[];
  found: boolean;
  visited: number;
  pathLength: number;
  pathCost: number;
  computeMs: number;
  maxFrontier: number;
  gScore: Float64Array | null;
  hScore: Float64Array | null;
}

export interface RunRecord {
  id: number;
  algorithm: AlgoId;
  heuristic: string;
  cols: number;
  rows: number;
  maze: string;
  wallCount: number;
  visited: number;
  pathLength: number;
  pathCost: number;
  computeMs: number;
  efficiency: number;
  pilot: string;
  createdAt: string;
}

export interface BenchmarkRow {
  algo: AlgoId;
  visited: number;
  pathLength: number;
  pathCost: number;
  computeMs: number;
  found: boolean;
}

export interface BoardSnapshot {
  cols: number;
  rows: number;
  walls: number[];
  weights: number[];
  start: number;
  end: number;
}

export interface AnalysisPayload {
  board: BoardSnapshot;
  algo: AlgoId;
  heuristic: HeuristicId;
  diagonal: boolean;
  maze: MazeId;
  result: {
    visited: number;
    pathLength: number;
    pathCost: number;
    computeMs: number;
    found: boolean;
  };
}

export interface AnalysisResult {
  source: "engine" | "neural";
  headline: string;
  insights: string[];
  verdict: string;
}

export interface LabStats {
  totalRuns: number;
  nodesExplored: number;
  avgEfficiency: number;
  bestCost: number;
}