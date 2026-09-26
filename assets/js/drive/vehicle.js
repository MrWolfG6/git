/* ═══════════════════════════════════════════════════════════
   THE CAR
   An arcade bicycle model, fed each car's own mass, power, grip
   and top speed: a power band, drag, a grip limit that produces
   understeer when you ask for too much, a handbrake that steps the
   tail out, roll and dive, an automatic gearbox, and a slower,
   rougher surface off the road.

   The body is the same buildCarModel() the dais uses: the car on
   the podium is the car you drive.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { buildCarModel, makeMaterials, setPaint } from '../builder.js';
import { PALETTE } from '../brand.js';

const G = 9.81;
/* gear tops as a fraction of top speed */
const BOX = {
  ice: [0.15, 0.27, 0.39, 0.52, 0.66, 0.82, 1.0],
  ev:  [0.46, 1.0]                     // a two-speed box on the rear motor
};

export class Vehicle {
  constructor(car, world, opts = {}) {
    this.car = car;
    this.world = world;
    this.T = car.drive;
    this.ice = car.fuel === 'ice';
    this.box = this.ice ? BOX.ice : BOX.ev;

    this.materials = makeMaterials();
    this.model = buildCarModel(car.proto, { materials: this.materials, tier: opts.tier, wheel: opts.wheel, cabin: true });
    this.model.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.dims = this.model.userData.dims;
    this.parts = this.model.parts;
    if (opts.paint) setPaint(this.materials, opts.paint);

    this.mass = this.T.mass;
    this.powerW = this.T.power * 745.7;
    this.topSpeed = this.T.topSpeed / 3.6;
    /* drag chosen so power and drag balance at the car's own top speed */
    this.dragK = (this.powerW * 1.03) / (this.mass * Math.pow(this.topSpeed, 3));

    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.lateral = 0;
    this.steer = 0;
    this.gear = 1;
    this.rpm = this.idleRpm;
    this.u = 0;
    this.lap = 0;
    this.offTrack = 0;
    this.slip = 0;
    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.wheelAngle = 0;
    this.brakeLight = 0;

    /* Contact patches exist from the start and are written on every
       path through update(), the grid hold included: the effects layer
       reads them every frame. */
    this.contactL = new THREE.Vector3();
    this.contactR = new THREE.Vector3();

    this.buildHeadlights(opts.tier);
  }

  get idleRpm() { return this.ice ? this.car.audio.idle : 0; }
  get kmh() { return Math.abs(this.speed) * 3.6; }
  get rpmNorm() {
    const a = this.car.audio;
    return THREE.MathUtils.clamp((this.rpm - a.idle) / Math.max(1, a.redline - a.idle), 0, 1);
  }

  /* Two spots, always in the light list. Toggling visible would
     recompile every material on each day/night switch; two lights at
     zero by day are the cheaper side of that trade. */
  buildHeadlights(tier) {
    this.beams = [];
    if (tier === 'low') return;
    const d = this.dims;
    for (const s of [-1, 1]) {
      const spot = new THREE.SpotLight(0xe8eef8, 0, 110, 0.4, 0.5, 1.6);
      spot.position.set(d.front - 0.2, 0.7, s * 0.55);
      spot.target.position.set(d.front + 40, -1.5, s * 3);
      this.model.add(spot, spot.target);
      this.beams.push(spot);
    }
  }

  setPaint(p) { setPaint(this.materials, p); }

  /* on the racing line; slot > 0 is a place back on the grid */
  placeOnGrid(slot = 0, lane = null) {
    const u = ((1 - 0.0015 - slot * 9 / this.world.length) % 1 + 1) % 1;
    const f = this.world.frameAt(u);
    const off = lane ?? (this.world.twoWay ? this.world.width * 0.3 : (slot % 2 ? 1 : -1) * this.world.width * 0.2);
    this.pos.copy(f.pos).addScaledVector(f.side, off).setY(0);
    this.heading = Math.atan2(f.tan.x, f.tan.z);
    this.speed = 0; this.lateral = 0; this.u = u; this.lap = 0;
    this.pose();
  }

  fwd() { return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)); }
  right() { return new THREE.Vector3(-Math.cos(this.heading), 0, Math.sin(this.heading)); }

  updateContacts() {
    const f = this.fwd(), r = this.right(), d = this.dims;
    this.contactL.copy(this.pos).addScaledVector(f, d.axleR).addScaledVector(r, -d.trackZ);
    this.contactR.copy(this.pos).addScaledVector(f, d.axleR).addScaledVector(r, d.trackZ);
  }

  pose() {
    this.model.position.copy(this.pos);
    this.model.rotation.set(0, this.heading - Math.PI / 2, 0);
    this.model.rotateX(this.bodyRoll);          // local x is the car's length: roll
    this.model.rotateZ(this.bodyPitch);         // local z is its width: pitch
    this.updateContacts();
  }

  /* ─────────────────────────── step ─────────────────────── */
  update(dt, input, held) {
    if (held) {
      /* on the grid: still, revving if asked, and everything the other
         systems read is still produced */
      this.speed = 0; this.lateral = 0; this.slip = 0;
      const want = this.ice ? this.idleRpm + input.throttle * (this.car.audio.redline * 0.7 - this.idleRpm) : 0;
      this.rpm += (want - this.rpm) * Math.min(1, dt * 7);
      this.brakeLight = 1;
      this.pose();
      return;
    }

    const T = this.T, v = this.speed, absV = Math.abs(v);
    const mu = T.grip * (this.offTrack > 0.1 ? 0.62 : 1);

    /* steering: less lock with speed, self-centring */
    const lock = 0.56 * (1 - Math.min(0.72, absV / 70));
    this.steer += (input.steer * lock - this.steer) * Math.min(1, dt * 8);

    /* longitudinal: power-limited, then traction-limited */
    const band = this.ice ? 0.62 + 0.38 * Math.sin(Math.min(1, this.rpmNorm * 0.95 + 0.12) * Math.PI * 0.9) : 1;
    const shiftCut = this.shiftHold > 0.2 && this.ice ? 0.25 : 1;
    const limiter = this.onLimiter ? 0.3 : 1;
    const aPower = this.powerW / (this.mass * Math.max(absV, 3.5));
    const aDrive = input.throttle * Math.min(aPower * band, mu * G * 0.92) * shiftCut * limiter;
    const aBrake = input.brake * mu * G * 1.05;
    const aDrag = this.dragK * v * absV;
    const aRoll = 0.14 * Math.sign(v);
    const aRough = this.offTrack * 3.4 * Math.sign(v) * Math.min(1, absV / 6);

    let a;
    if (input.brake > 0.1 && v < 0.5) a = -input.brake * 4.5;                   // reverse from a stop
    else a = aDrive - aBrake * Math.sign(v || 1) - aDrag - aRoll - aRough;
    this.speed += a * dt;
    if (input.throttle < 0.02 && input.brake < 0.02 && Math.abs(this.speed) < 0.3) this.speed *= 0.8;
    this.speed = THREE.MathUtils.clamp(this.speed, -8, this.topSpeed * 1.01);
    this.accel = a;

    /* yaw, limited by the grip there is to turn with: ask too much and
       the front washes wide — understeer */
    /* heading grows to the left (fwd = sin h, cos h), so a right-hand
       steer is a negative yaw rate */
    let yaw = -(this.speed / Math.max(this.dims.wheelbase, 1.5)) * Math.tan(this.steer);
    const latLimit = mu * G;
    const lat = yaw * this.speed;
    this.understeer = 0;
    if (Math.abs(lat) > latLimit) {
      const over = Math.abs(lat) - latLimit;
      this.understeer = Math.min(1, over / latLimit);
      yaw *= latLimit / Math.abs(lat);
      this.lateral += over * Math.sign(lat) * dt * 0.35;
    }
    /* handbrake: the rear lets go and the tail steps out */
    if (input.handbrake > 0.5 && absV > 4) {
      yaw *= 1.7;
      this.lateral += yaw * this.speed * dt * 0.9;
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 5.5 * dt);
    }
    this.lateral *= 1 - Math.min(1, dt * (input.handbrake > 0.5 ? 0.9 : 3.2));
    this.heading += yaw * dt;

    const f = this.fwd(), r = this.right();
    /* lateral has the sign of the lateral load: in a right-hander it is
       negative, and the slide goes left — outward, as it should */
    this.pos.addScaledVector(f, this.speed * dt).addScaledVector(r, this.lateral * dt);

    /* where on the lap, and is this still road */
    const near = this.world.progressNear(this.pos, this.u, 0.04);
    if (near.u < this.u - 0.5) this.lap++;
    else if (near.u > this.u + 0.5) this.lap--;
    this.u = near.u;
    this.lane = near.lateral;
    const edge = this.world.width / 2 + 0.7;
    this.offTrack = near.dist > edge ? Math.min(1, (near.dist - edge) / 5) : 0;

    /* a hard limit well outside the verge: hit it once, then drive away */
    /* the barrier on the circuit, the sea wall and lamp line on the
       motorway, open ground on the salt */
    const wall = this.world.width / 2 + ({ circuit: 4.2, spine: 2.2 }[this.world.id] ?? 16);
    this.wallHit = 0;
    if (near.dist > wall) {
      const fr = this.world.frameAt(this.u);
      const out = this.pos.clone().sub(fr.pos).setY(0).normalize();
      this.pos.copy(fr.pos).addScaledVector(out, wall).setY(0);
      const into = f.dot(out);
      if (into > 0) {
        this.wallHit = Math.min(1, absV * into / 25);
        this.speed *= 1 - 0.55 * into;
        this.heading += Math.sign(r.dot(out)) * 0.1 * into;     // wall on the right: turn left, away
        this.lateral = 0;
      }
    }

    this.gearbox(dt, input);

    this.slip = THREE.MathUtils.clamp(
      Math.abs(this.lateral) / 3 + this.understeer * 0.5 +
      (input.handbrake > 0.5 && absV > 4 ? 0.8 : 0) +
      (input.throttle > 0.9 && absV < 9 && aPower > mu * G * 1.4 ? 0.6 : 0) +
      this.offTrack * 0.7, 0, 1.6);

    /* what the eye sees: roll into the corner, squat and dive */
    const latG = THREE.MathUtils.clamp(yaw * this.speed / G, -1.6, 1.6);
    this.bodyRoll += (latG * 0.035 - this.bodyRoll) * Math.min(1, dt * 6);
    /* squat under power, dive under braking */
    this.bodyPitch += (THREE.MathUtils.clamp(a * 0.0045, -0.045, 0.035) - this.bodyPitch) * Math.min(1, dt * 5);
    this.pose();

    const tf = this.world.frameAt(this.u);
    this.trackHeading = Math.atan2(tf.tan.x, tf.tan.z);

    this.wheelAngle -= (this.speed / Math.max(0.25, this.dims.wheelR)) * dt;
    for (const w of this.parts.wheels) {
      w.spin.rotation.z = this.wheelAngle;
      if (w.hub.userData.front) w.hub.rotation.y = -this.steer * 0.9;   // +y turns the nose left
    }
    this.brakeLight = input.brake > 0.05 ? 1 : 0;
  }

  /* automatic: up at the top of each band, down near the bottom */
  gearbox(dt) {
    const A = this.car.audio, top = this.topSpeed, box = this.box;
    const g = THREE.MathUtils.clamp(this.gear, 1, box.length);
    const hi = box[g - 1] * top, lo = g > 1 ? box[g - 2] * top : 0;
    const through = THREE.MathUtils.clamp((Math.abs(this.speed) - lo) / Math.max(0.5, hi - lo), 0, 1.1);

    const floor = this.ice ? 0.3 : 0;
    const target = A.idle + (A.redline - A.idle) * (floor + through * (1 - floor));
    this.rpm += (Math.max(this.idleRpm, target) - this.rpm) * Math.min(1, dt * 8);

    this.shiftHold = Math.max(0, (this.shiftHold || 0) - dt);
    if (!this.shiftHold) {
      if (through >= 1 && this.gear < box.length) { this.gear++; this.shiftHold = this.ice ? 0.3 : 0.15; this.justShifted = 1; }
      else if (through < (this.ice ? 0.28 : 0.1) && this.gear > 1) { this.gear--; this.shiftHold = 0.3; }
    }
    this.onLimiter = this.ice && this.gear >= box.length && through > 0.99;
    if (this.onLimiter) this.rpm = A.redline * (0.97 + Math.sin(performance.now() * 0.05) * 0.025);
    this.reverse = this.speed < -0.5;
  }

  get gearLabel() {
    if (this.reverse) return 'R';
    if (Math.abs(this.speed) < 0.3 && !this.ice) return 'D';
    if (Math.abs(this.speed) < 0.3) return 'N';
    return this.ice ? String(this.gear) : `D${this.gear}`;
  }

  setNight(t) {
    for (const b of this.beams) b.intensity = t * 900;
    this.materials.lamp.emissiveIntensity = 1.4 + t * 3;
    this.night = t;
  }

  /* ember is for brake lights: dim running light, hard when braking */
  updateLights() {
    /* kept under the point where the colour clips: past it, ember reads as peach */
    const n = this.night || 0;
    this.materials.tail.emissiveIntensity = this.brakeLight ? 1.6 + n * 0.8 : 0.25 + n * 0.6;
    this.materials.tail.emissive.setHex(PALETTE.ember);
  }
}

/* ═══════════════════════════════════════════════════════════
   CAMERA RIG — three seats
   ═══════════════════════════════════════════════════════════ */
export const VIEWS = ['chase', 'driver', 'passenger'];
export const VIEW_LABELS = { chase: 'Third person', driver: 'First person', passenger: 'Passenger' };

export class CameraRig {
  constructor(camera, vehicle) {
    this.camera = camera;
    this.v = vehicle;
    this.view = 'chase';
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.shake = 0;
    this.baseFov = 60;
    this.snap = true;
  }
  cycle() { this.set(VIEWS[(VIEWS.indexOf(this.view) + 1) % VIEWS.length]); return this.view; }
  set(view) {
    if (!VIEWS.includes(view)) return;
    this.view = view;
    this.snap = true;
    /* inside, the glass and the roof would sit in the lens */
    const inside = view !== 'chase';
    this.v.model.traverse(o => { if (o.name === 'glass') o.visible = !inside; });
    if (this.v.parts.cabin) this.v.parts.cabin.visible = inside;
  }

  update(dt) {
    const v = this.v, d = v.dims;
    const f = v.fwd(), r = v.right();
    const sp = THREE.MathUtils.clamp(Math.abs(v.speed) / Math.max(10, v.topSpeed), 0, 1);
    const want = new THREE.Vector3(), aim = new THREE.Vector3();
    let fov = this.baseFov, k = 1;

    if (this.view === 'chase') {
      const back = 6.6 + d.length * 0.34 + sp * 2.4;
      want.copy(v.pos).addScaledVector(f, -back).addScaledVector(r, v.lateral * 0.12).setY(2.1 + d.height * 0.45 + sp * 0.3);
      aim.copy(v.pos).addScaledVector(f, 6 + sp * 10).setY(0.9);
      k = 1 - Math.exp(-dt * 7);
      fov += sp * 16;
    } else {
      /* the seat, in the car's own frame, roll and pitch included */
      const seat = this.view === 'driver' ? d.driver : d.passenger;
      v.model.updateMatrixWorld();
      want.set(seat[0], seat[1], seat[2]);
      v.model.localToWorld(want);
      aim.copy(want).addScaledVector(f, 30).addScaledVector(r, v.steer * 8).setY(want.y - 1.6);
      fov = this.baseFov - 2 + sp * 12;
    }

    if (this.snap) { this.pos.copy(want); this.look.copy(aim); this.snap = false; }
    else if (this.view === 'chase') {
      this.pos.lerp(want, k);
      this.look.lerp(aim, 1 - Math.exp(-dt * 10));
    } else { this.pos.copy(want); this.look.copy(aim); }

    this.shake = Math.max(this.shake * (1 - Math.min(1, dt * 3)), v.offTrack * 0.5 + sp * sp * 0.06);
    const s = this.shake * (this.view === 'chase' ? 0.08 : 0.035);
    this.camera.position.copy(this.pos).add(new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.look);
    if (this.view !== 'chase') this.camera.rotateZ(-v.bodyRoll * 0.8);

    /* a narrow screen crops the road: widen the lens by aspect */
    const aspectBoost = this.camera.aspect < 1 ? (1 / this.camera.aspect - 1) * 18 : 0;
    fov = Math.min(100, fov + aspectBoost);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3);
      this.camera.updateProjectionMatrix();
    }
  }
}
