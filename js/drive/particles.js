/* ═══════════════════════════════════════════════════════════
   DUST, SMOKE AND SPRAY
   One pooled point cloud for everything the tyres throw up.
   Per-particle size and fade need a shader — PointsMaterial
   cannot vary alpha per point.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';

function puffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 1, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(0.45, 'rgba(255,255,255,.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.beginPath(); x.arc(32, 32, 31, 0, Math.PI * 2); x.fill();
  return new THREE.CanvasTexture(c);
}

export class Particles {
  constructor(scene, max = 320) {
    this.max = max;
    this.head = 0;

    const pos = new Float32Array(max * 3);
    const vel = new Float32Array(max * 3);
    const life = new Float32Array(max);      // 1 → 0
    const decay = new Float32Array(max);
    const size = new Float32Array(max);
    const tint = new Float32Array(max * 3);

    for (let i = 0; i < max; i++) { life[i] = 0; pos[i * 3 + 1] = -999; }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: puffTexture() }, uOpacity: { value: 0.30 } },
      transparent: true, depthWrite: false,
      vertexShader: `
        attribute float aLife; attribute float aSize; attribute vec3 aTint;
        varying float vLife; varying vec3 vTint;
        void main(){
          vLife = aLife; vTint = aTint;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (1.0 + (1.0 - aLife) * 1.5) * (120.0 / max(-mv.z, 1.5));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform float uOpacity;
        varying float vLife; varying vec3 vTint;
        void main(){
          vec4 t = texture2D(map, gl_PointCoord);
          float a = t.a * vLife * vLife * uOpacity;
          a *= smoothstep(0.0, 0.25, 1.0 - vLife);   // fade in, so nothing pops
          if (a < 0.004) discard;
          gl_FragColor = vec4(vTint, a);
        }`
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);

    this.pos = pos; this.vel = vel; this.life = life;
    this.decay = decay; this.size = size; this.tint = tint;
    this.geo = geo;
  }

  emit(p, spread, size, colour, drift, decay) {
    const i = this.head;
    this.head = (this.head + 1) % this.max;
    const o = i * 3;
    this.pos[o]     = p.x + (Math.random() - 0.5) * spread;
    this.pos[o + 1] = p.y + Math.random() * 0.12;
    this.pos[o + 2] = p.z + (Math.random() - 0.5) * spread;
    this.vel[o]     = drift.x + (Math.random() - 0.5) * 1.1;
    this.vel[o + 1] = 0.45 + Math.random() * 0.7;
    this.vel[o + 2] = drift.z + (Math.random() - 0.5) * 1.1;
    this.life[i] = 1;
    this.decay[i] = decay;
    this.size[i] = size * (0.7 + Math.random() * 0.6);
    this.tint[o] = colour.r; this.tint[o + 1] = colour.g; this.tint[o + 2] = colour.b;
  }

  update(dt) {
    const { pos, vel, life, decay } = this;
    let alive = false;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) continue;
      alive = true;
      life[i] -= decay[i] * dt;
      const o = i * 3;
      pos[o] += vel[o] * dt;
      pos[o + 1] += vel[o + 1] * dt;
      pos[o + 2] += vel[o + 2] * dt;
      vel[o] *= 1 - dt * 1.5;
      vel[o + 2] *= 1 - dt * 1.5;
      vel[o + 1] *= 1 - dt * 0.7;
      if (life[i] <= 0) { life[i] = 0; pos[o + 1] = -999; }
    }
    if (alive) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.aLife.needsUpdate = true;
      this.geo.attributes.aSize.needsUpdate = true;
      this.geo.attributes.aTint.needsUpdate = true;
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   SKID MARKS
   A ribbon laid behind each rear wheel while it is sliding,
   written into one long recycled strip.
   ═══════════════════════════════════════════════════════════ */
export class Skids {
  constructor(scene, segments = 260) {
    this.segments = segments;
    this.head = 0;
    this.count = 0;

    const verts = new Float32Array(segments * 4 * 3);   // 2 strips × 2 verts
    const alpha = new Float32Array(segments * 4);
    const idx = [];
    for (let strip = 0; strip < 2; strip++) {
      const base = strip * segments * 2;
      for (let i = 0; i < segments - 1; i++) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0x08080a) } },
      vertexShader: `attribute float aAlpha; varying float vA;
        void main(){ vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying float vA;
        void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(uColor, vA * 0.55); }`
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
    this.verts = verts; this.alpha = alpha; this.geo = geo;
  }

  /* one rib per frame while sliding: left/right rear contact patches */
  lay(left, right, strength) {
    const i = this.head;
    const w = 0.16;
    const write = (strip, a, b) => {
      const o = (strip * this.segments + i) * 2;
      this.verts[o * 3]     = a.x; this.verts[o * 3 + 1] = 0.025; this.verts[o * 3 + 2] = a.z;
      this.verts[(o + 1) * 3] = b.x; this.verts[(o + 1) * 3 + 1] = 0.025; this.verts[(o + 1) * 3 + 2] = b.z;
      this.alpha[o] = strength; this.alpha[o + 1] = strength;
    };
    write(0, left.a, left.b);
    write(1, right.a, right.b);
    this.head = (this.head + 1) % this.segments;
    /* break the ribbon at the wrap so it does not draw across the map */
    const nx = this.head;
    for (const strip of [0, 1]) {
      const o = (strip * this.segments + nx) * 2;
      this.alpha[o] = 0; this.alpha[o + 1] = 0;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  fade(dt) {
    let any = false;
    for (let i = 0; i < this.alpha.length; i++) {
      if (this.alpha[i] > 0) { this.alpha[i] = Math.max(0, this.alpha[i] - dt * 0.045); any = true; }
    }
    if (any) this.geo.attributes.aAlpha.needsUpdate = true;
  }
}
