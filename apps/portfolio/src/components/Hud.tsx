import { CellWord } from "./Cells";
import { SectionBody } from "./Sections";
import { structures } from "../content/site";
import { useStore } from "../state/store";

/**
 * Every 3D hotspot has a real button here. The campus is navigable, and the
 * whole site readable, without ever touching the canvas.
 */
export function Hud() {
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const clear = useStore((s) => s.clear);
  const hover = useStore((s) => s.hover);
  const s = selected >= 0 ? structures[selected] : null;

  return (
    <>
      <div className="hud-top">
        <div className="brand">
          <CellWord word="PWM" flood={{ m: [0], c: [2] }} />
          <span className="lab">Second year · Data Science</span>
        </div>
      </div>

      <nav className="dir" aria-label="Campus directory">
        <h2>Directory</h2>
        <div className="dir-list">
          {structures.map((b, i) => (
            <button
              key={b.id}
              onClick={() => select(i)}
              onFocus={() => hover(i)}
              onBlur={() => hover(-1)}
              onMouseEnter={() => hover(i)}
              onMouseLeave={() => hover(-1)}
              aria-current={selected === i}
            >
              {b.name.replace("Main Building · ", "")}
            </button>
          ))}
        </div>
      </nav>

      <aside className={"panel" + (s ? " open" : "")} aria-hidden={!s}>
        {s && (
          <>
            <button className="panel-close" onClick={clear} aria-label="Close">×</button>
            <div className="panel-head">
              <div className="panel-kind">{s.kind}</div>
              <h2>{s.name}</h2>
              <p className="panel-blurb">{s.blurb}</p>
            </div>
            <div className="panel-body"><SectionBody k={s.section} /></div>
          </>
        )}
      </aside>

      {!s && <p className="hint">Drag to orbit · click a building</p>}
    </>
  );
}
