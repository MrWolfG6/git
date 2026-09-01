import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Campus } from "./three/Campus";
import { CameraRig, Dust } from "./three/CameraRig";
import { Preloader } from "./components/Preloader";
import { Hook } from "./components/Hook";
import { Hud } from "./components/Hud";
import { Flat } from "./components/Flat";
import { ContentSource } from "./components/Sections";
import { useStore, shouldSkipHook } from "./state/store";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export default function App() {
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const reduced = useStore((s) => s.reduced);
  const selected = useStore((s) => s.selected);
  const clear = useStore((s) => s.clear);

  const [gl] = useState(hasWebGL);
  const [ready, setReady] = useState(false);
  const [booted, setBooted] = useState(false);

  // Real milestones, not a timer: fonts resolved and the renderer created.
  useEffect(() => {
    let alive = true;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    const p = fonts?.ready ?? Promise.resolve();
    p.then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!gl) document.body.classList.add("flat");
  }, [gl]);

  // Escape closes the open section — expected, and the only way out by keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && selected >= 0) clear(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [selected, clear]);

  if (!gl) return <Flat reason="nogl" />;

  const loaded = ready && booted;

  return (
    <>
      <Canvas
        dpr={[1, 1.8]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.05, far: 400, position: [0.95, 0.6, 1.65] }}
        onCreated={({ gl: r }) => {
          r.setClearColor("#0a0a0a");
          setBooted(true);
        }}
      >
        <Campus />
        <CameraRig />
        {phase !== "preload" && <Dust />}
      </Canvas>

      {phase === "hook" && <Hook />}
      {phase === "campus" && <Hud />}

      <Preloader
        done={loaded}
        onGone={() => setPhase(shouldSkipHook() || reduced ? "campus" : "hook")}
      />

      {/* The whole portfolio as plain text, for readers the canvas cannot serve. */}
      <ContentSource />
    </>
  );
}
