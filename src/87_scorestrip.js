'use strict';
// ---- N: the score, unrolled under the picture. Every note scrolls past with the name of the thing it moves ------------------------------------
const Strip = (() => {
  const LANES = [
    ['flute', ['笛声 → 蒸汽', 'Flute → steam'], '#5b7fa6', 62, 90],
    ['flute2', null, '#8fb0cc', 62, 90],
    ['koto', ['筝音 → 灯笼', 'Koto → lanterns'], '#c63a2a', 45, 86],
    ['lemon', ['茶器 → 柠檬', 'Crockery → lemon'], '#d9a400', 60, 90],
    ['lemon2', null, '#e39a4a', 60, 90],
    ['bass', ['低音 → 布篷、树木、尾羽', 'Bass → awnings, trees, tail'], '#2c5a86', 28, 56],
    ['taiko', ['鼓点 → 铺石、地面、镜头', 'Drum → paving, ground, camera'], '#1d2a44', 0, 1],
    ['wood', ['木鱼 → 窗板、纸伞、拍掌', 'Woodblock → shutters, parasols, claps'], '#8a5a38', 0, 1],
    ['bell', ['铃声 → 水波、星光', 'Bells → water, stars'], '#3f9470', 70, 96],
    ['chord', ['和弦 → 热气球', 'Chords → balloons'], '#d4552b', 38, 60],
    ['step', ['脚步 → 石板路', 'Footsteps → paving'], '#ee9a35', 0, 1],
  ];
  const ROWS = LANES.filter(l => l[1]); let cv, x, on = false, W = 0, H = 0; const rowOf = {}; { let r = -1; LANES.forEach(l => { if (l[1]) r++; rowOf[l[0]] = r; }); }
  function make() { cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;left:0;right:0;bottom:0;width:100vw;height:170px;pointer-events:none;z-index:3;transition:opacity .4s;opacity:0'; document.body.appendChild(cv); x = cv.getContext('2d'); }
  function toggle() { if (!cv) make(); on = !on; cv.style.opacity = on ? 1 : 0; const h = document.getElementById('hud'); if (h) h.style.bottom = on ? '182px' : '18px'; }
  function draw(t) { if (!on || !cv) return; const d = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = 170; if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); } x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(243,231,207,0)'); g.addColorStop(.12, 'rgba(243,231,207,.90)'); x.fillStyle = g; x.fillRect(0, 0, w, h); const y0 = 24, rh = (h - y0 - 8) / ROWS.length, px = Math.max(230, w * .26), ps = Math.max(90, w / 11), X = q => px + (q - t) * ps;
    x.strokeStyle = 'rgba(29,42,68,.10)'; x.lineWidth = 1; for (let b = Math.ceil((t - 3) / Score.BEAT); b * Score.BEAT < t + 12; b++) { const xx = X(b * Score.BEAT); if (xx < 205) continue; x.strokeStyle = b % 4 === 0 ? 'rgba(29,42,68,.26)' : 'rgba(29,42,68,.09)'; x.beginPath(); x.moveTo(xx, y0); x.lineTo(xx, h - 8); x.stroke(); }
    for (const [tr, , col, lo, hi] of LANES) { const r = rowOf[tr], A = Score.tracks[tr]; for (const e of A.concat(Score.recent(tr, t, 2).filter(q => q.live))) { const x0 = X(e.t); if (x0 > w) break; const len = tr === 'chord' ? Score.BAR : Math.max(.07, Math.min(e.d || .08, tr === 'koto' ? .16 : 2.4)), x1 = X(e.t + len); if (x1 < 205) continue; const u = hi > lo + 1 ? clamp((e.m - lo) / (hi - lo)) : .5, y = y0 + r * rh + (1 - u) * (rh - 4), age = t - e.t, hot = age >= 0 ? Math.exp(-age * 5) : 0; x.globalAlpha = age < 0 ? .38 : .30 + .7 * Math.max(hot, age < len ? .6 : 0); x.fillStyle = col; const hh = 2.6 + hot * 3.4; x.beginPath(); x.roundRect(Math.max(205, x0), y - hh / 2 + 1.5, Math.max(2.4, x1 - Math.max(205, x0) - 1), hh, hh / 2); x.fill(); if (hot > .15) { x.globalAlpha = hot * .5; x.beginPath(); x.arc(x0, y + 1.5, 3 + 9 * (1 - hot), 0, 7); x.strokeStyle = col; x.lineWidth = 1.2; x.stroke(); } } }
    x.globalAlpha = 1; x.strokeStyle = '#c63a2a'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px, y0 - 6); x.lineTo(px, h - 6); x.stroke(); x.font = '600 10px -apple-system, system-ui, sans-serif'; x.textBaseline = 'middle'; ROWS.forEach((l, i) => { x.fillStyle = l[2]; x.fillText(I18n.text(l[1]), 16, y0 + i * rh + rh / 2 + .5); }); }
  return { toggle, draw, get on() { return on; } };
})();
