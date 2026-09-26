/* ═══════════════════════════════════════════════════════════
   THE OTHER CARS
   Traffic on the roads, a grid on the circuit.

   Nobody but the player is simulated. They are parameterised along
   the spline: hold a lane, read the bend ahead, lift for whatever
   is in front. Cheap enough to run a full field at sixty frames.

   Traffic is anonymous — the same coachwork, unbadged, in greys.
   The grid is one-make: the player's own car, paced a little under
   the player's own numbers, so the race is winnable and fair.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { buildCarModel, makeMaterials, relink } from '../builder.js';
import { PAINTS } from '../cars.js';

const TRAFFIC = ['augur', 'herald', 'vigil', 'corvid'];
const TRAFFIC_PAINT = ['#3a3c43', '#8c8f97', '#1d1f25', '#5e616a', '#c9c6bf', '#27313b'];
const GRID_PAINT = ['OM-093', 'OM-010', 'OM-037', 'OM-058', 'OM-072', 'OM-089', 'OM-118', 'OM-024', 'OM-041', 'OM-066'];
/* invented three-letter codes; none is a real driver's */
const CODES = ['NYX', 'ORV', 'TAL', 'VEK', 'SUR', 'IMO', 'DAR', 'FEN', 'KJO', 'RUE', 'LIS'];

export class AIField {
  constructor(world, mode, tier, player) {
    this.world = world;
    this.mode = mode;                        // 'traffic' | 'race'
    this.tier = tier;
    this.player = player;                    // the Vehicle, for pacing the grid
    this.cars = [];
    this.group = new THREE.Group();
  }

  build(scene) {
    scene.add(this.group);
    const race = this.mode === 'race';
    const n = race ? (this.tier === 'low' ? 5 : 9) : (this.tier === 'low' ? 8 : 18);
    const tpls = race
      ? GRID_PAINT.slice(0, n).map(code => this.template(this.player.car.proto, PAINTS[code].hex, false))
      : TRAFFIC.map((p, i) => this.template(p, TRAFFIC_PAINT[i % TRAFFIC_PAINT.length], true));

    /* the player takes a slot mid-grid */
    this.playerSlot = race ? Math.min(4, n) : 0;
    const P = this.player;
    for (let i = 0; i < n; i++) {
      const model = tpls[i % tpls.length].clone(true);
      relink(model);                         // clone() severs part references; find them by name
      this.group.add(model);
      const slot = race ? (i < this.playerSlot ? i : i + 1) : 0;
      const dir = race || !this.world.twoWay ? 1 : (i % 5 < 2 ? -1 : 1);
      const w = this.world.width;
      const car = {
        model, dir, slot,
        name: race ? CODES[i % CODES.length] : null,
        u: race ? ((1 - 0.0015 - slot * 9 / this.world.length) % 1 + 1) % 1 : (i + 0.5) / n,
        lane: race ? (slot % 2 ? 1 : -1) * w * 0.2 : dir * w * (i % 2 ? 0.14 : 0.36),
        speed: 0,
        top: race ? P.topSpeed * (0.86 + Math.random() * 0.06) : (18 + Math.random() * 12),
        grip: race ? P.T.grip * (0.78 + Math.random() * 0.08) : 0.8,
        powerPerKg: race ? P.powerW / P.mass * 0.9 : 0,
        wheelAngle: 0, lap: 0, lastU: 0, pos: new THREE.Vector3()
      };
      car.targetLane = car.lane;
      car.lastU = car.u;
      this.cars.push(car);
      this.place(car);
    }
    return this;
  }

  template(proto, hex, anonymous) {
    const M = makeMaterials();
    M.paint.color.set(hex);
    M.paint.metalness = 0.6;
    M.paint.roughness = 0.32;
    const m = buildCarModel(proto, { materials: M, tier: 'low' });
    m.traverse(o => {
      if (o.isMesh) o.castShadow = this.tier === 'high';
      if (anonymous && o.name === 'badge') o.visible = false;
    });
    return m;
  }

  /* the radius of the bend a little way ahead, in metres */
  radiusAt(u, dir, look) {
    const a = this.world.frameAt(u), b = this.world.frameAt(u + dir * look);
    const ang = Math.acos(THREE.MathUtils.clamp(a.tan.dot(b.tan), -1, 1));
    return ang < 1e-4 ? Infinity : (look * this.world.length) / ang;
  }

  place(c) {
    const f = this.world.frameAt(c.u);
    c.pos.copy(f.pos).addScaledVector(f.side, c.lane).setY(0);
    c.heading = Math.atan2(f.tan.x, f.tan.z) + (c.dir < 0 ? Math.PI : 0);
    c.model.position.copy(c.pos);
    c.model.rotation.set(0, c.heading - Math.PI / 2, 0);
    return f;
  }

  update(dt, held) {
    const L = this.world.length, race = this.mode === 'race';
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (held) { this.place(c); continue; }

      /* what the bend ahead allows */
      const r = Math.min(this.radiusAt(c.u, c.dir, race ? 0.012 : 0.008), this.radiusAt(c.u + c.dir * 0.008, c.dir, 0.01));
      let want = Math.min(c.top, Math.sqrt(c.grip * 9.81 * Math.min(r, 3000)));

      /* lift for whatever is directly ahead, player included */
      const ahead = this.gapAhead(i);
      if (ahead.gap < 30) {
        want = Math.min(want, ahead.speed + (ahead.gap - 9) * 0.6);
        if (race && ahead.gap < 16 && c.speed > 10) {
          c.targetLane = THREE.MathUtils.clamp(ahead.lane + (ahead.lane >= 0 ? -1 : 1) * this.world.width * 0.28,
            -this.world.width * 0.36, this.world.width * 0.36);
        }
      } else if (race) c.targetLane *= 1 - dt * 0.3;

      /* the grid accelerates as the player's car does: traction-limited
         low down, power-limited above; traffic just pulls away gently */
      const up = race ? Math.min(c.grip * 9.81 * 0.9, c.powerPerKg / Math.max(c.speed, 4)) : 3.5;
      const down = race ? c.grip * 9.81 : 8;
      c.speed += THREE.MathUtils.clamp(want - c.speed, -down * dt, up * dt);
      c.speed = Math.max(0, c.speed);
      c.lane += (c.targetLane - c.lane) * Math.min(1, dt * 1.4);

      c.lastU = c.u;
      c.u = ((c.u + (c.speed * c.dir * dt) / L) % 1 + 1) % 1;
      if (c.dir > 0 && c.u < c.lastU - 0.5) c.lap++;
      this.place(c);

      const lean = THREE.MathUtils.clamp(c.speed * c.speed / Math.max(r, 15) / 9.81, 0, 1.2) * 0.03;
      c.model.rotateX(-lean * Math.sign(this.turnSign(c)));
      c.wheelAngle -= (c.speed / 0.36) * dt;
      for (const w of c.model.parts.wheels) w.spin.rotation.z = c.wheelAngle;
    }
  }

  turnSign(c) {
    const a = this.world.frameAt(c.u), b = this.world.frameAt(c.u + c.dir * 0.005);
    return (a.tan.x * b.tan.z - a.tan.z * b.tan.x) * c.dir || 1;
  }

  /* the nearest thing in front along the lap, in metres */
  gapAhead(index) {
    const me = this.cars[index], L = this.world.length, P = this.player;
    let best = { gap: Infinity, speed: 99, lane: 0 };
    const consider = (u, speed, lane) => {
      const raw = me.dir > 0 ? u - me.u : me.u - u;
      const d = (((raw % 1) + 1) % 1) * L;
      if (d < best.gap) best = { gap: d, speed, lane };
    };
    for (let j = 0; j < this.cars.length; j++) {
      if (j === index) continue;
      const o = this.cars[j];
      if (o.dir !== me.dir || Math.abs(o.lane - me.lane) > 3) continue;
      consider(o.u, o.speed, o.lane);
    }
    /* the player, if they are in this lane, going this way */
    const pDir = Math.cos(P.heading - (Math.atan2(this.world.frameAt(P.u).tan.x, this.world.frameAt(P.u).tan.z))) >= 0 ? 1 : -1;
    if (pDir === me.dir && Math.abs((P.lane ?? 0) - me.lane) < 3) consider(P.u, Math.abs(P.speed), P.lane ?? 0);
    return best;
  }

  /* race order: laps completed, then distance round the current lap */
  standings(playerLap) {
    const P = this.player;
    const rows = this.cars.map(c => ({ name: c.name, lap: c.lap, u: c.u, speed: c.speed, isPlayer: false }));
    rows.push({ name: 'YOU', lap: playerLap, u: P.u, speed: Math.abs(P.speed), isPlayer: true });
    rows.sort((a, b) => (b.lap - a.lap) || (b.u - a.u));
    const L = this.world.length;
    const lead = rows[0];
    /* one reference speed for the whole field, so the gaps are in order */
    const ref = Math.max(20, rows.reduce((a, r) => a + (r.speed || 0), 0) / rows.length);
    for (const r of rows) {
      r.gapM = ((lead.lap - r.lap) + (lead.u - r.u)) * L;
      r.gapS = r.gapM / ref;
    }
    return rows;
  }

  /* push the player out of anyone they drive into */
  collide(v) {
    let hit = 0;
    for (const c of this.cars) {
      const d = c.pos.distanceTo(v.pos);
      if (d < 3.2) {
        const push = v.pos.clone().sub(c.pos).setY(0).normalize();
        v.pos.addScaledVector(push, (3.2 - d) * 0.9);
        v.speed *= 0.9;
        c.speed *= 0.9;
        hit = Math.max(hit, (3.2 - d) / 3.2);
      }
    }
    return hit;
  }
}
