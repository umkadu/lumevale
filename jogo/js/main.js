'use strict';
/* Lumevale — inicialização: laço do jogo, controles, tela, configurações e saves em 3 espaços (navegador + conta). */
(function () {
  const LV = window.LV, game = LV.game, ui = LV.ui;
  const SLOTS = 3;
  const CHAVE_SLOT = (n) => 'lumevale.slot.' + n;
  const CHAVE_ANTIGA = 'lumevale.save.v1';
  const CHAVE_CFG = 'lumevale.config';
  const nuvem = { db: null, uid: null, estado: 'local', salvando: false, pend: false, ultimo: {}, quando: 0 };
  let cv, ctx, stage;

  function lerJSON(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function gravarJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  /* ---------- configurações (por aparelho) ---------- */
  const CFG_PADRAO = { musica: 0.5, efeitos: 0.7, mudo: false, qualidade: 'alta', tremor: true, numeros: true, particulas: true, afk: 2 };
  LV.config = Object.assign({}, CFG_PADRAO, lerJSON(CHAVE_CFG) || {});
  LV.config.idioma = LV.idioma;            // idioma em uso (escolhido ou do sistema)
  LV.salvarConfig = function () {
    gravarJSON(CHAVE_CFG, LV.config);
    if (LV.audio) LV.audio.aplicarVolumes();
    pedirResize(true);
  };
  LV.telaCheia = function () {
    try {
      if (document.fullscreenElement) { document.exitFullscreen(); return true; }
      const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      if (p && p.catch) p.catch(() => ui.toast(LV.t('Este navegador não permitiu tela cheia aqui.'), 'ruim', true));
      return true;
    } catch (e) { ui.toast(LV.t('Este navegador não permitiu tela cheia aqui.'), 'ruim', true); return false; }
  };

  /* ---------- espaços de save ---------- */
  (function migrar() {
    const antigo = lerJSON(CHAVE_ANTIGA);
    if (antigo && antigo.inicial && !lerJSON(CHAVE_SLOT(1))) gravarJSON(CHAVE_SLOT(1), antigo);
  })();
  LV.slots = {
    total: SLOTS,
    ler: (n) => lerJSON(CHAVE_SLOT(n)),
    resumo(n) {
      const s = lerJSON(CHAVE_SLOT(n));
      if (!s || !s.inicial) return null;
      const d = s.dom || {}, nv = d.nivel || 1;
      const p0 = (s.pets || []).find((p) => (s.ativos || [])[0] === p.uid) || (s.pets || [])[0];
      return {
        nome: d.nome || LV.t('Viajante'), nivel: nv, rank: LV.RANKS[LV.rankIdx(nv)].nome,
        mapa: (LV.MAPS[s.mapa || 0] || LV.MAPS[0]).nome, tempo: (s.st && s.st.tempo) || 0,
        pets: (s.pets || []).length, salvoEm: s.salvoEm || 0, pet: p0 && LV.SPECIES[p0.sp] ? p0 : null,
      };
    },
    primeiroVazio() { for (let n = 1; n <= SLOTS; n++) if (!this.resumo(n)) return n; return null; },
    apagar(n) { try { localStorage.removeItem(CHAVE_SLOT(n)); } catch (e) { /* ok */ } apagarNuvem(n); },
    gravar(n, s) { return gravarJSON(CHAVE_SLOT(n), s); },
  };

  /* ---------- código do save: leva o progresso para outro aparelho (texto para copiar e colar) ----------
     LUMEVALE1: save compactado (gzip) em base64 · LUMEVALE0: sem compactar (navegadores antigos) */
  const paraB64 = (bytes) => { let t = ''; for (let i = 0; i < bytes.length; i += 0x8000) t += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(t); };
  LV.codigoDoSave = async function (s) {
    const json = JSON.stringify(s);
    try {
      if (window.CompressionStream) {
        const fluxo = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
        return 'LUMEVALE1:' + paraB64(new Uint8Array(await new Response(fluxo).arrayBuffer()));
      }
    } catch (e) { /* cai para o formato simples */ }
    return 'LUMEVALE0:' + paraB64(new TextEncoder().encode(json));
  };
  LV.saveDoCodigo = async function (codigo) {
    const m = String(codigo || '').replace(/\s+/g, '').match(/^LUMEVALE([01]):([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Error('formato');
    const bin = atob(m[2]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    let json;
    if (m[1] === '1') {
      if (!window.DecompressionStream) throw new Error('navegador');
      json = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    } else json = new TextDecoder().decode(bytes);
    const s = JSON.parse(json);
    if (!s || !s.inicial || !Array.isArray(s.pets)) throw new Error('invalido');
    return s;
  };

  /* ---------- app instalado pelo site: baixa versões novas sozinho ----------
     Só no site (window.LV_PWA). No menu a atualização entra na hora; durante o jogo aparece um botão "Atualizar". */
  function atualizacoesDoApp() {
    const cfg = window.LV_PWA;
    if (!cfg || !('serviceWorker' in navigator)) return;
    let pedida = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!pedida) return;                 // a primeira instalação também troca o controlador: não recarrega
      pedida = false;
      LV.salvar(false);
      try { localStorage.setItem('lumevale.retomar', JSON.stringify({ slot: game.slot || null, vista: 'atualizacao', t: Date.now() })); } catch (e) { /* ok */ }
      location.reload();
    });
    navigator.serviceWorker.register(cfg.sw, { scope: cfg.escopo }).then((reg) => {
      const aplicar = (w) => { pedida = true; w.postMessage('atualizar'); };
      const oferecer = (w) => { if (!game.slot) aplicar(w); else ui.avisoAtualizacao(() => aplicar(w)); };
      if (reg.waiting && navigator.serviceWorker.controller) oferecer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) oferecer(w); });
      });
      const conferir = () => reg.update().catch(() => { /* sem internet: tenta depois */ });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) conferir(); });
      setInterval(conferir, 30 * 60000);
    }).catch(() => { /* sem service worker: o jogo funciona igual, só não atualiza sozinho */ });
  }

  game.slot = null;
  LV.salvar = function (comNuvem) {
    if (!game.S || !game.slot || !game.S.inicial) return;
    game.S.salvoEm = Date.now();
    game.S.noLugar = (game.W && game.W.lugar) || null;   // fechou na vila/treino: sem ganho fora do jogo
    gravarJSON(CHAVE_SLOT(game.slot), game.S);
    if (comNuvem) salvarNuvem();
    ui.saveStatus();
  };
  let tLogo = 0;
  LV.salvarLogo = function () { clearTimeout(tLogo); tLogo = setTimeout(() => LV.salvar(true), 4000); };
  const hora = (t) => new Date(t).toLocaleTimeString(LV.locale, { hour: '2-digit', minute: '2-digit' });
  LV.textoSave = function () {
    const onde = game.slot ? LV.t('Espaço ') + game.slot + ' · ' : '';
    if (nuvem.db) return onde + (nuvem.estado === 'erro' ? LV.t('falha ao salvar na conta, salvo neste navegador') : LV.t('salvo na sua conta') + (nuvem.quando ? LV.t(' às ') + hora(nuvem.quando) : ''));
    return onde + LV.t('salvo neste navegador');
  };

  /* ---------- fluxo de jogo ---------- */
  function demo() { game.carregar(null); game.pausado = true; }
  LV.novoJogo = function (slot, nome, sp, pularTutorial) {
    const s = game.novoEstado();
    s.dom.nome = (nome || '').trim().slice(0, 24) || LV.t('Viajante');
    game.slot = slot;

    game.carregar(s);
    if (!pularTutorial && game.iniciarTutorial(sp)) {
      // o save só é gravado quando o tutorial termina (com o primeiro companheiro já capturado)
      game.pausado = false;
      ui.entrarNoJogo('tutorial');
      return;
    }
    game.acao.escolherInicial(sp);
    game.pausado = false;
    game.acao.irLugar('vila');            // a aventura começa na Vila de Alvorada (v1.17.3)
    if (game.W) game.W.veioDeMapa = false; // o mapa carregado por baixo não conta: ainda não houve descida
    LV.salvar(true);
    ui.entrarNoJogo(true);
  };
  LV.carregarJogo = function (slot) {
    const s = LV.slots.ler(slot);
    if (!s || !s.inicial) return false;
    game.slot = slot;

    game.carregar(s);
    game.pausado = false;
    ui.entrarNoJogo(false);
    aplicarOffline(Date.now() - (+s.salvoEm || Date.now()));
    return true;
  };
  LV.voltarMenu = function () {
    LV.salvar(true);
    game.slot = null;
    if (LV.audio) LV.audio.tensao(false);
    demo();
    ui.mostrarInicio();
  };
  LV.apagarSlotAtual = function () {
    if (!game.slot) return;
    LV.slots.apagar(game.slot);
    game.slot = null;
    demo();
    ui.mostrarInicio();
  };

  /* ---------- nuvem (conta Claude), um documento por espaço ---------- */
  const docSlot = (n) => nuvem.db.doc('data/users/' + nuvem.uid + '/slot' + n);
  async function salvarNuvem() {
    if (!nuvem.db || !game.S || !game.S.inicial || !game.slot) return;
    if (nuvem.salvando) { nuvem.pend = true; return; }
    const n = game.slot, json = JSON.stringify(game.S);
    if (json === nuvem.ultimo[n]) return;
    nuvem.salvando = true;
    try {
      await docSlot(n).set({ save: json, salvoEm: game.S.salvoEm, versao: 2 });
      nuvem.ultimo[n] = json; nuvem.estado = 'ok'; nuvem.quando = Date.now();
    } catch (e) {
      const c = e && e.code;
      nuvem.estado = 'erro';
      if (['revoked', 'invalid_argument', 'not_granted', 'capability_disabled', 'capability_removed', 'quota_exceeded'].includes(c)) nuvem.db = null;
    }
    nuvem.salvando = false;
    ui.saveStatus();
    if (nuvem.pend) { nuvem.pend = false; setTimeout(salvarNuvem, 2500); }
  }
  async function apagarNuvem(n) {
    if (!nuvem.db) return;
    try { await docSlot(n).delete(); nuvem.ultimo[n] = ''; } catch (e) { /* ok */ }
  }
  function comTempo(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]); }
  async function conectarNuvem() {
    const cl = window.claude;
    if (!cl || typeof cl.use !== 'function') return;
    let user = null, db = null;
    try { [user, db] = await Promise.all([cl.use('user'), cl.use('db')]); } catch (e) { return; }
    if (!user || !db) return;
    let id = null;
    try { id = await user.id(); } catch (e) { id = null; }
    if (!id) return;
    nuvem.db = db; nuvem.uid = id;
    try {
      for (let n = 1; n <= SLOTS; n++) {
        let snap = await comTempo(docSlot(n).get(), 10000);
        if (n === 1 && (!snap || !snap.exists)) snap = await comTempo(db.doc('data/users/' + id + '/save').get(), 10000);
        if (!snap || !snap.exists) continue;
        const d = snap.data() || {};
        let remoto = null;
        try { remoto = typeof d.save === 'string' ? JSON.parse(d.save) : null; } catch (e) { remoto = null; }
        const local = LV.slots.ler(n);
        if (remoto && remoto.inicial && (!local || !local.inicial || (+remoto.salvoEm || 0) > (+local.salvoEm || 0) + 5000) && game.slot !== n) {
          gravarJSON(CHAVE_SLOT(n), remoto);
        }
      }
      nuvem.estado = 'ok';
      ui.atualizarInicio();
      ui.saveStatus();
      salvarNuvem();
    } catch (e) { /* segue só com o navegador */ }
  }

  /* ganhos de quando o jogo esteve fechado ou em segundo plano: aparecem na tela de descanso */
  function aplicarOffline(ms) {
    if (!game.S || !game.S.inicial || !game.slot || game.tutorial) return;
    const seg = ms / 1000;
    if (seg < 90) return;
    const base = ui.afk.foto();
    const r = game.calcOffline(seg);
    if (r && r.lugar) {                   // na vila ou no treino as Centelhas não caçam
      ui.toast(r.lugar === 'vila' ? LV.t('Enquanto você esteve fora, as Centelhas descansaram com você na vila: sem caçada, nada foi ganho.')
        : LV.t('Enquanto você esteve fora, as Centelhas descansaram com você no Campo de Treino: sem caçada, nada foi ganho.'));
      game.S.noLugar = (game.W && game.W.lugar) || null;
      return;
    }
    if (r) {
      if (ui.afk.ativo) { /* já aberta: os números se atualizam sozinhos */ }
      else if (!ui.afk.entrar('offline', base, seg, r)) ui.modalOffline(r);
      ui.render();
    }
    LV.salvar(false);
  }

  /* ---------- inatividade: depois de um tempo parado, abre a tela de descanso ---------- */
  let ultimoToque = Date.now();
  ui.marcarAtividade = () => { ultimoToque = Date.now(); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, ui.marcarAtividade, { passive: true, capture: true }));
  setInterval(() => {
    const min = +(LV.config.afk != null ? LV.config.afk : 2);
    if (!min || !game.slot || !game.S || !game.S.inicial || ui.afk.ativo || ui.inicioVisivel() || ui.modalAberto || game.captura || document.hidden) return;
    if (Date.now() - ultimoToque > min * 60000) ui.afk.entrar('inativo');
  }, 1000);

  /* ---------- tela ---------- */
  // altura real da janela: o app instalado no iPhone às vezes mede 100% sem a barra de status (sobra uma faixa preta)
  const medirTela = () => document.documentElement.style.setProperty('--altura-tela', window.innerHeight + 'px');
  medirTela();
  window.addEventListener('resize', medirTela);
  window.addEventListener('orientationchange', () => setTimeout(medirTela, 250));
  function resize(forcarFundo) {
    const r = stage.getBoundingClientRect();
    const q = LV.config.qualidade;
    /* no celular a tela já é densa: 1,5x basta e poupa bateria e calor */
    const dpr = q === 'baixa' ? 0.7 : q === 'media' ? 1 : Math.min(window.devicePixelRatio || 1, LV.movel ? 1.5 : 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    let sc = h / LV.VIEW_H;
    if (w / sc < 620) sc = w / 620;
    game.scale = sc; game.viewW = w / sc; game.viewH = h / sc;
    game.criarVinheta(w, h);
    const bs = LV.clamp(sc, 0.5, 1.5);
    if (forcarFundo || Math.abs(bs - game.bgScale) > 0.15) { game.bgScale = bs; game.rebuildBg(); }
  }
  let resizePend = false, resizeFundo = false;
  function pedirResize(fundo) {
    if (fundo) resizeFundo = true;
    if (resizePend || !stage) return;
    resizePend = true;
    requestAnimationFrame(() => { resizePend = false; const f = resizeFundo; resizeFundo = false; resize(f); });
  }

  /* ---------- laço ---------- */
  let ultimo = performance.now(), acc = 0;
  function loop(now) {
    let dt = (now - ultimo) / 1000;
    ultimo = now;
    if (!(dt >= 0)) dt = 0;
    if (dt > 0.25) dt = 0.25;
    if (game.S && game.W) {
      game.pausaMenu = ui.pausaMenu();
      ui.marcarPausa(game.pausaMenu);
      if (!game.pausado && !game.pausaMenu && !game.pausaAviso) {      // pausaMenu: aba Mapas · pausaAviso: cartão de instrução
        acc += dt * game.S.op.vel;
        let n = 0;
        while (acc >= 1 / 60 && n < 14) { game.step(1 / 60); acc -= 1 / 60; n++; }
        if (n >= 14) acc = 0;
      } else game.W.t += dt;
      if (game.captura) game.atualizarCaptura(dt);
      // com a tela de descanso aberta o jogo segue rodando, mas não é desenhado (poupa bateria)
      if (!ui.afk.ativo) try { game.render(ctx, cv.width, cv.height); } catch (e) { console.error(e); }
    }
    requestAnimationFrame(loop);
  }

  /* ---------- controles ---------- */
  function entrada() {
    const teclas = new Set();
    const dir = () => { game.input.dir = (teclas.has('d') || teclas.has('arrowright') ? 1 : 0) - (teclas.has('a') || teclas.has('arrowleft') ? 1 : 0); };
    const seg = () => {
      game.input.segSubir = teclas.has('w') || teclas.has('arrowup');
      game.input.segDescer = teclas.has('s') || teclas.has('arrowdown');
    };
    /* as teclas do jogo só param enquanto se digita num campo; clicar no Diário não tira o controle do herói */
    const fora = (e) => e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
    document.addEventListener('pointerup', (e) => {
      const b = e.target.closest && e.target.closest('button, [role="tab"]');
      if (b && b.closest('#panel, #hud')) setTimeout(() => { if (document.activeElement === b) b.blur(); }, 0);
    });
    window.addEventListener('keydown', (e) => {
      if (ui.afk.ativo) {
        if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); ui.afk.retomar(); }
        return;
      }
      if (e.key === 'Escape' && document.documentElement.classList.contains('diario') && !ui.modalAberto) { ui.diario(false); return; }
      // atalhos: O Bestiário (o olho), C Conquistas e as abas do Diário (E T L M R B H; L = Vila)
      const livre = !fora(e) && !ui.modalAberto && !ui.inicioVisivel() && game.slot && !e.ctrlKey && !e.metaKey && !e.altKey;
      if ((e.key === 'o' || e.key === 'O') && livre) { ui.abrirBestiario(); return; }
      const aba = livre && !e.repeat ? Object.keys(ui.ATALHOS).find((a) => ui.ATALHOS[a] === e.key.toUpperCase()) : null;
      if (aba) { ui.atalhoAba(aba); e.preventDefault(); return; }
      if ((e.key === 'c' || e.key === 'C') && !fora(e) && !ui.modalAberto && !ui.inicioVisivel() && game.slot) { ui.abrirConquistas(); return; }
      if (e.key === 'Escape' && game.captura && game.captura.fase === 'mira') { game.cancelarMira(); return; }
      if (e.key === 'Escape' && !ui.inicioVisivel() && !ui.modalAberto && game.slot && !game.captura) { ui.abrirConfig(true); return; }
      if ((e.key === 'q' || e.key === 'Q') && !fora(e) && !ui.modalAberto && !ui.inicioVisivel() && game.slot) { document.getElementById('b-lant').click(); return; }
      if (['1', '2', '3'].includes(e.key) && !fora(e) && !ui.modalAberto && !ui.inicioVisivel() && game.slot) { ui.escolherModo(['agressivo', 'defensor', 'passivo'][+e.key - 1]); return; }
      // skills do domador (v1.17): teclas 4 a 8
      const skT = !e.repeat && LV.SKILLS.find((k) => k.tecla === e.key);
      if (skT && !fora(e) && !ui.modalAberto && !ui.inicioVisivel() && game.slot) { if ((game.S.dom.skills || {})[skT.id]) ui.usarSkill(skT.id); return; }
      if (fora(e) || ui.modalAberto || ui.inicioVisivel() || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (['a', 'd', 'arrowleft', 'arrowright'].includes(k)) { teclas.add(k); dir(); e.preventDefault(); }
      else if (k === ' ') { if (!e.repeat) game.input.pular = true; e.preventDefault(); }
      else if (k === 'w' || k === 'arrowup') { if (!e.repeat) game.input.subir = true; teclas.add(k); seg(); e.preventDefault(); }
      else if (k === 's' || k === 'arrowdown') { if (!e.repeat) game.input.descer = true; teclas.add(k); seg(); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => { teclas.delete(e.key.toLowerCase()); dir(); seg(); });
    window.addEventListener('blur', () => { teclas.clear(); dir(); seg(); });

    /* botões de toque: segurar ◀ ▶ anda; ▲ pula ou sobe a escada; ▼ desce a escada ou atravessa a plataforma */
    const botao = (id, aoApertar, aoSoltar) => {
      const b = document.getElementById(id);
      if (!b) return;
      const soltar = () => { if (!b.classList.contains('on')) return; b.classList.remove('on'); if (aoSoltar) aoSoltar(); };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* sem captura */ }
        b.classList.add('on');
        if (!game.pausado && !ui.modalAberto) aoApertar();
      });
      b.addEventListener('pointerup', soltar);
      b.addEventListener('pointercancel', soltar);
      b.addEventListener('lostpointercapture', soltar);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      b.addEventListener('click', (e) => e.preventDefault());
    };
    botao('t-esq', () => { teclas.add('arrowleft'); dir(); }, () => { teclas.delete('arrowleft'); dir(); });
    botao('t-dir', () => { teclas.add('arrowright'); dir(); }, () => { teclas.delete('arrowright'); dir(); });
    botao('t-pular', () => { game.input.subir = true; teclas.add('arrowup'); seg(); }, () => { teclas.delete('arrowup'); seg(); });
    botao('t-descer', () => { game.input.descer = true; teclas.add('arrowdown'); seg(); }, () => { teclas.delete('arrowdown'); seg(); });
    document.addEventListener('contextmenu', (e) => { if (LV.movel && e.target.closest && e.target.closest('#stage')) e.preventDefault(); });

    /* clique esquerdo numa criatura: só o domador ataca. Clique direito: domador e pets atacam juntos.
       No toque: tocar = só o domador; segurar o dedo ~0,45 s = todos. Clique no cenário: andar até lá. */
    const noMundo = (e) => {
      const r = cv.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) * (cv.width / r.width)) / game.scale + game.W.cam,
        y: ((e.clientY - r.top) * (cv.height / r.height)) / game.scale - (game.viewH - LV.VIEW_H),
      };
    };
    let toque = null;
    const cancelarToque = () => { if (toque) { clearTimeout(toque.timer); toque = null; } };
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      if (!game.W) return;
      const { x, y } = noMundo(e);
      const dedo = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (game.captura && game.captura.fase === 'mira') {
        if (e.button === 2) return;
        if (!game.mirarEm(x, y, dedo ? 85 : 50)) ui.toast((dedo ? LV.t('Toque') : LV.t('Clique')) + LV.t(' numa das criaturas selvagens destacadas.'), 'ruim', true);
        return;
      }
      if (game.pausado || game.pausaAviso) return;
      cv.focus({ preventScroll: true });
      const npc = e.button === 0 && game.npcEm(x, y);
      if (npc) { game.falarNpc(npc); LV.audio && LV.audio.tocar('clique'); return; }
      const alvo = game.inimigoEm(x, y, dedo ? 58 : 34);
      if (e.button === 2) {
        e.preventDefault();
        if (alvo && game.atacarAlvo(alvo, true)) LV.audio && LV.audio.tocar('clique');
        return;
      }
      if (e.button !== 0) return;
      if (alvo && dedo) {
        cancelarToque();
        toque = { alvo, id: e.pointerId, cx: e.clientX, cy: e.clientY, feito: false };
        toque.timer = setTimeout(() => {
          if (!toque) return;
          toque.feito = true;
          if (game.atacarAlvo(toque.alvo, true)) { if (navigator.vibrate) try { navigator.vibrate(25); } catch (err) { /* sem vibração */ } }
        }, 450);
        return;
      }
      if (alvo) { game.atacarAlvo(alvo, false); return; }
      game.irPara(x, y);
    });
    cv.addEventListener('pointerup', (e) => {
      if (!toque || toque.id !== e.pointerId) return;
      const t = toque; cancelarToque();
      if (!t.feito) game.atacarAlvo(t.alvo, false);
    });
    cv.addEventListener('pointercancel', cancelarToque);
    cv.addEventListener('pointermove', (e) => {
      if (!game.W) return;
      if (toque && toque.id === e.pointerId && Math.hypot(e.clientX - toque.cx, e.clientY - toque.cy) > 18) cancelarToque();
      if (e.pointerType !== 'mouse') return;
      const { x, y } = noMundo(e);
      if (game.captura && game.captura.fase === 'mira') {
        game.miraHover = game.alvoEm(x, y) || null;
        cv.style.cursor = game.miraHover ? 'pointer' : '';
        return;
      }
      if (game.miraHover) game.miraHover = null;
      const sob = !game.pausado && (game.inimigoEm(x, y, 34) || game.npcEm(x, y));
      cv.style.cursor = sob ? 'pointer' : '';
    });
  }

  /* ---------- início ---------- */
  let iniciado = false;
  /* celular/tablet: tela de toque sem mouse (ou o app Android, que sempre é) */
  LV.plataforma = window.LV_PLATAFORMA || 'web';
  LV.movel = LV.plataforma === 'android' || /[?&]movel=1\b/.test(location.search) ||
    (!!window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches);
  document.documentElement.classList.toggle('movel', LV.movel);

  /* botão "voltar" do Android: fecha o que estiver aberto; devolve false quando não há nada para fechar */
  LV.voltar = function () {
    if (ui.afk.ativo) { ui.afk.retomar(); return true; }
    if (document.documentElement.classList.contains('diario')) { ui.diario(false); return true; }
    if (game.captura && game.captura.fase === 'mira') { game.cancelarMira(); return true; }
    if (ui.modalAberto) { if (ui.modalAberto.fechavel !== false) ui.fecharModal(); return true; }
    if (ui.inicioVisivel()) return ui.inicioVoltar ? ui.inicioVoltar() : false;
    if (game.slot) { ui.abrirConfig(true); return true; }
    return false;
  };

  function start(hot) {
    if (iniciado) return;
    iniciado = true;
    cv = document.getElementById('cv');
    ctx = cv.getContext('2d');
    stage = document.getElementById('stage');
    if (LV.spr && LV.IMAGENS) LV.spr.carregar(LV.IMAGENS.concat(LV.FUNDOS || []), () => { if (ui.render) ui.render(); });
    LV.traduzirPagina(document.getElementById('app'));
    ui.init();
    resize(true);
    let hs = null;
    try { if (hot && typeof hot.save === 'string' && hot.slot) hs = JSON.parse(hot.save); } catch (e) { hs = null; }
    const volta = LV.lerRetomada();         // voltou de uma troca de idioma ou de uma atualização
    if (hs && hs.inicial) {
      game.slot = hot.slot;
      game.carregar(hs);
      game.pausado = false;
      ui.entrarNoJogo(false);
    } else if (volta && volta.slot && LV.carregarJogo(volta.slot)) {
      if (volta.vista === 'atualizacao') ui.toast(LV.t('Lumevale atualizado para a versão ') + ui.VERSAO, 'bom');
      else ui.abrirConfig(true);
    } else {
      demo();
      ui.mostrarInicio();
      if (volta && volta.vista === 'opcoes') ui.inicioOpcoes();
    }
    entrada();
    if (window.ResizeObserver) new ResizeObserver(() => pedirResize()).observe(stage);
    window.addEventListener('resize', () => pedirResize());
    setInterval(() => LV.salvar(false), 10000);
    setInterval(salvarNuvem, 60000);
    let escondidoEm = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { escondidoEm = Date.now(); LV.salvar(true); }
      else if (escondidoEm) { const ms = Date.now() - escondidoEm; escondidoEm = 0; ultimo = performance.now(); if (game.slot && !game.pausado) aplicarOffline(ms); }
    });
    window.addEventListener('pagehide', () => LV.salvar(true));
    try {
      const hk = window.claude && window.claude.hot;
      if (hk && typeof hk.snapshot === 'function') hk.snapshot(() => ({ save: game.slot ? JSON.stringify(game.S) : null, slot: game.slot }));
    } catch (e) { /* recarga sem estado */ }
    conectarNuvem();
    atualizacoesDoApp();
    requestAnimationFrame(loop);
  }

  const hot = window.claude && window.claude.hot;
  try {
    if (hot && typeof hot.ready === 'function') { hot.ready(start); setTimeout(() => start({}), 2500); }
    else start((hot && hot.data) || {});
  } catch (e) { start({}); }
})();
