'use strict';
/* Lumevale — arte procedural: criaturas, domador, cenários em camadas e efeitos de luz. */
(function () {
  const LV = window.LV, TAU = Math.PI * 2;
  const art = (LV.art = {});
  const INK = '#05060a';
  let FL = 0;      // intensidade do clarão branco ao levar dano
  let LW = 2.2;    // espessura do contorno

  /* ---------- cores ---------- */
  const _rgb = {};
  function rgbOf(h) {
    let v = _rgb[h];
    if (v) return v;
    let s = h.replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    const n = parseInt(s, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    _rgb[h] = v;
    return v;
  }
  function rgba(h, a) { const c = rgbOf(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function toHex(c) { return '#' + c.map((v) => Math.round(LV.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
  function mixHex(a, b, t) { const x = rgbOf(a), y = rgbOf(b); return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t)); }
  function shade(h, k) { return k >= 0 ? mixHex(h, '#ffffff', k) : mixHex(h, '#000000', -k); }
  function col(h) { return FL > 0 ? mixHex(h, '#ffffff', Math.min(1, FL)) : h; }
  art.rgba = rgba; art.mixHex = mixHex; art.shade = shade; art.INK = INK;

  function vgrad(c, y0, y1, a, b) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, col(a)); g.addColorStop(1, col(b));
    return g;
  }
  function inkStroke(c, k) { c.strokeStyle = INK; c.lineWidth = LW * (k || 1); c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  function fillInk(c, style, k) { c.fillStyle = style; c.fill(); inkStroke(c, k); }

  /* ---------- brilho (bloom falso com sprites aditivos) ---------- */
  const glowC = {};
  function glowSprite(h) {
    let s = glowC[h];
    if (s) return s;
    s = document.createElement('canvas'); s.width = s.height = 128;
    const g = s.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(h, 1)); gr.addColorStop(0.16, rgba(h, 0.55)); gr.addColorStop(0.42, rgba(h, 0.16)); gr.addColorStop(1, rgba(h, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    glowC[h] = s;
    return s;
  }
  function glow(c, x, y, r, h, a) {
    if (!(a > 0) || !(r > 0)) return;
    const op = c.globalCompositeOperation, ga = c.globalAlpha;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = ga * Math.min(1, a);
    c.drawImage(glowSprite(h), x - r, y - r, r * 2, r * 2);
    c.globalCompositeOperation = op; c.globalAlpha = ga;
  }
  function dot(c, x, y, r, h, gr, ga) {
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col(h); c.fill();
    glow(c, x, y, gr || r * 4, h, ga == null ? 0.6 : ga);
  }
  art.glow = glow;

  function crystal(c, x, y, h, w, P) {
    c.beginPath();
    c.moveTo(x - w, y + 2); c.lineTo(x - w * 0.8, y - h * 0.7); c.lineTo(x, y - h); c.lineTo(x + w * 0.8, y - h * 0.7); c.lineTo(x + w, y + 2); c.closePath();
    fillInk(c, vgrad(c, y - h, y, P.g, P.m), 0.8);
    c.beginPath(); c.moveTo(x, y - h); c.lineTo(x - w * 0.15, y + 1); c.lineTo(x + w, y + 2); c.lineTo(x + w * 0.8, y - h * 0.7); c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.16)'; c.fill();
    glow(c, x, y - h * 0.55, h * 0.9, P.g, 0.3);
  }

  /* =========================================================
     CORPOS — origem nos pés (terrestres) ou no centro (voadores),
     virados para a direita. Unidade ~ 1px na escala 1.
     ========================================================= */
  const B = {};
  const TOPO = { besouro: -32, caracol: -38, mariposa: -26, cogumelo: -42, fantasma: -20, caranguejo: -28, aguaviva: -20, aranha: -28, larva: -20, casca: -42, rastejante: -20, vespa: -16 };
  const TOPOX = { casca: 8, rastejante: 12, caranguejo: -2 };

  B.besouro = function (c, P, t, e, o) {
    const mv = o.mov || 0;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const lx = -10 + i * 8.5, sw = Math.sin(t * 15 + i * 2.1) * 3.2 * mv;
      c.beginPath(); c.moveTo(lx, -9); c.lineTo(lx + sw - 1, -4); c.lineTo(lx + sw * 1.4 - 4, 0);
      c.strokeStyle = INK; c.lineWidth = LW * 1.7; c.stroke();
      c.strokeStyle = col(P.d); c.lineWidth = LW * 0.6; c.stroke();
    }
    const bob = mv ? -Math.abs(Math.sin(t * 15)) * 1.2 : Math.sin(t * 2.5) * 0.6;
    c.save(); c.translate(0, bob);
    if (e >= 1) {
      const k = e === 2 ? 1.3 : 1;
      c.beginPath(); c.moveTo(12, -14); c.quadraticCurveTo(18 * k, -24 * k, 24 * k, -31 * k); c.quadraticCurveTo(21 * k, -19, 19, -9); c.closePath();
      fillInk(c, vgrad(c, -31 * k, -9, P.b, P.m));
      if (e === 2) glow(c, 24 * k, -31 * k, 12, P.g, 0.8);
    }
    c.beginPath(); c.ellipse(15, -10, 7.5, 7, 0, 0, TAU); fillInk(c, vgrad(c, -17, -3, P.m, P.d));
    c.beginPath(); c.moveTo(20, -7); c.quadraticCurveTo(26, -7, 25, -2); c.strokeStyle = INK; c.lineWidth = LW * 1.2; c.stroke();
    if (e === 2) {
      for (let i = 0; i < 3; i++) {
        const sx = -13 + i * 8, d = Math.abs(i - 1) * 2;
        c.beginPath(); c.moveTo(sx - 3.5, -24 + d); c.lineTo(sx, -35 + d * 1.5); c.lineTo(sx + 3.5, -24 + d); c.closePath();
        fillInk(c, col(P.d));
      }
    }
    c.beginPath(); c.ellipse(-1, -15, 18, 13, 0, 0, TAU); fillInk(c, vgrad(c, -28, -2, P.m, P.d));
    c.beginPath(); c.moveTo(-1, -28); c.quadraticCurveTo(-5, -16, -3, -3); c.strokeStyle = rgba(INK, 0.65); c.lineWidth = LW * 0.8; c.stroke();
    c.beginPath(); c.ellipse(-5, -20, 11, 6, -0.25, Math.PI * 1.08, Math.PI * 1.85); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2.2; c.stroke();
    const sp = [[-9, -16], [4, -21], [-2, -9], [8, -12], [-13, -8]];
    const n = e === 0 ? 2 : e === 1 ? 4 : 5;
    for (let i = 0; i < n; i++) dot(c, sp[i][0], sp[i][1], i === 0 ? 2.3 : 1.7, P.g, 8, 0.5 + 0.25 * Math.sin(t * 3 + i));
    if (e === 2) {
      c.beginPath(); c.moveTo(-15, -14); c.lineTo(-9, -12); c.lineTo(-7, -6); c.moveTo(5, -25); c.lineTo(9, -19); c.lineTo(14, -18);
      c.strokeStyle = col(P.g); c.lineWidth = 1.3; c.stroke();
      glow(c, -9, -12, 14, P.g, 0.4);
    }
    dot(c, 18.5, -11.5, 2.1, P.g, 9, 0.85);
    c.restore();
  };

  B.caracol = function (c, P, t, e, o) {
    const mv = o.mov || 0, st = Math.sin(t * (mv ? 8 : 2)) * (mv ? 1.5 : 0.6);
    c.beginPath();
    c.moveTo(-20 - st, 0);
    c.quadraticCurveTo(-12, -9, 6, -8);
    c.quadraticCurveTo(13 + st, -21, 20 + st, -15);
    c.quadraticCurveTo(25 + st, -7, 21 + st, 0);
    c.closePath();
    fillInk(c, vgrad(c, -20, 0, P.b, P.m));
    const sw = Math.sin(t * 3) * 1.5;
    c.lineCap = 'round';
    const stalks = [[15, 13, -28], [19, 22 + sw, -27]];
    for (const s of stalks) {
      c.beginPath(); c.moveTo(s[0] + st, -16); c.lineTo(s[1] + st, s[2]);
      c.strokeStyle = INK; c.lineWidth = LW * 1.8; c.stroke();
      c.strokeStyle = col(P.b); c.lineWidth = LW * 0.7; c.stroke();
      dot(c, s[1] + st, s[2], 2.2, P.g, 8, 0.8);
    }
    const R = e === 0 ? 12 : e === 1 ? 13.5 : 15;
    const cx = -4, cy = -13 - R * 0.6;
    if (e >= 1) {
      const n = e === 1 ? 4 : 7;
      for (let k = 0; k < n; k++) {
        const a = -2.7 + k * (2.4 / (n - 1));
        const a1 = a - 0.18, a2 = a + 0.18;
        c.beginPath();
        c.moveTo(cx + Math.cos(a1) * R * 0.92, cy + Math.sin(a1) * R * 0.92);
        c.lineTo(cx + Math.cos(a) * R * 1.42, cy + Math.sin(a) * R * 1.42);
        c.lineTo(cx + Math.cos(a2) * R * 0.92, cy + Math.sin(a2) * R * 0.92);
        c.closePath(); fillInk(c, col(P.d));
      }
    }
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); fillInk(c, vgrad(c, cy - R, cy + R, P.m, P.d));
    glow(c, cx, cy, R * 1.5, P.g, 0.25 + e * 0.12);
    c.beginPath();
    for (let a = 0; a <= 4.4 * Math.PI; a += 0.2) {
      const r = R * 0.82 * (1 - a / (4.7 * Math.PI));
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (a === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.strokeStyle = rgba(P.g, 0.8); c.lineWidth = 1.6; c.stroke();
    c.beginPath(); c.arc(cx - 2, cy - 2, R * 0.78, Math.PI * 1.1, Math.PI * 1.6); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 2.2; c.stroke();
    if (e === 2) for (let k = 0; k < 3; k++) dot(c, cx - 7 + k * 7, cy - R - 3 - (k === 1 ? 3 : 0), 1.8, P.g, 9, 0.75);
  };

  function asa(c, P, x, y, s, tras, e) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-4, -28, -30, -34, -27, -12); c.bezierCurveTo(-25, -3, -10, 2, 0, 0);
    fillInk(c, vgrad(c, -32, 2, tras ? P.d : P.m, P.d));
    c.beginPath(); c.moveTo(-1, 2); c.bezierCurveTo(-8, 4, -22, 8, -19, 16); c.bezierCurveTo(-14, 20, -4, 10, -1, 2);
    fillInk(c, vgrad(c, 0, 18, tras ? P.d : P.m, P.d));
    if (!tras) {
      c.beginPath(); c.moveTo(-2, -2); c.quadraticCurveTo(-12, -14, -22, -24); c.moveTo(-2, -1); c.quadraticCurveTo(-14, -6, -24, -10);
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.arc(-17, -16, 4.2, 0, TAU); c.fillStyle = col(P.b); c.fill();
      dot(c, -17, -16, 2.2, P.g, 11, 0.8);
      if (e >= 1) dot(c, -10, -6, 1.5, P.g, 7, 0.6);
      if (e === 2) dot(c, -13, 10, 1.6, P.g, 7, 0.6);
    }
    c.restore();
  }
  B.mariposa = function (c, P, t, e, o) {
    const f = Math.sin(t * 13), fl = 0.58 + 0.42 * Math.abs(f);
    const W = e === 0 ? 1 : e === 1 ? 1.15 : 1.3;
    if (e >= 1) {
      for (let k = 0; k < e; k++) {
        const ty = 22 + Math.sin(t * 2 + k) * 5, tx = -30 - k * 7;
        c.beginPath(); c.moveTo(-4, 6); c.bezierCurveTo(-14, 16 + k * 4, -22, 12 + Math.sin(t * 3 + k) * 4, tx, ty);
        c.strokeStyle = INK; c.lineWidth = LW * 1.6; c.stroke();
        c.strokeStyle = col(P.m); c.lineWidth = LW * 0.7; c.stroke();
        dot(c, tx, ty, 2, P.g, 8, 0.7);
      }
    }
    if (e === 2) { c.save(); c.scale(1, fl * 0.9); asa(c, P, -8, 2, W * 0.75, true, e); c.restore(); }
    c.save(); c.scale(1, fl); asa(c, P, -4, -1, W * 0.92, true, e); c.restore();
    c.beginPath(); c.ellipse(1, 1, 7, 9.5, 0.25, 0, TAU); fillInk(c, vgrad(c, -9, 10, P.b, P.m));
    c.beginPath(); c.moveTo(-5, 2); c.quadraticCurveTo(1, 5, 7, 1); c.moveTo(-4, 6); c.quadraticCurveTo(1, 9, 5, 6);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.arc(8, -7, 5.2, 0, TAU); fillInk(c, col(P.m));
    dot(c, 10.5, -7.5, 2.3, P.g, 8, 0.85);
    for (let k = 0; k < 2; k++) {
      const ex = 18 + k * 4, ey = -22 + k * 2;
      c.beginPath(); c.moveTo(8 + k * 2, -11); c.quadraticCurveTo(12 + k * 3, -20, ex, ey);
      c.strokeStyle = INK; c.lineWidth = LW * 0.9; c.stroke();
      for (let j = 1; j <= 3; j++) {
        const px = 8 + k * 2 + (ex - 8 - k * 2) * j / 4, py = -11 + (ey + 11) * j / 4;
        c.beginPath(); c.moveTo(px, py); c.lineTo(px - 2.5, py - 2.2); c.lineWidth = LW * 0.5; c.stroke();
      }
    }
    c.save(); c.scale(1, fl); asa(c, P, -2, -2, W, false, e); c.restore();
    if (e === 2) glow(c, 0, 0, 36, P.g, 0.22);
  };

  B.cogumelo = function (c, P, t, e, o) {
    const mv = o.mov || 0, br = Math.sin(t * 2.2) * 0.04;
    for (let k = 0; k < 2; k++) {
      const ph = Math.sin(t * 12 + k * Math.PI) * 2.5 * mv;
      c.beginPath(); c.ellipse(-4 + k * 8 + ph, -1.6, 3.6, 2.3, 0, 0, TAU); fillInk(c, col(P.d));
    }
    c.beginPath(); c.moveTo(-8, -2); c.quadraticCurveTo(-10, -12, -7, -20); c.lineTo(7, -20); c.quadraticCurveTo(10, -12, 8, -2); c.closePath();
    fillInk(c, vgrad(c, -20, 0, P.b, shade(P.b, -0.45)));
    c.fillStyle = INK;
    c.beginPath(); c.ellipse(1.5, -11, 1.8, 2.6, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(6, -11, 1.8, 2.6, 0, 0, TAU); c.fill();
    dot(c, 2, -11.7, 0.8, P.g, 4, 0.7); dot(c, 6.5, -11.7, 0.8, P.g, 4, 0.7);
    const cw = e === 0 ? 19 : e === 1 ? 22 : 24, ch = e === 0 ? 20 : 22;
    c.save(); c.translate(0, -17); c.scale(1 + br, 1 - br);
    c.beginPath(); c.moveTo(-cw, 1);
    c.quadraticCurveTo(-cw + 1, -ch, 0, -ch - 1); c.quadraticCurveTo(cw - 1, -ch, cw, 1);
    if (e >= 1) {
      const n = 7, seg = (cw * 2) / n;
      for (let k = 0; k < n; k++) { const x0 = cw - k * seg, x1 = x0 - seg; c.quadraticCurveTo((x0 + x1) / 2, 6, x1, 1); }
    } else c.quadraticCurveTo(0, -3, -cw, 1);
    c.closePath(); fillInk(c, vgrad(c, -ch, 2, P.m, P.d));
    const spots = [[-9, -9, 3], [3, -14, 2.6], [11, -6, 2.2], [-2, -5, 1.8], [-14, -3, 1.6], [8, -17, 1.8]];
    for (let i = 0; i < 3 + e; i++) {
      const s = spots[i];
      dot(c, s[0] * cw / 19, s[1] * ch / 20, s[2], P.g, s[2] * 4.5, 0.5 + 0.2 * Math.sin(t * 2 + i));
    }
    c.beginPath(); c.ellipse(-5, -ch * 0.62, cw * 0.5, ch * 0.22, -0.2, Math.PI * 1.05, Math.PI * 1.75);
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2.2; c.stroke();
    if (e === 2) {
      for (const k of [-1, 0, 1]) {
        const x = k * 9, y = -ch - 1 + Math.abs(k) * 5;
        c.beginPath(); c.rect(x - 1.5, y - 6, 3, 6); fillInk(c, col(P.b), 0.6);
        c.beginPath(); c.moveTo(x - 5, y - 5); c.quadraticCurveTo(x, y - 13, x + 5, y - 5); c.closePath(); fillInk(c, col(P.m), 0.6);
        glow(c, x, y - 8, 9, P.g, 0.7);
      }
    }
    c.restore();
  };

  B.fantasma = function (c, P, t, e, o) {
    const w1 = Math.sin(t * 3.2) * 5, w2 = Math.sin(t * 2.3 + 1) * 4;
    glow(c, 0, -2, 30 + e * 6, P.g, 0.32);
    if (e >= 1) {
      for (let k = 0; k < 2; k++) {
        c.beginPath(); c.moveTo(-5 + k * 9, -13); c.quadraticCurveTo(-9 + k * 10, -26 - e * 2, -3 + k * 9, -29 - e * 2);
        c.quadraticCurveTo(-1 + k * 9, -20, 3 + k * 9, -14); c.closePath(); fillInk(c, col(P.m));
      }
    }
    const tails = e === 2 ? 2 : 1;
    for (let k = tails - 1; k >= 0; k--) {
      const off = k * 7;
      c.beginPath();
      c.moveTo(0, -16);
      c.quadraticCurveTo(14, -16, 13, -2);
      c.quadraticCurveTo(12, 10, 0, 10);
      c.quadraticCurveTo(-14, 12 + off, -29 - off, 4 + w1 + off);
      c.quadraticCurveTo(-18, -1 + w2, -10, -10);
      c.quadraticCurveTo(-6, -16, 0, -16);
      c.closePath();
      c.save(); c.globalAlpha *= k ? 0.7 : 0.95; fillInk(c, vgrad(c, -16, 12, P.m, P.d)); c.restore();
    }
    c.fillStyle = INK;
    c.beginPath(); c.ellipse(4, -5, 2.6, 4, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(10, -5, 2.2, 3.6, 0, 0, TAU); c.fill();
    dot(c, 4.5, -6, 1.1, P.g, 6, 0.95); dot(c, 10.3, -6, 1, P.g, 6, 0.95);
    dot(c, -4, 1, 1.5, P.b, 12, 0.45);
    if (e === 2) {
      c.beginPath(); c.arc(1, -30, 9, Math.PI * 0.95, Math.PI * 2.05); c.strokeStyle = col(P.g); c.lineWidth = 2; c.stroke();
      glow(c, 1, -32, 18, P.g, 0.5);
    }
  };

  B.caranguejo = function (c, P, t, e, o) {
    const mv = o.mov || 0;
    c.lineCap = 'round';
    const perna = (bx, kx, ky, fx, k) => {
      c.beginPath(); c.moveTo(bx, -9); c.lineTo(kx, ky); c.lineTo(fx, 0);
      c.strokeStyle = INK; c.lineWidth = LW * 1.6; c.stroke();
      c.strokeStyle = col(k ? P.d : P.m); c.lineWidth = LW * 0.6; c.stroke();
    };
    for (let i = 0; i < 3; i++) { const sw = Math.sin(t * 14 + i * 2) * 2.5 * mv; perna(-6 - i * 3, -12 - i * 3, -17 + i, -16 - i * 3 + sw, 1); }
    for (let i = 0; i < 2; i++) { const sw = Math.sin(t * 14 + i * 2 + 1) * 2.5 * mv; perna(6 + i * 3, 12 + i * 3, -16, 15 + i * 3 + sw, 0); }
    const cr = e === 0 ? [[-4, 1]] : e === 1 ? [[-9, 0.9], [-2, 1.25], [5, 0.8]] : [[-12, 0.9], [-6, 1.4], [0, 1.1], [6, 1.5], [12, 0.8]];
    for (const k of cr) crystal(c, k[0], -16, 13 * k[1], 4.2 * Math.min(1.2, k[1]), P);
    c.beginPath(); c.ellipse(0, -12, 16, 9, 0, 0, TAU); fillInk(c, vgrad(c, -21, -3, P.m, P.d));
    c.beginPath(); c.ellipse(-3, -15, 9, 4, -0.1, Math.PI * 1.05, Math.PI * 1.9); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 2; c.stroke();
    for (const s of [[7, 8], [11, 13]]) {
      c.beginPath(); c.moveTo(s[0], -18); c.lineTo(s[1], -25); c.strokeStyle = INK; c.lineWidth = LW * 1.2; c.stroke();
      dot(c, s[1], -25, 1.9, P.g, 7, 0.85);
    }
    const cs = e === 2 ? 1.45 : e === 1 ? 1.2 : 1;
    const ab = o.atk ? 0.6 : 0.2 + Math.sin(t * 2) * 0.12;
    c.beginPath(); c.moveTo(12, -10); c.lineTo(18, -14); c.strokeStyle = INK; c.lineWidth = LW * 2.2; c.stroke();
    c.save(); c.translate(20, -15); c.scale(cs, cs);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -9, 12, -5 - ab * 4); c.quadraticCurveTo(6, -3, 2, 1); c.closePath();
    fillInk(c, vgrad(c, -9, 1, P.b, P.m));
    c.beginPath(); c.moveTo(0, 1); c.quadraticCurveTo(6, 7, 11, 3 + ab * 3); c.quadraticCurveTo(6, 3, 1, 3); c.closePath();
    fillInk(c, vgrad(c, 0, 7, P.m, P.d));
    c.beginPath(); c.arc(0, 0.5, 4.5, 0, TAU); fillInk(c, col(P.m));
    if (e === 2) glow(c, 8, -2, 12, P.g, 0.5);
    c.restore();
  };

  B.aguaviva = function (c, P, t, e, o) {
    const p = Math.sin(t * 3), sx = 1 + p * 0.06, sy = 1 - p * 0.05;
    const n = 4 + e * 2;
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const bx = -10 + i * (20 / (n - 1)), L = 20 + e * 6 + (i % 2) * 6;
      const wv = Math.sin(t * 3 + i * 0.9) * 4;
      c.beginPath(); c.moveTo(bx, 3);
      c.bezierCurveTo(bx + wv, 3 + L * 0.35, bx - wv - 3, 3 + L * 0.7, bx - 2 + wv * 0.5, 3 + L);
      c.strokeStyle = rgba(FL > 0 ? '#ffffff' : P.b, 0.6); c.lineWidth = 1.7; c.stroke();
      if (i % 2 === 0) dot(c, bx - 2 + wv * 0.5, 3 + L, 1.3, P.g, 6, 0.6);
    }
    glow(c, 0, -6, 30 + e * 5, P.g, 0.38);
    c.save(); c.scale(sx, sy);
    if (e === 2) {
      for (let k = -2; k <= 2; k++) {
        c.beginPath(); c.moveTo(k * 5 - 2.5, -16); c.lineTo(k * 5, -24 - (2 - Math.abs(k)) * 2.5); c.lineTo(k * 5 + 2.5, -16); c.closePath();
        fillInk(c, col(P.b), 0.7);
      }
    }
    c.beginPath(); c.moveTo(-15, 4); c.quadraticCurveTo(-16, -17, 0, -18); c.quadraticCurveTo(16, -17, 15, 4);
    if (e >= 1) {
      const m = 6, seg = 30 / m;
      for (let k = 0; k < m; k++) { const x0 = 15 - k * seg, x1 = x0 - seg; c.quadraticCurveTo((x0 + x1) / 2, 0, x1, 4); }
    } else { c.quadraticCurveTo(7, 0, 0, 3); c.quadraticCurveTo(-7, 0, -15, 4); }
    c.closePath();
    c.save(); c.globalAlpha *= 0.86; c.fillStyle = vgrad(c, -18, 4, P.b, P.m); c.fill(); c.restore();
    inkStroke(c);
    c.beginPath(); c.ellipse(0, -6, 7, 5, 0, 0, TAU); c.fillStyle = rgba(P.g, 0.35); c.fill();
    dot(c, 0, -6, 2.4, P.g, 12, 0.7);
    c.fillStyle = INK;
    c.beginPath(); c.ellipse(5, -9, 1.6, 2.3, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(10, -8.5, 1.4, 2.1, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(-4, -12, 7, 3.5, -0.3, Math.PI * 1.05, Math.PI * 1.8); c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1.8; c.stroke();
    c.restore();
  };

  B.aranha = function (c, P, t, e, o) {
    const mv = o.mov || 0;
    const pernas = (tras) => {
      for (let i = 0; i < 4; i++) {
        const bx = -4 + i * 4, dir = i < 2 ? -1 : 1;
        const sw = Math.sin(t * 14 + i * 1.6 + (tras ? Math.PI : 0)) * 3 * mv;
        const kx = bx + dir * (10 + (i % 2) * 3), ky = -24 - (i === 1 || i === 2 ? 2 : 0);
        const fx = bx + dir * (16 + (i === 0 || i === 3 ? 4 : 0)) + sw;
        c.beginPath(); c.moveTo(bx, -12); c.lineTo(kx + (tras ? -2 : 0), ky); c.lineTo(fx + (tras ? -3 : 0), 0);
        c.strokeStyle = INK; c.lineWidth = LW * (tras ? 1.3 : 1.7); c.stroke();
        if (!tras) { c.strokeStyle = col(P.m); c.lineWidth = LW * 0.55; c.stroke(); }
      }
    };
    pernas(true);
    if (e >= 1) {
      for (let k = 0; k < 3 + e; k++) {
        const a = -2.6 + k * 0.45, rx = 12 + e, ry = 10 + e;
        c.beginPath();
        c.moveTo(-9 + Math.cos(a - 0.15) * rx, -15 + Math.sin(a - 0.15) * ry);
        c.lineTo(-9 + Math.cos(a) * rx * 1.4, -15 + Math.sin(a) * ry * 1.4);
        c.lineTo(-9 + Math.cos(a + 0.15) * rx, -15 + Math.sin(a + 0.15) * ry);
        c.closePath(); fillInk(c, col(P.d), 0.8);
      }
    }
    c.beginPath(); c.ellipse(-9, -15, 12 + e, 10 + e, -0.2, 0, TAU); fillInk(c, vgrad(c, -26 - e, -5, P.m, P.d));
    if (e === 0) dot(c, -10, -18, 1.8, P.g, 8, 0.6);
    else {
      c.beginPath(); c.arc(-10, -16, 5 + e, Math.PI * 0.2, Math.PI * 1.25); c.strokeStyle = col(P.g); c.lineWidth = 2.2; c.stroke();
      glow(c, -11, -16, 16, P.g, 0.45);
    }
    c.beginPath(); c.ellipse(6, -13, 7, 6, 0, 0, TAU); fillInk(c, vgrad(c, -19, -7, P.m, P.d));
    dot(c, 9, -15, 1.5, P.g, 6, 0.9); dot(c, 11.5, -13.5, 1.2, P.g, 5, 0.8); dot(c, 8, -12, 1, P.g, 4, 0.7);
    if (e >= 1) dot(c, 11, -16.8, 0.9, P.g, 4, 0.7);
    c.beginPath(); c.moveTo(11, -9); c.lineTo(12.5, -5); c.moveTo(8.5, -8.5); c.lineTo(9, -5);
    c.strokeStyle = col(P.b); c.lineWidth = 1.4; c.stroke();
    pernas(false);
  };

  B.larva = function (c, P, t, e, o) {
    const mv = o.mov || 0, n = 3 + e;
    for (let i = n - 1; i >= 0; i--) {
      const x = 10 - i * 8.5, r = 8.5 - i * (3.5 / n);
      const y = -r + 0.5 - Math.max(0, Math.sin(t * (mv ? 9 : 2) - i * 0.9)) * (mv ? 3 : 1);
      if (i > 0 && (i + e) % 2 === 0) crystal(c, x, y - r * 0.55, 8 + e * 2.5, 3, P);
      c.beginPath(); c.arc(x, y, r, 0, TAU); fillInk(c, vgrad(c, y - r, y + r, P.b, P.m));
      c.beginPath(); c.arc(x - 1, y - 1, r * 0.7, Math.PI * 1.1, Math.PI * 1.6); c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.6; c.stroke();
      if (i === 0) {
        c.fillStyle = INK; c.beginPath(); c.ellipse(13, y - 2, 1.7, 2.5, 0, 0, TAU); c.fill();
        dot(c, 13.3, y - 2.6, 0.8, P.g, 5, 0.9);
        c.beginPath(); c.moveTo(17, y + 1); c.lineTo(19.5, y + 3); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
      }
    }
  };

  B.casca = function (c, P, t, e, o) {
    const mv = o.mov || 0;
    c.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const ph = Math.sin(t * 10 + k * Math.PI) * 4 * mv;
      c.beginPath(); c.moveTo(-2 + k * 5, -12); c.lineTo(-3 + k * 5 + ph, 0); c.strokeStyle = INK; c.lineWidth = LW * 2; c.stroke();
    }
    const sw = Math.sin(t * (mv ? 10 : 2)) * (mv ? 1.2 : 0.5);
    c.beginPath(); c.moveTo(-12, -6); c.quadraticCurveTo(-17, -24, -6, -34 + sw); c.quadraticCurveTo(4, -38 + sw, 9, -28);
    c.quadraticCurveTo(12, -16, 8, -6); c.quadraticCurveTo(-2, -2, -12, -6); c.closePath();
    fillInk(c, vgrad(c, -38, -4, P.m, P.d));
    c.beginPath(); c.moveTo(-11, -7); c.lineTo(-9, -3); c.moveTo(-5, -5); c.lineTo(-4, -1); c.moveTo(2, -5); c.lineTo(3, -2);
    c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
    const ang = o.atk ? -1.0 : Math.sin(t * 2) * 0.1;
    c.save(); c.translate(6, -18); c.rotate(ang);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 2); c.lineTo(12, -12); c.quadraticCurveTo(16, -18, 11, -19);
    c.strokeStyle = INK; c.lineWidth = LW * 1.5; c.stroke();
    c.strokeStyle = col(shade(P.b, -0.4)); c.lineWidth = LW * 0.5; c.stroke();
    c.restore();
    c.save(); c.translate(8, -30 + sw);
    c.beginPath(); c.ellipse(0, 0, 7.5, 9, 0.2, 0, TAU); fillInk(c, vgrad(c, -9, 9, P.b, shade(P.b, -0.4)));
    c.beginPath(); c.moveTo(-2, -8); c.lineTo(0, -3); c.lineTo(-2.5, 1); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.fillStyle = INK; c.beginPath(); c.ellipse(2.5, -1, 2.4, 3.2, 0.2, 0, TAU); c.fill();
    dot(c, 2.8, -1.2, 1.1, P.g, 9, 0.95);
    c.restore();
  };

  B.rastejante = function (c, P, t, e, o) {
    const mv = o.mov || 0, n = 5;
    for (let i = n - 1; i >= 0; i--) {
      const x = 14 - i * 8, wave = Math.sin(t * (mv ? 10 : 2.5) - i * 0.8) * (mv ? 2 : 0.8);
      const r = i === 0 ? 8 : 7 - i * 0.5, y = -r + wave * 0.5;
      c.beginPath(); c.moveTo(x - 2, y + r * 0.4); c.lineTo(x - 4 + Math.sin(t * 16 + i) * 2 * mv, 0);
      c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
      c.beginPath(); c.moveTo(x - r * 0.6, y - r * 0.6); c.lineTo(x - 1, y - r - 6 - (i === 1 ? 2 : 0)); c.lineTo(x + r * 0.5, y - r * 0.7); c.closePath();
      fillInk(c, col(P.d), 0.8);
      c.beginPath(); c.ellipse(x, y, r * 1.1, r, 0, 0, TAU); fillInk(c, vgrad(c, y - r, y + r, P.m, P.d));
      if (i > 0 && i % 2 === 0) dot(c, x, y - 2, 1.2, P.g, 6, 0.35);
    }
    c.beginPath(); c.ellipse(17, -9, 5, 6, 0.3, 0, TAU); fillInk(c, vgrad(c, -15, -3, P.b, shade(P.b, -0.4)));
    dot(c, 19, -10, 1.6, P.g, 8, 0.95);
    c.beginPath(); c.moveTo(21, -5); c.quadraticCurveTo(25, -4, 24, -1); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
  };

  B.vespa = function (c, P, t, e, o) {
    const f = Math.sin(t * 40);
    c.save(); c.globalAlpha *= 0.42; c.fillStyle = FL > 0 ? '#ffffff' : '#e3ecff';
    c.beginPath(); c.ellipse(-2, -12 - f * 2, 12, 5 + f * 2, -0.5, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(-6, -10 + f * 2, 10, 4, -0.8, 0, TAU); c.fill();
    c.restore();
    c.save(); c.translate(-8, 4); c.rotate(0.5);
    c.beginPath(); c.moveTo(-10, -2); c.lineTo(-18, 0); c.lineTo(-10, 2); c.closePath(); c.fillStyle = INK; c.fill();
    c.beginPath(); c.ellipse(0, 0, 11, 6.5, 0, 0, TAU); fillInk(c, vgrad(c, -7, 7, P.m, P.d));
    c.beginPath();
    for (const k of [-4, 1, 6]) { c.moveTo(k, -6); c.quadraticCurveTo(k + 2, 0, k, 6); }
    c.strokeStyle = rgba(P.g, 0.7); c.lineWidth = 1.6; c.stroke();
    c.restore();
    c.beginPath(); c.moveTo(2, 3); c.lineTo(0, 11); c.moveTo(6, 3); c.lineTo(6, 11); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
    c.beginPath(); c.ellipse(4, -2, 7, 6.5, 0, 0, TAU); fillInk(c, vgrad(c, -8, 4, P.m, P.d));
    c.beginPath(); c.ellipse(11, -5, 5, 5, 0, 0, TAU); fillInk(c, vgrad(c, -10, 0, P.b, shade(P.b, -0.45)));
    dot(c, 13, -6, 1.8, P.g, 8, 0.9);
  };

  function coroa(c, corpo, P, t) {
    const y = (TOPO[corpo] || -24) - 2, x = TOPOX[corpo] || 0;
    for (const k of [-1, 0, 1]) {
      const h = k === 0 ? 11 : 7;
      c.beginPath(); c.moveTo(x + k * 6 - 3, y + 3); c.lineTo(x + k * 6, y - h); c.lineTo(x + k * 6 + 3, y + 3); c.closePath();
      fillInk(c, col(INK), 0.6);
      glow(c, x + k * 6, y - h, 6, P.g, 0.7 + 0.2 * Math.sin(t * 4 + k));
    }
  }

  art.altura = function (corpo, est, s, boss) { return -(TOPO[corpo] || -24) * (s || 1) * (boss ? 1 : LV.F.escala[est || 0]); };

  art.drawCreature = function (c, o) {
    const fn = B[o.corpo];
    if (!fn) return;
    const st = o.est || 0;
    const sc = (o.s || 1) * (o.boss ? 1 : LV.F.escala[st]);
    c.save();
    c.translate(o.x, o.y);
    if (o.rot) c.rotate(o.rot);
    c.scale(sc * (o.face < 0 ? -1 : 1), sc * (o.sy || 1));
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    LW = 2.3 * Math.min(1, 1.5 / sc);
    FL = o.flash || 0;
    if (o.boss) glow(c, 0, (TOPO[o.corpo] || -20) * 0.5, 64, o.pal.g, 0.3 + 0.1 * Math.sin((o.t || 0) * 3));
    fn(c, o.pal, o.t || 0, st, o);
    if (o.boss) coroa(c, o.corpo, o.pal, o.t || 0);
    c.restore();
    FL = 0; LW = 2.2;
  };

  /* ---------- o domador ---------- */
  art.drawTamer = function (c, o) {
    const R = LV.RANKS[o.rank || 0];
    const rank = o.rank || 0;
    c.save(); c.translate(o.x, o.y); c.scale(o.face < 0 ? -1 : 1, 1);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    LW = 2.2; FL = o.flash || 0;
    const mv = o.mov || 0, t = o.t || 0, step = t * 11;
    const bob = mv ? -Math.abs(Math.sin(step)) * 1.8 : Math.sin(t * 2) * 0.7;
    c.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const ph = Math.sin(step + k * Math.PI) * 4.5 * mv;
      c.beginPath(); c.moveTo(-2 + k * 5, -14); c.lineTo(-3 + k * 5 + ph, 0); c.strokeStyle = INK; c.lineWidth = 3.6; c.stroke();
    }
    c.save(); c.translate(0, bob);
    const wind = Math.sin(t * 2.4) * 2 + mv * 5;
    const capa = R.capa;
    c.beginPath();
    c.moveTo(-5, -36);
    c.quadraticCurveTo(-14 - wind * 0.4, -22, -15 - wind, -8);
    c.quadraticCurveTo(-12 - wind, -4 + Math.sin(t * 5) * 1.5, -8 - wind * 0.6, -9);
    c.quadraticCurveTo(-4, -5 + Math.sin(t * 5 + 1) * 1.5, 0, -10);
    c.quadraticCurveTo(5, -6, 9, -11);
    c.quadraticCurveTo(10, -24, 6, -36);
    c.closePath();
    fillInk(c, vgrad(c, -36, -6, shade(capa, 0.12), shade(capa, -0.45)));
    c.beginPath(); c.ellipse(1, -21, 7, 10, 0, 0, TAU); fillInk(c, col('#14161d'));
    if (rank >= 2) {
      c.beginPath(); c.moveTo(-2, -31);
      c.quadraticCurveTo(-12 - wind, -31 + Math.sin(t * 6) * 2, -21 - wind * 1.4, -27 + Math.sin(t * 6 + 1) * 3);
      c.lineTo(-19 - wind * 1.4, -23 + Math.sin(t * 6 + 1) * 3);
      c.quadraticCurveTo(-10, -26, -1, -27); c.closePath();
      fillInk(c, col(shade(capa, 0.3)), 0.8);
    }
    const hx = 3, hy = -41;
    c.beginPath(); c.moveTo(hx - 6, hy - 8);
    c.quadraticCurveTo(hx - 16 - wind * 0.5, hy - 12 + Math.sin(t * 3) * 2, hx - 21 - wind, hy - 3 + Math.sin(t * 3) * 2);
    c.quadraticCurveTo(hx - 12, hy - 3, hx - 8, hy + 1); c.closePath();
    fillInk(c, col(shade(capa, -0.2)));
    c.beginPath(); c.moveTo(hx - 9, hy + 6);
    c.quadraticCurveTo(hx - 11, hy - 10, hx, hy - 11); c.quadraticCurveTo(hx + 10, hy - 10, hx + 10, hy + 2);
    c.quadraticCurveTo(hx + 8, hy + 9, hx, hy + 9); c.quadraticCurveTo(hx - 6, hy + 9, hx - 9, hy + 6); c.closePath();
    fillInk(c, vgrad(c, hy - 11, hy + 9, shade(capa, 0.08), shade(capa, -0.4)));
    c.beginPath(); c.ellipse(hx + 3.6, hy + 1.2, 5.4, 6.2, 0, 0, TAU);
    fillInk(c, vgrad(c, hy - 5, hy + 7, '#efe9dc', '#aaa395'), 0.8);
    dot(c, hx + 2.4, hy + 0.6, 1.3, R.brilho, 6, 0.9);
    dot(c, hx + 6.3, hy + 0.6, 1.2, R.brilho, 6, 0.9);
    const sx = 10, sy = -24 + (o.atk ? -3 * o.atk : 0);
    c.beginPath(); c.moveTo(sx - 2, sy + 10); c.lineTo(sx + 5, sy - 26); c.strokeStyle = INK; c.lineWidth = 3.4; c.stroke();
    c.strokeStyle = col('#5e4c3b'); c.lineWidth = 1.3; c.stroke();
    const lx = sx + 9 + Math.sin(t * 2.6) * 1.5, ly = sy - 18;
    c.beginPath(); c.moveTo(sx + 5, sy - 26); c.quadraticCurveTo(sx + 10, sy - 30, lx, ly - 6); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
    const fl = 0.86 + 0.14 * Math.sin(t * 13) * Math.sin(t * 7.3) + (o.atk || 0) * 0.5;
    glow(c, lx, ly, 52 * fl * (1 + rank * 0.07), '#ffc47a', 0.5);
    c.beginPath(); c.moveTo(lx - 4, ly - 4); c.lineTo(lx + 4, ly - 4); c.lineTo(lx + 5, ly + 5); c.lineTo(lx - 5, ly + 5); c.closePath();
    c.fillStyle = col('#ffe7b0'); c.fill(); inkStroke(c, 0.8);
    c.beginPath(); c.moveTo(lx - 5, ly - 4); c.lineTo(lx, ly - 8); c.lineTo(lx + 5, ly - 4); c.closePath(); c.fillStyle = INK; c.fill();
    glow(c, lx, ly, 13, '#fff3d0', 0.9);
    c.beginPath(); c.arc(sx, sy, 2.7, 0, TAU); fillInk(c, col('#d8d1c2'), 0.7);
    if (rank >= 4) {
      for (let k = 0; k < 3; k++) {
        const a = t * 1.5 + k * TAU / 3;
        dot(c, hx + Math.cos(a) * 15, hy - 4 + Math.sin(a) * 5, 1.2, R.brilho, 7, 0.8);
      }
    }
    if (rank >= 5) {
      c.beginPath(); c.ellipse(hx + 1, hy - 15, 8, 2.5, 0, 0, TAU); c.strokeStyle = col(R.brilho); c.lineWidth = 1.4; c.stroke();
      glow(c, hx + 1, hy - 15, 16, R.brilho, 0.6);
    }
    c.restore();
    c.restore();
    FL = 0;
  };

  /* ---------- retratos para a interface ---------- */
  const retCache = {};
  art.retrato = function (spId, est, size) {
    size = size || 64;
    const key = spId + ':' + est + ':' + size;
    if (retCache[key]) return retCache[key];
    const sp = LV.SPECIES[spId];
    if (!sp) return '';
    const k = 2, cv = document.createElement('canvas');
    cv.width = cv.height = size * k;
    const g = cv.getContext('2d');
    g.scale(k, k);
    glow(g, size / 2, size * 0.55, size * 0.6, sp.pal.g, 0.2);
    const esc = LV.F.escala[est];
    const s = (size / 72) / esc * (1 + est * 0.12);
    const y = sp.voa ? size * 0.5 : size * 0.84;
    art.drawCreature(g, { x: size / 2 + (sp.voa ? 5 * s * esc : -1), y, corpo: sp.corpo, pal: sp.pal, est, s, t: 0.55, face: 1 });
    retCache[key] = cv.toDataURL();
    return retCache[key];
  };
  art.retratoDomador = function (rank, size) {
    size = size || 96;
    const key = 'dom:' + rank + ':' + size;
    if (retCache[key]) return retCache[key];
    const k = 2, cv = document.createElement('canvas');
    cv.width = cv.height = size * k;
    const g = cv.getContext('2d');
    g.scale(k, k);
    const sc = size / 70;
    g.translate(size / 2 - 4 * sc, size * 0.92); g.scale(sc, sc);
    art.drawTamer(g, { x: 0, y: 0, face: 1, t: 0.4, rank, mov: 0 });
    retCache[key] = cv.toDataURL();
    return retCache[key];
  };

  /* =========================================================
     CENÁRIOS — camadas em "tiles" que se repetem sem emenda
     ========================================================= */
  const TW = 1400, TH = 540;
  art.TW = TW; art.TH = TH;

  function novoTile(scale) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(TW * scale)); cv.height = Math.max(1, Math.round(TH * scale));
    const g = cv.getContext('2d');
    g.scale(cv.width / TW, cv.height / TH);
    return { cv, g };
  }
  function rep(x, w, fn) { fn(x); if (x - w < 0) fn(x + TW); if (x + w > TW) fn(x - TW); }
  function lg(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((s) => gr.addColorStop(s[0], s[1])); return gr; }
  function luzSuave(g, x, y, r, h, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(h, a)); gr.addColorStop(0.4, rgba(h, a * 0.35)); gr.addColorStop(1, rgba(h, 0));
    const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.globalCompositeOperation = op;
  }
  function bz(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  }
  function afilado(g, p0, p1, p2, p3, w0, w1) {
    const n = 22, L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = bz(p0, p1, p2, p3, t), b = bz(p0, p1, p2, p3, Math.min(1, t + 0.01));
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const w = (w0 + (w1 - w0) * t) / 2;
      L.push([a[0] - dy * w, a[1] + dx * w]); R.push([a[0] + dy * w, a[1] - dx * w]);
    }
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) g.lineTo(L[i][0], L[i][1]);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath(); g.fill();
  }
  function camadaFill(g, base, P, nev) {
    return lg(g, 0, TH, [[0, shade(base, -0.5)], [0.45, base], [0.82, mixHex(base, P.nevoa, nev)], [1, mixHex(base, P.nevoa, nev * 0.6)]]);
  }

  /* --- temas --- */
  const TEMA = {};

  TEMA.raizes = {
    longe(g, r, P) {
      for (let i = 0; i < 3; i++) { const x = r() * TW, y = 10 + r() * 70; rep(x, 300, (X) => luzSuave(g, X, y, 300, P.luz, 0.08)); }
      g.fillStyle = camadaFill(g, P.longe, P, 0.35);
      for (let i = 0; i < 6; i++) {
        const p = { x: (i + 0.2 + r() * 0.6) * TW / 6, w: 26 + r() * 44, a: r(), b: r(), c: r() };
        rep(p.x, p.w * 3, (X) => {
          const w = p.w;
          g.beginPath(); g.moveTo(X - w * 2.4, TH);
          g.bezierCurveTo(X - w * 0.9, TH - 40, X - w * (0.6 + p.a * 0.5), TH * 0.65, X - w * 0.7, TH * 0.45);
          g.bezierCurveTo(X - w * (0.8 + p.b * 0.4), TH * 0.25, X - w * 1.1, 60, X - w * 2.6, -10);
          g.lineTo(X + w * 2.2, -10);
          g.bezierCurveTo(X + w, 60, X + w * (0.7 + p.c * 0.4), TH * 0.3, X + w * 0.75, TH * 0.5);
          g.bezierCurveTo(X + w * 0.6, TH * 0.7, X + w * 0.9, TH - 40, X + w * 2.3, TH);
          g.closePath(); g.fill();
        });
      }
      for (let i = 0; i < 46; i++) {
        const p = { x: r() * TW, len: 40 + r() * 190, w: 2 + r() * 4, sw: (r() - 0.5) * 30 };
        rep(p.x, 30, (X) => afilado(g, [X, -5], [X + p.sw, p.len * 0.3], [X + p.sw * 0.6, p.len * 0.7], [X + p.sw * 0.3, p.len], p.w, 0.5));
      }
    },
    meio(g, r, P) {
      g.fillStyle = camadaFill(g, P.meio, P, 0.25);
      for (let i = 0; i < 6; i++) {
        const p = { x: r() * TW, d1: (r() - 0.5) * 300, d2: (r() - 0.5) * 300, d3: (r() - 0.5) * 200, w: 18 + r() * 22 };
        rep(p.x, 300, (X) => {
          afilado(g, [X, -10], [X + p.d1, 150], [X + p.d2, 300], [X + p.d3, TH - 70], p.w, p.w * 0.35);
          afilado(g, [X + p.d3 - 20, TH - 90], [X + p.d3 - 40, TH - 50], [X + p.d3 - 80, TH - 30], [X + p.d3 - 120, TH], p.w * 0.4, p.w * 0.7);
        });
      }
      for (let i = 0; i < 26; i++) {
        const p = { x: r() * TW, y: 120 + r() * 300, rr: 3 + r() * 5 };
        rep(p.x, 40, (X) => { luzSuave(g, X, p.y, p.rr * 7, P.acento, 0.35); g.fillStyle = rgba(P.acento, 0.7); g.beginPath(); g.arc(X, p.y, p.rr * 0.45, 0, TAU); g.fill(); });
      }
    },
    perto(g, r, P) {
      g.fillStyle = lg(g, 0, TH, [[0, shade(P.perto, -0.3)], [1, P.perto]]);
      for (let i = 0; i < 9; i++) {
        const p = { x: r() * TW, h: 80 + r() * 160, w: 26 + r() * 40, sw: (r() - 0.5) * 50 };
        rep(p.x, 80, (X) => afilado(g, [X, -10], [X + p.sw * 0.3, p.h * 0.4], [X + p.sw, p.h * 0.8], [X + p.sw * 0.8, p.h], p.w, 1));
      }
      for (let i = 0; i < 14; i++) {
        const p = { x: r() * TW, n: 4 + Math.floor(r() * 4), h: 50 + r() * 70 };
        rep(p.x, 70, (X) => {
          for (let k = 0; k < p.n; k++) {
            const a = -Math.PI / 2 + (k - (p.n - 1) / 2) * 0.32;
            afilado(g, [X, 446], [X + Math.cos(a) * p.h * 0.3, 446 + Math.sin(a) * p.h * 0.5], [X + Math.cos(a) * p.h * 0.8, 446 + Math.sin(a) * p.h * 0.85], [X + Math.cos(a) * p.h * 1.1, 446 + Math.sin(a) * p.h * 0.75], 7, 0.5);
          }
        });
      }
    },
    frente(g, r, P) {
      for (let i = 0; i < 4; i++) {
        const p = { x: r() * TW, h: 40 + r() * 70, w: 30 + r() * 30 };
        rep(p.x, 60, (X) => afilado(g, [X, -10], [X + 6, p.h * 0.5], [X - 4, p.h * 0.8], [X + 2, p.h], p.w, 2));
      }
    },
    prop: 'bulbo',
  };

  TEMA.fungos = {
    longe(g, r, P) {
      for (let i = 0; i < 3; i++) { const x = r() * TW, y = 60 + r() * 60; rep(x, 320, (X) => luzSuave(g, X, y, 320, P.luz, 0.07)); }
      const fill = camadaFill(g, P.longe, P, 0.35);
      for (let i = 0; i < 8; i++) {
        const p = { x: r() * TW, sw: 14 + r() * 24, h: 200 + r() * 250, cw: 70 + r() * 120, ch: 36 + r() * 46, lean: (r() - 0.5) * 50 };
        rep(p.x, p.cw + 40, (X) => {
          g.fillStyle = fill;
          afilado(g, [X, TH], [X + p.lean * 0.2, TH - p.h * 0.4], [X + p.lean * 0.7, TH - p.h * 0.8], [X + p.lean, TH - p.h], p.sw * 1.6, p.sw * 0.8);
          const cx = X + p.lean, cy = TH - p.h;
          g.beginPath(); g.moveTo(cx - p.cw, cy + 10);
          g.quadraticCurveTo(cx - p.cw * 0.9, cy - p.ch, cx, cy - p.ch * 1.05);
          g.quadraticCurveTo(cx + p.cw * 0.9, cy - p.ch, cx + p.cw, cy + 10);
          g.quadraticCurveTo(cx, cy - 4, cx - p.cw, cy + 10); g.closePath(); g.fill();
          for (let k = 0; k < 4; k++) luzSuave(g, cx + (k - 1.5) * p.cw * 0.4, cy - p.ch * 0.4, 10, P.acento, 0.25);
        });
      }
    },
    meio(g, r, P) {
      for (let i = 0; i < 12; i++) {
        const p = { x: r() * TW, sw: 8 + r() * 10, h: 70 + r() * 150, cw: 30 + r() * 50, ch: 18 + r() * 22, lean: (r() - 0.5) * 30 };
        rep(p.x, p.cw + 30, (X) => {
          g.fillStyle = camadaFill(g, P.meio, P, 0.2);
          afilado(g, [X, TH - 60], [X + p.lean * 0.3, TH - 60 - p.h * 0.4], [X + p.lean * 0.7, TH - 60 - p.h * 0.8], [X + p.lean, TH - 60 - p.h], p.sw * 1.5, p.sw);
          const cx = X + p.lean, cy = TH - 60 - p.h;
          g.beginPath(); g.moveTo(cx - p.cw, cy + 6);
          g.quadraticCurveTo(cx - p.cw, cy - p.ch, cx, cy - p.ch); g.quadraticCurveTo(cx + p.cw, cy - p.ch, cx + p.cw, cy + 6);
          g.quadraticCurveTo(cx, cy - 2, cx - p.cw, cy + 6); g.closePath(); g.fill();
          g.strokeStyle = rgba(P.acento, 0.35); g.lineWidth = 1.5; g.beginPath();
          g.moveTo(cx - p.cw + 4, cy + 4); g.quadraticCurveTo(cx, cy - 2, cx + p.cw - 4, cy + 4); g.stroke();
          luzSuave(g, cx, cy + 4, p.cw * 0.9, P.acento, 0.12);
        });
      }
      for (let i = 0; i < 30; i++) {
        const p = { x: r() * TW, len: 40 + r() * 140 };
        rep(p.x, 8, (X) => {
          g.strokeStyle = rgba(P.acento, 0.18); g.lineWidth = 1; g.beginPath(); g.moveTo(X, 0); g.lineTo(X, p.len); g.stroke();
          luzSuave(g, X, p.len, 8, P.acento, 0.5);
        });
      }
    },
    perto(g, r, P) {
      g.fillStyle = P.perto;
      for (let i = 0; i < 5; i++) {
        const p = { x: r() * TW, rx: 110 + r() * 120, ry: 50 + r() * 40, y: -20 - r() * 30 };
        rep(p.x, p.rx, (X) => {
          g.fillStyle = P.perto; g.beginPath(); g.ellipse(X, p.y, p.rx, p.ry + 30, 0, 0, Math.PI); g.fill();
          g.strokeStyle = rgba(P.acento, 0.12); g.lineWidth = 1;
          for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(X + k * p.rx / 7, p.y + 20); g.lineTo(X + k * p.rx / 8, p.y + p.ry + 22); g.stroke(); }
        });
      }
      for (let i = 0; i < 16; i++) {
        const p = { x: r() * TW, h: 18 + r() * 40, cw: 10 + r() * 16 };
        rep(p.x, 30, (X) => {
          g.fillStyle = P.perto;
          g.fillRect(X - 3, 446 - p.h, 6, p.h);
          g.beginPath(); g.moveTo(X - p.cw, 446 - p.h + 3); g.quadraticCurveTo(X, 446 - p.h - p.cw * 1.2, X + p.cw, 446 - p.h + 3); g.closePath(); g.fill();
          luzSuave(g, X, 446 - p.h - 4, p.cw * 1.4, P.acento, 0.22);
        });
      }
    },
    frente(g, r, P) {
      for (let i = 0; i < 3; i++) {
        const p = { x: r() * TW, rx: 60 + r() * 80, ry: 40 + r() * 20 };
        rep(p.x, p.rx, (X) => { g.beginPath(); g.ellipse(X, -10, p.rx, p.ry, 0, 0, Math.PI); g.fill(); });
      }
    },
    prop: 'cogu',
  };

  TEMA.ruinas = {
    longe(g, r, P) {
      for (let i = 0; i < 2; i++) { const x = r() * TW; rep(x, 400, (X) => luzSuave(g, X, 40, 400, P.luz, 0.06)); }
      const fill = camadaFill(g, P.longe, P, 0.4);
      let x = 0;
      while (x < TW) {
        const p = { x, w: 34 + r() * 70, h: 140 + r() * 230, tipo: Math.floor(r() * 4), jan: r() };
        rep(p.x + p.w / 2, p.w, (X0) => {
          const X = X0 - p.w / 2, base = TH - 40, top = base - p.h;
          g.fillStyle = fill;
          g.fillRect(X, top, p.w, p.h + 40);
          g.beginPath();
          if (p.tipo === 0) { g.moveTo(X - 4, top); g.lineTo(X + p.w / 2, top - p.w * 1.1); g.lineTo(X + p.w + 4, top); }
          else if (p.tipo === 1) { g.arc(X + p.w / 2, top, p.w / 2, Math.PI, 0); }
          else if (p.tipo === 2) { g.moveTo(X + p.w * 0.3, top); g.lineTo(X + p.w / 2, top - p.w * 2.6); g.lineTo(X + p.w * 0.7, top); }
          else { for (let k = 0; k < 4; k++) g.rect(X + k * p.w / 4, top - 8, p.w / 8, 8); }
          g.fill();
          const n = Math.floor(p.h / 34);
          for (let k = 0; k < n; k++) {
            if ((k * 7 + Math.floor(p.jan * 10)) % 3 === 0) {
              const wy = top + 16 + k * 34;
              g.fillStyle = rgba(P.acento, 0.35); g.fillRect(X + p.w / 2 - 3, wy, 6, 11);
              luzSuave(g, X + p.w / 2, wy + 5, 14, P.acento, 0.2);
            }
          }
        });
        x += p.w + 6 + r() * 40;
      }
    },
    meio(g, r, P) {
      const fill = camadaFill(g, P.meio, P, 0.25);
      const n = 6, passo = TW / n;
      for (let i = 0; i < n; i++) {
        const p = { x: i * passo + r() * 30, w: 26 + r() * 14, top: 140 + r() * 60, ll: r() };
        rep(p.x, passo, (X) => {
          g.fillStyle = fill;
          g.fillRect(X - p.w / 2, p.top, p.w, TH - p.top);
          g.fillRect(X - p.w / 2 - 6, p.top - 10, p.w + 12, 14);
          g.fillRect(X - p.w / 2 - 6, TH - 110, p.w + 12, 16);
          g.lineWidth = 18; g.strokeStyle = fill;
          g.beginPath(); g.arc(X + passo / 2, p.top + 4, passo / 2 - p.w / 2, Math.PI, 0); g.stroke();
          const lx = X + passo / 2, ly = p.top + 4 - (passo / 2 - p.w / 2) + 70 + p.ll * 30;
          g.strokeStyle = rgba(P.meio, 1); g.lineWidth = 1.5; g.beginPath(); g.moveTo(lx, p.top - passo / 2 + p.w / 2 + 10); g.lineTo(lx, ly - 6); g.stroke();
          g.fillStyle = shade(P.meio, -0.3); g.fillRect(lx - 4, ly - 6, 8, 11);
          luzSuave(g, lx, ly, 42, P.luz, 0.3);
          g.fillStyle = rgba(P.luz, 0.85); g.fillRect(lx - 2, ly - 3, 4, 6);
        });
      }
    },
    perto(g, r, P) {
      g.fillStyle = P.perto; g.strokeStyle = P.perto;
      for (let i = 0; i < 7; i++) {
        const p = { x: r() * TW, len: 60 + r() * 160 };
        rep(p.x, 10, (X) => {
          g.lineWidth = 2.2;
          for (let y = -6; y < p.len; y += 9) { g.beginPath(); g.ellipse(X, y, 2.5, 5, 0, 0, TAU); g.stroke(); }
          g.beginPath(); g.ellipse(X, p.len + 6, 7, 9, 0, 0, TAU); g.fill();
        });
      }
      for (let i = 0; i < 6; i++) {
        const p = { x: r() * TW, w: 30 + r() * 26, h: 50 + r() * 90, j: r() };
        rep(p.x, p.w, (X) => {
          g.beginPath(); g.moveTo(X - p.w / 2, 446); g.lineTo(X - p.w / 2, 446 - p.h);
          for (let k = 0; k <= 4; k++) g.lineTo(X - p.w / 2 + k * p.w / 4, 446 - p.h - (k % 2 ? 8 + p.j * 10 : 0));
          g.lineTo(X + p.w / 2, 446); g.closePath(); g.fill();
        });
      }
      for (let i = 0; i < 4; i++) {
        const p = { x: r() * TW, w: 120 + r() * 120 };
        rep(p.x, p.w, (X) => {
          g.fillRect(X - p.w / 2, 404, p.w, 3);
          for (let k = 0; k <= p.w; k += 12) {
            g.fillRect(X - p.w / 2 + k - 1, 392, 2.4, 54);
            g.beginPath(); g.moveTo(X - p.w / 2 + k - 3, 393); g.lineTo(X - p.w / 2 + k, 384); g.lineTo(X - p.w / 2 + k + 3, 393); g.fill();
          }
        });
      }
    },
    frente(g, r, P) {
      for (let i = 0; i < 3; i++) {
        const p = { x: r() * TW, len: 30 + r() * 70 };
        rep(p.x, 10, (X) => { g.lineWidth = 4; for (let y = -6; y < p.len; y += 12) { g.beginPath(); g.ellipse(X, y, 3.5, 7, 0, 0, TAU); g.stroke(); } });
      }
    },
    prop: 'poste',
  };

  TEMA.cristais = {
    longe(g, r, P) {
      for (let i = 0; i < 3; i++) { const x = r() * TW; rep(x, 300, (X) => luzSuave(g, X, 300, 300, P.acento, 0.05)); }
      const fill = camadaFill(g, P.longe, P, 0.35);
      for (let i = 0; i < 12; i++) {
        const p = { x: r() * TW, w: 30 + r() * 60, h: 160 + r() * 300, sl: (r() - 0.5) * 0.5, cima: r() < 0.35 };
        rep(p.x, p.w * 2, (X) => {
          const y0 = p.cima ? -10 : TH, d = p.cima ? 1 : -1, tip = y0 + d * p.h;
          g.fillStyle = fill;
          g.beginPath(); g.moveTo(X - p.w / 2, y0); g.lineTo(X - p.w / 2 + p.sl * p.h * 0.3, tip - d * p.w * 0.6); g.lineTo(X + p.sl * p.h * 0.3, tip);
          g.lineTo(X + p.w / 2 + p.sl * p.h * 0.3, tip - d * p.w * 0.6); g.lineTo(X + p.w / 2, y0); g.closePath(); g.fill();
          g.fillStyle = rgba(P.luz, 0.06);
          g.beginPath(); g.moveTo(X - p.w / 2, y0); g.lineTo(X - p.w / 2 + p.sl * p.h * 0.3, tip - d * p.w * 0.6); g.lineTo(X + p.sl * p.h * 0.3, tip); g.lineTo(X - p.w * 0.05, y0); g.closePath(); g.fill();
        });
      }
    },
    meio(g, r, P) {
      for (let i = 0; i < 10; i++) {
        const p = { x: r() * TW, cima: r() < 0.4, n: 3 + Math.floor(r() * 4), s: 0.6 + r() * 0.8, seeds: [r(), r(), r(), r(), r(), r()] };
        rep(p.x, 90, (X) => {
          const y0 = p.cima ? -6 : TH - 76, d = p.cima ? 1 : -1;
          for (let k = 0; k < p.n; k++) {
            const h = (50 + p.seeds[k] * 90) * p.s, w = (10 + p.seeds[(k + 1) % 6] * 12) * p.s, ox = (k - p.n / 2) * 16 * p.s, sl = (p.seeds[(k + 2) % 6] - 0.5) * 0.7;
            g.fillStyle = lg(g, y0, y0 + d * h, [[0, shade(P.meio, -0.2)], [1, mixHex(P.meio, P.acento, 0.35)]]);
            g.beginPath(); g.moveTo(X + ox - w, y0); g.lineTo(X + ox + sl * h - w * 0.6, y0 + d * h * 0.8); g.lineTo(X + ox + sl * h, y0 + d * h);
            g.lineTo(X + ox + sl * h + w * 0.6, y0 + d * h * 0.8); g.lineTo(X + ox + w, y0); g.closePath(); g.fill();
            g.strokeStyle = rgba(P.acento, 0.35); g.lineWidth = 1.2; g.stroke();
          }
          luzSuave(g, X, y0 + d * 30, 110 * p.s, P.acento, 0.14);
        });
      }
    },
    perto(g, r, P) {
      g.fillStyle = P.perto;
      for (let i = 0; i < 8; i++) {
        const p = { x: r() * TW, w: 60 + r() * 90, h: 30 + r() * 70, cima: r() < 0.5, a: r(), b: r() };
        rep(p.x, p.w, (X) => {
          const y0 = p.cima ? -4 : 450, d = p.cima ? 1 : -1;
          g.fillStyle = P.perto;
          g.beginPath(); g.moveTo(X - p.w / 2, y0); g.lineTo(X - p.w * 0.3, y0 + d * p.h * (0.6 + p.a * 0.4)); g.lineTo(X, y0 + d * p.h);
          g.lineTo(X + p.w * 0.35, y0 + d * p.h * (0.5 + p.b * 0.4)); g.lineTo(X + p.w / 2, y0); g.closePath(); g.fill();
          const cx = X + (p.a - 0.5) * p.w * 0.4, ch = 16 + p.b * 20;
          g.fillStyle = mixHex(P.acento, '#ffffff', 0.2);
          g.beginPath(); g.moveTo(cx - 4, y0 + d * p.h * 0.7); g.lineTo(cx, y0 + d * (p.h * 0.7 + ch)); g.lineTo(cx + 4, y0 + d * p.h * 0.7); g.closePath(); g.fill();
          luzSuave(g, cx, y0 + d * (p.h * 0.7 + ch * 0.5), 26, P.acento, 0.35);
        });
      }
    },
    frente(g, r, P) {
      for (let i = 0; i < 3; i++) {
        const p = { x: r() * TW, w: 40 + r() * 40, h: 40 + r() * 50 };
        rep(p.x, p.w, (X) => { g.beginPath(); g.moveTo(X - p.w / 2, -5); g.lineTo(X, p.h); g.lineTo(X + p.w / 2, -5); g.closePath(); g.fill(); });
      }
    },
    prop: 'cristal',
  };

  TEMA.cinzas = {
    longe(g, r, P) {
      const fill = camadaFill(g, P.longe, P, 0.3);
      g.fillStyle = fill;
      g.beginPath(); g.moveTo(0, TH);
      let x = 0;
      const pts = [];
      while (x <= TW) { pts.push([x, 160 + r() * 260]); x += 30 + r() * 80; }
      pts[pts.length - 1][1] = pts[0][1];
      pts[pts.length - 1][0] = TW;
      for (const p of pts) g.lineTo(p[0], p[1]);
      g.lineTo(TW, TH); g.closePath(); g.fill();
      const lava = lg(g, 360, TH, [[0, rgba(P.acento, 0)], [1, rgba(P.acento, 0.35)]]);
      g.globalCompositeOperation = 'lighter'; g.fillStyle = lava; g.fillRect(0, 360, TW, TH - 360); g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 4; i++) { const p = { x: r() * TW }; rep(p.x, 200, (X) => luzSuave(g, X, TH - 40, 200, P.acento, 0.12)); }
    },
    meio(g, r, P) {
      const fill = camadaFill(g, P.meio, P, 0.2);
      for (let i = 0; i < 7; i++) {
        const p = { x: r() * TW, h: 120 + r() * 160, w: 10 + r() * 10, br: [r(), r(), r(), r()] };
        rep(p.x, 120, (X) => {
          g.fillStyle = fill;
          const base = TH - 70;
          afilado(g, [X, base], [X + 6, base - p.h * 0.4], [X - 8, base - p.h * 0.75], [X + 4, base - p.h], p.w * 1.8, 2);
          for (let k = 0; k < 4; k++) {
            const y = base - p.h * (0.4 + k * 0.15), dir = k % 2 ? 1 : -1, L = 30 + p.br[k] * 50;
            afilado(g, [X, y], [X + dir * L * 0.4, y - L * 0.2], [X + dir * L * 0.8, y - L * 0.45], [X + dir * L, y - L * 0.4 - 10], p.w * 0.6, 1);
          }
        });
      }
      for (let i = 0; i < 5; i++) {
        const p = { x: r() * TW, w: 100 + r() * 120, h: 40 + r() * 50 };
        rep(p.x, p.w, (X) => {
          g.fillStyle = fill;
          g.beginPath(); g.ellipse(X, TH - 70, p.w / 2, p.h, 0, Math.PI, 0); g.fill();
          g.strokeStyle = rgba(P.acento, 0.55); g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(X - p.w * 0.3, TH - 72); g.lineTo(X - p.w * 0.1, TH - 70 - p.h * 0.5); g.lineTo(X + p.w * 0.05, TH - 70 - p.h * 0.4); g.lineTo(X + p.w * 0.2, TH - 70 - p.h * 0.75); g.stroke();
          luzSuave(g, X, TH - 70 - p.h * 0.5, 40, P.acento, 0.2);
        });
      }
    },
    perto(g, r, P) {
      g.fillStyle = P.perto;
      for (let i = 0; i < 12; i++) {
        const p = { x: r() * TW, h: 60 + r() * 150, w: 22 + r() * 40 };
        rep(p.x, p.w, (X) => {
          g.fillStyle = P.perto;
          g.beginPath(); g.moveTo(X - p.w / 2, -5); g.lineTo(X - p.w * 0.1, p.h * 0.7); g.lineTo(X, p.h); g.lineTo(X + p.w * 0.15, p.h * 0.6); g.lineTo(X + p.w / 2, -5); g.closePath(); g.fill();
          g.strokeStyle = rgba(P.acento, 0.45); g.lineWidth = 1.2; g.beginPath(); g.moveTo(X - 2, 10); g.lineTo(X + 2, p.h * 0.4); g.lineTo(X - 1, p.h * 0.6); g.stroke();
        });
      }
      for (let i = 0; i < 9; i++) {
        const p = { x: r() * TW, w: 50 + r() * 80, h: 20 + r() * 40 };
        rep(p.x, p.w, (X) => { g.fillStyle = P.perto; g.beginPath(); g.ellipse(X, 448, p.w / 2, p.h, 0, Math.PI, 0); g.fill(); });
      }
    },
    frente(g, r, P) {
      for (let i = 0; i < 4; i++) {
        const p = { x: r() * TW, h: 40 + r() * 60, w: 26 + r() * 30 };
        rep(p.x, p.w, (X) => { g.beginPath(); g.moveTo(X - p.w / 2, -5); g.lineTo(X, p.h); g.lineTo(X + p.w / 2, -5); g.closePath(); g.fill(); });
      }
    },
    prop: 'fenda',
  };

  /* --- chão --- */
  function topoChao(x) { return LV.GROUND + Math.sin((x / TW) * TAU * 7) * 2.5 + Math.sin((x / TW) * TAU * 17 + 1.3) * 1.5; }
  function chao(g, r, P, tema) {
    g.beginPath(); g.moveTo(0, TH);
    for (let x = 0; x <= TW; x += 8) g.lineTo(x, topoChao(x));
    g.lineTo(TW, TH); g.closePath();
    g.fillStyle = lg(g, LV.GROUND - 6, TH, [[0, P.chaoTopo], [0.22, P.chao], [1, '#000000']]);
    g.fill();
    for (let i = 0; i < 80; i++) {
      const p = { x: r() * TW, y: LV.GROUND + 14 + r() * 90, rx: 5 + r() * 24, ry: 2 + r() * 8, cl: r() < 0.5 };
      rep(p.x, p.rx, (X) => {
        g.fillStyle = p.cl ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.3)';
        g.beginPath(); g.ellipse(X, p.y, p.rx, p.ry, 0, 0, TAU); g.fill();
      });
    }
    g.beginPath();
    for (let x = 0; x <= TW; x += 8) { if (x === 0) g.moveTo(x, topoChao(x)); else g.lineTo(x, topoChao(x)); }
    g.strokeStyle = rgba(P.acento, 0.22); g.lineWidth = 1.2; g.stroke();
    const topo = shade(P.chaoTopo, 0.18);
    if (tema === 'raizes' || tema === 'fungos') {
      g.fillStyle = topo;
      for (let x = 0; x < TW; x += 3 + r() * 5) {
        const y = topoChao(x) + 2, h = 4 + r() * 12, l = (r() - 0.5) * 8;
        afilado(g, [x, y], [x + l * 0.2, y - h * 0.4], [x + l * 0.7, y - h * 0.8], [x + l, y - h], 2.4, 0.3);
        if (r() < 0.05) luzSuave(g, x + l, y - h, 7, P.acento, 0.6);
      }
      if (tema === 'fungos') {
        for (let i = 0; i < 40; i++) {
          const x = r() * TW, y = topoChao(x) + 1, h = 3 + r() * 6;
          g.fillStyle = shade(P.chaoTopo, 0.3); g.fillRect(x - 1, y - h, 2, h);
          g.beginPath(); g.ellipse(x, y - h, 3 + h * 0.3, 2 + h * 0.2, 0, Math.PI, 0); g.fill();
          if (r() < 0.4) luzSuave(g, x, y - h, 8, P.acento, 0.45);
        }
      }
    } else if (tema === 'ruinas') {
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
      for (let x = r() * 40; x < TW; x += 40 + r() * 50) { g.beginPath(); g.moveTo(x, topoChao(x)); g.lineTo(x + 2, topoChao(x) + 22); g.stroke(); }
      for (let i = 0; i < 7; i++) {
        const p = { x: r() * TW, w: 40 + r() * 90 };
        rep(p.x, p.w, (X) => {
          g.fillStyle = rgba(P.luz, 0.05); g.beginPath(); g.ellipse(X, LV.GROUND + 7, p.w / 2, 4, 0, 0, TAU); g.fill();
          g.strokeStyle = rgba(P.luz, 0.18); g.lineWidth = 1; g.beginPath(); g.moveTo(X - p.w * 0.3, LV.GROUND + 6); g.lineTo(X + p.w * 0.1, LV.GROUND + 6); g.stroke();
        });
      }
      g.fillStyle = topo;
      for (let x = 0; x < TW; x += 9 + r() * 20) { const y = topoChao(x) + 1; g.fillRect(x, y - 2 - r() * 3, 1.5, 4); }
    } else if (tema === 'cristais') {
      for (let i = 0; i < 46; i++) {
        const x = r() * TW, y = topoChao(x) + 2, h = 5 + r() * 12, w = 2 + r() * 3;
        g.fillStyle = r() < 0.35 ? mixHex(P.acento, P.chaoTopo, 0.4) : shade(P.chaoTopo, 0.2);
        g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + (r() - 0.5) * 4, y - h); g.lineTo(x + w, y); g.closePath(); g.fill();
        if (r() < 0.3) luzSuave(g, x, y - h * 0.6, 10, P.acento, 0.4);
      }
    } else {
      g.strokeStyle = rgba(P.acento, 0.6); g.lineWidth = 1.2;
      for (let i = 0; i < 16; i++) {
        const p = { x: r() * TW, y: LV.GROUND + 18 + r() * 60, segs: [r(), r(), r(), r()] };
        rep(p.x, 60, (X) => {
          g.beginPath(); g.moveTo(X, p.y);
          let xx = X, yy = p.y;
          for (const s of p.segs) { xx += 10 + s * 18; yy += (s - 0.5) * 10; g.lineTo(xx, yy); }
          g.stroke();
          luzSuave(g, X + 25, p.y, 30, P.acento, 0.15);
        });
      }
      g.fillStyle = shade(P.chaoTopo, 0.12);
      for (let x = 0; x < TW; x += 4 + r() * 8) { const y = topoChao(x) + 2; g.fillRect(x, y - 1 - r() * 3, 2 + r() * 3, 3); }
    }
  }

  function frente(g, r, P, tema) {
    const dark = shade(P.perto, -0.55);
    g.fillStyle = dark; g.strokeStyle = dark;
    try { g.filter = 'blur(2.5px)'; } catch (e) { /* sem filtro */ }
    for (let i = 0; i < 8; i++) {
      const p = { x: r() * TW, w: 90 + r() * 180, h: 30 + r() * 46, planta: r() < 0.5, n: 5 + Math.floor(r() * 5) };
      rep(p.x, p.w, (X) => {
        if (p.planta) {
          for (let k = 0; k < p.n; k++) {
            const a = -Math.PI / 2 + (k - (p.n - 1) / 2) * 0.28, L = 60 + p.h;
            afilado(g, [X, TH + 10], [X + Math.cos(a) * L * 0.3, TH + 10 + Math.sin(a) * L * 0.5], [X + Math.cos(a) * L * 0.8, TH + 10 + Math.sin(a) * L * 0.9], [X + Math.cos(a) * L * 1.2, TH + 10 + Math.sin(a) * L * 0.75], 14, 1);
          }
        } else { g.beginPath(); g.ellipse(X, TH + 6, p.w / 2, p.h, 0, Math.PI, 0); g.fill(); }
      });
    }
    TEMA[tema].frente(g, r, P);
    try { g.filter = 'none'; } catch (e) { /* ok */ }
  }

  function nevoa(g, r, P) {
    for (let i = 0; i < 18; i++) {
      const p = { x: r() * TW, y: 260 + r() * 210, rx: 110 + r() * 200, a: 0.05 + r() * 0.07 };
      rep(p.x, p.rx, (X) => {
        const gr = g.createRadialGradient(X, p.y, 0, X, p.y, p.rx);
        gr.addColorStop(0, rgba(P.nevoa, p.a)); gr.addColorStop(1, rgba(P.nevoa, 0));
        g.fillStyle = gr; g.save(); g.translate(X, p.y); g.scale(1, 0.4); g.translate(-X, -p.y);
        g.fillRect(X - p.rx, p.y - p.rx, p.rx * 2, p.rx * 2); g.restore();
      });
    }
  }

  art.criarFundo = function (idx, scale) {
    const def = LV.MAPS[idx], P = def.pal, T = TEMA[def.tema];
    const s = LV.clamp(scale || 1, 0.5, 1.5);
    const r = LV.rng(def.seed * 1000 + 7);
    const mk = (fn, sc) => { const t = novoTile(sc); fn(t.g); return t.cv; };
    const fundo = {
      P, tema: def.tema,
      longe: mk((g) => T.longe(g, r, P), s * 0.8),
      meio: mk((g) => T.meio(g, r, P), s * 0.9),
      perto: mk((g) => T.perto(g, r, P), s),
      chao: mk((g) => chao(g, r, P, def.tema), s),
      frente: mk((g) => frente(g, r, P, def.tema), s * 0.7),
      nevoa: mk((g) => nevoa(g, r, P), 0.5),
      raios: [], props: [],
    };
    for (let i = 0; i < 4; i++) fundo.raios.push({ x: r() * TW, w: 40 + r() * 90, ang: 0.18 + r() * 0.25, a: 0.05 + r() * 0.06, ph: r() * 10 });
    const rp = LV.rng(def.seed * 77 + 3);
    for (let x = 160 + rp() * 100; x < LV.MAP_W - 80; x += 150 + rp() * 230) fundo.props.push({ x, tipo: T.prop, h: 0.7 + rp() * 0.6, ph: rp() * 10, v: rp() });
    return fundo;
  };

  /* --- objetos de cenário animados (no mundo) --- */
  art.drawProp = function (c, p, t, P) {
    const G = LV.GROUND, x = p.x;
    if (p.tipo === 'bulbo') {
      const sw = Math.sin(t * 1.3 + p.ph) * 4, h = 38 * p.h;
      c.fillStyle = shade(P.perto, 0.1);
      afilado(c, [x, G + 2], [x + sw * 0.2, G - h * 0.4], [x + sw * 0.7, G - h * 0.8], [x + sw, G - h], 3.2, 1.6);
      c.beginPath(); c.ellipse(x - 6, G - h * 0.35, 6, 2.4, -0.5, 0, TAU); c.fill();
      const pul = 0.7 + 0.3 * Math.sin(t * 2 + p.ph);
      glow(c, x + sw, G - h - 3, 30 * pul, P.acento, 0.55);
      c.beginPath(); c.ellipse(x + sw, G - h - 3, 4, 5, 0, 0, TAU); c.fillStyle = mixHex(P.acento, '#ffffff', 0.3); c.fill();
    } else if (p.tipo === 'cogu') {
      for (let k = 0; k < 3; k++) {
        const ox = (k - 1) * 9 * p.h, h = (10 + ((k * 7 + p.v * 10) % 9)) * p.h, cw = (5 + k % 2 * 2) * p.h;
        c.fillStyle = shade(P.perto, 0.25); c.fillRect(x + ox - 1.5, G - h, 3, h);
        c.beginPath(); c.ellipse(x + ox, G - h, cw, cw * 0.7, 0, Math.PI, 0); c.fillStyle = shade(P.meio, 0.15); c.fill();
        glow(c, x + ox, G - h - 2, 14, P.acento, 0.35 + 0.15 * Math.sin(t * 2 + k + p.ph));
      }
    } else if (p.tipo === 'poste') {
      const h = 84 * p.h, fl = 0.85 + 0.15 * Math.sin(t * 9 + p.ph) * Math.sin(t * 5.1);
      c.fillStyle = INK;
      c.fillRect(x - 2, G - h, 4, h); c.fillRect(x - 6, G - 6, 12, 6);
      c.beginPath(); c.moveTo(x, G - h); c.quadraticCurveTo(x + 14, G - h - 6, x + 16, G - h + 6); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
      glow(c, x + 16, G - h + 14, 70 * fl, P.luz, 0.4);
      c.fillStyle = INK; c.fillRect(x + 11, G - h + 6, 10, 14);
      c.fillStyle = mixHex(P.luz, '#fff2c8', 0.5); c.fillRect(x + 13, G - h + 9, 6, 9);
      glow(c, x + 16, G - h + 14, 16, '#fff2c8', 0.8 * fl);
    } else if (p.tipo === 'cristal') {
      const tw = 0.6 + 0.4 * Math.sin(t * 2.5 + p.ph);
      const Pc = { g: mixHex(P.acento, '#ffffff', 0.25), m: shade(P.meio, 0.15) };
      LW = 1.6;
      crystal(c, x - 7 * p.h, G + 1, 16 * p.h, 4 * p.h, Pc);
      crystal(c, x + 6 * p.h, G + 1, 12 * p.h, 3.5 * p.h, Pc);
      crystal(c, x, G + 1, 24 * p.h, 5 * p.h, Pc);
      LW = 2.2;
      glow(c, x, G - 14 * p.h, 30, P.acento, 0.3 * tw);
    } else if (p.tipo === 'fenda') {
      const pul = 0.6 + 0.4 * Math.sin(t * 3 + p.ph);
      c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, G + 3, 16 * p.h, 3, 0, 0, TAU); c.fill();
      glow(c, x, G + 2, 34 * p.h, P.acento, 0.45 * pul);
      for (let k = 0; k < 3; k++) {
        const ciclo = ((t * 0.7 + k / 3 + p.ph) % 1);
        const yy = G - ciclo * 70, xx = x + Math.sin(ciclo * 8 + k) * 6;
        glow(c, xx, yy, 6, P.acento, (1 - ciclo) * 0.9);
      }
    }
  };

  art.drawTile = function (c, cv, par, cam, viewW, dx, y, alpha) {
    if (!cv) return;
    const off = (((cam * par + (dx || 0)) % TW) + TW) % TW;
    const ga = c.globalAlpha;
    if (alpha != null) c.globalAlpha = ga * alpha;
    for (let x = -off; x < viewW; x += TW) c.drawImage(cv, x, y || 0, TW, TH);
    c.globalAlpha = ga;
  };

  art.drawRaios = function (c, raios, cam, viewW, t, P) {
    const op = c.globalCompositeOperation;
    c.globalCompositeOperation = 'lighter';
    for (const r of raios) {
      const base = ((((r.x - cam * 0.3) % TW) + TW) % TW);
      for (let x = base - TW; x < viewW + 200; x += TW) {
        const a = r.a * (0.65 + 0.35 * Math.sin(t * 0.4 + r.ph));
        const gr = c.createLinearGradient(0, 0, 0, 470);
        gr.addColorStop(0, rgba(P.luz, a)); gr.addColorStop(1, rgba(P.luz, 0));
        c.fillStyle = gr;
        c.beginPath();
        c.moveTo(x, -10); c.lineTo(x + r.w, -10);
        c.lineTo(x + r.w * 2.1 + r.ang * 470, 470); c.lineTo(x + r.ang * 470, 470); c.closePath(); c.fill();
      }
    }
    c.globalCompositeOperation = op;
  };

  art.lanterna = function (c, x, y, rot, brilho) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    glow(c, 0, 0, 30, '#ffd38a', 0.6 * (brilho || 1));
    c.beginPath(); c.moveTo(-5, -5); c.lineTo(5, -5); c.lineTo(6, 6); c.lineTo(-6, 6); c.closePath();
    c.fillStyle = '#ffe9b5'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(-6, -5); c.lineTo(0, -10); c.lineTo(6, -5); c.closePath(); c.fillStyle = INK; c.fill();
    c.beginPath(); c.arc(0, -11, 2.5, Math.PI, 0); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke();
    c.restore();
  };
})();
