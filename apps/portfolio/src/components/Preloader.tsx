import { useEffect, useRef, useState } from "react";

/**
 * A wafer test, showing real milestones rather than a timer: fonts resolved and
 * the renderer created. The build ships no model or texture files — the plot is
 * generated in code — so there is genuinely little to wait for.
 */
const DIES = 96;

export function Preloader({ done, onGone }: { done: boolean; onGone: () => void }) {
  const [lit, setLit] = useState(0);
  const [full, setFull] = useState(false);
  const [gone, setGone] = useState(false);

  // Progress survives `done` flipping, so the fill never resets mid-flight.
  const v = useRef(0);
  const start = useRef(performance.now());
  // Held in a ref so a fresh callback identity cannot restart the exit timer.
  const exit = useRef(onGone);
  exit.current = onGone;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const floor = Math.min(1, (performance.now() - start.current) / 900);
      const target = (done ? 1 : Math.min(0.75, floor)) * DIES;
      v.current += (target - v.current) * 0.16;
      setLit(v.current);
      if (done && v.current > DIES - 0.6) { setFull(true); return; } // stop the loop
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  useEffect(() => {
    if (!full) return;
    const t = setTimeout(() => { setGone(true); exit.current(); }, 240);
    return () => clearTimeout(t);
  }, [full]);

  if (gone) return null;
  const n = Math.round(lit);

  return (
    <div className="wafer" role="status" aria-live="polite">
      <div className="wafer-grid">
        {Array.from({ length: DIES }, (_, i) => (
          <i key={i} className={i < n ? (i % 17 === 5 ? "fail" : "pass") : ""} />
        ))}
      </div>
      <p className="lab">Wafer test — {Math.round((n / DIES) * 100)}%</p>
    </div>
  );
}
