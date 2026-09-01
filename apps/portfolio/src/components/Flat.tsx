import { CellName } from "./Cells";
import { SectionBody } from "./Sections";
import { identity, structures } from "../content/site";

/**
 * The version half the audience gets: no canvas, no WebGL, same content and the
 * same navigation. Written to be a complete site, not an apology for one.
 */
export function Flat({ reason }: { reason: "nogl" | "choice" }) {
  return (
    <div className="flat-wrap">
      <header>
        <h1>
          <span className="sr">{identity.name}</span>
          <CellName />
        </h1>
        <p style={{ marginTop: 22, fontSize: 17, color: "var(--ink-soft)", maxWidth: "56ch" }}>
          {identity.tagline}
        </p>
      </header>

      <div className="flat-note">
        {reason === "nogl"
          ? "This browser cannot run WebGL, so you are reading the flat version of the site. It carries the whole portfolio — nothing is missing but the camera."
          : "You have reduced motion turned on, so the flat version is being served. It carries the whole portfolio."}
      </div>

      {structures.map((s) => (
        <section className="flat-sec" key={s.id}>
          <span className="lab">{s.kind}</span>
          <h2>{s.name}</h2>
          <p style={{ color: "var(--ink-soft)", margin: "6px 0 18px", maxWidth: "58ch" }}>
            {s.blurb}
          </p>
          <SectionBody k={s.section} />
        </section>
      ))}
    </div>
  );
}
