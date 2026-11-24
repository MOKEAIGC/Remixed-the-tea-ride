'use strict';

const Ride = (() => {
  const WALK_SPEED = 2.9, RUN_SPEED = 6.8, REVERSE_SPEED = 1.7;
  const AIR_SPEED = 11.4, AIR_LIMIT = 32, CRUISE_SPEED = 7.4;
  const BODY_RADIUS = .64, SCREEN_ASPECT = 16 / 9;
  const cameraLabels = ['跟随镜头', '骑手视角', '侧面跟拍'];
  const spawn = V3(-12, 0, 0);
  const state = {
    pos: spawn.clone(), vel: V3(), t: 0, yaw: PI, pitch: 0, roll: 0,
    speed: 0, mode: 'walk', phase: 0, s: 0, wing: 0, flap: 0, flapLag: 0,
    flapSpeed: 0, flapLagSpeed: 0, legs: 0, glide: 0, water: Path.WATER,
    gait: 0, run: 0, stepLength: .82, direction: 1, air: 0, float: 0,
    altitude: 0, launching: false, landing: false, touchdown: 0, touchdownWet: false,
  };
  const controls = new Set(), eye = V3(), target = V3();
  const desiredEye = V3(), desiredTarget = V3(), anchor = V3();
  let obstacles = [], driveSpeed = 0, turnSpeed = 0, verticalSpeed = 0, wingPhase = 0;
  let launchTime = 0, landingTarget = null, cameraIndex = 0;
  let orbitYaw = -.38, orbitPitch = .39, distance = 7.8, snapCamera = true;

  function clearControls() { controls.clear(); }

  function setControl(name, active) {
    if (active) controls.add(name);
    else controls.delete(name);
  }

  function landHeight(x, z) {
    if (x < Path.PIER_END || x > 33.2 || z > 18.8 || z < (x < -67 ? -12.5 : -8.8)) return null;
    const height = Arch.ground(x, z);
    return height >= 0 ? height : null;
  }

  function blocked(x, z, radius, bottom, top) {
    for (const { min, max } of obstacles) {
      if (top <= min[1] || bottom >= max[1]) continue;
      const dx = x - clamp(x, min[0], max[0]), dz = z - clamp(z, min[2], max[2]);
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  function obstacleTop(x, z, y) {
    let top = Path.WATER;
    for (const obstacle of obstacles) {
      const { min, max } = obstacle;
      if (min[1] >= y + 3.05 || max[1] < y - .55) continue;
      const dx = x - clamp(x, min[0], max[0]), dz = z - clamp(z, min[2], max[2]);
      if (dx * dx + dz * dz < .82 ** 2) top = Math.max(top, max[1] + .04);
    }
    return top;
  }

  function standingHeight(x, z) {
    const height = landHeight(x, z), r = BODY_RADIUS;
    if (height === null || landHeight(x - r, z) === null || landHeight(x + r, z) === null ||
      landHeight(x, z - r) === null || landHeight(x, z + r) === null) return null;
    return blocked(x, z, r, height + .11, height + 3.05) ? null : height;
  }

  function inFlightArea(x, z) { return x >= -158 && x <= 34 && z >= -88 && z <= 21; }

  function openWater(x, z) {
    return Water.isWater(x, z) && (x <= Path.PIER_END || x >= -74 || Math.abs(z) >= 2.5) && Arch.ground(x, z) < Path.WATER;
  }

  function floatingHeight(x, z) {
    const r = BODY_RADIUS;
    if (!inFlightArea(x, z) || !openWater(x, z) || !openWater(x - r, z) || !openWater(x + r, z) ||
      !openWater(x, z - r) || !openWater(x, z + r) || blocked(x, z, r, Path.WATER, Path.WATER + 2.2)) return null;
    return Water.heightAt(x, z);
  }

  function surfaceAt(x, z) {
    const ground = standingHeight(x, z);
    if (ground !== null) return { y: ground, wet: false };
    const water = floatingHeight(x, z);
    return water !== null ? { y: water, wet: true } : null;
  }

  function landingSpotAt(x, z) {
    const spot = surfaceAt(x, z);
    return spot && !blocked(x, z, .88, spot.y, spot.y + 3.1) ? spot : null;
  }

  function goTo(x, z, yaw = PI) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(yaw)) return false;
    const spot = surfaceAt(x, z);
    if (!spot) return false;
    clearControls();
    state.pos.set(x, spot.y, z);
    state.vel.set(0, 0, 0);
    Object.assign(state, {
      yaw, pitch: 0, roll: 0, speed: 0, mode: spot.wet ? 'float' : 'walk', phase: 0,
      s: 0, wing: 0, flap: 0, flapLag: 0, flapSpeed: 0, flapLagSpeed: 0, legs: 0, glide: 0,
      gait: 0, run: 0, stepLength: .82, direction: 1, air: 0, float: Number(spot.wet),
      altitude: 0, launching: false, landing: false,
    });
    driveSpeed = turnSpeed = verticalSpeed = wingPhase = launchTime = 0;
    landingTarget = null;
    snapCamera = true;
    return true;
  }

  function reset() {
    obstacles = [...Arch.colliders, ...Stalls.colliders];
    goTo(spawn.x, spawn.z);
    state.t = state.touchdown = 0;
    state.touchdownWet = false;
    orbitYaw = -.38;
    orbitPitch = .39;
    distance = 7.8;
    cameraIndex = 0;
  }

  function takeoff() {
    if (state.mode === 'fly') {
      if (!state.landing) return false;
      landingTarget = null;
      state.landing = false;
      return true;
    }
    state.mode = 'fly';
    state.launching = true;
    launchTime = 1.05;
    driveSpeed = Math.max(driveSpeed, 2.5);
    verticalSpeed = .38;
    return true;
  }

  function land() {
    if (state.mode !== 'fly' || state.landing) return false;
    const { pos, yaw } = state;
    const pick = (offset, range) => {
      const x = pos.x + Math.cos(yaw + offset) * range;
      const z = pos.z - Math.sin(yaw + offset) * range;
      return landingSpotAt(x, z) ? { x, z } : null;
    };
    for (const range of [Math.min(16, 4 + driveSpeed), 6, 0, 12, 20]) {
      for (const offset of [0, .65, -.65, 1.4, -1.4, PI]) {
        landingTarget = pick(offset, range);
        if (landingTarget) break;
      }
      if (landingTarget) break;
    }
    if (!landingTarget) {
      const nearbyStreet = clamp(pos.x, -71, 29);
      const spots = [[nearbyStreet, 0], [-12, 0], [Math.min(-78, pos.x), clamp(pos.z, -85, 19)], [clamp(pos.x, -155, 31), -50]];
      let nearest = Infinity;
      for (const [x, z] of spots) {
        const gap = Math.hypot(x - pos.x, z - pos.z);
        if (gap >= nearest || !landingSpotAt(x, z)) continue;
        nearest = gap;
        landingTarget = { x, z };
      }
    }
    if (!landingTarget) return false;
    state.landing = true;
    state.launching = false;
    launchTime = 0;
    return true;
  }

  function moveOnSurface(dt, throttle, steer, fast) {
    const afloat = state.mode === 'float';
    const limit = afloat ? throttle < 0 ? 1.35 : fast ? 4.6 : 3.25
      : throttle < 0 ? REVERSE_SPEED : fast ? RUN_SPEED : WALK_SPEED;
    driveSpeed = damp(driveSpeed, throttle * limit, throttle ? 5 : 11, dt);
    if (Math.abs(driveSpeed) < .03) driveSpeed = 0;
    const turnLimit = lerp(2.55, 1.25, clamp(Math.abs(driveSpeed) / RUN_SPEED));
    turnSpeed = damp(turnSpeed, steer * turnLimit, 15, dt);
    state.yaw += turnSpeed * dt;

    const { x, z } = state.pos;
    const nextX = x + Math.cos(state.yaw) * driveSpeed * dt;
    const nextZ = z - Math.sin(state.yaw) * driveSpeed * dt;
    const heightAt = afloat ? floatingHeight : standingHeight;
    const height = heightAt(nextX, nextZ);
    if (height !== null) state.pos.set(nextX, height, nextZ);
    else {
      // Allow movement along the edge of a collider or shore.
      const heightX = heightAt(nextX, z);
      if (heightX !== null) state.pos.set(nextX, heightX, z);
      const heightZ = heightAt(state.pos.x, nextZ);
      if (heightZ !== null) state.pos.set(state.pos.x, heightZ, nextZ);
    }
  }

  function finishLanding(surface, x, z) {
    state.pos.set(x, surface.y, z);
    state.mode = surface.wet ? 'float' : 'walk';
    state.landing = state.launching = false;
    state.touchdown++;
    state.touchdownWet = surface.wet;
    landingTarget = null;
    verticalSpeed = 0;
    driveSpeed = Math.min(driveSpeed, surface.wet ? 2.8 : 3.4);
  }

  function fly(dt, throttle, steer, fast, lift) {
    if (lift > 0 && state.landing) takeoff();
    const { x, y, z } = state.pos;
    let goal = throttle < 0 ? 2.3 : fast ? 16.8 : throttle > 0 ? AIR_SPEED : CRUISE_SPEED;
    let yawSpeed = steer * lerp(1.85, 1.04, clamp(Math.abs(driveSpeed) / AIR_SPEED));
    let climb = lift > 0 ? 4.5 : lift < 0 ? -4.2 : 0;
    if (landingTarget) {
      const dx = landingTarget.x - x, dz = landingTarget.z - z, range = Math.hypot(dx, dz);
      const aim = Math.atan2(-dz, dx), turn = mod(aim - state.yaw + PI, TAU) - PI;
      yawSpeed = range > .20 ? clamp(turn * 3.6, -1.8, 1.8) : 0;
      goal = range > .20 ? Math.min(5.9, range * 1.4) * Math.max(0, Math.cos(turn)) : 0;
      climb = range > 10 ? state.altitude < 8 ? 2.4 : 0 : -2.85;
    } else if (launchTime > 0) {
      launchTime = Math.max(0, launchTime - dt);
      state.launching = launchTime > 0;
      goal = lerp(4.4, goal, 1 - launchTime / 1.05);
      climb = Math.max(climb, lerp(2.4, 5.4, 1 - launchTime / 1.05));
    }
    driveSpeed = damp(driveSpeed, goal, landingTarget ? 5.5 : 2.9, dt);
    turnSpeed = damp(turnSpeed, yawSpeed, 6, dt);
    verticalSpeed = damp(verticalSpeed, climb, 4.8, dt);
    state.yaw += turnSpeed * dt;

    let nextY = clamp(y + verticalSpeed * dt, Path.WATER - .12, AIR_LIMIT);
    const nextX = x + Math.cos(state.yaw) * driveSpeed * dt;
    const nextZ = z - Math.sin(state.yaw) * driveSpeed * dt;
    let floor = Math.max(Path.WATER, Arch.ground(x, z));
    const destination = inFlightArea(nextX, nextZ) && !blocked(nextX, nextZ, .82, nextY + .13, nextY + 3.05);
    if (destination) {
      const nextFloor = Math.max(Path.WATER, Arch.ground(nextX, nextZ));
      if (nextY >= nextFloor - .04) {
        state.pos.x = nextX;
        state.pos.z = nextZ;
        floor = nextFloor;
      }
    }
    if (landingTarget && goal > .24 && x === state.pos.x && z === state.pos.z) {
      verticalSpeed = Math.max(verticalSpeed, 2.4);
      nextY = clamp(y + verticalSpeed * dt, Path.WATER, AIR_LIMIT);
    }
    const surface = nextY < floor + 3.15 ? landingSpotAt(state.pos.x, state.pos.z) : null;
    if (surface && nextY <= surface.y + .025 && verticalSpeed < 0 && !state.launching) {
      finishLanding(surface, state.pos.x, state.pos.z);
    } else {
      const minimum = Math.max(surface ? surface.y : floor + 2.45, obstacleTop(state.pos.x, state.pos.z, y));
      // Over roofs and outside the traversable square stay clear of the scenery.
      state.pos.y = Math.max(Math.min(minimum, y), nextY);
      if (minimum > nextY && !surface && !state.landing) verticalSpeed = Math.max(0, verticalSpeed);
    }
  }

  function animate(dt, lift) {
    const flying = state.mode === 'fly', afloat = state.mode === 'float';
    state.air = damp(state.air, Number(flying), flying ? 4.8 : 6.8, dt);
    state.float = damp(state.float, Number(afloat), afloat ? 4.6 : 6.8, dt);
    state.altitude = flying ? Math.max(0, state.pos.y - Math.max(Path.WATER, Arch.ground(state.pos.x, state.pos.z))) : 0;
    state.glide = damp(state.glide, flying && !state.launching && !state.landing && lift <= 0 && state.altitude > 4
      ? .64 * sm(CRUISE_SPEED - .5, AIR_SPEED + 1.1, state.speed) : 0, 2.6, dt);
    const frequency = lerp(1.52, 1.08, state.glide) + (state.launching || lift > 0 ? .33 : 0);
    wingPhase += dt * frequency * TAU;
    const amplitude = (1 - state.glide * .87) * state.air;
    state.wing = damp(state.wing, flying ? 1 : 0, flying ? 7 : 5.2, dt);
    state.flap = -Math.sin(wingPhase) * amplitude;
    state.flapLag = -Math.sin(wingPhase - .54) * amplitude;
    state.flapSpeed = -Math.cos(wingPhase) * frequency * TAU * amplitude;
    state.flapLagSpeed = -Math.cos(wingPhase - .54) * frequency * TAU * amplitude;
    const legs = flying ? state.landing ? sm(.65, 3.8, state.altitude) : state.launching ? 1 - launchTime / 1.05 : 1 : 0;
    state.legs = damp(state.legs, legs, 6.3, dt);

    const grounded = !flying && !afloat;
    state.gait = damp(state.gait, grounded ? sm(.10, 1.4, state.speed) : 0, 12, dt);
    state.run = damp(state.run, grounded && driveSpeed > 0 ? sm(WALK_SPEED, 5.2, state.speed) : 0, 9, dt);
    if (grounded) state.mode = state.run > .5 ? 'run' : 'walk';
    if (state.speed > .08) state.direction = Math.sign(driveSpeed);
    state.stepLength = lerp(.82, 1.30, state.run);
    state.s += state.speed * dt;
    if (grounded) state.phase += state.speed * dt / state.stepLength;
    const roll = flying ? -turnSpeed * .37 * sm(.5, 4.5, state.speed) : -turnSpeed * .048 * state.gait;
    const pitch = Math.atan2(state.vel.y, Math.max(1, state.speed));
    state.roll = damp(state.roll, roll, 5.6, dt);
    state.pitch = damp(state.pitch, flying ? clamp(pitch * .65, -.38, .42) : afloat ? 0 : clamp(pitch * .35, -.16, .16), 5.6, dt);
  }

  function step(dt) {
    dt = clamp(dt, 0, .05);
    if (!dt) return state;
    const throttle = Number(controls.has('forward')) - Number(controls.has('back'));
    const steer = Number(controls.has('left')) - Number(controls.has('right'));
    const lift = Number(controls.has('ascend')) - Number(controls.has('descend'));
    const fast = controls.has('sprint');
    const { x, y, z } = state.pos;
    if (state.mode === 'fly') fly(dt, throttle, steer, fast, lift);
    else moveOnSurface(dt, throttle, steer, fast);
    state.vel.set((state.pos.x - x) / dt, (state.pos.y - y) / dt, (state.pos.z - z) / dt);
    state.speed = Math.hypot(state.vel.x, state.vel.z);
    animate(dt, lift);
    state.t += dt;
    return state;
  }

  function orbit(dx, dy) {
    orbitYaw = mod(orbitYaw - dx * .006 + PI, TAU) - PI;
    orbitPitch = clamp(orbitPitch + dy * .005, .18, 1.05);
  }

  function zoom(delta) { distance = clamp(distance * Math.exp(delta * .001), 4.4, 13); }

  function cycleCamera() {
    cameraIndex = (cameraIndex + 1) % cameraLabels.length;
    snapCamera = true;
    return cameraLabels[cameraIndex];
  }

  function camera(ctx) {
    const { pos, yaw, air, float, pitch } = ctx.st, cam = ctx.cam;
    const mounted = cameraIndex === 1;
    if (mounted) {
      const look = yaw + orbitYaw + .38, tilt = clamp(pitch + .37 - orbitPitch, -.65, .56);
      desiredEye.set(pos.x + Math.cos(yaw) * .61, pos.y + 3.18 - .56 * float, pos.z - Math.sin(yaw) * .61);
      desiredTarget.set(desiredEye.x + Math.cos(look) * 8, desiredEye.y + Math.tan(tilt) * 8, desiredEye.z - Math.sin(look) * 8);
    } else {
      const angle = yaw + orbitYaw - (cameraIndex === 2 ? 1.14 : 0);
      const range = distance + air * 1.7, flat = range * Math.cos(orbitPitch);
      desiredEye.set(pos.x - Math.cos(angle) * flat, pos.y + 1.7 - .5 * float + range * Math.sin(orbitPitch), pos.z + Math.sin(angle) * flat);
      const lead = lerp(1.1, 2.7, air);
      desiredTarget.set(pos.x + Math.cos(yaw) * lead, pos.y + 1.65 - .45 * float, pos.z - Math.sin(yaw) * lead);
    }
    if (snapCamera) {
      eye.copy(desiredEye);
      target.copy(desiredTarget);
      snapCamera = false;
    } else {
      eye.lerp(desiredEye, 1 - Math.exp(-9 * ctx.dt));
      target.lerp(desiredTarget, 1 - Math.exp(-12 * ctx.dt));
    }

    anchor.copy(pos).y += 2.15 - .55 * float;
    const samples = Math.ceil(anchor.distanceTo(eye) / .45);
    for (let i = 1; i <= samples; i++) {
      cam.position.lerpVectors(anchor, eye, i / samples);
      const { x, y, z } = cam.position;
      if (y < Math.max(Path.WATER, Arch.ground(x, z)) + .18 || blocked(x, z, .2, y - .2, y + .2)) {
        cam.position.lerpVectors(anchor, eye, Math.max(.08, (i - 1) / samples));
        break;
      }
    }
    if (!samples) cam.position.copy(eye);
    cam.up.set(0, 1, 0);
    cam.near = mounted ? .16 : .12;
    cam.far = 1400;
    const fov = mounted ? 67 + (distance - 7.8) * 2.5 : 47 + 6 * ctx.st.run + 8 * air;
    cam.fov = cam.aspect < SCREEN_ASPECT
      ? Math.min(90, 2 * Math.atan(Math.tan(deg(fov) / 2) * lerp(SCREEN_ASPECT / cam.aspect, 1, .5)) * 180 / PI)
      : fov;
    cam.updateProjectionMatrix();
    cam.lookAt(target);
    cam.updateMatrixWorld();
  }

  function view(ctx) {
    return { focus: ctx.cam.position.distanceTo(target), aperture: 0, lightFocus: ctx.st.pos, lightBox: 34, tod: 25, shafts: .3, lanGain: .3 };
  }

  return { state, reset, goTo, setControl, clearControls, step, takeoff, land, camera, view, orbit, zoom, cycleCamera,
    get cameraLabel() { return cameraLabels[cameraIndex]; } };
})();
