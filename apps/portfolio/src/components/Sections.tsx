import {
  grades, projects, log, floorplan, writing, links, identity, structures,
  type SectionKey
} from "../content/site";

export function SectionBody({ k }: { k: SectionKey }) {
  switch (k) {
    case "evaluation":
      return (
        <>
          {grades.map((g) => (
            <div className="row" key={g.skill}>
              <div className="nm">{g.skill}<em>{g.note}</em></div>
              <div className="bar"><i style={{ width: g.fill + "%" }} /></div>
              <div className={"grade" + (g.top ? " top" : "")}>{g.grade}</div>
            </div>
          ))}
        </>
      );

    case "exams":
      return (
        <>
          {projects.map((p) => (
            <article className="proj" key={p.no}>
              <div className="proj-h">
                <span className="proj-n">{p.no}</span>
                <h3>{p.title}</h3>
              </div>
              <div className="con">Constraint — {p.constraint}</div>
              <p>{p.body}</p>
              <div className="tools">{p.tools.map((t) => <span key={t}>{t}</span>)}</div>
              <div className="res"><b>{p.result}</b><span>{p.unit}</span></div>
            </article>
          ))}
        </>
      );

    case "log":
      return (
        <>
          {log.map((l) => (
            <div className="log-item" key={l.title}>
              <span className="lab">{l.when}</span>
              <h3>{l.title}</h3>
              <p>{l.body}</p>
            </div>
          ))}
        </>
      );

    case "die":
      return (
        <>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 14 }}>
            A die has a fixed area budget. Spend it on one block and another gets less.
            These are the real proportions.
          </p>
          {floorplan.map((f) => (
            <div className="area" key={f.name}>
              <span>{f.name}<br /><small>{f.note}</small></span>
              <small>{f.area} u²</small>
            </div>
          ))}
        </>
      );

    case "writing":
      return (
        <>
          {writing.map((w) => (
            <div className="area" key={w.title}>
              <span>{w.title}<br /><small>{w.kind}</small></span>
              <small>{w.len}</small>
            </div>
          ))}
        </>
      );

    case "benchmarks": {
      const p = projects[0];
      return (
        <article className="proj">
          <div className="con">Constraint — {p.constraint}</div>
          <p>{p.body}</p>
          <div className="tools">{p.tools.map((t) => <span key={t}>{t}</span>)}</div>
          <div className="res"><b>{p.result}</b><span>{p.unit}</span></div>
        </article>
      );
    }

    case "about":
      return (
        <>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 16 }}>
            {identity.tagline}
          </p>
          {identity.status.map((s) => (
            <div className="area" key={s.k}><span>{s.k}</span><small>{s.v}</small></div>
          ))}
        </>
      );

    case "sheet":
      return (
        <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
          Reference shelves, and the frames that did not make the final cut.
          The contact sheet lives here once the photography is scanned.
        </p>
      );

    case "contact":
      return (
        <div className="links">
          {links.map((l) => (
            <a key={l.label} href={l.href}>{l.label}</a>
          ))}
        </div>
      );
  }
}

/** Every word of the site as plain HTML, for readers and crawlers that get no canvas. */
export function ContentSource() {
  return (
    <div className="sr">
      <h1>{identity.name}</h1>
      <p>{identity.role}. {identity.tagline}</p>
      {structures.map((s) => (
        <section key={s.id}>
          <h2>{s.name} — {s.kind}</h2>
          <p>{s.blurb}</p>
          <SectionBody k={s.section} />
        </section>
      ))}
    </div>
  );
}
