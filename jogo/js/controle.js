'use strict';
/* Lumevale — controle por joystick (v1.19): Joy-Con / Pro Controller no Switch e controles no PC (Gamepad API).
   No jogo: analógico esquerdo ou direcional anda (▲ sobe escada, ▼ desce), A pula, B ataca / fala com quem está perto,
   X lanterna (captura), Y caçada automática, R abre o Diário, L Bestiário, ZR desafia o Guardião, ZL troca o modo das
   Centelhas, + Configurações, − Conquistas.
   Nos menus (janelas, Diário, tela inicial): direcional / analógico move o destaque entre os botões, A aperta,
   B volta, L e R trocam a aba do Diário. Setas + Enter do teclado fazem o mesmo nas janelas.
   Botões no layout padrão do navegador: 0 = de baixo (B no Switch), 1 = da direita (A), 2 = da esquerda (Y), 3 = de cima (X). */
(function () {
  const LV = window.LV, game = LV.game, ui = LV.ui;
  if (!LV || !game || !ui) return;
  const html = document.documentElement;
  const SEL = 'button:not([disabled]), [data-act]:not([disabled]), [data-m]:not([disabled]), [role="tab"], input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
  let foco = null, menuDiario = false;

  /* ---------- onde está o "menu" que recebe a navegação ---------- */
  const diarioAberto = () => html.classList.contains('diario') || (!LV.movel && !document.getElementById('app').classList.contains('sem-painel') && menuDiario);
  function escopo() {
    if (ui.afk && ui.afk.ativo) return document.getElementById('afk');
    if (ui.modalAberto) return document.querySelector('#modal .mbox') || document.getElementById('modal');
    if (ui.inicioVisivel && ui.inicioVisivel()) return document.getElementById('inicio');
    if (diarioAberto()) return document.getElementById('panel') || document.querySelector('.panel');
    return null;
  }
  const visivel = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
  const alvos = (raiz) => [...raiz.querySelectorAll(SEL)].filter((el) => !el.closest('[hidden]') && visivel(el));
  function marcar(el) {
    if (foco && foco !== el) foco.classList.remove('foco-pad');
    foco = el;
    if (!el) return;
    el.classList.add('foco-pad');
    try { el.focus({ preventScroll: true }); } catch (e) { /* sem foco */ }
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function garantirFoco(raiz) {
    if (foco && raiz.contains(foco) && foco.isConnected && visivel(foco)) return foco;
    const at = document.activeElement;
    const lista = alvos(raiz);
    const ini = at && raiz.contains(at) && lista.includes(at) ? at : lista.find((e) => e.matches('.pri, [data-m="girar"], .sel, [aria-selected="true"]')) || lista[0];
    marcar(ini || null);
    return foco;
  }
  /* navegação espacial: o próximo alvo na direção, o mais alinhado e perto */
  function mover(dx, dy) {
    const raiz = escopo();
    if (!raiz) return false;
    const atual = garantirFoco(raiz);
    if (!atual) return true;
    const a = atual.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let melhor = null, nota = Infinity;
    for (const el of alvos(raiz)) {
      if (el === atual || atual.contains(el) || el.contains(atual)) continue;
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const px = (cx - ax) * dx + (cy - ay) * dy;               // distância na direção pedida
      if (px <= 4) continue;
      const lado = Math.abs((cx - ax) * dy) + Math.abs((cy - ay) * dx);   // desvio para os lados
      const n = px + lado * 2.2;
      if (n < nota) { nota = n; melhor = el; }
    }
    if (melhor) marcar(melhor);
    else if (dy) { const sc = raiz.closest('.mbox, #panel, .panel, #inicio') || raiz; sc.scrollBy({ top: dy * 120, behavior: 'smooth' }); }
    return true;
  }
  function apertar() {
    const raiz = escopo();
    if (!raiz) return false;
    const el = garantirFoco(raiz);
    if (el) el.click();
    return true;
  }
  function voltar() {
    if (game.captura && game.captura.fase === 'mira') { game.cancelarMira(); return true; }
    if (ui.afk && ui.afk.ativo) { ui.afk.retomar(); return true; }
    if (ui.modalAberto) { if (ui.modalAberto.fechavel !== false) ui.fecharModal(); marcar(null); return true; }
    if (html.classList.contains('diario')) { ui.diario(false); menuDiario = false; marcar(null); return true; }
    if (menuDiario) { menuDiario = false; marcar(null); return true; }
    if (ui.inicioVisivel && ui.inicioVisivel() && ui.inicioVoltar) { ui.inicioVoltar(); return true; }
    return false;
  }
  function trocarAba(passo) {
    const abas = [...document.querySelectorAll('#tabs .tab, .tabs .tab')].filter(visivel);
    if (!abas.length) return;
    const i = abas.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const prox = abas[(i + passo + abas.length) % abas.length];
    prox.click(); marcar(prox);
  }
  function abrirDiario() {
    if (ui.gavetaAtiva && ui.gavetaAtiva()) ui.diario(true);
    else if (ui.painel) ui.painel(true);
    menuDiario = true;
    marcar(null);
    const raiz = escopo(); if (raiz) garantirFoco(raiz);
  }

  /* ---------- mira da lanterna: escolher a criatura com o direcional ---------- */
  let miraIdx = 0;
  function selvagensNaTela() {
    const W = game.W; if (!W) return [];
    const cam = W.cam || 0, vw = game.viewW || 960;
    return W.ini.filter((e) => e.tipo === 'selvagem' && e.hp > 0 && !e.capt && e.x > cam - 20 && e.x < cam + vw + 20).sort((a, b) => a.x - b.x);
  }
  function miraPasso(passo) {
    const l = selvagensNaTela(); if (!l.length) return;
    miraIdx = (miraIdx + passo + l.length) % l.length;
    game.miraHover = l[miraIdx];
  }
  function miraLancar() {
    const l = selvagensNaTela(); if (!l.length) return;
    const e = game.miraHover && l.includes(game.miraHover) ? game.miraHover : l[0];
    game.mirarEm(e.x, e.y - (e.h || 40) * 0.4, 90);
  }

  /* ---------- ações no jogo ---------- */
  function atacarOuFalar() {
    const W = game.W; if (!W || !W.tam) return;
    const T = W.tam;
    if (W.lugar && game.npcEm) {
      const n = (W.npcs || []).filter((x) => Math.abs(x.x - T.x) < 140 && Math.abs(x.y - T.y) < 120).sort((a, b) => Math.abs(a.x - T.x) - Math.abs(b.x - T.x))[0];
      if (n) { game.falarNpc(n); return; }
    }
    const alvo = W.ini.filter((e) => e.hp > 0 && !e.capt && Math.abs(e.x - T.x) < 420).sort((a, b) => Math.abs(a.x - T.x) - Math.abs(b.x - T.x))[0];
    if (alvo) game.atacarAlvo(alvo, false);
  }
  const clicar = (id) => { const b = document.getElementById(id); if (b && !b.hidden && !b.disabled) b.click(); };

  /* ---------- leitura dos controles ---------- */
  const antes = {};
  let repete = { k: null, t: 0 };
  const MODOS = ['agressivo', 'defensor', 'passivo'];
  function botaoAgora(gp, i) { const b = gp.buttons[i]; return !!(b && (b.pressed || b.value > 0.5)); }
  function laco(now) { requestAnimationFrame(laco); ler(now); }
  function ler(now) {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    if (!pads.length) return;
    const gp = pads[0];
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const esq = botaoAgora(gp, 14) || ax < -0.5, dir = botaoAgora(gp, 15) || ax > 0.5;
    const cima = botaoAgora(gp, 12) || ay < -0.6, baixo = botaoAgora(gp, 13) || ay > 0.6;
    const agora = { a: botaoAgora(gp, 1), b: botaoAgora(gp, 0), x: botaoAgora(gp, 3), y: botaoAgora(gp, 2), l: botaoAgora(gp, 4), r: botaoAgora(gp, 5), zl: botaoAgora(gp, 6), zr: botaoAgora(gp, 7), menos: botaoAgora(gp, 8), mais: botaoAgora(gp, 9), esq, dir, cima, baixo };
    const prev = { ...antes }, desceu = (k) => agora[k] && !prev[k];
    Object.assign(antes, agora);
    if (ui.marcarAtividade && Object.values(agora).some(Boolean)) ui.marcarAtividade();
    const raiz = escopo();
    const mira = game.captura && game.captura.fase === 'mira';
    // repetição ao segurar uma direção (menus e mira)
    const dirK = esq ? 'esq' : dir ? 'dir' : cima ? 'cima' : baixo ? 'baixo' : null;
    let passo = null;
    if (dirK && dirK !== repete.k) { repete = { k: dirK, t: now + 380 }; passo = dirK; }
    else if (dirK && now >= repete.t) { repete.t = now + 130; passo = dirK; }
    else if (!dirK) repete.k = null;
    if (raiz && !mira) {
      game.input.dir = 0; game.input.segSubir = false; game.input.segDescer = false;
      if (passo) mover(passo === 'esq' ? -1 : passo === 'dir' ? 1 : 0, passo === 'cima' ? -1 : passo === 'baixo' ? 1 : 0);
      if (desceu('a')) apertar();
      if (desceu('b')) voltar();
      if (diarioAberto() && !ui.modalAberto) { if (desceu('r')) trocarAba(1); if (desceu('l')) trocarAba(-1); }
      return;
    }
    if (!game.slot || !game.W) return;
    if (mira) {
      if (passo === 'esq') miraPasso(-1); if (passo === 'dir') miraPasso(1);
      if (desceu('a') || desceu('x')) miraLancar();
      if (desceu('b')) game.cancelarMira();
      return;
    }
    // jogo
    game.input.dir = (dir ? 1 : 0) - (esq ? 1 : 0);
    game.input.segSubir = cima; game.input.segDescer = baixo;
    if (cima && !antes._cima) game.input.subir = true;
    if (baixo && !antes._baixo) game.input.descer = true;
    antes._cima = cima; antes._baixo = baixo;
    if (desceu('a')) game.input.pular = true;
    if (desceu('b')) atacarOuFalar();
    if (desceu('x')) { clicar('b-lant'); miraIdx = 0; miraPasso(0); }
    if (desceu('y')) clicar('b-auto');
    if (desceu('zr')) clicar('b-chefe');
    if (desceu('zl') && ui.escolherModo) { const m = game.S.op.modoPets; ui.escolherModo(MODOS[(MODOS.indexOf(m) + 1) % 3]); }
    if (desceu('r')) abrirDiario();
    if (desceu('l')) ui.abrirBestiario();
    if (desceu('mais')) ui.abrirConfig(true);
    if (desceu('menos')) ui.abrirConquistas();
  }
  window.addEventListener('gamepadconnected', () => { if (ui.toast) ui.toast(LV.t('Controle conectado: A pula, B ataca, X lanterna, R abre o Diário.'), 'bom', true); });
  requestAnimationFrame(laco);

  /* ---------- teclado nas janelas: setas movem o destaque, Enter aperta ---------- */
  window.addEventListener('keydown', (e) => {
    const raiz = escopo();
    if (!raiz || !ui.modalAberto && !(ui.inicioVisivel && ui.inicioVisivel())) return;
    const t = e.target;
    if (t && t.matches && t.matches('input[type="text"], input:not([type]), textarea, select, input[type="range"]')) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (d) { e.preventDefault(); mover(d[0], d[1]); }
  }, true);
  // clicar com o mouse ou tocar tira o destaque do controle
  document.addEventListener('pointerdown', () => { if (foco) { foco.classList.remove('foco-pad'); foco = null; } menuDiario = false; }, true);
  LV.controle = { mover, apertar, voltar, ler };
})();
