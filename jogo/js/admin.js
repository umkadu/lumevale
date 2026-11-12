'use strict';
/* Lumevale — console do criador: comandos digitados que alteram o jogo em tempo real. */
(function () {
  const LV = window.LV, game = LV.game;
  const admin = (LV.admin = {});
  const LISTA = [], CMDS = {};

  function num(v) {
    if (v == null) return NaN;
    let s = String(v).trim().toLowerCase();
    if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?[kmbt]?$/.test(s)) s = s.replace(/\./g, '');
    s = s.replace(',', '.');
    let m = 1;
    const suf = s.slice(-1);
    if ('kmbt'.includes(suf) && s.length > 1) { m = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[suf]; s = s.slice(0, -1); }
    const n = parseFloat(s);
    return isFinite(n) ? n * m : NaN;
  }
  function valor(atual, arg) {
    if (arg == null) return NaN;
    const s = String(arg).trim();
    const n = num(s.replace(/^[+-]/, ''));
    if (!isFinite(n)) return NaN;
    if (s[0] === '+') return atual + n;
    if (s[0] === '-') return atual - n;
    return n;
  }
  const ok = (t) => ({ t, k: 'ok' });
  const erro = (t) => ({ t, k: 'erro' });
  const info = (t) => ({ t, k: 'info' });
  const S = () => game.S;
  function def(nomes, uso, desc, fn) { const c = { nomes, uso, desc, fn }; LISTA.push(c); nomes.forEach((n) => { CMDS[n] = c; }); }
  function atualizar() { game.atualizarEquipe(); if (game.W) { const ds = game.domStats(); game.W.tam.hpMax = ds.hp; game.W.tam.hp = Math.min(game.W.tam.hp, ds.hp); } LV.emit('admin'); }

  function acharEspecie(txt) {
    const q = LV.semAcento(txt);
    for (const id in LV.SPECIES) {
      if (id === q) return id;
      if (LV.SPECIES[id].nome.some((n) => LV.semAcento(n) === q)) return id;
    }
    for (const id in LV.SPECIES) if (id.startsWith(q) || LV.SPECIES[id].nome.some((n) => LV.semAcento(n).startsWith(q))) return id;
    return null;
  }
  function acharPet(ref) {
    const s = S();
    if (ref == null) return null;
    const n = parseInt(ref, 10);
    if (String(n) === String(ref).trim()) return s.pets[n - 1] || null;
    const q = LV.semAcento(ref);
    const cand = s.pets.filter((p) => LV.semAcento(LV.nomePet(p)) === q || p.sp === q || LV.semAcento(LV.SPECIES[p.sp].nome[p.est]) === q);
    const pref = cand.find((p) => s.ativos.includes(p.uid));
    if (pref || cand[0]) return pref || cand[0];
    return s.pets.find((p) => LV.semAcento(LV.nomePet(p)).startsWith(q)) || null;
  }
  function acharMat(txt) {
    const q = LV.semAcento(txt);
    for (const id in LV.MAT) if (id === q || LV.semAcento(LV.MAT[id].nome).startsWith(q)) return id;
    return null;
  }

  def(['ajuda', 'help', '?', 'comandos'], 'ajuda', 'Mostra todos os comandos', () => {
    const out = [info('Comandos disponíveis (use + ou - para somar ou subtrair, ex.: lumes +5000):')];
    LISTA.forEach((c) => out.push(info(c.uso.padEnd(30, ' ') + ' ' + c.desc)));
    return out;
  });
  def(['lumes', 'ouro', 'dinheiro', 'gold'], 'lumes <valor>', 'Define o dinheiro (aceita 10k, 2.5m, +500)', (a) => {
    const v = valor(S().lumes, a[0]);
    if (!isFinite(v)) return [erro('Use: lumes 50000 · lumes +10k · lumes -200')];
    S().lumes = Math.max(0, Math.floor(v)); atualizar();
    return [ok('Lumes agora: ' + LV.fmt(S().lumes))];
  });
  def(['nivel', 'level', 'lvl'], 'nivel <valor>', 'Define o nível do domador (+3 pontos por nível ganho)', (a) => {
    const d = S().dom, v = Math.floor(valor(d.nivel, a[0]));
    if (!isFinite(v)) return [erro('Use: nivel 30')];
    const novo = LV.clamp(v, 1, 999);
    if (novo > d.nivel) d.pontos += (novo - d.nivel) * 3;
    d.nivel = novo; d.xp = 0; atualizar();
    return [ok('Domador agora está no nível ' + novo + ' (' + LV.RANKS[LV.rankIdx(novo)].nome + ')')];
  });
  def(['xp', 'experiencia'], 'xp <valor>', 'Dá experiência ao domador', (a) => {
    const v = num(a[0]);
    if (!(v > 0)) return [erro('Use: xp 5000')];
    const antes = S().dom.nivel; game.ganharXPDom(v); atualizar();
    return [ok('+' + LV.fmt(v) + ' XP · nível ' + antes + ' → ' + S().dom.nivel)];
  });
  def(['pontos'], 'pontos <valor>', 'Pontos de atributo livres', (a) => {
    const v = Math.floor(valor(S().dom.pontos, a[0]));
    if (!isFinite(v)) return [erro('Use: pontos 20')];
    S().dom.pontos = Math.max(0, v); atualizar();
    return [ok('Pontos livres: ' + S().dom.pontos)];
  });
  LV.ATTR.forEach((at) => {
    def([at.id, LV.semAcento(at.nome)], at.id + ' <valor>', 'Define o atributo ' + at.nome, (a) => {
      const v = Math.floor(valor(S().dom.attr[at.id], a[0]));
      if (!isFinite(v)) return [erro('Use: ' + at.id + ' 50')];
      S().dom.attr[at.id] = Math.max(0, v); atualizar();
      return [ok(at.nome + ' agora: ' + S().dom.attr[at.id])];
    });
  });
  def(['material', 'mat'], 'material <nome|todos> <valor>', 'Define um material (musgo, esporo, escama, cristal, brasa)', (a) => {
    if (a.length < 2) return [erro('Use: material esporo 100 · material todos 500')];
    const alvo = LV.semAcento(a[0]);
    const ids = alvo === 'todos' || alvo === 'tudo' ? Object.keys(LV.MAT) : [acharMat(a[0])].filter(Boolean);
    if (!ids.length) return [erro('Material desconhecido. Opções: ' + Object.keys(LV.MAT).join(', '))];
    const out = [];
    for (const id of ids) {
      const v = Math.floor(valor(S().mats[id], a[1]));
      if (!isFinite(v)) return [erro('Valor inválido')];
      S().mats[id] = Math.max(0, v);
      out.push(ok(LV.MAT[id].nome + ': ' + LV.fmt(S().mats[id])));
    }
    atualizar();
    return out;
  });
  def(['materiais'], 'materiais <valor>', 'Define todos os materiais de uma vez', (a) => CMDS.material.fn(['todos', a[0]]));
  def(['lanternas', 'lanterna'], 'lanternas <valor>', 'Lanternas de captura', (a) => {
    const v = Math.floor(valor(S().lanternas, a[0]));
    if (!isFinite(v)) return [erro('Use: lanternas 50')];
    S().lanternas = Math.max(0, v); atualizar();
    return [ok('Lanternas: ' + S().lanternas)];
  });
  def(['pets', 'colecao'], 'pets', 'Lista seus pets com o número de cada um', () => {
    const s = S();
    if (!s.pets.length) return [info('Você ainda não tem pets.')];
    return s.pets.map((p, i) => info((i + 1) + '. ' + LV.nomePet(p) + ' · Nv ' + p.nivel + ' · ' + LV.EL[LV.SPECIES[p.sp].el].nome + (s.ativos.includes(p.uid) ? ' · em campo' : '')));
  });
  def(['pet'], 'pet <nº|nome> nivel|estagio|nome <v>', 'Altera um pet (ex.: pet 1 nivel 40)', (a) => {
    const p = acharPet(a[0]);
    if (!p) return [erro('Pet não encontrado. Digite "pets" para ver a lista numerada.')];
    const campo = LV.semAcento(a[1] || '');
    if (campo === 'nivel' || campo === 'level') {
      const v = Math.floor(valor(p.nivel, a[2]));
      if (!isFinite(v)) return [erro('Use: pet 1 nivel 40')];
      p.nivel = LV.clamp(v, 1, 999); p.xp = 0; atualizar();
      return [ok(LV.nomePet(p) + ' agora está no nível ' + p.nivel)];
    }
    if (campo === 'estagio' || campo === 'forma') {
      const v = Math.floor(num(a[2]));
      if (!(v >= 0 && v <= 2)) return [erro('Estágio vai de 0 a 2')];
      p.est = v; atualizar();
      return [ok('Agora é ' + LV.nomePet(p))];
    }
    if (campo === 'evoluir') return CMDS.evoluir.fn([a[0]]);
    if (campo === 'nome' || campo === 'apelido') {
      const n = a.slice(2).join(' ').trim().slice(0, 20);
      p.apelido = n || null; atualizar();
      return [ok(n ? 'Apelido definido: ' + n : 'Apelido removido')];
    }
    return [erro('Use: pet 1 nivel 40 · pet 1 estagio 2 · pet 1 nome Faísca · pet 1 evoluir')];
  });
  def(['evoluir', 'evolve'], 'evoluir <nº|nome>', 'Evolui um pet na hora, sem custo', (a) => {
    const p = acharPet(a[0]);
    if (!p) return [erro('Pet não encontrado. Digite "pets" para ver a lista.')];
    const r = game.acao.evoluir(p.uid, true);
    if (r === 'max') return [erro(LV.nomePet(p) + ' já está na forma final')];
    atualizar();
    return [ok('Evoluiu para ' + LV.nomePet(p) + '!')];
  });
  def(['dar', 'criar', 'capturar'], 'dar <espécie> [nível] [estágio]', 'Cria um pet novo (ex.: dar umbrim 30 2)', (a) => {
    const id = acharEspecie(a[0] || '');
    if (!id) return [erro('Espécie desconhecida. Digite "especies" para ver todas.')];
    const s = S();
    const nv = LV.clamp(Math.floor(num(a[1])) || 1, 1, 999), est = LV.clamp(Math.floor(num(a[2])) || 0, 0, 2);
    const p = { uid: s.prox++, sp: id, nivel: nv, xp: 0, est, apelido: null };
    s.pets.push(p);
    if (s.ativos.length < game.slots()) s.ativos.push(p.uid);
    atualizar();
    return [ok('Novo pet: ' + LV.nomePet(p) + ' (Nv ' + nv + ')' + (s.ativos.includes(p.uid) ? ', já em campo' : ', na coleção'))];
  });
  def(['especies', 'especie'], 'especies', 'Lista todas as espécies', () =>
    Object.keys(LV.SPECIES).map((id) => { const sp = LV.SPECIES[id]; return info(id.padEnd(10, ' ') + ' ' + sp.nome.join(' → ') + ' · ' + LV.EL[sp.el].nome); }));
  def(['mapa', 'ir'], 'mapa <1-5>', 'Libera e viaja para um mapa', (a) => {
    const i = Math.floor(num(a[0])) - 1;
    if (!(i >= 0 && i < LV.MAPS.length)) return [erro('Use: mapa 1 até mapa ' + LV.MAPS.length)];
    S().mapas[i].liberado = true;
    game.acao.viajar(i); atualizar();
    return [ok('Viajando para ' + LV.MAPS[i].nome)];
  });
  def(['desbloquear', 'liberar'], 'desbloquear', 'Libera todos os mapas', () => { game.liberarMapas(); atualizar(); return [ok('Todos os mapas liberados')]; });
  def(['chefe', 'boss', 'guardiao'], 'chefe', 'Invoca o Guardião do mapa agora', () => {
    if (game.W && game.W.chefe) return [erro('O Guardião já está em campo')];
    game.desafiarChefe(true); atualizar();
    return [ok('O Guardião foi invocado')];
  });
  def(['curar', 'heal'], 'curar', 'Cura domador e pets', () => { game.curar(); return [ok('Todos curados')]; });
  def(['matar', 'limpar'], 'matar', 'Derrota todos os inimigos na tela (com recompensas)', () => [ok(game.matarTodos() + ' inimigos derrotados')]);
  def(['velocidade', 'vel', 'speed'], 'velocidade <0.25-10>', 'Velocidade do jogo (1 = normal)', (a) => {
    const v = num(a[0]);
    if (!(v > 0)) return [erro('Use: velocidade 3')];
    S().op.vel = LV.clamp(v, 0.25, 10); atualizar();
    return [ok('Velocidade: x' + S().op.vel)];
  });
  def(['upgrade', 'melhoria'], 'upgrade <id> <nível>', 'Define o nível de uma melhoria da loja', (a) => {
    const u = LV.UPGRADES.find((x) => x.id === LV.semAcento(a[0] || '') || LV.semAcento(x.nome).startsWith(LV.semAcento(a[0] || '')));
    if (!u) return [erro('Melhoria desconhecida. Digite "upgrades" para ver os ids.')];
    const v = Math.floor(valor(S().up[u.id], a[1]));
    if (!isFinite(v)) return [erro('Use: upgrade garras 20')];
    S().up[u.id] = LV.clamp(v, 0, u.max);
    if (S().ativos.length > game.slots()) S().ativos = S().ativos.slice(0, game.slots());
    atualizar();
    return [ok(u.nome + ' agora no nível ' + S().up[u.id] + ' (' + u.efeito(S().up[u.id]) + ')')];
  });
  def(['upgrades', 'melhorias'], 'upgrades', 'Lista as melhorias e seus ids', () => LV.UPGRADES.map((u) => info(u.id.padEnd(10, ' ') + ' ' + u.nome + ' · nível ' + S().up[u.id] + '/' + u.max)));
  def(['deus', 'god', 'imortal'], 'deus', 'Liga ou desliga a invencibilidade', () => {
    S().op.deus = !S().op.deus; atualizar();
    return [ok('Invencibilidade ' + (S().op.deus ? 'ligada' : 'desligada'))];
  });
  def(['offline'], 'offline <horas>', 'Simula o ganho de horas fora do jogo', (a) => {
    const h = num(a[0]);
    if (!(h > 0)) return [erro('Use: offline 2')];
    const r = game.calcOffline(h * 3600);
    if (!r) return [erro('Sem ganhos: coloque um pet em campo e cace um pouco antes.')];
    atualizar();
    LV.emit('offlineSimulado', r);
    return [ok(LV.fmt(r.kills) + ' inimigos · +' + LV.fmt(r.lumes) + ' Lumes · +' + LV.fmt(r.mats) + ' ' + LV.MAT[r.mat].nome)];
  });
  def(['nome'], 'nome <texto>', 'Muda o nome do domador', (a) => {
    const n = a.join(' ').trim().slice(0, 24);
    if (!n) return [erro('Use: nome Kadu')];
    S().dom.nome = n; atualizar();
    return [ok('Nome do domador: ' + n)];
  });
  def(['salvar', 'save'], 'salvar', 'Salva agora', () => { LV.salvar(true); return [ok('Jogo salvo')]; });
  def(['reset', 'apagar'], 'reset confirmar', 'Apaga este espaço de save e volta ao menu', (a) => {
    if (LV.semAcento(a[0] || '') !== 'confirmar') return [erro('Isso apaga todo o progresso deste espaço. Para confirmar, digite: reset confirmar')];
    setTimeout(() => LV.apagarSlotAtual(), 300);
    return [ok('Progresso apagado. Voltando ao menu principal…')];
  });
  def(['habilidade', 'hab'], 'habilidade <nº|nome> <nível>', 'Define o nível dos ataques especiais de um pet (1 a 10)', (a) => {
    const p = acharPet(a[0]);
    if (!p) return [erro('Pet não encontrado. Digite "pets" para ver a lista numerada.')];
    const v = Math.floor(valor(p.hab || 1, a[1]));
    if (!isFinite(v)) return [erro('Use: habilidade 1 5')];
    p.hab = LV.clamp(v, 1, LV.HAB_MAX); atualizar();
    return [ok('Ataques de ' + LV.nomePet(p) + ' agora no nível ' + p.hab)];
  });
  def(['moeda', 'moedas'], 'moeda <nome|todas> <valor>', 'Moedas dos Guardiões (semente, trufa, perola, geodo, ticao)', (a) => {
    const s = S(), q = LV.semAcento(a[0] || '');
    const alvos = q === 'todas' || q === 'todos' ? LV.MOEDAS : LV.MOEDAS.filter((m) => m.id === q || LV.semAcento(m.nome).startsWith(q));
    if (!alvos.length) return [erro('Use: moeda semente 20 · moeda todas 50')];
    for (const m of alvos) {
      const v = valor(s.moedas[m.id] || 0, a[1]);
      if (!isFinite(v)) return [erro('Use: moeda semente 20 · moeda todas +10')];
      s.moedas[m.id] = Math.max(0, Math.floor(v));
    }
    atualizar();
    return alvos.map((m) => ok(m.nome + ': ' + s.moedas[m.id]));
  });
  def(['ecos', 'eco'], 'ecos <valor>', 'Ecos do Santuário (ficam entre os renascimentos)', (a) => {
    const m = S().meta, v = valor(m.ecos, a[0]);
    if (!isFinite(v)) return [erro('Use: ecos 100 · ecos +20')];
    m.ecos = Math.max(0, Math.floor(v)); atualizar(); LV.emit('meta');
    return [ok('Ecos agora: ' + LV.fmt(m.ecos))];
  });
  def(['santuario', 'meta'], 'santuario <id> <nível>', 'Define o nível de uma melhoria do Santuário', (a) => {
    const u = LV.meta(LV.semAcento(a[0] || ''));
    if (!u) return [erro('Ids: ' + LV.META.map((x) => x.id).join(', '))];
    const v = Math.floor(valor(S().meta.up[u.id], a[1]));
    if (!isFinite(v)) return [erro('Use: santuario ancestral 5')];
    S().meta.up[u.id] = LV.clamp(v, 0, u.max); atualizar(); LV.emit('meta');
    return [ok(u.nome + ': ' + u.efeito(S().meta.up[u.id]))];
  });
  def(['renascer', 'prestigio'], 'renascer confirmar', 'Renasce agora (ganha os Ecos previstos)', (a) => {
    const prev = game.ecosPrevistos();
    if (prev <= 0) return [erro('Ainda não dá: derrote o primeiro Guardião nesta jornada.')];
    if (LV.semAcento(a[0] || '') !== 'confirmar') return [info('Renascer agora renderia ' + prev + ' Ecos. Para confirmar: renascer confirmar')];
    const g = game.acao.renascer();
    return [ok('Renasceu com +' + g + ' Ecos')];
  });
  def(['modo'], 'modo agressivo|defensor|passivo', 'Comando dos pets', (a) => {
    const m = LV.semAcento(a[0] || '');
    if (!LV.MODOS[m]) return [erro('Use: modo agressivo · modo defensor · modo passivo')];
    game.modoPets(m);
    return [ok('Pets no modo ' + LV.MODOS[m].nome)];
  });
  def(['afk', 'descanso'], 'afk', 'Abre a tela de descanso agora', () => {
    setTimeout(() => { LV.ui.fecharModal(); LV.ui.afk.entrar('inativo'); }, 50);
    return [ok('Abrindo a tela de descanso…')];
  });
  def(['revelar', 'bestiario'], 'revelar', 'Mostra todas as criaturas no Bestiário', () => {
    const b = S().meta.best;
    LV.CHAVES_BEST.forEach((id) => { b[id] = Object.assign({ k: 0, c: 0 }, b[id] || {}, { v: true }); });
    LV.emit('admin');
    return [ok('Bestiário completo: ' + LV.BESTIARIO.length + ' criaturas')];
  });
  def(['conquista', 'conquistas'], 'conquista <id|todas>', 'Marca uma conquista como concluída (pronta para resgatar)', (a) => {
    const q = LV.semAcento(a[0] || '');
    const lista = q === 'todas' ? LV.CONQUISTAS : LV.CONQUISTAS.filter((c) => c.id === q);
    if (!lista.length) return [erro('Use: conquista todas · conquista abates10 · ids: ' + LV.CONQUISTAS.slice(0, 6).map((c) => c.id).join(', ') + '…')];
    lista.forEach((c) => { if (!S().meta.conq[c.id]) S().meta.conq[c.id] = 1; });
    LV.emit('conquista', lista[0]);
    return [ok(lista.length + ' conquista(s) prontas para resgatar')];
  });
  def(['abandonar'], 'abandonar', 'Abandona a luta contra o Guardião', () => {
    if (!game.W || !game.W.chefe) return [erro('Não há Guardião em combate')];
    game.abandonarChefe();
    return [ok('Batalha abandonada')];
  });

  admin.exec = function (linha) {
    const txt = String(linha || '').trim().replace(/^\//, '');
    if (!txt) return [];
    const partes = txt.split(/\s+/);
    const nome = LV.semAcento(partes[0]);
    const c = CMDS[nome];
    if (!c) return [erro('Comando "' + partes[0] + '" não existe. Digite "ajuda" para ver a lista.')];
    if (!game.S || !game.W) return [erro('O jogo ainda está carregando')];
    try { return c.fn(partes.slice(1)) || []; } catch (e) { console.error(e); return [erro('Erro ao executar: ' + e.message)]; }
  };
  admin.lista = LISTA;
})();
