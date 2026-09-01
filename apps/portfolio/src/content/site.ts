/**
 * Every word and every number on this site. Components import from here and
 * hold no strings of their own, so the whole portfolio can be re-pointed at a
 * different person by editing one file.
 */

export const identity = {
  name: "Panam Williams Mballos",
  /** Split for the cell-system masthead. Row 2 and 3 step to the right. */
  nameRows: ["PANAM", "WILLIAMS", "MBALLOS"] as const,
  /** Indices flooded with the accents, mirroring the logotype's irregularity. */
  nameFloods: [
    { m: [0], c: [3] },
    { m: [1], c: [5] },
    { m: [2], c: [5] }
  ] as const,
  role: "Second year · Data Science",
  thesis: "Advanced Nurturing High School — a system that sorts.",
  tagline:
    "I study data science the way this school studies people: measure everything, assume nothing. Most of what I build ends up pointed at silicon.",
  status: [
    { k: "Focus", v: "ML systems" },
    { k: "Currently", v: "Kernel profiling" },
    { k: "Status", v: "Open to internships" }
  ]
} as const;

export const links = [
  { label: "Email", href: "mailto:panammballos_yola@deeperlifehighschool.org" },
  { label: "GitHub", href: "https://github.com/MrWolfG6" },
  { label: "LinkedIn", href: "#" },
  { label: "CV (PDF)", href: "#" }
] as const;

export type Grade = { skill: string; grade: string; fill: number; note: string; top?: boolean };

export const grades: Grade[] = [
  { skill: "Python and Data Engineering", grade: "A",  fill: 88, note: "pandas, Polars, Airflow, dbt" },
  { skill: "Machine Learning",            grade: "A−", fill: 80, note: "PyTorch, gradient boosting" },
  { skill: "Statistics and Inference",    grade: "B+", fill: 72, note: "experiment design, causal thinking" },
  { skill: "Systems and GPU Compute",     grade: "B",  fill: 64, note: "CUDA, Triton, roofline analysis" },
  { skill: "Communication",               grade: "A−", fill: 84, note: "turning a result into a decision" },
  { skill: "Persistence",                 grade: "A+", fill: 97, note: "never graded down", top: true }
];

export type Project = {
  no: string; title: string; constraint: string; body: string;
  tools: string[]; result: string; unit: string;
};

export const projects: Project[] = [
  {
    no: "01", title: "Kernel Efficiency",
    constraint: "A fixed memory budget",
    body: "A naive matrix multiply, rewritten four times — tiling, shared memory, then a Triton version — each one profiled against the roofline instead of guessed at. The write-up is the part worth reading.",
    tools: ["CUDA", "Triton", "Nsight", "C++"],
    result: "3.4×", unit: "over naive, at 71% of peak bandwidth"
  },
  {
    no: "02", title: "Price–Performance",
    constraint: "A dataset that lied",
    body: "Fourteen months of retail GPU listings across three regions, normalised out of a mess, modelled for cost per TFLOP over time. It answers one question well: when is a card actually cheap?",
    tools: ["Python", "Playwright", "DuckDB", "Plotly"],
    result: "2,140", unit: "SKUs tracked, 14 months of daily prices"
  },
  {
    no: "03", title: "Earnings Language",
    constraint: "A deadline",
    body: "Sixty semiconductor earnings calls from Intel, AMD and NVIDIA, scored for hedging language and tested against the guidance that followed. Hedging predicts a miss better than sentiment does.",
    tools: ["PyTorch", "spaCy", "scikit-learn"],
    result: "0.71", unit: "AUC on out-of-sample guidance misses"
  },
  {
    no: "04", title: "Attendance Forecast",
    constraint: "It had to keep running",
    body: "A small real problem: predicting lecture attendance from timetable, weather and assessment calendars so the department stops booking the wrong rooms. Shipped as a weekly email nobody has unsubscribed from.",
    tools: ["LightGBM", "Postgres", "Streamlit"],
    result: "±4.2", unit: "students mean absolute error, 12 weeks live"
  }
];

export const log = [
  { when: "Year 2 · now", title: "Undergraduate research assistant, systems lab",
    body: "Benchmarking inference throughput across three accelerator families. Mostly this means reading profiler output until it stops looking like noise." },
  { when: "Year 1 · summer", title: "Data analytics intern",
    body: "Rebuilt a reporting pipeline that took nine hours into one that takes eleven minutes. Nobody noticed, which was the point." },
  { when: "Year 1", title: "First CUDA kernel",
    body: "It was slower than NumPy. The second one wasn't. That gap is where the interest started." },
  { when: "Before", title: "Took a laptop apart to see the die",
    body: "Put it back together, one screw spare. Still have the screw." }
];

/** Skills as silicon area — the floorplan argument, in square units. */
export const floorplan = [
  { name: "Python and Data Engineering", area: 40, note: "pandas · Polars · dbt" },
  { name: "Machine Learning",            area: 45, note: "PyTorch · LightGBM" },
  { name: "CUDA and GPU Compute",        area: 49, note: "Triton · Nsight" },
  { name: "Statistics and Inference",    area: 24, note: "causal · experiments" },
  { name: "SQL and Warehousing",         area: 20, note: "Postgres · DuckDB" },
  { name: "Visualization and Writing",   area: 33, note: "the part that persuades" },
  { name: "C++ and Systems",             area: 25, note: "memory · concurrency" },
  { name: "I/O and Interfaces",          area: 28, note: "APIs · pipelines" }
];

export const writing = [
  { title: "Reading a roofline without flinching", kind: "Case study", len: "1,500 words" },
  { title: "What $/TFLOP actually measures",       kind: "Notes",      len: "900 words" },
  { title: "The kernel that was slower than NumPy", kind: "Case study", len: "1,200 words" }
];

/** The ten structures. `section` keys the panel; `null` means scenery only. */
export type SectionKey =
  | "exams" | "evaluation" | "log" | "die" | "writing"
  | "benchmarks" | "about" | "sheet" | "contact";

export type Structure = {
  id: string; name: string; kind: string; section: SectionKey;
  /** Footprint on the plot grid, in units. */
  x: number; z: number; w: number; d: number; h: number;
  blurb: string;
};

export const structures: Structure[] = [
  { id: "mainW", name: "Main Building · West Wing", kind: "Examination", section: "exams",
    x: 5,  z: 13, w: 9, d: 7, h: 5.0,
    blurb: "Four special exams sat here, each with one constraint that could not be negotiated with." },
  { id: "mainC", name: "Main Building · Central Wing", kind: "Academic", section: "evaluation",
    x: 15, z: 13, w: 9, d: 7, h: 5.4,
    blurb: "The evaluation board. Six traits, honest letter grades, and a rule that a grade only moves when something shipped." },
  { id: "mainE", name: "Main Building · East Wing", kind: "Records", section: "log",
    x: 25, z: 13, w: 8, d: 7, h: 4.6,
    blurb: "The semester log — every term since the first CUDA kernel that ran slower than NumPy." },
  { id: "atrium", name: "Research Atrium", kind: "Laboratory", section: "die",
    x: 19, z: 4,  w: 9, d: 6, h: 3.4,
    blurb: "Glass-roofed compute hall. A die has a fixed area budget; so does a person." },
  { id: "annex", name: "Fabrication Annex", kind: "Writing", section: "writing",
    x: 31, z: 3,  w: 8, d: 5, h: 2.8,
    blurb: "Where silicon stops being an abstraction, and where the write-ups get written." },
  { id: "gym", name: "Benchmark Hall", kind: "Testing", section: "benchmarks",
    x: 3,  z: 3,  w: 11, d: 8, h: 3.4,
    blurb: "The gymnasium. Where a kernel gets run until it stops being fast." },
  { id: "dormA", name: "Dormitory A", kind: "Residence", section: "about",
    x: 34, z: 11, w: 7, d: 5, h: 3.6,
    blurb: "Where most of the work happens, at hours the timetable does not acknowledge." },
  { id: "dormB", name: "Dormitory B", kind: "Residence", section: "about",
    x: 34, z: 18, w: 7, d: 5, h: 3.6,
    blurb: "The second block. Identical from outside, which is rather the point of the place." },
  { id: "library", name: "Records and Library", kind: "Archive", section: "sheet",
    x: 6,  z: 22, w: 8, d: 5, h: 2.8,
    blurb: "Reference shelves, and the frames that did not make the final cut." },
  { id: "gate", name: "Main Gate and Terminal", kind: "Access", section: "contact",
    x: 20, z: 27, w: 6, d: 3, h: 2.2,
    blurb: "The way in, and the way out. Correspondence goes through here." }
];

/** Plot dimensions in grid units. Everything procedural derives from these. */
export const PLOT = { w: 44, d: 34 } as const;
