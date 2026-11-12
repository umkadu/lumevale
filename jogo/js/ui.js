'use strict';
/* Lumevale — interface: HUD, painel de abas, janelas e console do criador. */
(function () {
  const LV = window.LV, game = LV.game, art = LV.art, fmt = LV.fmt;
  const ui = (LV.ui = { aba: 'equipe', sel: null, confirmar: null, log: [], hist: [], histI: -1 });
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = {
    lumes: '<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8 10.4 6 6 11.2 1.6 6Z" fill="#f2d38a" stroke="#05060a" stroke-width="1"/><path d="M6 .8 6 11.2 1.6 6Z" fill="#ffecb8" opacity=".55"/></svg>',
    lant: '<svg class="ic" viewBox="0 0 12 14" aria-hidden="true"><path d="M3 5h6l1 7H2Z" fill="#ffe7b0" stroke="#05060a"/><path d="M2.4 5 6 1.6 9.6 5Z" fill="#05060a"/></svg>',
    eco: '<svg class="ic eco" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1C4.4 3.4 3.2 5.6 3.2 8a3.8 3.8 0 0 0 7.6 0C10.8 5.6 9.6 3.4 7 1Z" fill="#b9a6ff" stroke="#05060a"/><path d="M7 5.2C6 6.4 5.6 7.4 5.6 8.3a1.4 1.4 0 0 0 2.8 0C8.4 7.4 8 6.4 7 5.2Z" fill="#f4f0ff"/></svg>',
    cadeado: '<svg class="ic" viewBox="0 0 12 14" aria-hidden="true"><path d="M3.5 6V4.4a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="2" y="6" width="8" height="6.5" rx="1" fill="currentColor"/></svg>',
  };
  const ABAS = [['equipe', LV.t('Equipe')], ['domador', LV.t('Domador')], ['mapas', LV.t('Mapas')], ['santuario', LV.t('Santuário')], ['bolsa', LV.t('Bolsa')], ['ajuda', LV.t('Ajuda')]];
  const S = () => game.S;
  const ATALHOS = { equipe: 'E', domador: 'T', mapas: 'M', santuario: 'R', bolsa: 'B', ajuda: 'H' };
  ui.ATALHOS = ATALHOS;
  /* atalho de teclado de uma aba: abre o Diário nela; apertar de novo na mesma aba fecha */
  ui.atalhoAba = function (aba) {
    const app = document.getElementById('app'), raiz = document.documentElement;
    const visivel = ui.gavetaAtiva() ? raiz.classList.contains('diario') : !app.classList.contains('sem-painel');
    if (visivel && ui.aba === aba) { if (ui.gavetaAtiva()) ui.diario(false); else ui.painel(false); return; }
    if (ui.gavetaAtiva()) { if (!visivel) ui.diario(true); } else if (!visivel) ui.painel(true);
    ui.abrir(aba); som('clique');
    const t = document.getElementById('tab-' + aba);
    if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  const som = (k) => { if (LV.audio) LV.audio.tocar(k); };
  const VERSAO = '1.17.0';
  ui.VERSAO = VERSAO;
  let el = {};

  /* app instalado pelo site: versão nova baixada durante o jogo → aviso com botão (fica até tocar) */
  ui.avisoAtualizacao = function (aplicar) {
    if (!el.toasts || el.toasts.querySelector('.toast.atualizar')) return;
    const d = document.createElement('div');
    d.className = 'toast atualizar';
    d.innerHTML = '<span>' + LV.t('Nova versão do Lumevale pronta.') + '</span><button type="button" class="btn pri">' + LV.t('Atualizar') + '</button>';
    d.querySelector('button').addEventListener('click', () => { som('clique'); d.querySelector('button').disabled = true; aplicar(); });
    el.toasts.prepend(d);
  };

  /* =================== HISTÓRIA =================== */
  /* abertura: telas da história antes do novo jogo (pode pular); algumas mostram criaturas */
  ui.abertura = function (fim) {
    const H = LV.historia(), telas = H.abertura, box = document.getElementById('abertura');
    let i = 0;
    const fundo = document.getElementById('ab-fundo'), txt = document.getElementById('ab-txt'), pontos = document.getElementById('ab-pontos');
    const seguir = document.getElementById('ab-seguir'), pular = document.getElementById('ab-pular'), heroi = document.getElementById('ab-heroi');
    pular.textContent = H.pular;
    const mostrar = () => {
      const t = telas[i];
      fundo.style.backgroundImage = 'url(img/fundos/' + t.fundo + '.webp)';
      txt.innerHTML = t.txt;
      txt.classList.remove('entra'); void txt.offsetWidth; txt.classList.add('entra');
      heroi.hidden = !t.heroi;
      const cand = document.getElementById('ab-candeia');
      if (cand) cand.hidden = !t.candeia;
      const cri = document.getElementById('ab-criaturas');
      if (cri) {
        cri.hidden = !t.criaturas;
        cri.className = 'ab-criaturas' + (t.criaturas ? ' ' + t.criaturas.tipo : '');
        cri.innerHTML = t.criaturas ? t.criaturas.imgs.map((n) => '<img src="img/' + n + '.webp" alt="">').join('') : '';
      }
      pontos.innerHTML = telas.map((x, k) => '<i' + (k === i ? ' class="on"' : '') + '></i>').join('');
      seguir.textContent = i === telas.length - 1 ? H.comecar : H.continuar;
      try { seguir.focus({ preventScroll: true }); } catch (e) { /* ok */ }
    };
    const acabar = () => {
      box.hidden = true;
      document.removeEventListener('keydown', tecla, true);
      seguir.onclick = pular.onclick = null;
      fim();
    };
    const tecla = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); acabar(); }
    };
    seguir.onclick = () => { som('clique'); if (++i >= telas.length) acabar(); else mostrar(); };
    pular.onclick = () => { som('clique'); acabar(); };
    document.addEventListener('keydown', tecla, true);
    box.hidden = false;
    mostrar();
  };
  /* Diário de Mestra Candeia: lista das páginas ou uma página aberta */
  function htmlPagina(p) {
    const H = LV.historia(), pg = H.paginas[p];
    return '<div class="diario-pag"><div class="eyebrow">' + H.diario + ' · ' + H.pagina + ' ' + (p + 1) + '</div><h2>' + pg.t + '</h2>' +
      '<div class="papel">' + pg.txt.map((x) => '<p>' + x + '</p>').join('') + '<p class="assina">— C.</p></div>' +
      '<div class="row end"><button class="btn" data-m="diario">' + H.voltar + '</button><button class="btn pri" data-m="fechar">' + H.fechar + '</button></div></div>';
  }
  ui.diarioCandeia = function (p) {
    const H = LV.historia(), achadas = S().meta.diario || [];
    if (p != null && achadas.includes(p)) { ui.modal(htmlPagina(p), { cls: 'diario-m' }); return; }
    const lista = H.paginas.map((pg, i) => achadas.includes(i)
      ? '<button class="diario-item" data-m="lerPagina" data-p="' + i + '"><span class="n">' + (i + 1) + '</span><span><b>' + pg.t + '</b><small>' + LV.MAPS[i].nome + '</small></span><span class="ler">' + H.ler + ' ›</span></button>'
      : '<div class="diario-item bloq"><span class="n">' + (i + 1) + '</span><span><b>???</b><small>' + H.bloqueada(LV.MAPS[i].chefe.nome) + '</small></span></div>').join('');
    ui.modal('<div class="cabec"><div><div class="eyebrow">' + achadas.length + ' / ' + H.paginas.length + '</div><h2>' + H.diario + '</h2><p class="muted small">' + H.diarioSub + '</p></div>' +
      '<button class="btn" data-m="fechar">' + H.fechar + '</button></div><div class="diario-lista">' + lista + '</div>', { cls: 'diario-m' });
  };
  /* final: depois da primeira vitória sobre o Coração Ígneo */
  ui.modalFinal = function () {
    const F = LV.historia().final;
    ui.modal('<div class="final"><div class="eyebrow">' + F.olho + '</div><h2>' + F.titulo + '</h2>' + F.txt.map((x) => '<p>' + x + '</p>').join('') +
      '<blockquote>' + F.citacao + '<cite>— ' + F.autor + '</cite></blockquote><p>' + F.lenda + '</p><p class="gancho">' + F.gancho + '</p><p class="muted small">' + F.depois + '</p>' +
      '<div class="row end"><button class="btn pri" data-m="fechar">' + F.botao + '</button></div></div>', { cls: 'final-m', fechavel: false });
    som('evolucao');
  };

  /* =================== AVISO CONGELADO =================== */
  /* o jogo para e um cartão explica o próximo passo; sem botão, ele some quando o jogador faz o que foi pedido */
  ui.avisoPausa = function (o) {
    const box = document.getElementById('aviso-pausa');
    game.pausaAviso = true;
    document.getElementById('ap-olho').textContent = o.olho || '';
    document.getElementById('ap-txt').innerHTML = o.texto;
    const ok = document.getElementById('ap-ok');
    ok.hidden = !o.botao; ok.textContent = o.botao || '';
    ok.onclick = () => { som('clique'); ui.fecharAvisoPausa(); if (o.aoOk) o.aoOk(); };
    document.querySelectorAll('.ap-alvo').forEach((x) => x.classList.remove('ap-alvo'));
    if (o.destaque) { const d = document.querySelector(o.destaque); if (d) d.classList.add('ap-alvo'); }
    box.classList.toggle('sem-botao', !o.botao);
    box.hidden = false;
    if (o.botao) setTimeout(() => { try { ok.focus({ preventScroll: true }); } catch (e) { /* ok */ } }, 40);
  };
  ui.fecharAvisoPausa = function () {
    document.getElementById('aviso-pausa').hidden = true;
    document.querySelectorAll('.ap-alvo').forEach((x) => x.classList.remove('ap-alvo'));
    game.pausaAviso = false;
  };
  /* primeiro mapa de verdade (depois do tutorial ou ao pular): o objetivo, com o jogo parado */
  function avisoMeta(depois) {
    const n = game.metaChefe(), verbo = LV.movel ? LV.t('toque') : LV.t('clique');
    game.pausaAviso = true;
    setTimeout(() => ui.avisoPausa({
      olho: LV.t('Seu objetivo'),
      texto: LV.t('Derrote ') + '<b>' + n + LV.t(' criaturas</b> neste mapa para chamar ') + '<b>' + esc(game.W.def.chefe.nome) + '</b>' +
        LV.t(', o Guardião que prende a luz desta camada. O contador fica no alto, à direita. Quando ele encher, ') +
        verbo + LV.t(' em <b>Desafiar Guardião</b>: vencer solta a luz e abre o caminho para o próximo mapa.'),
      botao: LV.t('Vamos lá!'), destaque: '.hud-map', aoOk: depois,
    }), 2600);   // deixa o nome do mapa aparecer e sumir antes
  }

  /* =================== TUTORIAL =================== */
  ui.tutorial = function (tu) {
    const box = document.getElementById('tut'), txt = document.getElementById('tut-txt');
    document.getElementById('b-lant').classList.toggle('tut-alvo', !!tu && tu.passo === 'lanterna');
    if (!tu || tu.passo !== 'lanterna') { if (game.pausaAviso && !document.getElementById('aviso-pausa').hidden) ui.fecharAvisoPausa(); }
    if (!tu || tu.passo === 'minijogo' || tu.passo === 'fim') {
      box.hidden = true;
      if (tu && tu.passo === 'fim') modalTutorialFim(tu.pet);
      return;
    }
    if (tu.passo === 'lanterna') {
      box.hidden = true;
      const nm = '<b>' + esc(tu.alvo.nome) + '</b>', vb = LV.movel ? LV.t('Toque') : LV.t('Clique');
      ui.avisoPausa({
        olho: tu.escapou ? LV.t('Quase!') : LV.t('Ele está fraco!'),
        texto: (tu.escapou
          ? nm + LV.t(' escapou da lanterna, mas continua fraco. ') + vb + LV.t(' na lanterna para tentar de novo!')
          : nm + LV.t(' está com pouca vida: mais um ataque pode derrotá-lo. Com a luz fraca, ele aceita o abrigo da lanterna. ') + vb + LV.t(' na lanterna para capturá-lo!')) +
          '<span class="ap-chance">' + LV.t('Chance de captura agora: ') + '<b>' + Math.round(game.chanceTutorial() * 100) + '%</b>' + (LV.movel ? '' : LV.t(' · ou aperte Q')) + '</span>',
        destaque: '#b-lant',
      });
      return;
    }
    const nome = '<b>' + esc(tu.alvo.nome) + '</b>', verbo = LV.movel ? LV.t('Toque') : LV.t('Clique');
    let h = '';
    if (tu.passo === 'atacar') {
      h = LV.t('Este é ') + nome + LV.t(', uma Centelha: criatura nascida do Lume. ') + verbo + LV.t(' nele para atacar com a sua lanterna e baixar a vida dele.');
    } else if (tu.passo === 'mirar') {
      h = verbo + LV.t(' na criatura destacada para lançar a lanterna. O jogo fica pausado enquanto você mira.');
    }
    txt.innerHTML = h;
    box.hidden = false;
  };
  function modalTutorialFim(pet) {
    const nome = esc(LV.nomePet(pet));
    ui.modal('<div class="tut-fim"><div class="eyebrow">' + LV.t('Primeiro companheiro') + '</div><h2>' + nome + LV.t(' agora é seu!') + '</h2>' +
      '<div class="tut-fim-pet"><img src="' + art.retrato(pet.sp, pet.est, 128) + '" alt="" width="112" height="112"><div>' +
      '<p>' + LV.t('Parabéns pela sua primeira captura! ') + nome + LV.t(' vai lutar ao seu lado, ganhar níveis e mudar de forma.') + '</p>' +
      (pet.bonus ? '<p class="talento-l">★ ' + LV.t('Talento ') + '<b>' + LV.TALENTOS[pet.bonus.t].nome + '</b>: ' + LV.TALENTOS[pet.bonus.t].desc(pet.bonus.v) + '</p>' : '') +
      '<p class="acc">' + LV.t('Agora desça e devolva a luz ao vale.') + '</p></div></div>' +
      '<div class="row end"><button class="btn pri" data-m="tutFim">' + LV.t('Começar a aventura') + '</button></div></div>', { fechavel: false, cls: 'tut-fim-m' });
    som('nivel');
  }
  // fim do tutorial (parabéns ou "Pular"): primeiro mapa de verdade, save gravado e boas-vindas
  function terminarTutorial() {
    ui.fecharAvisoPausa();
    if (!game.concluirTutorial()) return;
    document.getElementById('tut').hidden = true;
    document.getElementById('b-lant').classList.remove('tut-alvo');
    LV.salvar(true);
    ui.entrarNoJogo(true);
  }
  ui.terminarTutorial = terminarTutorial;

  /* copia texto (área de transferência ou, se não der, seleção manual) */
  function copiarTexto(txt, caixa) {
    const manual = () => {
      if (!caixa) return false;
      caixa.hidden = false; caixa.value = txt; caixa.focus(); caixa.select();
      try { return document.execCommand('copy'); } catch (e) { return false; }
    };
    if (caixa) { caixa.hidden = false; caixa.value = txt; }
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt).then(() => true, manual);
    return Promise.resolve(manual());
  }

  function elChip(id) { const e = LV.EL[id]; return '<span class="el" style="--c:' + e.cor + '">' + e.nome + '</span>'; }
  /* especialidade da espécie (v1.16): Dano, Área, Suporte, Controle ou Tanque */
  function espChip(sp) { const E = LV.especDe(sp); return E ? '<span class="el esp" style="--c:' + E.cor + '" title="' + esc(E.nome + ': ' + E.desc) + '">' + E.curto + '</span>' : ''; }
  function barra(cls, pct, attr) { return '<div class="bar ' + cls + '"><i ' + (attr || '') + ' style="width:' + (LV.clamp(pct, 0, 1) * 100).toFixed(1) + '%"></i></div>'; }
  function petRT(uid) { return game.W ? game.W.pets.find((p) => p.uid === uid) : null; }

  /* =================== INICIALIZAÇÃO =================== */
  ui.init = function () {
    el = {
      lv: $('#h-lv'), rank: $('#h-rank'), nome: $('#h-nome'), xp: $('#h-xp'), hp: $('#h-hp'), lumes: $('#h-lumes'), lant: $('#h-lant'),
      mapa: $('#h-mapa'), guard: $('#h-guard'), bChefe: $('#b-chefe'), pets: $('#h-pets'), bAuto: $('#b-auto'), bAband: $('#b-abandonar'),
      vel: $('#h-vel'), boss: $('#bossbar'), bNome: $('#h-bnome'), bHp: $('#h-bhp'), bTempo: $('#h-btempo'), toasts: $('#toasts'),
      tabs: $('#tabs'), pane: $('#pane'), modal: $('#modal'), mbox: $('#mbox'), save: $('#savestate'), stage: $('#stage'), inicio: $('#inicio'), lant2: $('#h-lant2'),
    };
    el.tabs.innerHTML = ABAS.map((a) => '<button class="tab' + (a[0] === 'ajuda' ? ' tab-ajuda' : '') + '" role="tab" id="tab-' + a[0] + '" data-aba="' + a[0] + '" aria-selected="' + (a[0] === ui.aba) + '"' +
      ' title="' + a[1] + ' (' + ATALHOS[a[0]] + ')"' + (a[0] === 'ajuda' ? ' aria-label="' + a[1] + '">?' : '>' + a[1]) + '</button>').join('');
    // barra de abas: a roda do mouse rola para o lado quando as abas não cabem
    el.tabs.addEventListener('wheel', (e) => {
      if (el.tabs.scrollWidth <= el.tabs.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      el.tabs.scrollLeft += e.deltaY; e.preventDefault();
    }, { passive: false });
    el.tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-aba]'); if (b) { ui.abrir(b.dataset.aba); som('clique'); } });
    el.pane.addEventListener('click', clique);
    iniciarArrasto();
    const bDesafio = document.getElementById('b-desafio');
    bDesafio.addEventListener('click', () => {
      const r = game.acao.alternarDesafio();
      if (r === 'bloqueado') {
        const n = game.desafioAutoEtapas();
        ui.toast(LV.t('O Desafio Automático deste mapa ainda não foi liberado. Compre a etapa ') + (game.W.idx + 1) + LV.t(' no Santuário') + (n < game.W.idx ? LV.t(' (as etapas são liberadas em ordem).') : '.'), 'ruim', true);
        return;
      }
      ui.toast(r ? LV.t('Desafio automático ligado: ao completar a meta, o Guardião é desafiado sozinho.') : LV.t('Desafio automático desligado.'), r ? 'bom' : '', true);
      hud(); som('clique');
    });
    el.bAuto.addEventListener('click', () => {
      if (game.acao.alternar('auto') === 'bloqueado') { ui.toast(LV.t('A caçada automática desbloqueia a partir do mapa 2. Vença a ') + LV.MAPS[0].chefe.nome + '.', 'ruim', true); return; }
      hud(); som('clique'); sujo(['bolsa']);
    });
    /* comando dos pets: Agressivo, Defensor, Passivo */
    const menuModo = $('#modo-menu'), bModo = $('#b-modo');
    const fecharMenuModo = () => { menuModo.hidden = true; bModo.setAttribute('aria-expanded', 'false'); };
    bModo.addEventListener('click', (e) => {
      e.stopPropagation();
      const abrir = menuModo.hidden;
      menuModo.hidden = !abrir; bModo.setAttribute('aria-expanded', String(abrir));
      som('clique');
    });
    menuModo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-modo]');
      if (!b) return;
      ui.escolherModo(b.dataset.modo);
      fecharMenuModo();
    });
    document.addEventListener('pointerdown', (e) => { if (!menuModo.hidden && !e.target.closest('#modo-pets')) fecharMenuModo(); });
    el.bChefe.addEventListener('click', () => { if (game.desafiarChefe()) hud(); });
    $('#h-skills').addEventListener('click', (e) => { const b = e.target.closest('[data-sk]'); if (b) ui.usarSkill(b.dataset.sk); });
    $('#b-sair').addEventListener('click', () => { som('clique'); game.acao.sairLugar(); LV.salvarLogo(); });
    $('#b-dps-zerar').addEventListener('click', () => { som('clique'); game.acao.zerarDps(); hud(); });
    el.bAband.addEventListener('click', () => { game.abandonarChefe(); hud(); som('clique'); });
    $('#b-config').addEventListener('click', () => { ui.abrirConfig(true); som('clique'); });
    $('#b-tut-pular').addEventListener('click', () => { som('clique'); if (game.captura && game.captura.fase === 'mira') game.cancelarMira(); terminarTutorial(); });
    $('#b-lant').addEventListener('click', () => {
      if (game.captura && game.captura.fase === 'mira') { game.cancelarMira(); return; }
      const r = game.iniciarMira();
      if (r === true) { som('clique'); return; }
      if (r === 'tutorial') { ui.toast(LV.t('Primeiro enfraqueça ') + game.tutorial.alvo.nome + ': ' + (LV.movel ? LV.t('toque') : LV.t('clique')) + LV.t(' nele para atacar.'), 'ruim', true); return; }
      const msg = { lugar: LV.t('Não há criaturas para capturar aqui.'), sem: LV.t('Sem lanternas. Compre mais com o Mestre Pavio, na Vila de Alvorada.'), cheio: LV.t('Sua coleção está cheia (80 Centelhas).'), ninguem: LV.t('Nenhuma criatura selvagem na tela. Procure os ninhos com o losango colorido.') }[r];
      if (msg) ui.toast(msg, 'ruim', true);
    });
    /* ocultar/expandir o menu lateral (lembrado neste navegador) */
    const bPainel = $('#b-painel');
    ui.painel = function (mostrar) {
      const app = document.getElementById('app');
      const on = mostrar == null ? app.classList.contains('sem-painel') : !!mostrar;
      app.classList.toggle('sem-painel', !on);
      bPainel.setAttribute('aria-expanded', String(on));
      bPainel.title = on ? LV.t('Ocultar o menu lateral') : LV.t('Mostrar o menu lateral');
      try { localStorage.setItem('lumevale.painel', on ? '1' : '0'); } catch (err) { /* sem armazenamento */ }
      if (on) ui.render();
    };
    bPainel.addEventListener('click', () => { som('clique'); ui.painel(); });
    try { if (localStorage.getItem('lumevale.painel') === '0') ui.painel(false); } catch (err) { /* sem armazenamento */ }
    $('#b-best').addEventListener('click', () => { som('clique'); ui.abrirBestiario(); });
    $('#b-conq').addEventListener('click', () => { som('clique'); ui.abrirConquistas(); });
    $('#b-retomar').addEventListener('click', () => ui.afk.retomar());
    LV.on('coletaVisual', (d) => { if (d.tipo === 'lumes') ui.lumesPendentes = Math.max(0, ui.lumesPendentes - d.q); });
    let ultimoAvisoBest = 0;
    LV.on('bestiario', (id) => {
      const b = LV.besta(id);
      if (!b || afk.ativo) return;
      const agora = Date.now();
      if (agora - ultimoAvisoBest > 1500) { ultimoAvisoBest = agora; ui.toast(LV.t('Nova criatura no Bestiário: ') + b.nome, '', true); }
      reabrirEspecial();
    });
    LV.on('conquista', (c) => {
      if (!afk.ativo) { ui.toast(LV.t('Conquista: ') + c.nome + (LV.movel ? LV.t(' · resgate no troféu') : LV.t('. Resgate a recompensa em Conquistas.')), 'chefe'); som('nivel'); }
      hud(); reabrirEspecial();
    });
    /* diário em gaveta (celular deitado) */
    $('#b-diario').addEventListener('click', () => ui.diario());
    $('#b-fechar-diario').addEventListener('click', () => ui.diario(false));
    $('#veu').addEventListener('click', () => ui.diario(false));
    if (LV.movel) {
      document.querySelectorAll('#hud [title], #hud [aria-label]').forEach((b) => {
        const tira = (v) => v.replace(/\s*\((?:[A-Z]|Esc|teclas [^)]*|keys [^)]*)\)$/, '');
        if (b.title) b.title = tira(b.title);
        if (b.getAttribute('aria-label')) b.setAttribute('aria-label', tira(b.getAttribute('aria-label')));
      });
      $('#mira-t').textContent = LV.t('Toque numa criatura selvagem');
      $('#mira-s').textContent = LV.t('Toque na lanterna de novo para cancelar');
    }
    LV.on('mira', (on) => {
      $('#mira').hidden = !on || !!game.tutorial;   // no tutorial, a faixa de cima já explica a mira
      document.getElementById('cv').classList.toggle('mirando', !!on);
      $('#b-lant').classList.toggle('ativo', !!on);
    });
    LV.on('minijogo', (d) => ui.minijogo(d));
    let apertouFora = false;
    el.modal.addEventListener('pointerdown', (e) => { apertouFora = e.target === el.modal; });
    el.modal.addEventListener('click', (e) => {
      // clique no fundo escuro (fora da caixa) fecha a janela, se ela puder ser fechada
      if (e.target === el.modal && apertouFora && ui.modalAberto && ui.modalAberto.fechavel !== false) { ui.fecharModal(); return; }
      const b = e.target.closest('[data-m]');
      if (!b) { clique(e); configClique(e); return; }
      som('clique');
      if (b.dataset.m === 'fechar') ui.fecharModal();
      else if (b.dataset.m === 'mapas') { ui.fecharModal(); ui.abrir('mapas'); ui.diario(true); }
      else if (b.dataset.m === 'proxmapa') { ui.fecharModal(); game.acao.viajar(+b.dataset.i); ui.render(); LV.salvarLogo(); }
      else if (b.dataset.m === 'console') { ui.fecharModal(); ui.abrirConsole(); }
      else if (b.dataset.m === 'inicial') escolherInicial(b.dataset.sp);
      else if (b.dataset.m === 'bsel') { ui.bestSel = b.dataset.id; reabrirEspecial(); }
      else if (b.dataset.m === 'autoSel') { ui.autoSel = b.dataset.attr; el.mbox.innerHTML = htmlEscolhaAuto(); }
      else if (b.dataset.m === 'autoConfirmar') {
        const at = ui.autoSel, r = at ? game.acao.comprarAutoAttr(at) : 'attr';
        if (r === true) { ui.fecharModal(); som('brilho'); ui.toast(nomeAttr(at) + LV.t(' agora recebe os pontos sozinho ao subir de nível'), 'bom'); }
        else ui.toast(r === 'ecos' ? LV.t('Ecos insuficientes') : r === 'max' ? LV.t('Todas as vagas já foram liberadas') : LV.t('Escolha um atributo'), 'ruim', true);
        ui.render(); LV.salvarLogo();
      }
      else if (b.dataset.m === 'autoResetConfirmar') {
        const r = game.acao.resetarAutoAttr();
        ui.fecharModal();
        if (r === true) { som('clique'); ui.toast(LV.t('Automações redefinidas: escolha de novo o atributo de cada vaga'), 'bom'); }
        else ui.toast(r === 'ecos' ? LV.t('Ecos insuficientes') : LV.t('Nada para redefinir'), 'ruim', true);
        ui.render(); LV.salvarLogo();
      }
      else if (b.dataset.m === 'resgatar') {
        const c = resgatar(b.dataset.id);
        if (c) { som('nivel'); ui.toast(LV.t('Recompensa: ') + LV.textoRecompensa(c.rec), 'bom'); }
        reabrirEspecial(); hud(); ui.render(); LV.salvarLogo();
      }
      else if (b.dataset.m === 'resgatarTodas') {
        const feitas = LV.CONQUISTAS.filter((c) => S().meta.conq[c.id] === 1).map((c) => resgatar(c.id)).filter(Boolean);
        if (feitas.length) { som('nivel'); ui.toast(feitas.length + LV.t(' recompensas resgatadas'), 'bom'); }
        reabrirEspecial(); hud(); ui.render(); LV.salvarLogo();
      }
      else if (b.dataset.m === 'tutFim') { ui.fecharModal(); terminarTutorial(); }
      else if (b.dataset.m === 'lerPagina') {
        const p = +b.dataset.p;
        if (ui.modalAberto && ui.modalAberto.cls === 'diario-m') { ui.fecharModal(); ui.diarioCandeia(p); }
        else { ui.fila.unshift([htmlPagina(p), { cls: 'diario-m' }]); ui.fecharModal(); }   // a página vem antes do que estava na fila (ex.: o final)
      }
      else if (b.dataset.m === 'diario') { ui.fecharModal(); ui.diarioCandeia(); }
      else if (b.dataset.m === 'irMapa') {
        ui.fecharModal();
        if (game.acao.viajar(+b.dataset.i)) { ui.diario(false); ui.render(); LV.salvarLogo(); }
      }
      else if (b.dataset.m === 'abrirBest') { ui.fecharModal(); ui.abrirBestiario(); }
      else if (b.dataset.m === 'abrirConq') { ui.fecharModal(); ui.abrirConquistas(); }
      else if (b.dataset.m === 'renascer') {
        ui.fecharModal();
        const g = game.acao.renascer();
        if (g === 'cedo') ui.toast(LV.t('Derrote o primeiro Guardião para poder renascer.'), 'ruim', true);
      }
    });
    el.modal.addEventListener('submit', (e) => { e.preventDefault(); if (e.target.id === 'cform') enviarConsole(); });
    el.modal.addEventListener('keydown', teclaConsole);
    el.modal.addEventListener('input', configEntrada);
    el.modal.addEventListener('change', configEntrada);
    el.inicio.addEventListener('click', inicioClique);
    el.inicio.addEventListener('input', (e) => { if (e.target.id === 'novo-nome') inicioValidar(); if (e.target.id === 'novo-pular') novo.pular = e.target.checked; configEntrada(e); });
    el.inicio.addEventListener('change', configEntrada);
    el.inicio.addEventListener('submit', (e) => { e.preventDefault(); const b = el.inicio.querySelector('[data-i="comecar"]'); if (b && !b.disabled) b.click(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.modalAberto && ui.modalAberto.fechavel !== false) { ui.fecharModal(); e.stopPropagation(); } });

    LV.on('toast', (d) => ui.toast(d.t, d.tipo, d.curto));
    LV.on('nivel', (n) => { ui.toast(LV.t('Nível ') + n + LV.t('! +3 pontos de atributo e +1 ponto de skill'), 'bom'); sujo(['domador', 'equipe', 'vila']); });
    LV.on('skill', () => { sujo(['domador']); hud(); });
    LV.on('titulo', () => { sujo(['domador', 'equipe']); hud(); });
    LV.on('podeEvoluir', (p) => { ui.toast(LV.nomePet(p) + LV.t(' já pode evoluir: nível, materiais e Lumes estão completos. Veja na aba Equipe.'), 'bom'); sujo(['equipe']); });
    LV.on('captura', (d) => {
      if (game.tutorial) return;
      if (d.pet.radCapt) { ui.toast(LV.t('Uma Centelha Radiante! ') + LV.nomePet(d.pet) + LV.t(' tem +30% de vida e ataque e +10% de velocidade.'), 'chefe'); som('nivel'); }
      ui.toast(LV.t('Capturou ') + LV.nomePet(d.pet) + LV.t(' (Nv ') + d.pet.nivel + ')' + (d.entrou ? LV.t(', já em campo') : LV.t(', foi para a coleção')), 'bom'); sujo(['equipe', 'bolsa']); LV.salvarLogo(); });
    LV.on('evolucao', (d) => { ui.modalEvolucao(d); som('evolucao'); sujo(['equipe']); LV.salvarLogo(); });
    LV.on('chefeVencido', (d) => { ui.modalChefe(d); sujo(['mapas', 'equipe', 'vila', 'santuario', 'bolsa']); hud(); LV.salvarLogo(); });
    LV.on('compra', () => { sujo(['vila', 'equipe', 'domador']); ui.npcAtualizar(); LV.salvarLogo(); });
    LV.on('equipe', () => sujo(['equipe']));
    LV.on('novoAtaque', (d) => { ui.toast(LV.nomePet(d.pet) + LV.t(' aprendeu ') + LV.ATQ[d.id].nome + (d.equipado ? LV.t(' (já equipado)') : LV.t('. Equipe na aba Equipe.')), 'bom'); sujo(['equipe']); });
    LV.on('equipamento', () => { sujo(['domador', 'vila']); ui.npcAtualizar(); });
    LV.on('tutorial', (tu) => ui.tutorial(tu));
    LV.on('atributo', () => sujo(['domador']));
    LV.on('mapa', (i) => { document.documentElement.style.setProperty('--acc', LV.MAPS[i].pal.acento); sujo(['mapas', 'vila']); ui.tituloMapa(i); fecharNpc(); hud(); });
    LV.on('lugar', (id) => { document.documentElement.style.setProperty('--acc', game.W.def.pal.acento); sujo(['mapas', 'vila']); ui.tituloLugar(id); fecharNpc(); hud(); });
    LV.on('npc', (id) => ui.abrirNpc(id));
    LV.on('mapas', () => sujo(['mapas']));
    LV.on('opcoes', () => sujo(['bolsa']));
    LV.on('admin', () => { sujo(['equipe', 'domador', 'vila', 'mapas', 'bolsa']); LV.salvarLogo(); });
    LV.on('offlineSimulado', (r) => ui.modalOffline(r));
    LV.on('meta', () => { sujo(['santuario', 'equipe', 'domador', 'bolsa']); ui.npcAtualizar(); LV.salvarLogo(); });
    LV.on('renascer', (d) => {
      ui.diario(false);
      ui.sel = null; ui.confirmar = null;
      ['equipe', 'domador', 'vila', 'mapas', 'santuario', 'bolsa'].forEach((a) => ui.sujas.add(a));
      document.documentElement.style.setProperty('--acc', LV.MAPS[0].pal.acento);
      ui.render(); hud();
      LV.salvar(true);
      ui.escolhaInicial(true);
      ui.toast('+' + fmt(d.ganho) + LV.t(' Ecos. Uma nova descida começa.'), 'bom');
    });

    setInterval(hud, 150);
    setInterval(atualizar, 400);
  };

  /* abre/fecha o diário em gaveta; só tem efeito visual no celular deitado */
  ui.gavetaAtiva = () => LV.movel && window.innerWidth > window.innerHeight;
  ui.diario = function (abrir) {
    const raiz = document.documentElement;
    const on = abrir == null ? !raiz.classList.contains('diario') : !!abrir;
    if (on === raiz.classList.contains('diario')) return;
    raiz.classList.toggle('diario', on);
    if (on) { ui.render(); atualizar(); }
    som('clique');
  };

  ui.escolherModo = function (m) {
    if (!game.modoPets(m)) return;
    som('clique');
    ui.toast(LV.t('Centelhas no modo ') + LV.MODOS[m].nome + ': ' + LV.MODOS[m].desc.toLowerCase() + '.', '', true);
    hud(); LV.salvarLogo();
  };

  ui.sujas = new Set();
  function sujo(abas) { abas.forEach((a) => ui.sujas.add(a)); if (abas.includes(ui.aba)) ui.renderSuave(); }
  ui.renderSuave = function () {
    clearTimeout(ui._rt);
    ui._rt = setTimeout(() => {
      const ativo = document.activeElement;
      if (ativo && el.pane.contains(ativo) && /INPUT|TEXTAREA|SELECT/.test(ativo.tagName)) return;
      if (ui._press) { ui.renderSuave(); return; }
      ui.render();
    }, 120);
  };
  document.addEventListener('pointerdown', () => { ui._press = true; });
  document.addEventListener('pointerup', () => { setTimeout(() => { ui._press = false; }, 0); });

  ui.abrir = function (aba) {
    if (!ABAS.some((x) => x[0] === aba)) aba = 'equipe';
    ui.aba = aba; ui.confirmar = null;
    if (aba === 'domador') ui.domSub = null;      // ao abrir a aba, todos os submenus começam fechados
    el.tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.aba === aba)));
    ui.render();
    el.pane.scrollTop = 0;
    try { localStorage.setItem('lumevale.aba', aba); } catch (e) { /* sem armazenamento */ }
  };

  ui.render = function () {
    if (!S()) return;
    ui.sujas.delete(ui.aba);
    const keep = el.pane.scrollTop;
    const valorCmd = $('#cin') ? $('#cin').value : '';
    const valorJson = $('#savejson') ? $('#savejson').value : null;
    const f = { equipe: abaEquipe, domador: abaDomador, mapas: abaMapas, santuario: abaSantuario, bolsa: abaBolsa, ajuda: abaAjuda, console: abaConsole }[ui.aba];
    el.pane.innerHTML = f();
    el.pane.scrollTop = keep;
    if (ui.aba === 'console') {
      $('#cin').value = valorCmd;
      if (valorJson != null) $('#savejson').value = valorJson;
      const lg = $('#clog'); lg.scrollTop = lg.scrollHeight;
    }
    atualizar();
  };

  /* =================== ARRASTAR PETS (coleção ↔ campo) ===================
     Mouse: segura e arrasta. Toque: segura ~0,3 s parado e arrasta (rolar a lista continua funcionando). */
  function iniciarArrasto() {
    let cand = null, arr = null, alvoAtual = null, ultimo = null, raf = 0, tAnt = 0;
    /* arrastando perto da borda de cima/baixo do Diário, a lista rola sozinha (ex.: da coleção até o time em campo) */
    const ZONA = 72, VEL_MAX = 900;
    const rolar = (agora) => {
      raf = 0;
      if (!arr || !ultimo) return;
      const dt = Math.min(0.05, tAnt ? (agora - tAnt) / 1000 : 0.016);
      tAnt = agora;
      const r = el.pane.getBoundingClientRect(), y = ultimo.y;
      let v = 0;
      if (y < r.top + ZONA) v = -Math.min(1, (r.top + ZONA - y) / ZONA);
      else if (y > r.bottom - ZONA) v = Math.min(1, (y - (r.bottom - ZONA)) / ZONA);
      const sobe = el.pane.scrollTop > 0, desce = el.pane.scrollTop + el.pane.clientHeight < el.pane.scrollHeight - 1;
      el.pane.classList.toggle('pode-cima', sobe);
      el.pane.classList.toggle('pode-baixo', desce);
      el.pane.classList.toggle('rola-cima', v < 0 && sobe);
      el.pane.classList.toggle('rola-baixo', v > 0 && desce);
      if (v) {
        const antes = el.pane.scrollTop;
        el.pane.scrollTop += v * Math.max(0.35, Math.abs(v)) * VEL_MAX * dt;
        if (el.pane.scrollTop !== antes) mover(ultimo.x, ultimo.y);   // o que está sob o dedo mudou
      }
      raf = requestAnimationFrame(rolar);
    };
    const limpar = () => {
      if (cand && cand.timer) clearTimeout(cand.timer);
      if (raf) cancelAnimationFrame(raf);
      raf = 0; tAnt = 0; ultimo = null;
      el.pane.classList.remove('rola-cima', 'rola-baixo', 'pode-cima', 'pode-baixo');
      cand = null;
      if (arr) { arr.fant.remove(); arr.orig.classList.remove('origem'); el.pane.classList.remove('arrastando'); }
      if (alvoAtual) alvoAtual.classList.remove('alvo-drop');
      arr = null; alvoAtual = null;
    };
    const comecar = (x, y) => {
      if (!cand) return;
      const pet = S().pets.find((p) => p.uid === cand.uid);
      if (!pet) { limpar(); return; }
      const fant = document.createElement('div');
      fant.className = 'arrasto-fantasma';
      fant.innerHTML = '<img src="' + art.retrato(pet.sp, pet.est, 96) + '" alt="">';
      document.body.appendChild(fant);
      cand.el.classList.add('origem');
      el.pane.classList.add('arrastando');
      arr = { uid: cand.uid, fant, orig: cand.el, ativo: S().ativos.includes(cand.uid) };
      if (cand.timer) clearTimeout(cand.timer);
      cand = null;
      if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) { /* sem vibração */ }
      mover(x, y);
      raf = requestAnimationFrame(rolar);
    };
    const mover = (x, y) => {
      ultimo = { x, y };
      arr.fant.style.left = x + 'px'; arr.fant.style.top = y + 'px';
      const sob = document.elementFromPoint(x, y);
      let alvo = sob && sob.closest && sob.closest('#pane [data-slot], #pane [data-drop="colecao"]');
      if (alvo && alvo.dataset.drop === 'colecao' && !arr.ativo) alvo = null;
      if (alvo !== alvoAtual) { if (alvoAtual) alvoAtual.classList.remove('alvo-drop'); alvoAtual = alvo; if (alvo) alvo.classList.add('alvo-drop'); }
    };
    el.pane.addEventListener('pointerdown', (e) => {
      if (ui.aba !== 'equipe' || (e.button !== 0 && e.pointerType === 'mouse')) return;
      const fonte = e.target.closest('[data-arrasta]');
      if (!fonte) return;
      limpar();
      cand = { uid: +fonte.dataset.uid, el: fonte, x: e.clientX, y: e.clientY, pid: e.pointerId, toque: e.pointerType !== 'mouse' };
      if (cand.toque) { const cx = e.clientX, cy = e.clientY; cand.timer = setTimeout(() => comecar(cx, cy), 300); }
    });
    document.addEventListener('pointermove', (e) => {
      if (arr) { mover(e.clientX, e.clientY); return; }
      if (!cand || e.pointerId !== cand.pid) return;
      const d = Math.hypot(e.clientX - cand.x, e.clientY - cand.y);
      if (cand.toque) { if (d > 10) limpar(); return; }   // mexeu antes de segurar: é rolagem
      if (d > 6) comecar(e.clientX, e.clientY);
    });
    document.addEventListener('pointerup', () => {
      if (!arr) { limpar(); return; }
      const uid = arr.uid, alvo = alvoAtual, eraAtivo = arr.ativo;
      limpar();
      ui._semClique = true; setTimeout(() => { ui._semClique = false; }, 60);
      if (!alvo) return;
      const pet = S().pets.find((p) => p.uid === uid), nome = pet ? LV.nomePet(pet) : LV.t('Centelha');
      if (alvo.dataset.drop === 'colecao') {
        const r = game.acao.retirar(uid);
        if (r === 'ultimo') ui.toast(LV.t('Pelo menos uma Centelha precisa ficar em campo'), 'ruim', true);
        else if (r === true) ui.toast(nome + LV.t(' voltou para a coleção'), '', true);
      } else {
        const r = game.acao.posicionar(uid, +alvo.dataset.slot);
        if (r === true) { som('clique'); if (!eraAtivo) ui.toast(nome + LV.t(' entrou em campo'), 'bom', true); }
        else if (r === 'cheio') ui.toast(LV.t('Sem vagas livres'), 'ruim', true);
      }
      ui.sel = uid; ui.render(); hud(); LV.salvarLogo();
    });
    document.addEventListener('pointercancel', limpar);
    // enquanto arrasta com o dedo, a lista não rola
    document.addEventListener('touchmove', (e) => { if (arr) e.preventDefault(); }, { passive: false });
    el.pane.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-arrasta]')) e.preventDefault(); });
  }

  /* =================== ABA: EQUIPE =================== */
  function abaEquipe() {
    const s = S(), vagas = game.slots();
    const ativos = s.ativos.map((u) => s.pets.find((p) => p.uid === u)).filter(Boolean);
    if (ui.sel != null && !s.pets.some((p) => p.uid === ui.sel)) ui.sel = null;
    if (ui.sel == null && ativos[0]) ui.sel = ativos[0].uid;
    let h = LV.t('<section class="sec"><header class="sec-h"><h2>Em campo</h2><span class="muted">') + ativos.length + LV.t(' de ') + vagas + LV.t(' vagas · arraste da coleção</span></header><div class="campo">');
    ativos.forEach((p, i) => {
      const st = game.petStats(p), rt = petRT(p.uid), hpp = rt ? rt.hp / rt.hpMax : 1;
      const sp = LV.SPECIES[p.sp];
      h += '<button class="pcard' + (ui.sel === p.uid ? LV.t(' sel') : '') + '" data-act="sel" data-uid="' + p.uid + '" data-slot="' + i + '" data-arrasta="1">' +
        '<img src="' + art.retrato(p.sp, p.est, 64) + '" alt="" width="56" height="56">' +
        '<span class="pinfo"><span class="pnome">' + esc(LV.nomePet(p)) + ' ' + elChip(sp.el) + '</span>' +
        LV.t('<span class="pmeta">Nv <b data-pet-lv="') + p.uid + '">' + p.nivel + '</b> · ' + LV.ESTILOS[st.estilo] + ' · <span data-pet-st="' + p.uid + '"></span></span>' +
        barra('hp', hpp, 'data-pet-hp="' + p.uid + '"') + barra(LV.t('xp thin'), p.xp / LV.F.xpPet(p.nivel), 'data-pet-xp="' + p.uid + '"') + '</span>' +
        (game.podeEvoluir(p).ok ? '<span class="pc-evo" data-act="irEvo" data-uid="' + p.uid + '" title="' + LV.t('Pode evoluir: ver requisitos') + '" aria-label="' + LV.t('Pode evoluir: ver requisitos') + '"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 10.5 7H7.6v3.5H4.4V7H1.5Z" fill="currentColor"/></svg></span>' : '') + '</button>';
    });
    for (let i = ativos.length; i < vagas; i++) h += '<div class="pcard vazio" data-slot="' + i + LV.t('"><span>Vaga livre</span><small>') + (LV.movel ? LV.t('Segure uma Centelha da coleção e arraste até aqui') : LV.t('Arraste uma Centelha da coleção até aqui')) + '</small></div>';
    h += '</div></section>';
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Coleção</h2><span class="muted">') + s.pets.length + LV.t(' criaturas</span></header><div class="grade" data-drop="colecao">');
    s.pets.forEach((p) => {
      const ev = game.podeEvoluir(p).ok;
      h += '<button class="tile' + (ui.sel === p.uid ? LV.t(' sel') : '') + (s.ativos.includes(p.uid) ? LV.t(' ativo') : '') + (p.especial ? LV.t(' especial') : '') + '" data-act="sel" data-uid="' + p.uid + '" data-arrasta="1" title="' + esc(LV.nomePet(p)) + '">' +
        '<img src="' + art.retrato(p.sp, p.est, 64) + '" alt="" width="52" height="52"><span class="tn">' + esc(LV.nomePet(p)) + LV.t('</span><span class="tl">Nv ') + p.nivel + '</span>' +
        (ev ? LV.t('<span class="tag-evo" title="Pode evoluir">▲</span>') : '') +
        (p.bonus ? LV.t('<span class="tag-tal" title="Talento ') + LV.TALENTOS[p.bonus.t].nome + '">★</span>' : '') + '</button>';
    });
    h += '</div>';
    const sel = s.pets.find((p) => p.uid === ui.sel);
    if (sel) h += detalhePet(sel);
    h += '</section>';
    return h;
  }

  function detalhePet(p) {
    const s = S(), sp = LV.SPECIES[p.sp], st = game.petStats(p), cap = LV.F.capPet(s.dom.nivel);
    const ativo = s.ativos.includes(p.uid);
    let h = '<article class="detalhe">';
    h += '<div class="dhead"><img src="' + art.retrato(p.sp, p.est, 96) + '" alt="" width="96" height="96"><div class="dtxt">' +
      '<h3>' + esc(LV.nomePet(p)) + '</h3><div class="dsub">' + elChip(sp.el) + espChip(p.sp) + LV.t(' <span class="muted">Forma ') + (p.est + 1) + LV.t(' de 3 · ') + LV.ESTILOS[st.estilo] + '</span></div>' +
      (LV.especDe(p.sp) ? '<p class="nota esp-nota">' + LV.especDe(p.sp).nome + ': ' + LV.especDe(p.sp).desc + '</p>' : '') +
      '<p class="desc">' + esc(sp.desc) + '</p>' +
      (p.especial ? '<p class="nota rad-nota">★ ' + LV.t('Radiante: +30% de vida e ataque e +10% de velocidade.') + ' ' + (p.radCapt ? LV.t('Encontrada numa captura: a Zeladora Íris não traz de volta se você a perder.') : LV.t('Veio de uma conquista: a Zeladora Íris traz de volta se você a perder.')) + '</p>' : '') +
      (p.bonus ? LV.t('<p class="talento-l">★ Talento <b>') + LV.TALENTOS[p.bonus.t].nome + '</b>: ' + LV.TALENTOS[p.bonus.t].desc(p.bonus.v) + '</p>' : '') + '</div></div>';
    h += '<div class="cadeia">';
    for (let i = 0; i < 3; i++) {
      h += '<figure class="' + (i === p.est ? 'atual' : i < p.est ? 'passada' : 'futura') + '"><img src="' + art.retrato(p.sp, i, 64) + '" alt="" width="44" height="44"><figcaption>' + sp.nome[i] + '</figcaption></figure>';
      if (i < 2) h += '<span class="seta">' + (i < 2 ? LV.t('Nv ') + LV.F.evoNivel[i] : '') + '</span>';
    }
    h += '</div>';
    h += '<dl class="stats">' +
      LV.t('<div><dt>Nível</dt><dd><span data-pet-lv="') + p.uid + '">' + p.nivel + '</span> <small class="muted">/ ' + cap + '</small></dd></div>' +
      LV.t('<div><dt>Vida</dt><dd>') + fmt(st.hp) + '</dd></div>' +
      LV.t('<div><dt>Ataque</dt><dd>') + fmt(st.atk) + '</dd></div>' +
      LV.t('<div><dt>Ataques/s</dt><dd>') + st.spd.toLocaleString(LV.locale) + '</dd></div>' +
      LV.t('<div><dt>Alcance</dt><dd>') + st.alc + '</dd></div>' +
      '<div><dt>XP</dt><dd><span data-pet-xptxt="' + p.uid + '">' + fmt(p.xp) + '</span> <small class="muted">/ ' + fmt(LV.F.xpPet(p.nivel)) + '</small></dd></div>' +
      '</dl>';
    if (p.nivel >= cap) h += LV.t('<p class="nota">As Centelhas só passam ') + LV.F.capPet(0) + LV.t(' níveis acima do domador. Suba o nível do domador para continuar.</p>');
    // ataques especiais: 5 por espécie, até 2 equipados; o nível vale para todos
    const hn = p.hab || 1, lista = LV.ATQ_SP[p.sp] || [], eqs = LV.atqsEquipados(p);
    if (lista.length) {
      const s1 = (v) => (Math.round(v * 10) / 10).toLocaleString(LV.locale);
      h += LV.t('<div class="hab"><div class="hab-t"><span class="eyebrow">Ataques especiais</span>') +
        LV.t('<span class="muted small">Nv ') + hn + '/' + LV.HAB_MAX + LV.t(' · equipados ') + eqs.length + '/2</span></div>' +
        LV.t('<p class="nota">Até 2 ficam equipados. Os outros se liberam com o nível e as evoluções da Centelha.</p><div class="atqs">');
      lista.forEach((id, i) => {
        const at = LV.ATQ[id], lib = LV.atqLiberado(p, i), eq = eqs.includes(id);
        h += '<div class="atq' + (eq ? ' eq' : '') + (lib ? '' : ' trav') + '"><div class="atq-t"><b style="color:' + (lib ? LV.EL[sp.el].cor : 'inherit') + '">' + at.nome + '</b>' +
          (lib ? (eq ? '<button class="btn mini sel" data-act="atq" data-uid="' + p.uid + '" data-id="' + id + LV.t('" title="Tirar">Equipado</button>') : '<button class="btn mini" data-act="atq" data-uid="' + p.uid + '" data-id="' + id + LV.t('">Equipar</button>'))
            : '<span class="muted small">' + ICON.cadeado + LV.t(' Libera ') + LV.textoLibera(i) + '</span>') + '</div>' +
          '<p class="small">' + LV.descAtq(at, hn, sp.el) + (lib ? LV.t(' Recarga ') + s1(LV.recargaAtq(at, hn)) + ' s.' : '') + '</p></div>';
      });
      h += '</div>';
      if (hn < LV.HAB_MAX) {
        const c = LV.custoHab(p.sp, hn);
        h += LV.t('<p class="small acc">Melhorar deixa todos os ataques mais fortes e com recarga menor (nível ') + (hn + 1) + ').</p>' +
          '<div class="row"><button class="btn" data-act="hab" data-uid="' + p.uid + '" data-custo="' + c.lumes + '" data-mat="' + c.mat + ':' + c.q + LV.t('">Melhorar · ') + ICON.lumes + ' ' + fmt(c.lumes) +
          ' + <i class="dot" style="--c:' + LV.MAT[c.mat].cor + '"></i>' + c.q + '</button><span class="muted small">' + LV.MAT[c.mat].nome + ': ' + fmt(s.mats[c.mat] || 0) + '</span></div>';
      } else h += LV.t('<p class="small maxed">Ataques no nível máximo</p>');
      h += '</div>';
    }
    const forte = LV.EL[sp.el].forte.map((x) => LV.EL[x].nome).join(', ') || '—';
    const vuln = LV.vulneravel(sp.el).map((x) => LV.EL[x].nome).join(', ') || '—';
    h += LV.t('<p class="tipos"><span>Forte contra <b>') + forte + LV.t('</b></span><span>Vulnerável a <b>') + vuln + '</b></span></p>';
    const r = game.podeEvoluir(p);
    if (!r.max) {
      const q = r.req;
      h += LV.t('<div class="evo"><div class="evo-t">Evoluir para <b>') + q.para + '</b></div><ul class="reqs">';
      h += '<li class="' + (p.nivel >= q.nivel ? 'ok' : '') + LV.t('">Nível ') + q.nivel + '</li>';
      for (const k in q.mats) h += '<li class="' + ((s.mats[k] || 0) >= q.mats[k] ? 'ok' : '') + '"><i class="dot" style="--c:' + LV.MAT[k].cor + '"></i>' + LV.MAT[k].nome + ' ' + fmt(s.mats[k] || 0) + '/' + q.mats[k] + '</li>';
      h += '<li class="' + (s.lumes >= q.lumes ? 'ok' : '') + '">' + ICON.lumes + ' ' + fmt(q.lumes) + '</li></ul>';
      h += '<button class="btn pri" data-act="evoluir" data-uid="' + p.uid + '" data-evo="' + p.uid + '"' + (r.ok ? '' : LV.t(' disabled')) + LV.t('>Evoluir</button></div>');
    } else h += LV.t('<p class="nota">Forma final alcançada.</p>');
    h += '<div class="dacoes">';
    if (ativo) h += '<button class="btn" data-act="retirar" data-uid="' + p.uid + '"' + (s.ativos.length <= 1 ? LV.t(' disabled') : '') + LV.t('>Tirar de campo</button>');
    else h += '<button class="btn pri" data-act="ativar" data-uid="' + p.uid + '"' + (s.ativos.length >= game.slots() ? LV.t(' disabled title="Sem vagas livres"') : '') + LV.t('>Colocar em campo</button>');
    const valor = Math.round(10 * p.nivel * (1 + p.est));
    if (ui.confirmar === 'lib' + p.uid) h += '<button class="btn perigo" data-act="libertar" data-uid="' + p.uid + LV.t('">Confirmar: libertar por ') + fmt(valor) + LV.t(' Lumes</button>');
    else h += '<button class="btn fantasma" data-act="pedirLib" data-uid="' + p.uid + '"' + (s.pets.length <= 1 ? LV.t(' disabled') : '') + LV.t('>Libertar</button>');
    h += '</div></article>';
    return h;
  }

  /* =================== ABA: DOMADOR (v1.17: dados do domador + submenus Status, Skills, Capas e Lanternas) =================== */
  const QTD_PONTOS = [1, 5, 10, 100];
  ui.qtdPontos = 1;
  try { const q = +localStorage.getItem('lumevale.qtdPontos'); if (QTD_PONTOS.includes(q)) ui.qtdPontos = q; } catch (e) { /* sem armazenamento */ }
  ui.domSub = null;                         // submenu aberto (só um por vez); fecha todos ao abrir a aba
  /* título equipado (ou null) e o texto que aparece embaixo do nome: o título ou, sem ele, a patente do nível */
  function tituloEq() { const id = S() && S().meta.titulo; return id && game.temTitulo(id) ? LV.titulo(id) : null; }
  function nomeSobNome() { const T = tituloEq(); return T ? T.nome : LV.RANKS[LV.rankIdx(S().dom.nivel)].nome; }
  ui.nomeSobNome = nomeSobNome;
  const SETA = '<svg class="sub-seta" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  /* ícones das skills (traço em currentColor) */
  const ICON_SK = {
    brado: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l6 4V6L7 10Z" fill="currentColor"/><path d="M16 9.5c1 .7 1.6 1.6 1.6 2.5s-.6 1.8-1.6 2.5M18.4 7c1.8 1.3 2.8 3 2.8 5s-1 3.7-2.8 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    olhar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    ritmo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2Z" fill="currentColor"/></svg>',
    manto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 19.5 5v6c0 4.6-3.1 8.4-7.5 10.5C7.6 19.4 4.5 15.6 4.5 11V5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 8v7M8.5 11.5h7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    colheita: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 18 11 12 21 6 11Z" fill="currentColor"/><path d="M3.5 7.5 5 9M20.5 7.5 19 9M12 1v0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  };
  ui.ICON_SK = ICON_SK;
  function abaDomador() {
    const s = S(), d = s.dom, ds = game.domStats(), ri = LV.rankIdx(d.nivel), R = LV.RANKS[ri], prox = LV.RANKS[ri + 1], T = tituloEq();
    let h = '<section class="sec"><div class="dom-top"><button class="dom-ret" data-act="perfil" title="' + LV.t('Abrir o perfil') + '" aria-label="' + LV.t('Abrir o perfil do domador') + '">' +
      '<img src="' + art.retratoDomador(ri, 120) + '" alt="" width="120" height="120"><span class="dom-ret-l">' + LV.t('Perfil') + '</span></button><div>' +
      '<div class="eyebrow">' + (T ? LV.t('Título') : LV.t('Patente')) + '</div><div class="dom-tit">' + (T ? T.nome : R.nome) + '</div>' +
      '<h2 class="dnome">' + esc(d.nome) + '</h2>' +
      LV.t('<div class="dom-lv">Nível <b data-k="nivel">') + d.nivel + '</b></div>' +
      barra('xp', d.xp / LV.F.xpDom(d.nivel), 'data-k="xpbar"') +
      '<div class="muted small"><span data-k="xptxt">' + fmt(d.xp) + '</span> / ' + fmt(LV.F.xpDom(d.nivel)) + ' XP</div>' +
      (T ? '<div class="small tit-b">' + LV.textoTitulo(T.b) + '</div>' : '') +
      (prox ? '<div class="muted small">' + LV.t('Próxima patente: ') + prox.nome + LV.t(' no nível ') + prox.nv + '</div>' : '<div class="muted small">' + LV.t('Patente máxima alcançada') + '</div>') +
      '</div></div></section>';
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Bônus atuais</h2></header><dl class="stats">') +
      LV.t('<div><dt>Vida do domador</dt><dd>') + fmt(ds.hp) + '</dd></div>' +
      LV.t('<div><dt>Golpe da lanterna</dt><dd>') + fmt(ds.atk) + '</dd></div>' +
      LV.t('<div><dt>Crítico</dt><dd>') + (ds.crit * 100).toFixed(1).replace('.', LV.decSep) + '%</dd></div>' +
      LV.t('<div><dt>Coleta</dt><dd>×') + ds.coleta.toFixed(2).replace('.', LV.decSep) + '</dd></div>' +
      LV.t('<div><dt>XP do domador</dt><dd>×') + ds.xp.toFixed(2).replace('.', LV.decSep) + '</dd></div>' +
      LV.t('<div><dt>XP das Centelhas</dt><dd>×') + ds.xpPet.toFixed(2).replace('.', LV.decSep) + '</dd></div>' +
      LV.t('<div><dt>Nível máximo das Centelhas</dt><dd>') + LV.F.capPet(d.nivel) + '</dd></div>' +
      LV.t('<div><dt>Ganho offline</dt><dd>até ') + ds.offlineH + 'h</dd></div>' +
      LV.t('</dl><p class="nota">Cada nível do domador também dá +1% de dano e vida a todas as Centelhas.</p></section>');
    const nCapas = LV.CAPAS.filter((k) => game.temCapa(k.id)).length, nLant = LV.LANTERNAS.filter((k) => game.temLanterna(k.id)).length;
    h += '<div class="subs">' +
      sub('status', LV.t('Status'), d.pontos ? '<span class="sub-n">' + d.pontos + LV.t(' livres') + '</span>' : '', subStatus) +
      sub('skills', LV.t('Skills'), d.skillPts ? '<span class="sub-n">' + d.skillPts + (d.skillPts === 1 ? LV.t(' ponto') : LV.t(' pontos')) + '</span>' : '', subSkills) +
      sub('capas', LV.t('Capas'), '<span class="muted small">' + nCapas + ' / ' + LV.CAPAS.length + '</span>', subCapas) +
      sub('lanternas', LV.t('Lanternas'), '<span class="muted small">' + nLant + ' / ' + LV.LANTERNAS.length + '</span>', subLanternas) + '</div>';
    return h;
  }
  /* um submenu em sanfona: só o aberto monta o conteúdo */
  function sub(id, nome, info, corpo) {
    const ab = ui.domSub === id;
    return '<section class="sub' + (ab ? ' aberta' : '') + '" data-sub="' + id + '"><button class="sub-h" data-act="sub" data-sub="' + id + '" aria-expanded="' + ab + '">' +
      '<span class="sub-nome">' + nome + '</span><span class="sub-info">' + info + '</span>' + SETA + '</button>' +
      (ab ? '<div class="sub-corpo">' + corpo() + '</div>' : '') + '</section>';
  }
  function subStatus() {
    const s = S(), d = s.dom, q = ui.qtdPontos;
    const autos = s.meta.autoAttr.map((a) => LV.ATTR.find((x) => x.id === a).nome);
    let h = '<div class="qtd-row"><span class="pts">' + LV.t('Pontos livres: ') + '<b data-k="pontos">' + d.pontos + '</b></span>' +
      '<button class="btn qtd" data-act="qtd" title="' + LV.t('Quantos pontos cada + adiciona (1, 5, 10 ou 100)') + '">' + LV.t('Adicionar ') + '<b>' + q + '</b>' + LV.t(' por clique') + '</button></div>' +
      (autos.length ? LV.t('<p class="nota">Automático (Santuário): ') + autos.join(', ') + LV.t('. Os pontos de cada novo nível vão sozinhos para eles.</p>') : '') + '<div class="attrs">';
    LV.ATTR.forEach((a) => {
      h += '<div class="attr"><div><b>' + a.nome + '</b> <span class="aval">' + d.attr[a.id] + '</span><div class="muted small">' + a.desc + '</div></div>' +
        '<button class="btn sq mais" data-act="ponto" data-attr="' + a.id + '" data-pts="1" aria-label="' + LV.t('Adicionar pontos em ') + a.nome + '">+</button></div>';
    });
    return h + '</div>';
  }
  function subSkills() {
    const d = S().dom;
    let h = '<div class="qtd-row"><span class="pts">' + LV.t('Pontos de skill: ') + '<b data-k="skpts">' + (d.skillPts || 0) + '</b></span><span class="muted small">' + LV.t('1 por nível do domador') + '</span></div>' +
      '<p class="nota">' + (LV.movel ? LV.t('Use as skills liberadas pelos botões redondos acima dos controles.') : LV.t('Use as skills liberadas pelos botões no canto de baixo da tela ou pelas teclas 4 a 8.')) +
      LV.t(' Liberar custa 1 ponto; os níveis seguintes custam 1 (até o 4), 2 (até o 7) e 3 (até o 10). Ao renascer, as skills voltam a zero.') + '</p><div class="skls">';
    LV.SKILLS.forEach((k) => {
      const n = (d.skills || {})[k.id] || 0, trav = d.nivel < k.nv, c = LV.custoSkill(n);
      let btn;
      if (n >= LV.SKILL_MAX) btn = '<span class="maxed">' + LV.t('Máximo') + '</span>';
      else if (trav) btn = '<span class="muted small">' + ICON.cadeado + LV.t(' Nível ') + k.nv + '</span>';
      else btn = '<button class="btn" data-act="skill" data-id="' + k.id + '" data-skpts="' + c + '">' + (n ? LV.t('Melhorar') : LV.t('Liberar')) + ' · ' + c + ' pt</button>';
      h += '<div class="skl sk-' + k.id + (n ? '' : ' nova') + (trav ? ' trav' : '') + '"><span class="sk-ic">' + ICON_SK[k.id] + '</span><div class="skl-txt">' +
        '<div class="skl-t"><b>' + k.nome + '</b><span class="muted small">' + (n ? LV.t('Nv ') + n + '/' + LV.SKILL_MAX : LV.t('Não liberada')) + (LV.movel ? '' : LV.t(' · tecla ') + k.tecla) + '</span></div>' +
        '<p class="small">' + LV.descSkill(k, n || 1) + '</p>' +
        (n && n < LV.SKILL_MAX ? '<p class="small acc">' + LV.t('No nível ') + (n + 1) + ': ' + k.desc(n + 1, k) + '</p>' : '') + '</div>' + btn + '</div>';
    });
    return h + '</div>';
  }
  /* equipamento: capas e lanternas — o que você tem, o que está usando e como liberar o resto */
  function comoLiberar(k) {
    if (k.conq) { const c = LV.conquista(k.conq); return c ? LV.t('Conquista “') + c.nome + '”: ' + c.desc : ''; }
    if (k.loja) return k.loja.moeda ? LV.t('À venda na Vila (vale até renascer)') : LV.t('À venda na Vila');
    if (k.chefe != null) return LV.t('Derrote ') + LV.MAPS[k.chefe].chefe.nome + LV.t(' nesta jornada');
    return '';
  }
  function cartaoEquip(tipo, k, tem, usando, img) {
    return '<div class="eq' + (usando ? ' usando' : '') + (tem ? '' : ' travado') + '"><img src="' + img + '" alt="" loading="lazy">' +
      '<b>' + k.nome + '</b>' + (k.efeito ? '<small class="ef">' + k.efeito + '</small>' : '') +
      '<small>' + (tem ? k.desc : ICON.cadeado + ' ' + comoLiberar(k)) + '</small>' +
      (usando ? LV.t('<span class="uso">Em uso</span>') : tem ? '<button class="btn" data-act="equipar" data-tipo="' + tipo + '" data-id="' + k.id + LV.t('">Equipar</button>') : '') + '</div>';
  }
  function subCapas() {
    const atual = game.capaAtual();
    let h = LV.t('<p class="nota">As capas comuns são só visuais e ficam para sempre: saem das conquistas ou da costureira da Vila. As dos Guardiões caem na primeira vitória de cada jornada, mudam os status e somem ao renascer.</p><div class="equips">');
    LV.CAPAS.forEach((k) => { h += cartaoEquip('capa', k, game.temCapa(k.id), atual === k.id, 'img/' + LV.imgCapa(k.id) + '.webp'); });
    return h + '</div>';
  }
  function subLanternas() {
    const lat = game.lanternaAtual();
    let h = LV.t('<p class="nota">Cada lanterna muda o golpe do domador. As das conquistas ficam para sempre; as da Vila e dos Guardiões valem até renascer.</p><div class="equips">');
    LV.LANTERNAS.forEach((k) => { h += cartaoEquip('lanterna', k, game.temLanterna(k.id), lat === k.id, 'img/' + LV.imgLanterna(k.id) + '.webp'); });
    return h + '</div>';
  }

  /* =================== PERFIL DO DOMADOR (v1.17): resumo e títulos =================== */
  function htmlPerfil() {
    const s = S(), d = s.dom, m = s.meta, T = tituloEq(), R = LV.RANKS[LV.rankIdx(d.nivel)];
    const chefes = LV.MAPS.reduce((a, x, i) => a + (((m.best['chefe' + i] || {}).k) || 0), 0);
    const conqFeitas = LV.CONQUISTAS.filter((c) => m.conq[c.id] === 2).length;
    const item = (rot, v, sub) => '<div><dt>' + rot + '</dt><dd>' + v + (sub ? ' <small class="muted">' + sub + '</small>' : '') + '</dd></div>';
    let h = '<div class="pf-cab"><img class="pf-heroi" src="img/' + LV.imgCapa(game.capaAtual()) + '.webp" alt=""><div>' +
      '<div class="eyebrow">' + LV.t('Perfil do domador') + '</div><h2>' + esc(d.nome) + '</h2>' +
      '<div class="pf-tit">' + (T ? T.nome : R.nome) + '</div>' +
      '<div class="muted small">' + LV.t('Nível ') + d.nivel + ' · ' + LV.t('Patente: ') + R.nome + ' · ' + LV.capa(game.capaAtual()).nome + '</div>' +
      (T ? '<div class="small tit-b">' + LV.textoTitulo(T.b) + '</div>' : '') + '</div></div>';
    h += '<dl class="stats pf-st">' +
      item(LV.t('Inimigos abatidos'), fmt(Math.max(m.tot.kills, s.st.kills)), s.st.kills < m.tot.kills ? LV.t('nesta jornada: ') + fmt(s.st.kills) : '') +
      item(LV.t('Centelhas capturadas'), fmt(m.tot.capt)) +
      item(LV.t('Renascimentos'), fmt(m.renasc)) +
      item(LV.t('Evoluções'), fmt(m.tot.evo)) +
      item(LV.t('Breus apagados'), fmt(m.tot.breus || 0)) +
      item(LV.t('Guardiões vencidos'), fmt(chefes)) +
      item(LV.t('Radiantes na coleção'), fmt(s.pets.filter((p) => p.especial).length)) +
      item(LV.t('Conquistas'), conqFeitas + ' / ' + LV.CONQUISTAS.length) +
      item(LV.t('Maior nível'), Math.max(m.recorde, d.nivel)) +
      item(LV.t('Tempo nesta jornada'), LV.fmtTempo(s.st.tempo)) + '</dl>';
    const tem = LV.TITULOS.filter((t) => game.temTitulo(t.id)).length;
    h += '<section class="pf-tits"><header class="sec-h"><h2>' + LV.t('Títulos') + '</h2><span class="muted small">' + tem + ' / ' + LV.TITULOS.length + '</span></header>' +
      '<p class="nota">' + LV.t('Cada título sai de uma conquista (ao resgatar a recompensa) e dá um bônus. Só um fica equipado; quanto mais difícil a conquista, maior o bônus.') + '</p><div class="tits">';
    const linha = (id, nome, ef, eq, ok, trava) => '<div class="tit' + (eq ? ' usando' : '') + (ok ? '' : ' trav') + '"><div><b>' + nome + '</b>' + (ef ? '<small class="ef">' + ef + '</small>' : '') + (trava ? '<small>' + ICON.cadeado + ' ' + trava + '</small>' : '') + '</div>' +
      (eq ? '<span class="uso">' + LV.t('Em uso') + '</span>' : ok ? '<button class="btn mini" data-act="titulo" data-id="' + id + '">' + LV.t('Equipar') + '</button>' : '') + '</div>';
    h += linha('', LV.t('Sem título'), LV.t('Mostra a patente do nível (') + R.nome + ')', !T, true, '');
    LV.TITULOS.forEach((t) => {
      const ok = game.temTitulo(t.id), c = LV.conquista(t.conq);
      const pronta = c && m.conq[c.id] === 1;
      h += linha(t.id, t.nome, LV.textoTitulo(t.b), T && T.id === t.id, ok, ok ? '' : (c ? LV.t('Conquista “') + c.nome + '”: ' + c.desc + (pronta ? LV.t(' (pronta: resgate em Conquistas)') : '') : ''));
    });
    return h + '</div></section><div class="row end"><button class="btn" data-m="fechar">' + LV.t('Fechar') + '</button></div>';
  }
  ui.abrirPerfil = function () {
    if (!S()) return;
    if (ui.modalAberto) { if (ui.modalAberto.tipo === 'perfil') return; ui.fecharModal(); }
    ui.modal(htmlPerfil(), { cls: 'perfil-m', tipo: 'perfil' });
  };
  function perfilAtualizar() {
    if (!ui.modalAberto || ui.modalAberto.tipo !== 'perfil') return;
    const sc = el.mbox.scrollTop;
    el.mbox.innerHTML = htmlPerfil();
    el.mbox.scrollTop = sc;
  }

  /* =================== LOJA (v1.16: as seções viraram as conversas com os moradores da vila) =================== */
  let ultimoTitulo = { nome: '', t: 0 };
  function iconeMoeda(md) { return '<i class="moeda" style="--c:' + md.cor + '" aria-hidden="true"></i>'; }
  function carteiraMoedas(s) {
    return '<div class="carteira">' + LV.MOEDAS.map((md, i) => {
      const conhecida = s.mapas[i].chefe || (s.moedas[md.id] || 0) > 0;
      return '<span class="cmoeda' + (conhecida ? '' : LV.t(' oculta')) + '" title="' + esc(conhecida ? md.nome + ': ' + md.desc : LV.t('Moeda do Guardião de ') + LV.MAPS[i].nome) + '">' +
        iconeMoeda(md) + '<b data-moeda="' + md.id + '">' + fmt(s.moedas[md.id] || 0) + '</b><small>' + (conhecida ? md.nome : '???') + '</small></span>';
    }).join('') + '</div>';
  }
  /* capas visuais: compra única, ficam para sempre (mesmo depois de renascer) */
  function secaoCapasLoja(s) {
    let h = LV.t('<section class="sec"><header class="sec-h"><h2>Capas</h2></header><p class="nota">Só mudam a aparência do domador. Compra única: continuam suas depois de renascer.</p><div class="ups">');
    LV.CAPAS.filter((k) => k.loja).forEach((k) => {
      const tem = game.temCapa(k.id);
      h += '<div class="up up-img"><img src="img/' + LV.imgCapa(k.id) + '.webp" alt="" loading="lazy"><div class="up-t"><b>' + k.nome + '</b></div><div class="up-d">' + k.desc + '</div>' +
        (tem ? LV.t('<span class="maxed">Comprada</span>') : '<button class="btn" data-act="comprarCapa" data-id="' + k.id + '" data-custo="' + k.loja.lumes + '">' + ICON.lumes + ' ' + fmt(k.loja.lumes) + '</button>') + '</div>';
    });
    return h + '</div></section>';
  }
  function secaoLanternasLoja(s) {
    let h = LV.t('<section class="sec"><header class="sec-h"><h2>Lanternas especiais</h2></header><p class="nota">Mudam o golpe da lanterna do domador. Valem só nesta jornada: somem ao renascer.</p><div class="ups">');
    LV.LANTERNAS.filter((k) => k.loja).forEach((k) => {
      const tem = game.temLanterna(k.id), md = LV.moeda(k.loja.moeda), mi = LV.MOEDAS.indexOf(md), conhecida = s.mapas[mi].chefe || (s.moedas[md.id] || 0) > 0;
      let btn;
      if (tem) btn = LV.t('<span class="maxed">Comprada</span>');
      else if (!conhecida) btn = LV.t('<span class="trava-up" title="Derrote ') + esc(LV.MAPS[mi].chefe.nome) + LV.t(' para conseguir ') + md.nome + '">' + ICON.cadeado + ' ' + esc(LV.MAPS[mi].chefe.nome) + '</span>';
      else btn = '<button class="btn" data-act="comprarLanterna" data-id="' + k.id + '" data-custo="' + k.loja.lumes + '" data-moeda-q="' + md.id + ':' + k.loja.q + '">' + ICON.lumes + ' ' + fmt(k.loja.lumes) + ' + ' + iconeMoeda(md) + k.loja.q + '</button>';
      h += '<div class="up up-img"><img src="img/' + LV.imgLanterna(k.id) + '.webp" alt="" loading="lazy"><div class="up-t"><b>' + k.nome + '</b></div><div class="up-d">' + k.efeito + '</div>' + btn + '</div>';
    });
    return h + '</div></section>';
  }
  function secaoLanternasCaptura(s) {
    const preco = LV.F.precoLanterna(s.mapas.filter((m) => m.liberado).length);
    return LV.t('<section class="sec"><header class="sec-h"><h2>Lanternas de captura</h2><span class="muted">Você tem <b data-k="lant">') + s.lanternas + '</b></span></header>' +
      LV.t('<p class="nota">A chance de captura é sorteada quando a lanterna atinge a criatura: com a vida cheia ela quase sempre se solta. Enfraqueça antes de lançar. O preço sobe a cada profundeza liberada.</p>') +
      '<div class="row">' +
      '<button class="btn" data-act="lant" data-n="1" data-custo="' + preco + LV.t('">Comprar 1 · ') + ICON.lumes + ' ' + fmt(preco) + '</button>' +
      '<button class="btn" data-act="lant" data-n="10" data-custo="' + preco * 10 + LV.t('">Comprar 10 · ') + ICON.lumes + ' ' + fmt(preco * 10) + '</button></div></section>';
  }
  function secaoMelhorias(s) {
    let h = LV.t('<section class="sec"><header class="sec-h"><h2>Moedas dos Guardiões</h2></header>') + carteiraMoedas(s) +
      LV.t('<p class="nota">Só caem dos Guardiões. As primeiras melhorias pedem Sementes Antigas da Mãe-Raiz; os níveis seguintes pedem as moedas dos Guardiões mais fundos.</p></section>');
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Melhorias</h2></header>') +
      LV.t('<p class="nota aviso-renasc">As melhorias do ferreiro são reiniciadas ao Renascer. As do Santuário (pagas com Ecos) continuam.</p><div class="ups">');
    LV.UPGRADES.forEach((u) => {
      const n = s.up[u.id], c = LV.custoUp(u, n);
      let btn;
      if (!c) btn = LV.t('<span class="maxed">Máximo</span>');
      else {
        const md = LV.MOEDAS[c.tier], conhecida = s.mapas[c.tier].chefe || (s.moedas[md.id] || 0) > 0;
        btn = conhecida
          ? '<button class="btn" data-act="up" data-id="' + u.id + '" data-custo="' + c.lumes + '" data-moeda-q="' + md.id + ':' + c.q + '">' + ICON.lumes + ' ' + fmt(c.lumes) + ' + ' + iconeMoeda(md) + c.q + '</button>'
          : LV.t('<span class="trava-up" title="Derrote ') + esc(LV.MAPS[c.tier].chefe.nome) + LV.t(' para conseguir ') + md.nome + '">' + ICON.cadeado + ' ' + esc(LV.MAPS[c.tier].chefe.nome) + '</span>';
      }
      h += '<div class="up"><div class="up-t"><b>' + u.nome + '</b><span class="muted">' + n + ' / ' + u.max + '</span></div>' +
        '<div class="up-d">' + u.desc + ': ' + u.efeito(n) + (c ? ' <span class="acc">→ ' + u.efeito(n + 1) + '</span>' : '') + '</div>' + btn + '</div>';
    });
    h += '</div></section>';
    return h;
  }

  /* =================== VILA DE ALVORADA (v1.16): aba, moradores e trocas =================== */
  /* Alvorada na aba Mapas (v1.16.1): a vila e o campo de treino, sem inimigos */
  function secaoAlvorada() {
    const s = S(), W = game.W, lugar = W && W.lugar;
    const voltar = '<button class="btn" data-act="sairLugar">' + LV.t('Voltar a ') + esc(LV.MAPS[s.mapa].nome) + '</button>';
    const cartao = (id, nota, txtIr) => {
      const Lg = LV.LUGARES[id], aqui = lugar === id;
      return '<article class="mapa lugar' + (aqui ? ' aqui' : '') + '" style="--ma:' + Lg.pal.acento + '">' +
        '<div class="mthumb" style="background-image:url(img/fundos/' + id + '.webp)"></div><div class="mbody">' +
        '<div class="mtit"><h3>' + Lg.nome + '</h3>' + (aqui ? '<span class="okk small">' + LV.t('você está aqui') + '</span>' : '') + '</div>' +
        '<p class="small muted">' + Lg.sub + '</p><p class="nota">' + nota + '</p>' +
        '<div class="row">' + (aqui ? voltar : '<button class="btn' + (id === 'vila' ? ' pri' : '') + '" data-act="irLugar" data-id="' + id + '"' + (game.tutorial ? ' disabled' : '') + '>' + txtIr + '</button>') + '</div></div></article>';
    };
    return '<section class="sec"><header class="sec-h"><h2>' + LV.t('Alvorada') + '</h2><span class="muted">' + LV.t('Sem inimigos') + '</span></header><div class="mapas">' +
      cartao('vila', LV.t('Lanternas, capas, melhorias, trocas, Radiantes e o Santuário dos Ecos. Clique num morador para falar com ele.'), LV.t('Ir para a Vila')) +
      cartao('treino', LV.t('As Centelhas seguem o modo de comando (no Passivo, não atacam; no Defensor, atacam o boneco que você bater) e o medidor no alto da tela mostra o dano de cada uma.'), LV.t('Ir para o treino')) +
      '</div></section>';
  }
  const OFERTA_NPC = {
    pavio: LV.t('Lanternas de captura e lanternas especiais.'),
    agulha: LV.t('Capas que só mudam a aparência.'),
    bigorna: LV.t('Melhorias pagas com Lumes e moedas dos Guardiões.'),
    escambo: LV.t('Troca materiais entre profundezas vizinhas.'),
    iris: LV.t('Recupera os Radiantes das conquistas.'),
    santuario: LV.t('Melhorias permanentes e renascimento.'),
  };
  function linhaTroca(s, de, para, custo, ganho, lib) {
    const Md = LV.MAT[de], Mp = LV.MAT[para], tem = s.mats[de] || 0;
    const btn = (n, txt) => '<button class="btn mini" data-act="trocar" data-de="' + de + '" data-para="' + para + '" data-n="' + n + '" data-custo="0" data-mat="' + de + ':' + (n === 'max' ? custo : custo * n) + '"' + (lib ? '' : ' disabled') + '>' + txt + '</button>';
    return '<div class="troca' + (lib ? '' : ' bloq') + '"><span class="tr-par"><i class="dot" style="--c:' + Md.cor + '"></i>' + custo + ' ' + LV.nomeQtd(Md, custo) +
      ' <span class="acc">→</span> <i class="dot" style="--c:' + Mp.cor + '"></i>' + ganho + ' ' + LV.nomeQtd(Mp, ganho) + '<small class="muted">' + LV.t(' · você tem ') + fmt(tem) + '</small></span>' +
      '<span class="tr-b">' + btn(1, '×1') + btn(10, '×10') + btn('max', LV.t('Tudo')) + '</span></div>';
  }
  function secaoTrocas(s) {
    const o = LV.TROCA.ordem;
    let h = '<section class="sec"><header class="sec-h"><h2>' + LV.t('Trocas') + '</h2></header><p class="nota">' +
      LV.t('Só entre materiais de profundezas vizinhas. Para o material da profundeza seguinte: ') + LV.TROCA.sobe + LV.t(' por 1. Para o da anterior: 1 por ') + LV.TROCA.desce +
      LV.t('. A troca só abre quando as duas profundezas já foram liberadas.') + '</p><div class="trocas">';
    for (let i = 0; i < o.length - 1; i++) {
      const lib = !!s.mapas[i + 1].liberado;
      h += linhaTroca(s, o[i], o[i + 1], LV.TROCA.sobe, 1, lib) + linhaTroca(s, o[i + 1], o[i], 1, LV.TROCA.desce, lib);
    }
    return h + '</div></section>';
  }
  function secaoRadiantes(s) {
    const lista = game.radiantesPerdidos(), taxa = LV.TAXA_RADIANTE;
    let h = '<section class="sec"><header class="sec-h"><h2>' + LV.t('Radiantes para recuperar') + '</h2></header><p class="nota">' +
      LV.t('Os Radiantes vêm das conquistas de captura (20 da mesma espécie). Se você renasceu ou libertou um deles, a Zeladora traz de volta, no nível que o resgate daria agora. Os Radiantes encontrados por sorte numa captura não voltam. Taxa: ') +
      ICON.lumes + ' ' + fmt(taxa) + LV.t(' Lumes cada.') + '</p>';
    if (!lista.length) return h + '<p class="muted small">' + LV.t('Nenhum Radiante para recuperar agora. Os que você já tem continuam com você.') + '</p></section>';
    h += '<div class="ups">';
    lista.forEach((sp) => {
      const S0 = LV.SPECIES[sp];
      h += '<div class="up up-img"><img src="' + art.retrato(sp, 0, 96) + '" alt="" loading="lazy"><div class="up-t"><b>' + S0.nome[0] + LV.t(' Radiante') + '</b></div><div class="up-d">' + LV.EL[S0.el].nome + '</div>' +
        '<button class="btn" data-act="radiante" data-sp="' + sp + '" data-custo="' + taxa + '">' + ICON.lumes + ' ' + fmt(taxa) + '</button></div>';
    });
    return h + '</div></section>';
  }
  function cabecaNpc(id) {
    const D = LV.NPCS[id], n = ((game.W && game.W.npcs) || []).find((x) => x.id === id);
    const ret = n && n.img ? '<img class="npc-ret" src="img/' + n.img + '.webp" alt="" onerror="this.remove()">' : '';
    const fala = id === 'santuario' ? (S().meta.finalVisto ? LV.historia().santuarioFinal : LV.historia().santuario) : D.fala;
    return '<div class="npc-cab" style="--c:' + D.cor + '">' + ret + '<div><div class="eyebrow">' + D.papel + '</div><h2>' + D.nome + '</h2>' +
      (fala ? '<p class="npc-fala">' + (id === 'santuario' ? fala : '“' + fala + '”') + '</p>' : '') + '</div></div>';
  }
  function htmlNpc(id) {
    const s = S();
    let h = cabecaNpc(id) + '<div class="npc-corpo">';
    if (id === 'pavio') h += secaoLanternasCaptura(s) + secaoLanternasLoja(s);
    else if (id === 'agulha') h += secaoCapasLoja(s) + '<p class="nota">' + LV.t('As capas que você tem (das conquistas, da costura e dos Guardiões) se trocam na aba Domador.') + '</p>';
    else if (id === 'bigorna') h += secaoMelhorias(s);
    else if (id === 'escambo') h += secaoTrocas(s);
    else if (id === 'iris') h += secaoRadiantes(s);
    else if (id === 'santuario') h += secoesSantuario(s);
    return h + '</div><div class="row end"><button class="btn" data-m="fechar">' + LV.t('Até logo') + '</button></div>';
  }
  /* uma janela aberta a partir da conversa (renascer, atributo automático) fecha a conversa e, ao terminar, volta para ela */
  function sobreNpc(abrir) {
    const o = ui.modalAberto;
    if (!o || o.tipo !== 'npc') { abrir(null); return; }
    const id = o.npc;
    ui.fecharModal();
    abrir(() => setTimeout(() => { if (game.W && game.W.lugar === 'vila' && !ui.modalAberto) ui.abrirNpc(id); }, 0));
  }
  /* vai até o Santuário da vila (indo para a vila antes, se preciso) */
  function irAoSantuario() {
    if (game.tutorial) return;
    if (!game.W || game.W.lugar !== 'vila') { if (!game.acao.irLugar('vila')) return; }
    const n = (game.W.npcs || []).find((x) => x.id === 'santuario');
    if (ui.gavetaAtiva()) ui.diario(false);
    if (n) game.falarNpc(n);
  }
  /* conversa com um morador (ou prédio) da vila */
  ui.abrirNpc = function (id) {
    if (id === 'portao') { som('clique'); game.acao.irLugar('treino'); return; }
    if (id === 'portal') { som('brilho'); game.acao.irLugar('vila'); return; }
    if (!LV.NPCS[id]) return;
    if (ui.modalAberto) { if (ui.modalAberto.tipo === 'npc') ui.fecharModal(); else return; }
    ui.modal(htmlNpc(id), { cls: 'npc-m', tipo: 'npc', npc: id });
    botoesCusto(el.mbox);
    som('clique');
  };
  ui.npcAtualizar = function () {
    if (!ui.modalAberto || ui.modalAberto.tipo !== 'npc') return;
    const sc = el.mbox.scrollTop;
    el.mbox.innerHTML = htmlNpc(ui.modalAberto.npc);
    el.mbox.scrollTop = sc;
    botoesCusto(el.mbox);
  };
  function fecharNpc() { if (ui.modalAberto && ui.modalAberto.tipo === 'npc') ui.fecharModal(); }
  ui.tituloLugar = function (id) {
    const Lg = LV.LUGARES[id];
    if (!Lg || ui.inicioVisivel()) return;
    ultimoTitulo = { nome: Lg.nome, t: performance.now() };
    const d = document.getElementById('titulo-mapa');
    d.innerHTML = '<span class="tm-linha"></span><span class="eyebrow">' + (id === 'vila' ? LV.t('Vila') : LV.t('Treino')) + '</span>' +
      '<h2>' + esc(Lg.nome) + '</h2><span class="tm-linha"></span><p class="tm-sub">' + Lg.sub + '</p>';
    d.classList.remove('mostra'); void d.offsetWidth; d.classList.add('mostra');
  };

  /* atributos automáticos: vagas compradas com Ecos. A escolha de cada vaga é fixa; mudar exige redefinir todas (taxa) */
  const nomeAttr = (id) => LV.ATTR.find((x) => x.id === id).nome;
  function secaoAutoAttr() {
    const m = S().meta, lista = m.autoAttr, vagas = m.autoVagas, max = LV.AUTO_ATTR_CUSTO.length;
    const custo = LV.custoAutoAttr(vagas), taxa = LV.taxaResetAuto(vagas);
    let h = LV.t('<section class="sec"><header class="sec-h"><h2>Atributos automáticos</h2><span class="muted small">') + vagas + ' / ' + max + LV.t(' vagas</span></header>') +
      LV.t('<p class="nota">Ao subir de nível, os 3 pontos novos vão sozinhos para os atributos escolhidos, revezando entre eles. A escolha de cada vaga é fixa e vale para todas as jornadas.</p><div class="auto-attr">');
    for (let i = 0; i < vagas; i++) {
      const a = lista[i];
      h += '<div class="vaga-auto' + (a ? '' : LV.t(' livre')) + LV.t('"><span>Vaga ') + (i + 1) + '</span>' +
        (a ? '<b>' + nomeAttr(a) + '</b><span class="fixo">' + ICON.cadeado + LV.t(' fixo</span>') : LV.t('<b class="muted">Livre: escolha um atributo</b><span></span>')) + '</div>';
    }
    h += '<div class="row">';
    if (lista.length < vagas) h += LV.t('<button class="btn pri" data-act="autoEscolher">Escolher atributo da vaga ') + (lista.length + 1) + '</button>';
    else if (custo != null) h += '<button class="btn" data-act="autoEscolher" data-ecos="' + custo + '">' + (vagas ? LV.t('Liberar a vaga ') + (vagas + 1) : LV.t('Liberar atributo automático')) + ' · ' + ICON.eco + ' ' + fmt(custo) + '</button>';
    if (lista.length) h += '<button class="btn perigo" data-act="autoReset" data-ecos="' + taxa + LV.t('">Redefinir automações · ') + ICON.eco + ' ' + fmt(taxa) + '</button>';
    h += '</div>';
    if (custo == null && lista.length >= vagas) h += LV.t('<p class="small maxed">Todas as vagas liberadas.</p>');
    else if (custo != null && vagas + 1 < max) h += LV.t('<p class="nota">Cada vaga seguinte custa o triplo (') + LV.AUTO_ATTR_CUSTO.slice(vagas + 1).map(fmt).join(', ') + LV.t(' Ecos).</p>');
    if (lista.length) h += LV.t('<p class="nota">Redefinir apaga a escolha de todas as vagas (elas continuam liberadas). A taxa sobe com o número de vagas liberadas: ') + LV.AUTO_ATTR_CUSTO.map((x, i) => fmt(LV.taxaResetAuto(i + 1))).join(', ') + LV.t(' Ecos.</p>');
    return h + '</div></section>';
  }
  /* popup de escolha: o atributo escolhido fica fixo na vaga */
  ui.autoSel = null;
  function htmlEscolhaAuto() {
    const m = S().meta, gratis = m.autoAttr.length < m.autoVagas, custo = gratis ? 0 : LV.custoAutoAttr(m.autoVagas);
    const livres = LV.ATTR.filter((a) => !m.autoAttr.includes(a.id));
    if (!livres.some((a) => a.id === ui.autoSel)) ui.autoSel = null;
    const vaga = gratis ? m.autoAttr.length + 1 : m.autoVagas + 1;
    return LV.t('<div class="eyebrow">Santuário dos Ecos</div><h2>Automatizar um atributo</h2>') +
      LV.t('<p>Escolha o atributo da vaga ') + vaga + LV.t('. Ao subir de nível, os pontos irão para ele sozinhos.</p>') +
      '<div class="escolha-auto">' + livres.map((a) => '<button class="ea' + (ui.autoSel === a.id ? LV.t(' sel') : '') + '" data-m="autoSel" data-attr="' + a.id + '" aria-pressed="' + (ui.autoSel === a.id) + '">' +
        '<b>' + a.nome + '</b><small>' + a.desc + '</small></button>').join('') + '</div>' +
      LV.t('<p class="aviso">A escolha é fixa. Para trocar depois, só redefinindo todas as vagas, com uma taxa em Ecos.</p>') +
      LV.t('<div class="row end"><button class="btn" data-m="fechar">Cancelar</button>') +
      '<button class="btn pri" data-m="autoConfirmar"' + (ui.autoSel ? '' : LV.t(' disabled')) + '>' + (gratis ? LV.t('Confirmar') : LV.t('Confirmar · ') + ICON.eco + ' ' + fmt(custo)) + '</button></div>';
  }
  ui.escolherAutoAttr = function (volta) {
    const m = S().meta;
    if (m.autoAttr.length >= m.autoVagas && LV.custoAutoAttr(m.autoVagas) == null) { if (volta) volta(); return; }
    ui.autoSel = null;
    ui.modal(htmlEscolhaAuto(), { cls: 'auto-m', tipo: 'auto', aoFechar: volta });
  };
  ui.confirmarResetAuto = function (volta) {
    const m = S().meta, taxa = LV.taxaResetAuto(m.autoVagas);
    ui.modal(LV.t('<div class="eyebrow">Santuário dos Ecos</div><h2>Redefinir automações?</h2>') +
      LV.t('<p>As escolhas de todas as ') + m.autoVagas + LV.t(' vagas serão apagadas (') + m.autoAttr.map(nomeAttr).join(', ') + LV.t('). As vagas continuam liberadas e você escolhe de novo cada uma, sem pagar a vaga outra vez.</p>') +
      LV.t('<p>Taxa: <b class="ecos-txt">') + ICON.eco + ' ' + fmt(taxa) + LV.t(' Ecos</b> (você tem ') + fmt(m.ecos) + ').</p>' +
      LV.t('<div class="row end"><button class="btn" data-m="fechar">Cancelar</button><button class="btn perigo" data-m="autoResetConfirmar"') + (m.ecos < taxa ? LV.t(' disabled') : '') + LV.t('>Redefinir</button></div>'), { tipo: 'auto', aoFechar: volta });
  };

  /* =================== ABA: SANTUÁRIO (metaprogressão) =================== */
  function abaSantuario() {
    const s = S(), m = s.meta, prev = game.ecosPrevistos(), naVila = game.W && game.W.lugar === 'vila';
    let h = LV.t('<section class="sec"><header class="sec-h"><h2>Santuário dos Ecos</h2><span class="ecos-saldo">') + ICON.eco + ' <b data-k="ecos">' + fmt(m.ecos) + LV.t('</b> Ecos</span></header>') +
      '<p class="nota">' + (S().meta.finalVisto ? LV.historia().santuarioFinal : LV.historia().santuario) + '</p>' +
      LV.t('<dl class="stats"><div><dt>Renascimentos</dt><dd>') + m.renasc + LV.t('</dd></div><div><dt>Ecos já ganhos</dt><dd>') + fmt(m.ecosTotal) + '</dd></div>' +
      LV.t('<div><dt>Maior nível</dt><dd>') + Math.max(m.recorde, s.dom.nivel) + LV.t('</dd></div><div><dt>Guardiões nesta jornada</dt><dd>') + s.mapas.filter((x) => x.chefe).length + ' / ' + LV.MAPS.length + '</dd></div></dl></section>';
    h += '<section class="sec"><header class="sec-h"><h2>' + LV.t('Ao renascer') + '</h2></header>';
    if (prev > 0) {
      h += '<div class="ecos-prev"><span>' + LV.t('Se renascer agora, você ganha') + '</span><b class="ecos-txt">' + ICON.eco + ' ' + fmt(prev) + LV.t(' Ecos') + '</b>' +
        '<small class="muted">' + LV.t('e fica com ') + fmt(m.ecos + prev) + LV.t(' Ecos no total') + '</small></div>' +
        LV.t('<p class="nota">Cada Guardião vencido nesta jornada vale mais Ecos, assim como vitórias repetidas e o nível do domador.</p>');
    } else h += LV.t('<p class="small">Derrote ') + LV.MAPS[0].chefe.nome + LV.t(' (Guardião de ') + LV.MAPS[0].nome + LV.t(') para poder renascer e ganhar Ecos.</p>');
    h += '<p class="nota">' + LV.t('Para comprar melhorias permanentes, automatizar atributos e renascer, vá ao Santuário dos Ecos, na Vila de Alvorada.') + '</p>' +
      '<div class="row"><button class="btn pri" data-act="irSantuario"' + (game.tutorial ? ' disabled' : '') + '>' + (naVila ? LV.t('Ir até o Santuário') : LV.t('Ir ao Santuário da Vila')) + '</button></div></section>';
    return h;
  }
  /* o Santuário da vila: renascer, atributos automáticos e melhorias permanentes */
  function secoesSantuario(s) {
    const m = s.meta, prev = game.ecosPrevistos();
    let h = '<p class="ecos-saldo">' + LV.t('Você tem ') + ICON.eco + ' <b>' + fmt(m.ecos) + '</b>' + LV.t(' Ecos') + '</p>';
    h += LV.t('<section class="sec renascer"><header class="sec-h"><h2>Renascer</h2></header>');
    if (prev > 0) {
      h += LV.t('<p class="small">Volte ao início abandonando Centelhas, níveis, Lumes, materiais, moedas, melhorias da Vila e mapas. Você ganha <b class="ecos-txt">') + ICON.eco + ' ' + fmt(prev) + LV.t(' Ecos</b> e escolhe de novo a Centelha inicial.</p>') +
        LV.t('<p class="nota">Cada Guardião vencido nesta jornada vale mais Ecos, assim como vitórias repetidas e o nível do domador.</p>') +
        LV.t('<div class="row"><button class="btn perigo" data-act="pedirRenascer">Renascer por ') + fmt(prev) + LV.t(' Ecos</button></div>');
    } else h += LV.t('<p class="small">Derrote ') + LV.MAPS[0].chefe.nome + LV.t(' (Guardião de ') + LV.MAPS[0].nome + LV.t(') para poder renascer e ganhar Ecos.</p>');
    h += '</section>';
    h += secaoAutoAttr();
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Melhorias permanentes</h2></header><div class="ups">');
    LV.META.forEach((u) => {
      const n = m.up[u.id], c = LV.custoMeta(u, n);
      h += '<div class="up"><div class="up-t"><b>' + u.nome + '</b><span class="muted">' + n + ' / ' + u.max + '</span></div>' +
        '<div class="up-d">' + u.desc + ': ' + u.efeito(n) + (c != null ? ' <span class="acc">→ ' + u.efeito(n + 1) + '</span>' : '') + '</div>' +
        (c == null ? LV.t('<span class="maxed">Máximo</span>') : '<button class="btn" data-act="meta" data-id="' + u.id + '" data-ecos="' + c + '">' + ICON.eco + ' ' + fmt(c) + '</button>') + '</div>';
    });
    h += '</div></section>';
    return h;
  }

  /* =================== ABA: MAPAS =================== */
  function abaMapas() {
    const s = S(), atual = game.W && game.W.lugar ? -1 : s.mapa;
    let h = secaoAlvorada() + LV.t('<section class="sec"><header class="sec-h"><h2>Profundezas</h2><span class="muted">Derrote o Guardião para descer</span></header><div class="mapas">');
    LV.MAPS.forEach((m, i) => {
      const est = s.mapas[i], P = m.pal, aqui = i === atual;
      const metaM = game.metaChefe(i), prog = Math.min(1, est.kills / metaM), res = Math.floor(est.reserva || 0);
      h += '<article class="mapa' + (aqui ? LV.t(' aqui') : '') + (est.liberado ? '' : LV.t(' bloq')) + '" data-act="verMapa" data-i="' + i + '" style="--m1:' + P.c2 + ';--m2:' + P.longe + ';--ma:' + P.acento + '">' +
        '<div class="mthumb"><span class="mnum">' + (i + 1) + '</span></div><div class="mbody">' +
        '<div class="mtit"><h3>' + m.nome + LV.t('</h3><span class="muted small">Nv ') + m.lv[0] + '–' + m.lv[1] + '</span></div>' +
        '<p class="small muted">' + m.sub + '</p>';
      if (est.liberado) {
        h += LV.t('<div class="mmeta"><span>Material: <i class="dot" style="--c:') + LV.MAT[m.mat].cor + '"></i>' + LV.MAT[m.mat].nome + '</span>' +
          LV.t('<span>Guardião: <b>') + m.chefe.nome + '</b>' + (est.chefe ? LV.t(' <span class="okk">vencido</span>') : '') + '</span></div>';
        if (aqui) {
          h += barra('xp', prog, 'data-k="mprog"') + '<div class="small muted"><span data-k="mkills">' + Math.min(est.kills, metaM) + '</span> / ' + metaM + LV.t(' criaturas para chamar o Guardião') +
            (res > 0 ? ' · <b class="acc" data-k="mres">+' + res + LV.t(' na reserva</b>') : '') + '</div>' +
            LV.t('<p class="nota">Depois da meta, 10% dos abates ficam guardados para a próxima invocação.</p>');
          h += '<div class="row"><button class="btn pri" data-act="chefe" data-chefe="1"' + (prog >= 1 && !(game.W && game.W.chefe) ? '' : LV.t(' disabled')) + LV.t('>Desafiar Guardião</button></div>');
        } else h += '<div class="row"><button class="btn" data-act="verMapa" data-i="' + i + '">' + LV.t('Ver mapa') + '</button></div>';
      } else h += LV.t('<p class="small">Derrote ') + LV.MAPS[i - 1].chefe.nome + LV.t(' em ') + LV.MAPS[i - 1].nome + LV.t(' para liberar.</p>');
      h += '</div></article>';
    });
    h += '</div></section>';
    return h;
  }

  /* prévia de um mapa: como ele é, quem vive lá e o botão para ir */
  ui.previaMapa = function (i) {
    const s = S(), m = LV.MAPS[i], est = s.mapas[i];
    if (!m) return;
    const aqui = game.W && !game.tutorial && !game.W.lugar && i === s.mapa, livre = est.liberado;
    const criaturas = m.selvagens.map((id) => ({ b: LV.besta(id + '_0'), sp: LV.SPECIES[id] }))
      .concat(m.hostis.map((id) => ({ b: LV.besta(id), hostil: true })));
    const chefe = LV.besta('chefe' + i);
    const imgDe = (b) => (b.tipo === 'selvagem' ? art.retrato(b.sp, b.est, 96) : LV.spr.url(b.img));
    // na imagem: as criaturas em fila sobre o chão do mapa; as ainda não vistas aparecem como silhueta
    const fila = criaturas.map((c, k) => '<img class="pv-cri' + (vista(c.b.id) ? '' : ' oculta') + '" src="' + imgDe(c.b) + '" alt="" style="--k:' + k + '">').join('') +
      (chefe ? '<img class="pv-chefe' + (est.chefe ? '' : ' oculta') + '" src="' + imgDe(chefe) + '" alt="">' : '');
    const cartao = (c) => {
      const v = vista(c.b.id);
      const tag = c.hostil ? LV.t('Breu') : c.sp.passivo ? LV.t('Mansa') : LV.t('Agressiva');
      return '<div class="pv-card' + (v ? '' : ' oculta') + '"><img src="' + imgDe(c.b) + '" alt="" width="52" height="52"><div><b>' + (v ? esc(c.b.nome) : '???') + '</b>' +
        '<small>' + tag + (c.sp ? ' · ' + LV.EL[c.sp.el].nome : '') + '</small></div></div>';
    };
    let acao;
    if (!livre) acao = '<p class="small muted">' + LV.t('Derrote ') + LV.MAPS[i - 1].chefe.nome + LV.t(' em ') + LV.MAPS[i - 1].nome + LV.t(' para liberar.</p>');
    else if (aqui) acao = '<p class="small acc">' + LV.t('Você está neste mapa.') + '</p>';
    else acao = '';
    const html = '<div class="previa">' +
      '<div class="pv-img" style="background-image:url(img/' + LV.FUNDOS[i] + '.webp)"><div class="pv-fila">' + fila + '</div>' +
      '<div class="pv-tit"><span class="eyebrow">' + LV.t('Profundeza ') + (i + 1) + ' · ' + LV.t('Nv ') + m.lv[0] + '–' + m.lv[1] + '</span><h2>' + m.nome + '</h2></div></div>' +
      '<p class="muted">' + m.sub + '</p>' +
      '<div class="pv-meta"><span>' + LV.t('Material: ') + '<i class="dot" style="--c:' + LV.MAT[m.mat].cor + '"></i>' + LV.MAT[m.mat].nome + '</span>' +
      '<span>' + LV.t('Guardião: ') + '<b>' + m.chefe.nome + '</b>' + (est.chefe ? ' <span class="okk">' + LV.t('vencido') + '</span>' : '') + '</span>' +
      '<span>' + LV.t('Moeda: ') + iconeMoeda(LV.MOEDAS[i]) + LV.MOEDAS[i].nome + '</span></div>' +
      '<h3 class="pv-h">' + LV.t('Quem vive aqui') + '</h3><div class="pv-grade">' + criaturas.map(cartao).join('') + '</div>' +
      acao +
      '<div class="row end"><button class="btn" data-m="fechar">' + LV.t('Fechar') + '</button>' +
      (livre && !aqui && !game.tutorial && !(game.W && game.W.chefe) ? '<button class="btn pri" data-m="irMapa" data-i="' + i + '">' + LV.t('Ir para este mapa') + '</button>' : '') + '</div></div>';
    ui.modal(html, { cls: 'previa-m', previa: true });
  };
  /* o jogo pausa só com a prévia de um mapa aberta ou durante a evolução de um pet */
  ui.pausaMenu = function () {
    if (!S() || !game.W || ui.inicioVisivel() || (ui.afk && ui.afk.ativo)) return false;
    return !!(ui.modalAberto && (ui.modalAberto.previa || ui.modalAberto.pausa));
  };
  let pausaMostrada = false;
  ui.marcarPausa = function (on) {
    if (on === pausaMostrada) return;
    pausaMostrada = on;
    document.getElementById('pausado').hidden = !on;
  };
  /* título do mapa no centro da tela ao entrar (declarado lá em cima, junto da vila) */
  ui.tituloMapa = function (i) {
    const m = LV.MAPS[i];
    if (!m || ui.inicioVisivel()) return;
    const nome = game.tutorial ? LV.t('Primeira Luz') : m.nome;
    if (ultimoTitulo.nome === nome && performance.now() - ultimoTitulo.t < 4000) return;
    ultimoTitulo = { nome, t: performance.now() };
    const d = document.getElementById('titulo-mapa');
    d.innerHTML = '<span class="tm-linha"></span><span class="eyebrow">' + (game.tutorial ? LV.t('Tutorial') : LV.t('Profundeza ') + (i + 1)) + '</span>' +
      '<h2>' + esc(nome) + '</h2><span class="tm-linha"></span><p class="tm-sub">' + (game.tutorial ? LV.historia().tutorialSub : m.sub) + '</p>';
    d.classList.remove('mostra'); void d.offsetWidth; d.classList.add('mostra');
  };

  /* =================== ABA: AJUDA =================== */
  function abaAjuda() {
    const secoes = LV.ajuda ? LV.ajuda() : [];
    const H = LV.historia(), achadas = (S().meta.diario || []).length;
    return '<section class="sec ajuda"><header class="sec-h"><h2>' + H.resumoT + '</h2></header><div class="historia-resumo">' + H.resumo.map((x) => '<p>' + x + '</p>').join('') +
      '<button class="btn" data-m-abrir="diario">' + H.diarioCurto + ' · ' + achadas + '/' + H.paginas.length + '</button></div></section>' +
      '<section class="sec ajuda"><header class="sec-h"><h2>' + LV.t('Como jogar') + '</h2><span class="muted small">' + LV.t('toque num tópico') + '</span></header>' +
      secoes.map((sx, i) => '<details class="aj"' + (i === 0 ? ' open' : '') + '><summary>' + sx[0] + '</summary><ul>' + sx[1].map((l) => '<li>' + l + '</li>').join('') + '</ul></details>').join('') +
      '</section>';
  }

  /* =================== ABA: BOLSA =================== */
  function abaBolsa() {
    const s = S(), st = s.st;
    let h = LV.t('<section class="sec"><header class="sec-h"><h2>Recursos</h2></header><dl class="stats">') +
      '<div><dt>' + ICON.lumes + LV.t(' Lumes</dt><dd data-k="lumes">') + fmt(s.lumes) + '</dd></div>' +
      '<div><dt>' + ICON.lant + LV.t(' Lanternas</dt><dd data-k="lant">') + s.lanternas + '</dd></div>';
    for (const k in LV.MAT) h += '<div><dt><i class="dot" style="--c:' + LV.MAT[k].cor + '"></i>' + LV.MAT[k].nome + '</dt><dd data-mat="' + k + '">' + fmt(s.mats[k]) + '</dd></div>';
    h += '<div><dt>' + ICON.eco + LV.t(' Ecos</dt><dd data-k="ecos">') + fmt(s.meta.ecos) + '</dd></div>';
    h += '</dl>' + carteiraMoedas(s) + '</section>';
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Diário</h2></header><dl class="stats">') +
      LV.t('<div><dt>Criaturas derrotadas</dt><dd data-k="kills">') + fmt(st.kills) + '</dd></div>' +
      LV.t('<div><dt>Capturas</dt><dd>') + fmt(st.capturas) + '</dd></div>' +
      LV.t('<div><dt>Evoluções</dt><dd>') + fmt(st.evolucoes) + '</dd></div>' +
      LV.t('<div><dt>Guardiões vencidos</dt><dd>') + fmt(st.chefes) + '</dd></div>' +
      LV.t('<div><dt>Tempo de jogo</dt><dd data-k="tempo">') + LV.fmtTempo(st.tempo) + '</dd></div>' +
      LV.t('<div><dt>Ritmo de caça</dt><dd>') + (st.taxa ? (st.taxa * 60).toFixed(1).replace('.', LV.decSep) + '/min' : LV.t('medindo…')) + '</dd></div>' +
      '</dl></section>';
    const nq = game.conquistasProntas(), vistos = LV.BESTIARIO.filter((b) => vista(b.id)).length;
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Diário de campo</h2></header><div class="row">') +
      LV.t('<button class="btn" data-m-abrir="diario">' + LV.historia().diarioCurto + ' · ' + (S().meta.diario || []).length + '/' + LV.historia().paginas.length + '</button><button class="btn" data-m-abrir="best">Bestiário · ') + vistos + '/' + LV.BESTIARIO.length + '</button>' +
      '<button class="btn' + (nq ? LV.t(' ouro') : '') + LV.t('" data-m-abrir="conq">Conquistas') + (nq ? ' · ' + nq + LV.t(' para resgatar') : '') + '</button></div></section>';
    const autoOk = game.autoLiberada();
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Opções</h2></header><div class="opts">') +
      opt('auto', LV.t('Caçada automática'), autoOk ? LV.t('O domador anda sozinho até os inimigos, usa escadas e coleta o que cair.') : LV.t('Desbloqueia a partir do mapa 2 (vença a ') + LV.MAPS[0].chefe.nome + ').', !autoOk) +
      LV.t('</div><div class="row"><button class="btn" data-act="salvar">Salvar agora</button><span class="muted small" data-k="savetxt"></span></div>') +
      '<p class="nota">' + (LV.movel
        ? LV.t('Controles: ◀ ▶ para andar, ▲ para pular ou subir escadas, ▼ para descer. Toque no cenário para ir até lá. Toque numa criatura: só o domador ataca. Segure o dedo numa criatura: o domador e as Centelhas atacam juntos.')
        : LV.t('Controles: A/D ou setas para andar, Espaço para pular, W/↑ para subir escadas, S/↓ para descer. Clique no cenário para ir até lá. Clique esquerdo numa criatura: só o domador ataca. Clique direito: o domador e as Centelhas atacam juntos. 1, 2 e 3 trocam o modo das Centelhas.') +
          ' ' + LV.t('Atalhos: E Equipe · T Domador · L Vila · M Mapas · R Santuário · B Bolsa · H Ajuda · O Bestiário · C Conquistas · Q lanterna.')) +
      '</p></section>';
    return h;
  }
  function opt(id, nome, desc, travado) {
    const on = S().op[id] && !travado;
    return '<button class="opt' + (travado ? LV.t(' travado') : '') + '" role="switch" aria-checked="' + on + '"' + (travado ? ' aria-disabled="true"' : '') + ' data-act="opt" data-op="' + id + '"><span class="sw"></span><span><b>' + (travado ? ICON.cadeado + ' ' : '') + nome + '</b><small>' + desc + '</small></span></button>';
  }

  /* =================== ABA: CONSOLE =================== */
  const CHIPS = [LV.t('lumes +10000'), LV.t('nivel 30'), LV.t('materiais 300'), LV.t('moeda todas +20'), LV.t('ecos +50'), LV.t('lanternas 50'), 'curar', LV.t('velocidade 3'), 'chefe', 'desbloquear', 'renascer', 'deus', 'ajuda'];
  function abaConsole() {
    const s = S();
    let h = LV.t('<section class="sec"><header class="sec-h"><h2>Console do criador</h2><span class="muted">digite e aperte Enter</span></header>') +
      '<div class="console"><div id="clog" class="clog" aria-live="polite">' + (ui.log.length ? ui.log.map(linhaLog).join('') : LV.t('<div class="l info">Exemplos: <code>lumes 50000</code> · <code>nivel 40</code> · <code>pet 1 nivel 50</code> · <code>evoluir 1</code> · <code>material esporo 200</code>. Digite <code>ajuda</code> para ver tudo.</div>')) + '</div>' +
      LV.t('<form id="cform" class="cform" autocomplete="off"><span aria-hidden="true">›</span><input id="cin" type="text" spellcheck="false" placeholder="ex.: lumes 50000" aria-label="Comando"><button class="btn pri" type="submit">Aplicar</button></form>') +
      '<div class="chips">' + CHIPS.map((c) => '<button class="chip" data-act="chip" data-cmd="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div></div></section>';
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Edição rápida</h2></header><div class="quick">') +
      campo('q-lumes', LV.t('Lumes'), Math.floor(s.lumes), 'lumes') +
      campo('q-nivel', LV.t('Nível do domador'), s.dom.nivel, 'nivel') +
      campo('q-pontos', LV.t('Pontos de atributo'), s.dom.pontos, 'pontos') +
      campo('q-lant', LV.t('Lanternas'), s.lanternas, 'lanternas') +
      campo('q-vel', LV.t('Velocidade do jogo'), s.op.vel, 'velocidade') +
      LV.t('<div class="qf"><label for="q-mat">Material</label><div class="qrow"><select id="q-mat">') + Object.keys(LV.MAT).map((k) => '<option value="' + k + '">' + LV.MAT[k].nome + '</option>').join('') + LV.t('<option value="todos">Todos</option></select>') +
      LV.t('<input id="q-matv" type="text" inputmode="numeric" value="100" aria-label="Quantidade"><button class="btn" data-act="quickmat">Aplicar</button></div></div>') +
      '</div></section>';
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Save completo (JSON)</h2></header>') +
      LV.t('<p class="nota">Edite qualquer valor do save e aplique. O jogo corrige valores inválidos ao carregar.</p>') +
      '<textarea id="savejson" class="json" spellcheck="false" rows="10" aria-label="Save em JSON"></textarea>' +
      LV.t('<div class="row"><button class="btn" data-act="jsonler">Carregar save atual</button><button class="btn pri" data-act="jsonaplicar">Aplicar JSON</button></div></section>');
    return h;
  }
  function campo(id, nome, v, cmd) {
    return '<div class="qf"><label for="' + id + '">' + nome + '</label><div class="qrow"><input id="' + id + '" type="text" inputmode="decimal" value="' + esc(v) + '" data-v="' + esc(v) + '"><button class="btn" data-act="quick" data-for="' + id + '" data-cmd="' + cmd + '">Aplicar</button></div></div>';
  }
  function linhaLog(l) { return '<div class="l ' + l.k + '">' + esc(l.t) + '</div>'; }
  function rodar(cmd) {
    ui.log.push({ t: '› ' + cmd, k: 'cmd' });
    const out = LV.admin.exec(cmd);
    out.forEach((l) => ui.log.push(l));
    if (ui.log.length > 160) ui.log = ui.log.slice(-160);
    if (ui.hist[ui.hist.length - 1] !== cmd) ui.hist.push(cmd);
    ui.histI = -1;
    atualizarLog();
    hud();
    atualizar();
  }
  ui.rodar = rodar;
  function enviarConsole() {
    const inp = $('#cin');
    const v = inp.value.trim();
    if (!v) return;
    inp.value = '';
    rodar(v);
  }
  function teclaConsole(e) {
    if (e.target.id !== 'cin') return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!ui.hist.length) return;
      e.preventDefault();
      if (ui.histI < 0) ui.histI = ui.hist.length;
      ui.histI = LV.clamp(ui.histI + (e.key === 'ArrowUp' ? -1 : 1), 0, ui.hist.length);
      e.target.value = ui.hist[ui.histI] || '';
    }
  }

  /* =================== CLIQUES DO PAINEL =================== */
  function clique(e) {
    if (ui._semClique) return;            // o clique que encerra um arrasto não seleciona nada
    const ab = e.target.closest('[data-m-abrir]');
    if (ab) { som('clique'); if (ab.dataset.mAbrir === 'best') ui.abrirBestiario(); else if (ab.dataset.mAbrir === 'diario') ui.diarioCandeia(); else ui.abrirConquistas(); return; }
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const a = b.dataset.act, uid = +b.dataset.uid;
    const s = S();
    if (a === 'sel') { ui.sel = uid; ui.confirmar = null; ui.render(); }
    else if (a === 'irEvo') {             // selo de evolução: seleciona o pet e rola até "Evoluir para"
      ui.sel = uid; ui.confirmar = null; ui.render(); som('clique');
      requestAnimationFrame(() => {
        const ev = el.pane.querySelector('.detalhe .evo');
        if (!ev) return;
        ev.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ev.classList.remove('realce'); void ev.offsetWidth; ev.classList.add('realce');
      });
    }
    else if (a === 'ativar') { const r = game.acao.ativar(uid); if (r !== true) ui.toast(r === 'cheio' ? LV.t('Sem vagas livres. Tire alguém de campo ou compre Laço Extra.') : LV.t('Não foi possível'), 'ruim', true); ui.render(); }
    else if (a === 'retirar') { const r = game.acao.retirar(uid); if (r === 'ultimo') ui.toast(LV.t('Pelo menos uma Centelha precisa ficar em campo'), 'ruim', true); ui.render(); }
    else if (a === 'pedirLib') { ui.confirmar = 'lib' + uid; ui.render(); }
    else if (a === 'libertar') { const v = game.acao.libertar(uid); if (typeof v === 'number') ui.toast(LV.t('Centelha libertada. +') + fmt(v) + LV.t(' Lumes'), 'bom', true); ui.confirmar = null; ui.sel = null; ui.render(); LV.salvarLogo(); }
    else if (a === 'evoluir') { const r = game.acao.evoluir(uid); if (r !== true) ui.toast(LV.t('Ainda faltam requisitos para evoluir'), 'ruim', true); }
    else if (a === 'hab') {
      const r = game.acao.melhorarHab(uid);
      if (r === true) { const p = s.pets.find((x) => x.uid === uid); ui.toast(LV.t('Ataques de ') + LV.nomePet(p) + LV.t(' agora no nível ') + p.hab, 'bom', true); som('nivel'); }
      else ui.toast(r === 'mat' ? LV.t('Faltam materiais para melhorar') : r === 'max' ? LV.t('Ataques no nível máximo') : LV.t('Lumes insuficientes'), 'ruim', true);
      ui.render(); LV.salvarLogo();
    }
    else if (a === 'atq') {
      const r = game.acao.equiparAtq(uid, b.dataset.id);
      if (r === 'ultimo') ui.toast(LV.t('Pelo menos um ataque precisa ficar equipado'), 'ruim', true);
      else if (r === true) som('clique');
      ui.render(); LV.salvarLogo();
    }
    else if (a === 'ponto') {
      // adiciona a quantidade do seletor (1, 5, 10 ou 100); com menos pontos livres, adiciona todos
      game.acao.ponto(b.dataset.attr, Math.min(ui.qtdPontos, S().dom.pontos)); ui.render();
    }
    else if (a === 'qtd') {
      ui.qtdPontos = QTD_PONTOS[(QTD_PONTOS.indexOf(ui.qtdPontos) + 1) % QTD_PONTOS.length];
      try { localStorage.setItem('lumevale.qtdPontos', String(ui.qtdPontos)); } catch (err) { /* sem armazenamento */ }
      som('clique'); ui.render();
    }
    else if (a === 'sub') {
      const id = b.dataset.sub;
      ui.domSub = ui.domSub === id ? null : id;
      som('clique'); ui.render();
      if (ui.domSub) requestAnimationFrame(() => { const x = el.pane.querySelector('.sub[data-sub="' + id + '"]'); if (x) x.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    }
    else if (a === 'skill') {
      const r = game.acao.melhorarSkill(b.dataset.id), k = LV.skill(b.dataset.id);
      if (r === true) { som('nivel'); ui.toast(k.nome + LV.t(' agora no nível ') + S().dom.skills[k.id], 'bom', true); hud(); }
      else ui.toast(r === 'pontos' ? LV.t('Pontos de skill insuficientes') : r === 'nivel' ? LV.t('O domador precisa do nível ') + k.nv : r === 'max' ? LV.t('Skill no nível máximo') : LV.t('Não foi possível'), 'ruim', true);
      ui.render(); LV.salvarLogo();
    }
    else if (a === 'perfil') { som('clique'); ui.abrirPerfil(); }
    else if (a === 'titulo') {
      if (game.acao.equiparTitulo(b.dataset.id || null) === true) { som('brilho'); ui.toast(b.dataset.id ? LV.t('Título equipado: ') + LV.titulo(b.dataset.id).nome : LV.t('Sem título: aparece a patente do nível'), 'bom', true); }
      perfilAtualizar(); hud(); ui.render(); LV.salvarLogo();
    }
    else if (a === 'up') {
      const r = game.acao.comprarUp(b.dataset.id);
      if (r === true) som('moeda');
      else ui.toast(r === 'moeda' ? LV.t('Faltam moedas do Guardião') : r === 'max' ? LV.t('Melhoria no máximo') : LV.t('Lumes insuficientes'), 'ruim', true);
      ui.render(); LV.salvarLogo();
    }
    else if (a === 'meta') {
      const r = game.acao.comprarMeta(b.dataset.id);
      if (r === true) { som('brilho'); const u = LV.meta(b.dataset.id); ui.toast(u.nome + ': ' + u.efeito(s.meta.up[u.id]), 'bom', true); }
      else ui.toast(r === 'max' ? LV.t('Melhoria no máximo') : LV.t('Ecos insuficientes'), 'ruim', true);
      ui.render(); hud(); LV.salvarLogo();
    }
    else if (a === 'pedirRenascer') sobreNpc((volta) => ui.confirmarRenascer(volta));
    else if (a === 'irSantuario') { som('clique'); irAoSantuario(); ui.render(); }
    else if (a === 'equipar') { if (game.acao.equipar(b.dataset.tipo, b.dataset.id) === true) som('clique'); ui.render(); hud(); LV.salvarLogo(); }
    else if (a === 'comprarLanterna') {
      const r = game.acao.comprarLanterna(b.dataset.id);
      if (r === true) { som('moeda'); ui.toast(LV.lanternaEq(b.dataset.id).nome + LV.t(' comprada e equipada'), 'bom', true); }
      else if (r === 'moeda') ui.toast(LV.t('Faltam moedas do Guardião'), 'ruim', true);
      else if (r === 'lumes') ui.toast(LV.t('Lumes insuficientes'), 'ruim', true);
      ui.render(); LV.salvarLogo();
    }
    else if (a === 'comprarCapa') {
      const r = game.acao.comprarCapa(b.dataset.id);
      if (r === true) { som('moeda'); ui.toast(LV.capa(b.dataset.id).nome + LV.t(' comprada e equipada'), 'bom', true); }
      else if (r === 'lumes') ui.toast(LV.t('Lumes insuficientes'), 'ruim', true);
      ui.render(); LV.salvarLogo();
    }
    else if (a === 'autoEscolher') sobreNpc((volta) => ui.escolherAutoAttr(volta));
    else if (a === 'autoReset') sobreNpc((volta) => ui.confirmarResetAuto(volta));
    else if (a === 'lant') { const r = game.acao.comprarLanternas(+b.dataset.n); if (r !== true) ui.toast(LV.t('Lumes insuficientes'), 'ruim', true); ui.render(); }
    else if (a === 'viajar') { game.acao.viajar(+b.dataset.i); ui.render(); LV.salvarLogo(); }
    else if (a === 'irLugar') { som('clique'); if (game.acao.irLugar(b.dataset.id)) { if (ui.gavetaAtiva()) ui.diario(false); } ui.render(); }
    else if (a === 'sairLugar') { som('clique'); game.acao.sairLugar(); ui.render(); LV.salvarLogo(); }
    else if (a === 'falarNpc') {
      const n = game.W && (game.W.npcs || []).find((x) => x.id === b.dataset.id);
      if (n) { som('clique'); if (ui.gavetaAtiva()) ui.diario(false); game.falarNpc(n); }
    }
    else if (a === 'trocar') {
      const r = game.acao.trocar(b.dataset.de, b.dataset.para, b.dataset.n === 'max' ? 'max' : +b.dataset.n);
      if (typeof r === 'number') { som('moeda'); ui.toast(LV.t('Troca feita: +') + fmt(r * (LV.TROCA.ordem.indexOf(b.dataset.para) > LV.TROCA.ordem.indexOf(b.dataset.de) ? 1 : LV.TROCA.desce)) + ' ' + LV.MAT[b.dataset.para].nome, 'bom', true); }
      else ui.toast(r === 'trava' ? LV.t('Libere as duas profundezas para trocar') : LV.t('Material insuficiente'), 'ruim', true);
      LV.salvarLogo();
    }
    else if (a === 'radiante') {
      const r = game.acao.recuperarRadiante(b.dataset.sp);
      if (r && r.uid) { som('nivel'); ui.toast(LV.nomePet(r) + LV.t(' Radiante voltou para a sua coleção'), 'bom'); }
      else ui.toast(r === 'cheio' ? LV.t('Sua coleção está cheia (80 Centelhas).') : r === 'lumes' ? LV.t('Lumes insuficientes') : LV.t('Não foi possível'), 'ruim', true);
      LV.salvarLogo();
    }
    else if (a === 'verMapa') { som('clique'); ui.previaMapa(+b.dataset.i); }
    else if (a === 'chefe') { game.desafiarChefe(); ui.render(); }
    else if (a === 'opt') {
      if (game.acao.alternar(b.dataset.op) === 'bloqueado') ui.toast(LV.t('A caçada automática desbloqueia a partir do mapa 2.'), 'ruim', true);
      ui.render(); hud();
    }
    else if (a === 'salvar') { LV.salvar(true); ui.toast(LV.t('Jogo salvo'), 'bom', true); }
    else if (a === 'chip') { const c = b.dataset.cmd; rodar(c); }
    else if (a === 'quick') { const inp = $('#' + b.dataset.for); if (inp && inp.value.trim()) { rodar(b.dataset.cmd + ' ' + inp.value.trim()); inp.dataset.v = '?'; inp.value = '?'; atualizar(); } }
    else if (a === 'quickmat') { const v = $('#q-matv').value.trim(); if (v) rodar(LV.t('material ') + $('#q-mat').value + ' ' + v); }
    else if (a === 'jsonler') { $('#savejson').value = JSON.stringify(s, null, 2); }
    else if (a === 'jsonaplicar') {
      const txt = $('#savejson').value.trim();
      if (!txt) { ui.log.push({ t: LV.t('Cole ou carregue um save primeiro'), k: 'erro' }); ui.render(); return; }
      try {
        const obj = JSON.parse(txt);
        const norm = game.normalizar(obj);
        if (!norm.inicial) throw new Error(LV.t('o save precisa ter pelo menos uma Centelha'));
        game.carregar(obj);
        LV.salvar(true);
        ui.log.push({ t: LV.t('› aplicar JSON'), k: 'cmd' }, { t: LV.t('Save aplicado. Nível ') + S().dom.nivel + ', ' + fmt(S().lumes) + LV.t(' Lumes, ') + S().pets.length + LV.t(' Centelhas.'), k: 'ok' });
        ui.sel = null;
      } catch (err) {
        ui.log.push({ t: LV.t('JSON inválido: ') + err.message, k: 'erro' });
      }
      atualizarLog();
      ui.render();
    }
  }

  /* =================== ATUALIZAÇÃO EM TEMPO REAL =================== */
  /* liga/desliga os botões com custo conforme o que você tem */
  function botoesCusto(raiz) {
    const s = S();
    if (!s || !raiz) return;
    raiz.querySelectorAll('[data-custo]').forEach((b) => {
      let pode = s.lumes >= +b.dataset.custo;
      if (b.dataset.mat) { const [k, q] = b.dataset.mat.split(':'); pode = pode && (s.mats[k] || 0) >= +q; }
      if (b.dataset.moedaQ) { const [k, q] = b.dataset.moedaQ.split(':'); pode = pode && (s.moedas[k] || 0) >= +q; }
      if (b.closest('.troca.bloq')) pode = false;
      b.disabled = !pode;
    });
    raiz.querySelectorAll('[data-ecos]').forEach((b) => { b.disabled = s.meta.ecos < +b.dataset.ecos; });
    raiz.querySelectorAll('b[data-moeda]').forEach((x) => { const v = fmt(s.moedas[x.dataset.moeda] || 0); if (x.textContent !== v) x.textContent = v; });
  }
  function atualizar() {
    const s = S();
    if (!s || !el.pane) return;
    if (ui.modalAberto && ui.modalAberto.tipo === 'npc') botoesCusto(el.mbox);
    if (ui.gavetaAtiva() && !document.documentElement.classList.contains('diario')) return;   // gaveta fechada: nada a atualizar
    const p = el.pane;
    p.querySelectorAll('[data-custo]').forEach((b) => {
      let pode = s.lumes >= +b.dataset.custo;
      if (b.dataset.mat) { const [k, q] = b.dataset.mat.split(':'); pode = pode && (s.mats[k] || 0) >= +q; }
      if (b.dataset.moedaQ) { const [k, q] = b.dataset.moedaQ.split(':'); pode = pode && (s.moedas[k] || 0) >= +q; }
      b.disabled = !pode;
    });
    p.querySelectorAll('[data-ecos]').forEach((b) => { b.disabled = s.meta.ecos < +b.dataset.ecos; });
    p.querySelectorAll('b[data-moeda]').forEach((x) => { const v = fmt(s.moedas[x.dataset.moeda] || 0); if (x.textContent !== v) x.textContent = v; });
    p.querySelectorAll('[data-pts]').forEach((b) => { b.disabled = s.dom.pontos < 1; });
    p.querySelectorAll('[data-skpts]').forEach((b) => { b.disabled = (s.dom.skillPts || 0) < +b.dataset.skpts; });
    p.querySelectorAll('[data-evo]').forEach((b) => { const pet = s.pets.find((x) => x.uid === +b.dataset.evo); b.disabled = !(pet && game.podeEvoluir(pet).ok); });
    p.querySelectorAll('[data-chefe]').forEach((b) => { b.disabled = !(s.mapas[s.mapa].kills >= game.metaChefe() && !(game.W && game.W.chefe)); });
    p.querySelectorAll('[data-pet-hp]').forEach((i) => { const rt = petRT(+i.dataset.petHp); if (rt) i.style.width = (LV.clamp(rt.hp / rt.hpMax, 0, 1) * 100).toFixed(1) + '%'; });
    p.querySelectorAll('[data-pet-xp]').forEach((i) => { const pet = s.pets.find((x) => x.uid === +i.dataset.petXp); if (pet) i.style.width = (LV.clamp(pet.xp / LV.F.xpPet(pet.nivel), 0, 1) * 100).toFixed(1) + '%'; });
    p.querySelectorAll('[data-pet-lv]').forEach((i) => { const pet = s.pets.find((x) => x.uid === +i.dataset.petLv); if (pet) i.textContent = pet.nivel; });
    p.querySelectorAll('[data-pet-xptxt]').forEach((i) => { const pet = s.pets.find((x) => x.uid === +i.dataset.petXptxt); if (pet) i.textContent = fmt(pet.xp); });
    p.querySelectorAll('[data-pet-st]').forEach((i) => { const rt = petRT(+i.dataset.petSt); i.textContent = rt && rt.desm > 0 ? LV.t('desmaiado') : rt && rt.alvo ? LV.t('lutando') : LV.t('seguindo'); });
    const k = (n) => p.querySelector('[data-k="' + n + '"]');
    const set = (n, v) => { const x = k(n); if (x && x.textContent !== String(v)) x.textContent = v; };
    set('nivel', s.dom.nivel); set('pontos', s.dom.pontos); set('skpts', s.dom.skillPts || 0); set('xptxt', fmt(s.dom.xp)); set('lumes', fmt(s.lumes)); set('lant', s.lanternas);
    set('kills', fmt(s.st.kills)); set('tempo', LV.fmtTempo(s.st.tempo)); set('ecos', fmt(s.meta.ecos));
    set('mkills', Math.min(s.mapas[s.mapa].kills, game.metaChefe()));
    const xb = k('xpbar'); if (xb) xb.style.width = (LV.clamp(s.dom.xp / LV.F.xpDom(s.dom.nivel), 0, 1) * 100).toFixed(1) + '%';
    const mp = k('mprog'); if (mp) mp.style.width = (Math.min(1, s.mapas[s.mapa].kills / game.metaChefe()) * 100).toFixed(1) + '%';
    p.querySelectorAll('[data-mat]').forEach((x) => { if (x.tagName === 'DD') x.textContent = fmt(s.mats[x.dataset.mat]); });
    set('savetxt', LV.textoSave ? LV.textoSave() : '');
    const quick = { 'q-lumes': Math.floor(s.lumes), 'q-nivel': s.dom.nivel, 'q-pontos': s.dom.pontos, 'q-lant': s.lanternas, 'q-vel': s.op.vel };
    for (const id in quick) {
      const inp = document.getElementById(id);
      if (!inp || inp === document.activeElement) continue;
      const v = String(quick[id]);
      if (inp.dataset.v !== v && inp.value === inp.dataset.v) { inp.value = v; inp.dataset.v = v; }
    }
    if (ui.sujas.has(ui.aba)) ui.renderSuave();
  }
  ui.atualizar = atualizar;

  /* =================== HUD =================== */
  let chaveChips = '';
  function hud() {
    const s = S(), W = game.W;
    if (!s || !W) return;
    const d = s.dom, R = LV.RANKS[LV.rankIdx(d.nivel)];
    el.lv.textContent = d.nivel;
    const sob = nomeSobNome(); if (el.rank.textContent !== sob) el.rank.textContent = sob;
    el.nome.textContent = d.nome;
    el.xp.style.width = (LV.clamp(d.xp / LV.F.xpDom(d.nivel), 0, 1) * 100).toFixed(1) + '%';
    el.hp.style.width = (LV.clamp(W.tam.hp / W.tam.hpMax, 0, 1) * 100).toFixed(1) + '%';
    if (ui.lumesPendentes && !W.drops.some((x) => x.visual)) ui.lumesPendentes = 0;
    el.lumes.textContent = fmt(Math.max(0, s.lumes - ui.lumesPendentes));
    const nq = game.conquistasProntas(), bq = document.getElementById('h-conq');
    bq.hidden = !nq; bq.textContent = nq;
    document.getElementById('b-conq').classList.toggle('tem', nq > 0);
    el.lant.textContent = s.lanternas;
    el.mapa.textContent = game.tutorial ? LV.t('Primeira Luz') : W.def.nome;
    const lugar = W.lugar || null;
    const m = s.mapas[s.mapa], meta = game.metaChefe(), pronto = m.kills >= meta && !game.tutorial && !lugar, reserva = Math.floor(m.reserva || 0);
    const bSair = document.getElementById('b-sair');
    bSair.hidden = !lugar;
    if (lugar) { const tx = LV.t('Voltar a ') + LV.MAPS[s.mapa].nome; if (bSair.textContent !== tx) bSair.textContent = tx; }
    el.bAuto.hidden = !!lugar;
    document.getElementById('b-lant').hidden = !!lugar;
    painelDps(lugar === 'treino');
    if (lugar) el.guard.textContent = lugar === 'vila' ? LV.t('Clique nos moradores para falar') : LV.t('Bonecos de treino');
    else if (game.tutorial) el.guard.textContent = LV.t('Tutorial');
    else if (W.chefe) el.guard.textContent = LV.t('Guardião em combate');
    else el.guard.textContent = (pronto ? LV.t('O Guardião aguarda') : LV.t('Guardião ') + Math.min(m.kills, meta) + '/' + meta) + (reserva > 0 ? ' · +' + reserva + LV.t(' na reserva') : '');
    el.bChefe.hidden = !(pronto && !W.chefe);
    const pct = document.getElementById('tut-pct');
    if (pct && game.tutorial) pct.textContent = Math.round(game.chanceTutorial() * 100) + '%';
    const travado = !game.autoLiberada();
    el.bAuto.classList.toggle('travado', travado);
    el.bAuto.setAttribute('aria-pressed', String(s.op.auto && !travado));
    el.bAuto.setAttribute('aria-disabled', String(travado));
    if (travado) el.bAuto.dataset.dica = LV.t('Desbloqueia a partir do mapa 2'); else delete el.bAuto.dataset.dica;
    // desafio automático: aparece depois da 1ª etapa comprada; travado nos mapas ainda não liberados
    const bDes = document.getElementById('b-desafio'), etapas = game.desafioAutoEtapas(), desLib = game.desafioAutoLiberado();
    bDes.hidden = !etapas || !!game.tutorial || !!lugar;
    bDes.classList.toggle('travado', !desLib);
    bDes.setAttribute('aria-pressed', String(game.desafioAutoLigado()));
    bDes.setAttribute('aria-disabled', String(!desLib));
    if (!desLib) bDes.dataset.dica = LV.t('Libere este mapa no Santuário'); else delete bDes.dataset.dica;
    const modo = s.op.modoPets, bModo = document.getElementById('b-modo');
    if (bModo.dataset.modo !== modo) {
      bModo.dataset.modo = modo;
      document.getElementById('h-modo').textContent = LV.MODOS[modo].nome;
      bModo.setAttribute('aria-label', LV.t('Comando das Centelhas: ') + LV.MODOS[modo].nome);
      document.querySelectorAll('#modo-menu [data-modo]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.modo === modo)));
    }
    el.bAband.hidden = !W.chefe;
    el.vel.hidden = s.op.vel === 1 && !s.op.deus;
    el.vel.textContent = (s.op.vel !== 1 ? '×' + String(s.op.vel).replace('.', LV.decSep) : '') + (s.op.deus ? (s.op.vel !== 1 ? ' · ' : '') + LV.t('invencível') : '');
    if (W.chefe) {
      el.boss.hidden = false;
      el.bNome.textContent = W.chefe.e.nome + LV.t(' · Nv ') + W.chefe.e.lv;
      el.bHp.style.width = (LV.clamp(W.chefe.e.hp / W.chefe.e.hpMax, 0, 1) * 100).toFixed(1) + '%';
      el.bTempo.textContent = Math.ceil(Math.max(0, W.chefe.tempo)) + 's';
    } else el.boss.hidden = true;
    const chave = W.pets.map((p) => p.uid + ':' + p.est).join(',');
    if (chave !== chaveChips) {
      chaveChips = chave;
      el.pets.innerHTML = W.pets.map((p) => '<div class="chipPet" data-u="' + p.uid + '"><img src="' + art.retrato(p.ref.sp, p.est, 64) + '" alt="" width="34" height="34"><span class="cl">' + p.ref.nivel + '</span><div class="bar hp mini"><i></i></div><div class="bar habil mini"><b></b></div></div>').join('');
    }
    el.lant2.textContent = s.lanternas;
    barraSkills(lugar);
    W.pets.forEach((p) => {
      const c = el.pets.querySelector('[data-u="' + p.uid + '"]');
      if (c && LV.ATQ_SP[p.ref.sp]) {
        const pr = game.prontidaoAtq(p), k = Math.max(0, pr.k);
        const b = c.querySelector('.habil b');
        if (b) { b.style.width = (k * 100).toFixed(1) + '%'; b.parentNode.classList.toggle('pronta', k >= 1); }
        c.dataset.hab = pr.nome;
      }
      if (!c) return;
      c.classList.toggle('ko', p.desm > 0);
      c.querySelector('i').style.width = (LV.clamp(p.hp / p.hpMax, 0, 1) * 100).toFixed(1) + '%';
      c.querySelector('.cl').textContent = p.ref.nivel;
      c.title = LV.nomePet(p.ref) + LV.t(' · Nv ') + p.ref.nivel;
    });
  }
  ui.hud = hud;
  /* skills do domador no HUD (v1.17): um botão por skill liberada, com recarga e tempo ativo */
  let chaveSk = '';
  function barraSkills(lugar) {
    const box = document.getElementById('h-skills'), s = S();
    if (!box) return;
    const lib = LV.SKILLS.filter((k) => (s.dom.skills || {})[k.id]);
    const ver = lib.length && !game.tutorial && lugar !== 'vila';
    if (box.hidden === !!ver) box.hidden = !ver;
    if (!ver) return;
    const chave = lib.map((k) => k.id).join(',') + (LV.movel ? 'm' : '');
    if (chave !== chaveSk) {
      chaveSk = chave;
      box.innerHTML = lib.map((k) => '<button class="skb sk-' + k.id + '" data-sk="' + k.id + '" title="' + k.nome + (LV.movel ? '' : LV.t(' (tecla ') + k.tecla + ')') + '" aria-label="' + k.nome + '">' +
        '<span class="sk-ic">' + ICON_SK[k.id] + '</span><i class="sk-cd"></i><span class="sk-t"></span>' + (LV.movel ? '' : '<kbd>' + k.tecla + '</kbd>') + '</button>').join('');
    }
    lib.forEach((k) => {
      const b = box.querySelector('[data-sk="' + k.id + '"]');
      if (!b) return;
      const x = game.skillInfo(k.id), rec = !x.ativa && x.cd > 0;
      b.classList.toggle('ativa', x.ativa);
      b.classList.toggle('recarga', rec);
      const frac = x.ativa ? x.t / (x.dur || 1) : rec ? x.cd / (x.cdTot || 1) : 0;
      b.style.setProperty('--p', (frac * 100).toFixed(1) + '%');
      const t = x.ativa ? Math.ceil(x.t) + 's' : rec ? Math.ceil(x.cd) + 's' : '';
      const tt = b.querySelector('.sk-t'); if (tt.textContent !== t) tt.textContent = t;
    });
  }
  ui.usarSkill = function (id) {
    const r = game.usarSkill(id), k = LV.skill(id);
    if (r === true) { hud(); return true; }
    if (r === 'recarga') ui.toast(k.nome + LV.t(' recarregando: ') + Math.ceil(game.skillInfo(id).cd) + ' s', 'ruim', true);
    return r;
  };
  /* medidor de dano por segundo do Campo de Treino */
  function painelDps(on) {
    const p = document.getElementById('dps');
    if (p.hidden === !on) { if (!on) return; } else p.hidden = !on;
    if (!on) return;
    const d = game.dpsInfo() || { dps: 0, total: 0, tempo: 0, linhas: [] };
    const v = fmtDps(d.dps) + '/s';
    const bv = document.getElementById('dps-v');
    if (bv.textContent !== v) bv.textContent = v;
    const sub = d.total ? LV.t('Total ') + fmt(Math.round(d.total)) + ' · ' + LV.fmtTempo(d.tempo) + (d.ativo ? '' : LV.t(' · parado')) + (d.maior ? LV.t(' · melhor ') + fmtDps(d.maior) + '/s' : '') : LV.t('Ataque os bonecos para medir');
    const bs = document.getElementById('dps-s');
    if (bs.textContent !== sub) bs.textContent = sub;
    document.getElementById('dps-l').innerHTML = d.linhas.slice(0, 7).map((l) => '<div class="dps-li"><span>' + esc(l.nome) + '</span><i style="width:' + (l.pct * 100).toFixed(0) + '%"></i><b>' + fmtDps(l.dps) + '</b></div>').join('');
  }
  function fmtDps(v) {
    if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e10 ? 0 : 1).replace('.', LV.decSep) + LV.t('bi');
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.', LV.decSep) + 'M';
    if (v >= 1e4) return (v / 1e3).toFixed(v >= 1e5 ? 0 : 1).replace('.', LV.decSep) + 'k';
    return fmt(Math.round(v));
  }

  ui.saveStatus = function () { const t = LV.textoSave ? LV.textoSave() : ''; if (el.save) el.save.textContent = t; };

  /* =================== TOASTS =================== */
  ui.toast = function (txt, tipo, curto) {
    if (!el.toasts) return;
    const d = document.createElement('div');
    d.className = LV.t('toast ') + (tipo || '');
    d.textContent = txt;
    el.toasts.appendChild(d);
    // o aviso de versão nova fica até o jogador tocar: só as mensagens comuns saem quando acumulam
    const comuns = () => [...el.toasts.children].filter((x) => !x.classList.contains('atualizar'));
    while (comuns().length > (LV.movel ? 3 : 4)) comuns()[0].remove();
    setTimeout(() => { d.classList.add('sai'); setTimeout(() => d.remove(), 400); }, curto ? 2200 : 3600);
  };

  /* =================== JANELAS =================== */
  ui.fila = [];
  ui.modalAberto = null;
  ui.modal = function (html, opts) {
    opts = opts || {};
    if (ui.modalAberto) { ui.fila.push([html, opts]); return; }
    ui.modalAberto = opts;
    el.mbox.className = LV.t('mbox ') + (opts.cls || '');
    el.mbox.innerHTML = html;
    el.modal.hidden = false;
    if (opts.aoAbrir) opts.aoAbrir(el.mbox);
    const f = el.mbox.querySelector('[data-m]');
    if (f) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } el.mbox.scrollTop = 0; }, 30);
  };
  ui.fecharModal = function () {
    if (!ui.modalAberto) return;
    const o = ui.modalAberto;
    ui.modalAberto = null;
    el.modal.hidden = true;
    el.mbox.innerHTML = '';
    // depois de limpar: o aoFechar pode abrir outra janela (ex.: o parabéns do tutorial ao fechar o minijogo)
    if (o.aoFechar) o.aoFechar();
    if (ui.modalAberto) return;
    const prox = ui.fila.shift();
    if (prox) ui.modal(prox[0], prox[1]);
  };

  ui.escolhaInicial = function (renascendo) {
    game.pausado = true;
    if (ui.modalAberto) { ui.modalAberto = null; el.modal.hidden = true; }
    ui.fila = [];
    const m = S() && S().meta, nv = m ? 1 + 3 * m.up.primeiro : 1;
    const cards = LV.INICIAIS.map((id) => {
      const sp = LV.SPECIES[id];
      return '<button class="ini" data-m="inicial" data-sp="' + id + '" style="--c:' + sp.pal.g + '"><img src="' + art.retrato(id, 0, 96) + '" alt="" width="96" height="96">' +
        '<b>' + sp.nome[0] + '</b>' + elChip(sp.el) + espChip(id) + '<small>' + esc(sp.desc) + '</small><span class="evo-l">' + sp.nome.join(' → ') + '</span></button>';
    }).join('');
    const txt = renascendo
      ? LV.t('<div class="eyebrow">Renascimento ') + m.renasc + LV.t('</div><h1 class="titulo">Lumevale</h1>') +
        LV.t('<p>Tudo recomeça na primeira descida. Os Ecos e o Santuário continuam com você (') + fmt(m.ecos) + LV.t(' Ecos para gastar). Escolha de novo o seu primeiro companheiro') + (nv > 1 ? LV.t(': ele já começa no nível ') + nv + '.' : '.') + '</p>'
      : LV.t('<div class="eyebrow">Uma descida pelas profundezas</div><h1 class="titulo">Lumevale</h1>') +
        LV.t('<p>Lá embaixo, as Centelhas ainda guardam o que resta do Lume. Escolha seu primeiro companheiro: ele vai lutar por você, crescer e mudar de forma.</p>');
    ui.modal('<div class="intro">' + txt + '<div class="inis">' + cards + LV.t('</div><p class="muted small">Brasa vence Musgo, Musgo vence Maré, Maré vence Brasa.</p></div>'), { cls: 'grande', fechavel: false });
  };
  function escolherInicial(sp) {
    if (!game.acao.escolherInicial(sp)) return;
    ui.modalAberto = null;
    el.modal.hidden = true;
    el.mbox.innerHTML = '';
    game.pausado = false;
    ui.sel = S().ativos[0];
    ui.render(); hud();
    ui.toast(LV.SPECIES[sp].nome[0] + LV.t(' está ao seu lado. Boa caçada!'), 'bom');
    LV.salvar(true);
    const prox = ui.fila.shift();
    if (prox) ui.modal(prox[0], prox[1]);
  }
  ui.confirmarRenascer = function (volta) {
    const s = S(), prev = game.ecosPrevistos();
    if (prev <= 0) { if (volta) volta(); return; }
    ui.modal(LV.t('<div class="eyebrow">Santuário dos Ecos</div><h2>Renascer?</h2>') +
      LV.t('<p>Você volta ao começo de Lumevale e ganha <b class="ecos-txt">') + ICON.eco + ' ' + fmt(prev) + LV.t(' Ecos</b>, ficando com ') + fmt(s.meta.ecos + prev) + LV.t(' para gastar no Santuário.</p>') +
      LV.t('<div class="perde-fica"><div><h3>Você perde</h3><ul>') +
      LV.t('<li>Todas as ') + s.pets.length + LV.t(' Centelhas</li><li>Nível ') + s.dom.nivel + LV.t(' do domador e os atributos</li><li>Lumes, materiais e lanternas</li><li>Moedas dos Guardiões, melhorias e lanternas da Vila</li><li>Itens dos Guardiões (capas e lanternas com bônus)</li><li>Mapas liberados</li></ul></div>') +
      LV.t('<div><h3>Fica com você</h3><ul><li>Ecos e melhorias do Santuário</li><li>Conquistas, capas visuais e lanternas das conquistas</li><li>Nome do domador</li><li>Este espaço de save</li></ul></div></div>') +
      LV.t('<div class="row end"><button class="btn" data-m="fechar">Continuar a jornada</button><button class="btn perigo" data-m="renascer">Renascer</button></div>'), { aoFechar: volta });
  };

  ui.modalOffline = function (r) {
    ui.modal(LV.t('<div class="eyebrow">Enquanto você estava fora</div><h2>') + LV.fmtTempo(r.segReal) + LV.t(' de caçada</h2>') +
      (r.segReal > r.seg ? LV.t('<p class="muted small">Seu acampamento rende até ') + r.cap + LV.t('h. Melhore o Acampamento com o Mestre Bigorna, na Vila, para ganhar mais.</p>') : '') +
      '<dl class="stats">' +
      LV.t('<div><dt>Criaturas derrotadas</dt><dd>') + fmt(r.kills) + '</dd></div>' +
      '<div><dt>' + ICON.lumes + LV.t(' Lumes</dt><dd>+') + fmt(r.lumes) + '</dd></div>' +
      '<div><dt><i class="dot" style="--c:' + LV.MAT[r.mat].cor + '"></i>' + LV.MAT[r.mat].nome + '</dt><dd>+' + fmt(r.mats) + '</dd></div>' +
      LV.t('<div><dt>Experiência</dt><dd>+') + fmt(r.xp) + '</dd></div>' +
      (r.niveis ? LV.t('<div><dt>Níveis do domador</dt><dd>+') + r.niveis + '</dd></div>' : '') +
      LV.t('</dl><div class="row end"><button class="btn pri" data-m="fechar">Continuar</button></div>'));
  };

  /* Guardião derrotado: moeda → pet novo → mecânicas liberadas (todas com o mesmo destaque) → caminho aberto */
  ui.modalChefe = function (d) {
    const H = LV.historia();
    let h = LV.t('<div class="eyebrow">Guardião derrotado</div><h2>') + esc(d.nome) + LV.t(' caiu</h2>');
    if (d.primeira && d.mapaIdx != null) h += '<p class="efeito-lore">' + H.efeito[d.mapaIdx] + '</p>';
    if (d.moeda) h += '<p class="premio-moeda">' + iconeMoeda(d.moeda) + ' <b>+' + d.qMoeda + ' ' + LV.nomeQtd(d.moeda, d.qMoeda) + '</b> <span class="muted small">(' + fmt(S().moedas[d.moeda.id]) + LV.t(' no total) · use na Vila</span></p>');
    if (d.primeira && d.premio) {
      h += '<div class="premio"><img src="' + art.retrato(d.premio.sp, d.premio.est, 96) + LV.t('" alt="" width="96" height="96"><p>Das cinzas do Guardião surgiu <b>') + LV.nomePet(d.premio) + LV.t('</b> (Nv ') + d.premio.nivel + LV.t('). Ele agora faz parte da sua coleção.</p></div>');
    }
    if (d.item) {
      const k = LV.itemDef(d.item);
      h += '<div class="premio premio-item"><img src="img/' + LV.imgItem(d.item) + LV.t('.webp" alt="" height="96"><p>O Guardião deixou cair <b>') + k.nome + '</b>: ' + k.efeito +
        LV.t('. Já está equipado; troque na aba Domador. Vale até você renascer.</p></div>');
    }
    const novas = [];
    if (d.autoNova) novas.push([LV.t('Caçada automática liberada'), LV.t('Ligue no botão ao lado da lanterna.')]);
    if (d.primeira && d.moeda && LV.MOEDAS.indexOf(d.moeda) === 0) novas.push([LV.t('Renascimento liberado'), LV.t('Renasça no Santuário para ganhar Ecos permanentes.')]);
    if (d.paginaNova && d.mapaIdx != null) novas.push([H.novaPagina, '“' + H.paginas[d.mapaIdx].t + '” · <button type="button" class="link" data-m="lerPagina" data-p="' + d.mapaIdx + '">' + H.ler + ' ›</button>']);
    if (novas.length) {
      h += '<ul class="desbloqueios">' + novas.map((n) => '<li><svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 9.8 6.2 14.5 8 9.8 9.8 8 14.5 6.2 9.8 1.5 8 6.2 6.2Z" fill="currentColor"/></svg><div><b>' + n[0] + '</b><span>' + n[1] + '</span></div></li>').join('') + '</ul>';
    }
    if (d.primeira && d.premio) {
      if (d.proximo) h += LV.t('<p>Um caminho mais fundo se abriu: <b>') + d.proximo + '</b>.</p>';
      else h += LV.t('<p>Você chegou ao fundo de Lumevale. Os Guardiões podem ser enfrentados de novo para mais recompensas.</p>');
    } else h += LV.t('<p>O Guardião voltará a despertar depois de mais caçadas. Ele sempre deixa materiais raros.</p>');
    h += LV.t('<div class="row end"><button class="btn" data-m="fechar">Continuar aqui</button>') +
      (d.proximoIdx != null ? '<button class="btn pri" data-m="proxmapa" data-i="' + d.proximoIdx + LV.t('">Ir ao próximo mapa</button>') : '') + '</div>';
    ui.modal(h, { fechavel: false });
    if (d.final) ui.modalFinal();      // entra na fila: aparece quando esta janela fechar
  };

  /* clarão da evolução: luz que nasce no pet e toma a tela inteira, com um anel se expandindo e a janela tremendo */
  function clarao(origem, cor) {
    const r = origem.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height * 0.6;
    const luz = document.createElement('div');
    luz.className = 'evo-luz';
    luz.style.setProperty('--x', x + 'px'); luz.style.setProperty('--y', y + 'px'); luz.style.setProperty('--c', cor);
    const anel = document.createElement('div');
    anel.className = 'evo-anel';
    anel.style.left = x + 'px'; anel.style.top = y + 'px'; anel.style.setProperty('--c', cor);
    document.body.appendChild(luz); document.body.appendChild(anel);
    const box = document.getElementById('mbox');
    box.classList.remove('treme'); void box.offsetWidth; box.classList.add('treme');
    setTimeout(() => { luz.remove(); anel.remove(); box.classList.remove('treme'); }, 1600);
  }
  ui.modalEvolucao = function (d) {
    const p = d.pet, sp = LV.SPECIES[p.sp];
    let raf = 0, seguro = 0, terminou = false;
    ui.modal(LV.t('<div class="evowrap"><div class="eyebrow">Evolução</div><h2 id="evot">') + esc(d.de) + LV.t(' está mudando…</h2><canvas id="evocv" width="520" height="400" aria-label="Animação de evolução"></canvas>') +
      LV.t('<p id="evop" class="muted"> </p><div class="row end"><button class="btn pri" data-m="fechar" id="evob" disabled>Continuar</button></div></div>'), {
      cls: 'evo-m', pausa: true,
      aoAbrir(box) {
        const cv = box.querySelector('#evocv'), g = cv.getContext('2d');
        const t0 = performance.now();
        /* o fim da animação é estado desta janela, nunca da caixa do modal (ela é reaproveitada) */
        const concluir = () => {
          if (terminou) return;
          terminou = true;
          const tt = box.querySelector('#evot'), tp = box.querySelector('#evop'), b = box.querySelector('#evob');
          if (tt) tt.textContent = d.de + LV.t(' evoluiu para ') + sp.nome[p.est] + '!';
          try {
            const st = game.petStats(p);
            if (tp) tp.textContent = LV.t('Vida ') + fmt(st.hp) + LV.t(' · Ataque ') + fmt(st.atk) + ' · ' + Number(st.spd || 0).toLocaleString(LV.locale) + LV.t(' ataques/s');
          } catch (err) { /* sem números, mas o botão precisa liberar */ }
          if (b) { b.disabled = false; b.focus(); }
        };
        seguro = setTimeout(concluir, 3600);   // se a animação parar (aba em segundo plano etc.), libera mesmo assim
        const desenhar = (now) => {
          raf = requestAnimationFrame(desenhar);
          const t = (now - t0) / 1000;
          g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 520, 400);
          g.setTransform(2, 0, 0, 2, 0, 0);
          art.glow(g, 130, 110, 110, sp.pal.g, 0.25 + Math.min(0.5, t * 0.15));
          const fim = t > 3.1;
          let est = p.est, flash = 0;
          if (!fim) {
            const f = Math.sin(t * t * 3.2);
            est = f > 0 ? d.estAntes : p.est;
            flash = 1;
            if (t > 2.7) { flash = 1; est = p.est; }
          } else flash = Math.max(0, 1 - (t - 3.1) * 2);
          const hh = 118 + est * 14;
          const desenhou = LV.spr && LV.spr.desenhar(g, LV.imgPet(p.sp, est), { x: 130, y: sp.voa ? 100 : 182, h: hh, face: 1, t, voa: sp.voa, flash, flip: !!(sp.flipEst && sp.flipEst[est]) });
          if (!desenhou) {
            const esc2 = 2.9 / LV.F.escala[est] * (1 + est * 0.1);
            art.drawCreature(g, { x: 130 + (sp.voa ? 6 : 0), y: sp.voa ? 105 : 165, corpo: sp.corpo, pal: sp.pal, est, s: esc2, t: t, face: 1, flash });
          }
          // raios de luz saindo do pet (sem bordas: tudo some antes da borda do quadro)
          if (t > 2.3 && t < 3.9) {
            const k = t < 3.1 ? (t - 2.3) / 0.8 : Math.max(0, 1 - (t - 3.1) / 0.8);
            const cy = sp.voa ? 100 : 130;
            g.save(); g.translate(130, cy); g.rotate(t * 0.6); g.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 12; i++) {
              g.rotate(Math.PI / 6);
              const gr = g.createLinearGradient(0, 0, 0, -95);
              gr.addColorStop(0, 'rgba(255,255,255,' + 0.55 * k + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
              g.fillStyle = gr; g.beginPath(); g.moveTo(-3, 0); g.lineTo(-10 - 6 * k, -95); g.lineTo(10 + 6 * k, -95); g.lineTo(3, 0); g.fill();
            }
            g.restore();
            art.glow(g, 130, cy, 90, '#ffffff', 0.7 * k);
          }
          if (t > 2.75 && !box._clarao) { box._clarao = true; clarao(cv, sp.pal.g); }
          if (fim) concluir();
        };
        box._clarao = false;
        raf = requestAnimationFrame(desenhar);
      },
      aoFechar() { cancelAnimationFrame(raf); clearTimeout(seguro); document.querySelectorAll('.evo-luz, .evo-anel').forEach((x) => x.remove()); },
      fechavel: false,
    });
  };

  /* =================== TELA DE DESCANSO (AFK) ===================
     Depois de um tempo sem mexer (ou ao voltar de fora), esconde o jogo e mostra o que foi conquistado.
     O jogo continua rodando por baixo (sem desenhar, para poupar energia). Ao retomar, tudo o que foi
     coletado aparece em volta do domador e é puxado até ele. */
  const afk = (ui.afk = { ativo: false, base: null, t0: 0, origem: '', timer: 0, info: null });
  ui.lumesPendentes = 0;
  afk.foto = function () {
    const s = S();
    return { lumes: s.lumes, kills: s.st.kills, nivel: s.dom.nivel, mats: Object.assign({}, s.mats), moedas: Object.assign({}, s.moedas),
      pets: s.pets.map((p) => ({ uid: p.uid, nivel: p.nivel })), mapa: s.mapa, chefeKills: s.mapas[s.mapa].kills, capt: s.st.capturas };
  };
  function difAfk() {
    const s = S(), b = afk.base, d = { mats: {}, moedas: {}, pets: [] };
    d.seg = Math.max(0, (Date.now() - afk.t0) / 1000);
    d.kills = Math.max(0, s.st.kills - b.kills);
    d.lumes = Math.max(0, Math.floor(s.lumes - b.lumes));
    d.niveis = Math.max(0, s.dom.nivel - b.nivel);
    for (const k in s.mats) if (s.mats[k] > b.mats[k]) d.mats[k] = s.mats[k] - b.mats[k];
    for (const k in s.moedas) if (s.moedas[k] > (b.moedas[k] || 0)) d.moedas[k] = s.moedas[k] - (b.moedas[k] || 0);
    b.pets.forEach((x) => { const p = s.pets.find((q) => q.uid === x.uid); if (p && p.nivel > x.nivel) d.pets.push({ p, de: x.nivel }); });
    return d;
  }
  function renderAfk() {
    if (!afk.ativo || !S()) return;
    const d = difAfk(), s = S(), meta = game.metaChefe();
    $('#afk-titulo').textContent = LV.fmtTempo(d.seg);
    $('#afk-olho').textContent = afk.origem === 'offline' ? LV.t('Enquanto você estava fora') : LV.t('Descansando na trilha');
    let sub = afk.origem === 'offline' ? LV.t('Suas Centelhas seguiram caçando sozinhas. Veja o que trouxeram.') : LV.t('Você ficou um tempo sem mexer no jogo. Suas Centelhas seguem caçando.');
    if (afk.info && afk.info.segReal > afk.info.seg) sub += LV.t(' O acampamento rende até ') + afk.info.cap + LV.t('h fora do jogo (melhore com o Mestre Bigorna, na Vila).');
    if (!(s.op.auto && game.autoLiberada())) sub += LV.t(' Com a caçada automática ligada você rende bem mais.');
    $('#afk-sub').textContent = sub;
    const item = (rot, v, extra) => '<div><dt>' + rot + '</dt><dd class="' + (v ? '' : 'zero') + '">' + v + (extra ? ' <small>' + extra + '</small>' : '') + '</dd></div>';
    let h = item(LV.t('Inimigos derrotados'), fmt(d.kills)) + item(ICON.lumes + LV.t(' Lumes'), d.kills || d.lumes ? '+' + fmt(d.lumes) : '0') +
      item(LV.t('Nível do domador'), s.dom.nivel, d.niveis ? '+' + d.niveis : '');
    for (const k in d.mats) h += item('<i class="dot" style="--c:' + LV.MAT[k].cor + '"></i>' + LV.MAT[k].nome, '+' + fmt(d.mats[k]));
    for (const k in d.moedas) h += item(iconeMoeda(LV.moeda(k)) + LV.moeda(k).nome, '+' + fmt(d.moedas[k]));
    h += item(LV.t('Guardião'), Math.min(s.mapas[s.mapa].kills, meta) + '/' + meta);
    $('#afk-grade').innerHTML = h;
    $('#afk-pets').innerHTML = d.pets.map((x) => '<span class="ap"><img src="' + art.retrato(x.p.sp, x.p.est, 64) + '" alt="">' + esc(LV.nomePet(x.p)) + LV.t(' Nv ') + x.de + ' → <b class="sobe">' + x.p.nivel + '</b></span>').join('');
  }
  afk.entrar = function (origem, base, segFora, info) {
    if (afk.ativo || !S() || !game.W || !S().inicial) return false;
    if (game.captura && game.captura.fase === 'mira') game.cancelarMira();
    ui.diario(false);
    afk.ativo = true; afk.origem = origem; afk.base = base || afk.foto(); afk.info = info || null;
    afk.t0 = Date.now() - (segFora || 0) * 1000;
    $('#afk').hidden = false;
    renderAfk();
    afk.timer = setInterval(renderAfk, 1000);
    setTimeout(() => { const b = $('#b-retomar'); if (b) b.focus(); }, 60);
    return true;
  };
  afk.retomar = function () {
    if (!afk.ativo) return;
    const d = difAfk();
    clearInterval(afk.timer);
    afk.ativo = false;
    $('#afk').hidden = true;
    if (ui.marcarAtividade) ui.marcarAtividade();
    if (game.W) ui.lumesPendentes = game.chuvaColeta({ lumes: d.lumes, mats: d.mats, moedas: d.moedas, niveis: d.niveis });
    if (d.niveis) ui.toast(LV.t('Nível ') + S().dom.nivel + LV.t(' durante o descanso! +') + d.niveis * 3 + LV.t(' pontos de atributo'), 'bom');
    som('brilho');
    hud(); ui.render(); LV.salvarLogo();
  };

  /* =================== BESTIÁRIO ===================
     Cada forma das criaturas selvagens tem a sua entrada (espécie_estágio); hostis e Guardiões, uma cada.
     Contagens: por forma e somadas por espécie (as conquistas e os bônus valem para a espécie inteira). */
  ui.bestSel = null;
  const urlBesta = (b) => (b.tipo === 'selvagem' ? art.retrato(b.sp, b.est, 96) : LV.spr.url(b.img));
  const vista = (id) => !!(S().meta.best[id] && S().meta.best[id].v);
  function buffsDe(id) {
    const s = S();
    return LV.CONQUISTAS.filter((c) => c.alvo === id).map((c) => ({ c, estado: s.meta.conq[c.id] || 0, prog: Math.min(c.prog(s), c.meta) }));
  }
  const alvoBuff = (b) => (b.tipo === 'selvagem' ? b.sp : b.id);
  function detalheBesta(id) {
    const s = S(), b = LV.besta(id), x = s.meta.best[id] || {};
    if (!b) return '';
    const sp = b.tipo === 'selvagem' ? LV.SPECIES[b.sp] : null;
    if (!x.v) {
      const m = b.mapas[0];
      const dica = sp && b.est > 0 && (vista(b.sp + '_' + (b.est - 1)))
        ? LV.t('Evolua um ') + sp.nome[b.est - 1] + (m != null ? LV.t(' ou procure nos ninhos de nível alto de ') + (s.mapas[m].liberado ? LV.MAPS[m].nome : LV.t('mapas mais fundos')) : '') + '.'
        : m != null && s.mapas[m].liberado ? LV.t('Procure em ') + LV.MAPS[m].nome + '.' : LV.t('Desça mais fundo em Lumevale para encontrá-la.');
      return '<aside class="best-det"><div class="topo oculta"><img src="' + urlBesta(b) + '" alt=""><div><h3>???</h3>' +
        (sp ? LV.t('<div class="formas">Forma ') + (b.est + 1) + LV.t(' de 3</div>') : '') + LV.t('<p class="muted small">Ainda não encontrada. ') + dica + '</p></div></div></aside>';
    }
    const tipo = sp ? LV.t('<span class="tagb">Selvagem</span>') + (sp.passivo ? LV.t('<span class="tagb manso">Mansa</span>') : LV.t('<span class="tagb agr">Agressiva</span>'))
      : b.tipo === 'hostil' ? LV.t('<span class="tagb">Breu</span><span class="tagb agr">Sempre agressivo</span>') : LV.t('<span class="tagb chefe">Guardião</span>');
    const tot = sp ? s.meta.best[b.sp] || {} : null;
    const cadeia = sp ? LV.t('<div class="formas">Forma ') + (b.est + 1) + LV.t(' de 3: ') + sp.nome.map((n, i) => (i === b.est ? '<b>' + esc(n) + '</b>' : vista(b.sp + '_' + i) ? esc(n) : '???')).join(' → ') + '</div>' : '';
    const onde = b.mapas.length ? b.mapas.map((i) => (s.mapas[i].liberado ? LV.MAPS[i].nome : '???')).join(', ') + (sp && b.est ? LV.t(' (ninhos de nível ') + (b.est === 1 ? '18+' : '40+') + ')' : '') : LV.t('Só por evolução');
    let h = '<aside class="best-det"><div class="topo"><img src="' + urlBesta(b) + '" alt=""><div><h3>' + esc(b.nome) + '</h3>' + cadeia +
      '<div class="tags">' + tipo + (b.el ? elChip(b.el) : '') + '</div></div></div>' +
      '<p class="desc">' + esc(b.desc) + '</p><dl class="stats">' +
      LV.t('<div><dt>Derrotados') + (sp ? LV.t(' (esta forma)') : '') + '</dt><dd>' + fmt(x.k || 0) + '</dd></div>' +
      (sp ? LV.t('<div><dt>Capturados (esta forma)</dt><dd>') + fmt(x.c || 0) + '</dd></div>' +
        '<div><dt>' + esc(sp.nome[0]) + LV.t(': total derrotados</dt><dd>') + fmt(tot.k || 0) + '</dd></div><div><dt>' + esc(sp.nome[0]) + LV.t(': total capturados</dt><dd>') + fmt(tot.c || 0) + '</dd></div>' +
        (b.mapas.length ? (() => {   // chance com a vida cheia no ninho mais raso onde ela aparece
          const lv = Math.max(LV.MAPS[b.mapas[0]].lv[0], [1, 18, 40][b.est]);
          return LV.t('<div><dt>Captura base</dt><dd>') + Math.round(LV.chanceBaseCaptura(sp, lv, b.est) * 100) + '% <small class="muted">' + LV.t('(vida cheia, Nv ') + lv + ')</small></dd></div>';
        })() : '') : '') +
      LV.t('<div><dt>Aparece em</dt><dd>') + onde + '</dd></div>' +
      (b.tipo === 'chefe' ? LV.t('<div><dt>Solta</dt><dd>') + iconeMoeda(LV.MOEDAS[b.mapas[0]]) + LV.MOEDAS[b.mapas[0]].nome + '</dd></div>' : '') +
      '</dl>';
    const bf = buffsDe(alvoBuff(b));
    if (bf.length) {
      h += LV.t('<div><div class="eyebrow">Conquistas e bônus') + (sp ? LV.t(' (valem para todas as formas)') : '') + '</div><ul class="buffs">' + bf.map((z) => {
        const t = LV.textoRecompensa(z.c.rec);
        if (z.estado === 2) return '<li class="ativo">' + t + '</li>';
        if (z.estado === 1) return '<li class="falta">' + t + LV.t(' — <b class="acc">pronto para resgatar em Conquistas</b></li>');
        return '<li class="falta">' + t + ' — ' + z.c.desc.toLowerCase() + ' (' + fmt(z.prog) + '/' + fmt(z.c.meta) + ')</li>';
      }).join('') + '</ul></div>';
    }
    return h + '</aside>';
  }
  function cartaoBesta(b) {
    const v = vista(b.id), x = S().meta.best[b.id] || {}, buff = buffsDe(alvoBuff(b)).some((z) => z.estado === 2 && z.c.rec.buff);
    return '<button class="bcard' + (v ? '' : LV.t(' oculta')) + (ui.bestSel === b.id ? LV.t(' sel') : '') + '" data-m="bsel" data-id="' + b.id + '" aria-label="' + (v ? esc(b.nome) : LV.t('Criatura desconhecida')) + '">' +
      '<img src="' + urlBesta(b) + '" alt=""><span>' + (v ? esc(b.nome) : '???') + '</span><small>' + (v ? fmt(x.k || 0) + LV.t(' derrotados') : '—') + '</small>' + (buff ? LV.t('<i class="bf" title="Bônus ativo">✦</i>') : '') + '</button>';
  }
  function htmlBestiario() {
    const total = LV.BESTIARIO.length, vistos = LV.BESTIARIO.filter((b) => vista(b.id)).length;
    if (!ui.bestSel || !LV.besta(ui.bestSel)) ui.bestSel = (LV.BESTIARIO.find((b) => vista(b.id)) || LV.BESTIARIO[0]).id;
    let h = LV.t('<div class="cabec"><div><div class="eyebrow">Bestiário</div><h2>Criaturas de Lumevale</h2><p class="muted small">') + vistos + LV.t(' de ') + total + LV.t(' encontradas · ✦ = bônus ativo</p></div><button class="btn" data-m="fechar">Fechar</button></div>');
    h += LV.t('<div class="best"><div class="best-grupos"><section><h3>Selvagens (capturáveis) e suas evoluções</h3><div class="best-especies">');
    for (const id in LV.SPECIES) {
      h += '<div class="best-linha">' + [0, 1, 2].map((e) => cartaoBesta(LV.besta(id + '_' + e))).join('<i class="seta-evo" aria-hidden="true">›</i>') + '</div>';
    }
    h += '</div></section>';
    [['hostil', LV.t('Breus')], ['chefe', LV.t('Guardiões')]].forEach(([t, nome]) => {
      h += '<section><h3>' + nome + '</h3><div class="best-grade">' + LV.BESTIARIO.filter((b) => b.tipo === t).map(cartaoBesta).join('') + '</div></section>';
    });
    return h + '</div>' + detalheBesta(ui.bestSel) + '</div>';
  }
  ui.abrirBestiario = function (id) {
    if (!S()) return;
    if (id) ui.bestSel = id;
    ui.diario(false);
    ui.modal(htmlBestiario(), { cls: 'best-m', tipo: 'best' });
  };

  /* =================== CONQUISTAS =================== */
  function htmlConquistas() {
    const s = S(), Q = s.meta.conq, tot = LV.CONQUISTAS.length;
    const prontas = LV.CONQUISTAS.filter((c) => Q[c.id] === 1).length, feitas = LV.CONQUISTAS.filter((c) => Q[c.id] === 2).length;
    let h = LV.t('<div class="cabec"><div><div class="eyebrow">Conquistas</div><h2>Feitos do domador</h2><p class="muted small">') + (feitas + prontas) + LV.t(' de ') + tot + LV.t(' concluídas · valem para sempre, mesmo depois de renascer</p></div>') +
      '<div class="row">' + (prontas ? LV.t('<button class="btn ouro" data-m="resgatarTodas">Resgatar todas (') + prontas + ')</button>' : '') + LV.t('<button class="btn" data-m="fechar">Fechar</button></div></div><div class="conq-lista">');
    // concluídas sobem para o topo; depois de resgatadas voltam ao lugar de sempre na sua categoria
    const item = (c) => {
        const e = Q[c.id] || 0, p = Math.min(c.prog(s), c.meta), oculto = c.alvo && !vista(c.alvo) && !e;
        const nome = oculto ? '???' : c.nome, desc = oculto ? LV.t('Encontre esta criatura para revelar') : c.desc;
        return '<div class="cq' + (e === 1 ? LV.t(' pronta') : e === 2 ? LV.t(' feita') : '') + '"><span class="ico"><i>' + (e === 2 ? '✓' : e === 1 ? '★' : '◇') + '</i></span>' +
          '<div><b>' + esc(nome) + '</b> <span class="d">' + esc(desc) + LV.t('</span><div class="rec">Recompensa: ') + (oculto ? '???' : LV.textoRecompensa(c.rec)) + '</div>' +
          (e ? '' : '<div class="pg">' + barra(LV.t('xp thin'), p / c.meta) + '<span>' + fmt(p) + ' / ' + fmt(c.meta) + '</span></div>') + '</div>' +
          '<div class="lado">' + (e === 1 ? '<button class="btn ouro" data-m="resgatar" data-id="' + c.id + LV.t('">Resgatar</button>') : e === 2 ? LV.t('<span class="ok-txt">Resgatada</span>') : '') + '</div></div>';
    };
    const prontasL = LV.CONQUISTAS.filter((c) => Q[c.id] === 1);
    if (prontasL.length) h += LV.t('<section class="conq-cat prontas"><h3>Concluídas: resgate a recompensa</h3>') + prontasL.map(item).join('') + '</section>';
    LV.CAT_CONQ.forEach((cat) => {
      const lista = LV.CONQUISTAS.filter((c) => c.cat === cat && Q[c.id] !== 1);
      if (lista.length) h += '<section class="conq-cat"><h3>' + cat + '</h3>' + lista.map(item).join('') + '</section>';
    });
    return h + '</div>';
  }
  ui.abrirConquistas = function () {
    if (!S()) return;
    ui.diario(false);
    ui.modal(htmlConquistas(), { cls: 'conq-m', tipo: 'conq' });
  };
  function reabrirEspecial() {
    const o = ui.modalAberto;
    if (!o || (o.tipo !== 'best' && o.tipo !== 'conq')) return;
    const y = el.mbox.scrollTop;
    el.mbox.innerHTML = o.tipo === 'best' ? htmlBestiario() : htmlConquistas();
    el.mbox.scrollTop = y;
  }
  function resgatar(id) {
    const c = LV.conquista(id), r = game.acao.resgatarConquista(id);
    if (r === 'nao') return false;
    if (r && r.uid) ui.toast(LV.nomePet(r) + LV.t(' entrou para a sua coleção!'), 'bom');
    if (c.rec.capa) ui.toast(LV.t('Nova capa: ') + LV.capa(c.rec.capa).nome + LV.t('. Equipe na aba Domador.'), 'bom');
    if (c.rec.lanterna && LV.lanternaEq) ui.toast(LV.t('Nova lanterna: ') + LV.lanternaEq(c.rec.lanterna).nome + LV.t('. Equipe na aba Domador.'), 'bom');
    if (c.rec.titulo) { ui.toast(LV.t('Novo título: ') + LV.titulo(c.rec.titulo).nome + LV.t('. Equipe no Perfil (aba Domador, clique no retrato).'), 'bom'); perfilAtualizar(); }
    return c;
  }

  /* =================== MINIJOGO DE CAPTURA =================== */
  ui.minijogo = function (d) {
    const e = d.alvo, sp = LV.SPECIES[e.sp];
    const larg = LV.clamp(14 + d.chance * 50, 14, 50);
    let talento = null;
    const ini = LV.rand(6, 94 - larg);
    const perf = Math.max(3, larg * 0.26), pIni = ini + (larg - perf) / 2;
    const vel = 70 + e.lv * 0.8 + e.est * 18 + (1 - sp.cap) * 40;   // % da pista por segundo
    let pos = Math.random() * 100, dir = 1, raf = 0, resultado = null, ultimo = performance.now(), tecla = null, limite = 0;
    const PRAZO = 5;                                                   // segundos para fechar a lanterna
    const html = LV.t('<div class="mini"><div class="eyebrow">Captura</div><h2>A lanterna envolveu ') + esc(e.nome) + '</h2>' +
      '<div class="mini-alvo"><img src="' + art.retrato(e.sp, e.est, 96) + '" alt="" width="80" height="80"><div><b>' + esc(e.nome) + LV.t('</b> <span class="muted">Nv ') + e.lv + '</span> ' + elChip(sp.el) +
      LV.t('<p class="small muted">Chance desta lanterna: ') + Math.round(d.chance * 100) + LV.t('%. Criaturas com menos vida deixam a faixa maior.</p></div></div>') +
      LV.t('<div class="pista" id="pista" role="button" aria-label="Fechar a lanterna">') +
      '<div class="faixa-ok" style="left:' + ini.toFixed(1) + '%;width:' + larg.toFixed(1) + '%"></div>' +
      '<div class="faixa-perf" style="left:' + pIni.toFixed(1) + '%;width:' + perf.toFixed(1) + '%"></div>' +
      '<div class="ponteiro" id="ponteiro"></div></div>' +
      '<div class="mini-tempo" aria-hidden="true"><i id="mini-barra"></i></div><p class="small mini-relogio" id="mini-relogio" aria-live="off">5,0 s</p>' +
      '<p class="small" id="mini-dica">' + (LV.movel ? LV.t('Toque na barra ou no botão') : LV.t('Clique ou aperte Espaço')) + LV.t(' quando o ponteiro estiver na faixa clara. Você tem 5 segundos. No centro dourado, a Centelha pode ganhar um talento.</p>') +
      '<div class="row end"><button class="btn pri" id="mini-btn">' + LV.t('Fechar a lanterna!') + (LV.movel ? '' : ' <kbd>' + LV.t('Espaço') + '</kbd>') + '</button></div></div>';
    ui.modal(html, {
      cls: 'mini-m', fechavel: false,
      aoAbrir(box) {
        const pont = box.querySelector('#ponteiro'), pista = box.querySelector('#pista'), dica = box.querySelector('#mini-dica'), btn = box.querySelector('#mini-btn');
        const barra = box.querySelector('#mini-barra'), relogio = box.querySelector('#mini-relogio');
        let t0 = performance.now();
        let tRes = 0;
        // explicação congelada antes do relógio: no tutorial e na primeira captura de quem pulou o tutorial
        const avisados = S().avisados || (S().avisados = []);
        let comecou = !(game.tutorial || !avisados.includes('minijogo'));
        if (!comecou) {
          const intro = document.createElement('div');
          intro.className = 'mini-intro';
          intro.innerHTML = '<div class="mini-intro-caixa"><div class="eyebrow">' + LV.t('Como capturar') + '</div><p>' +
            LV.t('Você tem <b>5 segundos</b> para fechar a lanterna. ') + (LV.movel ? LV.t('Toque') : LV.t('Clique (ou aperte Espaço)')) +
            LV.t(' quando o ponteiro estiver na <b>faixa clara</b> para capturar. Acertando o <b>centro dourado</b>, a Centelha ainda pode ganhar um talento bônus.') +
            '</p><button class="btn pri" type="button">' + LV.t('Começar!') + '</button></div>';
          box.querySelector('.mini').appendChild(intro);
          intro.querySelector('button').addEventListener('click', (ev) => { ev.stopPropagation(); comecar(); });
          setTimeout(() => { try { intro.querySelector('button').focus({ preventScroll: true }); } catch (err) { /* ok */ } }, 40);
        }
        function comecar() {
          if (comecou) return;
          comecou = true;
          if (!avisados.includes('minijogo')) avisados.push('minijogo');
          const intro = box.querySelector('.mini-intro');
          if (intro) intro.remove();
          t0 = performance.now(); ultimo = t0;
          limite = setTimeout(esgotar, PRAZO * 1000 + 50);
          btn.focus();
        }
        // o tempo acabou: a criatura rompe a lanterna antes de ela fechar
        const esgotar = () => {
          if (resultado) return;
          tRes = performance.now();
          resultado = 'falha';
          pista.classList.add('errou');
          barra.style.width = '0%'; relogio.textContent = '0,0 s';
          dica.innerHTML = LV.t('<b style="color:var(--ruim)">O tempo acabou!</b> ') + esc(e.nome) + LV.t(' rompeu a lanterna e voltou para a luta.');
          som('escapou');
          btn.textContent = LV.t('Continuar');
          btn.focus();
        };
        if (comecou) limite = setTimeout(esgotar, PRAZO * 1000 + 50);       // garante o fim mesmo se a animação parar
        const passo = (now) => {
          const dt = Math.min(0.05, (now - ultimo) / 1000); ultimo = now;
          if (!resultado && comecou) {
            pos += dir * vel * dt;
            if (pos >= 100) { pos = 100; dir = -1; } else if (pos <= 0) { pos = 0; dir = 1; }
            pont.style.left = pos.toFixed(2) + '%';
            const resta = Math.max(0, PRAZO - (now - t0) / 1000);
            barra.style.width = (resta / PRAZO * 100).toFixed(1) + '%';
            barra.classList.toggle('urgente', resta < 1.5);
            relogio.textContent = resta.toFixed(1).replace('.', LV.decSep) + ' s';
            if (resta <= 0) esgotar();
          }
          raf = requestAnimationFrame(passo);
        };
        raf = requestAnimationFrame(passo);
        const apertar = () => {
          if (!comecou) { comecar(); return; }
          if (resultado) { if (performance.now() - tRes > 350) ui.fecharModal(); return; }
          tRes = performance.now();
          clearTimeout(limite);
          resultado = pos >= pIni && pos <= pIni + perf ? 'perfeito' : pos >= ini && pos <= ini + larg ? 'ok' : 'falha';
          pista.classList.add(resultado === 'falha' ? 'errou' : 'acertou');
          if (resultado === 'perfeito') {
            talento = game.sortearTalento();
            dica.innerHTML = LV.t('<b class="okk">Perfeito!</b> ') + esc(e.nome) + LV.t(' foi capturado') + (talento
              ? LV.t(' com o talento <b class="talento">') + LV.TALENTOS[talento.t].nome + '</b> (' + LV.TALENTOS[talento.t].desc(talento.v) + ').'
              : LV.t('. Desta vez sem talento.'));
          }
          else if (resultado === 'ok') dica.innerHTML = LV.t('<b class="okk">Capturado!</b> ') + esc(e.nome) + LV.t(' agora faz parte da sua coleção.');
          else dica.innerHTML = LV.t('<b style="color:var(--ruim)">Escapou!</b> A lanterna se quebrou e ') + esc(e.nome) + LV.t(' voltou para a luta.');
          som(resultado === 'falha' ? 'escapou' : 'captura');
          btn.textContent = LV.t('Continuar');
          btn.focus();
        };
        btn.addEventListener('click', apertar);
        pista.addEventListener('pointerdown', apertar);
        tecla = (ev) => {
          if (ev.key !== ' ' && ev.key !== 'Enter') return;
          ev.preventDefault(); ev.stopPropagation();
          if (ev.type === 'keydown' && !ev.repeat) apertar();
        };
        document.addEventListener('keydown', tecla, true);
        document.addEventListener('keyup', tecla, true);
        if (comecou) btn.focus();
      },
      aoFechar() {
        cancelAnimationFrame(raf); clearTimeout(limite);
        document.removeEventListener('keydown', tecla, true);
        document.removeEventListener('keyup', tecla, true);
        game.resolverCaptura(resultado || 'falha', talento);
        sujo(['equipe', 'bolsa']); hud();
      },
    });
  };

  /* =================== CONSOLE DO CRIADOR (janela) =================== */
  function atualizarLog() {
    const lg = $('#clog');
    if (lg) { lg.innerHTML = ui.log.length ? ui.log.map(linhaLog).join('') : lg.innerHTML; lg.scrollTop = lg.scrollHeight; }
  }
  ui.abrirConsole = function () {
    ui.modal(LV.t('<div class="cabec"><div><div class="eyebrow">Menu do criador</div><h2>Console</h2></div><button class="btn" data-m="fechar">Fechar</button></div>') + abaConsole(), {
      cls: 'console-m',
      aoAbrir(box) { atualizarLog(); const i = box.querySelector('#cin'); if (i) setTimeout(() => i.focus(), 40); atualizar(); },
    });
  };

  /* =================== CONFIGURAÇÕES =================== */
  function chave(id, nome, desc) {
    const on = LV.config[id] !== false;
    return '<button class="opt" role="switch" aria-checked="' + on + '" data-cfg="' + id + '"><span class="sw"></span><span><b>' + nome + '</b>' + (desc ? '<small>' + desc + '</small>' : '') + '</span></button>';
  }
  function deslizante(id, nome) {
    const v = Math.round((LV.config[id] || 0) * 100);
    return '<label class="faixa" for="cfg-' + id + '"><span>' + nome + '</span><input id="cfg-' + id + '" type="range" min="0" max="100" step="5" value="' + v + '" data-cfgr="' + id + '"><output id="cfg-' + id + '-v">' + v + '%</output></label>';
  }
  function configHTML(emJogo) {
    const q = LV.config.qualidade;
    let h = '<section class="sec"><header class="sec-h"><h2>' + LV.t('Idioma') + (LV.idioma === 'pt' ? ' · Language' : ' · Idioma') + '</h2></header>' +
      '<label class="faixa" for="cfg-idioma"><span>' + LV.t('Idioma') + '</span><select id="cfg-idioma" data-cfgs="idioma">' +
      Object.keys(LV.IDIOMAS).map((id) => '<option value="' + id + '"' + (id === LV.idioma ? ' selected' : '') + '>' + LV.IDIOMAS[id] + '</option>').join('') +
      '</select><output></output></label>' +
      (emJogo ? '<p class="nota">' + LV.t('Ao trocar, o jogo é salvo e recarregado no idioma escolhido.') + '</p>' : '') + '</section>';
    if (emJogo) {
      h += LV.t('<section class="sec"><header class="sec-h"><h2>Jogo</h2>') + (game.slot ? LV.t('<span class="muted small">Espaço ') + game.slot + '</span>' : '') + '</header><div class="row">' +
        LV.t('<button class="btn" data-c="menu">Voltar ao menu principal</button>') +
        LV.t('<button class="btn" data-c="reiniciar">Reiniciar mapa</button>') +
        LV.t('<button class="btn" data-c="salvar">Salvar agora</button></div>') +
        LV.t('<p class="nota">Reiniciar mapa volta ao começo do mapa e renova os inimigos. Seu progresso continua salvo.</p></section>');
    }
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Imagem</h2></header>') +
      LV.t('<label class="faixa" for="cfg-qualidade"><span>Resolução</span><select id="cfg-qualidade" data-cfgs="qualidade">') +
      '<option value="alta"' + (q === 'alta' ? LV.t(' selected') : '') + LV.t('>Alta (nítida)</option>') +
      '<option value="media"' + (q === 'media' ? LV.t(' selected') : '') + LV.t('>Média</option>') +
      '<option value="baixa"' + (q === 'baixa' ? LV.t(' selected') : '') + LV.t('>Baixa (mais leve)</option></select><output></output></label>') +
      LV.t('<div class="row"><button class="btn" data-c="telacheia">Alternar tela cheia</button></div>') +
      '<div class="opts">' + chave('tremor', LV.t('Tremor de tela'), LV.t('Nos golpes dos Guardiões')) + chave('numeros', LV.t('Números de dano')) + chave('particulas', LV.t('Partículas de ambiente'), LV.t('Vagalumes, chuva, esporos e brasas')) + '</div></section>';
    const fa = String(LV.config.afk != null ? LV.config.afk : 2);
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Descanso</h2></header>') +
      LV.t('<label class="faixa" for="cfg-afk"><span>Tela de descanso</span><select id="cfg-afk" data-cfgs="afk">') +
      [['1', LV.t('Após 1 min parado')], ['2', LV.t('Após 2 min parado')], ['5', LV.t('Após 5 min parado')], ['10', LV.t('Após 10 min parado')], ['0', LV.t('Nunca')]]
        .map(([v, t]) => '<option value="' + v + '"' + (fa === v ? LV.t(' selected') : '') + '>' + t + '</option>').join('') + '</select><output></output></label>' +
      LV.t('<p class="nota">Esconde o jogo e mostra o que suas Centelhas conquistaram enquanto você não mexe. Gasta menos energia.</p></section>');
    h += LV.t('<section class="sec"><header class="sec-h"><h2>Som</h2></header>') +
      deslizante('musica', LV.t('Música')) + deslizante('efeitos', LV.t('Efeitos')) +
      '<div class="opts">' + chave('mudo', LV.t('Silenciar tudo')) + '</div></section>';
    if (emJogo && S()) {
      h += LV.t('<section class="sec"><header class="sec-h"><h2>Jogabilidade</h2></header><div class="opts">') +
        '<button class="opt" role="switch" aria-checked="' + S().op.auto + LV.t('" data-c="auto"><span class="sw"></span><span><b>Caçada automática</b><small>O herói anda sozinho até os inimigos e usa escadas.</small></span></button></div>') +
        (LV.movel
          ? LV.t('<p class="nota">Controles: ◀ ▶ andar · ▲ pular ou subir escadas · ▼ descer escadas e atravessar plataformas · toque no cenário para ir até um ponto · toque numa criatura: só o domador ataca · segure o dedo nela: o domador e as Centelhas atacam juntos · a engrenagem abre esta janela.</p></section>')
          : LV.t('<p class="nota">Controles: A/D andar · Espaço pular · W/S subir ou descer escadas e atravessar plataformas · clique para ir até um ponto · Esc abre esta janela.</p></section>'));
    }
    h += secaoLevarSave(emJogo);
    h += LV.t('<div class="rodape-cfg"><span>Lumevale v') + VERSAO + '</span>' + (emJogo ? '<button class="segredo" data-m="console" title="Console do criador">· · ·</button>' : '') + '</div>';
    return h;
  }
  /* levar o progresso para outro aparelho: no jogo gera o código; no menu inicial também importa */
  function secaoLevarSave(emJogo) {
    let h = '<section class="sec"><header class="sec-h"><h2>' + LV.t('Levar o progresso') + '</h2></header>';
    if (emJogo) {
      h += '<p class="nota">' + LV.t('Gera um código com este save para continuar em outro aparelho ou no app instalado. Lá, cole o código em Opções › Levar o progresso, no menu inicial.') + '</p>' +
        '<div class="row"><button class="btn" data-c="exportar" data-n="' + game.slot + '">' + LV.t('Copiar código do save') + '</button></div>';
    } else {
      const cheios = [1, 2, 3].filter((n) => LV.slots.resumo(n));
      if (cheios.length) {
        h += '<p class="nota">' + LV.t('Copie o código de um save para levar a outro aparelho:') + '</p><div class="row">' +
          cheios.map((n) => '<button class="btn" data-c="exportar" data-n="' + n + '">' + LV.t('Copiar · Espaço ') + n + '</button>').join('') + '</div>';
      }
      h += '<p class="nota">' + LV.t('Recebeu um código? Cole aqui e escolha onde guardar:') + '</p>' +
        '<textarea id="cod-import" class="json cod-save" rows="3" spellcheck="false" autocomplete="off" placeholder="LUMEVALE1:…"></textarea>' +
        '<div class="row"><select id="cod-slot" aria-label="' + LV.t('Espaço do save') + '">' +
        [1, 2, 3].map((n) => { const r = LV.slots.resumo(n); return '<option value="' + n + '">' + LV.t('Espaço ') + n + ' · ' + (r ? LV.t('substitui ') + esc(r.nome) + LV.t(' (Nv ') + r.nivel + ')' : LV.t('vazio')) + '</option>'; }).join('') +
        '</select><button class="btn pri" data-c="importar">' + LV.t('Importar') + '</button></div>';
    }
    return h + '<p class="small cod-msg" id="cod-msg" aria-live="polite"></p><textarea class="json cod-save" id="cod-export" rows="3" readonly hidden></textarea></section>';
  }
  // a mensagem aparece dentro da própria seção (as janelas cobrem os avisos do jogo)
  function avisarSave(msg, tipo) {
    const p = document.getElementById('cod-msg');
    if (!p) { ui.toast(msg, tipo, true); return; }
    p.textContent = msg; p.className = 'small cod-msg ' + (tipo || '');
  }
  async function exportarSave(n) {
    if (game.slot === n) LV.salvar(true);
    const s = LV.slots.ler(n);
    if (!s || !s.inicial) { avisarSave(LV.t('Este espaço está vazio'), 'ruim'); return; }
    const cod = await LV.codigoDoSave(s);
    const ok = await copiarTexto(cod, document.getElementById('cod-export'));
    avisarSave(ok ? LV.t('Código copiado. Cole no outro aparelho.') : LV.t('Copie o código da caixa abaixo.'), ok ? 'bom' : '');
  }
  async function importarSave() {
    const caixa = document.getElementById('cod-import'), n = +(document.getElementById('cod-slot') || {}).value || 1;
    let s;
    try { s = await LV.saveDoCodigo(caixa && caixa.value); }
    catch (e) { avisarSave(e && e.message === 'navegador' ? LV.t('Este navegador não abre esse código. Atualize o navegador.') : LV.t('Código inválido. Copie o código inteiro de novo.'), 'ruim'); return; }
    LV.slots.gravar(n, s);
    ui.atualizarInicio();
    avisarSave(LV.t('Save de ') + ((s.dom && s.dom.nome) || LV.t('Viajante')) + LV.t(' importado no espaço ') + n + LV.t('. Abra em Carregar jogo.'), 'bom');
  }
  ui.abrirConfig = function (emJogo) {
    if (ui.modalAberto && ui.modalAberto.cfg) return;
    ui.modal(LV.t('<div class="cabec"><div><div class="eyebrow">Lumevale</div><h2>Configurações</h2></div><button class="btn" data-m="fechar">Fechar</button></div><div class="cfg">') + configHTML(emJogo) + '</div>', { cls: 'config-m', cfg: true });
  };
  function configClique(e) {
    const b = e.target.closest('[data-c], [data-cfg]');
    if (!b) return;
    som('clique');
    if (b.dataset.cfg) {
      const id = b.dataset.cfg;
      LV.config[id] = id === 'mudo' ? !LV.config.mudo : LV.config[id] === false;
      b.setAttribute('aria-checked', String(id === 'mudo' ? LV.config.mudo : LV.config[id] !== false));
      LV.salvarConfig();
      return;
    }
    const c = b.dataset.c;
    if (c === 'menu') { ui.fecharModal(); LV.voltarMenu(); }
    else if (c === 'reiniciar') { ui.fecharModal(); game.reiniciarMapa(); ui.toast(LV.t('Mapa reiniciado'), 'bom', true); }
    else if (c === 'salvar') { LV.salvar(true); ui.toast(LV.t('Jogo salvo'), 'bom', true); }
    else if (c === 'telacheia') LV.telaCheia();
    else if (c === 'exportar') exportarSave(+b.dataset.n);
    else if (c === 'importar') importarSave();
    else if (c === 'auto') {
      if (game.acao.alternar('auto') === 'bloqueado') ui.toast(LV.t('A caçada automática desbloqueia a partir do mapa 2.'), 'ruim', true);
      b.setAttribute('aria-checked', String(S().op.auto)); hud();
    }
  }
  function configEntrada(e) {
    const t = e.target;
    if (t.dataset.cfgr) {
      LV.config[t.dataset.cfgr] = (+t.value) / 100;
      const o = document.getElementById(t.id + '-v'); if (o) o.textContent = t.value + '%';
      if (e.type === 'change') { LV.salvarConfig(); if (t.dataset.cfgr === 'efeitos') som('moeda'); }
      else if (LV.audio) LV.audio.aplicarVolumes();
    } else if (t.dataset.cfgs === 'idioma') {
      if (e.type === 'change') LV.trocarIdioma(t.value, ui.inicioVisivel() ? 'opcoes' : 'jogo');
    } else if (t.dataset.cfgs && e.type === 'change') {
      LV.config[t.dataset.cfgs] = t.value;
      LV.salvarConfig();
    }
  }

  /* =================== MENU INICIAL =================== */
  let inicioVista = 'menu', novo = { slot: 1, sp: null, confirmar: false };
  ui.inicioVisivel = () => el.inicio && !el.inicio.hidden;
  ui.inicioOpcoes = function () { inicioVista = 'opcoes'; ui.atualizarInicio(); };
  ui.mostrarInicio = function () {
    inicioVista = 'menu';
    if (ui.modalAberto) { ui.fila = []; ui.fecharModal(); }
    el.inicio.hidden = false;
    document.documentElement.classList.remove('diario');
    document.getElementById('app').classList.add('no-menu');
    ui.atualizarInicio();
  };
  ui.entrarNoJogo = function (novoJogo) {
    el.inicio.hidden = true;
    document.getElementById('app').classList.remove('no-menu');
    document.documentElement.style.setProperty('--acc', LV.MAPS[S().mapa].pal.acento);
    ui.sel = S().ativos[0] || null;
    ui.abrir(ui.aba);
    hud(); ui.saveStatus();
    if (S().aguardaInicial) { ui.escolhaInicial(true); return; }   // renasceu e ainda não escolheu o pet
    if (novoJogo) ui.tituloMapa(S().mapa);
    if (novoJogo === 'tutorial') { ui.tutorial(game.tutorial); return; }
    if (novoJogo) {
      const p = S().pets[0];
      avisoMeta(() => {                   // as dicas de controle vêm depois do objetivo
        ui.toast(LV.t('Bem-vindo, ') + S().dom.nome + '. ' + (p ? LV.nomePet(p) + LV.t(' está ao seu lado.') : ''), 'bom');
        if (LV.movel) {                   // celular: dicas de toque, em duas mensagens curtas
          setTimeout(() => ui.toast(LV.t('Use ◀ ▶ para andar, ▲ para pular ou subir escadas e ▼ para descer.')), 1500);
          setTimeout(() => ui.toast(LV.t('Toque numa criatura para atacar. Segure o dedo nela para atacar junto com as Centelhas.')), 5500);
        } else setTimeout(() => ui.toast(LV.t('A/D para andar, Espaço para pular, W/S para escadas. Esc abre as Configurações.')), 1500);
      });
    }
  };
  function cartaoSlot(n, modo) {
    const r = LV.slots.resumo(n);
    if (!r) {
      if (modo === 'carregar') return LV.t('<div class="slot vazio"><span class="snum">Espaço ') + n + LV.t('</span><span class="muted">Vazio</span></div>');
      return '<button class="slot vazio' + (novo.slot === n ? LV.t(' sel') : '') + '" data-i="slot" data-n="' + n + LV.t('"><span class="snum">Espaço ') + n + LV.t('</span><span class="muted">Vazio</span></button>');
    }
    const img = r.pet ? '<img src="' + art.retrato(r.pet.sp, r.pet.est, 64) + '" alt="" width="48" height="48">' : '';
    const quando = r.salvoEm ? new Date(r.salvoEm).toLocaleString(LV.locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    const corpo = img + LV.t('<span class="sinfo"><span class="snum">Espaço ') + n + '</span><b>' + esc(r.nome) + LV.t('</b><span class="small muted">Nv ') + r.nivel + ' · ' + r.rank + ' · ' + r.mapa + '</span>' +
      '<span class="small muted">' + r.pets + LV.t(' Centelhas · ') + LV.fmtTempo(r.tempo) + LV.t(' de jogo') + (quando ? ' · ' + quando : '') + '</span></span>';
    if (modo === 'carregar') return '<button class="slot" data-i="carregar" data-n="' + n + '">' + corpo + '</button>';
    return '<button class="slot' + (novo.slot === n ? LV.t(' sel') : '') + '" data-i="slot" data-n="' + n + '">' + corpo + '</button>';
  }
  ui.atualizarInicio = function () {
    if (!el.inicio || el.inicio.hidden) return;
    const caixa = el.inicio.querySelector('.inicio-caixa') || el.inicio;
    let h = '';
    const algum = [1, 2, 3].some((n) => LV.slots.resumo(n));
    if (inicioVista === 'menu') {
      h = LV.t('<div class="logo"><div class="eyebrow">Uma descida pelas profundezas</div><h1 class="titulo">Lumevale</h1></div>') +
        '<nav class="menu-ini">' +
        LV.t('<button class="btn-ini" data-i="novo">Novo jogo</button>') +
        '<button class="btn-ini" data-i="vcarregar"' + (algum ? '' : LV.t(' disabled')) + LV.t('>Carregar jogo</button>') +
        LV.t('<button class="btn-ini" data-i="opcoes">Opções</button></nav>') +
        LV.t('<p class="muted small rodape-ini">Lumevale v') + VERSAO +
        (function () {
          const outro = LV.idioma === 'pt' ? 'en' : 'pt';
          return '<button type="button" class="troca-idioma" data-i="idioma" data-id="' + outro + '" title="' + LV.t('Idioma') + '"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 8h13M8 1.5c-2.2 2.4-2.2 10.6 0 13M8 1.5c2.2 2.4 2.2 10.6 0 13" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>' + LV.IDIOMAS[outro] + '</button>';
        })() + '</p>';
    } else if (inicioVista === 'novo') {
      if (!novo.slot) novo.slot = LV.slots.primeiroVazio() || 1;
      const ocupado = LV.slots.resumo(novo.slot);
      h = LV.t('<form class="novo" autocomplete="off"><div class="cabec"><h2>Novo jogo</h2><button type="button" class="btn" data-i="voltar">Voltar</button></div>') +
        LV.t('<label class="campo-nome" for="novo-nome"><span>Nome do seu personagem</span><input id="novo-nome" maxlength="24" value="') + esc(novo.nome || '') + LV.t('" placeholder="ex.: Kadu"></label>') +
        LV.t('<div class="rotulo">Escolha seu primeiro companheiro</div><div class="inis">') +
        LV.INICIAIS.map((id) => {
          const sp = LV.SPECIES[id];
          return '<button type="button" class="ini' + (novo.sp === id ? LV.t(' sel') : '') + '" data-i="sp" data-sp="' + id + '" style="--c:' + sp.pal.g + '"><img src="' + art.retrato(id, 0, 96) + '" alt="" width="96" height="96">' +
            '<b>' + sp.nome[0] + '</b>' + elChip(sp.el) + espChip(id) + '<small>' + esc(sp.desc) + '</small><span class="evo-l">' + sp.nome.join(' → ') + '</span></button>';
        }).join('') + '</div>' +
        LV.t('<p class="muted small">Brasa vence Musgo, Musgo vence Maré, Maré vence Brasa.</p>') +
        LV.t('<div class="rotulo">Onde salvar</div><div class="slots">') + [1, 2, 3].map((n) => cartaoSlot(n, 'novo')).join('') + '</div>' +
        (ocupado ? LV.t('<p class="aviso">O espaço ') + novo.slot + LV.t(' já tem o jogo de ') + esc(ocupado.nome) + LV.t(' (Nv ') + ocupado.nivel + LV.t('). Começar aqui apaga esse progresso.</p>') : '') +
        '<label class="pular-tut"><input type="checkbox" id="novo-pular"' + (novo.pular ? ' checked' : '') + '><span><b>' + LV.t('Pular tutorial') + '</b><small>' +
        LV.t('Começa direto no primeiro mapa com a Centelha escolhida. Sem marcar, você aprende a atacar e capturar a sua primeira Centelha.') + '</small></span></label>' +
        '<div class="row end"><button type="button" class="btn pri" data-i="comecar">' + (ocupado ? LV.t('Apagar e começar') : LV.t('Começar jornada')) + '</button></div></form>';
    } else if (inicioVista === 'carregar') {
      h = LV.t('<div class="cabec"><h2>Carregar jogo</h2><button class="btn" data-i="voltar">Voltar</button></div><div class="slots col">') + [1, 2, 3].map((n) => cartaoSlot(n, 'carregar')).join('') + '</div>';
    } else if (inicioVista === 'opcoes') {
      h = LV.t('<div class="cabec"><h2>Opções</h2><button class="btn" data-i="voltar">Voltar</button></div><div class="cfg">') + configHTML(false) + '</div>';
    }
    caixa.innerHTML = h;
    caixa.className = LV.t('inicio-caixa v-') + inicioVista;
    if (inicioVista === 'novo') inicioValidar();
  };
  function inicioValidar() {
    const inp = document.getElementById('novo-nome');
    if (inp) novo.nome = inp.value;
    const b = el.inicio.querySelector('[data-i="comecar"]');
    if (b) b.disabled = !(novo.sp && (novo.nome || '').trim());
  }
  function inicioClique(e) {
    const b = e.target.closest('[data-i]');
    if (!b) { configClique(e); return; }
    if (b.disabled) return;
    som('clique');
    const a = b.dataset.i;
    if (a === 'novo') { inicioVista = 'novo'; novo = { slot: LV.slots.primeiroVazio() || 1, sp: null, nome: '' }; ui.atualizarInicio(); setTimeout(() => { const i = document.getElementById('novo-nome'); if (i) i.focus(); }, 30); }
    else if (a === 'vcarregar') { inicioVista = 'carregar'; ui.atualizarInicio(); }
    else if (a === 'opcoes') { inicioVista = 'opcoes'; ui.atualizarInicio(); }
    else if (a === 'voltar') { inicioVista = 'menu'; ui.atualizarInicio(); }
    else if (a === 'sp') { novo.sp = b.dataset.sp; inicioValidar(); el.inicio.querySelectorAll('.ini').forEach((x) => x.classList.toggle('sel', x.dataset.sp === novo.sp)); }
    else if (a === 'slot') { inicioValidar(); novo.slot = +b.dataset.n; ui.atualizarInicio(); }
    else if (a === 'carregar') { if (!LV.carregarJogo(+b.dataset.n)) ui.toast(LV.t('Não foi possível carregar este espaço.'), 'ruim', true); }
    else if (a === 'idioma') LV.trocarIdioma(b.dataset.id, 'menu');
    else if (a === 'comecar') { inicioValidar(); if (novo.sp && (novo.nome || '').trim()) { const n = Object.assign({}, novo); ui.abertura(() => LV.novoJogo(n.slot, n.nome, n.sp, !!n.pular)); } }
  }
  /* "voltar" do Android no menu inicial: sobe um nível; no menu principal devolve false (sai do app) */
  ui.inicioVoltar = function () {
    if (inicioVista === 'menu') return false;
    inicioVista = 'menu'; ui.atualizarInicio();
    return true;
  };
})();
