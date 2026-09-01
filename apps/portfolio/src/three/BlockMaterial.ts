import * as THREE from "three";

/**
 * One material for every box on the plot. A single uniform, uZoom, decides
 * whether the field is being read as a die or as a campus; the geometry never
 * changes. Flat shading comes free from BoxGeometry's per-face normals, so no
 * derivative extension is needed and WebGL1 devices are not excluded.
 */
export function makeBlockMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uZoom:     { value: 0 },   // 0 = die, 1 = campus
      uSun:      { value: 0.15 },// 0 = morning, 1 = dusk
      uSelected: { value: -1 },
      uHovered:  { value: -1 },
      uFade:     { value: 1 }
    },
    vertexShader: /* glsl */ `
      attribute float aKind;
      attribute float aSeed;
      attribute float aIndex;

      varying vec3 vNormalW;
      varying vec3 vPosW;
      varying vec3 vLocal;
      varying float vKind;
      varying float vSeed;
      varying float vIndex;

      void main() {
        vKind  = aKind;
        vSeed  = aSeed;
        vIndex = aIndex;
        vLocal = position;

        vec4 world = instanceMatrix * vec4(position, 1.0);
        vPosW = world.xyz;

        // BoxGeometry normals are already per-face; rotate them into world space.
        mat3 nm = mat3(instanceMatrix);
        vNormalW = normalize(nm * normal);

        gl_Position = projectionMatrix * modelViewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform float uZoom;
      uniform float uSun;
      uniform float uSelected;
      uniform float uHovered;
      uniform float uFade;

      varying vec3 vNormalW;
      varying vec3 vPosW;
      varying vec3 vLocal;
      varying float vKind;
      varying float vSeed;
      varying float vIndex;

      const vec3 MAGENTA = vec3(0.898, 0.000, 0.498); // #E5007F
      const vec3 CRIMSON = vec3(0.643, 0.000, 0.239); // #A4003D
      const vec3 INK     = vec3(0.039, 0.039, 0.039); // #0A0A0A

      void main() {
        float up = clamp(vNormalW.y, 0.0, 1.0);

        // ---- the die reading -------------------------------------------------
        vec3 dieCol = mix(vec3(0.055, 0.050, 0.058), vec3(0.135, 0.120, 0.140), vSeed);
        if (vKind > 0.5 && vKind < 1.5) dieCol = MAGENTA * 0.85;         // rails
        if (vKind > 1.5 && vKind < 2.5) dieCol = CRIMSON * 0.90;         // pads
        if (vKind > 2.5)                dieCol = vec3(0.26, 0.23, 0.26); // macro cells

        // Interconnect traces, drawn only on upward faces and only up close.
        float trace = step(0.86, fract(vPosW.x * 3.1)) + step(0.92, fract(vPosW.z * 2.3));
        dieCol = mix(dieCol, MAGENTA, clamp(trace, 0.0, 1.0) * up * 0.55 * (1.0 - uZoom));

        // ---- the campus reading ---------------------------------------------
        vec3 campCol = vec3(0.949, 0.945, 0.945);                        // paving
        if (vKind > 0.5 && vKind < 1.5) campCol = vec3(0.859, 0.847, 0.851);
        if (vKind > 1.5 && vKind < 2.5) campCol = vec3(0.925, 0.918, 0.922);
        if (vKind > 2.5) {
          // Buildings: white roof, faintly cooler walls, so the mass reads.
          campCol = mix(vec3(0.937, 0.933, 0.937), vec3(1.0), up);
        }

        vec3 base = mix(dieCol, campCol, uZoom);

        // ---- one key light, its angle driven by the day ----------------------
        float a = mix(1.15, 0.16, uSun);
        vec3 L = normalize(vec3(cos(a) * 0.75, sin(a) + 0.25, 0.42));
        float lam = max(dot(vNormalW, L), 0.0);
        vec3 warm = mix(vec3(1.0), vec3(1.0, 0.86, 0.72), uSun);
        vec3 sky  = mix(vec3(0.80, 0.83, 0.88), vec3(0.42, 0.40, 0.50), uSun);

        vec3 col = base * (sky * (0.55 + uZoom * 0.22) + warm * lam * (0.62 - uZoom * 0.18));

        // Edge darkening on the buildings so white boxes still read as volumes.
        if (vKind > 2.5) {
          vec3 e = abs(vLocal) * 2.0;
          float edge = smoothstep(0.86, 1.0, max(max(e.x, e.y), e.z));
          col = mix(col, col * 0.72, edge * 0.5);
        }

        // ---- the only glow in the build --------------------------------------
        float isSel = step(0.5, 1.0 - abs(vIndex - uSelected));
        float isHov = step(0.5, 1.0 - abs(vIndex - uHovered));
        if (vKind > 2.5 && (isSel + isHov) > 0.0) {
          // An edge is where two local axes are near their extreme, so the
          // second-largest component isolates edges and leaves faces alone.
          vec3 e = abs(vLocal) * 2.0;
          float hi  = max(max(e.x, e.y), e.z);
          float lo  = min(min(e.x, e.y), e.z);
          float mid = e.x + e.y + e.z - hi - lo;
          float band = smoothstep(0.86, 1.0, mid);
          float amt = isSel * 0.95 + isHov * 0.45;
          col = mix(col, MAGENTA, band * amt);
          col = mix(col, MAGENTA, 0.07 * amt);   // just enough to read at distance
        }

        gl_FragColor = vec4(col, uFade);
      }
    `,
    transparent: false
  });
}

/** Attach the per-instance attributes the shader expects. */
export function attachAttributes(
  geo: THREE.InstancedBufferGeometry | THREE.BufferGeometry,
  kinds: Float32Array,
  seeds: Float32Array,
  indices: Float32Array
) {
  geo.setAttribute("aKind", new THREE.InstancedBufferAttribute(kinds, 1));
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  geo.setAttribute("aIndex", new THREE.InstancedBufferAttribute(indices, 1));
}
