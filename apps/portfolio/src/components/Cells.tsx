import { identity } from "../content/site";

type Flood = { m: readonly number[]; c: readonly number[] };

export function CellWord({
  word, flood, cls = "", onIndex
}: { word: string; flood?: Flood; cls?: string; onIndex?: (i: number) => boolean }) {
  return (
    <span className={"tiles " + cls} aria-hidden="true">
      {word.split("").map((ch, i) => {
        const k = flood?.m.includes(i) ? " m" : flood?.c.includes(i) ? " c" : "";
        const on = onIndex ? (onIndex(i) ? " on" : "") : "";
        return <span key={i} className={"tile" + k + on}>{ch}</span>;
      })}
    </span>
  );
}

/** The masthead, stepped over three rows exactly as the logotype steps. */
export function CellName({ litUpTo }: { litUpTo?: number }) {
  let n = 0;
  return (
    <span className="name">
      {identity.nameRows.map((row, r) => {
        const start = n;
        n += row.length;
        return (
          <CellWord
            key={row}
            word={row}
            flood={identity.nameFloods[r]}
            cls={r === 1 ? "r2" : r === 2 ? "r3" : ""}
            onIndex={litUpTo === undefined ? undefined : (i) => start + i < litUpTo}
          />
        );
      })}
    </span>
  );
}
