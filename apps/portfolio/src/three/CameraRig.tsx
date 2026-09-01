import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import gsap from "gsap";
import { useStore } from "../state/store";
import { framing } from "./layout";

/**
 * The hook is a single unbroken move. The camera starts close enough to the
 * cell field that only a handful of cells fill the frame, then arcs back until
 * the same field is a campus. Because the geometry never changes, there is
 * nothing to hide behind a cut — which is why the move has to be good.
 */
const P0 = new THREE.Vector3(0.95, 0.60, 1.65); // on the die
const P1 = new THREE.Vector3(9.0, 6.0, 12.5);   // the arc's control point
const P2 = new THREE.Vector3(31, 26, 42);       // campus orbit, whole plot in frame
const T0 = new THREE.Vector3(0, 0.05, 0.25);
const T2 = new THREE.Vector3(0, 0, 0);

const HOME_POS = P2.clone();
const HOME_TGT = T2.clone();

function bezier(out: THREE.Vector3, t: number) {
  const u = 1 - t;
  out.set(0, 0, 0)
    .addScaledVector(P0, u * u)
    .addScaledVector(P1, 2 * u * t)
    .addScaledVector(P2, t * t);
  return out;
}

export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null!);
  const phase = useStore((s) => s.phase);
  const selected = useStore((s) => s.selected);
  const reduced = useStore((s) => s.reduced);
  const { camera } = useThree();

  const t = useRef({ v: 0 });
  const tmp = useRef(new THREE.Vector3());
  const flying = useRef(false);

  // ---- the hook -----------------------------------------------------------
  useEffect(() => {
    if (phase !== "hook") return;
    if (reduced) { t.current.v = 1; return; }
    const tl = gsap.timeline();
    tl.to(t.current, { v: 0.12, duration: 1.5, ease: "power1.in" })
      .to(t.current, { v: 0.88, duration: 3.0, ease: "power2.inOut" })
      .to(t.current, { v: 1.0,  duration: 2.5, ease: "power2.out" });
    return () => { tl.kill(); };
  }, [phase, reduced]);

  // Jump the camera straight to the campus when the hook is skipped.
  useEffect(() => {
    if (phase === "campus" && t.current.v < 1) t.current.v = 1;
  }, [phase]);

  // ---- fly to a structure, and back ---------------------------------------
  useEffect(() => {
    if (phase !== "campus") return;
    const c = controls.current;
    if (!c) return;

    const dest = selected >= 0 ? framing(selected) : null;
    const p = dest ? new THREE.Vector3(...dest.position) : HOME_POS;
    const g = dest ? new THREE.Vector3(...dest.target) : HOME_TGT;

    if (reduced) {
      camera.position.copy(p); c.target.copy(g); c.update();
      return;
    }
    flying.current = true;
    const tl = gsap.timeline({ onComplete: () => { flying.current = false; } });
    tl.to(camera.position, {
      x: p.x, y: p.y, z: p.z, duration: 1.25, ease: "power3.inOut",
      onUpdate: () => c.update()
    }, 0);
    tl.to(c.target, {
      x: g.x, y: g.y, z: g.z, duration: 1.25, ease: "power3.inOut"
    }, 0);
    return () => { tl.kill(); flying.current = false; };
  }, [selected, phase, reduced, camera]);

  useFrame(() => {
    if (phase === "campus" && !flying.current) return; // orbit controls have it
    if (flying.current) return;
    const v = t.current.v;
    camera.position.copy(bezier(tmp.current, v));
    const look = tmp.current.copy(T0).lerp(T2, v);
    camera.lookAt(look);
    if (controls.current) controls.current.target.copy(look);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={phase === "campus" && !reduced}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      minDistance={6}
      maxDistance={70}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2.35}
    />
  );
}

/** Dust in the light — one of only two things that move without being asked. */
export function Dust() {
  const ref = useRef<THREE.Points>(null!);
  const reduced = useStore((s) => s.reduced);
  const geo = useRef<THREE.BufferGeometry>(null!);

  useEffect(() => {
    if (reduced) return;
    const n = 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 16 + 0.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    geo.current.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  }, [reduced]);

  useFrame((_, dt) => {
    if (reduced || !ref.current) return;
    const a = geo.current.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - dt * 0.22;
      if (y < 0.2) y = 16;
      a.setY(i, y);
    }
    a.needsUpdate = true;
  });

  if (reduced) return null;
  return (
    <points ref={ref}>
      <bufferGeometry ref={geo} />
      <pointsMaterial size={0.055} color="#e5007f" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}
