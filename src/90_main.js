'use strict';
// ---- MAIN: renderer, build, clock, frame. Studio mode (?studio=name) shows single assets under the film's light ---------------------------
const Main = (() => {
  const cv = document.getElementById('c'); let frameN = 0, R, scene, cam, W = 0, H = 0, last = -1, quality = 1; const ctx = { t: 0, dt: 1 / 60, st: null, reset: true, live: !CAPTURE, freeRide: false };
  const STUDIO = Q.get('studio');
  function size(force) { const cw = innerWidth, ch = innerHeight, dpr = CAPTURE ? 1 : Math.min(devicePixelRatio || 1, 2); let k = dpr * quality; const MAX = CAPTURE ? 1e9 : 3.7e6; if (cw * ch * k * k > MAX) k = Math.sqrt(MAX / (cw * ch)); const w = Math.max(2, Math.round(cw * k)), h = Math.max(2, Math.round(ch * k)); if (w === W && h === H && !force) return; W = w; H = h; R.setPixelRatio(1); R.setSize(W, H, false); Post.size(W, H); cam.aspect = W / H; cam.updateProjectionMatrix(); }
  const tick = () => new Promise(r => setTimeout(r, 0));
  async function init(progress) {
    R = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance', stencil: false, depth: false, preserveDrawingBuffer: CAPTURE }); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.info.autoReset = false;
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(35, 16 / 9, .12, 1400); ctx.cam = cam; ctx.scene = scene; ctx.R = R; Post.init(R); Sky.init(R, scene); Lan.init(R); Sky.apply(0, V3()); size(true); addEventListener('resize', () => size());
    const want = STUDIO ? STUDIO.split(',') : null, L = Assets.list.filter(a => !want || want.includes(a.name)); let k = 0; ctx.st = Path.bird(0); G.build = {};
    for (const a of L) { const t0 = performance.now(); try { let o = a.build ? a.build(ctx) : null; if (o) { a._roots = Array.isArray(o) ? o : [o]; a._roots.forEach(x => scene.add(x)); } a.ok = true; } catch (e) { a.ok = false; G.errors.push(a.name + ' build: ' + (e.stack || e)); console.error('BUILD ' + a.name, e.stack || e); } G.build[a.name] = Math.round(performance.now() - t0); progress && progress(++k / L.length, a.name); await tick(); }
    if (STUDIO) Studio.build();
    G.info.load = Math.round(performance.now()); R.compile(scene, cam);
  }
  function update(t, dt, reset, freeRide = false) {
    ctx.t = t; ctx.dt = dt; ctx.reset = reset; ctx.freeRide = freeRide;
    LU.uTime.value = t; LU.uBeat.value = t / Score.BEAT;
    ctx.st = freeRide ? Ride.step(dt) : Path.bird(t);
    if (STUDIO) Studio.pre(ctx);
    else {
      const s = ctx.st;
      Wind.wake(0, s.pos.x, s.pos.y + 1.6, s.pos.z, s.mode === 'fly' ? 5 : 1.9, s.vel.x, s.vel.y, s.vel.z, s.mode === 'fly' ? .22 : .10);
    }
    if (freeRide) {
      RideShow.styleFrame(dt);
      Ride.camera(ctx);
    } else if (typeof Film !== 'undefined' && !STUDIO) Film.update(ctx);
    for (const a of Assets.list) if (a.ok && a.update) { try { a.update(ctx); } catch (e) { if (!a.err) { a.err = 1; G.errors.push(a.name + ' update: ' + (e.stack || e)); console.error('UPDATE ' + a.name, e.stack || e); } } }
    last = t; }
  function draw() { const o = ctx.freeRide ? RideShow.view(ctx) : STUDIO ? Studio.view(ctx) : typeof Film !== 'undefined' ? Film.view(ctx) : { focus: 8 }; cam.updateMatrixWorld(); R.info.reset(); const f = o.lightFocus || ctx.st.pos; Sky.apply(o.tod === undefined ? ctx.t : o.tod, f, o.lightBox || 34); Post.fin.uExp.value = Sky.S.ex * (o.exposure || 1); Lan.update(f.x, f.z, o.lanGain === undefined ? lerp(.10, 1, Sky.S.night) : o.lanGain);
    R.shadowMap.autoUpdate = false; R.shadowMap.needsUpdate = false; const oddOnly = !CAPTURE && !ctx.reset && ctx.t > 1 && ctx.t < 48; for (const a of Assets.list) if (a.ok && a.prepass) { if (oddOnly && a.name === 'water' && (frameN & 1) === 1) continue; try { a.prepass(R, scene, cam, ctx); } catch (e) { if (!a.perr) { a.perr = 1; console.error('PREPASS ' + a.name, e.stack || e); } } }
    frameN++; R.shadowMap.autoUpdate = false; R.shadowMap.needsUpdate = CAPTURE || ctx.reset || (frameN & 1) === 0; Post.render(scene, cam, o); G.info.tris = R.info.render.triangles; G.info.calls = R.info.render.calls; G.info.w = W; G.info.h = H; }
  // exact frame for QA: a jump warms the springs and cloth up over the 1.6 s before it
  function frameAt(t) { const d = t - last; if (last >= 0 && d > 0 && d < .12) update(t, d, false); else { const n = Q.has('cold') ? 1 : 96, t0 = Math.max(0, t - n / 60); update(t0, 1 / 60, true); for (let i = 1; t0 + i / 60 < t - 1e-4; i++) update(t0 + i / 60, 1 / 60, false); update(t, 1 / 60, false); } draw(); }
  return { init, update, draw, frameAt, size, ctx, get R() { return R; }, get scene() { return scene; }, get cam() { return cam; }, STUDIO, set quality(q) { quality = q; size(); }, get quality() { return quality; } };
})();
const Studio = (() => { let floor; const cq = (Q.get('cam') || '').split(',').map(Number), orbit = +(Q.get('orbit') || 0), tFix = Q.has('t') ? +Q.get('t') : null, tod = Q.has('tod') ? +Q.get('tod') : 26, film = Q.has('place'); let n = 0;
  return { frame: f => { n = f; }, tFix, build() { if (Q.get('floor') === '0') return; floor = Mat.mesh(new THREE.CircleGeometry(60, 64).rotateX(-PI / 2), Mat.make('stone', { color: '#b9ad98', space: 'world' }), { cast: false }); floor.position.y = Q.has('fy') ? +Q.get('fy') : 0; Main.scene.add(floor); },
    pre(ctx) { if (!film) { ctx.st.pos.set(0, ctx.st.mode === 'fly' ? 0 : 0, 0); ctx.st.yaw = Q.has('yaw') ? deg(+Q.get('yaw')) : 0; } },
    view(ctx) { const c = Main.cam, d = cq.length >= 6 ? cq : [4, 2.2, 6.5, 0, 1.4, 0, 35], o = film ? ctx.st.pos : V3(); let x = d[0] - d[3], z = d[2] - d[5]; if (orbit) { const a = deg(orbit * n), X = x * Math.cos(a) + z * Math.sin(a), Z = -x * Math.sin(a) + z * Math.cos(a); x = X; z = Z; } c.position.set(o.x + d[3] + x, o.y + d[1], o.z + d[5] + z); c.fov = d[6] || 35; c.updateProjectionMatrix(); c.lookAt(o.x + d[3], o.y + d[4], o.z + d[5]); const dist = Math.hypot(x, d[1] - d[4], z); return { tod, focus: dist, aperture: Q.has('ap') ? +Q.get('ap') : 0, lightFocus: V3(o.x, o.y, o.z), lightBox: +(Q.get('box') || Math.max(8, dist * 1.6)), lanGain: Q.has('lan') ? +Q.get('lan') : undefined, shafts: 0 }; } }; })();

setTimeout(async () => {
  const bar = document.querySelector('#bar s'), st = document.getElementById('st'), ld = document.getElementById('ld');
  try { await Main.init((k, n) => { if (bar) bar.style.width = (k * 100).toFixed(1) + '%'; if (st) st.textContent = n; }); } catch (e) { console.error('BOOT', e.stack || e); if (st) st.textContent = String(e.message || e); throw e; }
  window.__INFO = { build: G.build, load: G.info.load, errors: G.errors };
  window.__dbg = { Main, Score, Path, Sky, Lan, LU, Post, Assets, G, get info() { return G.info; }, frame: t => Main.frameAt(t) };
  window.__renderFrame = n => { Studio.frame(n); Main.size(); Main.frameAt(Main.STUDIO && Studio.tFix !== null ? Studio.tFix : n / 60); return true; };
  if (CAPTURE) { if (ld) ld.remove(); window.__READY = true; return; }
  if (typeof Player !== 'undefined' && !Main.STUDIO) { await Player.start(ld); window.__READY = true; return; }
  if (ld) ld.remove(); let t0 = performance.now(), lt = t0; (function loop(now) { const t = Studio.tFix !== null ? Studio.tFix + ((now - t0) / 1000) % 8 : ((now - t0) / 1000) % Score.DUR; Main.update(t, Math.min(.05, (now - lt) / 1000), false); lt = now; Main.draw(); requestAnimationFrame(loop); })(t0); window.__READY = true;
}, 0);
