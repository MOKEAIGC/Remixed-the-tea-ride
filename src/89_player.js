'use strict';
// ---- PLAYER: one clock (the audio clock once sound is on), hands on the world, quality control ------------------------------------------
const Player = (() => {
  const cv = document.getElementById('c'), hud = document.getElementById('hud'); let base = 0, paused = false, pausedAt = 0, last = -1, lastNow = 0, running = false, hudT = 0; const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), P = { x: 0, y: 0, px: 0, py: 0, down: false, moved: 0, t: 0, id: -1, sx: 0, sy: 0 }, wp = V3(), wl = V3(), plane = new THREE.Plane(), nrm = V3(), tmp = V3(); let pinch = 0, ptrs = new Map();
  let mode = 'film', filmAt = 0, rideAt = 6, rideStarted = false, loader, chapter, savedFilmView;
  const keyboard = new Set(), touch = new Set(), automatic = new Set();
  const rideKeys = {
    KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyZ: 'ascend', KeyX: 'descend',
  };
  let notice;
  I18n.subscribe(() => { if (notice) hud.textContent = I18n.text(notice); });
  const say = (message, ms = 3600) => {
    notice = message;
    hud.textContent = I18n.text(notice);
    hud.style.opacity = 1;
    clearTimeout(hudT);
    hudT = setTimeout(() => { hud.style.opacity = 0; notice = undefined; }, ms);
  };
  const raw = () => paused ? pausedAt : Sound.on ? Sound.time() : (performance.now() - base) / 1000;         // runs on over loops
  const clock = () => mode === 'scene' ? clamp(raw(), chapter.start, chapter.end) : mode === 'ride' ? Math.max(0, raw()) % Score.DUR : mod(raw(), Score.DUR);
  function sound() {
    if (!running || paused || Sound.on || !Sound.ready || !Sound.open()) return;
    const requestedMode = mode;
    Sound.ctx.resume().then(() => {
      if (mode === requestedMode && !paused && !Sound.on && Sound.ctx.state === 'running') {
        Sound.play(clock(), mode === 'ride');
      }
    }).catch(() => {});
  }
  function toggle() {
    if (paused) {
      paused = false;
      base = performance.now() - pausedAt * 1000;
      if (Sound.ctx && Sound.ready) Sound.ctx.resume().then(() => { if (!paused && !Sound.on) Sound.play(clock(), mode === 'ride'); }).catch(() => {});
    } else {
      pausedAt = clock();
      paused = true;
      Sound.stop();
      if (mode === 'ride') { keyboard.clear(); touch.clear(); for (const name of Object.values(rideKeys)) syncControl(name); }
    }
  }
  // ---- live notes: what the world answers with
  Score.onLive = (tr, e) => { const d = Math.max(0, e.t - Main.ctx.t), map = { koto: 'koto', bell: 'bell', lemon: 'bowl', lemon2: 'bowl', taiko: 'taiko', wood: 'wood1', chord: 'burner' }, k = map[tr]; if (!k) return; Sound.hit(k, { m: e.m, v: (e.v || .8) * (k === 'taiko' ? .8 : .7), delay: d, pan: e.pan || 0 }); };
  const THUD = { stone: ['lemon', .5], wood: ['lemon', .6], cloth: ['boing', .5], bird: ['boing', .35], kick: ['lemon', .6], folk: ['lemon', .4], fruit: ['lemon', .28], water: ['drop', .7] }; let lastThud = 0;
  Phys.on((kind, b, s) => { const now = performance.now(); if (now - lastThud < 28) return; lastThud = now; const q = THUD[kind]; if (!q) return; const v = clamp(s / 5) * q[1], i = Math.floor(b.tone * 4) % 4; if (kind === 'wood' && b.live) { const e = Score.quant(60 + Math.round(b.tone * 22), Main.ctx.t); Sound.hit('bowl', { m: e, v: v * .9 }); } else Sound.hit(q[0] === 'boing' ? 'boing' : q[0] + i, { v, rate: .9 + .3 * b.tone }); if (kind === 'water' && typeof Water !== 'undefined' && Water.splash) Water.splash(b.p.x, b.p.z, .35, .8); if (b.live && kind !== 'water' && s > 1.2 && typeof Lemons !== 'undefined') Lemons.ring(b.p, 60 + b.tone * 24, Main.ctx.t, clamp(s / 6, .3, .9)); });
  const NAMES = { pelican: 'honk', rider: 'slurp' }, BEAST = { lamb: 'bleat', dog: 'yip', turtle: 'thump', giraffe: 'giraffe', rhino: 'snort', elephant: 'trumpet' };
  function setRay(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, Main.cam); }
  // the pointer is a breath of wind: where it crosses the plane through the bird facing the lens
  function gust(x, y, dt) { setRay(x, y); Main.cam.getWorldDirection(nrm); plane.setFromNormalAndCoplanarPoint(nrm, tmp.copy(Main.ctx.st.pos).setY(Main.ctx.st.pos.y + 1.6)); if (!ray.ray.intersectPlane(plane, wp)) return; if (dt > 0 && dt < .2) { const vx = clamp((wp.x - wl.x) / dt, -14, 14), vy = clamp((wp.y - wl.y) / dt, -14, 14), vz = clamp((wp.z - wl.z) / dt, -14, 14); P.vx = lerp(P.vx || 0, vx, .5); P.vy = lerp(P.vy || 0, vy, .5); P.vz = lerp(P.vz || 0, vz, .5); } wl.copy(wp); }
  function poke(x, y) {
    setRay(x, y); const ctx = Main.ctx; let best = null, bo = null; for (const a of Assets.list) { if (!a.ok || !a.pick || !a.poke) continue; let L; try { L = a.pick; } catch (e) { continue; } if (!L || !L.length) continue; let h; try { h = ray.intersectObjects(L, true); } catch (e) { continue; } for (const k of h) { if (k.object.visible === false) continue; if (!best || k.distance < best.distance) { best = k; bo = a; } break; } }
    if (best && best.distance < 140) { let r; try { r = bo.poke(best, ctx); } catch (e) { console.warn('poke', bo.name, e); } let snd = typeof r === 'string' ? r : NAMES[bo.name], o = best.object, dl = 0; if (bo.name === 'beasts') { while (o && !(o.userData && o.userData.beast)) o = o.parent; snd = o ? BEAST[o.userData.beast.name] : 0; } else if (bo.name === 'stalls' && !best.object.isInstancedMesh) snd = 'boing'; else if (bo.name === 'arch') snd = 'wood0'; else if (bo.name === 'land') snd = 'leaf'; else if (bo.name === 'rider') dl = .62; if (snd) Sound.hit(snd, { v: .8, pan: ndc.x * .6, delay: dl }); if (typeof Lemons !== 'undefined') Lemons.ring(best.point, 60 + (best.point.y * 5) % 24, ctx.t, .7); return bo.name; }
    throwLemon(); return 'lemon'; }
  function throwLemon(v = 11) { const c = Main.cam, d = ray.ray.direction, o = c.position, st = Main.ctx.st; const b = Phys.add({ x: o.x + d.x * .9, y: o.y + d.y * .9 - .12, z: o.z + d.z * .9, vx: d.x * v + st.vel.x * .7, vy: d.y * v + 2.6, vz: d.z * v + st.vel.z * .7, r: .095, live: true }); Sound.hit('whoosh', { v: .25, rate: 1.5 }); return b; }

  function tossLemons(rain) {
    const { pos, yaw, vel } = Ride.state;
    const fx = Math.cos(yaw), fz = -Math.sin(yaw), sx = -fz, sz = fx;
    const count = rain ? 12 : 1;
    for (let i = 0; i < count; i++) {
      const spread = rain ? ((i % 5) - 2) * .45 : .42;
      const reach = rain ? 2.5 + Math.floor(i / 5) * 1.5 : 1.1;
      const speed = rain ? 2.6 : 9.5;
      Phys.add({ x: pos.x + fx * reach + sx * spread, y: pos.y + (rain ? 6.2 + i % 3 * .55 : 2.7),
        z: pos.z + fz * reach + sz * spread, vx: fx * speed + vel.x * .6 + sx * spread,
        vy: rain ? .6 + i % 3 * .35 : 3.3, vz: fz * speed + vel.z * .6 + sz * spread, r: .088, live: true });
    }
    Sound.hit('whoosh', { v: rain ? .64 : .35 });
  }

  function syncControl(name) {
    Ride.setControl(name, automatic.has(name) || touch.has(name) || [...keyboard].some(code => rideKeys[code] === name));
  }

  function clearControls() {
    RideShow.cancelCombo();
    keyboard.clear();
    touch.clear();
    automatic.clear();
    Ride.clearControls();
  }

  function touchControl(name, held) {
    if (mode !== 'ride') return;
    if (held) { if (name !== 'sprint') RideShow.cancelCombo(); touch.add(name); sound(); }
    else touch.delete(name);
    syncControl(name);
  }

  function resetRide() {
    clearControls();
    Phys.bodies.length = 0;
    Ride.reset();
    RideTrail.reset();
    Air.clearRideLanterns();
    Pelican.resetRideActions?.();
    Rider.resetRideActions?.();
    last = -1;
  }

  function playStrings(t, notes) {
    const scale = Score.scaleAt(t);
    for (const [index, delay] of notes) {
      const start = t + delay;
      const m = scale[index] + 12;
      Score.live('koto', { t: start, m, r: clamp(Math.round((m - 50) / 4.2), 0, 7), v: .85 });
    }
  }

  function fullscreen() {
    const change = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    change?.catch(() => say(['当前窗口无法切换全屏', 'Full screen is unavailable in this window.']));
  }

  function rideAction(action, ...args) {
    if (!running) return;
    if (mode === 'scene' && action === 'stopScene') { select('ride'); return; }
    const nextChapter = RideShow.scenes.find(item => item.id === action);
    if (nextChapter && (mode === 'ride' || mode === 'scene')) { select('scene', true, nextChapter); return; }
    if (mode !== 'ride') return;
    sound();
    const t = Main.ctx.t, rideTime = Ride.state.t;
    if (RideShow.startCombo(action, rideAction)) {
      keyboard.clear(); touch.clear(); Ride.clearControls();
      RideUI.closePanel({ focus: false });
      return;
    }
    if (action.startsWith('note')) { playStrings(t, [[Number(action.at(-1)), 0]]); return; }
    switch (action) {
      case 'panel': RideUI.togglePanel(); break;
      case 'reset': resetRide(); break;
      case 'cancelCombo': if (RideShow.cancelCombo()) say(['已恢复手动控制', 'Manual control restored']); break;
      case 'takeoff': if (Ride.takeoff()) Sound.hit('whoosh', { v: .7 }); break;
      case 'land': if (Ride.land()) say(['正在寻找可降落的位置', 'Looking for a landing spot']); break;
      case 'honk': Pelican.honk(rideTime, true); Sound.hit('honk', { v: .75 }); break;
      case 'sip': if (Rider.sip(rideTime, true)) Sound.hit('slurp', { v: .5, delay: .62 }); break;
      case 'lemon': case 'lemonRain': tossLemons(action === 'lemonRain'); break;
      case 'lantern': case 'lanterns': {
        const count = Air.releaseLanterns(Main.ctx, action === 'lantern' ? 1 : 7);
        if (count) {
          Sound.hit('bell', { m: count > 1 ? 86 : 79, v: .52 });
          say([`放飞 ${count} 盏孔明灯`, `Released ${count} sky ${count === 1 ? 'lantern' : 'lanterns'}`]);
        }
        break;
      }
      case 'style': say(RideShow.cycleStyle()); break;
      case 'time': if (args.length) RideShow.setTime(args[0]); else say(RideShow.cycleTime()); break;
      case 'camera': say(Ride.cycleCamera()); break;
      case 'fullscreen': fullscreen(); break;
      case 'mute': toggleMute(); break;
      case 'pause': toggle(); break;
      case 'score': Strip.toggle(); break;
      case 'drum': Score.live('taiko', { t, v: 1, sz: 1 }); break;
      case 'riff': playStrings(t, [[0, 0], [2, .15], [3, .30], [4, .60], [1, .75], [0, .90]]); break;
      case 'place': if (Ride.goTo(args[0], args[1], PI)) last = -1; else RideShow.cancelCombo(); break;
      case 'drive': case 'stopDrive':
        for (const name of ['forward', 'sprint']) {
          if (action === 'drive') automatic.add(name); else automatic.delete(name);
          syncControl(name);
        }
        break;
    }
  }

  function toggleMute(ms) {
    Sound.mute(!Sound.muted);
    say(Sound.muted ? ['已静音', 'Muted'] : ['声音开启', 'Sound on'], ms);
  }

  function rideKey(e) {
    if (e.code === 'Space' && e.target instanceof HTMLButtonElement) return;
    const control = rideKeys[e.code];
    if (control) {
      e.preventDefault();
      if (e.repeat && RideShow.combo && !keyboard.has(e.code)) return;
      if (!e.repeat && control !== 'sprint') RideShow.cancelCombo();
      keyboard.add(e.code);
      syncControl(control);
      sound();
      return;
    }
    if (e.repeat) return;
    if (e.code === 'Escape') {
      if (!RideUI.closePanel()) rideAction('cancelCombo');
      return;
    }
    const action = e.code === 'KeyH' ? 'panel' : RideShow.actionFor(e);
    if (action) { e.preventDefault(); rideAction(action); }
  }

  function keys(e) { if (!running || e.metaKey || e.ctrlKey || e.altKey) return; if (mode === 'ride') return rideKey(e); if (mode === 'scene') { if (e.repeat) return; if (e.code === 'Escape') select('ride'); else if (e.code === 'KeyM') toggleMute(1200); else if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); toggle(); } else if (/^Digit[1-8]$/.test(e.code) && !e.shiftKey) rideAction(RideShow.actionFor(e)); return; } const k = e.key.toLowerCase(), ctx = Main.ctx, t = ctx.t; if (k === ' ' && e.target instanceof HTMLButtonElement) return; if (!Sound.on) sound(); const row = 'asdfghjkl;'.indexOf(k); if (row >= 0 && !e.repeat) { const sc = Score.scaleAt(t), m = sc[row % 5] + 12 * (1 + Math.floor(row / 5)); Score.live('koto', { t, m, r: clamp(Math.round((m - 50) / 4.2), 0, 7), v: .95 }); if (typeof Rider !== 'undefined' && Rider.drop) Rider.drop(row / 10, .5, .6); return; }
    if (k === ' ') { e.preventDefault(); toggle(); } else if (k === 'n') Strip.toggle(); else if (k === 'q') { if (typeof Pelican !== 'undefined' && Pelican.honk) Pelican.honk(t); Sound.hit('honk', { v: .75 }); } else if (k === 'w') { if (typeof Rider !== 'undefined' && Rider.sip) Rider.sip(t); Sound.hit('slurp', { v: .5, delay: .62 }); } else if (k === 'e') { for (let i = 0; i < 10; i++) Phys.add({ x: ctx.st.pos.x - 1.2 - Math.random() * 3, y: ctx.st.pos.y + 5 + Math.random() * 2.5, z: ctx.st.pos.z - 2.6 + Math.random() * 4, vx: ctx.st.vel.x, vy: 0, vz: ctx.st.vel.z, live: true, r: .085 }); } else if (k === 'b') Score.live('taiko', { t, v: 1, sz: 1 }); else if (k === 'p') { Film.printLock = Film.printLock === undefined ? 1 : undefined; } else if (k === 'r') { Film.free.tride = Film.free.tride ? 0 : 1; } else if (k === 'm') toggleMute(1200); else if (k === 'x') fullscreen(); else if (k === '?' || k === '/') say(HELP, 8000); else if (k === 'arrowright' || k === 'arrowleft') seek((((raw() % Score.DUR) + (k === 'arrowright' ? 4.8 : -4.8)) + Score.DUR) % Score.DUR); }
  function seek(t) { base = performance.now() - t * 1000; if (paused) pausedAt = t; if (Sound.on) Sound.play(t); last = -1; }
  const HELP = [
    '点物件互动 · 点空处抛柠檬 · 拖动环视 · 滚轮缩放 · A 到 ; 弹筝 · B 敲鼓 · Q 鸣叫 · W 喝茶 · E 柠檬雨 · R 骑手视角 · P 木版画 · N 乐谱 · 空格暂停 · M 静音 · X 全屏',
    'Click an object to play it · click empty space to throw a lemon · drag to look · scroll to zoom · A through ; koto · B drum · Q honk · W sip · E lemon rain · R rider view · P woodblock · N score · Space pause · M mute · X full screen',
  ];
  function orbit(dx, dy) {
    if (mode === 'ride') Ride.orbit(dx, dy);
    else {
      Film.free.tyaw -= dx * .0052;
      Film.free.tpitch = clamp(Film.free.tpitch + dy * .0036, -.9, 1.1);
      Film.free.hold = 3.2;
    }
  }

  function zoom(delta, held) {
    if (mode === 'ride') Ride.zoom(delta);
    else {
      Film.free.tzoom = clamp(Film.free.tzoom * Math.exp(delta * .0011), held ? .45 : .4, held ? 2.2 : 2.4);
      Film.free.hold = 3.2;
    }
  }

  function events() {
    const opt = { passive: false }; cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); P.down = true; P.moved = 0; P.sx = P.px = e.clientX; P.sy = P.py = e.clientY; P.t = performance.now(); if (!Sound.on) { sound(); } });
    cv.addEventListener('pointermove', e => { const now = performance.now(), dt = (now - (P.lt || now)) / 1000; P.lt = now; gust(e.clientX, e.clientY, dt); if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch && d > 0) zoom(Math.log(pinch / d) / .0011, true); pinch = d; P.moved = 99; return; } if (P.down) { const dx = e.clientX - P.px, dy = e.clientY - P.py; P.moved += Math.abs(dx) + Math.abs(dy); if (P.moved > 8) { orbit(dx, dy); cv.style.cursor = 'grabbing'; } } P.px = e.clientX; P.py = e.clientY; });
    const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0; if (running && P.down && P.moved <= 8 && e.type === 'pointerup') poke(e.clientX, e.clientY); P.down = false; cv.style.cursor = 'grab'; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('wheel', e => { if (running) { e.preventDefault(); zoom(e.deltaY, false); } }, opt);
    addEventListener('keydown', keys);
    addEventListener('keyup', e => { if (keyboard.delete(e.code)) syncControl(rideKeys[e.code]); });
    addEventListener('blur', clearControls);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearControls();
      if (mode === 'ride') return;
      if (document.hidden && Sound.on && !paused) { P.auto = true; toggle(); }
      else if (!document.hidden && P.auto) { P.auto = false; if (paused) toggle(); }
    });
  }
  // keep 60: if frames run long for a while, render a little smaller; climb back when there is room
  let ema = 16, badT = 0, goodT = 0; function govern(ms, now) { ema += (ms - ema) * .06; if (ema > 21 && now - badT > 1400 && Main.quality > .56) { Main.quality = Math.max(.56, Main.quality * .88); badT = now; ema = 17; } if (ema < 12.5 && now - goodT > 6000 && Main.quality < 1) { Main.quality = Math.min(1, Main.quality * 1.08); goodT = now; } }
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame); const t = clock(), loop = last >= 0 && t < last - 1; const dtR = last < 0 ? 1 / 60 : loop ? 1 / 60 : t - last; const jump = last < 0 || Math.abs(dtR) > .5 || loop;
    if (P.vx !== undefined) { const k = Math.exp(-5 * (now - lastNow) / 1000); P.vx *= k; P.vy *= k; P.vz *= k; Wind.wake(1, wp.x, wp.y, wp.z, 1.7, P.vx, P.vy, P.vz, .16); }
    const ms = now - lastNow; lastNow = now; Sound.tick(); G.t = t;
    if (loop) Score.clearLive();
    if (mode === 'ride') {
      const dt = paused ? 0 : clamp(ms / 1000, 0, .05);
      if (!paused) RideShow.stepCombo(dt);
      const step = Math.floor(Ride.state.phase);
      const landed = Ride.state.touchdown;
      if (!paused || last < 0) Main.update(t, dt, jump || last < 0, true);
      const { pos, speed, phase, mode: motion, touchdown, touchdownWet, landing } = Ride.state;
      if (touchdown !== landed) Sound.hit(touchdownWet ? 'splash' : 'hoof', { v: .65 });
      if ((motion === 'walk' || motion === 'run') && Math.floor(phase) > step && speed > .35) {
        Sound.hit(pos.x < -74 ? 'plank' + Math.floor(phase) % 4 : 'hoof', { v: .35 });
      }
      const height = Math.round(Ride.state.altitude);
      const flight = motion === 'fly' ? I18n.t(`飞行 ${height} 米`, `Flying · ${height} m`) :
        motion === 'float' ? I18n.t('水面漂浮', 'On the water') : I18n.t('地面骑行', 'On the ground');
      const status = paused ? I18n.t('已暂停', 'Paused') : landing ? I18n.t('正在降落', 'Landing') : flight;
      RideUI.update({ ...RideTrail.update(Main.ctx), status, style: RideShow.label, camera: Ride.cameraLabel, scene: RideShow.combo });
    } else if (jump) Main.update(t, 1 / 60, true);
    else if (dtR > 0 || paused) {
      const dt = clamp(dtR, 0, .1);
      if (dt > .034) {
        const n = Math.ceil(dt / .0167);
        for (let i = 1; i <= n; i++) Main.update(last + dt * i / n, dt / n, false);
      } else Main.update(t, dt, false);
    }
    last = t;
    Main.draw();
    if (mode !== 'scene') Strip.draw(t);
    else {
      RideUI.setScene({ ...chapter, progress: (t - chapter.start) / (chapter.end - chapter.start) });
      if (t >= chapter.end) select('ride');
    }
    if (ms < 100) govern(ms, now); window.__fps = 1000 / ema;
  }

  function select(next, withSound = true, scene) {
    if (running && next === mode && mode !== 'scene') return;
    if (running) {
      if (mode === 'ride') rideAt = clock();
      else if (mode === 'film') filmAt = clock();
    }
    if (next === 'scene') {
      if (mode !== 'scene') savedFilmView = { camera: { ...Film.free }, printLock: Film.printLock };
      Object.assign(Film.free, { yaw: 0, pitch: 0, zoom: 1, tyaw: 0, tpitch: 0, tzoom: 1, hold: 0, ride: 0, tride: 0 });
      Film.printLock = undefined;
    } else if (mode === 'scene') {
      Object.assign(Film.free, savedFilmView.camera);
      Film.printLock = savedFilmView.printLock;
      savedFilmView = undefined;
    }
    Sound.stop();
    Phys.bodies.length = 0;
    Score.clearLive();
    clearControls();
    paused = P.auto = false;
    mode = next;
    chapter = scene;
    if (mode === 'ride' && !rideStarted) { resetRide(); rideStarted = true; }
    if (Strip.on) Strip.toggle();
    RideTrail.setActive(Main.scene, mode === 'ride');
    RideUI.setMode(mode);
    RideUI.setScene(chapter ? { ...chapter, progress: 0 } : null);
    hud.style.opacity = 0;
    notice = undefined;
    last = -1;
    lastNow = performance.now();
    const startAt = mode === 'scene' ? chapter.start : mode === 'ride' ? rideAt : filmAt;
    base = lastNow - startAt * 1000;
    if (!running) {
      if (loader) {
        loader.style.opacity = 0;
        loader.style.pointerEvents = 'none';
        loader.inert = true;
        setTimeout(() => loader.remove(), 900);
      }
      running = true;
      requestAnimationFrame(frame);
    }
    if (withSound) sound();
  }

  async function start(ld) {
    loader = ld;
    const preparing = Sound.prepare();
    events();
    RideUI.install({ select, control: touchControl, action: rideAction, groups: RideShow.groups, scenes: RideShow.scenes });
    const stt = document.getElementById('st'), bar = document.getElementById('bar'); if (bar) bar.style.opacity = 0;
    Main.update(0, 1 / 60, true); Main.draw(); Main.draw(); // compile what the first frames need
    for (const t of [3, 8, 22, 27, 33, 47, 55, 63, 70, 73, 77]) { Main.update(t, 1 / 60, true); Main.draw(); await new Promise(r => setTimeout(r, 0)); }
    const showTuning = () => { if (stt) stt.textContent = I18n.t('正在准备音乐', 'Preparing the music'); };
    showTuning();
    const stopTuning = I18n.subscribe(showTuning);
    await preparing;
    stopTuning();
    if (Q.has('ride')) select('ride', false);
    else if (Q.has('auto')) select('film', false);
    else RideUI.ready();
  }
  return { start, seek, poke, say, raw, get paused() { return paused; } };
})();
