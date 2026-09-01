import { create } from "zustand";
import { structures, type SectionKey } from "../content/site";

export type Phase = "preload" | "hook" | "campus";

type S = {
  phase: Phase;
  /** Index into `structures`, or -1. */
  selected: number;
  hovered: number;
  visited: SectionKey[];
  reduced: boolean;

  setPhase: (p: Phase) => void;
  select: (i: number) => void;
  clear: () => void;
  hover: (i: number) => void;
  enter: () => void;
};

const SEEN_KEY = "dtc.seenHook";

function seenBefore() {
  try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ }
}

export const useStore = create<S>((set, get) => ({
  phase: "preload",
  selected: -1,
  hovered: -1,
  visited: [],
  reduced:
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches,

  setPhase: (p) => set({ phase: p }),

  select: (i) => {
    const s = structures[i];
    if (!s) return;
    const visited = get().visited.includes(s.section)
      ? get().visited
      : [...get().visited, s.section];
    set({ selected: i, visited });
  },

  clear: () => set({ selected: -1 }),
  hover: (i) => set({ hovered: i }),

  enter: () => { markSeen(); set({ phase: "campus" }); }
}));

/** Repeat visitors are not made to sit through the hook again. */
export const shouldSkipHook = () => seenBefore();

/**
 * The sun is driven by how much of the site has been read. A hub with orbit
 * controls has no spare scroll axis, so progress through the content — not
 * page scroll — is what moves the day from morning to dusk.
 */
export function sunFromVisits(visited: SectionKey[]) {
  const total = 9;
  return Math.min(1, visited.length / total);
}
