'use strict';
// ---- THE LEMON XYLOPHONE (bars 12-17): one lemon hops the tune along the crockery; every contact is a written note. Between contacts it is
// in free fall (g = 9.81), so height and timing agree by themselves; after its last note it is thrown into the pelican's open bill ----------------
const Lemons = (() => {
  const g = 9.81, A = Score.tracks.lemon, A2 = Score.tracks.lemon2, OFF = -2.25, R = .105;
  const objs = [], lit = [], tmp = V3(), L = {};
  let root, hero, hero2, leaf, trail, trail2, rings, spilled = false, rideMode = false, rideTime = 0;
  const yOf = m => clamp(.74 + (m - 66) * .047, .5, 1.72), zRow = i => -3.56 + .10 * Math.sin(i * 2.1);
  // contact list: {t, p (lemon centre), m, kind}
  function contacts(T, row) { return T.map((e, i) => { const x = Path.xAt(e.t) + OFF; return { t: e.t, d: e.d, m: e.m, i, p: V3(x, (row ? yOf(e.m) * .62 + .02 : yOf(e.m)) + R, row ? -3.13 + .05 * Math.sin(i * 1.7) : zRow(i)) }; }); }
  const C1 = contacts(A, 0), C2 = contacts(A2, 1);
  const start1 = { t: Score.CUE.BUMP, p: V3(-45.1, 1.28, -4.05) };
  // note 0 is the rhino's horn itself: the lemon leaves the stall on it
  C1[0].p.copy(start1.p); C1[0].bump = true;
  const pos = V3(), mouthAt = () => { const st = Path.bird(Score.CUE.GULP); if (typeof Pelican !== 'undefined' && Pelican.mouth && L.mouthP) return L.mouthP; return V3(st.pos.x - 1.95, 2.28, st.pos.z - .02); };
  function segs(C, end) { const s = []; for (let i = 0; i < C.length; i++) { const a = C[i], b = i + 1 < C.length ? C[i + 1] : end; if (!b) break; s.push({ t0: a.t, t1: b.t, a: a.p, b: b.p, gulp: b.gulp }); } return s; }
  let S1, S2; const end1 = { t: Score.CUE.GULP, p: V3(), gulp: 1 };
  function at(S, t, out) { if (!S.length || t < S[0].t0) return null; for (const s of S) if (t < s.t1) { const T = s.t1 - s.t0, u = (t - s.t0) / T, dt = t - s.t0, vy = (s.b.y - s.a.y) / T + g * T / 2; return out.set(lerp(s.a.x, s.b.x, u), s.a.y + vy * dt - g * dt * dt / 2, lerp(s.a.z, s.b.z, u)); } return null; }
  const PALC = ['#2f7fb5', '#d4552b', '#f7f4ec', '#f4d03f', '#3f9470', '#5aa9a6', '#f0a896', '#a99cc8'];
  function kindFor(m, i) { if (m <= 67) return 'drum'; if (m <= 70) return ['jar', 'drum'][i % 2]; if (m <= 72) return 'bowl'; if (m <= 74) return ['teapot', 'bowl'][i % 2]; if (m <= 77) return ['bowl', 'jug', 'jar'][i % 3]; if (m <= 79) return ['cup', 'bowl'][i % 2]; if (m <= 82) return ['bell', 'cup'][i % 2]; return 'bell'; }
  // the things it lands on: simple, well-made crockery (own versions so contact tops are exact)
  function thing(kind, col, w) { const gr = new THREE.Group(), r = w / 2, parts = [], white = '#f7f4ec', rim = col === '#2f7fb5' ? '#f4d03f' : '#2f7fb5', add = (geo, c, y = 0, rx = 0) => parts.push([geo, M4(0, y, 0, rx, 0, 0), c]); let top = .2, mt = 'ceramic';
    if (kind === 'bowl') { add(Geo.lathe([[0, 0], [r * .42, 0], [r * .45, .012], [r * .40, .03], [r * .62, .06], [r * .88, .12], [r, .185], [r * .985, .196], [r * .94, .19], [r * .82, .125], [r * .55, .07], [0, .055]], 40), col); add(Geo.torus(r * .985, .006, 48, 8), rim, .192, PI / 2); add(Geo.torus(r * .80, .004, 48, 6), white, .104, PI / 2); add(Geo.lathe([[0, .176], [r * .93, .178]], 32), PAL.lemon); top = .196; }
    else if (kind === 'drum') { mt = 'lacquer'; add(Geo.lathe([[0, 0], [r * .86, 0], [r * .9, .02], [r * .99, .12], [r * 1.02, .19], [r * .99, .26], [r * .9, .36], [r * .86, .38]], 36), col); add(Geo.lathe([[0, .392], [r * .80, .390], [r * .88, .372]], 36), '#f3e7cf'); for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; for (const y of [.352, .03]) parts.push([Geo.sphere(.013, 8, 6), M4(Math.cos(a) * r * .885, y, Math.sin(a) * r * .885), '#d9b25a']); } add(Geo.torus(r * 1.015, .008, 40, 6), '#f4d03f', .19, PI / 2); top = .392; }
    else if (kind === 'cup') { add(Geo.lathe([[0, 0], [r * .5, 0], [r * .52, .014], [r * .62, .03], [r * .9, .09], [r, .17], [r * .97, .178], [r * .9, .17], [r * .5, .05], [0, .045]], 32), white); add(Geo.lathe([[r * .79, .062], [r * .93, .098], [r * .992, .14]], 32), col); top = .178; }
    else if (kind === 'bell') { mt = 'metal'; add(Geo.lathe([[0, 0], [r * 1.0, 0], [r * 1.02, .016], [r * .9, .05], [r * .74, .12], [r * .6, .17], [r * .3, .2], [0, .206]], 36), '#d9b25a'); add(Geo.torus(r * .83, .006, 40, 6), '#b98a3a', .075, PI / 2); add(Geo.torus(r * .66, .005, 40, 6), '#b98a3a', .145, PI / 2); top = .206; }
    else if (kind === 'jar') { add(Geo.lathe([[0, 0], [r * .7, 0], [r * .78, .02], [r * 1.0, .12], [r * .98, .22], [r * .66, .30], [r * .6, .33], [r * .68, .35], [r * .72, .365], [r * .5, .372], [0, .376]], 36), col); add(Geo.torus(r * .97, .007, 40, 6), white, .18, PI / 2); add(Geo.torus(r * .93, .005, 40, 6), white, .225, PI / 2); top = .376; }
    else if (kind === 'teapot') { add(Geo.lathe([[0, 0], [r * .6, 0], [r * .64, .015], [r * .98, .10], [r * .95, .19], [r * .6, .26], [r * .42, .27]], 36), col); add(Geo.lathe([[r * .46, .266], [r * .5, .28], [r * .28, .312], [r * .09, .318], [r * .10, .33], [r * .14, .345], [0, .356]], 28), col); add(Geo.tube([[r * .86, .13, 0], [r * 1.25, .17, 0], [r * 1.4, .25, 0], [r * 1.55, .275, 0]], u => lerp(.034, .016, u), 12, { smooth: 14 }), col); add(Geo.tube([[-r * .8, .20, 0], [-r * 1.25, .27, 0], [-r * 1.3, .13, 0], [-r * .88, .08, 0]], .015, 10, { smooth: 18 }), rim); add(Geo.torus(r * .5, .005, 36, 6), rim, .275, PI / 2); top = .356; }
    else { add(Geo.lathe([[0, 0], [r * .6, 0], [r * .7, .02], [r * .9, .14], [r * .6, .26], [r * .56, .33], [r * .66, .37], [r * .6, .376], [0, .37]], 36), col); add(Geo.tube([[-r * .6, .34, 0], [-r * 1.25, .32, 0], [-r * 1.2, .16, 0], [-r * .86, .12, 0]], .016, 10, { smooth: 16 }), white); add(Geo.torus(r * .9, .006, 36, 6), rim, .14, PI / 2); top = .376; }
    gr.add(Mat.mesh(Geo.merge(parts), Mat.make(mt, { vcol: true, color: '#ffffff', ...(mt === 'metal' ? { rough: .24 } : {}) }))); gr.userData.top = top; return gr; }
  function build() {
    root = new THREE.Group(); const all = C1.slice(1).map(c => ({ c, row: 0 })).concat(C2.map(c => ({ c, row: 1 }))); const wood = Mat.make('wood', { color: PAL.wood, axis: 'x' }), wood2 = Mat.make('wood', { color: '#8a5a38' });
    const posts = [], planks = [];
    all.forEach(({ c, row }, k) => { const kind = kindFor(c.m, k), gap = Math.min(c.d || .6, .6) * Path.V, w = clamp(gap * .80, .16, row ? .34 : .36) * (kind === 'bell' ? .86 : 1), th = thing(kind, PALC[(c.m * 5 + k) % PALC.length], w), top = c.p.y - R, by = top - th.userData.top; th.position.set(c.p.x, by, c.p.z); th.rotation.y = kind === 'teapot' || kind === 'jug' ? (k % 2 ? .6 : -.5) : h1(k) * 6; root.add(th); objs.push({ o: th, c, row, by, kind, w, m: c.m, ry: th.rotation.y });
      // each stands on its own turned post with a round top, all pegged to one long bench
      const base = row ? .16 : .24; posts.push([Geo.lathe([[.10, 0], [.10, .03], [.045, .06], [.035, Math.max(.08, by - base - .05)], [.07, Math.max(.1, by - base - .03)], [w * .46, Math.max(.11, by - base - .02)], [w * .48, Math.max(.12, by - base - .008)], [w * .46, Math.max(.125, by - base)], [0, Math.max(.126, by - base)]], 18), M4(c.p.x, base, c.p.z, 0, h1(k) * 6, 0)]); });
    const x0 = C1[1].p.x + .5, x1 = C1[C1.length - 1].p.x - .5; for (const [z, y, w, xa, xb] of [[-3.56, .24, .46, x0, x1], [-3.13, .16, .34, C2[0].p.x + .4, C2[C2.length - 1].p.x - .4]]) { let x = xa; let i = 0; while (x > xb) { const l = Math.min(1.9, x - xb); planks.push([Geo.box(l - .015, .045, w, .012, 2), M4(x - l / 2, y - .022, z, 0, (h1(i * 3.1) - .5) * .006, (h1(i) - .5) * .008)]); for (const s of [-1, 1]) planks.push([Geo.box(.07, y - .045, .07, .012, 1), M4(x - .2, (y - .045) / 2, z + s * (w / 2 - .07), (h1(i + s) - .5) * .03, 0, 0)]); planks.push([Geo.box(.05, .05, w - .12, .01, 1), M4(x - .2, y - .075, z)]); x -= l; i++; } }
    const a = Mat.mesh(Geo.merge(posts), wood2), b = Mat.mesh(Geo.merge(planks), wood); root.add(a, b);
    const peel = Mat.make('plain', { vcol: true, rough: .40, coat: .5, coatRough: .25, emissive: '#f2b800', emissiveI: .22 }); hero = Mat.mesh(Phys.lemonGeo(), peel); hero2 = Mat.mesh(Phys.lemonGeo(), Mat.make('plain', { vcol: true, rough: .42, coat: .4, coatRough: .3, color: '#ffd9a0' })); hero.scale.setScalar(R); hero2.scale.setScalar(R * .92); leaf = Mat.mesh(Geo.surf((u, v) => { const w = Math.sin(PI * u) * .34; return [-1.16 - u * .95, .18 * Math.sin(u * 3) + .3 * u + Math.abs(v - .5) * .16, (v - .5) * 2 * w]; }, 12, 4), Mat.make('leaf', { color: PAL.leaf, double: true })); hero.add(leaf); hero.visible = hero2.visible = false; root.add(hero, hero2); hero.layers.enable(1);
    // the line the lemon draws: a fading ribbon of its last second of flight
    const mkTrail = col => { const n = 64, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3)); geo.setAttribute('aU', new THREE.BufferAttribute(new Float32Array(n * 2 * 2), 2)); const ix = []; for (let i = 0; i < n - 1; i++) { const q = i * 2; ix.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } geo.setIndex(ix); const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, uniforms: { uC: { value: new THREE.Color(col) }, uPrint: LU.uPrint }, vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform vec3 uC; uniform float uPrint; varying vec2 vU; void main(){ float a = pow(1.0 - vU.x, 1.6) * (1.0 - smoothstep(0.55, 1.0, abs(vU.y))) * 0.85; gl_FragColor = vec4(uC * 2.1, a * (1.0 - uPrint)); }' })); m.frustumCulled = false; m.userData.n = n; root.add(m); return m; }; trail = mkTrail('#ffe27a'); trail2 = mkTrail('#ffc08a');
    // a ring of light leaves every contact
    const rg = new THREE.InstancedBufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); rg.setIndex([0, 1, 2, 0, 2, 3]); rg.setAttribute('aP', new THREE.InstancedBufferAttribute(new Float32Array(48 * 4), 4)); rg.setAttribute('aC', new THREE.InstancedBufferAttribute(new Float32Array(48 * 4), 4)); rings = new THREE.Mesh(rg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uPrint: LU.uPrint }, vertexShader: 'attribute vec4 aP; attribute vec4 aC; varying vec2 vQ; varying vec4 vC; void main(){ vQ = position.xy; vC = aC; vec4 m = viewMatrix * vec4(aP.xyz, 1.0); m.xy += position.xy * aP.w; m.z += 0.12; gl_Position = projectionMatrix * m; }', fragmentShader: 'uniform float uPrint; varying vec2 vQ; varying vec4 vC; void main(){ float r = length(vQ), k = smoothstep(1.0, 0.93, r) * smoothstep(0.70, 0.93, r) + 0.20 * exp(-r * r * 6.0); gl_FragColor = vec4(vC.rgb * k * vC.a * (1.0 - uPrint), 1.0); }' })); rings.frustumCulled = false; rg.instanceCount = 0; root.add(rings);
    S1 = segs(C1, end1); S2 = segs(C2, null); return root; }
  const hue = m => new THREE.Color().setHSL(fract((m - 60) / 24 * .9 + .06), .75, .62), RC = []; for (let m = 40; m < 100; m++) RC[m] = hue(m);
  function ribbon(mesh, S, t, cam) { const n = mesh.userData.n, P = mesh.geometry.attributes.position.array, U = mesh.geometry.attributes.aU.array; let k = 0; const a = V3(), b = V3(), d = V3(), v = V3(), s = V3(); for (let i = 0; i < n; i++) { const u = i / (n - 1), tt = t - u * .95; let p = at(S, tt, a); if (!p) { if (tt < S[0].t0) a.copy(S[0].a); else { mesh.visible = false; return; } } const tb = Math.max(S[0].t0, tt - .012); at(S, tb, b) || b.copy(a); d.subVectors(a, b); if (d.lengthSq() < 1e-8) d.set(1, 0, 0); v.subVectors(a, cam.position); s.crossVectors(d, v).normalize().multiplyScalar(.042 * (1 - u * .55)); P[k * 3] = a.x + s.x; P[k * 3 + 1] = a.y + s.y; P[k * 3 + 2] = a.z + s.z; U[k * 2] = u; U[k * 2 + 1] = 1; k++; P[k * 3] = a.x - s.x; P[k * 3 + 1] = a.y - s.y; P[k * 3 + 2] = a.z - s.z; U[k * 2] = u; U[k * 2 + 1] = -1; k++; } mesh.geometry.attributes.position.needsUpdate = mesh.geometry.attributes.aU.needsUpdate = true; mesh.visible = true; }
  function spill() { const x = -46.4, r = rng(99); for (let i = 0; i < 34; i++) Phys.add({ x: x + 1.55 - r() * 2.3, y: 1.15 + r() * .45, z: -4.05 - r() * .3, vx: -2.0 + r() * 2.6, vy: 1.9 + r() * 2.6, vz: .9 + r() * 2.3, r: .078 + r() * .02 }); if (typeof Stalls !== 'undefined' && Stalls.bump) Stalls.bump(Score.CUE.BUMP); }
  function ring(p, m, t, s) {
    if (lit.length === 48) lit.shift();
    lit.push({ p: p.clone(), m, t, s });
  }

  function playCrockery(q, ctx, velocity) {
    const e = Score.live('lemon', { t: ctx.t, m: q.m, v: velocity });
    const hitTime = rideMode ? rideTime + e.t - ctx.t : e.t;
    if (rideMode) q.rideHit = hitTime;
    else q.hit = hitTime;
    const p = q.o.position;
    ring(V3(p.x, q.by + q.o.userData.top + R, p.z), q.m, hitTime, 1);
  }

  function strikeCrockery(ctx) {
    if (Math.abs(ctx.st.pos.x - C1[1].p.x) >= 43) return;
    for (const b of Phys.bodies) {
      if (!b.live || b.held || b.float || b.v.y >= -.45 || b.p.x > -43 || b.p.x < -67 || b.p.z > -2.7 || b.p.z < -4.2) continue;
      const depth = Math.max(-b.v.y * ctx.dt, .025);
      for (const q of objs) {
        const { x, z } = q.o.position;
        const top = q.by + q.o.userData.top + b.r;
        const dy = b.p.y - top;
        if (dy > 0 || dy < -depth || Math.hypot(b.p.x - x, b.p.z - z) > q.w / 2 + b.r) continue;
        const velocity = clamp(-b.v.y / 7, .35, .95);
        b.p.y = top + .004;
        b.v.y *= -.54;
        b.v.x *= .74;
        b.v.z *= .74;
        playCrockery(q, ctx, velocity);
        break;
      }
    }
  }

  function updateChase(ctx) {
    const t = ctx.t, B = Score.CUE.BUMP;
    if (ctx.reset) { spilled = t > B + .1; if (spilled && t < B + 14) spill(); }
    if (!spilled && t >= B && t < B + 2) { spilled = true; spill(); }
    if (t < B - .5) spilled = false;
    if (!root.visible) return;
    if (typeof Pelican !== 'undefined' && Pelican.mouth && t > Score.CUE.GULP - .9 && t < Score.CUE.GULP) { Pelican.mouth(tmp); const st = ctx.st, st2 = Path.bird(Score.CUE.GULP); L.mouthP = (L.mouthP || V3()).set(tmp.x + st2.pos.x - st.pos.x, tmp.y, tmp.z + st2.pos.z - st.pos.z); }
    end1.p.copy(mouthAt());
    const spin = (o, S, t, r) => { const p = at(S, t, pos); o.visible = !!p && t >= B; if (!p) return; o.position.copy(p); const k = S.findIndex(s => t < s.t1), s = S[Math.max(0, k)], dt = t - s.t0; o.rotation.set(0, (k * 1.9) % 6.28, dt * (5 + (k % 3) * 2.5) * (k % 2 ? 1 : -1) + k * 1.3); const q = Math.exp(-dt * 26) * .28 * (k > 0 ? 1 : 0) + (s.t1 - t < .03 && !s.gulp ? .12 * (1 - (s.t1 - t) / .03) : 0); o.scale.set(r * (1 + q * .5), r * (1 - q), r * (1 + q * .5)); };
    spin(hero, S1, t, R); spin(hero2, S2, t, R * .92);
    trail.visible = hero.visible;
    trail2.visible = hero2.visible;
    if (trail.visible) ribbon(trail, S1, t, ctx.cam);
    if (trail2.visible) ribbon(trail2, S2, t, ctx.cam);
  }

  function update(ctx) {
    if (rideMode !== !!ctx.freeRide) { rideMode = !!ctx.freeRide; lit.length = 0; }
    root.visible = rideMode || (ctx.t > 20 && ctx.t < 60);
    if (rideMode) {
      rideTime += ctx.dt;
      hero.visible = hero2.visible = trail.visible = trail2.visible = false;
      strikeCrockery(ctx);
    } else updateChase(ctx);
    if (!root.visible) return;
    const t = rideMode ? rideTime : ctx.t;
    // contact: the thing dips, rocks on its post and rings
    for (const o of objs) { const far = Math.abs(o.o.position.x - ctx.st.pos.x); o.o.children[0].castShadow = far < 8; o.o.visible = far < 26; const dt = rideMode ? Infinity : t - o.c.t, lv = t - (rideMode ? o.rideHit : o.hit), u = Math.min(dt >= 0 ? dt : Infinity, lv >= 0 ? lv : Infinity); if (u > 3) { o.o.position.y = o.by; o.o.rotation.set(0, o.ry, 0); continue; } const dip = -.028 * Math.exp(-u * 9) * Math.cos(u * 34), k = Math.exp(-u * 2.6) * .10; o.o.position.y = o.by + dip; o.o.rotation.set(Math.sin(u * 15) * k, o.ry, Math.cos(u * 13) * k * .8 * (u > .02 ? 1 : 0)); }
    // rings
    let k = 0;
    const P = rings.geometry.attributes.aP, C = rings.geometry.attributes.aC;
    const put = (p, u, m, s) => {
      if (k >= 48 || u < 0 || u >= .8) return;
      const c = RC[clamp(m | 0, 40, 99)];
      P.setXYZW(k, p.x, p.y - R, p.z, .06 + (1 - Math.exp(-u * 5.5)) * .44 * s);
      C.setXYZW(k++, c.r, c.g, c.b, Math.exp(-u * 5.5) * 1.3);
    };
    if (!rideMode) for (const contacts of [C1, C2]) for (const c of contacts) put(c.p, t - c.t, c.m, 1);
    for (const r of lit) put(r.p, t - r.t, r.m, r.s || 1);
    while (lit.length && t - lit[0].t > 1) lit.shift();
    rings.geometry.instanceCount = k; P.needsUpdate = C.needsUpdate = true; rings.visible = k > 0;
  }
  // a loose lemon striking the crockery plays it too
  Phys.on((kind, b) => { if (rideMode || (kind !== 'wood' && kind !== 'stone' && kind !== 'cloth')) return; if (b.p.x < -66.5 || b.p.x > -43.5 || b.p.z > -2.8) return; let best = null, bd = .3; for (const o of objs) { const d = Math.hypot(b.p.x - o.o.position.x, b.p.z - o.o.position.z); if (d < bd) { bd = d; best = o; } } if (best) best.hit = G.t; });
  Object.assign(L, { pos: (t, out) => at(S1, t, out), C1, C2, ring: (p, m, t, s) => ring(p, m, rideMode ? rideTime : t, s), get objs() { return objs; } });
  Assets.add('lemons', { order: 57, build, update,
    get pick() { return root?.visible ? objs.filter(q => q.o.visible).map(q => q.o) : []; },
    poke(hit, ctx) { let o = hit.object; while (o && !objs.some(q => q.o === o)) o = o.parent; const q = objs.find(item => item.o === o); if (q) playCrockery(q, ctx, .9); return null; },
  });
  return L;
})();
