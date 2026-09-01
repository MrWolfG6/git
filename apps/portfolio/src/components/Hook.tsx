import { useEffect, useState } from "react";
import { CellName } from "./Cells";
import { identity } from "../content/site";
import { useStore } from "../state/store";

const TOTAL_CELLS = identity.nameRows.join("").length;

/**
 * The type layer over the pull-back. The name arrives one cell at a time while
 * the camera is still on the die; the cells invert from die-dark to campus-white
 * as the field resolves; the thesis and the single control land last.
 */
export function Hook() {
  const enter = useStore((s) => s.enter);
  const reduced = useStore((s) => s.reduced);
  const [cells, setCells] = useState(reduced ? TOTAL_CELLS : 0);
  const [lit, setLit] = useState(reduced);
  const [thesis, setThesis] = useState(reduced);
  const [cta, setCta] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const timers: number[] = [];
    for (let i = 1; i <= TOTAL_CELLS; i++) {
      timers.push(window.setTimeout(() => setCells(i), 120 + i * 62));
    }
    timers.push(window.setTimeout(() => setLit(true), 3400));
    timers.push(window.setTimeout(() => setThesis(true), 4600));
    timers.push(window.setTimeout(() => setCta(true), 6200));
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  return (
    <>
      <div className={"hook" + (lit ? " lit" : "")}>
        <h1 style={{ margin: 0 }}>
          <span className="sr">{identity.name}</span>
          <CellName litUpTo={cells} />
        </h1>
        <p className={"thesis" + (thesis ? " on" : "")}>{identity.thesis}</p>
        <button className={"enter" + (cta ? " on" : "")} onClick={enter} tabIndex={cta ? 0 : -1}>
          Enter
        </button>
      </div>
      {!cta && !reduced && (
        <button className="skip" onClick={enter}>Skip</button>
      )}
    </>
  );
}
