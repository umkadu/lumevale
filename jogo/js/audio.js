'use strict';
/* Lumevale — áudio: efeitos (arquivos da biblioteca) e música ambiente gerada por código (Web Audio). */
(function () {
  const LV = window.LV;
  const audio = (LV.audio = { ctx: null, base: {}, ultimo: {}, tema: null, tens: false });
  const VOL = { clique: 0.45, moeda: 0.18, nivel: 0.55, evolucao: 0.7, brilho: 0.6, captura: 0.6, escapou: 0.5, golpe: 0.16, lanterna: 0.4, impacto: 0.6, chefe: 0.65, desmaio: 0.4 };
  const INTERVALO = { moeda: 0.07, golpe: 0.07, clique: 0.04, desmaio: 0.35, impacto: 0.2 };
  const cfg = () => LV.config || { musica: 0.5, efeitos: 0.7, mudo: false };

  /* ---------- efeitos ----------
     Tocados pelo mesmo motor da música (Web Audio), destravado no primeiro toque: assim os sons que o
     próprio jogo dispara também saem no iPhone (lá, cada <audio> só toca dentro de um toque do jogador).
     No .exe (arquivos locais) e antes de destravar, usa <audio> como antes. */
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* iOS 17+: toca mesmo com a chave do silencioso */ }
  const buffers = (audio.buffers = {}), brutos = {};
  if (window.fetch && location.protocol !== 'file:') {
    for (const k in VOL) brutos[k] = fetch('audio/' + k + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  }
  function decodificar() {
    for (const k in brutos) {
      brutos[k].then((ab) => {
        if (!ab || !audio.ctx || buffers[k]) return;
        try {
          const p = audio.ctx.decodeAudioData(ab.slice(0), (b) => { buffers[k] = b; }, () => { /* formato não suportado: fica o <audio> */ });
          if (p && p.catch) p.catch(() => {});
        } catch (e) { /* idem */ }
      });
    }
  }
  function elemento(k) {
    if (!audio.base[k]) { try { const a = new Audio('audio/' + k + '.mp3'); a.preload = 'auto'; audio.base[k] = a; } catch (e) { return null; } }
    return audio.base[k];
  }
  audio.tocar = function (k) {
    const c = cfg();
    if (c.mudo || !(c.efeitos > 0) || !VOL[k]) return;
    const agora = performance.now() / 1000;
    if (agora - (audio.ultimo[k] || 0) < (INTERVALO[k] || 0)) return;
    audio.ultimo[k] = agora;
    const ctx = audio.ctx;
    if (ctx && ctx.state === 'running' && buffers[k]) {
      try {
        const s = ctx.createBufferSource(), g = ctx.createGain();
        s.buffer = buffers[k]; g.gain.value = VOL[k];
        s.connect(g); g.connect(audio.gEfeitos); s.start();
        return;
      } catch (e) { /* cai para o <audio> */ }
    }
    const b = elemento(k);
    if (!b) return;
    try {
      const a = b.cloneNode();
      a.volume = Math.min(1, VOL[k] * c.efeitos);
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* ignora */ }
  };
  // os <audio> de reserva só são criados onde não há Web Audio com arquivos (ex.: .exe)
  if (!Object.keys(brutos).length) for (const k in VOL) elemento(k);

  /* ---------- música ---------- */
  const TEMAS = {
    raizes: { base: 50, escala: [0, 2, 3, 5, 7, 9, 10], filtro: 900, passo: 9, pluck: [1.0, 2.4] },
    fungos: { base: 45, escala: [0, 1, 3, 5, 7, 8, 10], filtro: 700, passo: 10, pluck: [1.3, 2.8] },
    ruinas: { base: 48, escala: [0, 2, 3, 5, 7, 8, 11], filtro: 800, passo: 11, pluck: [1.1, 2.6] },
    cristais: { base: 52, escala: [0, 2, 4, 6, 7, 9, 11], filtro: 1300, passo: 8, pluck: [0.7, 1.8] },
    cinzas: { base: 43, escala: [0, 1, 4, 5, 7, 8, 10], filtro: 650, passo: 10, pluck: [1.4, 3.0] },
  };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function impulso(ctx, seg, dec) {
    const n = Math.floor(ctx.sampleRate * seg), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, dec); }
    return b;
  }

  audio.iniciar = function () {
    if (audio.ctx) { if (audio.ctx.state !== 'running') { const p = audio.ctx.resume(); if (p && p.catch) p.catch(() => {}); } return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (audio.ctx = new AC());
    audio.gMusica = ctx.createGain(); audio.gMusica.connect(ctx.destination);
    audio.gEfeitos = ctx.createGain(); audio.gEfeitos.connect(ctx.destination);
    decodificar();
    audio.seco = ctx.createGain(); audio.seco.gain.value = 0.45; audio.seco.connect(audio.gMusica);
    const rv = ctx.createConvolver(); rv.buffer = impulso(ctx, 4, 2.6);
    const rvg = ctx.createGain(); rvg.gain.value = 0.7;
    rv.connect(rvg); rvg.connect(audio.gMusica);
    audio.rev = rv;
    audio.aplicarVolumes();
    setInterval(agendar, 200);
    if (audio.tema) audio.musica(audio.tema, true);
  };
  audio.aplicarVolumes = function () {
    if (!audio.ctx) return;
    const c = cfg();
    const v = c.mudo ? 0 : Math.max(0, Math.min(1, c.musica)) * 0.55;
    audio.gMusica.gain.setTargetAtTime(v, audio.ctx.currentTime, 0.3);
    audio.gEfeitos.gain.setTargetAtTime(c.mudo ? 0 : Math.max(0, Math.min(1, c.efeitos)), audio.ctx.currentTime, 0.05);
  };

  let prox = 0, proxPluck = 0, proxPulso = 0, drone = null, acorde = 0;
  audio.musica = function (tema, forcar) {
    if (!TEMAS[tema]) return;
    if (audio.tema === tema && !forcar && drone) return;
    audio.tema = tema;
    if (!audio.ctx) return;
    const ctx = audio.ctx, T = TEMAS[tema], t = ctx.currentTime;
    if (drone) { const d = drone; d.g.gain.setTargetAtTime(0, t, 1.2); setTimeout(() => d.osc.forEach((o) => { try { o.stop(); } catch (e) { /* já parou */ } }), 5000); }
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.11, t + 0.5, 2);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 3;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    const lg = ctx.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(f.frequency);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = hz(T.base - 24);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz(T.base - 12 + 7); o2.detune.value = 6;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(audio.seco); g.connect(audio.rev);
    o1.start(); o2.start(); lfo.start();
    drone = { g, osc: [o1, o2, lfo] };
    prox = t + 1; proxPluck = t + 2; acorde = 0;
  };

  function pad(t, T, graus, dur) {
    const ctx = audio.ctx;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, t + dur * 1.1);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = T.filtro;
    f.connect(g); g.connect(audio.rev); g.connect(audio.seco);
    graus.forEach((gr, i) => {
      const oit = Math.floor(gr / 7), nota = T.base + T.escala[((gr % 7) + 7) % 7] + oit * 12 - 12;
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sawtooth';
        o.frequency.value = hz(nota); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur * 1.15);
      }
    });
  }
  function pluck(t, T) {
    const ctx = audio.ctx;
    const gr = Math.floor(Math.random() * 7), nota = T.base + T.escala[gr] + (Math.random() < 0.5 ? 12 : 24);
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 2.2);
    g.connect(audio.rev); g.connect(audio.seco);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(nota);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz(nota) * 2.01;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2); g2.connect(g);
    o.start(t); o2.start(t); o.stop(t + 2.4); o2.stop(t + 2.4);
  }
  function pulso(t) {
    const ctx = audio.ctx;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.3);
    o.connect(g); g.connect(audio.seco);
    o.start(t); o.stop(t + 0.4);
  }
  const PROGRESSOES = [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]];
  function agendar() {
    if (!audio.ctx || !audio.tema || audio.ctx.state !== 'running') return;
    const T = TEMAS[audio.tema], t = audio.ctx.currentTime;
    if (t + 0.5 > prox) { pad(prox, T, PROGRESSOES[acorde++ % 4], T.passo); prox += T.passo; }
    if (t + 0.5 > proxPluck) { pluck(proxPluck, T); proxPluck += T.pluck[0] + Math.random() * (T.pluck[1] - T.pluck[0]); }
    if (audio.tens) {
      if (proxPulso < t) proxPulso = t + 0.1;
      while (t + 0.5 > proxPulso) { pulso(proxPulso); pulso(proxPulso + 0.22); proxPulso += 1.1; }
    }
  }
  audio.tensao = function (on) { audio.tens = !!on; };

  /* destrava o áudio no primeiro gesto do jogador (exigência dos navegadores).
     O iPhone só aceita alguns gestos (toque terminado, clique) e pode suspender o áudio ao sair do app ou
     numa ligação: por isso os ouvintes ficam ativos e religam o áudio sempre que ele não estiver tocando. */
  const destravar = () => {
    audio.iniciar();
    const ctx = audio.ctx;
    if (!ctx || audio.destravado) return;
    try {   // um som mudo dentro do gesto libera o áudio de vez no iPhone
      const s = ctx.createBufferSource();
      s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
      audio.destravado = true;
    } catch (e) { /* tenta no próximo gesto */ }
  };
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) => window.addEventListener(ev, () => {
    if (!audio.ctx || audio.ctx.state !== 'running' || !audio.destravado) destravar();
  }, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    const ctx = audio.ctx;
    if (!ctx) return;
    const p = document.hidden ? ctx.suspend() : ctx.resume();   // sem som com o app em segundo plano
    if (p && p.catch) p.catch(() => {});
  });
})();
