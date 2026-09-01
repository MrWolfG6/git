import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { buildPlot } from "./layout";
import { makeBlockMaterial, attachAttributes } from "./BlockMaterial";
import { useStore, sunFromVisits } from "../state/store";
import { structures } from "../content/site";

const box = new THREE.BoxGeometry(1, 1, 1);
const dummy = new THREE.Object3D();

export function Campus() {
  const { cells, built } = useMemo(() => buildPlot(), []);
  const material = useMemo(() => makeBlockMaterial(), []);

  const cellRef = useRef<THREE.InstancedMesh>(null!);
  const bldRef = useRef<THREE.InstancedMesh>(null!);

  const selected = useStore((s) => s.selected);
  const hovered = useStore((s) => s.hovered);
  const visited = useStore((s) => s.visited);
  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);

  // Geometry is written once. After this the meshes are never rebuilt.
  useLayoutEffect(() => {
    const write = (mesh: THREE.InstancedMesh, list: typeof cells, base: number) => {
      const k = new Float32Array(list.length);
      const sd = new Float32Array(list.length);
      const ix = new Float32Array(list.length);
      list.forEach((it, i) => {
        dummy.position.set(it.p[0], it.p[1], it.p[2]);
        dummy.scale.set(it.s[0], it.s[1], it.s[2]);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        k[i] = it.kind;
        sd[i] = it.seed;
        ix[i] = base + i;
      });
      mesh.instanceMatrix.needsUpdate = true;
      attachAttributes(mesh.geometry, k, sd, ix);
      mesh.computeBoundingSphere();
    };
    write(cellRef.current, cells, 1000);
    write(bldRef.current, built, 0);
  }, [cells, built]);

  // The scenery must never intercept a click meant for a building.
  useLayoutEffect(() => {
    cellRef.current.raycast = () => null;
  }, []);

  const sunTarget = useRef(0.12);
  useFrame((state, dt) => {
    const cam = state.camera.position;
    const dist = Math.hypot(cam.x, cam.y, cam.z);
    // One uniform decides which of the two readings the field is given.
    const z = THREE.MathUtils.clamp((dist - 3.5) / 20, 0, 1);
    const u = material.uniforms;
    u.uZoom.value = THREE.MathUtils.damp(u.uZoom.value, z * z * (3 - 2 * z), 6, dt);

    sunTarget.current = 0.12 + sunFromVisits(visited) * 0.78;
    u.uSun.value = THREE.MathUtils.damp(u.uSun.value, sunTarget.current, 1.6, dt);

    u.uSelected.value = selected;
    u.uHovered.value = hovered;
  });

  return (
    <group>
      <instancedMesh
        ref={cellRef}
        args={[box, material, cells.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={bldRef}
        args={[box, material, built.length]}
        frustumCulled={false}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) hover(e.instanceId);
        }}
        onPointerOut={() => hover(-1)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) select(e.instanceId);
        }}
      />
      {/* Substrate below the field: die substrate up close, ground at distance. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow={false}>
        <planeGeometry args={[400, 400]} />
        <GroundMaterial material={material} />
      </mesh>
    </group>
  );
}

/** Shares the block material's uZoom so ground and blocks change together. */
function GroundMaterial({ material }: { material: THREE.ShaderMaterial }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(() => {
    const z = material.uniforms.uZoom.value as number;
    const sun = material.uniforms.uSun.value as number;
    ref.current.color.setRGB(
      THREE.MathUtils.lerp(0.030, 0.90 - sun * 0.26, z),
      THREE.MathUtils.lerp(0.026, 0.91 - sun * 0.28, z),
      THREE.MathUtils.lerp(0.032, 0.92 - sun * 0.24, z)
    );
  });
  return <meshBasicMaterial ref={ref} toneMapped={false} />;
}

export const structureCount = structures.length;
