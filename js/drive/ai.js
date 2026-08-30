/* ═══════════════════════════════════════════════════════════
   THE OTHER CARS
   Traffic in the cities, a full grid on the circuit.

   Everyone but the player is parameterised along the spline
   rather than simulated: they hold a lane, read the corner
   ahead, and lift for whatever is in front of them. That is
   cheap enough to run a whole field at sixty frames.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { buildCarModel, makeMaterials, relink } from '../carbuilder.js';

const TRAFFIC_PROTOS = ['limousine', 'suvcoupe', 'classic', 'offroader'];
const TRAFFIC_PAINT = ['#2b3138', '#8e939a', '#101216', '#5b6068', '#1d2a3a', '#6d2f2f'];
const RACE_PAINT = ['#1a5fb4', '#c01c28', '#e5a50a', '#26a269', '#813d9c', '#e66100', '#63452c', '#3d3846'];
const RACE_NAMES = ['HAM', 'VER', 'LEC', 'NOR', 'RUS', 'SAI', 'ALO', 'PIA'];

export class AIField {
  constructor(world, mode, quality = 'high') {
    this.world = world;
    this.mode = mode;                 // 'traffic' | 'race'
    this.quality = quality;
    this.cars = [];
    this.group = new THREE.Group();
  }

  build(scene, count) {
    scene.add(this.group);
    const n = count ?? (this.mode === 'race'
      ? (this.quality === 'low' ? 5 : 8)
      : (this.quality === 'low' ? 7 : 14));

    const templates = [];
    if (this.mode === 'race') {
      for (let i = 0; i < Math.min(n, RACE_PAINT.length); i++) {
        templates.push(this.template('openwheel', RACE_PAINT[i]));
      }
    } else {
      for (let i = 0; i < TRAFFIC_PROTOS.length; i++) {
        templates.push(this.template(TRAFFIC_PROTOS[i], TRAFFIC_PAINT[i % TRAFFIC_PAINT.length]));
      }
    }

    for (let i = 0; i < n; i++) {
      const tpl = templates[i % templates.length];
      const model = tpl.clone(true);
      relink(model);                       // a clone loses its part references
      this.group.add(model);

      /* in a city roughly half the traffic is coming the other way */
      const dir = this.mode === 'race' ? 1 : (i % 5 < 2 ? -1 : 1);

      const car = {
        model, dir,
        name: this.mode === 'race' ? RACE_NAMES[i % RACE_NAMES.length] : null,
        /* the grid, or spread right around the loop for traffic */
        u: this.mode === 'race'
          ? (1 - 0.004 - i * 0.0055 + 1) % 1
          : (i + 0.5) / n,
        /* traffic keeps to its own side; the racers use the whole road */
        lane: this.mode === 'race'
          ? (i % 2 ? 1 : -1) * this.world.width * 0.16
          : (i % 5 < 2 ? 1 : -1) * this.world.width * (i % 2 ? 0.12 : 0.30),
        targetLane: 0,
        speed: 0,
        top: this.mode === 'race'
          ? (74 + Math.random() * 6)                 // ≈ 270 km/h
          : (16 + Math.random() * 11),               // 58 — 97 km/h
        grip: this.mode === 'race' ? 1.55 + Math.random() * 0.2 : 0.9,
        wheelAngle: 0,
        lap: 0,
        lastU: 0
      };
      car.targetLane = car.lane;
      this.cars.push(car);
    }
    return this;
  }

  template(proto, hex) {
    const materials = makeMaterials(0.85);
    materials.paint.color.set(hex);
    materials.paint.metalness = 0.85;
    materials.paint.roughness = 0.28;
    const m = buildCarModel(proto, { materials, quality: 'low' });
    m.traverse(o => { if (o.isMesh) { o.castShadow = this.quality !== 'low'; } });
    return m;
  }

  /* how tight the road is a little way ahead */
  curvatureAt(u, look = 0.006) {
    const a = this.world.frameAt(u);
    const b = this.world.frameAt(u + look);
    const dot = THREE.MathUtils.clamp(a.tan.dot(b.tan), -1, 1);
    const angle = Math.acos(dot);
    const arc = look * this.world.length;
    return angle < 1e-4 ? Infinity : arc / angle;      // radius in metres
  }

  update(dt, player) {
    const L = this.world.length;

    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];

      /* how fast the corner ahead allows */
      const radius = this.curvatureAt(c.u, this.mode === 'race' ? 0.010 : 0.006);
      const cornerV = Math.sqrt(Math.max(4, c.grip * 9.81 * Math.min(radius, 900)));
      let want = Math.min(c.top, cornerV);

      /* lift for whatever is directly ahead, player included */
      const ahead = this.gapAhead(i, player);
      if (ahead.gap < 26) {
        want = Math.min(want, ahead.speed * (0.55 + ahead.gap / 58));
        /* on the circuit they will look for a way past */
        if (this.mode === 'race' && ahead.gap < 17 && c.speed > 12) {
          c.targetLane = THREE.MathUtils.clamp(
            ahead.lane + (ahead.lane >= 0 ? -1 : 1) * this.world.width * 0.24,
            -this.world.width * 0.34, this.world.width * 0.34);
        }
      } else if (this.mode === 'race') {
        /* otherwise drift back toward the line */
        c.targetLane *= 1 - dt * 0.35;
      }

      const accel = want > c.speed ? (this.mode === 'race' ? 11 : 4.5) : (this.mode === 'race' ? 26 : 9);
      c.speed += THREE.MathUtils.clamp(want - c.speed, -accel * dt, accel * dt);
      c.lane += (c.targetLane - c.lane) * Math.min(1, dt * 1.6);

      c.lastU = c.u;
      c.u = ((c.u + (c.speed * c.dir * dt) / L) % 1 + 1) % 1;
      if (c.dir > 0 && c.u < c.lastU - 0.5) c.lap++;

      const f = this.world.frameAt(c.u);
      const pos = f.pos.clone().addScaledVector(f.side, c.lane);
      c.model.position.set(pos.x, 0, pos.z);
      const heading = Math.atan2(f.tan.x, f.tan.z) + (c.dir < 0 ? Math.PI : 0);
      c.model.rotation.y = heading - Math.PI / 2;
      c.heading = heading;
      c.pos = pos;

      /* lean into the corner, and roll the wheels */
      const lean = THREE.MathUtils.clamp((c.speed * c.speed) / Math.max(radius, 12) / 9.81, -1.2, 1.2);
      const side = new THREE.Vector3(f.tan.z, 0, -f.tan.x);
      const dir = Math.sign(side.dot(f.side)) || 1;
      c.model.rotation.z = -lean * 0.035 * dir;
      c.wheelAngle -= (c.speed / 0.36) * dt * c.dir;
      const wheels = c.model.parts?.wheels;
      if (wheels) for (const w of wheels) if (w.spin) w.spin.rotation.z = c.wheelAngle;
    }
  }

  /* nearest car in front along the lap, in metres */
  gapAhead(index, player) {
    const me = this.cars[index];
    const L = this.world.length;
    let best = { gap: Infinity, speed: 999, lane: 0 };

    /* "ahead" is whichever way this car happens to be pointing */
    const consider = (u, speed, lane) => {
      const raw = me.dir > 0 ? (u - me.u) : (me.u - u);
      const d = ((raw % 1) + 1) % 1 * L;
      if (d < best.gap) best = { gap: d, speed, lane };
    };

    for (let j = 0; j < this.cars.length; j++) {
      if (j === index) continue;
      const o = this.cars[j];
      if (o.dir !== me.dir) continue;                 // oncoming is not a queue
      if (Math.abs(o.lane - me.lane) > 3.2) continue;
      consider(o.u, o.speed, o.lane);
    }
    if (player && me.dir > 0 && Math.abs(player.lane - me.lane) < 3.2) {
      consider(player.u, Math.abs(player.speed), player.lane);
    }
    return best;
  }

  /* the race order: laps first, then distance round the current lap */
  standings(player) {
    const rows = this.cars.filter(c => c.name)
      .map(c => ({ name: c.name, lap: c.lap, u: c.u, isPlayer: false }));
    if (player) rows.push({ name: 'YOU', lap: player.lap, u: player.u, isPlayer: true });
    rows.sort((a, b) => (b.lap - a.lap) || (b.u - a.u));
    return rows;
  }

  /* nudge the player out of anyone they drive into */
  collide(vehicle) {
    let hit = 0;
    for (const c of this.cars) {
      if (!c.pos) continue;
      const d = c.pos.distanceTo(vehicle.pos);
      if (d < 3.1) {
        const push = vehicle.pos.clone().sub(c.pos).setY(0).normalize();
        vehicle.pos.addScaledVector(push, (3.1 - d) * 0.85);
        vehicle.speed *= 0.90;
        c.speed *= 0.92;
        hit = Math.max(hit, (3.1 - d) / 3.1);
      }
    }
    return hit;
  }
}
