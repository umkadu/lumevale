'use strict';
/* Lumevale — motor: estado, simulação em fases de vários andares, combate, captura, chefes e renderização. */
(function () {
  const LV = window.LV, F = LV.F, G = LV.GROUND, art = LV.art, TAU = LV.TAU;
  const N = () => LV.nivel, SPR = () => LV.spr;
  const game = (LV.game = {
    input: { dir: 0, pular: false, subir: false, descer: false }, scale: 1, viewW: 960, viewH: 540, bgScale: 1,
    pausado: false, silencioso: false, S: null, W: null,
  });
  let S = null, W = null;
  const FORM = [46, -40, 80, -74, 110];
  const RAIO_PET = 200;           // pets só atacam o que está perto do herói
  const som = (k) => { if (!game.silencioso && LV.audio) LV.audio.tocar(k); };
  const cfg = () => LV.config || {};
  game.avisos = new Set();
  const VEL_HEROI = 165, VEL_AUTO = 130, ALC_HEROI = 210;
  function emit(ev, d) { if (!game.silencioso) LV.emit(ev, d); }

  /* =================== ESTADO =================== */
  function novoMeta() {
    return {
      ecos: 0, ecosTotal: 0, renasc: 0, recorde: 1, up: Object.fromEntries(LV.META.map((u) => [u.id, 0])),
      best: {},                                  // bestiário: id -> { v: vista, k: derrotadas, c: capturadas }
      tot: { kills: 0, capt: 0, evo: 0 },        // totais de todas as jornadas
      conq: {},                                  // conquistas: 1 = pronta para resgatar, 2 = resgatada
      autoAttr: [],                              // atributos que recebem os pontos sozinhos ao subir de nível (fixos)
      autoVagas: 0,                              // vagas de automação já pagas (continuam após redefinir)
      diario: [],                                // páginas do Diário de Candeia já encontradas (uma por Guardião)
      finalVisto: false,                         // o final (Coração Ígneo vencido) já foi mostrado
    };
  }
  function novoEstado() {
    return {
      v: 3, criado: Date.now(), salvoEm: Date.now(),
      dom: { nome: LV.t('Viajante'), nivel: 1, xp: 0, pontos: 0, attr: { forca: 0, vigor: 0, sorte: 0, vinculo: 0 } },
      lumes: 0, mats: { musgo: 0, esporo: 0, escama: 0, cristal: 0, brasa: 0 }, lanternas: 5,
      moedas: Object.fromEntries(LV.MOEDAS.map((m) => [m.id, 0])),
      up: Object.fromEntries(LV.UPGRADES.map((u) => [u.id, 0])),
      pets: [], ativos: [], prox: 1,
      mapa: 0, mapas: LV.MAPS.map((m, i) => ({ kills: 0, chefe: false, liberado: i === 0, vitorias: 0, reserva: 0 })),
      op: { auto: false, vel: 1, deus: false, modoPets: 'agressivo' },
      st: { kills: 0, capturas: 0, evolucoes: 0, chefes: 0, tempo: 0, taxa: 0 },
      meta: novoMeta(),       // sobrevive aos renascimentos
      avisados: [],           // "uid:estágio" dos pets cuja evolução já foi anunciada
      inicial: false,
    };
  }
  const intOr = (v, d, a, b) => { v = Math.floor(+v); if (!isFinite(v)) v = d; return LV.clamp(v, a, b); };
  const numOr = (v, d, a, b) => { v = +v; if (!isFinite(v)) v = d; return LV.clamp(v, a, b); };

  function normalizar(s) {
    const d = novoEstado();
    if (!s || typeof s !== 'object') return d;
    const o = d;
    o.criado = numOr(s.criado, d.criado, 0, 9e15);
    o.salvoEm = numOr(s.salvoEm, d.salvoEm, 0, 9e15);
    const sd = s.dom || {};
    o.dom.nome = typeof sd.nome === 'string' && sd.nome.trim() ? sd.nome.trim().slice(0, 24) : LV.t('Viajante');
    o.dom.nivel = intOr(sd.nivel, 1, 1, 999);
    o.dom.xp = numOr(sd.xp, 0, 0, 1e300);
    o.dom.pontos = intOr(sd.pontos, 0, 0, 1e7);
    LV.ATTR.forEach((a) => { o.dom.attr[a.id] = intOr((sd.attr || {})[a.id], 0, 0, 1e7); });
    o.lumes = numOr(s.lumes, 0, 0, 1e300);
    o.lanternas = intOr(s.lanternas, 5, 0, 1e7);
    Object.keys(o.mats).forEach((k) => { o.mats[k] = intOr((s.mats || {})[k], 0, 0, 1e12); });
    Object.keys(o.moedas).forEach((k) => { o.moedas[k] = intOr((s.moedas || {})[k], 0, 0, 1e9); });
    LV.UPGRADES.forEach((u) => { o.up[u.id] = intOr((s.up || {})[u.id], 0, 0, u.max); });
    const sm = s.meta || {};
    o.meta.ecos = intOr(sm.ecos, 0, 0, 1e12);
    o.meta.ecosTotal = intOr(sm.ecosTotal, 0, 0, 1e12);
    o.meta.renasc = intOr(sm.renasc, 0, 0, 1e9);
    o.meta.recorde = intOr(sm.recorde, 1, 1, 999);
    LV.META.forEach((u) => { o.meta.up[u.id] = intOr((sm.up || {})[u.id], 0, 0, u.max); });
    const sb = sm.best && typeof sm.best === 'object' ? sm.best : {};
    LV.CHAVES_BEST.forEach((id) => {
      const x = sb[id];
      if (x) o.meta.best[id] = { v: !!x.v, k: intOr(x.k, 0, 0, 1e12), c: intOr(x.c, 0, 0, 1e9) };
    });
    // saves de antes das formas no bestiário: espécie já vista = forma inicial vista
    for (const sp in LV.SPECIES) { const b = o.meta.best[sp]; if (b && b.v && !o.meta.best[sp + '_0']) o.meta.best[sp + '_0'] = { v: true, k: 0, c: 0 }; }
    const st0 = s.st || {}, tt = sm.tot || {};
    // saves de antes do bestiário: os totais começam pelos números desta jornada
    o.meta.tot = { kills: intOr(tt.kills, intOr(st0.kills, 0, 0, 1e12), 0, 1e12), capt: intOr(tt.capt, intOr(st0.capturas, 0, 0, 1e9), 0, 1e9), evo: intOr(tt.evo, intOr(st0.evolucoes, 0, 0, 1e9), 0, 1e9) };
    const sq = sm.conq && typeof sm.conq === 'object' ? sm.conq : {};
    LV.CONQUISTAS.forEach((c) => { const v = intOr(sq[c.id], 0, 0, 2); if (v) o.meta.conq[c.id] = v; });
    const ids = LV.ATTR.map((a) => a.id);
    o.meta.autoAttr = [...new Set(Array.isArray(sm.autoAttr) ? sm.autoAttr : [])].filter((a) => ids.includes(a)).slice(0, LV.AUTO_ATTR_CUSTO.length);
    o.meta.autoVagas = intOr(sm.autoVagas, o.meta.autoAttr.length, o.meta.autoAttr.length, LV.AUTO_ATTR_CUSTO.length);
    o.dom.autoN = intOr(sd.autoN, 0, 0, 1e9);
    const vistos = new Set();
    let mx = 0;
    o.pets = (Array.isArray(s.pets) ? s.pets : []).filter((p) => p && LV.SPECIES[p.sp]).map((p) => {
      let uid = intOr(p.uid, 0, 0, 1e9);
      if (!uid || vistos.has(uid)) uid = 0; else vistos.add(uid);
      mx = Math.max(mx, uid);
      const b = p.bonus && LV.TALENTOS[p.bonus.t] ? { t: p.bonus.t, v: numOr(p.bonus.v, 0.1, 0.01, 0.5) } : null;
      return { uid, sp: p.sp, nivel: intOr(p.nivel, 1, 1, 999), xp: numOr(p.xp, 0, 0, 1e300), est: intOr(p.est, 0, 0, 2), hab: intOr(p.hab, 1, 1, LV.HAB_MAX || 10), bonus: b, especial: !!p.especial, apelido: typeof p.apelido === 'string' && p.apelido.trim() ? p.apelido.trim().slice(0, 20) : null };
    });
    o.pets.forEach((p) => { if (!p.uid) p.uid = ++mx; });
    o.prox = Math.max(intOr(s.prox, 1, 1, 1e9), mx + 1);
    o.ativos = [...new Set(Array.isArray(s.ativos) ? s.ativos : [])].filter((u) => o.pets.some((p) => p.uid === u)).slice(0, 3 + o.up.laco + o.meta.up.vinculo);
    if (!o.ativos.length && o.pets.length) o.ativos = [o.pets[0].uid];
    o.mapas = LV.MAPS.map((m, i) => {
      const x = (s.mapas || [])[i] || {};
      return { kills: intOr(x.kills, 0, 0, 1e12), chefe: !!x.chefe, liberado: i === 0 || !!x.liberado,
        vitorias: intOr(x.vitorias, x.chefe ? 1 : 0, 0, 1e6), reserva: numOr(x.reserva, 0, 0, 1e9) };
    });
    // abates acima da meta (saves antigos contavam sem limite) viram reserva de 10%
    o.mapas.forEach((m, i) => {
      const base = LV.MAPS[i].killsChefe, meta = base;
      if (m.kills > meta) { m.reserva += (m.kills - meta) * 0.1; m.kills = meta; }
    });
    // saves de antes das moedas: cada Guardião já vencido rende as moedas da primeira vitória
    if ((+s.v || 0) < 3) o.mapas.forEach((m, i) => { if (m.chefe) o.moedas[LV.MOEDAS[i].id] += LV.moedasChefe(i, true); });
    // saves de antes do bestiário: já conhecem as espécies que têm e os Guardiões que venceram
    if (!sm.best) {
      const ver = (id) => { o.meta.best[id] = o.meta.best[id] || { v: true, k: 0, c: 0 }; o.meta.best[id].v = true; return o.meta.best[id]; };
      o.pets.forEach((p) => { ver(p.sp); ver(p.sp + '_' + p.est); });
      o.mapas.forEach((m, i) => { if (m.chefe) { const b = ver('chefe' + i); b.k = Math.max(b.k, 1); } });
    }
    o.mapa = intOr(s.mapa, 0, 0, LV.MAPS.length - 1);
    if (!o.mapas[o.mapa].liberado) o.mapa = 0;
    const op = s.op || {};
    o.op = { auto: !!op.auto, vel: numOr(op.vel, 1, 0.25, 10), deus: !!op.deus, modoPets: LV.MODOS[op.modoPets] ? op.modoPets : 'agressivo' };
    if (!autoLiberadaEm(o)) o.op.auto = false;
    const st = s.st || {};
    Object.keys(o.st).forEach((k) => { o.st[k] = numOr(st[k], 0, 0, 1e15); });
    o.inicial = !!s.inicial || o.pets.length > 0;
    o.aguardaInicial = o.inicial && !o.pets.length;
    o.avisados = Array.isArray(s.avisados) ? s.avisados.filter((k) => typeof k === 'string').slice(-400) : [];
    // saves antigos: quem já está pronto para evoluir (e portanto já foi avisado) não recebe o aviso de novo
    if (!Array.isArray(s.avisados)) o.pets.forEach((p) => {
      const q = LV.evoReq(p.sp, p.est);
      if (q && p.nivel >= q.nivel && o.lumes >= q.lumes && Object.keys(q.mats).every((m) => (o.mats[m] || 0) >= q.mats[m])) o.avisados.push(p.uid + ':' + p.est);
    });
    // história: páginas do diário guardadas para sempre; saves antigos ganham as dos Guardiões já vencidos
    const smh = s.meta || {};
    o.meta.diario = [...new Set((Array.isArray(smh.diario) ? smh.diario : []).map((i) => intOr(i, -1, -1, LV.MAPS.length - 1)).filter((i) => i >= 0))];
    o.mapas.forEach((m, i) => { if (m.chefe && !o.meta.diario.includes(i)) o.meta.diario.push(i); });
    o.meta.diario.sort((a, b) => a - b);
    o.meta.finalVisto = !!smh.finalVisto;
    return o;
  }
  game.novoEstado = novoEstado;
  game.normalizar = normalizar;

  /* =================== ATRIBUTOS DERIVADOS =================== */
  const MU = (id) => (S.meta && S.meta.up[id]) || 0;     // nível de uma melhoria do Santuário
  const slots = () => 3 + (S.up.laco || 0) + MU('vinculo');
  /* caçada automática: liberada ao chegar no mapa 2 ou pelo Santuário */
  function autoLiberadaEm(s) { return !!(s.mapas[1] && s.mapas[1].liberado) || ((s.meta && s.meta.up.trilha) || 0) > 0; }
  game.autoLiberada = () => !!S && autoLiberadaEm(S);
  function multDano() { return (1 + 0.12 * S.up.garras) * (1 + 0.03 * S.dom.attr.forca) * (1 + 0.01 * (S.dom.nivel - 1)) * (1 + 0.08 * MU('ancestral')); }
  function multVida() { return (1 + 0.12 * S.up.carapaca) * (1 + 0.04 * S.dom.attr.vigor) * (1 + 0.01 * (S.dom.nivel - 1)) * (1 + 0.08 * MU('ancestral')); }
  function multVel() { return (1 + 0.05 * S.up.ritmo) * (1 + 0.01 * S.dom.attr.vinculo); }
  function petStats(p) {
    const sp = LV.SPECIES[p.sp], b = sp.base, em = F.estagioMult[p.est];
    const bn = p.bonus || {}, R = p.especial ? LV.RADIANTE : { hp: 1, atk: 1, spd: 1 }, tal = (t) => (bn.t === t ? 1 + bn.v : 1) * R[t];
    return {
      hp: Math.round(b.hp * (1 + 0.11 * (p.nivel - 1)) * em * multVida() * tal('hp')),
      atk: Math.round(b.atk * (1 + 0.1 * (p.nivel - 1)) * em * multDano() * tal('atk')),
      spd: +(b.spd * multVel() * (1 + 0.06 * p.est) * tal('spd')).toFixed(2),
      alc: b.alc + p.est * 10, estilo: b.estilo,
    };
  }
  function domStats() {
    const a = S.dom.attr, L = S.dom.nivel, mestre = 1 + 0.1 * MU('mestre');
    return {
      hp: Math.round((100 + L * 14) * (1 + 0.04 * a.vigor)),
      atk: Math.round((6 + L * 2.4) * (1 + 0.03 * a.forca) * (1 + 0.05 * S.up.garras)),
      crit: Math.min(0.6, 0.05 + a.sorte * 0.004),
      sorteCap: a.sorte * 0.015 + 0.08 * MU('lanterneiro'),
      coleta: (1 + 0.08 * S.up.faro) * (1 + 0.02 * a.sorte),
      lumesMult: 1 + 0.06 * MU('heranca'),
      xp: (1 + 0.08 * S.up.sabedoria) * mestre,
      xpPet: (1 + 0.08 * S.up.sabedoria) * (1 + 0.03 * a.vinculo) * mestre,
      ima: 150 + 35 * S.up.ima,
      offlineH: 2 + S.up.descanso,
      moedasMult: 1 + 0.25 * MU('fortuna'),
    };
  }
  game.slots = () => slots();
  game.petStats = petStats;
  game.domStats = domStats;

  /* =================== MUNDO =================== */
  function iniciarMapa(idx) {
    idx = LV.clamp(idx | 0, 0, LV.MAPS.length - 1);
    S.mapa = idx;
    const def = LV.MAPS[idx], ds = domStats();
    const L = N().gerar(idx);
    W = game.W = {
      idx, def, L, w: L.w, t: 0, cam: 0, shake: 0,
      tam: { x: 200, y: G, vy: 0, sup: 0, esc: null, et: 0, ign: -1, ignT: 0, face: 1, hp: ds.hp, hpMax: ds.hp, cd: 1, mov: 0, manual: 0, alvoX: null, caido: 0, flash: 0, atk: 0, el: null, arVx: 0, escVx: 0, h: LV.HEROI.alt },
      pets: [], ini: [], proj: [], drops: [], fx: [], nums: [], parts: [], lant: [], areas: [],
      spawn: 0.6, chefe: null, killLog: [], seq: 1, taxaT: 0, amb: null, inicioReal: performance.now(),
      bg: art.criarFundo(idx, game.bgScale),
      zonas: L.zonas.map((z) => Object.assign({}, z, { recarga: LV.rand(0.5, 2) })),
    };
    game.captura = null;
    montarPets();
    W.zonas.forEach((z) => { for (let i = 0; i < z.cap; i++) spawnInimigo(z); });
    emit('mapa', idx);
    if (LV.audio) LV.audio.musica(def.tema);
  }
  game.reiniciarMapa = function () {
    if (!W) return;
    if (game.tutorial && game.tutorial.passo !== 'fim') { game.iniciarTutorial(game.tutorial.sp); return; }
    if (W.chefe) falharChefe('abandonou');
    iniciarMapa(W.idx);
  };
  game.rebuildBg = function () { if (W) W.bg = art.criarFundo(W.idx, game.bgScale); };

  function montarPets() {
    if (!W) return;
    const velhos = new Map((W.pets || []).map((p) => [p.uid, p]));
    W.pets = S.ativos.map((uid, i) => {
      const ref = S.pets.find((p) => p.uid === uid);
      if (!ref) return null;
      const st = petStats(ref), sp = LV.SPECIES[ref.sp];
      const prev = velhos.get(uid);
      const ratio = prev ? prev.hp / prev.hpMax : 1;
      const T = W.tam;
      const p = prev || { x: T.x - 40 - i * 30, y: sp.voa ? T.y - 64 : T.y, sup: sp.voa ? -1 : T.sup >= 0 ? T.sup : 0, cd: Math.random(), alvo: null, desm: 0, mov: 0, flash: 0, atkA: 0, face: 1, t0: Math.random() * 10, salto: null, saltoCd: 0 };
      Object.assign(p, { uid, ref, slot: i, corpo: sp.corpo, pal: sp.pal, voa: sp.voa, est: ref.est, el: sp.el, hpMax: st.hp, atk: st.atk, spd: st.spd, alc: st.alc, estilo: st.estilo, h: (sp.alt || [44, 60, 78])[ref.est], img: LV.imgPet(ref.sp, ref.est), flip: !!(sp.flipEst && sp.flipEst[ref.est]) });
      if (p.voa) p.sup = -1;
      p.hp = p.desm > 0 ? 0 : Math.max(1, Math.round(st.hp * ratio));
      return p;
    }).filter(Boolean);
  }
  game.atualizarEquipe = montarPets;

  const alvoValido = (e) => e.hp > 0 && e.nasc <= 0.2 && !e.capt && e.fuga == null;
  function dist2(a, b) { const dx = a.x - b.x, dy = alvoY(a) - alvoY(b); return Math.hypot(dx, dy); }
  function maisProximo(ref, lista, max, metrica) {
    let m = null, md = max == null ? Infinity : max;
    for (const e of lista) { const d = metrica ? metrica(e) : Math.abs(e.x - ref.x); if (d < md) { md = d; m = e; } }
    return m;
  }
  function escalaE(e) { return (e.s || 1) * (e.tipo === 'chefe' ? 1 : F.escala[e.est || 0]); }
  function alvoY(a) {
    if (a.voa) return a.y;
    return a.y - (a.h || 40) * 0.45;
  }
  function supDe(a) {
    if (a.voa || a.sup < 0 || a.sup == null) { const s = N().sobre(W.L, a.x, a.y - 2); return s ? s.id : 0; }
    return a.sup;
  }
  function aliados() {
    const a = W.pets.filter((p) => p.desm <= 0 && !p.salto);
    if (W.tam.caido <= 0) a.push(W.tam);
    return a;
  }
  /* cada criatura nasce no seu ninho (zona), com o nível do ninho */
  function spawnInimigo(z) {
    const def = W.def, lo = def.lv[0];
    const lv = LV.clamp(z.nv + LV.randi(-1, 1), lo, Math.max(lo, Math.min(def.lv[1], S.dom.nivel + 2)));
    const base = F.ini(lv);
    let e;
    if (z.tipo === 'selvagem') {
      const spId = z.sp, sp = LV.SPECIES[spId];
      let est = 0;
      if (lv >= 40) est = Math.random() < 0.3 ? 2 : Math.random() < 0.5 ? 1 : 0;
      else if (lv >= 18) est = Math.random() < 0.3 ? 1 : 0;
      const corpo = sp.base.estilo === 'investida';
      e = { tipo: 'selvagem', sp: spId, nome: sp.nome[est], el: sp.el, corpo: sp.corpo, pal: sp.pal, voa: sp.voa, est, alc: corpo ? 42 : 170, estilo: corpo ? 'investida' : 'projetil', hpMul: sp.base.hp / 70, atkMul: sp.base.atk / 13, img: LV.imgPet(spId, est), h: (sp.alt || [44, 60, 78])[est], flip: !!(sp.flipEst && sp.flipEst[est]) };
    } else {
      // o ninho tem um Breu principal, mas 40% das vezes nasce outro Breu do mesmo mapa
      const hid = z.hids && z.hids.length > 1 && Math.random() < 0.4 ? z.hids[Math.floor(Math.random() * z.hids.length)] : z.hid;
      const h = LV.HOSTIS[hid] || LV.HOSTIS[z.hid];
      const est = Math.min(2, W.idx >> 1);
      e = { tipo: 'hostil', hid, nome: h.nome, el: def.elHostil, corpo: h.corpo, pal: def.hostil, voa: h.voa, est, alc: h.alc, estilo: h.estilo, hpMul: h.hp || 1.1, atkMul: h.atk || 1.05, velMul: h.vel, img: h.img, flip: !!h.flip, h: (h.alt || 50) * (1 + 0.12 * est) };
    }
    const sup = W.L.sup[z.sup];
    // nasce no ninho, mas no ponto mais afastado dos vizinhos (melhor de 6 sorteios): grupo, sem amontoar
    const viz = W.ini.filter((o) => o.zona === z.id && o.hp > 0);
    let x = LV.rand(z.x0, z.x1), folga = -1;
    for (let k = 0; k < 6; k++) {
      const cx = LV.rand(z.x0, z.x1), d = viz.reduce((m, o) => Math.min(m, Math.abs(o.x - cx)), 999);
      if (d > folga) { folga = d; x = cx; }
    }
    const altVoo = LV.rand(45, 150);                                  // voadores em alturas diferentes
    const hp = Math.round(base.hp * e.hpMul * (1 + 0.25 * e.est));
    Object.assign(e, {
      id: W.seq++, lv, x, y: e.voa ? sup.y - altVoo : sup.y, altVoo, sup: e.voa ? -1 : sup.id, casa: sup.id, zona: z.id, hp, hpMax: hp,
      atk: Math.round(base.atk * e.atkMul * (1 + 0.15 * e.est)), cd: 1 + Math.random(), face: -1, mov: 0, flash: 0, atkA: 0,
      nasc: 0.6, vx: 0, wander: 0, s: 1, t0: Math.random() * 10, xp: base.xp * (1 + 0.2 * e.est), lumes: base.lumes, tentou: false,
    });
    W.ini.push(e);
    return e;
  }

  /* =================== CHEFES =================== */
  function desafiarChefe(forcar) {
    if (!W || W.chefe) return false;
    const m = S.mapas[W.idx];
    if (!forcar && m.kills < metaChefe(W.idx)) return false;
    W.ini.forEach((e) => { if (!e.capt) e.fuga = 0.5; });
    const c = W.def.chefe, lv = W.def.lv[1] + 2, base = F.ini(lv);
    let x = W.tam.x + 460;
    if (x > W.w - 160) x = W.tam.x - 460;
    const e = {
      tipo: 'chefe', mapa: W.idx, nome: c.nome, el: c.el, corpo: c.corpo, pal: c.pal, voa: !!c.voa, est: 2, s: c.s, alc: 100, estilo: 'chefe',
      id: W.seq++, lv, x: LV.clamp(x, 160, W.w - 160), y: c.voa ? G - 120 : G, sup: c.voa ? -1 : 0, casa: 0,
      hp: Math.round(base.hp * 16), atk: Math.round(base.atk * 2), img: c.img, flip: !!c.flip, h: c.alt || 200, canto: c.canto || null,
      cd: 2.2, face: -1, mov: 0, flash: 0, atkA: 0, nasc: 1.2, t0: 0, xp: base.xp * 15, lumes: base.lumes * 20, padrao: 0, carga: 0,
    };
    e.hpMax = e.hp;
    W.ini.push(e);
    W.chefe = { e, tempo: 60 };
    W.shake = 8;
    W.pets.forEach((p) => { if (p.desm > 0) { p.desm = 0; p.hp = Math.round(p.hpMax * 0.5); } });
    emit('toast', { t: c.nome + LV.t(' despertou!'), tipo: 'chefe' });
    emit('chefe', true);
    som('chefe');
    if (LV.audio) LV.audio.tensao(true);
    return true;
  }
  game.desafiarChefe = desafiarChefe;
  game.abandonarChefe = function () { if (W && W.chefe) falharChefe('abandonou'); };

  function vencerChefe(e) {
    const m = S.mapas[W.idx], primeira = !m.chefe;
    m.chefe = true; S.st.chefes++;
    // a meta é fixa; a reserva (10% dos abates que passaram da meta) já entra no contador da próxima invocação
    m.vitorias = (m.vitorias || 0) + 1;
    const novaMeta = metaChefe(W.idx), daReserva = Math.min(novaMeta, Math.floor(m.reserva || 0));
    m.kills = daReserva; m.reserva = Math.max(0, (m.reserva || 0) - daReserva);
    W.chefe = null; W.shake = 14; W.spawn = 3; e.dash = null; limparEfeitosChefe();
    // moedas temáticas do Guardião (a única fonte delas)
    const md = LV.MOEDAS[W.idx], qMoeda = Math.max(1, Math.round(LV.moedasChefe(W.idx, primeira) * domStats().moedasMult));
    S.moedas[md.id] = (S.moedas[md.id] || 0) + qMoeda;
    numero(e.x, topoDe(e) - 30, '+' + qMoeda + ' ' + LV.nomeQtd(md, qMoeda), 'mat', md.cor);
    let premio = null;
    if (primeira) {
      const pr = W.def.chefe.premio;
      premio = { uid: S.prox++, sp: pr.sp, nivel: Math.max(1, Math.min(W.def.lv[1], F.capPet(S.dom.nivel))), xp: 0, est: pr.est || 0, apelido: null };
      S.pets.push(premio);
      if (S.ativos.length < slots()) { S.ativos.push(premio.uid); montarPets(); }
      if (W.idx + 1 < LV.MAPS.length) S.mapas[W.idx + 1].liberado = true;
    }
    const prox = W.idx + 1 < LV.MAPS.length && S.mapas[W.idx + 1].liberado ? W.idx + 1 : null;
    const autoNova = primeira && W.idx === 0 && !MU('trilha');
    // história: cada Guardião revela uma página do Diário de Candeia; o último mostra o final uma vez
    const paginaNova = !S.meta.diario.includes(W.idx);
    if (paginaNova) { S.meta.diario.push(W.idx); S.meta.diario.sort((a, b) => a - b); }
    const final = W.idx === LV.MAPS.length - 1 && !S.meta.finalVisto;
    if (final) S.meta.finalVisto = true;
    emit('chefeVencido', { nome: e.nome, mapaIdx: W.idx, primeira, premio, proximoIdx: prox, proximo: prox != null ? LV.MAPS[prox].nome : null, moeda: md, qMoeda, autoNova, paginaNova, final });
    emit('chefe', false);
    som('brilho');
    if (LV.audio) LV.audio.tensao(false);
  }
  function falharChefe(motivo) {
    if (!W.chefe) return;
    const e = W.chefe.e;
    e.fuga = 0.8; e.dash = null; W.chefe = null; W.spawn = 2; limparEfeitosChefe();
    const txt = motivo === 'pets' ? LV.t('Todos os seus pets caíram. O desafio contra ') + e.nome + LV.t(' terminou.')
      : motivo === 'abandonou' ? LV.t('Você abandonou a batalha contra ') + e.nome + '.'
      : motivo === 'heroi' ? LV.t('Você caiu. ') + e.nome + LV.t(' venceu desta vez.')
      : LV.t('O tempo acabou. ') + e.nome + LV.t(' recuou para as sombras.');
    emit('toast', { t: txt, tipo: 'ruim' });
    emit('chefe', false);
    if (LV.audio) LV.audio.tensao(false);
  }

  /* =================== GUARDIÃO: META DE ABATES =================== */
  /* abates para chamar o Guardião: a meta do mapa, menos 2 por vitória nesta jornada (mínimo de 25% da meta) */
  function metaChefe(i) {
    const base = LV.MAPS[i].killsChefe, v = (S && S.mapas[i] && S.mapas[i].vitorias) || 0;
    return base;                              // meta fixa (antes caía 2 por vitória)
  }
  game.metaChefe = (i) => metaChefe(i == null ? S.mapa : i);
  /* abates contam até a meta; depois dela, 10% de cada abate vai para a reserva da próxima invocação */
  function somarAbates(i, n) {
    const m = S.mapas[i], falta = Math.max(0, metaChefe(i) - m.kills), a = Math.min(falta, n);
    m.kills += a;
    if (n > a) m.reserva = (m.reserva || 0) + (n - a) * 0.1;
  }

  /* =================== PROGRESSO =================== */
  function ganharXPDom(n) {
    const d = S.dom;
    d.xp += n;
    let up = 0;
    while (d.xp >= F.xpDom(d.nivel) && d.nivel < 999) { d.xp -= F.xpDom(d.nivel); d.nivel++; d.pontos += 3; up++; }
    // atributos automáticos (Santuário): os pontos novos vão sozinhos, revezando entre os atributos escolhidos
    const auto = (S.meta && S.meta.autoAttr) || [];
    if (up && auto.length) {
      for (let k = 0; k < up * 3 && d.pontos > 0; k++) { d.attr[auto[(d.autoN || 0) % auto.length]]++; d.autoN = (d.autoN || 0) + 1; d.pontos--; }
      emit('atributo');
    }
    if (up && S.meta) S.meta.recorde = Math.max(S.meta.recorde, d.nivel);
    if (up) {
      if (W) {
        const ds = domStats(); W.tam.hpMax = ds.hp; W.tam.hp = ds.hp;
        montarPets();
        fx({ tipo: 'anel', x: W.tam.x, y: W.tam.y - 30, r0: 10, r1: 90, cor: '#ffe3a3', vida: 0.9 });
      }
      emit('nivel', d.nivel);
      som('nivel');
    }
  }
  function ganharXPPet(p, n) {
    const cap = F.capPet(S.dom.nivel);
    if (p.nivel >= cap) { p.xp = Math.min(p.xp + n, F.xpPet(p.nivel) - 1); return; }
    p.xp += n;
    let up = 0;
    while (p.xp >= F.xpPet(p.nivel) && p.nivel < cap) { p.xp -= F.xpPet(p.nivel); p.nivel++; up++; }
    if (p.nivel >= cap) p.xp = Math.min(p.xp, F.xpPet(p.nivel) - 1);
    if (up) { montarPets(); emit('petNivel', p); }
  }
  /* avisa uma única vez quando TODOS os requisitos de evolução (nível, materiais e Lumes) estão cumpridos */
  function conferirEvolucoes() {
    if (!S) return;
    for (const p of S.pets) {
      const k = p.uid + ':' + p.est;
      // avisa só na PRIMEIRA vez que tudo fica pronto para esta forma; a marca fica no save e nunca é apagada
      if (!S.avisados.includes(k) && podeEvoluir(p).ok) { S.avisados.push(k); emit('podeEvoluir', p); }
    }
  }
  game.conferirEvolucoes = conferirEvolucoes;
  game.ganharXPDom = (n) => ganharXPDom(n);
  game.ganharXPPet = (p, n) => ganharXPPet(p, n);

  function podeEvoluir(p) {
    const req = LV.evoReq(p.sp, p.est);
    if (!req) return { ok: false, max: true };
    const falta = [];
    if (p.nivel < req.nivel) falta.push('nivel');
    for (const k in req.mats) if ((S.mats[k] || 0) < req.mats[k]) falta.push(k);
    if (S.lumes < req.lumes) falta.push('lumes');
    return { ok: !falta.length, req, falta };
  }
  game.podeEvoluir = podeEvoluir;

  /* =================== COMBATE =================== */
  function numero(x, y, txt, tipo, cor) {
    if (W.nums.length > 46) W.nums.shift();
    W.nums.push({ x: x + LV.rand(-6, 6), y, txt: String(txt), tipo, cor, t: 0, vida: tipo === 'lumes' || tipo === 'mat' ? 1.1 : tipo === 'hab' ? 1.5 : 0.85 });
  }
  function fx(o) { o.t = 0; W.fx.push(o); }
  function particula(o) { if (W.parts.length < 380) W.parts.push(o); }
  function explosao(x, y, cor, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = LV.rand(60, 240);
      particula({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 380, vida: LV.rand(0.4, 0.9), t: 0, r: LV.rand(1.5, 3.5), cor: i % 3 === 0 ? art.INK : cor, tipo: i % 3 === 0 ? 'lasca' : 'luz' });
    }
  }
  function faiscas(x, y, cor, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = LV.rand(40, 160);
      particula({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0, vida: LV.rand(0.2, 0.45), t: 0, r: LV.rand(1, 2.4), cor, tipo: 'luz' });
    }
  }
  function topoDe(e) { return e.voa ? e.y - e.h * 0.55 : e.y - e.h; }

  function dano(e, v, el, fonte) {
    if (!e || e.hp <= 0 || e.capt) return;
    const ds = domStats();
    const mult = (el ? LV.elemMult(el, e.el) : 1) * (e.vuln > 0 ? 1 + (e.vulnK || 0.25) : 1) * (1 + (game.buffs.dano[chaveDe(e)] || 0));
    const status = fonte === 'status';
    const crit = !status && Math.random() < ds.crit;
    const d = Math.max(1, Math.round(v * mult * (crit ? 1.8 : 1)));
    e.hp -= d; e.flash = status ? Math.max(e.flash, 0.35) : 1;
    if (!e.irritado && e.tipo === 'selvagem') { e.irritado = true; if (e.hp > 0) numero(e.x, topoDe(e) - 14, '!', 'txt', '#ff9a8a'); }
    numero(e.x + (status ? LV.rand(-10, 10) : 0), topoDe(e) + 8, d, status ? 'dot' : crit ? 'crit' : mult > 1 ? 'forte' : mult < 1 ? 'fraco' : 'n', el ? LV.EL[el].cor : null);
    if (!status && e.tipo !== 'chefe' && fonte && fonte.x != null) {
      e.x += Math.sign(e.x - fonte.x) * 5;
      if (e.sup >= 0) { const s = W.L.sup[e.sup]; e.x = LV.clamp(e.x, s.x0 + 8, s.x1 - 8); }
    }
    if (!status) faiscas(e.x, alvoY(e), el ? LV.EL[el].cor : '#ffe3a3', crit ? 10 : 5);
    if (e.tutorial) { e.hp = Math.max(e.hp, Math.ceil(e.hpMax * 0.08)); tutorialPasso(); return; }
    if (e.hp <= 0) matar(e);
  }
  function danoAliado(a, v, el, src) {
    if (!a || a.hp <= 0) return;
    if (S.op.deus) { a.flash = 0.4; return; }
    const defesa = src ? game.buffs.defesa[chaveDe(src)] || 0 : 0;      // couraças das conquistas
    const mult = (el && a.el ? LV.elemMult(el, a.el) : 1) * (a.reducao > 0 ? 1 - (a.reducaoK || 0.5) : 1) * (1 - defesa);
    let d = Math.max(1, Math.round(v * mult));
    if (a.escudo > 0) {
      const abs = Math.min(a.escudo, d);
      a.escudo -= abs; d -= abs;
      if (d <= 0) { numero(a.x, topoDe(a), LV.t('bloqueado'), 'escudo'); return; }
    }
    a.hp -= d; a.flash = 1;
    numero(a.x, topoDe(a), d, 'dano');
    if (a.hp <= 0) {
      a.hp = 0;
      som('desmaio');
      if (a === W.tam) {
        a.caido = 3.2;
        if (W.chefe) falharChefe('heroi');
        else emit('toast', { t: LV.t('Você desmaiou. Voltando ao início do mapa…'), tipo: 'ruim' });
      } else {
        a.desm = 10; a.alvo = null;
        emit('toast', { t: LV.nomePet(a.ref) + LV.t(' desmaiou e volta em 10 s'), tipo: 'ruim', curto: true });
      }
    }
  }
  function renascer() {
    const T = W.tam;
    Object.assign(T, { hp: T.hpMax, x: 200, y: G, sup: 0, esc: null, vy: 0, caido: 0, alvoX: null });
    W.ini = []; W.proj = []; W.lant = []; W.areas = []; W.cam = 0;
    W.zonas.forEach((z) => { z.recarga = LV.rand(1, 3); });
    W.pets.forEach((p) => { p.desm = 0; p.hp = p.hpMax; p.x = 160; p.y = p.voa ? G - 64 : G; p.sup = p.voa ? -1 : 0; p.salto = null; p.alvo = null; p.escudo = 0; });
    W.spawn = 2;
  }

  /* =================== BESTIÁRIO, CONQUISTAS E BUFFS =================== */
  /* chave da criatura no bestiário: espécie (selvagem), id do hostil ou "chefe<mapa>" */
  function chaveDe(e) { return e.tipo === 'selvagem' ? e.sp : e.tipo === 'hostil' ? e.hid : e.tipo === 'chefe' ? 'chefe' + (e.mapa != null ? e.mapa : W.idx) : null; }
  game.chaveDe = chaveDe;
  function contar(id, campo) {
    if (!id) return;
    const b = S.meta.best[id] || (S.meta.best[id] = { v: false, k: 0, c: 0 });
    if (!b.v) { b.v = true; emit('bestiario', id); }
    b[campo] = (b[campo] || 0) + 1;
  }
  /* criaturas que aparecem na tela entram no bestiário */
  function verCriaturas() {
    for (const e of W.ini) {
      if (e.nasc > 0.3 || e.x < W.cam - 20 || e.x > W.cam + game.viewW + 20) continue;
      for (const id of [chaveDe(e), formaDe(e)]) {
        if (!id) continue;
        const b = S.meta.best[id];
        if (!b || !b.v) { S.meta.best[id] = Object.assign(b || { k: 0, c: 0 }, { v: true }); emit('bestiario', id); }
      }
    }
    // toda forma que você tem (capturada, evoluída ou ganha) também conta como vista
    for (const p of S.pets) {
      const id = p.sp + '_' + p.est, b = S.meta.best[id];
      if (!b || !b.v) { S.meta.best[id] = Object.assign(b || { k: 0, c: 0 }, { v: true }); emit('bestiario', id); }
    }
  }
  /* chave da forma (só selvagens): "espécie_estágio" */
  function formaDe(e) { return e.tipo === 'selvagem' ? e.sp + '_' + (e.est || 0) : null; }
  /* buffs vindos das conquistas resgatadas: dano a mais contra uma criatura ou dano a menos vindo dela */
  game.buffs = { dano: {}, defesa: {} };
  function recalcularBuffs() {
    const b = { dano: {}, defesa: {} };
    if (S) LV.CONQUISTAS.forEach((c) => { if (S.meta.conq[c.id] === 2 && c.rec.buff) { const f = c.rec.buff; b[f.tipo][f.alvo] = (b[f.tipo][f.alvo] || 0) + f.v; } });
    game.buffs = b;
  }
  game.recalcularBuffs = recalcularBuffs;
  function conferirConquistas() {
    if (!S || !S.inicial) return;
    for (const c of LV.CONQUISTAS) {
      if (S.meta.conq[c.id]) continue;
      if (c.prog(S) >= c.meta) { S.meta.conq[c.id] = 1; emit('conquista', c); }
    }
  }
  game.conferirConquistas = conferirConquistas;
  game.conquistasProntas = () => (S ? LV.CONQUISTAS.filter((c) => S.meta.conq[c.id] === 1).length : 0);
  /* pet Radiante: recompensa especial com status aumentados */
  function darPetRadiante(sp) {
    const nivel = Math.max(5, Math.min(F.capPet(S.dom.nivel), S.dom.nivel));
    const pet = { uid: S.prox++, sp, nivel, xp: 0, est: 0, apelido: null, hab: 1, bonus: null, especial: true };
    S.pets.push(pet);
    if (S.ativos.length < slots()) { S.ativos.push(pet.uid); montarPets(); }
    return pet;
  }

  function matar(e) {
    e.hp = 0;
    contar(chaveDe(e), 'k'); contar(formaDe(e), 'k'); S.meta.tot.kills++;
    const ds = domStats();
    explosao(e.x, alvoY(e), e.pal.g, e.tipo === 'chefe' ? 70 : 16);
    fx({ tipo: 'anel', x: e.x, y: alvoY(e), r0: 6, r1: e.h * 0.7, cor: e.pal.g, vida: 0.45 });
    const xp = Math.round(e.xp);
    ganharXPDom(xp * ds.xp);
    W.pets.forEach((p) => { if (p.ref) ganharXPPet(p.ref, xp * ds.xpPet * (p.desm > 0 ? 0.5 : 1)); });
    const lum = Math.max(1, Math.round(e.lumes * ds.coleta * ds.lumesMult * LV.rand(0.85, 1.15)));
    const n = e.tipo === 'chefe' ? 12 : Math.min(4, 1 + Math.floor(lum / 15));
    for (let k = 0; k < n; k++) {
      const q = Math.floor(lum / n) + (k < lum % n ? 1 : 0);
      if (q > 0) W.drops.push({ x: e.x, y: alvoY(e), vx: LV.rand(-110, 110), vy: LV.rand(-340, -200), tipo: 'lumes', q, idade: 0, sup: -1 });
    }
    if (e.tipo === 'chefe' || Math.random() < 0.35 * (1 + S.dom.attr.sorte * 0.02)) {
      const q = e.tipo === 'chefe' ? 12 + W.idx * 5 : Math.max(1, Math.round(LV.randi(1, 2) * ds.coleta));
      W.drops.push({ x: e.x, y: alvoY(e), vx: LV.rand(-80, 80), vy: LV.rand(-360, -240), tipo: 'mat', mat: W.def.mat, q, idade: 0, sup: -1 });
    }
    for (let k = 0; k < (e.tipo === 'chefe' ? 12 : 3); k++) fx({ tipo: 'alma', x: e.x, y: alvoY(e), vx: LV.rand(-90, 90), vy: LV.rand(-160, -40), cor: e.pal.g, vida: 2.5 });
    S.st.kills++;
    W.killLog.push(performance.now());
    if (e.tipo === 'chefe') vencerChefe(e);
    else if (!W.chefe) somarAbates(W.idx, 1);
    W.pets.forEach((p) => { if (p.alvo === e) p.alvo = null; });
    if (W.foco === e) W.foco = null;           // pets voltam ao modo escolhido
    if (W.tam.foco === e) W.tam.foco = null;
  }
  /* inimigo que representa ameaça: o Guardião, quem está perseguindo o grupo ou quem atacou há pouco */
  const ameaca = (e) => e.tipo === 'chefe' || e.agrediu > 0 || !!e.persegue;
  /* alvos que os pets podem escolher sozinhos, conforme o modo de comando */
  function alvosDoModo(ini) {
    const m = S.op.modoPets;
    if (m === 'passivo') return [];
    if (m === 'defensor') return ini.filter(ameaca);
    return ini;
  }

  function atacarPet(p, e) {
    const dmg = p.atk * LV.rand(0.9, 1.1);
    p.atkA = 1;
    if (p.estilo === 'investida') {
      som('golpe');
      dano(e, dmg, p.el, p);
      fx({ tipo: 'corte', x: e.x - p.face * 4, y: alvoY(e), face: p.face, cor: p.pal.g, vida: 0.22 });
    } else {
      W.proj.push({ x: p.x + p.face * p.h * 0.3, y: alvoY(p), alvo: e, vel: p.estilo === 'pulso' ? 430 : 560, dmg, el: p.el, cor: p.pal.g, dono: 'pet', fonte: p, tipo: p.estilo, vida: 2.2 });
    }
  }

  /* =================== HABILIDADES ESPECIAIS =================== */
  function aplicarDot(e, dps, dur, el, cor) {
    if (!e || e.hp <= 0) return;
    e.dots = e.dots || [];
    const igual = e.dots.find((d) => d.el === el);
    if (igual) { igual.t = Math.max(igual.t, dur); igual.dps = Math.max(igual.dps, dps); }
    else e.dots.push({ dps, t: dur, tick: 0.5, el, cor });
  }
  const habNivel = (p) => (p.ref && p.ref.hab) || 1;
  const habRecarga = (p) => LV.habRecarga(p.ref.sp, habNivel(p));
  game.habRecarga = habRecarga;
  function anunciar(p, txt) { numero(p.x, topoDe(p) - 16, txt, 'hab', LV.EL[p.el].cor); }
  function curar(a, v) {
    if (!a || a.hp <= 0) return;
    const ganho = Math.min(a.hpMax - a.hp, Math.round(v));
    a.hp += ganho;
    if (ganho > 0) numero(a.x, topoDe(a) - 4, '+' + LV.fmt(ganho), 'cura');
    for (let k = 0; k < 6; k++) particula({ x: a.x + LV.rand(-14, 14), y: alvoY(a) + LV.rand(-6, 10), vx: LV.rand(-12, 12), vy: LV.rand(-70, -35), g: 0, vida: LV.rand(0.6, 1), t: 0, r: LV.rand(1.5, 2.6), cor: '#a8ff9a', tipo: 'luz' });
  }
  function tentarHabilidade(p, ini) {
    const h = LV.HAB[p.ref.sp], n = habNivel(p), T = W.tam;
    if (!h) return false;
    const perto = ini.filter((e) => dist2(e, T) < RAIO_PET + 70);
    const time = W.pets.filter((x) => x.desm <= 0).concat(T.caido > 0 ? [] : [T]);
    const alvoDe = () => (p.alvo && alvoValido(p.alvo) && perto.includes(p.alvo) ? p.alvo : maisProximo(p, perto, Infinity, (e) => dist2(e, p)));
    const cor = LV.EL[p.el].cor;
    switch (h.tipo) {
      case 'explosao': {
        const a = alvoDe(); if (!a) return false;
        const r = h.raio(n), x = a.x, y = alvoY(a);
        fx({ tipo: 'explosao', x, y, r, cor: '#ff9a52', vida: 0.6 });
        explosao(x, y, '#ffb35c', 24); W.shake = Math.max(W.shake, 5); som('impacto');
        perto.filter((e) => Math.hypot(e.x - x, alvoY(e) - y) < r).forEach((e) => { dano(e, p.atk * h.mult(n), p.el, p); aplicarDot(e, p.atk * 0.15, 3, 'brasa', '#ff8a3d'); });
        break;
      }
      case 'chuva': {
        if (!perto.length) return false;
        const alvos = perto.slice().sort(() => Math.random() - 0.5).slice(0, h.qtd(n));
        alvos.forEach((e, k) => W.proj.push({ x: e.x + LV.rand(-60, 60), y: alvoY(e) - 260 - k * 30, alvo: e, vel: 520, dmg: p.atk * h.mult(n), el: p.el, cor: '#ff8a4a', dono: 'pet', fonte: p, tipo: 'brasa', vida: 2.5, efeito: (x) => aplicarDot(x, p.atk * 0.12, 2, 'brasa', '#ff8a3d') }));
        som('lanterna');
        break;
      }
      case 'escudo': {
        if (!perto.length) return false;
        time.forEach((a) => { a.escudo = Math.round(a.hpMax * h.pct(n)); a.escudoT = 6; fx({ tipo: 'bolha', alvo: a, cor: '#7fe3ff', vida: 0.6 }); });
        som('brilho');
        break;
      }
      case 'pulso': {
        const r = 125;
        const alvos = ini.filter((e) => Math.hypot(e.x - p.x, alvoY(e) - alvoY(p)) < r);
        if (!alvos.length) return false;
        fx({ tipo: 'anel', x: p.x, y: alvoY(p), r0: 10, r1: r, cor: '#8ff6ff', vida: 0.5 });
        fx({ tipo: 'anel', x: p.x, y: alvoY(p), r0: 4, r1: r * 0.7, cor: '#ffffff', vida: 0.35 });
        alvos.forEach((e) => { dano(e, p.atk * h.mult(n), p.el, p); if (e.tipo !== 'chefe') e.atord = Math.max(e.atord || 0, h.atord(n)); else e.atord = Math.max(e.atord || 0, h.atord(n) * 0.35); });
        som('impacto');
        break;
      }
      case 'cura': {
        const feridos = time.filter((a) => a.hp < a.hpMax * 0.9);
        if (!feridos.length) return false;
        fx({ tipo: 'anel', x: p.x, y: alvoY(p), r0: 10, r1: 150, cor: '#a8ff9a', vida: 0.7 });
        time.forEach((a) => curar(a, a.hpMax * h.pct(n)));
        som('brilho');
        break;
      }
      case 'nuvem': {
        const a = alvoDe(); if (!a) return false;
        const y = a.voa ? N().chaoSob(W.L, a.x, a.y) : a.y;
        W.areas.push({ tipo: 'nuvem', x: a.x, y, r: 88, t: 4, dur: 4, tick: 0, dps: p.atk * h.dps(n), el: p.el, cor: '#d4ff7a' });
        som('escapou');
        break;
      }
      case 'provocar': {
        const alvos = ini.filter((e) => Math.hypot(e.x - p.x, alvoY(e) - alvoY(p)) < 190);
        if (!alvos.length) return false;
        const dur = h.dur(n);
        alvos.forEach((e) => { e.prov = p; e.provT = dur; });
        p.reducao = dur; p.reducaoK = h.red(n);
        fx({ tipo: 'anel', x: p.x, y: alvoY(p), r0: 20, r1: 190, cor: '#f3a6ff', vida: 0.5 });
        som('impacto');
        break;
      }
      case 'lanca': {
        const a = alvoDe(); if (!a) return false;
        const dir = Math.sign(a.x - p.x) || p.face, L = h.alc(n), y0 = alvoY(p);
        p.face = dir;
        fx({ tipo: 'raio', x0: p.x + dir * 10, y0, x1: p.x + dir * L, y1: y0 + (alvoY(a) - y0) * 0.4, cor: '#9ff3ff', vida: 0.4 });
        ini.filter((e) => (e.x - p.x) * dir > -10 && Math.abs(e.x - p.x) < L && Math.abs(alvoY(e) - y0) < 60).forEach((e) => dano(e, p.atk * h.mult(n), p.el, p));
        som('brilho');
        break;
      }
      case 'revoada': {
        if (!perto.length) return false;
        for (let k = 0; k < h.qtd(n); k++) {
          const e = perto[k % perto.length];
          W.proj.push({ x: p.x + LV.rand(-10, 10), y: alvoY(p) - 10 - k * 6, alvo: e, vel: 360 + k * 30, dmg: p.atk * h.mult(n), el: p.el, cor: '#b49bff', dono: 'pet', fonte: p, tipo: 'corvo', vida: 2.6, efeito: (x) => { x.fraco = 4; } });
        }
        som('lanterna');
        break;
      }
      case 'teia': {
        const a = alvoDe(); if (!a) return false;
        const y = a.voa ? alvoY(a) : a.y - 6;
        W.areas.push({ tipo: 'teia', x: a.x, y, r: 90, t: 3, dur: 3, cor: '#ff9be0' });
        ini.filter((e) => Math.hypot(e.x - a.x, alvoY(e) - alvoY(a)) < 90).forEach((e) => { dano(e, p.atk * 0.6, p.el, p); e.lento = 3; e.vuln = 4; e.vulnK = h.vuln(n); });
        som('golpe');
        break;
      }
      default: return false;
    }
    anunciar(p, h.nome);
    p.atkA = 1;
    return true;
  }
  function updAreas(dt) {
    W.areas = W.areas.filter((a) => {
      a.t -= dt;
      if (a.tipo === 'nuvem') {
        a.tick -= dt;
        if (a.tick <= 0) {
          a.tick = 0.5;
          W.ini.filter(alvoValido).forEach((e) => { if (Math.abs(e.x - a.x) < a.r && Math.abs(alvoY(e) - (a.y - 20)) < a.r * 0.7) { dano(e, a.dps * 0.5, a.el, 'status'); e.lento = Math.max(e.lento || 0, 0.7); } });
        }
      }
      return a.t > 0;
    });
  }

  /* =================== CAPTURA (manual, pelo botão Lanterna) =================== */
  function lancarLanterna(e) {
    e.tentou = true; e.capt = { fase: 'voo' }; S.lanternas--;
    som('lanterna');
    const T = W.tam;
    T.face = Math.sign(e.x - T.x) || T.face;
    W.lant.push({ x0: T.x + T.face * 16, y0: T.y - T.h * 0.85, x: T.x, y: T.y - 46, alvo: e, t: 0, dur: 0.55, fase: 'voo' });
    W.pets.forEach((p) => { if (p.alvo === e) p.alvo = null; });
    emit('lanternas', S.lanternas);
  }
  /* --- captura com mira: o jogo congela, o jogador escolhe a criatura, a lanterna voa e abre o minijogo --- */
  game.captura = null;
  const selvagensNaTela = () => W.ini.filter((e) => e.tipo === 'selvagem' && alvoValido(e) && e.x > W.cam - 10 && e.x < W.cam + game.viewW + 10);
  game.iniciarMira = function () {
    if (!W || game.captura || W.tam.caido > 0 || game.pausado) return 'ocupado';
    if (S.lanternas <= 0) return 'sem';
    if (S.pets.length >= 80) return 'cheio';
    if (!selvagensNaTela().length) return 'ninguem';
    if (game.tutorial && game.tutorial.passo === 'atacar') return 'tutorial';
    game.captura = { fase: 'mira', t: 0 };
    game.pausado = true;
    emit('mira', true);
    if (game.tutorial) tutorialPasso('mirar');
    return true;
  };
  game.cancelarMira = function () {
    if (!game.captura || game.captura.fase !== 'mira') return;
    game.captura = null; game.pausado = false;
    emit('mira', false);
    if (game.tutorial) tutorialPasso('lanterna');
  };
  game.alvoEm = function (x, y, raio) {
    let best = null, bd = raio || 50;
    for (const e of selvagensNaTela()) {
      const d = Math.hypot(e.x - x, alvoY(e) - y) - e.h * 0.4;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };
  /* chance sorteada no impacto da lanterna: ~30% com vida cheia nas primeiras áreas (menos em criaturas de nível alto),
     subindo conforme a vida cai (até ~85% quase sem vida no começo); criaturas acima do nível do domador resistem mais */
  function chanceCaptura(e) {
    const sp = LV.SPECIES[e.sp];
    const base = LV.chanceBaseCaptura(sp, e.lv, e.est);
    const nivel = Math.pow(0.95, Math.max(0, e.lv - S.dom.nivel));
    return LV.clamp(LV.chanceComVida(base, e.hp / e.hpMax) * (1 + domStats().sorteCap) * nivel, 0.02, 0.95);
  }
  game.mirarEm = function (x, y, raio) {
    const C = game.captura;
    if (!C || C.fase !== 'mira') return false;
    const e = game.alvoEm(x, y, raio);
    if (!e) return false;
    S.lanternas--;
    e.capt = { fase: 'voo' }; e.tentou = true;
    const T = W.tam;
    T.face = Math.sign(e.x - T.x) || T.face; T.atk = 1;
    W.pets.forEach((p) => { if (p.alvo === e) p.alvo = null; });
    game.captura = { fase: 'lancando', alvo: e, t: 0, x0: T.x + T.face * T.h * 0.36, y0: T.y - T.h * 0.84, x: T.x, y: T.y - 50, rot: 0, chance: chanceCaptura(e) };
    som('lanterna');
    emit('mira', false); emit('lanternas', S.lanternas);
    if (game.tutorial) tutorialPasso('minijogo');
    return true;
  };
  game.atualizarCaptura = function (dt) {
    const C = game.captura;
    if (!C || !W) return;
    C.t += dt;
    const e = C.alvo;
    if (C.fase === 'mira') return;
    if (C.fase === 'lancando') {
      const k = Math.min(1, C.t / 0.7);
      C.x = LV.lerp(C.x0, e.x, k); C.y = LV.lerp(C.y0, alvoY(e) - 8, k) - Math.sin(k * Math.PI) * 95; C.rot = C.t * 14;
      if (k >= 1) {
        // a chance é sorteada no impacto: se falhar, a lanterna se parte antes do minijogo
        if (Math.random() < C.chance || e.tutorial) { C.fase = 'sugando'; C.t = 0; C.rot = 0; faiscas(e.x, alvoY(e), '#ffe3a3', 16); som('brilho'); }
        else {
          C.fase = 'partiu'; C.t = 0;
          e.capt = null; e.irritado = true; e.flash = 1;
          explosao(e.x, alvoY(e), '#ffe3a3', 18);
          for (let i = 0; i < 6; i++) particula({ x: e.x, y: alvoY(e), vx: LV.rand(-160, 160), vy: LV.rand(-260, -80), g: 700, vida: LV.rand(0.5, 0.9), t: 0, r: LV.rand(2, 3.5), cor: '#ffe7b0', tipo: 'lasca' });
          numero(e.x, topoDe(e) - 10, LV.t('Se soltou!'), 'txt');
          som('escapou');
          emit('toast', { t: e.nome + LV.t(' se soltou e a lanterna partiu (chance de ') + Math.round(C.chance * 100) + LV.t('%). Enfraqueça a criatura antes de lançar.'), tipo: 'ruim' });
        }
      }
    } else if (C.fase === 'partiu') {
      if (C.t >= 0.8) { game.captura = null; game.pausado = false; emit('lanternas', S.lanternas); }
    } else if (C.fase === 'sugando') {
      const k = Math.min(1, C.t / 0.65);
      e.sugar = k;
      C.y = alvoY(e) - 8 - Math.sin(C.t * 30) * 2 * (1 - k);
      if (k >= 1) { e.capt.fase = 'preso'; C.fase = 'caindo'; C.t = 0; C.yi = C.y; C.yc = N().chaoSob(W.L, e.x, e.y - 2) - 9; }
    } else if (C.fase === 'caindo') {
      const k = Math.min(1, C.t / 0.35);
      C.y = LV.lerp(C.yi, C.yc, k * k);
      if (k >= 1) { C.fase = 'balanca'; C.t = 0; faiscas(C.x, C.yc + 6, '#ffe3a3', 8); }
    } else if (C.fase === 'balanca') {
      C.rot = Math.sin(C.t * 22) * 0.35 * Math.max(0, 1 - C.t / 0.6);
      if (C.t >= 0.6) { C.fase = 'minijogo'; C.t = 0; emit('minijogo', { alvo: e, chance: C.chance }); }
    } else if (C.fase === 'minijogo') {
      C.rot = Math.sin(C.t * 9) * 0.12;
    }
  };
  /* sorteio do talento de uma captura perfeita (60% de chance): bônus permanente de status no pet */
  game.sortearTalento = function () {
    if (Math.random() >= 0.6) return null;
    const t = LV.pick(Object.keys(LV.TALENTOS));
    const v = t === 'spd' ? LV.pick([0.08, 0.1, 0.12]) : LV.pick([0.1, 0.15, 0.2]);
    return { t, v };
  };
  /* resultado: 'perfeito' (captura + chance de talento), 'ok' (captura) ou 'falha'. talento: já sorteado pela janela */
  game.resolverCaptura = function (resultado, talento) {
    const C = game.captura;
    if (!C) return;
    const e = C.alvo;
    game.captura = null; game.pausado = false;
    if (resultado === 'falha') {
      e.capt = null; e.sugar = 0; e.flash = 1; e.irritado = true;
      numero(e.x, topoDe(e) - 10, LV.t('Escapou!'), 'txt');
      explosao(e.x, alvoY(e), '#ffe3a3', 12);
      if (e.tutorial) { S.lanternas = Math.max(S.lanternas, 1); game.tutorial.escapou = true; tutorialPasso('lanterna'); }
    } else {
      e.sugar = 0;
      const pet = capturar(e, resultado === 'perfeito' ? talento || null : null);
      if (pet && pet.bonus) numero(W.tam.x, topoDe(W.tam) - 20, LV.TALENTOS[pet.bonus.t].nome + '!', 'txt');
      if (pet && e.tutorial) tutorialCapturou(pet);
    }
    emit('lanternas', S.lanternas);
  };
  game.chanceCaptura = (e) => chanceCaptura(e);
  function capturar(e, talento) {
    const pet = { uid: S.prox++, sp: e.sp, nivel: Math.max(1, Math.min(e.lv, F.capPet(S.dom.nivel))), xp: 0, est: e.est, apelido: null, hab: 1, bonus: talento || null };
    S.pets.push(pet); S.st.capturas++; contar(e.sp, 'c'); contar(formaDe(e), 'c'); S.meta.tot.capt++;
    e.capturado = true; e.hp = 0;
    let entrou = false;
    if (S.ativos.length < slots()) { S.ativos.push(pet.uid); montarPets(); entrou = true; }
    const yc = N().chaoSob(W.L, e.x, e.y - 2);
    explosao(e.x, yc - 10, e.pal.g, 26);
    fx({ tipo: 'anel', x: e.x, y: yc - 10, r0: 4, r1: 60, cor: '#ffe3a3', vida: 0.6 });
    emit('captura', { pet, entrou });
    return pet;
  }
  function updLant(dt, ds) {
    W.lant = W.lant.filter((Lt) => {
      Lt.t += dt;
      const e = Lt.alvo;
      if (Lt.fase === 'voo') {
        const k = Math.min(1, Lt.t / Lt.dur);
        Lt.x = LV.lerp(Lt.x0, e.x, k); Lt.y = LV.lerp(Lt.y0, alvoY(e), k) - Math.sin(k * Math.PI) * 70;
        if (k >= 1) {
          Lt.fase = 'sacode'; Lt.t = 0; Lt.x = e.x; Lt.y = N().chaoSob(W.L, e.x, e.y - 2) - 9; e.capt.fase = 'preso';
          faiscas(e.x, alvoY(e), '#ffe3a3', 14);
          fx({ tipo: 'anel', x: e.x, y: alvoY(e), r0: 30, r1: 2, cor: e.pal.g, vida: 0.35 });
        }
      } else if (Lt.fase === 'sacode') {
        if (Lt.t >= 1.9) {
          const sp = LV.SPECIES[e.sp], hpf = Math.max(0, e.hp / e.hpMax);
          const chance = Math.min(0.95, sp.cap * (1 + ds.sorteCap) * (1 + (0.35 - hpf) * 2) * (e.est ? 0.75 : 1));
          if (Math.random() < chance) { capturar(e); Lt.fase = 'ok'; }
          else {
            e.capt = null; e.flash = 1; Lt.fase = 'falha';
            som('escapou');
            numero(e.x, topoDe(e) - 10, LV.t('Escapou!'), 'txt');
            explosao(e.x, Lt.y, '#ffe3a3', 10);
            emit('toast', { t: e.nome + LV.t(' escapou da lanterna'), tipo: 'ruim', curto: true });
          }
          Lt.t = 0;
        }
      } else if (Lt.t > 0.5) return false;
      return true;
    });
  }

  /* =================== HERÓI =================== */
  function rotaAte(T, alvoSup, alvoX, folga) {
    const L = W.L;
    if (T.esc) return T.escVx;
    if (T.sup < 0) return T.arVx;
    if (alvoSup === T.sup) {
      const s = L.sup[T.sup];
      const want = LV.clamp(alvoX, s.x0 + 14, s.x1 - 14);
      return Math.abs(want - T.x) > folga ? Math.sign(want - T.x) * VEL_AUTO : 0;
    }
    const r = N().rota(L, T.sup, alvoSup, T.x, alvoX);
    if (!r || !r.length) {
      const s = L.sup[T.sup];
      const want = LV.clamp(alvoX, s.x0 + 14, s.x1 - 14);
      return Math.abs(want - T.x) > folga ? Math.sign(want - T.x) * VEL_AUTO : 0;
    }
    const p = r[0];
    if (p.tipo === 'escada') {
      if (Math.abs(T.x - p.x) > 5) return Math.sign(p.x - T.x) * VEL_AUTO;
      N().entrarEscada(T, p.esc, p.subir);
      T.escVx = (p.subir ? p.esc.dir : -p.esc.dir) * 110;
      return T.escVx;
    }
    if (p.tipo === 'cair') {
      const antes = p.dir < 0 ? T.x > p.x + 2 : T.x < p.x - 2;
      return (antes ? Math.sign(p.x - T.x) : p.dir) * VEL_AUTO;
    }
    if (p.tipo === 'pular') {
      const jx = LV.clamp(T.x, p.x0, p.x1);
      if (Math.abs(T.x - jx) > 4) return Math.sign(jx - T.x) * VEL_AUTO;
      N().pular(T); T.arVx = 0;
      return 0;
    }
    if (p.tipo === 'atravessar') {
      const jx = LV.clamp(T.x, p.x0, p.x1);
      if (Math.abs(T.x - jx) > 4) return Math.sign(jx - T.x) * VEL_AUTO;
      N().descer(T); T.arVx = 0;
      return 0;
    }
    return 0;
  }

  // alcance da lanterna até o alvo (o Guardião é grande: conta a partir da borda dele)
  const alcHeroi = (e) => ALC_HEROI + (e && e.tipo === 'chefe' ? 50 : 0);
  function updTamer(dt, ds) {
    const T = W.tam, inp = game.input, L = W.L;
    T.hpMax = ds.hp;
    T.flash = Math.max(0, T.flash - dt * 4); T.atk = Math.max(0, T.atk - dt * 3);
    if (T.caido > 0) { T.caido -= dt; if (T.caido <= 0) renascer(); return; }
    const vivos = W.ini.filter(alvoValido);
    if (T.foco && !alvoValido(T.foco)) T.foco = null;
    const foco = T.foco || (W.foco && alvoValido(W.foco) ? W.foco : null);
    const autoOn = S.op.auto && autoLiberadaEm(S);
    let vx = 0;
    if (T.preso > 0 || T.atordA > 0) { inp.pular = false; inp.subir = false; inp.descer = false; }   // preso ou atordoado: não pula nem troca de andar
    const manualAgora = inp.dir || inp.subir || inp.descer || inp.pular;
    if (manualAgora) { T.manual = 4; T.alvoX = null; T.destino = null; }
    // pulo do jogador: na queda, ele pode pousar numa escada (andando ou descendo, a escada não segura)
    if (inp.pular) { if (N().pular(T)) T.pegaEscada = true; T.arVx = inp.dir * VEL_HEROI; inp.pular = false; }
    if (inp.subir) {
      if (!T.esc) { const s = N().escadaPerto(L, T, true); if (s) N().entrarEscada(T, s, true); else if (T.sup >= 0) { if (N().pular(T)) T.pegaEscada = true; T.arVx = inp.dir * VEL_HEROI; } }
      inp.subir = false;
    }
    if (inp.descer) {
      if (!T.esc) { const s = N().escadaPerto(L, T, false); if (s) N().entrarEscada(T, s, false); else N().descer(T); }
      inp.descer = false;
    }
    if (T.esc && (inp.segSubir || inp.segDescer)) {
      vx = (inp.segSubir ? T.esc.dir : -T.esc.dir) * VEL_HEROI * 0.8;
    } else if (inp.dir) vx = inp.dir * VEL_HEROI;
    else if (T.alvoX != null) {
      const d = T.alvoX - T.x;
      if (Math.abs(d) < 6 || T.esc) T.alvoX = null; else vx = Math.sign(d) * VEL_HEROI;
    } else if (T.destino) {
      const dd = T.destino;
      vx = rotaAte(T, dd.sup, dd.x, 6);
      if (T.sup === dd.sup && Math.abs(T.x - dd.x) < 10) { T.destino = null; T.manual = 3; }
    } else if (foco) {
      // alvo escolhido com o clique: chega ao alcance da lanterna e golpeia
      T.manual = Math.max(T.manual, 1.5);
      if (dist2(foco, T) > alcHeroi(foco) - 30) vx = rotaAte(T, supDe(foco), foco.x - (Math.sign(foco.x - T.x) || 1) * (foco.tipo === 'chefe' ? 170 : ALC_HEROI - 70), 18);
      else if (T.esc) vx = T.escVx;
    } else if (autoOn && T.manual <= 0) {
      const custo = (e) => Math.abs(e.x - T.x) + Math.abs(alvoY(e) - alvoY(T)) * 1.6;
      const e = maisProximo(T, vivos, Infinity, custo);
      if (e) vx = rotaAte(T, supDe(e), e.x - (Math.sign(e.x - T.x) || 1) * (e.tipo === 'chefe' ? 170 : 115), 22);
      else {
        const d = maisProximo(T, W.drops.filter((x) => x.sup >= 0), Infinity, (x) => Math.abs(x.x - T.x) + Math.abs(x.y - T.y) * 2);
        if (d) vx = rotaAte(T, d.sup, d.x, 24);
        else if (T.esc) vx = T.escVx;
        else if (T.sup < 0) vx = T.arVx;
      }
    } else if (T.esc) vx = 0;
    T.manual = Math.max(0, T.manual - dt);
    if (T.sup >= 0) T.arVx = vx;
    if (T.preso > 0 || T.atordA > 0) vx = 0;
    N().mover(L, T, vx, dt);
    if (vx) T.face = Math.sign(T.esc ? vx : vx);
    else { const e = foco || maisProximo(T, vivos, 420); if (e) T.face = Math.sign(e.x - T.x) || T.face; }
    T.mov = LV.lerp(T.mov, vx && (T.sup >= 0 || T.esc) ? 1 : 0, Math.min(1, dt * 10));
    const combate = vivos.some((e) => dist2(e, T) < 300);
    T.hp = Math.min(T.hpMax, T.hp + T.hpMax * (combate ? 0.004 : 0.03) * dt);
    if (!(T.atordA > 0)) T.cd -= dt;
    if (T.cd <= 0) {
      // o herói golpeia o alvo do clique; sozinho, só reage a ameaças (ou caça tudo na caçada automática)
      const e = foco && dist2(foco, T) < alcHeroi(foco) ? foco
        : foco ? null
        : maisProximo(T, autoOn ? vivos : vivos.filter(ameaca), ALC_HEROI, (x) => dist2(x, T) - (alcHeroi(x) - ALC_HEROI));
      if (e) {
        T.cd = foco ? 1.4 : 2; T.atk = 1;
        const lx = T.x + T.face * T.h * 0.36, ly = T.y - T.h * 0.86;
        fx({ tipo: 'feixe', x0: lx, y0: ly, x1: e.x, y1: alvoY(e), cor: '#ffd38a', vida: 0.25 });
        fx({ tipo: 'anel', x: lx, y: ly, r0: 4, r1: 26, cor: '#ffd38a', vida: 0.3 });
        dano(e, ds.atk, null, T);
      } else T.cd = 0.3;
    }
  }

  /* =================== PETS =================== */
  function saltar(p, sup, tx) {
    const s = W.L.sup[sup];
    tx = LV.clamp(tx, s.x0 + 12, s.x1 - 12);
    const d = Math.hypot(tx - p.x, s.y - p.y);
    p.salto = { x0: p.x, y0: p.y, x1: tx, y1: s.y, t: 0, dur: LV.clamp(d / 520, 0.35, 0.8), sup, arco: 40 + Math.max(0, p.y - s.y) * 0.5 };
    p.sup = -1; p.saltoCd = 0.6;
  }
  function updPets(dt) {
    const T = W.tam, L = W.L, ini = W.ini.filter(alvoValido);
    const tSup = T.esc ? -1 : T.sup;
    if (W.foco && !alvoValido(W.foco)) W.foco = null;
    const foco = W.foco;                      // clique direito: todos atacam este alvo, em qualquer modo
    const permitidos = alvosDoModo(ini);
    const alvosHab = foco && !permitidos.includes(foco) ? permitidos.concat([foco]) : permitidos;
    W.pets.forEach((p, i) => {
      p.flash = Math.max(0, p.flash - dt * 4); p.atkA = Math.max(0, p.atkA - dt * 4); p.saltoCd = Math.max(0, p.saltoCd - dt);
      if (p.salto) {
        const sl = p.salto;
        sl.t += dt;
        const k = Math.min(1, sl.t / sl.dur);
        p.x = LV.lerp(sl.x0, sl.x1, k);
        p.y = LV.lerp(sl.y0, sl.y1, k) - Math.sin(k * Math.PI) * sl.arco;
        p.face = Math.sign(sl.x1 - sl.x0) || p.face; p.mov = 1;
        if (k >= 1) { p.salto = null; p.sup = sl.sup; p.y = sl.y1; }
        return;
      }
      const hyVoo = T.y - 66 - p.est * 6 + Math.sin(W.t * 2.2 + i) * 6;
      if (p.desm > 0) {
        p.desm -= dt;
        if (p.voa) { p.x += (T.x - T.face * (30 + i * 16) - p.x) * Math.min(1, dt * 2); p.y += (T.y - 24 - p.y) * Math.min(1, dt * 3); }
        else if (tSup >= 0 && p.sup !== tSup && p.saltoCd <= 0) saltar(p, tSup, T.x - T.face * (30 + i * 16));
        else if (p.sup >= 0) N().mover(L, p, Math.sign(T.x - T.face * (30 + i * 16) - p.x) * 60, dt);
        p.mov = 0;
        if (p.desm <= 0) { p.hp = Math.round(p.hpMax * 0.5); fx({ tipo: 'anel', x: p.x, y: alvoY(p), r0: 30, r1: 4, cor: p.pal.g, vida: 0.4 }); }
        return;
      }
      if (p.atordA > 0) { p.mov = 0; if (p.sup < 0 && !p.voa) N().mover(L, p, 0, dt); return; }   // atordoado: parado
      const combate = ini.some((e) => dist2(e, p) < 320);
      p.hp = Math.min(p.hpMax, p.hp + p.hpMax * (combate ? 0.006 : 0.05) * dt);
      if (p.reducao > 0) p.reducao -= dt;
      p.habCd = (p.habCd == null ? habRecarga(p) * 0.5 : p.habCd) - dt;
      if (p.habCd <= 0) { if (tentarHabilidade(p, alvosHab)) p.habCd = habRecarga(p); else p.habCd = 0; }
      if (foco) p.alvo = foco;
      else if (p.alvo && (!alvoValido(p.alvo) || dist2(p.alvo, T) > RAIO_PET + 40 || !permitidos.includes(p.alvo))) p.alvo = null;
      if (!p.alvo) p.alvo = maisProximo(p, permitidos.filter((e) => dist2(e, T) < RAIO_PET), Infinity, (e) => dist2(e, T) + dist2(e, p) * 0.5);
      const raioMax = p.alvo && p.alvo === foco ? 520 : RAIO_PET + 40;
      const longe = Math.abs(p.x - T.x) > raioMax || Math.abs(p.y - T.y) > (p.alvo === foco ? 320 : 200);
      const e = !longe ? p.alvo : null;
      let tx, ty = null, alvoSup = null;
      if (e) {
        const s = Math.sign(e.x - p.x) || 1, raio = e.h * 0.35;
        p.face = s;
        if (p.estilo === 'investida') {
          tx = e.x - s * (20 + raio);
          alvoSup = e.voa ? supDe(e) : e.sup;
          if (p.voa) ty = alvoY(e);
        } else {
          tx = e.x - s * p.alc * 0.75;
          alvoSup = tSup >= 0 ? tSup : p.sup;
          if (p.voa) ty = alvoY(e) - 40;
        }
        p.cd -= dt;
        const dx = Math.abs(e.x - p.x), dy = Math.abs(alvoY(e) - alvoY(p));
        const alcance = p.estilo === 'investida' ? dx <= p.alc + raio + 12 && dy < 70 : Math.hypot(dx, dy) <= p.alc + raio + 30;
        if (p.cd <= 0 && alcance) { atacarPet(p, e); p.cd = 1 / p.spd; }
      } else {
        tx = T.x + FORM[i % FORM.length] * T.face;
        alvoSup = tSup;
        ty = hyVoo;
      }
      if (p.preso > 0) { p.mov = 0; if (p.sup < 0 && !p.voa) N().mover(L, p, 0, dt); return; }   // preso: ataca, mas não anda
      if (p.voa) {
        const yy = ty == null ? hyVoo : ty;
        const dx = tx - p.x, dy = yy - p.y, d = Math.hypot(dx, dy);
        const sp = longe ? 340 : 190;
        if (d > 3) { const k = Math.min(1, (sp * dt) / d); p.x += dx * k; p.y += dy * k; }
        p.mov = d > 6 ? 1 : 0;
        if (!e) p.face = Math.abs(dx) > 20 ? Math.sign(dx) : T.face;
        return;
      }
      if (p.sup < 0) { N().mover(L, p, 0, dt); return; }
      if (alvoSup != null && alvoSup >= 0 && alvoSup !== p.sup && p.saltoCd <= 0) { saltar(p, alvoSup, tx); return; }
      const s = L.sup[p.sup];
      tx = LV.clamp(tx, s.x0 + 10, s.x1 - 10);
      const dx = tx - p.x, sp = longe ? 330 : p.estilo === 'investida' ? 215 : 175;
      const v = Math.abs(dx) > 3 ? Math.sign(dx) * Math.min(sp, Math.abs(dx) * 6) : 0;
      N().mover(L, p, v, dt);
      if (p.sup >= 0) p.x = LV.clamp(p.x, s.x0 + 6, s.x1 - 6);
      p.mov = LV.lerp(p.mov, Math.abs(v) > 20 ? 1 : 0, Math.min(1, dt * 10));
      if (!e) p.face = Math.abs(v) > 20 ? Math.sign(v) : T.face;
    });
  }

  /* =================== ATAQUES DOS GUARDIÕES ===================
     Cada Guardião tem 1 ataque básico e 2 especiais (um especial a cada 3 ataques, alternando).
     Os especiais avisam antes: marcas no chão, brilho no Guardião e o nome do golpe. */
  const KIT_CHEFE = [
    { basico: 'chicote', esp: ['raizes', 'muralha'], cor: '#8fe07f' },          // Mãe-Raiz: raízes
    { basico: 'baforada', esp: ['nuvemVeneno', 'chuvaEsporos'], cor: '#b8e05a' }, // Rei Bolor: gás venenoso
    { basico: 'espada', esp: ['onda', 'estocada'], cor: '#62c9ff' },             // Sentinela Afogada: espada e água
    { basico: 'raioLuz', esp: ['pilares', 'clarao'], cor: '#f6d6ff' },           // Matriarca Geode: luz
    { basico: 'corrente', esp: ['bolasFogo', 'correntes'], cor: '#ff8a3d' },     // Coração Ígneo: correntes e fogo
  ];
  const NOME_ATAQUE = {
    chicote: LV.t('Chicote de vinha'), raizes: LV.t('Raízes do chão'), muralha: LV.t('Muralha de raízes'),
    baforada: LV.t('Baforada de esporos'), nuvemVeneno: LV.t('Nuvem venenosa'), chuvaEsporos: LV.t('Chuva de esporos'),
    espada: LV.t('Golpe de espada'), onda: LV.t('Onda afogada'), estocada: LV.t('Estocada'),
    raioLuz: LV.t('Raio de luz'), pilares: LV.t('Pilares de luz'), clarao: LV.t('Clarão'),
    corrente: LV.t('Chicote de correntes'), bolasFogo: LV.t('Bolas de fogo'), correntes: LV.t('Correntes ígneas'),
  };
  game.KIT_CHEFE = KIT_CHEFE; game.NOME_ATAQUE = NOME_ATAQUE;
  const chaoY = (x) => N().chaoSob(W.L, x, G - 2);
  function alertar(o) { (W.alertas || (W.alertas = [])).push(Object.assign({ t: 0 }, o)); }
  function perigo(o) { (W.perigos || (W.perigos = [])).push(Object.assign({ t: 0, atingidos: new Set() }, o)); }
  // pontos de impacto: onde estão os aliados (com um pouco de erro) e mais alguns perto deles
  function pontosPerto(al, n, espalho) {
    const xs = al.map((a) => a.x + LV.rand(-25, 25));
    while (xs.length < n) { const base = al.length ? LV.pick(al).x : W.tam.x; xs.push(base + LV.rand(-espalho, espalho)); }
    return xs.slice(0, n).map((x) => LV.clamp(x, 40, W.w - 40));
  }
  function envenenar(a, dps, t) { a.veneno = { t: Math.max(t, (a.veneno && a.veneno.t) || 0), dps: Math.max(dps, (a.veneno && a.veneno.dps) || 0), tick: 0.5 }; }
  function prender(a, t) { if (a.hp <= 0) return; if (!(a.preso > 0)) numero(a.x, topoDe(a) - 14, LV.t('preso!'), 'txt'); a.preso = Math.max(a.preso || 0, t); }
  function atordoar(a, t) { if (a.hp <= 0) return; if (!(a.atordA > 0)) numero(a.x, topoDe(a) - 14, LV.t('atordoado!'), 'txt'); a.atordA = Math.max(a.atordA || 0, t); }

  function iniciarAtaqueChefe(e, alvo, al) {
    const kit = KIT_CHEFE[e.mapa] || KIT_CHEFE[0];
    const especial = e.padrao % 3 === 2;
    const nome = especial ? kit.esp[Math.floor(e.padrao / 3) % 2] : kit.basico;
    e.ataque = nome; e.ataqueCor = kit.cor;
    e.cargaMax = e.carga = especial ? 1.15 : 0.55;
    e.mira = { x: alvo.x, y: alvoY(alvo) };
    e.face = Math.sign(alvo.x - e.x) || e.face;
    if (especial) { numero(e.x, topoDe(e) - 12, NOME_ATAQUE[nome], 'hab', kit.cor); som('lanterna'); }
    const vida = e.cargaMax;
    if (nome === 'raizes' || nome === 'pilares') {
      e.pontos = pontosPerto(al, 5, 220);
      e.pontos.forEach((x) => alertar({ tipo: 'circulo', x, y: chaoY(x), r: nome === 'pilares' ? 42 : 46, vida, cor: kit.cor }));
    } else if (nome === 'chuvaEsporos') {
      e.pontos = pontosPerto(al, 7, 260);
      e.pontos.forEach((x) => alertar({ tipo: 'circulo', x, y: chaoY(x), r: 40, vida: vida + 0.9, cor: kit.cor }));
    } else if (nome === 'nuvemVeneno') {
      alertar({ tipo: 'circulo', x: e.mira.x, y: chaoY(e.mira.x), r: 150, vida, cor: kit.cor });
    } else if (nome === 'clarao') {
      alertar({ tipo: 'circulo', x: e.x, y: G, r: 320, vida, cor: kit.cor });
    } else if (nome === 'muralha' || nome === 'onda') {
      alertar({ tipo: 'faixa', x: e.x, y: G, r: 260, vida, cor: kit.cor });
    } else if (nome === 'estocada') {
      alertar({ tipo: 'linha', x: e.x, x1: LV.clamp(e.mira.x + e.face * 140, 70, W.w - 70), y: G, vida, cor: kit.cor });
    } else if (nome === 'bolasFogo') {
      e.pontos = pontosPerto(al, 5, 200);
      e.pontos.forEach((x) => alertar({ tipo: 'circulo', x, y: chaoY(x), r: 56, vida: vida + 1.0, cor: kit.cor }));
    }
  }

  function executarAtaqueChefe(e, alvo, al) {
    const nome = e.ataque, atk = e.atk, el = e.el, cor = e.ataqueCor || e.pal.g, face = e.face || 1;
    const oy = e.voa ? e.y : e.y - e.h * 0.55;
    const naFrente = (a, alc) => (a.x - e.x) * face > -40 && Math.abs(a.x - e.x) < alc && Math.abs(alvoY(a) - oy) < 160;
    e.cd = e.cargaMax > 1 ? 2.6 : 1.9;
    switch (nome) {
      /* ---------- Mãe-Raiz ---------- */
      case 'chicote': {
        fx({ tipo: 'vinha', x0: e.x + face * 30, y0: oy, x1: e.x + face * 240, y1: G - 40, cor, vida: 0.45 });
        al.forEach((a) => { if (naFrente(a, 250)) danoAliado(a, atk * LV.rand(0.85, 1.0), el, e); });
        som('golpe'); break;
      }
      case 'raizes': {
        (e.pontos || []).forEach((x) => {
          const gy = chaoY(x);
          fx({ tipo: 'raiz', x, y: gy, cor, vida: 0.8 });
          al.forEach((a) => { if (Math.abs(a.x - x) < 46 && alvoY(a) > gy - 130) { danoAliado(a, atk * 1.15, el, e); prender(a, 1.6); } });
        });
        W.shake = 8; som('impacto'); break;
      }
      case 'muralha': {
        for (const dir of [-1, 1]) perigo({ tipo: 'ondaChao', estilo: 'raiz', x: e.x + dir * 40, dir, vel: 330, dist: 760, dmg: atk * 1.0, el, cor, src: e });
        W.shake = 6; som('impacto'); break;
      }
      /* ---------- Rei Bolor ---------- */
      case 'baforada': {
        for (let i = 0; i < 18; i++) particula({ x: e.x + face * 40, y: oy, vx: face * LV.rand(120, 320), vy: LV.rand(-60, 60), g: -10, vida: 0.9, t: 0, r: LV.rand(3, 6), cor, tipo: 'luz' });
        al.forEach((a) => { if (naFrente(a, 230)) { danoAliado(a, atk * 0.7, el, e); envenenar(a, atk * 0.22, 3); } });
        break;
      }
      case 'nuvemVeneno': {
        perigo({ tipo: 'gas', x: e.mira.x, y: chaoY(e.mira.x), r: 150, dur: 5, dps: atk * 0.4, tick: 0.2, cor, src: e, el });
        break;
      }
      case 'chuvaEsporos': {
        (e.pontos || []).forEach((x, i) => W.proj.push({ x: x + LV.rand(-10, 10), y: chaoY(x) - 430 - i * 40, vx: 0, vy: 240, g: 0, dmg: atk * 0.6, el, cor, dono: 'ini', src: e, linear: true, vida: 4, tipo: 'esporo',
          aoCair: (pr) => {
            const gy = chaoY(pr.x);
            fx({ tipo: 'anel', x: pr.x, y: gy - 14, r0: 6, r1: 60, cor, vida: 0.4 });
            for (let k = 0; k < 8; k++) particula({ x: pr.x, y: gy - 10, vx: LV.rand(-80, 80), vy: LV.rand(-90, -20), g: 60, vida: 0.8, t: 0, r: 3, cor, tipo: 'luz' });
            aliados().forEach((a) => { if (Math.abs(a.x - pr.x) < 52 && alvoY(a) > gy - 120) { danoAliado(a, pr.dmg, el, e); envenenar(a, atk * 0.18, 3); } });
          } }));
        break;
      }
      /* ---------- Sentinela Afogada ---------- */
      case 'espada': {
        fx({ tipo: 'corteGrande', x: e.x + face * 70, y: oy, face, cor, vida: 0.35 });
        al.forEach((a) => { if (naFrente(a, 210)) danoAliado(a, atk * LV.rand(0.95, 1.1), el, e); });
        som('golpe'); W.shake = 4; break;
      }
      case 'onda': {
        for (const dir of [-1, 1]) perigo({ tipo: 'ondaChao', estilo: 'agua', x: e.x + dir * 40, dir, vel: 380, dist: 800, dmg: atk * 0.9, el, cor, src: e, empurra: 80 });
        W.shake = 6; som('impacto'); break;
      }
      case 'estocada': {
        const alvoX = LV.clamp(e.mira.x + face * 140, 70, W.w - 70), dist = Math.abs(alvoX - e.x);
        e.dash = { vx: face * 640, t: dist / 640, atingidos: new Set() };
        som('golpe'); break;
      }
      /* ---------- Matriarca Geode ---------- */
      case 'raioLuz': {
        const a = alvo && alvo.hp > 0 ? alvo : al[0];
        if (a) { fx({ tipo: 'raio', x0: e.x, y0: e.y - e.h * 0.8, x1: a.x, y1: alvoY(a), cor, vida: 0.35 }); danoAliado(a, atk * 0.95, el, e); faiscas(a.x, alvoY(a), cor, 8); }
        break;
      }
      case 'pilares': {
        (e.pontos || []).forEach((x) => {
          const gy = chaoY(x);
          fx({ tipo: 'coluna', x, y: gy, cor, vida: 0.7, larg: 48 });
          al.forEach((a) => { if (Math.abs(a.x - x) < 44) danoAliado(a, atk * 1.2, el, e); });
        });
        W.shake = 6; som('brilho'); break;
      }
      case 'clarao': {
        fx({ tipo: 'clarao', x: e.x, y: oy, r: 320, cor, vida: 0.6 });
        W.flashTela = 0.55;
        al.forEach((a) => { if (Math.abs(a.x - e.x) < 320) { danoAliado(a, atk * 0.8, el, e); atordoar(a, 1.2); } });
        som('brilho'); break;
      }
      /* ---------- Coração Ígneo ---------- */
      case 'corrente': {
        const a = maisProximo(e, al, Infinity);
        if (a) {
          fx({ tipo: 'corrente', x0: e.x, y0: oy, alvo: a, cor, vida: 0.5 });
          danoAliado(a, atk * 0.9, el, e);
          if (a.sup >= 0 || a.voa) a.x += Math.sign(e.x - a.x) * 80;      // puxa para perto do Coração
        }
        som('golpe'); break;
      }
      case 'bolasFogo': {
        (e.pontos || []).forEach((x, i) => {
          const tv = 1.0 + i * 0.12, gy = chaoY(x), y0 = oy - 20;
          W.proj.push({ x: e.x, y: y0, vx: (x - e.x) / tv, vy: (gy - y0 - 0.5 * 900 * tv * tv) / tv, g: 900, dmg: atk * 0.8, el, cor: '#ff8a3d', dono: 'ini', src: e, linear: true, vida: 3, tipo: 'brasa',
            aoCair: (pr) => {
              const gy2 = chaoY(pr.x);
              fx({ tipo: 'explosao', x: pr.x, y: gy2 - 16, r: 64, vida: 0.45 }); explosao(pr.x, gy2 - 12, '#ff8a3d', 10);
              aliados().forEach((a) => { if (Math.abs(a.x - pr.x) < 64 && alvoY(a) > gy2 - 130) danoAliado(a, pr.dmg, el, e); });
              perigo({ tipo: 'fogo', x: pr.x, y: gy2, r: 46, dur: 2.2, dps: atk * 0.25, tick: 0.25, cor: '#ff8a3d', src: e, el });
            } });
        });
        som('impacto'); break;
      }
      case 'correntes': {
        al.forEach((a) => { fx({ tipo: 'corrente', x0: e.x, y0: oy, alvo: a, cor, vida: 1.8 }); danoAliado(a, atk * 0.6, el, e); prender(a, 2); envenenar(a, atk * 0.2, 2); });
        W.shake = 5; som('impacto'); break;
      }
    }
    W.alertas = (W.alertas || []).filter((x) => x.tipo === 'circulo' && x.vida > x.t + 0.2 && (nome === 'chuvaEsporos' || nome === 'bolasFogo'));
  }

  /* perigos que ficam no campo (ondas no chão, nuvem de gás, fogo) e marcas de aviso */
  function updPerigos(dt) {
    if (W.alertas) W.alertas = W.alertas.filter((a) => (a.t += dt) < a.vida);
    if (!W.perigos || !W.perigos.length) return;
    const al = aliados();
    W.perigos = W.perigos.filter((p) => {
      p.t += dt;
      if (p.tipo === 'ondaChao') {
        p.x += p.dir * p.vel * dt; p.dist -= p.vel * dt;
        al.forEach((a) => {
          // só pega quem está no chão: pular desvia
          if (p.atingidos.has(a) || Math.abs(a.x - p.x) > 24 || a.voa || !(a.sup >= 0 || a.esc) || alvoY(a) < chaoY(p.x) - 120) return;
          p.atingidos.add(a); danoAliado(a, p.dmg, p.el, p.src);
          if (p.empurra) a.x = LV.clamp(a.x + p.dir * p.empurra, 30, W.w - 30);
          if (p.estilo === 'raiz') prender(a, 1);
        });
        if (Math.random() < 0.5) particula({ x: p.x, y: chaoY(p.x) - 6, vx: -p.dir * 40, vy: LV.rand(-120, -40), g: 500, vida: 0.5, t: 0, r: 2.5, cor: p.cor, tipo: 'luz' });
        return p.dist > 0 && p.x > 10 && p.x < W.w - 10;
      }
      if (p.tipo === 'gas' || p.tipo === 'fogo') {
        p.tick -= dt;
        if (p.tick <= 0) {
          p.tick = 0.5;
          al.forEach((a) => { if (Math.abs(a.x - p.x) < p.r && alvoY(a) > p.y - p.r * 1.1) { danoAliado(a, p.dps * 0.5, p.el, p.src); if (p.tipo === 'gas') envenenar(a, p.dps * 0.3, 2); } });
        }
        return p.t < p.dur;
      }
      return false;
    });
  }
  /* estados nos aliados: veneno (dano aos poucos), preso (não anda) e atordoado (não anda nem ataca) */
  function statusAliados(dt) {
    for (const a of [W.tam].concat(W.pets)) {
      if (a.preso > 0) a.preso -= dt;
      if (a.atordA > 0) a.atordA -= dt;
      if (a.veneno) {
        a.veneno.t -= dt; a.veneno.tick -= dt;
        if (a.veneno.tick <= 0 && a.hp > 0 && !(a.desm > 0) && !(a === W.tam && a.caido > 0)) { a.veneno.tick = 0.5; danoAliado(a, a.veneno.dps * 0.5, null, null); }
        if (a.veneno.t <= 0) a.veneno = null;
      }
    }
  }
  function limparEfeitosChefe() {
    W.alertas = []; W.perigos = [];
    for (const a of [W.tam].concat(W.pets)) { a.preso = 0; a.atordA = 0; a.veneno = null; }
  }

  /* =================== INIMIGOS =================== */
  function updIni(dt) {
    const al = aliados(), L = W.L;
    for (const e of W.ini) {
      e.flash = Math.max(0, e.flash - dt * 5); e.atkA = Math.max(0, e.atkA - dt * 4);
      if (e.nasc > 0) { e.nasc -= dt; continue; }
      if (e.fuga != null) { e.fuga -= dt; continue; }
      if (e.capt) continue;
      if (e.tutorial) { e.mov = 0; e.face = Math.sign(W.tam.x - e.x) || e.face; continue; }
      // efeitos de estado
      if (e.dots && e.dots.length) {
        e.dots = e.dots.filter((d) => { d.t -= dt; d.tick -= dt; if (d.tick <= 0) { d.tick += 0.5; dano(e, d.dps * 0.5, d.el, 'status'); } return d.t > 0; });
        if (e.hp <= 0) continue;
      }
      for (const k of ['lento', 'fraco', 'vuln', 'provT', 'agrediu']) if (e[k] > 0) e[k] -= dt;
      if (e.atord > 0) { e.atord -= dt; e.mov = 0; continue; }
      const lentidao = e.lento > 0 ? 0.45 : 1;
      const casa = L.sup[e.casa] || L.sup[0];
      const zona = W.zonas[e.zona] || { x0: casa.x0 + 14, x1: casa.x1 - 14, cx: (casa.x0 + casa.x1) / 2 };
      let vx = 0;
      if (e.tipo === 'chefe') {
        const alvo = maisProximo(e, al, Infinity);
        if (e.voa) e.y += (G - 120 + Math.sin(W.t * 1.6) * 14 - e.y) * Math.min(1, dt * 3);
        if (e.dash) {                                   // estocada: atravessa o campo e acerta quem estiver no caminho
          vx = e.dash.vx; e.dash.t -= dt;
          al.forEach((a) => { if (!e.dash.atingidos.has(a) && Math.abs(a.x - e.x) < 46 && alvoY(a) > G - 150) { e.dash.atingidos.add(a); danoAliado(a, e.atk * 1.2, e.el, e); a.x += Math.sign(e.dash.vx) * 40; } });
          if (Math.random() < 0.6) particula({ x: e.x - Math.sign(vx) * 30, y: G - LV.rand(10, 70), vx: -vx * 0.2, vy: LV.rand(-60, -10), g: 300, vida: 0.5, t: 0, r: 2.5, cor: '#9fe6ff', tipo: 'luz' });
          if (e.dash.t <= 0 || e.x <= 70 || e.x >= W.w - 70) e.dash = null;
        } else if (alvo) {
          const d = alvo.x - e.x, s = Math.sign(d) || 1;
          if (e.carga <= 0) e.face = s;
          if (Math.abs(d) > 110 && e.carga <= 0) vx = s * 62;
          e.cd -= dt;
          if (e.carga > 0) {
            e.carga -= dt;
            if (e.carga <= 0) { executarAtaqueChefe(e, alvo, al); e.padrao++; e.atkA = 1; }
          } else if (e.cd <= 0 && Math.abs(d) < 520) iniciarAtaqueChefe(e, alvo, al);
        }
        e.x = LV.clamp(e.x + vx * dt, 60, W.w - 60);
        e.mov = LV.lerp(e.mov, Math.abs(vx) > 5 ? 1 : 0, Math.min(1, dt * 10));
        continue;
      }
      // quem está ao alcance: terrestres corpo a corpo só enxergam a própria plataforma
      const visivel = (a) => {
        if (e.voa) return dist2(a, e) < 380;
        if (e.estilo !== 'investida') return dist2(a, e) < 340;
        const aSup = a.voa ? -2 : a.esc ? -3 : a.sup;
        return aSup === e.sup && Math.abs(a.x - e.x) < 360 || (a.voa && Math.abs(a.x - e.x) < 120 && Math.abs(alvoY(a) - alvoY(e)) < 80);
      };
      // cada criatura defende o próprio ninho: só persegue quem chega perto dele
      const noNinho = (a) => a.x > zona.x0 - 110 && a.x < zona.x1 + 110;
      let alvo = null;
      // espécies mansas só reagem depois de apanhar; hostis e as demais selvagens atacam quem entra no ninho
      const manso = e.tipo === 'selvagem' && LV.SPECIES[e.sp].passivo && !e.irritado;
      if (manso) alvo = null;
      else if (e.prov && e.provT > 0 && e.prov.desm <= 0 && e.prov.hp > 0) alvo = e.prov;
      else alvo = maisProximo(e, al.filter((a) => visivel(a) && noNinho(a)), Infinity, (a) => dist2(a, e));
      e.persegue = alvo;
      const vel = (e.tipo === 'hostil' ? e.velMul || 1.1 : 1) * lentidao;
      if (e.voa) {
        let tx = e.x, ty = casa.y - (e.altVoo || 70) + Math.sin(W.t * 2 + e.t0) * 10;
        if (alvo) {
          const s = Math.sign(alvo.x - e.x) || 1;
          e.face = s;
          tx = alvo.x - s * (e.estilo === 'investida' ? 30 : e.alc * 0.8);
          ty = alvoY(alvo) - 30;
        } else {
          e.wander -= dt;
          if (e.wander <= 0) { e.wander = LV.rand(1.5, 3.5); e.vx = Math.random() < 0.3 ? 0 : LV.rand(-40, 40); }
          tx = e.x + e.vx;
          if (e.x < zona.x0) tx = zona.x0 + 20; else if (e.x > zona.x1) tx = zona.x1 - 20;
          if (Math.abs(tx - e.x) > 1) e.face = Math.sign(tx - e.x);
        }
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (d > 3) { const k = Math.min(1, (88 * vel * dt) / d); e.x += dx * k; e.y += dy * k; }
        e.x = LV.clamp(e.x, Math.max(30, zona.x0 - 130), Math.min(W.w - 30, zona.x1 + 130));
        e.mov = d > 6 ? 1 : 0;
      } else {
        if (alvo) {
          const d = alvo.x - e.x, s = Math.sign(d) || 1;
          e.face = s;
          const parar = e.estilo === 'investida' ? 24 + (alvo.h || 40) * 0.2 : e.alc * 0.85;
          if (Math.abs(d) > parar) vx = s * 74 * vel;
        } else {
          e.wander -= dt;
          if (e.wander <= 0) { e.wander = LV.rand(1.5, 3.5); e.vx = Math.random() < 0.35 ? 0 : LV.rand(-36, 36); }
          vx = e.vx * lentidao;
          if (e.x < zona.x0) vx = 50; else if (e.x > zona.x1) vx = -50;
          if (vx) e.face = Math.sign(vx);
        }
        e.x = LV.clamp(e.x + vx * dt, Math.max(casa.x0 + 14, zona.x0 - 110), Math.min(casa.x1 - 14, zona.x1 + 110));
        e.y = casa.y;
        e.mov = LV.lerp(e.mov, Math.abs(vx) > 5 ? 1 : 0, Math.min(1, dt * 10));
      }
      if (alvo) {
        e.cd -= dt * (e.lento > 0 ? 0.6 : 1);
        const dx = Math.abs(alvo.x - e.x), dy = Math.abs(alvoY(alvo) - alvoY(e));
        const pode = e.estilo === 'investida' ? dx <= e.alc + 8 && dy < 60 : Math.hypot(dx, dy) <= e.alc + 20;
        if (e.cd <= 0 && pode) {
          e.cd = LV.rand(1.3, 1.8); e.atkA = 1; e.agrediu = 5;
          const s = Math.sign(alvo.x - e.x) || 1;
          const forca = e.atk * LV.rand(0.85, 1.15) * (e.fraco > 0 ? 0.7 : 1);
          if (e.estilo === 'investida') {
            danoAliado(alvo, forca, e.el, e);
            fx({ tipo: 'corte', x: alvo.x + s * 2, y: alvoY(alvo), face: -s, cor: '#ffffff', vida: 0.2 });
          } else {
            W.proj.push({ x: e.x + s * e.h * 0.3, y: alvoY(e), alvo, vel: 330, dmg: forca, el: e.el, cor: e.pal.g, dono: 'ini', src: e, vida: 3 });
          }
        }
      }
    }
    for (let i = 0; i < W.ini.length; i++) {
      for (let j = i + 1; j < W.ini.length; j++) {
        const a = W.ini[i], b = W.ini[j];
        if (a.tipo === 'chefe' || b.tipo === 'chefe' || a.voa !== b.voa || a.capt || b.capt || a.sup !== b.sup) continue;
        const dx = b.x - a.x;
        if (Math.abs(dx) < 40) { const push = (40 - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1); a.x -= push * 0.5; b.x += push * 0.5; }
      }
    }
    W.ini = W.ini.filter((e) => (e.hp > 0 || e.capt) && !e.capturado && !(e.fuga != null && e.fuga <= 0));
  }

  function updProj(dt) {
    W.proj = W.proj.filter((pr) => {
      pr.vida -= dt;
      if (pr.vida <= 0) return false;
      if (pr.linear) {
        if (pr.g) pr.vy += pr.g * dt;
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        particula({ x: pr.x, y: pr.y, vx: 0, vy: 0, g: 0, vida: 0.25, t: 0, r: pr.tipo === 'brasa' ? 4 : 2.5, cor: pr.cor, tipo: 'luz' });
        if (pr.aoCair) {
          if (pr.vy > 0 && pr.y >= N().chaoSob(W.L, pr.x, pr.y - pr.vy * dt - 2) - 6) { pr.aoCair(pr); return false; }
          return true;
        }
        if (pr.y > G + 4) { faiscas(pr.x, G, pr.cor, 4); return false; }
        for (const a of aliados()) {
          if (Math.abs(a.x - pr.x) < 18 && Math.abs(alvoY(a) - pr.y) < (a.h || 40) * 0.5) { danoAliado(a, pr.dmg, pr.el, pr.src); faiscas(pr.x, pr.y, pr.cor, 6); return false; }
        }
        return true;
      }
      const a = pr.alvo;
      const vivo = pr.dono === 'pet' ? a && a.hp > 0 && !a.capt : a && a.hp > 0 && !(a.desm > 0) && !(a === W.tam && W.tam.caido > 0);
      if (!vivo) { faiscas(pr.x, pr.y, pr.cor, 3); return false; }
      const ty = alvoY(a), dx = a.x - pr.x, dy = ty - pr.y, d = Math.hypot(dx, dy) || 1;
      if (d < 12 + (a.h || 40) * 0.18) {
        if (pr.dono === 'pet') {
          if (pr.tipo === 'pulso') {
            fx({ tipo: 'anel', x: a.x, y: ty, r0: 8, r1: 78, cor: pr.cor, vida: 0.35 });
            W.ini.filter(alvoValido).forEach((o) => { if (Math.hypot(o.x - a.x, alvoY(o) - ty) < 80) dano(o, pr.dmg * (o === a ? 1 : 0.6), pr.el, pr.fonte); });
          } else {
            if (pr.tipo === 'brasa') { explosao(a.x, ty, '#ff9a52', 8); fx({ tipo: 'anel', x: a.x, y: ty, r0: 4, r1: 30, cor: '#ff9a52', vida: 0.3 }); }
            dano(a, pr.dmg, pr.el, pr.fonte);
          }
          if (pr.efeito && a.hp > 0) pr.efeito(a);
        } else danoAliado(a, pr.dmg, pr.el, pr.src);
        return false;
      }
      const sp = pr.vel * dt;
      pr.x += (dx / d) * sp; pr.y += (dy / d) * sp;
      if (Math.random() < 0.8) particula({ x: pr.x, y: pr.y, vx: LV.rand(-10, 10), vy: LV.rand(-10, 10), g: 0, vida: 0.28, t: 0, r: pr.tipo === 'pulso' ? 3 : 2, cor: pr.cor, tipo: 'luz' });
      return true;
    });
  }

  function updDrops(dt, ds) {
    const T = W.tam;
    W.drops = W.drops.filter((d) => {
      d.idade += dt;
      // itens da volta do descanso: flutuam em volta do herói e são puxados um a um
      if (d.visual && !d.atraido) { d.y += Math.sin(W.t * 4 + d.x) * 6 * dt; if (d.idade >= 0) d.atraido = true; return true; }
      const dx = T.x - d.x, dy = T.y - 30 - d.y, dist = Math.hypot(dx, dy) || 1;
      if (!d.atraido && d.idade > 0.45 && (dist < ds.ima || d.idade > 6) && T.caido <= 0) d.atraido = true;
      if (d.atraido) {
        const sp = d.visual ? 650 + d.idade * 1100 : 280 + d.idade * 140;   // a volta do descanso é rápida
        d.x += (dx / dist) * sp * dt; d.y += (dy / dist) * sp * dt;
        if (dist < 18) { coletar(d); return false; }
      } else if (d.sup < 0) {
        const y0 = d.y;
        d.vy += 900 * dt; d.x = LV.clamp(d.x + d.vx * dt, 10, W.w - 10); d.y += d.vy * dt; d.vx *= 1 - dt * 1.5;
        if (d.vy > 0) {
          const s = N().pousar(W.L, d.x, y0 + 4, d.y + 4, -1);
          if (s) {
            d.y = s.y - 4;
            if (d.vy > 90) d.vy *= -0.35; else { d.vy = 0; d.sup = s.id; }
            d.vx *= 0.7;
          }
        }
      }
      return true;
    });
  }
  function coletar(d) {
    som('moeda');
    if (d.visual) {
      // já somado durante o descanso: aqui só a sensação de coletar
      numero(W.tam.x, W.tam.y - W.tam.h - (d.tipo === 'lumes' ? 6 : 20), '+' + LV.fmt(d.q) + (d.nome ? ' ' + d.nome : ''), d.tipo === 'lumes' ? 'lumes' : 'mat', d.cor);
      emit('coletaVisual', d);
      return;
    }
    if (d.tipo === 'lumes') { S.lumes += d.q; numero(W.tam.x, W.tam.y - W.tam.h - 6, '+' + LV.fmt(d.q), 'lumes'); }
    else { S.mats[d.mat] = (S.mats[d.mat] || 0) + d.q; numero(W.tam.x, W.tam.y - W.tam.h - 20, '+' + d.q + ' ' + LV.nomeQtd(LV.MAT[d.mat], d.q), 'mat', LV.MAT[d.mat].cor); }
  }

  function updFx(dt) {
    const T = W.tam;
    W.fx = W.fx.filter((f) => {
      f.t += dt;
      if (f.tipo === 'alma') {
        const tx = T.x, ty = T.y - 34, dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1;
        if (f.t > 0.35) { f.vx += (dx / d) * 1400 * dt; f.vy += (dy / d) * 1400 * dt; f.vx *= 0.92; f.vy *= 0.92; }
        else f.vy += 120 * dt;
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.t > 0.4 && d < 18) return false;
      }
      return f.t < f.vida;
    });
    W.parts = W.parts.filter((p) => {
      p.t += dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.g && p.y > G + 2) { p.y = G + 2; p.vy *= -0.3; p.vx *= 0.6; }
      return p.t < p.vida;
    });
    W.nums = W.nums.filter((n) => (n.t += dt) < n.vida);
  }

  /* --- partículas de ambiente (coordenadas de tela) --- */
  function novaAmb(tipo, vw, inicio) {
    const p = { x: Math.random() * vw, y: inicio ? Math.random() * 520 : -10, ph: Math.random() * 10, s: Math.random() };
    if (tipo === 'chuva') { p.vy = 520 + Math.random() * 260; p.vx = -90; p.len = 10 + Math.random() * 14; if (inicio) p.y = Math.random() * 460; }
    else if (tipo === 'esporos') { p.vy = -(8 + Math.random() * 18); p.vx = 0; if (!inicio) p.y = 540; }
    else if (tipo === 'brasas') { p.cinza = Math.random() < 0.35; p.vy = p.cinza ? 20 + Math.random() * 25 : -(25 + Math.random() * 45); p.vx = 0; if (!inicio) p.y = p.cinza ? -10 : 540; }
    else { p.vx = 0; p.vy = 0; p.y = 40 + Math.random() * 400; }
    return p;
  }
  function updAmb(dt) {
    const vw = game.viewW, tipo = W.def.part;
    if (!W.amb || W.ambW !== Math.round(vw)) {
      const n = { vagalume: 34, esporos: 60, chuva: 150, brilho: 46, brasas: 70 }[tipo] || 30;
      W.amb = []; for (let i = 0; i < n; i++) W.amb.push(novaAmb(tipo, vw, true));
      W.ambW = Math.round(vw); W.ambCam = W.cam;
    }
    const dc = W.cam - W.ambCam; W.ambCam = W.cam;
    for (const p of W.amb) {
      p.x -= dc * 0.9;
      if (tipo === 'vagalume') { p.x += Math.sin(W.t * 0.6 + p.ph) * 14 * dt; p.y += Math.cos(W.t * 0.5 + p.ph * 1.3) * 11 * dt; }
      else if (tipo !== 'brilho') { p.x += (p.vx + (tipo === 'chuva' ? 0 : Math.sin(W.t + p.ph) * 10)) * dt; p.y += p.vy * dt; }
      if (p.x < -30) p.x += vw + 60; else if (p.x > vw + 30) p.x -= vw + 60;
      if (tipo === 'chuva' && p.y > G + 6) {
        if (Math.random() < 0.25) particula({ x: p.x + W.cam, y: G + 2, vx: LV.rand(-30, 30), vy: LV.rand(-80, -40), g: 300, vida: 0.25, t: 0, r: 1, cor: W.def.pal.luz, tipo: 'gota' });
        Object.assign(p, novaAmb(tipo, vw, false), { x: Math.random() * (vw + 120) });
      } else if ((tipo === 'esporos' || (tipo === 'brasas' && !p.cinza)) && p.y < -10) Object.assign(p, novaAmb(tipo, vw, false));
      else if (tipo === 'brasas' && p.cinza && p.y > 540) Object.assign(p, novaAmb(tipo, vw, false));
    }
  }

  /* =================== PASSO =================== */
  game.step = function (dt) {
    if (!W || !S) return;
    W.t += dt; S.st.tempo += dt;
    const ds = domStats();
    statusAliados(dt);
    updTamer(dt, ds);
    updPets(dt);
    updIni(dt);
    updProj(dt);
    updPerigos(dt);
    if (W.flashTela > 0) W.flashTela -= dt * 1.4;
    updDrops(dt, ds);
    updLant(dt, ds);
    updFx(dt);
    updAmb(dt);
    updAreas(dt);
    for (const a of W.pets.concat([W.tam])) if (a.escudoT > 0) { a.escudoT -= dt; if (a.escudoT <= 0) a.escudo = 0; }
    if (!W.chefe) {
      // cada ninho repõe suas criaturas, uma de cada vez
      for (const z of W.zonas) {
        let vivos = 0;
        for (const e of W.ini) if (e.zona === z.id && e.fuga == null) vivos++;
        if (vivos >= z.cap) continue;
        z.recarga -= dt;
        if (z.recarga <= 0) { spawnInimigo(z); z.recarga = LV.rand(2.5, 4.5); }
      }
    } else {
      // desafio aceito: o Guardião vira o alvo do herói e de todos os pets (em qualquer modo), sem precisar clicar nele
      const b = W.chefe.e;
      if (alvoValido(b) && !(W.foco && alvoValido(W.foco))) W.foco = b;
      W.chefe.tempo -= dt;
      if (W.chefe.tempo <= 0 && W.chefe.e.hp > 0) falharChefe('tempo');
      else if (W.pets.length && W.pets.every((p) => p.desm > 0)) falharChefe('pets');
    }
    W.evoT = (W.evoT || 0) + dt;
    if (W.evoT > 1) { W.evoT = 0; conferirEvolucoes(); conferirConquistas(); verCriaturas(); }
    const alvoCam = LV.clamp(W.tam.x - game.viewW * 0.42, 0, Math.max(0, W.w - game.viewW));
    W.cam += (alvoCam - W.cam) * Math.min(1, dt * 4);
    W.shake = Math.max(0, W.shake - dt * 22);
    W.taxaT += dt;
    if (W.taxaT > 20) {
      W.taxaT = 0;
      const agora = performance.now();
      W.killLog = W.killLog.filter((t) => agora - t < 120000);
      const real = (agora - W.inicioReal) / 1000;
      if (real > 60 && W.killLog.length) {
        const r = Math.min(3, W.killLog.length / Math.min(120, real) / Math.max(1, S.op.vel));
        S.st.taxa = S.st.taxa ? S.st.taxa * 0.6 + r * 0.4 : r;
      }
    }
  };

  /* inimigo sob o ponteiro (qualquer um que possa ser atacado) */
  /* volta do descanso: espalha em volta do herói tudo o que foi ganho (só visual, já está somado) e puxa aos poucos */
  game.chuvaColeta = function (g) {
    if (!W) return 0;
    const T = W.tam, itens = [];
    const lumes = Math.max(0, Math.floor(g.lumes || 0));
    if (lumes > 0) {
      const n = LV.clamp(Math.ceil(Math.sqrt(lumes) * 0.9), 8, 46);
      let resto = lumes;
      for (let i = 0; i < n; i++) { const q = i === n - 1 ? resto : Math.max(1, Math.floor(lumes / n)); resto -= q; if (q > 0) itens.push({ tipo: 'lumes', q }); }
    }
    for (const k in g.mats || {}) if (g.mats[k] > 0) itens.push({ tipo: 'mat', mat: k, q: g.mats[k], nome: LV.nomeQtd(LV.MAT[k], g.mats[k]), cor: LV.MAT[k].cor });
    for (const k in g.moedas || {}) if (g.moedas[k] > 0) { const m = LV.moeda(k); itens.push({ tipo: 'mat', mat: 'musgo', q: g.moedas[k], nome: LV.nomeQtd(m, g.moedas[k]), cor: m.cor }); }
    for (let i = itens.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [itens[i], itens[j]] = [itens[j], itens[i]]; }
    itens.forEach((it, i) => {
      const a = (i / itens.length) * TAU * 2.3 + LV.rand(-0.3, 0.3), r = LV.rand(80, 260);
      W.drops.push(Object.assign(it, {
        x: LV.clamp(T.x + Math.cos(a) * r, 20, W.w - 20), y: Math.min(G - 12, T.y - 40 + Math.sin(a) * r * 0.42),
        vx: 0, vy: 0, idade: -0.35 - i * (0.8 / Math.max(1, itens.length)), sup: 'flutua', visual: true,
      }));
    });
    for (let k = 0; k < 16; k++) fx({ tipo: 'alma', x: T.x + LV.rand(-240, 240), y: T.y - LV.rand(40, 200), vx: LV.rand(-40, 40), vy: LV.rand(-60, 0), cor: '#ffe3a3', vida: 3 });
    if (g.niveis > 0) fx({ tipo: 'anel', x: T.x, y: T.y - 30, r0: 10, r1: 120, cor: '#ffe3a3', vida: 1.1 });
    return itens.reduce((s, it) => s + (it.tipo === 'lumes' ? it.q : 0), 0);
  };
  game.inimigoEm = function (x, y, raio) {
    if (!W) return null;
    let best = null, bd = raio || 40;
    for (const e of W.ini) {
      if (!alvoValido(e)) continue;
      const d = Math.hypot(e.x - x, alvoY(e) - y) - e.h * (e.tipo === 'chefe' ? 0.35 : 0.42);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };
  /* clique esquerdo: só o herói ataca; clique direito (todos=true): herói e pets atacam, depois os pets voltam ao modo */
  game.atacarAlvo = function (e, todos) {
    if (!W || !e || !alvoValido(e) || W.tam.caido > 0) return false;
    const T = W.tam;
    T.foco = e; T.alvoX = null; T.destino = null; T.manual = Math.max(T.manual, 2);
    if (todos) { W.foco = e; W.pets.forEach((p) => { if (p.desm <= 0) p.alvo = e; }); }
    else if (W.foco && W.foco !== e) W.foco = null;
    W.marca = { e, todos: !!todos, t: 0 };
    if (T.cd > 0.35) T.cd = 0.35;
    return true;
  };
  game.modoPets = function (m) {
    if (!S || !LV.MODOS[m]) return false;
    S.op.modoPets = m;
    if (W) W.pets.forEach((p) => { if (p.alvo !== W.foco) p.alvo = null; });
    emit('opcoes');
    return true;
  };

  game.irPara = function (x, y) {
    if (!W) return;
    const T = W.tam;
    T.foco = null; W.foco = null;
    if (y != null && T.sup >= 0 && !T.esc) {
      // clique numa plataforma: anda até lá usando a rota
      const s = N().sobre(W.L, x, y - 30);
      if (s && s.id !== T.sup && Math.abs(s.y - y) < 60) { T.destino = { sup: s.id, x }; T.manual = 0; T.alvoX = null; return; }
    }
    T.alvoX = LV.clamp(x, 30, W.w - 30); T.manual = 4; T.destino = null;
  };

  /* =================== RENDERIZAÇÃO =================== */
  function sombra(c, x, y, larg, voa) {
    c.fillStyle = voa ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.45)';
    c.beginPath(); c.ellipse(x, y + 2, Math.max(6, larg * 0.42), Math.max(2, larg * 0.09), 0, 0, TAU); c.fill();
  }
  function texto(c, t, x, y, cor, tam, peso) {
    c.font = (peso || 700) + ' ' + tam + 'px "Alegreya Sans", system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(2.5, tam * 0.22); c.strokeStyle = 'rgba(3,4,8,0.85)'; c.lineJoin = 'round';
    c.strokeText(t, x, y); c.fillStyle = cor; c.fillText(t, x, y);
  }
  function larguraDe(e) {
    const im = e.img && SPR().get(e.img);
    return im ? (im.naturalWidth / im.naturalHeight) * e.h : e.h;
  }
  function chaoDe(e) { return e.voa || e.sup < 0 ? N().chaoSob(W.L, e.x, e.y - 2) : e.y; }

  function desenharCriatura(c, e, o) {
    const ok = SPR().desenhar(c, e.img, Object.assign({ x: e.x, y: e.y, h: e.h, face: e.face, voa: e.voa, flip: e.flip }, o));
    if (!ok) art.drawCreature(c, Object.assign({ x: e.x, y: e.y, corpo: e.corpo, pal: e.pal, est: e.est, s: e.tipo === 'chefe' ? e.s : 1, face: e.face, boss: e.tipo === 'chefe' }, o));
  }
  function desenharHeroi(c, T) {
    const rank = LV.rankIdx(S.dom.nivel), R = LV.RANKS[rank], t = W.t;
    let q = LV.HEROI.parado;
    if (T.sup < 0 && !T.esc) q = LV.HEROI.pulando;
    else if (T.atk > 0.35) q = LV.HEROI.lanterna;
    else if (T.mov > 0.3) q = Math.floor(t * 6.5) % 2 ? LV.HEROI.andando : LV.HEROI.parado;
    const caido = T.caido > 0;
    const o = { x: T.x, y: T.y, h: T.h, face: T.face, t, mov: T.sup < 0 && !T.esc ? 0 : T.mov, flash: caido ? 0.5 : T.flash * 0.8, alpha: caido ? Math.max(0, (T.caido - 1.2) / 2) : 1 };
    const ok = SPR().desenhar(c, q, o);
    if (!ok) { art.drawTamer(c, { x: T.x, y: T.y, face: T.face, t, mov: T.mov, rank, flash: o.flash, alpha: o.alpha, atk: T.atk }); return; }
    if (caido) return;
    const fl = 0.86 + 0.14 * Math.sin(t * 13) * Math.sin(t * 7.3) + T.atk * 0.5;
    const lx = T.x + T.face * T.h * 0.36, ly = T.y - T.h * 0.84;
    art.glow(c, lx, ly, 60 * fl * (1 + rank * 0.07), '#ffc47a', 0.42);
    art.glow(c, lx, ly, 14, '#fff3d0', 0.7);
    if (rank >= 4) for (let k = 0; k < 3; k++) { const a = t * 1.5 + k * TAU / 3; art.glow(c, T.x + Math.cos(a) * 18, T.y - T.h * 0.75 + Math.sin(a) * 6, 8, R.brilho, 0.8); }
    if (rank >= 5) { c.beginPath(); c.ellipse(T.x, T.y - T.h - 6, 10, 3, 0, 0, TAU); c.strokeStyle = R.brilho; c.lineWidth = 1.6; c.stroke(); art.glow(c, T.x, T.y - T.h - 6, 18, R.brilho, 0.6); }
  }

  function desenharEntidades(c) {
    const T = W.tam, t = W.t, lista = [];
    for (const e of W.ini) lista.push({ z: e.voa ? 2 : 1, e, k: 'i' });
    for (const p of W.pets) lista.push({ z: p.voa ? 2.2 : 1.2, e: p, k: 'p' });
    lista.push({ z: 1.5, e: T, k: 't' });
    lista.sort((a, b) => a.z - b.z);
    for (const it of lista) {
      const e = it.e;
      if (it.k === 'i' && e.capt && e.capt.fase === 'preso') continue;
      if (it.k === 't' && T.caido > 0) continue;
      sombra(c, e.x, chaoDe(e), it.k === 't' ? 34 : larguraDe(e) * 0.8, e.voa || (e.sup < 0 && !e.esc));
    }
    desenharFoco(c, t);
    for (const it of lista) {
      const e = it.e;
      if (it.k === 'i') {
        if (e.capt && e.capt.fase === 'preso') continue;
        let alpha = 1, yo = 0;
        const nascT = e.tipo === 'chefe' ? 1.2 : 0.6;
        if (e.nasc > 0) { const k = 1 - e.nasc / nascT; alpha = k; yo = (1 - k) * 18; }
        if (e.fuga != null) alpha = Math.max(0, e.fuga / 0.8);
        const lunge = e.atkA > 0 ? Math.sin(e.atkA * Math.PI) * 8 * e.face : 0;
        let flash = e.flash * 0.85, jit = 0;
        if (e.carga > 0) { flash = Math.max(flash, 0.25 + 0.25 * Math.sin(t * 40)); jit = Math.sin(t * 60) * 2; }
        if (e.capt && e.capt.fase === 'voo') flash = Math.max(flash, 0.5);
        if (e.tipo === 'chefe') art.glow(c, e.x, e.voa ? e.y : e.y - e.h * 0.45, e.h * 0.75, e.pal.g, 0.22 + 0.08 * Math.sin(t * 3));
        c.save(); c.translate(lunge + jit, yo);
        if (e.sugar > 0) {
          // sendo puxada para dentro da lanterna
          const k = e.sugar, C = game.captura;
          const lx = C ? C.x : e.x, ly = C ? C.y : alvoY(e);
          const hs = e.h * (1 - 0.9 * k);
          desenharCriatura(c, Object.assign({}, e, { x: LV.lerp(e.x, lx, k * k), y: LV.lerp(e.voa ? e.y : e.y, ly + hs * 0.5, k * k), h: hs }), { t: t + e.t0, flash: Math.min(1, k * 1.6), alpha: 1 - k * 0.5, mov: 0 });
          art.glow(c, lx, ly, 30 + 40 * k, e.pal.g, 0.6 * k);
        } else desenharCriatura(c, e, { t: t + e.t0, flash, alpha, mov: e.atord > 0 ? 0 : e.mov, atk: e.atkA });
        c.restore();
        if (e.canto && !(e.sugar > 0)) desenharCanto(c, e, t, alpha);
        desenharEstados(c, e, t);
        if (e.carga > 0) art.glow(c, e.x, alvoY(e), e.cargaMax > 1 ? 150 : 100, e.ataqueCor || e.pal.g, 0.38 * (1 - e.carga / (e.cargaMax || 0.75)) + 0.08);
      } else if (it.k === 'p') {
        const lunge = e.estilo === 'investida' && e.atkA > 0 ? Math.sin(e.atkA * Math.PI) * 13 * e.face : 0;
        const desm = e.desm > 0;
        art.glow(c, e.x, chaoDe(e) + 1, 22 * F.escala[e.est], e.pal.g, desm ? 0.05 : 0.13);
        if (e.ref && e.ref.especial && !desm) { art.glow(c, e.x, alvoY(e), e.h * 0.95, '#ffd36b', 0.26 + 0.1 * Math.sin(t * 3 + e.uid)); if (Math.random() < 0.15) particula({ x: e.x + LV.rand(-14, 14), y: alvoY(e) + LV.rand(-12, 12), vx: 0, vy: -24, g: 0, vida: 0.7, t: 0, r: 1.6, cor: '#ffe7a0', tipo: 'luz' }); }
        c.save(); c.translate(lunge, 0);
        desenharCriatura(c, e, { t: t + e.t0, flash: e.flash * 0.8, alpha: desm ? 0.35 : 1, mov: e.mov, atk: e.atkA, sy: desm && !e.voa ? 0.85 : 1 });
        c.restore();
        desenharProtecao(c, e, t);
      } else { desenharHeroi(c, T); desenharProtecao(c, T, t); }
    }
    if (game.captura && game.captura.fase === 'mira') desenharMira(c, t);
    for (const e of W.ini) barraIni(c, e);
    for (const p of W.pets) barraPet(c, p);
  }
  /* alvo escolhido pelo clique: anel dourado (só o herói) ou vermelho (herói e pets) aos pés da criatura */
  function desenharFoco(c, t) {
    const T = W.tam;
    const alvos = [];
    if (W.foco && alvoValido(W.foco)) alvos.push([W.foco, '#ff7a5c']);
    if (T.foco && alvoValido(T.foco) && T.foco !== W.foco) alvos.push([T.foco, '#ffd38a']);
    for (const [e, cor] of alvos) {
      const yc = chaoDe(e), lw = Math.max(26, larguraDe(e) * 0.55);
      const ent = W.marca && W.marca.e === e ? Math.max(0, 1 - W.marca.t * 3) : 0;
      c.save();
      c.strokeStyle = cor; c.lineWidth = 2; c.globalAlpha = 0.75 + 0.25 * Math.sin(t * 6);
      c.setLineDash([7, 5]); c.lineDashOffset = -t * 24;
      c.beginPath(); c.ellipse(e.x, yc + 2, lw * (1 + ent * 0.6), lw * 0.24 * (1 + ent * 0.6), 0, 0, TAU); c.stroke();
      c.setLineDash([]); c.globalAlpha = 0.9;
      // setinha acima da cabeça
      const ty = topoDe(e) - 20 + Math.sin(t * 5) * 3;
      c.fillStyle = cor; c.beginPath(); c.moveTo(e.x - 6, ty - 8); c.lineTo(e.x + 6, ty - 8); c.lineTo(e.x, ty); c.closePath(); c.fill();
      c.restore();
    }
    if (W.marca) { W.marca.t += 1 / 60; if (W.marca.t > 2) W.marca = null; }
    // tutorial: seta grande e pulsante sobre a criatura enquanto é ela que o jogador precisa tocar
    const tu = game.tutorial;
    if (tu && (tu.passo === 'atacar' || tu.passo === 'mirar') && tu.alvo.hp > 0 && !tu.alvo.capt) {
      const e = tu.alvo, y = topoDe(e) - 30 + Math.sin(t * 5) * 6;
      c.save();
      c.fillStyle = '#ffe3a3'; c.shadowColor = '#ffd38a'; c.shadowBlur = 14;
      c.beginPath(); c.moveTo(e.x - 13, y - 16); c.lineTo(e.x + 13, y - 16); c.lineTo(e.x, y); c.closePath(); c.fill();
      c.restore();
    }
  }
  /* avisos no chão, perigos ativos e estados dos aliados (preso, atordoado, envenenado) */
  /* o canto da Matriarca: anéis de luz saindo da boca (mais fortes enquanto ela carrega um ataque) */
  function desenharCanto(c, e, t, alpha) {
    const w = larguraDe(e), f = (e.face < 0 ? -1 : 1) * (e.flip ? -1 : 1);
    const mx = e.x + f * (e.canto.x - 0.5) * w, my = e.y - (1 - e.canto.y) * e.h;
    const forte = e.carga > 0 ? 1 : 0.8, dir = f > 0 ? 0 : Math.PI;
    c.save();
    c.globalAlpha *= alpha == null ? 1 : alpha;
    art.glow(c, mx, my, 30, '#f3d6ff', 0.35 * forte);
    c.shadowColor = '#d9a8ff'; c.shadowBlur = 8;
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.7 + k / 3) % 1, r = 10 + p * 78;
      c.beginPath(); c.arc(mx, my, r, dir - 0.62, dir + 0.62);
      c.strokeStyle = art.rgba('#f4dcff', (1 - p) * 0.9 * forte);
      c.lineWidth = 1.5 + 3.5 * (1 - p); c.lineCap = 'round'; c.stroke();
    }
    c.restore();
  }
  function desenharChefeFx(c, t) {
    for (const a of W.alertas || []) {
      const k = a.t / a.vida, pulso = 0.55 + 0.45 * Math.sin(t * 14);
      c.save();
      if (a.tipo === 'circulo') {
        c.beginPath(); c.ellipse(a.x, a.y, a.r, a.r * 0.24, 0, 0, TAU);
        c.fillStyle = art.rgba('#ff4a3a', 0.12 + 0.22 * k); c.fill();
        c.strokeStyle = art.rgba(a.cor, 0.5 + 0.4 * pulso); c.lineWidth = 2; c.stroke();
        c.beginPath(); c.ellipse(a.x, a.y, a.r * k, a.r * 0.24 * k, 0, 0, TAU); c.strokeStyle = art.rgba('#ffffff', 0.5); c.lineWidth = 1; c.stroke();
      } else if (a.tipo === 'faixa') {
        c.fillStyle = art.rgba('#ff4a3a', 0.1 + 0.2 * k);
        c.fillRect(a.x - a.r * 3, a.y - 8, a.r * 6, 10);
        c.strokeStyle = art.rgba(a.cor, 0.6 * pulso); c.lineWidth = 2; c.strokeRect(a.x - a.r * 3, a.y - 8, a.r * 6, 10);
      } else if (a.tipo === 'linha') {
        c.strokeStyle = art.rgba('#ff4a3a', 0.35 + 0.4 * k); c.lineWidth = 6; c.setLineDash([14, 10]);
        c.beginPath(); c.moveTo(a.x, a.y - 30); c.lineTo(a.x1, a.y - 30); c.stroke();
      }
      c.restore();
    }
    for (const p of W.perigos || []) {
      if (p.tipo === 'ondaChao') {
        const gy = N().chaoSob(W.L, p.x, G - 2);
        if (p.estilo === 'raiz') {
          for (let i = 0; i < 4; i++) {
            const bx = p.x - p.dir * i * 16, h = 46 - i * 9;
            c.beginPath(); c.moveTo(bx - 9, gy); c.lineTo(bx, gy - h); c.lineTo(bx + 9, gy); c.closePath();
            c.fillStyle = '#3d2c1c'; c.fill(); c.strokeStyle = art.rgba(p.cor, 0.9); c.lineWidth = 1.5; c.stroke();
          }
        } else {
          c.save(); c.globalCompositeOperation = 'lighter';
          c.beginPath(); c.moveTo(p.x - p.dir * 70, gy); c.quadraticCurveTo(p.x - p.dir * 10, gy - 70, p.x + p.dir * 18, gy);
          c.fillStyle = art.rgba(p.cor, 0.45); c.fill(); c.strokeStyle = art.rgba('#e8fbff', 0.8); c.lineWidth = 2; c.stroke();
          c.restore();
        }
      } else if (p.tipo === 'gas' || p.tipo === 'fogo') {
        const al = Math.min(1, p.t / 0.4, (p.dur - p.t) / 0.5);
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * TAU + t * (p.tipo === 'gas' ? 0.7 : 2.4);
          art.glow(c, p.x + Math.cos(ang) * p.r * 0.45, p.y - 30 + Math.sin(ang * 1.4) * 14, p.r * 0.7, p.cor, (p.tipo === 'gas' ? 0.2 : 0.3) * al);
        }
        if (Math.random() < 0.5) particula({ x: p.x + LV.rand(-p.r, p.r) * 0.8, y: p.y - LV.rand(0, 30), vx: LV.rand(-8, 8), vy: LV.rand(-50, -15), g: 0, vida: 0.8, t: 0, r: 2.5, cor: p.cor, tipo: 'luz' });
      }
    }
    for (const a of [W.tam].concat(W.pets)) {
      if (a.hp <= 0 || (a === W.tam && a.caido > 0)) continue;
      const top = topoDe(a);
      if (a.atordA > 0) for (let i = 0; i < 3; i++) { const ang = t * 6 + (i * TAU) / 3; art.glow(c, a.x + Math.cos(ang) * 12, top - 8 + Math.sin(ang) * 4, 6, '#fff6c0', 0.9); }
      if (a.preso > 0) { c.save(); c.strokeStyle = art.rgba('#8fe07f', 0.85); c.lineWidth = 2; c.beginPath(); c.ellipse(a.x, chaoDe(a) - 3, 16, 5, 0, 0, TAU); c.stroke(); c.restore(); }
      if (a.veneno && Math.random() < 0.15) particula({ x: a.x + LV.rand(-8, 8), y: top + 6, vx: 0, vy: -30, g: 0, vida: 0.6, t: 0, r: 2.2, cor: '#a8e05a', tipo: 'luz' });
    }
  }
  function desenharEstados(c, e, t) {
    if (e.hp <= 0 || e.capt) return;
    const cy = alvoY(e), top = topoDe(e);
    if (e.dots && e.dots.length) {
      for (const d of e.dots) {
        const fogo = d.el === 'brasa';
        art.glow(c, e.x + Math.sin(t * 9 + e.t0) * 6, cy + 4, e.h * 0.45, fogo ? '#ff7a2a' : '#b6ff5a', 0.35 + 0.15 * Math.sin(t * 14));
        if (Math.random() < 0.25) particula({ x: e.x + LV.rand(-10, 10), y: cy + LV.rand(-6, 8), vx: LV.rand(-8, 8), vy: LV.rand(-60, -30), g: 0, vida: 0.5, t: 0, r: 1.8, cor: fogo ? '#ffb35c' : '#c8ff7a', tipo: 'luz' });
      }
    }
    if (e.atord > 0) {
      for (let k = 0; k < 3; k++) {
        const a = t * 5 + (k * TAU) / 3;
        art.glow(c, e.x + Math.cos(a) * 12, top - 6 + Math.sin(a) * 4, 6, '#fff3a0', 0.9);
      }
    }
    if (e.fraco > 0) art.glow(c, e.x, cy, e.h * 0.5, '#8a5cff', 0.22);
    if (e.lento > 0 || e.vuln > 0) {
      c.save(); c.globalAlpha = 0.55; c.strokeStyle = '#ffd6f2'; c.lineWidth = 1;
      const r = Math.max(14, e.h * 0.35);
      c.beginPath();
      for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; c.moveTo(e.x, cy); c.lineTo(e.x + Math.cos(a) * r, cy + Math.sin(a) * r); }
      c.arc(e.x, cy, r * 0.55, 0, TAU); c.stroke(); c.restore();
    }
    if (e.prov && e.provT > 0) art.glow(c, e.x, top - 4, 7, '#f3a6ff', 0.8);
  }
  function desenharProtecao(c, a, t) {
    if (a.escudo > 0) {
      const r = (a.h || 40) * 0.62, cy = alvoY(a);
      c.save();
      c.beginPath(); c.arc(a.x, cy, r, 0, TAU);
      c.fillStyle = 'rgba(127,227,255,0.10)'; c.fill();
      c.strokeStyle = 'rgba(160,236,255,' + (0.45 + 0.2 * Math.sin(t * 4)) + ')'; c.lineWidth = 1.6; c.stroke();
      c.restore();
    }
    if (a.reducao > 0) art.glow(c, a.x, alvoY(a), (a.h || 40) * 0.8, '#f3a6ff', 0.25 + 0.1 * Math.sin(t * 6));
  }
  function desenharMira(c, t) {
    const vw = game.viewW, cam = W.cam;
    c.save();
    c.fillStyle = 'rgba(2,3,6,0.55)'; c.fillRect(cam - 20, -200, vw + 40, LV.VIEW_H + 400);
    c.restore();
    const hov = game.miraHover && game.miraHover.hp > 0 ? game.miraHover : null;
    const lista = selvagensNaTela();
    for (const e of lista) {
      const pul = 0.6 + 0.4 * Math.sin(t * 6 + e.id), foco = e === hov;
      art.glow(c, e.x, alvoY(e), e.h * (foco ? 1.2 : 0.9), '#ffe3a3', (foco ? 0.6 : 0.3) * pul);
      desenharCriatura(c, e, { t: t + e.t0, flash: 0, alpha: hov && !foco ? 0.75 : 1, mov: 0 });
      const r = Math.max(22, e.h * 0.55) * (foco ? 1.15 : 1);
      c.save(); c.strokeStyle = 'rgba(255,227,163,' + (foco ? 0.95 : 0.35 + 0.35 * pul) + ')'; c.lineWidth = foco ? 2.5 : 1.5;
      c.setLineDash([6, 5]); c.lineDashOffset = -t * 20;
      c.beginPath(); c.arc(e.x, alvoY(e), r, 0, TAU); c.stroke(); c.restore();
      if (!foco) {
        const ch = Math.round(chanceCaptura(e) * 100);
        texto(c, ch + '%', e.x, topoDe(e) - 4, ch >= 40 ? '#9be28f' : ch >= 20 ? '#ffd36b' : '#ff9a8a', 10);
      }
    }
    if (hov) {
      const ch = Math.round(chanceCaptura(hov) * 100), y = topoDe(hov) - 22;
      c.save(); c.fillStyle = 'rgba(6,8,12,0.82)'; c.strokeStyle = 'rgba(255,227,163,0.55)'; c.lineWidth = 1;
      c.beginPath(); c.roundRect ? c.roundRect(hov.x - 74, y - 16, 148, 34, 6) : c.rect(hov.x - 74, y - 16, 148, 34); c.fill(); c.stroke(); c.restore();
      texto(c, hov.nome + LV.t(' · Nv ') + hov.lv, hov.x, y - 2, '#ffe9b5', 12);
      texto(c, LV.t('chance base ') + ch + '%', hov.x, y + 12, ch >= 40 ? '#9be28f' : ch >= 20 ? '#ffd36b' : '#ff9a8a', 11);
    }
    desenharHeroi(c, W.tam);
  }
  function barraIni(c, e) {
    if (e.tipo === 'chefe' || e.hp <= 0 || e.capt || e.nasc > 0 || e.fuga != null || game.captura) return;
    const top = topoDe(e) - (e.voa ? 0 : 6);
    const w = 34, x = e.x - w / 2;
    c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(x - 1, top - 1, w + 2, 5);
    c.fillStyle = e.tipo === 'selvagem' ? LV.EL[e.el].cor : '#e0654f';
    c.fillRect(x, top, w * Math.max(0, e.hp / e.hpMax), 3);
    const sel = e.tipo === 'selvagem';
    texto(c, LV.t('Nv ') + e.lv, e.x + (sel ? 5 : 0), top - 8, '#d8dde4', 10);
    if (sel) {
      c.save(); c.translate(e.x - 13, top - 8); c.rotate(Math.PI / 4);
      c.fillStyle = LV.EL[e.el].cor; c.fillRect(-2.6, -2.6, 5.2, 5.2);
      c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 1; c.strokeRect(-2.6, -2.6, 5.2, 5.2);
      c.restore();
    }
  }
  function barraPet(c, p) {
    if (p.desm > 0) {
      const k = 1 - p.desm / 10, cy = topoDe(p) - 10;
      c.beginPath(); c.arc(p.x, cy, 6, -Math.PI / 2, -Math.PI / 2 + k * TAU);
      c.strokeStyle = p.pal.g; c.lineWidth = 2; c.stroke();
      return;
    }
    if (p.hp >= p.hpMax) return;
    const by = p.voa ? p.y + p.h * 0.5 + 4 : p.y + 8, w = 26, x = p.x - w / 2;
    c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(x - 1, by - 1, w + 2, 4);
    c.fillStyle = '#8fe08a'; c.fillRect(x, by, w * Math.max(0, p.hp / p.hpMax), 2);
  }

  function desenharEfeitos(c) {
    const t = W.t, op = c.globalCompositeOperation;
    for (const d of W.drops) {
      if (d.tipo === 'lumes') {
        art.glow(c, d.x, d.y, 12, '#ffd36b', 0.55);
        c.save(); c.translate(d.x, d.y); c.rotate(t * 3 + d.x * 0.1); c.scale(1, 1.3);
        c.beginPath(); c.moveTo(0, -4); c.lineTo(3.2, 0); c.lineTo(0, 4); c.lineTo(-3.2, 0); c.closePath();
        c.fillStyle = '#f6d98a'; c.fill(); c.strokeStyle = art.INK; c.lineWidth = 1; c.stroke();
        c.restore();
      } else {
        const cor = d.cor || LV.MAT[d.mat].cor;
        art.glow(c, d.x, d.y, 16, cor, 0.7);
        c.beginPath(); c.arc(d.x, d.y, 3.6, 0, TAU); c.fillStyle = cor; c.fill(); c.strokeStyle = art.INK; c.lineWidth = 1; c.stroke();
      }
    }
    desenharChefeFx(c, t);
    // áreas de habilidades (nuvem de esporos, teia)
    for (const a of W.areas) {
      const k = Math.min(1, a.t / 0.5), vida = Math.min(1, (a.dur - a.t) / 0.3);
      const al = Math.min(k, vida);
      if (a.tipo === 'nuvem') {
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU + t * 0.6;
          art.glow(c, a.x + Math.cos(ang) * a.r * 0.5, a.y - 26 + Math.sin(ang * 1.3) * 12, a.r * 0.75, a.cor, 0.16 * al);
        }
        if (Math.random() < 0.4) particula({ x: a.x + LV.rand(-a.r, a.r) * 0.8, y: a.y - LV.rand(0, 40), vx: LV.rand(-10, 10), vy: LV.rand(-25, -8), g: 0, vida: 0.9, t: 0, r: 2, cor: a.cor, tipo: 'luz' });
      } else if (a.tipo === 'teia') {
        c.save(); c.globalAlpha = 0.6 * al; c.strokeStyle = a.cor; c.lineWidth = 1.1;
        c.beginPath();
        for (let i = 0; i < 8; i++) { const ang = (i * Math.PI) / 4; c.moveTo(a.x, a.y); c.lineTo(a.x + Math.cos(ang) * a.r, a.y + Math.sin(ang) * a.r * 0.45); }
        for (const f of [0.35, 0.65, 0.95]) { c.moveTo(a.x + a.r * f, a.y); c.ellipse(a.x, a.y, a.r * f, a.r * f * 0.45, 0, 0, TAU); }
        c.stroke(); c.restore();
        art.glow(c, a.x, a.y, a.r, a.cor, 0.12 * al);
      }
    }
    // lanterna da captura
    const C = game.captura;
    if (C && C.fase !== 'mira' && C.fase !== 'partiu') {
      const pul = C.fase === 'minijogo' ? 0.8 + 0.4 * Math.sin(t * 7) : 1;
      if (C.alvo && (C.fase === 'balanca' || C.fase === 'minijogo')) art.glow(c, C.x, C.y, 44, C.alvo.pal.g, 0.4 * pul);
      art.lanterna(c, C.x, C.y, C.rot || 0, 1.3 * pul);
    }
    for (const Lt of W.lant) {
      if (Lt.fase === 'voo') art.lanterna(c, Lt.x, Lt.y, Lt.t * 12, 1);
      else if (Lt.fase === 'sacode') {
        const ciclo = Lt.t % 0.63, rot = ciclo < 0.3 ? Math.sin(ciclo * 40) * 0.35 : 0;
        art.glow(c, Lt.x, Lt.y, 38, Lt.alvo.pal.g, 0.35 + 0.2 * Math.sin(t * 8));
        art.lanterna(c, Lt.x, Lt.y, rot, 1.2);
      } else if (Lt.fase === 'ok') {
        art.lanterna(c, Lt.x, Lt.y - Lt.t * 30, 0, 1.6 - Lt.t * 2);
        for (let k = 0; k < 3; k++) art.glow(c, Lt.x + (k - 1) * 14, Lt.y - 18 - Lt.t * 40, 8, '#ffe3a3', 1 - Lt.t * 2);
      }
    }
    c.globalCompositeOperation = 'lighter';
    for (const p of W.parts) {
      if (p.tipo === 'luz' || p.tipo === 'gota') art.glow(c, p.x, p.y, p.r * 3.2, p.cor, (1 - p.t / p.vida) * (p.tipo === 'gota' ? 0.4 : 0.9));
    }
    c.globalCompositeOperation = op;
    for (const p of W.parts) {
      if (p.tipo !== 'lasca') continue;
      c.save(); c.globalAlpha = 1 - p.t / p.vida; c.translate(p.x, p.y); c.rotate(p.t * 9 + p.r);
      c.fillStyle = p.cor; c.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2); c.restore();
    }
    for (const pr of W.proj) {
      if (pr.tipo === 'corvo') {
        art.glow(c, pr.x, pr.y, 16, pr.cor, 0.8);
        const a = pr.alvo ? Math.atan2(alvoY(pr.alvo) - pr.y, pr.alvo.x - pr.x) : 0, bate = Math.sin(t * 30) * 4;
        c.save(); c.translate(pr.x, pr.y); c.rotate(a);
        c.beginPath(); c.moveTo(6, 0); c.lineTo(-4, -6 - bate); c.lineTo(-1, 0); c.lineTo(-4, 6 + bate); c.closePath();
        c.fillStyle = '#120e22'; c.fill(); c.strokeStyle = pr.cor; c.lineWidth = 1; c.stroke(); c.restore();
        continue;
      }
      const big = pr.tipo === 'pulso' || pr.tipo === 'brasa';
      art.glow(c, pr.x, pr.y, big ? 22 : 15, pr.cor, 0.9);
      c.beginPath(); c.arc(pr.x, pr.y, big ? 3.4 : 2.6, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
    }
    for (const f of W.fx) {
      const k = f.t / f.vida;
      if (f.tipo === 'anel') {
        const r = LV.lerp(f.r0, f.r1, 1 - Math.pow(1 - k, 2));
        c.beginPath(); c.arc(f.x, f.y, Math.max(0.5, r), 0, TAU);
        c.strokeStyle = art.rgba(f.cor, 0.85 * (1 - k)); c.lineWidth = 3 * (1 - k) + 0.5; c.stroke();
      } else if (f.tipo === 'corte') {
        c.save(); c.translate(f.x, f.y); c.scale(f.face, 1); c.globalCompositeOperation = 'lighter';
        c.beginPath(); c.arc(-6, 0, 16, -1.1, 1.1);
        c.strokeStyle = art.rgba(f.cor, 1 - k); c.lineWidth = 4 * (1 - k) + 1; c.stroke(); c.restore();
      } else if (f.tipo === 'alma') {
        art.glow(c, f.x, f.y, 10, f.cor, 0.85);
        c.fillStyle = '#ffffff'; c.fillRect(f.x - 1, f.y - 1, 2, 2);
      } else if (f.tipo === 'feixe') {
        c.save(); c.globalCompositeOperation = 'lighter';
        c.beginPath(); c.moveTo(f.x0, f.y0); c.lineTo(f.x1, f.y1);
        c.strokeStyle = art.rgba(f.cor, 0.8 * (1 - k)); c.lineWidth = 3 * (1 - k) + 1; c.stroke(); c.restore();
        art.glow(c, f.x1, f.y1, 22, f.cor, 1 - k);
      } else if (f.tipo === 'onda') {
        const r = f.r1 * (1 - Math.pow(1 - k, 2));
        c.beginPath(); c.ellipse(f.x, f.y, Math.max(1, r), Math.max(1, r * 0.16), 0, 0, TAU);
        c.strokeStyle = art.rgba(f.cor, 0.9 * (1 - k)); c.lineWidth = 5 * (1 - k) + 1; c.stroke();
        art.glow(c, f.x, f.y, r, f.cor, 0.3 * (1 - k));
      } else if (f.tipo === 'explosao') {
        const r = f.r * (0.3 + 0.7 * (1 - Math.pow(1 - k, 3)));
        art.glow(c, f.x, f.y, r * 1.3, '#ff6a1a', 0.75 * (1 - k));
        art.glow(c, f.x, f.y, r * 0.6, '#fff0b0', 0.9 * (1 - k));
        c.beginPath(); c.arc(f.x, f.y, Math.max(1, r), 0, TAU);
        c.strokeStyle = art.rgba('#ffb35c', 0.9 * (1 - k)); c.lineWidth = 6 * (1 - k) + 1; c.stroke();
      } else if (f.tipo === 'bolha') {
        const a = f.alvo, r = (a.h || 40) * (0.3 + 0.4 * k);
        c.beginPath(); c.arc(a.x, alvoY(a), r, 0, TAU);
        c.strokeStyle = art.rgba(f.cor, 1 - k); c.lineWidth = 3 * (1 - k) + 1; c.stroke();
        art.glow(c, a.x, alvoY(a), r * 1.2, f.cor, 0.4 * (1 - k));
      } else if (f.tipo === 'vinha') {
        // chicote de vinha: curva que se estende até a ponta
        const ext = Math.min(1, k * 3), x1 = LV.lerp(f.x0, f.x1, ext), y1 = LV.lerp(f.y0, f.y1, ext);
        const cx = (f.x0 + x1) / 2, cy = Math.min(f.y0, y1) - 60 * (1 - k);
        c.save(); c.lineCap = 'round';
        c.beginPath(); c.moveTo(f.x0, f.y0); c.quadraticCurveTo(cx, cy, x1, y1);
        c.strokeStyle = art.rgba('#2f4a22', 1 - k * 0.6); c.lineWidth = 9; c.stroke();
        c.strokeStyle = art.rgba(f.cor, 0.9 * (1 - k)); c.lineWidth = 4; c.stroke();
        c.restore();
      } else if (f.tipo === 'raiz') {
        // raízes pontudas saindo do chão
        const h = 90 * Math.sin(Math.min(1, k * 2.2) * Math.PI * 0.5) * (1 - Math.max(0, k - 0.7) / 0.3);
        c.save();
        for (let i = -2; i <= 2; i++) {
          const bx = f.x + i * 14, hh = h * (1 - Math.abs(i) * 0.18);
          c.beginPath(); c.moveTo(bx - 8, f.y); c.lineTo(bx + i * 4, f.y - hh); c.lineTo(bx + 8, f.y); c.closePath();
          c.fillStyle = '#3d2c1c'; c.fill(); c.strokeStyle = art.rgba(f.cor, 0.9); c.lineWidth = 1.5; c.stroke();
        }
        c.restore();
      } else if (f.tipo === 'coluna') {
        // pilar de luz caindo do alto
        const al = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75, w = f.larg * (0.6 + 0.4 * al);
        c.save(); c.globalCompositeOperation = 'lighter';
        const gr = c.createLinearGradient(0, f.y - 520, 0, f.y);
        gr.addColorStop(0, art.rgba(f.cor, 0)); gr.addColorStop(0.7, art.rgba(f.cor, 0.55 * al)); gr.addColorStop(1, art.rgba('#ffffff', 0.9 * al));
        c.fillStyle = gr; c.fillRect(f.x - w / 2, f.y - 520, w, 520);
        c.restore();
        art.glow(c, f.x, f.y - 10, 60, f.cor, 0.8 * al);
      } else if (f.tipo === 'clarao') {
        const r = f.r * (0.2 + 0.8 * Math.min(1, k * 2.5));
        art.glow(c, f.x, f.y, r, '#ffffff', 0.85 * (1 - k));
        art.glow(c, f.x, f.y, r * 0.6, f.cor, 0.9 * (1 - k));
      } else if (f.tipo === 'corrente') {
        // corrente em elos do Guardião até o alvo
        const a = f.alvo, x1 = a ? a.x : f.x0, y1 = a ? alvoY(a) : f.y0, n = Math.max(4, Math.round(Math.hypot(x1 - f.x0, y1 - f.y0) / 14));
        c.save(); c.strokeStyle = art.rgba('#2a1a14', 0.95 * (1 - k * 0.5)); c.lineWidth = 3;
        for (let i = 0; i < n; i++) {
          const q = i / n, px = LV.lerp(f.x0, x1, q), py = LV.lerp(f.y0, y1, q) + Math.sin(q * Math.PI) * 18;
          c.beginPath(); c.ellipse(px, py, 6, 3.5, Math.atan2(y1 - f.y0, x1 - f.x0) + (i % 2 ? 1.2 : 0), 0, TAU); c.stroke();
        }
        c.restore();
        art.glow(c, x1, y1, 24, f.cor, 0.6 * (1 - k));
      } else if (f.tipo === 'corteGrande') {
        c.save(); c.translate(f.x, f.y); c.scale(f.face * 2.6, 2.2); c.globalCompositeOperation = 'lighter';
        c.beginPath(); c.arc(-6, 0, 22, -1.2, 1.2);
        c.strokeStyle = art.rgba(f.cor, 1 - k); c.lineWidth = 4 * (1 - k) + 1; c.stroke(); c.restore();
      } else if (f.tipo === 'raio') {
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        for (const [w, cor, al] of [[14, f.cor, 0.35], [6, f.cor, 0.8], [2, '#ffffff', 1]]) {
          c.beginPath(); c.moveTo(f.x0, f.y0); c.lineTo(f.x1, f.y1);
          c.strokeStyle = art.rgba(cor, al * (1 - k)); c.lineWidth = w * (1 - k * 0.6); c.stroke();
        }
        c.restore();
        art.glow(c, f.x1, f.y1, 30, f.cor, 1 - k);
      }
    }
    for (const n of cfg().numeros === false ? [] : W.nums) {
      const k = n.t / n.vida, y = n.y - k * 26;
      c.globalAlpha = 1 - Math.max(0, (k - 0.6) / 0.4);
      if (n.tipo === 'crit') texto(c, n.txt + '!', n.x, y, '#ffb347', 20, 800);
      else if (n.tipo === 'forte') texto(c, n.txt, n.x, y, n.cor || '#ffffff', 16, 800);
      else if (n.tipo === 'fraco') texto(c, n.txt, n.x, y, '#9aa3ad', 13);
      else if (n.tipo === 'dano') texto(c, n.txt, n.x, y, '#ff7a6b', 13);
      else if (n.tipo === 'lumes') texto(c, n.txt, n.x, y, '#f6d98a', 12);
      else if (n.tipo === 'mat') texto(c, n.txt, n.x, y, n.cor || '#ffffff', 12);
      else if (n.tipo === 'txt') texto(c, n.txt, n.x, y, '#ffffff', 14);
      else if (n.tipo === 'hab') texto(c, n.txt + '!', n.x, y - 6, n.cor || '#ffffff', 14, 800);
      else if (n.tipo === 'cura') texto(c, n.txt, n.x, y, '#a8ff9a', 13, 800);
      else if (n.tipo === 'dot') texto(c, n.txt, n.x, y, n.cor || '#ffb35c', 11);
      else if (n.tipo === 'escudo') texto(c, n.txt, n.x, y, '#a0ecff', 11);
      else texto(c, n.txt, n.x, y, '#eef1f5', 15);
      c.globalAlpha = 1;
    }
  }

  function desenharAmb(c) {
    const tipo = W.def.part, P = W.def.pal, t = W.t;
    if (!W.amb) return;
    if (tipo === 'chuva') {
      c.strokeStyle = art.rgba(P.luz, 0.2); c.lineWidth = 1; c.beginPath();
      for (const p of W.amb) { c.moveTo(p.x, p.y); c.lineTo(p.x - p.len * 0.17, p.y + p.len); }
      c.stroke();
      return;
    }
    for (const p of W.amb) {
      if (tipo === 'vagalume') {
        const a = 0.25 + 0.55 * Math.max(0, Math.sin(t * 1.7 + p.ph * 3));
        art.glow(c, p.x, p.y, 8 + p.s * 7, P.acento, a);
        c.fillStyle = art.rgba('#ffffff', a * 0.8); c.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
      } else if (tipo === 'esporos') art.glow(c, p.x, p.y, 3 + p.s * 5, P.acento, 0.45);
      else if (tipo === 'brilho') {
        const a = Math.max(0, Math.sin(t * 1.6 + p.ph * 4));
        if (a > 0.05) {
          const r = 2 + p.s * 4 * a;
          c.fillStyle = art.rgba('#ffffff', 0.7 * a);
          c.fillRect(p.x - r, p.y - 0.6, r * 2, 1.2); c.fillRect(p.x - 0.6, p.y - r, 1.2, r * 2);
          art.glow(c, p.x, p.y, 8 + r * 2, P.acento, 0.5 * a);
        }
      } else if (tipo === 'brasas') {
        if (p.cinza) { c.fillStyle = 'rgba(170,160,150,0.35)'; c.fillRect(p.x, p.y, 1.8, 1.8); }
        else art.glow(c, p.x, p.y, 3 + p.s * 5, P.acento, 0.55 + 0.4 * Math.sin(t * 10 + p.ph));
      }
    }
  }

  game.render = function (c, cw, ch) {
    if (!W) return;
    const sc = game.scale, vw = game.viewW, vh = game.viewH, oy = vh - LV.VIEW_H;
    const P = W.def.pal, t = W.t, bg = W.bg;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    const sg = c.createLinearGradient(0, 0, 0, ch);
    sg.addColorStop(0, P.c1); sg.addColorStop(0.72, P.c2); sg.addColorStop(1, P.c1);
    c.fillStyle = sg; c.fillRect(0, 0, cw, ch);
    c.setTransform(sc, 0, 0, sc, 0, 0);
    c.translate(0, oy);
    if (W.shake > 0 && cfg().tremor !== false) c.translate((Math.random() - 0.5) * W.shake, (Math.random() - 0.5) * W.shake);
    const cam = W.cam;
    const pintura = SPR().get('fundos/' + W.def.tema);
    if (oy > 0) {
      c.save(); c.scale(1, -1);
      if (!pintura) art.drawTile(c, bg.longe, 0.08, cam, vw, 0, 0, 0.55);
      art.drawTile(c, bg.perto, 0.5, cam, vw, 0, 0, 0.8);
      c.restore();
      const tg = c.createLinearGradient(0, -oy, 0, 0);
      tg.addColorStop(0, P.c1); tg.addColorStop(1, art.rgba(P.c1, 0));
      c.fillStyle = tg; c.fillRect(0, -oy - 2, vw, oy + 2);
    }
    if (pintura) {
      // cenário pintado: repetido com espelhamento para não ter emenda
      const h = LV.VIEW_H, w = (pintura.naturalWidth / pintura.naturalHeight) * h, par = 0.18;
      const off = cam * par;
      let i = Math.floor(off / w);
      for (let x = i * w - off; x < vw; x += w, i++) {
        c.save();
        if (i % 2) { c.translate(x + w, 0); c.scale(-1, 1); c.drawImage(pintura, 0, 0, w, h); }
        else c.drawImage(pintura, x, 0, w, h);
        c.restore();
      }
      c.fillStyle = art.rgba(P.c1, 0.25); c.fillRect(0, 0, vw, h);
      art.drawRaios(c, bg.raios, cam, vw, t, P);
    } else {
      art.drawTile(c, bg.longe, 0.08, cam, vw);
      art.drawRaios(c, bg.raios, cam, vw, t, P);
      art.drawTile(c, bg.meio, 0.22, cam, vw);
    }
    art.drawTile(c, bg.nevoa, 0.35, cam, vw, t * 9, 0, 0.9);
    art.drawTile(c, bg.perto, 0.5, cam, vw, 0, 0, pintura ? 0.7 : 1);
    art.drawTile(c, bg.chao, 1, cam, vw);
    c.save(); c.translate(-cam, 0);
    for (const p of bg.props) if (p.x > cam - 120 && p.x < cam + vw + 120) art.drawProp(c, p, t, P);
    N().desenhar(c, W.L, cam, vw, t);
    desenharEntidades(c);
    desenharEfeitos(c);
    c.restore();
    art.drawTile(c, bg.frente, 1.35, cam, vw);
    if (cfg().particulas !== false) desenharAmb(c);
    art.drawTile(c, bg.nevoa, 1.1, cam, vw, -t * 16, 70, 0.45);
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (game.vinheta) c.drawImage(game.vinheta, 0, 0);
    if (W.flashTela > 0) { c.fillStyle = 'rgba(255,250,235,' + Math.min(0.85, W.flashTela).toFixed(3) + ')'; c.fillRect(0, 0, cw, ch); }
  };

  game.criarVinheta = function (w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    const r = Math.hypot(w, h) / 2;
    const gr = g.createRadialGradient(w / 2, h * 0.58, r * 0.35, w / 2, h * 0.58, r);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.7)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const tg = g.createLinearGradient(0, 0, 0, h * 0.3);
    tg.addColorStop(0, 'rgba(0,0,0,0.45)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = tg; g.fillRect(0, 0, w, h * 0.3);
    game.vinheta = cv;
  };

  /* =================== CARREGAR / OFFLINE =================== */
  game.carregar = function (s) {
    game.tutorial = null;
    S = game.S = normalizar(s); recalcularBuffs();
    iniciarMapa(S.mapa);
  };

  game.calcOffline = function (seg) {
    if (!S || !S.inicial || !S.ativos.length) return null;
    const ds = domStats(), cap = ds.offlineH * 3600, s = Math.min(seg, cap);
    let taxa = S.st.taxa > 0 ? S.st.taxa : 0.12;
    taxa = Math.min(taxa, 2.5);
    const kills = Math.floor(s * taxa * 0.6);
    if (kills <= 0) return null;
    const def = LV.MAPS[S.mapa], b = F.ini(Math.round((def.lv[0] + def.lv[1]) / 2));
    const xp = Math.round(kills * b.xp * ds.xp), xpPet = Math.round(kills * b.xp * ds.xpPet);
    const lumes = Math.round(kills * b.lumes * ds.coleta * ds.lumesMult), mats = Math.round(kills * 0.35 * 1.5 * ds.coleta);
    const nv0 = S.dom.nivel;
    game.silencioso = true;
    ganharXPDom(xp);
    S.ativos.forEach((uid) => { const p = S.pets.find((q) => q.uid === uid); if (p) ganharXPPet(p, xpPet); });
    game.silencioso = false;
    S.lumes += lumes; S.mats[def.mat] += mats; S.st.kills += kills;
    somarAbates(S.mapa, kills);
    montarPets();
    return { seg: s, segReal: seg, kills, xp, lumes, mats, mat: def.mat, niveis: S.dom.nivel - nv0, cap: ds.offlineH };
  };

  /* =================== AÇÕES DO JOGADOR =================== */
  /* Ecos que um renascimento renderia agora (exige ter vencido o primeiro Guardião nesta jornada) */
  game.ecosPrevistos = function () {
    if (!S || !S.mapas[0].chefe) return 0;
    let base = 0, distintos = 0;
    S.mapas.forEach((m, i) => { if (m.chefe) { base += LV.ECOS_CHEFE[i]; distintos++; } });
    base += Math.max(0, S.st.chefes - distintos);                       // vitórias repetidas
    base += Math.floor(Math.pow(Math.max(0, S.dom.nivel - 8), 1.25) / 3);
    return Math.floor(base * (1 + 0.2 * MU('eco')));
  };

  /* =================== TUTORIAL (novo jogo) ===================
     Mapa curto e sem pets: o pet inicial escolhido aparece como criatura selvagem. Ensina a atacar para
     baixar a vida, a lançar a lanterna e o minijogo. Ao capturar, ele vira o primeiro companheiro.
     O save só é gravado depois do tutorial (S.inicial continua falso até lá). */
  game.tutorial = null;
  game.iniciarTutorial = function (spId) {
    if (!LV.SPECIES[spId]) return false;
    const def = LV.MAPS[0], ds = domStats(), L = N().gerarTutorial();
    S.mapa = 0;
    W = game.W = {
      idx: 0, def, L, w: L.w, t: 0, cam: 0, shake: 0,
      tam: { x: 220, y: G, vy: 0, sup: 0, esc: null, et: 0, ign: -1, ignT: 0, face: 1, hp: ds.hp, hpMax: ds.hp, cd: 1, mov: 0, manual: 0, alvoX: null, caido: 0, flash: 0, atk: 0, el: null, arVx: 0, escVx: 0, h: LV.HEROI.alt },
      pets: [], ini: [], proj: [], drops: [], fx: [], nums: [], parts: [], lant: [], areas: [],
      spawn: 0, chefe: null, killLog: [], seq: 1, taxaT: 0, amb: null, inicioReal: performance.now(),
      bg: art.criarFundo(0, game.bgScale), zonas: [],
    };
    game.captura = null;
    const sp = LV.SPECIES[spId], corpo = sp.base.estilo === 'investida';
    const hp = Math.max(30, Math.round(ds.atk * 7));          // ~4 golpes da lanterna levam à metade da vida
    const e = { tipo: 'selvagem', sp: spId, nome: sp.nome[0], el: sp.el, corpo: sp.corpo, pal: sp.pal, voa: sp.voa, est: 0, alc: corpo ? 42 : 170, estilo: corpo ? 'investida' : 'projetil',
      img: LV.imgPet(spId, 0), h: (sp.alt || [44, 60, 78])[0], flip: !!(sp.flipEst && sp.flipEst[0]),
      id: W.seq++, lv: 2, x: 700, y: sp.voa ? G - 90 : G, altVoo: 90, sup: sp.voa ? -1 : 0, casa: 0, zona: -1, hp, hpMax: hp, atk: 1, cd: 9, face: -1, mov: 0, flash: 0, atkA: 0,
      nasc: 0.3, vx: 0, wander: 0, s: 1, t0: 0, xp: 0, lumes: 0, tentou: false, tutorial: true };
    W.ini.push(e);
    game.tutorial = { sp: spId, passo: 'atacar', alvo: e, lant0: S.lanternas, escapou: false };
    emit('mapa', 0);
    emit('tutorial', game.tutorial);
    if (LV.audio) LV.audio.musica(def.tema);
    return true;
  };
  function tutorialPasso(novo) {
    const tu = game.tutorial;
    if (!tu) return;
    // vida baixa (mais um golpe poderia derrotá-la): o domador para de atacar e o jogo espera a lanterna
    if (!novo && tu.passo === 'atacar' && tu.alvo.hp <= tu.alvo.hpMax * 0.3) novo = 'lanterna';
    if (!novo || novo === tu.passo) return;
    if (novo !== 'lanterna') tu.escapou = false;
    if (novo === 'lanterna' && W) { W.tam.foco = null; W.foco = null; }
    tu.passo = novo;
    emit('tutorial', tu);
  }
  game.chanceTutorial = () => (game.tutorial ? chanceCaptura(game.tutorial.alvo) : 0);
  function tutorialCapturou(pet) {
    const tu = game.tutorial;
    // o primeiro companheiro começa como o pet inicial de sempre (nível 1, ou mais com o Primeiro Passo do Santuário)
    pet.nivel = 1 + 3 * MU('primeiro'); pet.xp = 0;
    S.ativos = [pet.uid]; S.inicial = true; S.aguardaInicial = false;
    S.lanternas = tu.lant0;
    tu.passo = 'fim'; tu.pet = pet;
    emit('tutorial', tu);
  }
  /* depois do parabéns (ou ao pular): começa a aventura de verdade no primeiro mapa */
  game.concluirTutorial = function () {
    const tu = game.tutorial;
    if (!tu) return false;
    if (!S.inicial) { S.lanternas = tu.lant0; game.acao.escolherInicial(tu.sp); }
    game.tutorial = null;
    game.captura = null; game.pausado = false;
    iniciarMapa(0);
    emit('equipe'); emit('lanternas', S.lanternas);
    return true;
  };

  game.acao = {
    escolherInicial(spId) {
      if (!LV.SPECIES[spId] || (S.inicial && !S.aguardaInicial)) return false;
      const p = { uid: S.prox++, sp: spId, nivel: 1 + 3 * MU('primeiro'), xp: 0, est: 0, apelido: null, hab: 1, bonus: null };
      S.pets.push(p); S.ativos = [p.uid]; S.inicial = true; S.aguardaInicial = false;
      montarPets();
      emit('equipe');
      return true;
    },
    comprarUp(id) {
      const u = LV.upgrade(id);
      if (!u) return 'nao';
      const c = LV.custoUp(u, S.up[id]);
      if (!c) return 'max';
      if ((S.moedas[c.moeda] || 0) < c.q) return 'moeda';
      if (S.lumes < c.lumes) return 'lumes';
      S.lumes -= c.lumes;
      S.moedas[c.moeda] -= c.q;
      S.up[id]++;
      montarPets();
      if (W) W.tam.hpMax = domStats().hp;
      emit('compra', id);
      return true;
    },
    /* resgata a recompensa de uma conquista concluída; devolve o pet Radiante quando houver */
    resgatarConquista(id) {
      const c = LV.conquista(id);
      if (!c || S.meta.conq[id] !== 1) return 'nao';
      const r = c.rec;
      let pet = null;
      if (r.lanternas) S.lanternas += r.lanternas;
      if (r.lumes) S.lumes += r.lumes;
      if (r.ecos) { S.meta.ecos += r.ecos; S.meta.ecosTotal += r.ecos; }
      if (r.pet) pet = darPetRadiante(r.pet);
      S.meta.conq[id] = 2;
      if (r.buff) recalcularBuffs();
      emit('compra', 'conquista'); emit('lanternas', S.lanternas);
      if (pet) emit('equipe');
      return pet || true;
    },
    /* automatiza um atributo. Se há vaga já paga sem escolha (depois de redefinir), usa ela de graça;
       senão compra a próxima vaga. A escolha é fixa: só muda redefinindo todas as vagas */
    comprarAutoAttr(attr) {
      const m = S.meta, lista = m.autoAttr;
      if (!(attr in S.dom.attr) || lista.includes(attr)) return 'attr';
      if (lista.length < m.autoVagas) { lista.push(attr); emit('meta', 'autoAttr'); return true; }
      const custo = LV.custoAutoAttr(m.autoVagas);
      if (custo == null) return 'max';
      if (m.ecos < custo) return 'ecos';
      m.ecos -= custo; m.autoVagas++; lista.push(attr);
      emit('meta', 'autoAttr');
      return true;
    },
    /* paga a taxa e apaga as escolhas de todas as vagas (as vagas continuam liberadas para escolher de novo) */
    resetarAutoAttr() {
      const m = S.meta, taxa = LV.taxaResetAuto(m.autoVagas);
      if (taxa == null || !m.autoAttr.length) return 'nada';
      if (m.ecos < taxa) return 'ecos';
      m.ecos -= taxa; m.autoAttr = [];
      emit('meta', 'autoAttr');
      return true;
    },
    comprarMeta(id) {
      const u = LV.meta(id);
      if (!u) return 'nao';
      const c = LV.custoMeta(u, S.meta.up[id]);
      if (c == null) return 'max';
      if (S.meta.ecos < c) return 'ecos';
      S.meta.ecos -= c;
      S.meta.up[id]++;
      montarPets();
      if (W) W.tam.hpMax = domStats().hp;
      emit('meta', id);
      return true;
    },
    /* volta ao início: perde pets, níveis, Lumes, materiais, moedas, melhorias e mapas; ganha Ecos e mantém o Santuário */
    renascer() {
      const ganho = game.ecosPrevistos();
      if (ganho <= 0) return 'cedo';
      if (W && W.chefe) falharChefe('abandonou');
      const meta = S.meta, nome = S.dom.nome, op = S.op, criado = S.criado;
      meta.ecos += ganho; meta.ecosTotal += ganho; meta.renasc++;
      meta.recorde = Math.max(meta.recorde, S.dom.nivel);
      const n = novoEstado();
      n.meta = meta; n.dom.nome = nome; n.criado = criado;
      n.op.vel = op.vel; n.op.deus = op.deus; n.op.modoPets = op.modoPets;
      n.lumes = 300 * meta.up.heranca;
      n.lanternas = 5 + 2 * meta.up.lanterneiro;
      n.inicial = true; n.aguardaInicial = true;    // o espaço continua salvo; o pet inicial é escolhido a seguir
      S = game.S = n;

      iniciarMapa(0);
      emit('renascer', { ganho, total: meta.ecos });
      return ganho;
    },
    comprarLanternas(n) {
      const preco = F.precoLanterna(S.mapas.filter((m) => m.liberado).length) * n;
      if (S.lumes < preco) return 'lumes';
      S.lumes -= preco; S.lanternas += n;
      emit('compra', 'lanterna');
      return true;
    },
    evoluir(uid, gratis) {
      const p = S.pets.find((q) => q.uid === uid);
      if (!p) return 'nao';
      const r = podeEvoluir(p);
      if (r.max) return 'max';
      if (!gratis) {
        if (!r.ok) return 'falta';
        for (const k in r.req.mats) S.mats[k] -= r.req.mats[k];
        S.lumes -= r.req.lumes;
      }
      const de = LV.nomePet(p), estAntes = p.est;
      p.est++; S.st.evolucoes++; S.meta.tot.evo++;
      montarPets();
      emit('evolucao', { pet: p, de, estAntes });
      return true;
    },
    melhorarHab(uid, gratis) {
      const p = S.pets.find((q) => q.uid === uid);
      if (!p) return 'nao';
      const n = p.hab || 1;
      if (n >= LV.HAB_MAX) return 'max';
      if (!gratis) {
        const c = LV.custoHab(p.sp, n);
        if (S.lumes < c.lumes) return 'lumes';
        if ((S.mats[c.mat] || 0) < c.q) return 'mat';
        S.lumes -= c.lumes; S.mats[c.mat] -= c.q;
      }
      p.hab = n + 1;
      emit('compra', 'hab');
      return true;
    },
    ativar(uid) {
      if (S.ativos.includes(uid)) return 'ja';
      if (S.ativos.length >= slots()) return 'cheio';
      if (!S.pets.some((p) => p.uid === uid)) return 'nao';
      S.ativos.push(uid); montarPets(); emit('equipe');
      return true;
    },
    /* arrastar e soltar: coloca o pet na vaga i. Vaga ocupada: troca (se ele já estava em campo) ou substitui */
    posicionar(uid, i) {
      if (!S.pets.some((p) => p.uid === uid)) return 'nao';
      const at = S.ativos.slice(), atual = at.indexOf(uid), max = slots();
      i = LV.clamp(i | 0, 0, max - 1);
      if (i >= at.length) {
        if (atual >= 0) return 'ja';
        if (at.length >= max) return 'cheio';
        at.push(uid);
      } else {
        const ocupante = at[i];
        if (ocupante === uid) return 'ja';
        if (atual >= 0) { at[atual] = ocupante; at[i] = uid; } else at[i] = uid;
      }
      S.ativos = at; montarPets(); emit('equipe');
      return true;
    },
    retirar(uid) {
      if (!S.ativos.includes(uid)) return 'nao';
      if (S.ativos.length <= 1) return 'ultimo';
      S.ativos = S.ativos.filter((u) => u !== uid); montarPets(); emit('equipe');
      return true;
    },
    libertar(uid) {
      const p = S.pets.find((q) => q.uid === uid);
      if (!p) return 'nao';
      if (S.pets.length <= 1) return 'ultimo';
      if (S.ativos.includes(uid) && S.ativos.length <= 1) return 'ultimo';
      const valor = Math.round(10 * p.nivel * (1 + p.est));
      S.pets = S.pets.filter((q) => q !== p);
      S.ativos = S.ativos.filter((u) => u !== uid);
      S.lumes += valor;
      montarPets(); emit('equipe');
      return valor;
    },
    ponto(attr, n) {
      if (!(attr in S.dom.attr)) return false;
      n = Math.min(n, S.dom.pontos);
      if (n <= 0) return false;
      S.dom.attr[attr] += n; S.dom.pontos -= n;
      montarPets();
      if (W) W.tam.hpMax = domStats().hp;
      emit('atributo');
      return true;
    },
    viajar(i) {
      if (!S.mapas[i] || !S.mapas[i].liberado) return false;
      if (W && W.chefe) falharChefe();
      iniciarMapa(i);
      return true;
    },
    alternar(op) {
      if (op === 'auto' && !autoLiberadaEm(S)) return 'bloqueado';
      S.op[op] = !S.op[op]; emit('opcoes'); return S.op[op];
    },
  };

  /* --- ajudas usadas pelo console do criador --- */
  game.curar = function () {
    if (!W) return;
    W.tam.caido = 0; W.tam.hp = W.tam.hpMax;
    W.pets.forEach((p) => { p.desm = 0; p.hp = p.hpMax; });
  };
  game.matarTodos = function () {
    if (!W) return 0;
    let n = 0;
    W.ini.slice().forEach((e) => { if (e.hp > 0 && !e.capt && e.fuga == null) { matar(e); n++; } });
    return n;
  };
  game.liberarMapas = function () { S.mapas.forEach((m) => { m.liberado = true; }); emit('mapas'); };
})();
