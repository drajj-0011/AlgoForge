import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlgoForge — AI Pathfinding Laboratory",
  description:
    "Interactive laboratory for search & pathfinding AI. Draw a world, unleash A*, Dijkstra, BFS, DFS and Greedy Best-First, benchmark them live, and let the analyst engine explain every decision.",
  keywords: [
    "pathfinding",
    "algorithms",
    "A*",
    "Dijkstra",
    "visualization",
    "AI",
    "Next.js",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}