'use strict';
/* Lumevale — fases com vários andares: plataformas, escadas, física de pulo/queda e rotas para a IA. */
(function () {
  const LV = window.LV, G = LV.GROUND;
  const nivel = (LV.nivel = {});
  nivel.PULO_V = 560;
  nivel.GRAV = 1300;
  const clamp = LV.clamp;

  /* ---------- geração ---------- */
  nivel.gerar = function (idx) {
    const def = LV.MAPS[idx], cen = def.cen, r = LV.rng(def.seed * 31 + 5), W = LV.MAP_W;
    const incl = LV.PECAS.escada.inclinacao;
    const sup = [{ id: 0, x0: 0, x1: W, y: G, tipo: 'chao' }];
    const esc = [];
    const add = (x0, x1, y, tipo, extra) => {
      const s = Object.assign({ id: sup.length, x0: Math.round(x0), x1: Math.round(x1), y: Math.round(y), tipo }, extra || {});
      sup.push(s);
      return s;
    };
    let x = 420, n = 0;
    while (x < W - 560) {
      const torre = n % 2 === 0 ? r() < 0.8 : r() < 0.35;
      n++;
      let fim;
      if (torre) {
        const sobe1 = 118 + Math.round(r() * 10), run1 = sobe1 * incl;
        const larg1 = 290 + r() * 190, dir = r() < 0.55 ? 1 : -1;
        let p1, e1;
        if (dir === 1) {
          p1 = add(x + run1, x + run1 + larg1, G - sobe1, cen.plat, { torre: true });
          e1 = { xb: x, yb: G, xt: p1.x0, yt: p1.y, de: 0, para: p1.id, dir: 1 };
        } else {
          p1 = add(x, x + larg1, G - sobe1, cen.plat, { torre: true });
          e1 = { xb: p1.x1 + run1, yb: G, xt: p1.x1, yt: p1.y, de: 0, para: p1.id, dir: -1 };
        }
        esc.push(e1);
        fim = Math.max(p1.x1, e1.xb);
        if (r() < 0.65) {
          const sobe2 = 104 + Math.round(r() * 8), run2 = sobe2 * incl, larg2 = 180 + r() * 120;
          let p2, e2;
          if (dir === 1) {
            const xb2 = p1.x1 - 28, xt2 = xb2 - run2;
            p2 = add(Math.max(40, xt2 - larg2), xt2, p1.y - sobe2, cen.alta, { torre: true, alto: true });
            e2 = { xb: xb2, yb: p1.y, xt: xt2, yt: p2.y, de: p1.id, para: p2.id, dir: -1 };
          } else {
            const xb2 = p1.x0 + 28, xt2 = xb2 + run2;
            p2 = add(xt2, Math.min(W - 40, xt2 + larg2), p1.y - sobe2, cen.alta, { torre: true, alto: true });
            e2 = { xb: xb2, yb: p1.y, xt: xt2, yt: p2.y, de: p1.id, para: p2.id, dir: 1 };
          }
          esc.push(e2);
          fim = Math.max(fim, p2.x1);
        }
      } else {
        const larg = 160 + r() * 110;
        const pA = add(x, x + larg, G - 106 - Math.round(r() * 6), cen.alta, { flut: true });
        fim = pA.x1;
        if (r() < 0.7) {
          const x0 = pA.x0 + 60 + r() * Math.max(10, larg - 110);
          const pB = add(x0, x0 + 150 + r() * 80, pA.y - 100 - Math.round(r() * 6), cen.alta, { flut: true });
          fim = Math.max(fim, pB.x1);
        }
      }
      x = fim + 130 + r() * 140;
    }
    esc.forEach((e, i) => { e.id = i; });

    /* objetos de cenário */
    const props = [];
    const pilares = [];
    const temas = cen.props;
    const longeDeEscada = (px) => esc.every((e) => px < Math.min(e.xb, e.xt) - 30 || px > Math.max(e.xb, e.xt) + 30);
    for (let px = 230; px < W - 120; px += 190 + r() * 260) {
      if (longeDeEscada(px)) props.push({ tipo: temas[Math.floor(r() * temas.length)], x: px, y: G + 2, s: 0.8 + r() * 0.5, flip: r() < 0.5, ph: r() * 10 });
    }
    sup.forEach((s) => {
      if (!s.id || s.x1 - s.x0 < 150 || r() > 0.65) return;
      const px = s.x0 + 50 + r() * (s.x1 - s.x0 - 100);
      if (longeDeEscada(px)) props.push({ tipo: temas[Math.floor(r() * temas.length)], x: px, y: s.y + 1, s: 0.7 + r() * 0.3, flip: r() < 0.5, ph: r() * 10 });
    });
    if (cen.correntes) for (let px = 260; px < W - 100; px += 280 + r() * 420) props.push({ tipo: 'corrente', x: px, y: -6, s: 0.6 + r() * 0.7, pend: true, ph: r() * 10 });
    if (cen.pilar) {
      sup.forEach((s) => {
        if (!s.torre) return;
        const pc = LV.PECAS[s.tipo];
        const y0 = s.y + pc.alt * (1 - pc.topo) - 6;
        if (y0 > G - 20) return;
        // uma coluna no meio das plataformas curtas, duas nas largas (longe das pontas arredondadas)
        const larg = s.x1 - s.x0, xs = larg < 230 ? [(s.x0 + s.x1) / 2] : [s.x0 + larg * 0.24, s.x1 - larg * 0.24];
        for (const px of xs) {
          const abaixo = nivel.sobre({ sup }, px, s.y + 4);
          if (abaixo) pilares.push({ x: Math.round(px), y0, y1: abaixo.y + 4, sy: s.y, alta: !!s.alto });
        }
      });
    }

    /* ninhos: pontos fixos de criaturas, uma espécie por ninho, níveis crescendo da esquerda para a direita */
    const trechos = [];
    const bloq = esc.map((e) => [Math.min(e.xb, e.xt) - 34, Math.max(e.xb, e.xt) + 34]).sort((a, b) => a[0] - b[0]);
    let cur = 380;
    for (const b of bloq) { if (b[0] - cur > 170) trechos.push({ sup: 0, x0: cur, x1: b[0] }); cur = Math.max(cur, b[1]); }
    if (W - 60 - cur > 170) trechos.push({ sup: 0, x0: cur, x1: W - 60 });
    sup.forEach((s) => { if (s.id && s.x1 - s.x0 >= 150) trechos.push({ sup: s.id, x0: s.x0 + 18, x1: s.x1 - 18 }); });
    /* um ninho por "faixa" horizontal: nunca dois ninhos empilhados no mesmo trecho da tela */
    const NZ = 6, MEIA = 120, c0 = 480, c1 = W - 170;
    const escolhidos = [];
    for (let k = 0; k < NZ; k++) {
      const alvo = c0 + ((c1 - c0) * k) / (NZ - 1);
      let melhor = null;
      for (const d of [0, -50, 50, -95, 95]) {
        const cx = alvo + d;
        const cands = trechos.filter((t) => t.x1 - t.x0 >= 120 && cx > t.x0 + 50 && cx < t.x1 - 50);
        if (!cands.length) continue;
        const alto = cands.filter((t) => t.sup), chao = cands.filter((t) => !t.sup);
        const t = alto.length && (r() < 0.5 || !chao.length) ? alto[Math.floor(r() * alto.length)] : chao[0];
        const ant = escolhidos[escolhidos.length - 1];
        const x0 = Math.max(t.x0 + 6, cx - MEIA, ant ? ant.x1 + 55 : 0), x1 = Math.min(t.x1 - 6, cx + MEIA);
        if (x1 - x0 < 110) continue;
        melhor = { sup: t.sup, x0, x1 };
        break;
      }
      if (melhor) escolhidos.push(melhor);
    }
    const nZ = escolhidos.length;
    const tipos = [];
    def.selvagens.forEach((sp) => tipos.push({ tipo: 'selvagem', sp }));
    // ninhos de Breus: 2 no primeiro mapa, 3 nos outros; cada um tem um Breu principal e mistura os outros do mapa
    const nH = Math.min(def.hostis.length, idx === 0 ? 2 : 3);
    for (let k = 0; k < nH; k++) tipos.push({ tipo: 'hostil', hid: def.hostis[k], hids: def.hostis });
    for (let i = tipos.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tipos[i], tipos[j]] = [tipos[j], tipos[i]]; }
    const zonas = escolhidos.map((p, k) => {
      const t = tipos[k % tipos.length];
      const nv = Math.round(def.lv[0] + ((def.lv[1] - def.lv[0]) * k) / Math.max(1, nZ - 1));
      const cor = t.tipo === 'selvagem' ? LV.SPECIES[t.sp].pal.g : def.hostil.g;
      return Object.assign({ id: k, sup: p.sup, x0: Math.round(p.x0), x1: Math.round(p.x1), cx: Math.round((p.x0 + p.x1) / 2), y: sup[p.sup].y, nv, cap: t.tipo === 'selvagem' ? 4 : 5, cor }, t);
    });

    const L = { idx, w: W, sup, esc, props, pilares, cen, zonas, arestas: null, rotas: new Map() };
    construirArestas(L);
    return L;
  };

  /* mapa do tutorial: um trecho reto das Raízes, sem ninhos */
  nivel.gerarTutorial = function () {
    const def = LV.MAPS[0], cen = def.cen, r = LV.rng(4242), W = 1600;
    const sup = [{ id: 0, x0: 0, x1: W, y: G, tipo: 'chao' }];
    const props = [];
    for (let px = 140; px < W - 100; px += 230 + r() * 220) props.push({ tipo: cen.props[Math.floor(r() * cen.props.length)], x: px, y: G + 2, s: 0.8 + r() * 0.5, flip: r() < 0.5, ph: r() * 10 });
    if (cen.correntes) for (let px = 260; px < W - 100; px += 300 + r() * 380) props.push({ tipo: 'corrente', x: px, y: -6, s: 0.6 + r() * 0.7, pend: true, ph: r() * 10 });
    const L = { idx: 0, w: W, sup, esc: [], props, pilares: [], cen, zonas: [], arestas: null, rotas: new Map(), tutorial: true };
    construirArestas(L);
    return L;
  };

  /* ---------- lugares (v1.16) ---------- */
  function pilaresDe(sup, lista) {
    const pilares = [];
    for (const s of lista) {
      const larg = s.x1 - s.x0, xs = larg < 230 ? [(s.x0 + s.x1) / 2] : [s.x0 + larg * 0.2, s.x1 - larg * 0.2];
      for (const px of xs) {
        const abaixo = nivel.sobre({ sup }, px, s.y + 4);
        if (abaixo) pilares.push({ x: Math.round(px), y0: s.y + 40, y1: abaixo.y + 4, sy: s.y, alta: !!s.alto });
      }
    }
    return pilares;
  }
  /* Vila de Alvorada: três andares. No chão o portão do treino, o Lanterneiro, o grande lampião, o Trocador e o Santuário;
     no segundo andar a Costureira e o Ferreiro; no alto a Zeladora das Radiantes (sobe-se pulando do segundo andar). */
  nivel.gerarVila = function (def) {
    const W = 2000, r = LV.rng(def.seed || 91);
    const A = { id: 1, x0: 800, x1: 1500, y: G - 118, tipo: 'laje', torre: true };
    const C = { id: 2, x0: 1040, x1: 1260, y: A.y - 104, tipo: 'laje', torre: true, alto: true };
    const sup = [{ id: 0, x0: 0, x1: W, y: G, tipo: 'chao' }, A, C];
    const run = (G - A.y) * LV.PECAS.escada.inclinacao;
    const esc = [{ id: 0, xb: Math.round(A.x0 - run), yb: G, xt: A.x0, yt: A.y, de: 0, para: 1, dir: 1 }];
    const npcs = [
      { id: 'portao', x: 110, sup: 0, estr: 'vila/portao', eh: 170 },
      { id: 'pavio', x: 370, sup: 0, img: 'vila/npc_pavio', h: 74, estr: 'vila/barraca_pavio', eh: 150, ex: -34 },
      { id: 'agulha', x: 905, sup: 1, img: 'vila/npc_agulha', h: 72, estr: 'vila/barraca_agulha', eh: 140, ex: -30 },
      { id: 'iris', x: 1150, sup: 2, img: 'vila/npc_iris', h: 74, estr: 'vila/altar_iris', eh: 96, ex: 40 },
      { id: 'bigorna', x: 1410, sup: 1, img: 'vila/npc_bigorna', h: 76, estr: 'vila/forja_bigorna', eh: 130, ex: 34 },
      { id: 'escambo', x: 1660, sup: 0, img: 'vila/npc_escambo', h: 72, estr: 'vila/barraca_escambo', eh: 140, ex: 36 },
      { id: 'santuario', x: 1880, sup: 0, estr: 'vila/santuario', eh: 230 },
    ].map((n) => Object.assign(n, { y: sup[n.sup].y }));
    const deco = [{ img: 'vila/lampiao', x: 580, y: G + 2, h: 250, luz: true }];
    const props = [];
    for (let px = 250; px < W - 100; px += 260 + r() * 200) {
      const livre = Math.abs(px - 580) > 90 && npcs.every((n) => n.sup || Math.abs(n.x - px) > 120) && (px < esc[0].xb - 30 || px > A.x0 + 30);
      if (livre) props.push({ tipo: 'cogumelos', x: px, y: G + 2, s: 0.7 + r() * 0.3, flip: r() < 0.5, ph: r() * 10 });
    }
    const L = { idx: 1, w: W, sup, esc, props, pilares: pilaresDe(sup, [A, C]), cen: def.cen, zonas: [], arestas: null, rotas: new Map(), def, npcs, deco, entrada: 470,
      kit: LV.KITS && LV.KITS.vila ? 'vila' : 'fungos' };
    construirArestas(L);
    return L;
  };
  /* Campo de Treino: chão reto e três bonecos em fila */
  nivel.gerarTreino = function (def) {
    const W = 1500, r = LV.rng(def.seed || 97);
    const sup = [{ id: 0, x0: 0, x1: W, y: G, tipo: 'chao' }];
    const props = [];
    for (let px = 140; px < W - 100; px += 240 + r() * 200) if ((px < 820 || px > 1300) && Math.abs(px - 430) > 130) props.push({ tipo: def.cen.props[Math.floor(r() * def.cen.props.length)], x: px, y: G + 2, s: 0.8 + r() * 0.4, flip: r() < 0.5, ph: r() * 10 });
    const L = { idx: 0, w: W, sup, esc: [], props, pilares: [], cen: def.cen, zonas: [], arestas: null, rotas: new Map(), def, bonecos: [950, 1060, 1170], entrada: 780,
      deco: [{ img: 'treino/placa', x: 640, y: G + 2, h: 96 }],
      npcs: [{ id: 'portal', x: 430, y: G, sup: 0, estr: 'treino/portal', eh: 210 }] };
    construirArestas(L);
    return L;
  };

  /* ---------- consultas ---------- */
  nivel.sobre = function (L, x, y) {
    let best = null;
    for (const s of L.sup) if (x >= s.x0 && x <= s.x1 && s.y >= y - 0.5 && (!best || s.y < best.y)) best = s;
    return best;
  };
  nivel.pousar = function (L, x, y0, y1, ign) {
    let best = null;
    for (const s of L.sup) {
      if (s.id === ign || x < s.x0 || x > s.x1) continue;
      if (y0 <= s.y + 1 && y1 >= s.y && (!best || s.y < best.y)) best = s;
    }
    return best;
  };
  nivel.chaoSob = function (L, x, y) { const s = nivel.sobre(L, x, y); return s ? s.y : G; };

  function construirArestas(L) {
    const A = L.sup.map(() => []);
    L.esc.forEach((e) => {
      A[e.de].push({ para: e.para, tipo: 'escada', x: e.xb, esc: e, subir: true });
      A[e.para].push({ para: e.de, tipo: 'escada', x: e.xt, esc: e, subir: false });
    });
    L.sup.forEach((s) => {
      if (!s.id) return;
      for (const lado of [-1, 1]) {
        const ex = lado < 0 ? s.x0 - 10 : s.x1 + 10;
        if (ex < 10 || ex > L.w - 10) continue;
        const ab = nivel.sobre(L, ex, s.y + 2);
        if (ab) A[s.id].push({ para: ab.id, tipo: 'cair', x: lado < 0 ? s.x0 + 3 : s.x1 - 3, dir: lado });
      }
    });
    L.sup.forEach((a) => L.sup.forEach((b) => {
      if (a === b || b.y >= a.y || a.y - b.y > 114) return;
      const o0 = Math.max(a.x0 + 6, b.x0 + 22), o1 = Math.min(a.x1 - 6, b.x1 - 22);
      if (o1 - o0 < 20) return;
      const mx = (o0 + o1) / 2;
      const meio = L.sup.some((c) => c !== a && c !== b && c.y < a.y && c.y > b.y && mx >= c.x0 - 20 && mx <= c.x1 + 20);
      if (!meio) A[a.id].push({ para: b.id, tipo: 'pular', x: mx, x0: o0, x1: o1 });
    }));
    // atravessar: de qualquer plataforma dá para descer direto para a superfície logo abaixo (como apertar S)
    L.sup.forEach((a) => {
      if (!a.id) return;
      const pontos = [];
      for (let x = a.x0 + 12; x <= a.x1 - 12; x += 8) {
        const b = L.sup.filter((c) => c !== a && c.y > a.y + 2 && x >= c.x0 + 8 && x <= c.x1 - 8).sort((p, q) => p.y - q.y)[0];
        pontos.push({ x, b: b ? b.id : 0 });
      }
      // agrupa trechos contínuos que caem na mesma superfície
      let ini = null;
      pontos.forEach((p, i) => {
        if (!ini || ini.b !== p.b) { if (ini) A[a.id].push({ para: ini.b, tipo: 'atravessar', x0: ini.x, x1: pontos[i - 1].x }); ini = p; }
        if (i === pontos.length - 1) A[a.id].push({ para: ini.b, tipo: 'atravessar', x0: ini.x, x1: p.x });
      });
    });
    L.arestas = A;
  }

  /* custo de uma passagem e onde se chega depois dela */
  const CUSTO = { escada: 1.25, cair: 18, pular: 30, atravessar: 34 };
  function pontoDeSaida(a, x) { return a.x0 != null ? clamp(x, a.x0, a.x1) : a.x; }
  function chegada(a, xs) {
    if (a.tipo === 'escada') return a.subir ? a.esc.xt : a.esc.xb;
    if (a.tipo === 'cair') return a.x + a.dir * 16;
    return xs;
  }
  function custoAresta(a) {
    if (a.tipo === 'escada') return Math.hypot(a.esc.xt - a.esc.xb, a.esc.yb - a.esc.yt) * CUSTO.escada;
    return CUSTO[a.tipo] || 20;
  }
  /* menor rota pela DISTÂNCIA percorrida (Dijkstra), considerando de onde se sai e aonde se quer chegar:
     andar até a borda e cair, atravessar a plataforma, pular ou usar a escada — o que for mais curto */
  nivel.rota = function (L, de, para, xIni, xFim) {
    if (de === para || de < 0 || para < 0) return [];
    if (xIni == null) xIni = (L.sup[de].x0 + L.sup[de].x1) / 2;
    if (xFim == null) xFim = (L.sup[para].x0 + L.sup[para].x1) / 2;
    const k = de + ':' + para + ':' + Math.round(xIni / 40) + ':' + Math.round(xFim / 40);
    if (L.rotas.has(k)) return L.rotas.get(k);
    if (L.rotas.size > 600) L.rotas.clear();
    const abertos = [{ sup: de, x: xIni, c: 0, ant: null, a: null }];
    const visto = new Map();
    let melhor = null, melhorC = Infinity;
    while (abertos.length) {
      let bi = 0;
      for (let i = 1; i < abertos.length; i++) if (abertos[i].c < abertos[bi].c) bi = i;
      const u = abertos.splice(bi, 1)[0];
      if (u.c >= melhorC) break;
      const chave = u.sup + ':' + Math.round(u.x / 12);
      if (visto.has(chave) && visto.get(chave) <= u.c) continue;
      visto.set(chave, u.c);
      if (u.sup === para) { const tot = u.c + Math.abs(u.x - xFim); if (tot < melhorC) { melhorC = tot; melhor = u; } continue; }
      for (const a of L.arestas[u.sup]) {
        const xs = pontoDeSaida(a, u.x);
        abertos.push({ sup: a.para, x: chegada(a, xs), c: u.c + Math.abs(u.x - xs) + custoAresta(a), ant: u, a });
      }
    }
    let r = null;
    if (melhor) { r = []; for (let v = melhor; v.ant; v = v.ant) r.unshift(v.a); }
    L.rotas.set(k, r);
    return r;
  };

  /* ---------- física de quem anda ---------- */
  nivel.mover = function (L, e, vx, dt) {
    if (e.esc) {
      const s = e.esc, run = Math.abs(s.xt - s.xb) || 1;
      e.et += (vx * dt * s.dir) / run;
      if (e.et >= 1) { e.esc = null; e.sup = s.para; e.x = s.xt; e.y = L.sup[s.para].y; }
      else if (e.et <= 0) { e.esc = null; e.sup = s.de; e.x = s.xb; e.y = L.sup[s.de].y; }
      else { e.x = s.xb + (s.xt - s.xb) * e.et; e.y = s.yb + (s.yt - s.yb) * e.et; }
      return;
    }
    if (e.ignT > 0) { e.ignT -= dt; if (e.ignT <= 0) e.ign = -1; }
    if (e.sup >= 0) {
      const p = L.sup[e.sup];
      e.x += vx * dt;
      if (p.id === 0) { e.x = clamp(e.x, 20, L.w - 20); e.y = p.y; }
      else if (e.x < p.x0 - 2 || e.x > p.x1 + 2) { e.sup = -1; e.vy = 40; e.ign = p.id; e.ignT = 0.1; }
      else e.y = p.y;
    } else {
      e.vy = Math.min((e.vy || 0) + nivel.GRAV * dt, 950);
      const y0 = e.y;
      e.y += e.vy * dt;
      e.x = clamp(e.x + vx * dt, 20, L.w - 20);
      if (e.vy >= 0) {
        const s = nivel.pousar(L, e.x, y0, e.y, e.ign);
        // caindo de um pulo do jogador: a escada segura se a linha dela for cruzada antes do chão
        const esc = e.pegaEscada ? nivel.escadaCruzada(L, e.x, y0, e.y) : null;
        if (esc && (!s || esc.y <= s.y)) {
          e.esc = esc.s; e.et = esc.t; e.sup = -1; e.vy = 0; e.ign = -1; e.pegaEscada = false;
          e.x = esc.s.xb + (esc.s.xt - esc.s.xb) * esc.t; e.y = esc.y;
          e.escVx = esc.s.dir * 110;          // a IA (caçada automática) segue subindo
        } else if (s) { e.sup = s.id; e.y = s.y; e.vy = 0; e.ign = -1; e.pegaEscada = false; }
      }
    }
  };
  /* escada cuja linha foi cruzada de cima para baixo entre y0 e y1 na posição x (longe das pontas) */
  nivel.escadaCruzada = function (L, x, y0, y1) {
    let melhor = null;
    for (const s of L.esc) {
      const xa = Math.min(s.xb, s.xt), xb = Math.max(s.xb, s.xt);
      if (x < xa + 6 || x > xb - 6) continue;
      const t = (x - s.xb) / ((s.xt - s.xb) || 1), ys = s.yb + (s.yt - s.yb) * t;
      if (y0 <= ys + 1 && y1 >= ys && (!melhor || ys < melhor.y)) melhor = { s, t: clamp(t, 0.02, 0.98), y: ys };
    }
    return melhor;
  };
  nivel.pular = function (e, v) {
    if (e.sup < 0 && !e.esc) return false;
    e.esc = null; e.sup = -1; e.ign = -1; e.vy = -(v || nivel.PULO_V);
    return true;
  };
  nivel.descer = function (e) {
    if (e.sup <= 0 || e.esc) return false;
    e.ign = e.sup; e.ignT = 0.35; e.sup = -1; e.vy = 60; e.pegaEscada = false;   // descendo, a escada não segura
    return true;
  };
  nivel.escadaPerto = function (L, e, subir) {
    if (e.sup < 0) return null;
    for (const s of L.esc) {
      if (subir && s.de === e.sup && Math.abs(e.x - s.xb) < 26) return s;
      if (!subir && s.para === e.sup && Math.abs(e.x - s.xt) < 26) return s;
    }
    return null;
  };
  nivel.entrarEscada = function (e, s, deBaixo) {
    e.esc = s; e.et = deBaixo ? 0.002 : 0.998; e.sup = -1;
    e.x = s.xb + (s.xt - s.xb) * e.et; e.y = s.yb + (s.yt - s.yb) * e.et;
  };

  /* ---------- desenho das peças ---------- */
  nivel.desenhar = function (c, L, cam, vw, t) {
    const spr = LV.spr, art = LV.art, D = L.def || LV.MAPS[L.idx], P = D.pal, tinta = L.cen.tinta;
    const vis = (x0, x1) => x1 > cam - 60 && x0 < cam + vw + 60;
    const kit = L.kit || D.tema, K = LV.KITS && LV.KITS[kit], KD = LV.KIT_DESENHO;
    const peca = (n) => spr.tingida('kits/' + kit + '/' + n, tinta, 0.08);
    const kitOk = K && ['pe', 'pm', 'pd', 'ct', 'cm', 'cb'].every((n) => spr.get('kits/' + kit + '/' + n));
    if (kitOk) {
      for (const p of L.pilares) if (vis(p.x - 60, p.x + 60)) {
        const alt = p.alta ? KD.plat.altaAlt : KD.plat.alt;
        spr.colunaModular(c, [peca('ct'), peca('cm'), peca('cb')], p.x, p.sy + alt * (1 - K.plat.topo) * 0.45, p.y1, K.col, KD.col.larg);
      }
    } else {
      const pilar = spr.tingida('pecas/pilar', tinta, 0.25);
      if (pilar) for (const p of L.pilares) if (vis(p.x - 30, p.x + 30)) c.drawImage(pilar, p.x - 19, p.y0, 38, p.y1 - p.y0);
    }
    const corr = spr.get('pecas/corrente');
    for (const p of L.props) {
      if (!p.pend || !corr || !vis(p.x - 30, p.x + 30)) continue;
      const h = LV.PECAS.corrente.alt * p.s, w = (corr.naturalWidth / corr.naturalHeight) * h;
      const sw = Math.sin(t * 0.9 + p.ph) * 0.03;
      c.save(); c.translate(p.x, p.y); c.rotate(sw);
      c.drawImage(corr, -w / 2, 0, w, h);
      art.glow(c, 0, h * 0.9, 34 * p.s, P.luz, 0.4 + 0.15 * Math.sin(t * 7 + p.ph));
      c.restore();
    }
    const esc = spr.tingida('pecas/escada', tinta, 0.22);
    if (esc) {
      const pe = LV.PECAS.escada, iw = esc.width, ih = esc.height;
      for (const s of L.esc) {
        if (!vis(Math.min(s.xb, s.xt), Math.max(s.xb, s.xt))) continue;
        const sy = (s.yb - s.yt) / ((1 - pe.topoY) * ih), dw = iw * sy, dh = ih * sy;
        c.save();
        c.translate(s.xt, 0);
        c.scale(s.dir, 1);
        c.drawImage(esc, -pe.topoX * dw, s.yb - dh + 3, dw, dh);
        c.restore();
      }
    }
    for (const s of L.sup) {
      if (!s.id || !vis(s.x0, s.x1)) continue;
      if (kitOk) { spr.platModular(c, [peca('pe'), peca('pm'), peca('pd')], s.x0 - 8, s.x1 + 8, s.y, K.plat, s.alto ? KD.plat.altaAlt : KD.plat.alt); continue; }
      const pc = LV.PECAS[s.tipo];
      spr.plataforma(c, spr.tingida('pecas/' + s.tipo, tinta, 0.2), s.x0 - 6, s.x1 + 6, s.y, pc);
    }
    // ninhos: sem marcação no cenário (o montinho de pedras com brilho foi tirado por não combinar com a arte)
    for (const p of L.props) {
      if (p.pend || !vis(p.x - 60, p.x + 60)) continue;
      const im = spr.get('pecas/' + p.tipo);
      if (!im) continue;
      const pc = LV.PECAS[p.tipo];
      const h = pc.alt * p.s, w = (im.naturalWidth / im.naturalHeight) * h;
      c.save(); c.translate(p.x, p.y); if (p.flip) c.scale(-1, 1);
      c.drawImage(im, -w / 2, -h, w, h);
      c.restore();
      const pul = 0.75 + 0.25 * Math.sin(t * 2.2 + p.ph);
      if (p.tipo === 'poste') art.glow(c, p.x + (p.flip ? -1 : 1) * w * 0.3, p.y - h * 0.62, 70 * p.s, '#ffc47a', 0.42 * pul);
      else if (p.tipo === 'cogumelos') art.glow(c, p.x, p.y - h * 0.5, 46 * p.s, '#ff7a5a', 0.3 * pul);
      else if (p.tipo === 'cristais') art.glow(c, p.x, p.y - h * 0.5, 50 * p.s, P.acento, 0.35 * pul);
    }
  };
})();
