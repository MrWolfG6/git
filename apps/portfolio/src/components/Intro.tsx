import { useEffect, useRef, useState } from "react";
import { CellWord } from "./Cells";
import { identity } from "../content/site";

/**
 * The load screen: a portrait screened into the brand field, so the face
 * emerges from the ground rather than sitting on it. Screen blending is what
 * makes the blend seamless — the cut-out's black surround contributes nothing,
 * so there is no edge anywhere for the eye to catch.
 *
 * It doubles as the progress display and hands off to the die pull-back.
 */
export function Intro({ done, onGone }: { done: boolean; onGone: () => void }) {
  const [pct, setPct] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  const v = useRef(0);
  const start = useRef(performance.now());
  const exit = useRef(onGone);
  exit.current = onGone;

  // Real progress: fonts and the renderer. Never runs ahead of the truth.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const floor = Math.min(1, (performance.now() - start.current) / 800);
      const target = done ? 1 : Math.min(0.72, floor);
      v.current += (target - v.current) * 0.14;
      setPct(v.current);
      if (done && v.current > 0.995) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  // Hold on the face, then dissolve into the die.
  useEffect(() => {
    if (!done) return;
    const a = setTimeout(() => setLeaving(true), 1150);
    const b = setTimeout(() => { setGone(true); exit.current(); }, 2050);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [done]);

  if (gone) return null;

  return (
    <div className={"intro" + (leaving ? " out" : "")} role="status" aria-live="polite">
      <div className="intro-ground" />
      <img className="intro-face" src="portrait.webp" alt="" aria-hidden="true" />
      <div className="intro-type" aria-hidden="true">{identity.name.toUpperCase()}</div>
      <div className="intro-scan" aria-hidden="true" />

      <div className="intro-brand">
        <CellWord word="PWM" flood={{ m: [0], c: [2] }} />
      </div>
      <div className="intro-corner">
        {identity.status.map((s) => (
          <span key={s.k}>{s.v}</span>
        ))}
      </div>

      <div className="intro-bar">
        <span>{identity.role}</span>
        <i><b style={{ transform: `scaleX(${pct})` }} /></i>
        <span>Wafer test {Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
}
