/* ═══════════════════════════════════════════════════════════
   THE CAR
   An arcade bicycle model: enough real behaviour that weight,
   grip and gearing are felt, without pretending to be a
   full vehicle dynamics solver.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { buildCarModel, makeMaterials, PROTOS, relink } from '../carbuilder.js';

const GEAR_TOP = [0.13, 0.24, 0.36, 0.50, 0.64, 0.80, 1.0];

export class Vehicle {
  constructor(car, world, opts = {}) {
    this.car = car;
    this.world = world;
    this.quality = opts.quality || 'high';
    this.tuning = car.drive;
    this.proto = PROTOS[car.proto];

    this.materials = makeMaterials(1.0);
    this.model = buildCarModel(car.proto, { materials: this.materials, quality: this.quality });
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    this.dims = this.model.userData.dims;
    this.parts = this.model.parts;

    const p = car.paints[0];
    this.materials.paint.color.set(p.hex);
    this.materials.paint.metalness = p.metal;
    this.materials.paint.roughness = p.rough;

    /* motion state */
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;               // m/s along the car's own axis
    this.lateral = 0;             // sideways slide, for the drift feel
    this.steer = 0;
    this.rpm = car.audio.idle || 800;
    this.gear = 1;
    this.reverse = false;
    this.offTrack = 0;
    this.u = 0;                   // where we are round the lap
    this.lap = 0;
    this.wheelAngle = 0;
    this.bodyRoll = 0;
    this.bodyPitch = 0;

    this.topSpeed = this.tuning.topSpeed / 3.6;
    this.wheelbase = this.dims.wheelbase;

    this.buildHeadlights();
    this.placeOnGrid(0);
  }

  buildHeadlights() {
    this.lampGroup = new THREE.Group();
    this.model.add(this.lampGroup);
    this.beams = [];
    if (this.quality === 'low') return;

    for (const s of [-1, 1]) {
      const spot = new THREE.SpotLight(0xdfeaff, 0, 95, 0.42, 0.55, 1.4);
      spot.position.set(this.dims.axleF + 0.6, 0.72, s * 0.55);
      spot.target.position.set(this.dims.axleF + 40, -1.2, s * 3.5);
      this.lampGroup.add(spot, spot.target);
      this.beams.push(spot);
    }
  }

  setPaint(paint) {
    this.materials.paint.color.set(paint.hex);
    this.materials.paint.metalness = paint.metal;
    this.materials.paint.roughness = paint.rough;
  }

  /* drop the car onto the racing line, `slot` places it back in the field */
  placeOnGrid(slot = 0) {
    const u = (1 - slot * 0.006 + 1) % 1;
    const f = this.world.frameAt(u);
    const lane = (slot % 2 ? 1 : -1) * this.world.width * 0.18;
    this.pos.copy(f.pos).addScaledVector(f.side, lane).setY(0);
    this.heading = Math.atan2(f.tan.x, f.tan.z);
    this.speed = 0;
    this.lateral = 0;
    this.u = u;
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.heading - Math.PI / 2;
  }

  get kmh() { return Math.abs(this.speed) * 3.6; }
  get rpmNorm() {
    const a = this.car.audio;
    return THREE.MathUtils.clamp((this.rpm - a.idle) / Math.max(1, a.redline - a.idle), 0, 1);
  }

  /* ─────────────────────────── step ─────────────────────── */
  update(dt, input, locked) {
    /* held on the grid: the car must sit still, not creep backwards
       because something is standing on the brake */
    if (locked) {
      this.speed = 0; this.lateral = 0;
      this.rpm += ((this.car.audio.idle * (1 + input.throttle * 1.6)) - this.rpm) * Math.min(1, dt * 6);
      this.model.position.copy(this.pos);
      this.model.rotation.set(0, this.heading - Math.PI / 2, 0);
      return;
    }
    const T = this.tuning;
    const v = this.speed;
    const absV = Math.abs(v);

    /* steering: less lock the faster you go, and it returns to centre */
    const target = input.steer * (1 - Math.min(0.62, absV / 95));
    this.steer += (target - this.steer) * Math.min(1, dt * 9);

    /* longitudinal forces */
    const powerBand = 0.55 + 0.45 * Math.sin(Math.min(1, this.rpmNorm + 0.15) * Math.PI * 0.85);
    const drive = input.throttle * T.power * 11.5 * powerBand * (1 - Math.min(0.92, absV / (this.topSpeed * 1.04)));
    const braking = input.brake * 17 * (v > 0 ? 1 : -1);
    const drag = 0.0026 * v * absV * (this.proto.width * this.proto.width * 0.9);
    const roll = 0.42 * Math.sign(v);
    const rough = this.offTrack > 0 ? Math.sign(v) * 7.5 * this.offTrack : 0;

    let a = drive - braking - drag - roll - rough;

    /* reverse when you keep braking at a standstill */
    if (input.brake > 0.2 && v < 0.6 && v > -this.topSpeed * 0.12) a = -6 * input.brake;
    this.speed += a * dt;
    if (input.throttle < 0.02 && input.brake < 0.02 && Math.abs(this.speed) < 0.35) this.speed *= 0.86;
    this.speed = THREE.MathUtils.clamp(this.speed, -this.topSpeed * 0.16, this.topSpeed);

    /* yaw, limited by how much grip there is to turn with */
    const steerAngle = this.steer * 0.58;
    let yaw = (this.speed / Math.max(this.wheelbase, 1.2)) * Math.tan(steerAngle);
    const gripLimit = T.grip * 9.81 * (this.offTrack ? 0.55 : 1);
    const latAccel = yaw * this.speed;
    if (Math.abs(latAccel) > gripLimit) {
      const scale = gripLimit / Math.abs(latAccel);
      this.lateral += (Math.abs(latAccel) - gripLimit) * Math.sign(latAccel) * dt * 0.55;
      yaw *= scale;
    }
    if (input.handbrake > 0.5 && absV > 4) {
      yaw *= 1.5;
      this.lateral += yaw * this.speed * dt * 1.1;
      this.speed *= 1 - dt * 0.55;
    }
    this.lateral *= 1 - Math.min(1, dt * (input.handbrake > 0.5 ? 1.1 : 3.4));
    this.heading += yaw * dt;

    /* integrate */
    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    this.pos.addScaledVector(fwd, this.speed * dt);
    this.pos.addScaledVector(side, this.lateral * dt);

    /* where are we on the lap, and are we still on the road */
    const near = this.world.progressNear(this.pos, this.u, 0.05);
    if (near.u < this.u - 0.5) this.lap++;
    else if (near.u > this.u + 0.5) this.lap--;
    this.u = near.u;
    const edge = this.world.width / 2 + 0.6;
    this.offTrack = near.dist > edge ? Math.min(1, (near.dist - edge) / 7) : 0;

    /* a soft wall well outside the verge, so you can never be lost */
    const hardEdge = this.world.width / 2 + 26;
    if (near.dist > hardEdge) {
      const f = this.world.frameAt(this.u);
      const push = this.pos.clone().sub(f.pos).setY(0).normalize();
      this.pos.copy(f.pos).addScaledVector(push, hardEdge).setY(0);
      this.speed *= 0.55;
    }

    /* gearbox */
    this.updateGears(dt, input);

    /* what the eye sees: roll into the corner, squat and dive */
    const latG = THREE.MathUtils.clamp(yaw * this.speed / 9.81, -1.4, 1.4);
    this.bodyRoll += (-latG * 0.045 - this.bodyRoll) * Math.min(1, dt * 6);
    this.bodyPitch += (THREE.MathUtils.clamp(-a * 0.0055, -0.05, 0.05) - this.bodyPitch) * Math.min(1, dt * 5);

    this.model.position.copy(this.pos);
    this.model.rotation.set(this.bodyPitch, this.heading - Math.PI / 2, this.bodyRoll);

    /* wheels: roll, and turn the fronts */
    this.wheelAngle -= (this.speed / Math.max(0.2, this.proto.wheelR)) * dt;
    const wheels = this.parts.wheels;
    for (let i = 0; i < wheels.length; i++) {
      wheels[i].spin.rotation.z = this.wheelAngle;
      if (i < 2) wheels[i].rotation.y = steerAngle * 0.85;   // the fronts steer
    }
  }

  updateGears(dt, input) {
    const A = this.car.audio;
    const topMS = this.topSpeed;
    const g = THREE.MathUtils.clamp(this.gear, 1, GEAR_TOP.length);
    const bandTop = GEAR_TOP[g - 1] * topMS;
    const bandBottom = g > 1 ? GEAR_TOP[g - 2] * topMS : 0;
    const through = THREE.MathUtils.clamp(
      (Math.abs(this.speed) - bandBottom) / Math.max(0.5, bandTop - bandBottom), 0, 1.12);

    const targetRpm = A.idle + (A.redline - A.idle) * (0.22 + through * 0.78);
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 7);

    this.shiftHold = Math.max(0, (this.shiftHold || 0) - dt);
    if (!this.shiftHold) {
      if (through > 1.0 && this.gear < GEAR_TOP.length) { this.gear++; this.shiftHold = 0.34; this.justShifted = 1; }
      else if (through < 0.05 && this.gear > 1) { this.gear--; this.shiftHold = 0.3; }
    }
    this.reverse = this.speed < -0.5;
  }

  setNight(t) {
    for (const b of this.beams) b.intensity = t * 190;
    const M = this.materials;
    M.head.emissiveIntensity = 1.1 + t * 4.2;
    M.tail.emissiveIntensity = 0.28 + t * 2.4;
  }

  /* red under braking */
  updateLights(input) {
    /* barely lit in daylight, alive at night, and hard on the brakes */
    const base = 0.28 + (this.nightBlend || 0) * 2.4;
    this.materials.tail.emissiveIntensity = base * (input.brake > 0.05 ? 3.2 : 1);
  }
}

/* ═══════════════════════════════════════════════════════════
   CAMERA RIG
   Three seats: behind, at the wheel, and beside the driver.
   ═══════════════════════════════════════════════════════════ */
export const VIEWS = ['chase', 'driver', 'passenger'];
export const VIEW_LABELS = { chase: 'Chase', driver: 'Driver', passenger: 'Passenger' };

export class CameraRig {
  constructor(camera, vehicle) {
    this.camera = camera;
    this.v = vehicle;
    this.view = 'chase';
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.shake = 0;
    this.baseFov = 62;
  }

  cycle() {
    this.view = VIEWS[(VIEWS.indexOf(this.view) + 1) % VIEWS.length];
    this.snap = true;
    return this.view;
  }
  set(view) { if (VIEWS.includes(view)) { this.view = view; this.snap = true; } }

  update(dt, input) {
    const v = this.v;
    const d = v.dims;
    const fwd = new THREE.Vector3(Math.sin(v.heading), 0, Math.cos(v.heading));
    const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const speedN = THREE.MathUtils.clamp(Math.abs(v.speed) / Math.max(8, v.topSpeed), 0, 1);

    let want = new THREE.Vector3(), lookAt = new THREE.Vector3(), lerp = 1, fov = this.baseFov;

    if (this.view === 'chase') {
      const back = 7.4 + speedN * 2.6 + d.length * 0.30;
      const high = 2.55 + speedN * 0.45;
      want.copy(v.pos)
        .addScaledVector(fwd, -back)
        .addScaledVector(side, -v.lateral * 0.09)
        .setY(high);
      lookAt.copy(v.pos).addScaledVector(fwd, 7 + speedN * 9).setY(0.95);
      lerp = 1 - Math.pow(0.0009, dt);
      fov = this.baseFov + speedN * 16;
    } else {
      const seat = this.view === 'driver' ? d.driver : d.passenger;
      want.copy(v.pos)
        .addScaledVector(fwd, seat[0])
        .addScaledVector(side, seat[2])
        .setY(seat[1] + 0.30);
      /* look where the car is going, with a glance into the corner */
      lookAt.copy(want)
        .addScaledVector(fwd, 26)
        .addScaledVector(side, v.steer * 7)
        .setY(want.y - 0.55 - speedN * 0.35);
      lerp = 1;
      fov = this.baseFov - 6 + speedN * 14;
    }

    if (this.snap) { this.pos.copy(want); this.look.copy(lookAt); this.snap = false; }
    else {
      this.pos.lerp(want, Math.min(1, lerp));
      this.look.lerp(lookAt, Math.min(1, this.view === 'chase' ? 1 - Math.pow(0.0004, dt) : 1));
    }

    /* the car is never perfectly smooth: kerbs and revs come through */
    this.shake = Math.max(this.shake * (1 - dt * 3.2), v.offTrack * 0.55 + speedN * 0.05);
    const s = this.shake * (this.view === 'chase' ? 0.10 : 0.16);
    this.camera.position.copy(this.pos).add(new THREE.Vector3(
      (Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
    this.camera.lookAt(this.look);
    this.camera.up.set(0, 1, 0);
    if (this.view !== 'chase') this.camera.rotateZ(-v.bodyRoll * 0.6);

    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3);
      this.camera.updateProjectionMatrix();
    }
  }
}
