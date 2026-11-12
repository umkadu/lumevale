'use strict';
/* Lumevale — dados do jogo: elementos, criaturas, mapas, melhorias e fórmulas. */
(function () {
  const LV = (window.LV = window.LV || {});
  const TAU = Math.PI * 2;
  LV.TAU = TAU;
  LV.GROUND = 432;
  LV.VIEW_H = 540;
  LV.MAP_W = 2800;

  /* ---------- eventos ---------- */
  const handlers = {};
  LV.on = function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); };
  LV.emit = function (ev, data) {
    (handlers[ev] || []).forEach(function (fn) {
      try { fn(data); } catch (e) { console.error(e); }
    });
  };

  /* ---------- utilidades ---------- */
  LV.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  LV.lerp = (a, b, t) => a + (b - a) * t;
  LV.rand = (a, b) => a + Math.random() * (b - a);
  LV.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  LV.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  LV.semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  LV.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  LV.fmt = function (n) {
    n = Math.floor(+n || 0);
    const a = Math.abs(n);
    if (a < 100000) return n.toLocaleString(LV.locale);
    const u = [[1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    for (const [v, s] of u) {
      if (a >= v) return (n / v).toLocaleString(LV.locale, { maximumFractionDigits: a / v < 100 ? 1 : 0 }) + s;
    }
    return String(n);
  };
  LV.fmtTempo = function (seg) {
    seg = Math.max(0, Math.floor(seg));
    const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
    if (h) return h + 'h' + (m ? ' ' + m + 'min' : '');
    if (m) return m + 'min' + (s && m < 10 ? ' ' + s + 's' : '');
    return s + 's';
  };

  /* ---------- elementos ---------- */
  LV.EL = {
    brasa: { nome: LV.t('Brasa'), cor: '#ff9a52', forte: ['musgo'], fraco: ['mare'] },
    mare: { nome: LV.t('Maré'), cor: '#62c9ff', forte: ['brasa'], fraco: ['musgo'] },
    musgo: { nome: LV.t('Musgo'), cor: '#8fe07f', forte: ['mare'], fraco: ['brasa'] },
    cristal: { nome: LV.t('Cristal'), cor: '#ee9cff', forte: ['sombra'], fraco: ['cristal'] },
    sombra: { nome: LV.t('Sombra'), cor: '#a99bff', forte: ['cristal'], fraco: ['sombra'] },
  };
  LV.elemMult = function (a, d) {
    if (!a || !d || !LV.EL[a]) return 1;
    if (LV.EL[a].forte.includes(d)) return 1.5;
    if (LV.EL[a].fraco.includes(d)) return 0.7;
    return 1;
  };
  LV.vulneravel = function (el) {
    return Object.keys(LV.EL).filter((k) => LV.EL[k].forte.includes(el));
  };

  LV.MAT = {
    musgo: { nome: LV.t('Musgo Luminoso'), cor: '#9ef08a' },
    esporo: { nome: LV.t('Esporo Âmbar'), plural: LV.t('Esporos Âmbar'), cor: '#ffb347' },
    escama: { nome: LV.t('Escama de Maré'), plural: LV.t('Escamas de Maré'), cor: '#6fd3ff' },
    cristal: { nome: LV.t('Cristal Rosado'), plural: LV.t('Cristais Rosados'), cor: '#f39cff' },
    brasa: { nome: LV.t('Brasa Viva'), plural: LV.t('Brasas Vivas'), cor: '#ff6b3d' },
  };

  LV.ESTILOS = { investida: LV.t('Corpo a corpo'), projetil: LV.t('À distância'), pulso: LV.t('Em área') };

  /* ---------- criaturas (pets) ----------
     pal: d = sombra do corpo, m = cor principal, b = parte clara, g = brilho bioluminescente */
  LV.SPECIES = {
    fagulho: {
      nome: [LV.t('Fagulho'), LV.t('Brasolho'), LV.t('Vulcárabo')], el: 'brasa', corpo: 'besouro', voa: false,
      pal: { d: '#2a110b', m: '#86391d', b: '#c9794c', g: '#ffb35c' },
      base: { hp: 64, atk: 13, spd: 1.05, alc: 46, estilo: 'investida' }, cap: 0.32, evoMat: ['esporo', 'brasa'],
      desc: LV.t('Besouro de brasa. Avança contra o inimigo com a carapaça em chamas.'),
    },
    gotim: {
      nome: [LV.t('Gotim'), LV.t('Conchumbra'), LV.t('Marevolto')], el: 'mare', corpo: 'caracol', voa: false,
      pal: { d: '#0b1c2b', m: '#235479', b: '#86bccc', g: '#7fe3ff' },
      base: { hp: 78, atk: 11, spd: 0.85, alc: 210, estilo: 'projetil' }, cap: 0.34, evoMat: ['musgo', 'escama'],
      desc: LV.t('Caracol das poças. Dispara gotas pesadas de longe.'),
    },
    muscolino: {
      nome: [LV.t('Muscolino'), LV.t('Mariflora'), LV.t('Silvalume')], el: 'musgo', corpo: 'mariposa', voa: true,
      pal: { d: '#0f2319', m: '#3c774a', b: '#acd8a2', g: '#bfff9e' },
      base: { hp: 54, atk: 12, spd: 1.2, alc: 190, estilo: 'pulso' }, cap: 0.3, evoMat: ['musgo', 'cristal'],
      desc: LV.t('Mariposa de musgo. Espalha esporos que atingem vários inimigos.'),
    },
    esporito: {
      nome: [LV.t('Esporito'), LV.t('Cogumante'), LV.t('Micorrei')], el: 'musgo', corpo: 'cogumelo', voa: false,
      pal: { d: '#2a1810', m: '#7a482b', b: '#dccdb2', g: '#ffd36b' },
      base: { hp: 84, atk: 10, spd: 0.9, alc: 180, estilo: 'projetil' }, cap: 0.4, evoMat: ['musgo', 'esporo'],
      desc: LV.t('Cogumelo andarilho. Resistente e paciente.'),
    },
    umbrim: {
      nome: [LV.t('Umbrim'), LV.t('Vultinho'), LV.t('Eclipsar')], el: 'sombra', corpo: 'fantasma', voa: true,
      pal: { d: '#110e22', m: '#3a3070', b: '#9084d8', g: '#c9bcff' },
      base: { hp: 56, atk: 15, spd: 1.25, alc: 200, estilo: 'projetil' }, cap: 0.18, evoMat: ['escama', 'cristal'],
      desc: LV.t('Eco de uma luz que se apagou. Rápido e difícil de capturar.'),
    },
    lascado: {
      nome: [LV.t('Lascado'), LV.t('Geodito'), LV.t('Prismarca')], el: 'cristal', corpo: 'caranguejo', voa: false,
      pal: { d: '#1b1326', m: '#4c3962', b: '#a891c2', g: '#f3a6ff' },
      base: { hp: 95, atk: 12, spd: 0.9, alc: 48, estilo: 'investida' }, cap: 0.26, evoMat: ['cristal', 'brasa'],
      desc: LV.t('Caranguejo de geodo. Carrega cristais vivos nas costas.'),
    },
    lumagua: {
      nome: [LV.t('Lumágua'), LV.t('Medusela'), LV.t('Abissália')], el: 'mare', corpo: 'aguaviva', voa: true,
      pal: { d: '#0a192d', m: '#2c68a1', b: '#a3dbff', g: '#8ff6ff' },
      base: { hp: 60, atk: 13, spd: 1.0, alc: 200, estilo: 'pulso' }, cap: 0.28, evoMat: ['escama', 'cristal'],
      desc: LV.t('Água-viva das cisternas afogadas. Pulsa ondas de luz.'),
    },
    tecelo: {
      nome: [LV.t('Teçulho'), LV.t('Aranhumbra'), LV.t('Tecelã Noturna')], el: 'sombra', corpo: 'aranha', voa: false,
      pal: { d: '#0f0b14', m: '#34293e', b: '#806d92', g: '#ff7bd0' },
      base: { hp: 66, atk: 16, spd: 1.3, alc: 46, estilo: 'investida' }, cap: 0.22, evoMat: ['escama', 'brasa'],
      desc: LV.t('Aranha das ruínas. Golpes rápidos e precisos.'),
    },
    brilhoca: {
      nome: [LV.t('Brilhoca'), LV.t('Quartzela'), LV.t('Diamântula')], el: 'cristal', corpo: 'larva', voa: false,
      pal: { d: '#191522', m: '#5c536f', b: '#cbc1da', g: '#9ff3ff' },
      base: { hp: 70, atk: 14, spd: 1.0, alc: 200, estilo: 'projetil' }, cap: 0.3, evoMat: ['cristal', 'cristal'],
      desc: LV.t('Larva que mastiga quartzo. Dispara lascas brilhantes.'),
    },
    cinzelo: {
      nome: [LV.t('Cinzelo'), LV.t('Chamariposa'), LV.t('Pirálida')], el: 'brasa', corpo: 'mariposa', voa: true,
      pal: { d: '#210f0b', m: '#6c2e21', b: '#d69c7c', g: '#ff8a4a' },
      base: { hp: 58, atk: 15, spd: 1.15, alc: 190, estilo: 'pulso' }, cap: 0.24, evoMat: ['esporo', 'brasa'],
      desc: LV.t('Mariposa de cinzas. Suas asas soltam faíscas.'),
    },
  };
  LV.INICIAIS = ['fagulho', 'gotim', 'muscolino'];

  /* ---------- inimigos hostis (não capturáveis) ---------- */
  LV.HOSTIS = {
    rastejante: { nome: LV.t('Rastejante'), corpo: 'rastejante', voa: false, estilo: 'investida', alc: 40 },
    casca: { nome: LV.t('Casca Errante'), corpo: 'casca', voa: false, estilo: 'investida', alc: 44 },
    vespa: { nome: LV.t('Vespa de Cinza'), corpo: 'vespa', voa: true, estilo: 'projetil', alc: 170 },
  };

  /* ---------- mapas ---------- */
  LV.MAPS = [
    {
      nome: LV.t('Raízes Murmurantes'), sub: LV.t('A primeira descida. As raízes ainda bombeiam um resto de Lume para o alto.'),
      lv: [1, 9], mat: 'musgo', tema: 'raizes', part: 'vagalume', elHostil: 'musgo', killsChefe: 25, seed: 11,
      pal: { c1: '#03080a', c2: '#0d2628', longe: '#1c4846', meio: '#0f2e2c', perto: '#071615', chao: '#030909', chaoTopo: '#13332d', luz: '#b8ffe6', acento: '#8ff0c4', nevoa: '#5aa597' },
      hostil: { d: '#0b1210', m: '#28382f', b: '#cfc7b2', g: '#ffb35c' },
      selvagens: ['esporito', 'gotim', 'muscolino'], hostis: ['rastejante'],
      chefe: { nome: LV.t('Mãe-Raiz'), corpo: 'rastejante', el: 'musgo', s: 2.5, voa: false, pal: { d: '#0a1410', m: '#2c4a39', b: '#a3d29c', g: '#c6ff7a' }, premio: { sp: 'umbrim', est: 0 } },
    },
    {
      nome: LV.t('Cripta Fúngica'), sub: LV.t('Aqui descansam os primeiros domadores. O bolor cresce sobre a luz que eles deixaram.'),
      lv: [9, 20], mat: 'esporo', tema: 'fungos', part: 'esporos', elHostil: 'musgo', killsChefe: 30, seed: 23,
      pal: { c1: '#0a0605', c2: '#26140b', longe: '#3c2315', meio: '#2c180e', perto: '#140a06', chao: '#080403', chaoTopo: '#301b10', luz: '#ffd59a', acento: '#ffb45a', nevoa: '#a8693a' },
      hostil: { d: '#140c08', m: '#3a2a20', b: '#d8cbb2', g: '#9fffd8' },
      selvagens: ['fagulho', 'esporito', 'cinzelo'], hostis: ['casca'],
      chefe: { nome: LV.t('Rei Bolor'), corpo: 'cogumelo', el: 'musgo', s: 2.6, voa: false, pal: { d: '#2a120c', m: '#7a3a22', b: '#e2cba9', g: '#ffcf5a' }, premio: { sp: 'lascado', est: 0 } },
    },
    {
      nome: LV.t('Cidade Afogada'), sub: LV.t('A capital do Povo do Lume, sob a chuva eterna. Os lampiões ainda acendem.'),
      lv: [20, 34], mat: 'escama', tema: 'ruinas', part: 'chuva', elHostil: 'mare', killsChefe: 35, seed: 37,
      pal: { c1: '#03060c', c2: '#0f1e34', longe: '#23395b', meio: '#132540', perto: '#081220', chao: '#03070d', chaoTopo: '#16253a', luz: '#cfe6ff', acento: '#7fc8ff', nevoa: '#4f7aa8' },
      hostil: { d: '#0a0f18', m: '#25324a', b: '#d5dbe3', g: '#ffd36b' },
      selvagens: ['lumagua', 'tecelo', 'gotim'], hostis: ['casca', 'vespa'],
      chefe: { nome: LV.t('Sentinela Afogada'), corpo: 'casca', el: 'mare', s: 2.6, voa: false, pal: { d: '#0a1220', m: '#2b4566', b: '#e3e9ef', g: '#8fe9ff' }, premio: { sp: 'brilhoca', est: 0 } },
    },
    {
      nome: LV.t('Minas de Cristal'), sub: LV.t('Os antigos cavaram aqui atrás do Lume cristalizado. Fundo demais.'),
      lv: [34, 50], mat: 'cristal', tema: 'cristais', part: 'brilho', elHostil: 'cristal', killsChefe: 40, seed: 53,
      pal: { c1: '#07040c', c2: '#1f1030', longe: '#3e2661', meio: '#24153a', perto: '#120a1e', chao: '#06030a', chaoTopo: '#26173d', luz: '#f5d6ff', acento: '#f39cff', nevoa: '#8a5bb0' },
      hostil: { d: '#120c18', m: '#33284a', b: '#d8cfe6', g: '#7ffff0' },
      selvagens: ['lascado', 'brilhoca', 'umbrim'], hostis: ['rastejante', 'vespa'],
      chefe: { nome: LV.t('Matriarca Geode'), corpo: 'caranguejo', el: 'cristal', s: 2.5, voa: false, pal: { d: '#1a1028', m: '#5a3a80', b: '#d7b8ff', g: '#ff9cf0' }, premio: { sp: 'tecelo', est: 1 } },
    },
    {
      nome: LV.t('Coração de Cinza'), sub: LV.t('O fundo de tudo. O Coração do vale arde em febre.'),
      lv: [50, 72], mat: 'brasa', tema: 'cinzas', part: 'brasas', elHostil: 'brasa', killsChefe: 45, seed: 71,
      pal: { c1: '#090303', c2: '#2a0c08', longe: '#4b1b12', meio: '#2a0e0a', perto: '#140605', chao: '#070202', chaoTopo: '#2c100a', luz: '#ffc29a', acento: '#ff7a3a', nevoa: '#8a3a26' },
      hostil: { d: '#120806', m: '#3a1e18', b: '#d9c3b5', g: '#ffe27a' },
      selvagens: ['cinzelo', 'fagulho', 'tecelo'], hostis: ['vespa', 'casca'],
      chefe: { nome: LV.t('Coração Ígneo'), corpo: 'fantasma', el: 'brasa', s: 2.7, voa: true, pal: { d: '#2a0806', m: '#8a2a14', b: '#ffb38a', g: '#ffd25a' }, premio: { sp: 'lumagua', est: 2 } },
    },
  ];

  /* ---------- moedas dos Guardiões: uma por mapa, só caem do Guardião daquele mapa ---------- */
  LV.MOEDAS = [
    { id: 'semente', nome: LV.t('Semente Antiga'), plural: LV.t('Sementes Antigas'), cor: '#9ff0b0', desc: LV.t('Semente guardada pela Mãe-Raiz desde antes das primeiras raízes.') },
    { id: 'trufa', nome: LV.t('Trufa Real'), plural: LV.t('Trufas Reais'), cor: '#e8b066', desc: LV.t('Iguaria da coroa do Rei Bolor. Cheira a terra e a ouro velho.') },
    { id: 'perola', nome: LV.t('Pérola Afogada'), plural: LV.t('Pérolas Afogadas'), cor: '#9fd8ff', desc: LV.t('Pérola que a Sentinela guardava no fundo da cidade submersa.') },
    { id: 'geodo', nome: LV.t('Geodo Cantante'), plural: LV.t('Geodos Cantantes'), cor: '#f3a6ff', desc: LV.t('Geodo que ainda vibra com o canto da Matriarca.') },
    { id: 'ticao', nome: LV.t('Tição Eterno'), plural: LV.t('Tições Eternos'), cor: '#ff8a4a', desc: LV.t('Brasa arrancada do Coração Ígneo. Nunca esfria.') },
  ];
  LV.moeda = (id) => LV.MOEDAS.find((m) => m.id === id);
  /* nome de moeda ou material para uma quantidade: 1 no singular, o resto no plural (o Musgo não tem plural) */
  LV.nomeQtd = (o, q) => (Math.abs(+q) === 1 || !o.plural ? o.nome : o.plural);
  /* moedas que um Guardião solta: primeira vitória rende mais */
  LV.moedasChefe = (idx, primeira) => (primeira ? 8 + idx * 2 : 3 + idx);

  /* ---------- curva de dificuldade (v1.11) ----------
     Multiplicadores por mapa sobre as fórmulas. Sem eles a vida dos Guardiões crescia 3x, 6x, 9x e 21x de um para o
     outro, e o grupo cresce quase em linha reta: os mapas 1 a 3 caíam em ~20 s e o 4 virava um muro. Com eles cada
     Guardião pede ~2x mais poder que o anterior (em relação ao crescimento natural do grupo), então a partir do mapa 2
     renascer passa a ser o caminho para avançar. Criaturas mais fortes também rendem um pouco mais (metade do aumento). */
  LV.DIFICULDADE = [
    { hp: 1, atk: 1, chefeHp: 1, chefeAtk: 1 },            // Raízes: primeiro contato, continua fácil
    { hp: 1.35, atk: 1.2, chefeHp: 2.1, chefeAtk: 1.35 },  // Cripta
    { hp: 1.8, atk: 1.4, chefeHp: 3.4, chefeAtk: 1.6 },    // Cidade Afogada
    { hp: 1.6, atk: 1.35, chefeHp: 2.2, chefeAtk: 1.5 },   // Minas
    { hp: 1.3, atk: 1.2, chefeHp: 0.75, chefeAtk: 1.2 },   // Coração (já era um salto enorme)
  ];

  /* ---------- melhorias da Loja ----------
     Cada melhoria é dividida em faixas de "passo" níveis. A faixa k custa Lumes + a moeda do Guardião k:
     as primeiras compras pedem Sementes Antigas (mapa 1), depois Trufas Reais (mapa 2) e assim por diante.
     tiers/qtd: faixa e quantidade de moedas fixas por nível (para melhorias de poucos níveis). */
  LV.UPGRADES = [
    { id: 'garras', nome: LV.t('Garras Afiadas'), desc: LV.t('Dano das Centelhas'), base: 60, mult: 1.45, max: 25, passo: 5, efeito: (n) => '+' + n * 12 + LV.t('% de dano') },
    { id: 'carapaca', nome: LV.t('Carapaça Rígida'), desc: LV.t('Vida das Centelhas'), base: 60, mult: 1.45, max: 25, passo: 5, efeito: (n) => '+' + n * 12 + LV.t('% de vida') },
    { id: 'ritmo', nome: LV.t('Ritmo de Caça'), desc: LV.t('Velocidade de ataque'), base: 150, mult: 1.6, max: 15, passo: 3, efeito: (n) => '+' + n * 5 + LV.t('% de velocidade') },
    { id: 'faro', nome: LV.t('Faro de Coletor'), desc: LV.t('Lumes e materiais que caem'), base: 90, mult: 1.5, max: 20, passo: 4, efeito: (n) => '+' + n * 8 + LV.t('% de coleta') },
    { id: 'sabedoria', nome: LV.t('Tomo das Profundezas'), desc: LV.t('Experiência ganha'), base: 120, mult: 1.5, max: 20, passo: 4, efeito: (n) => '+' + n * 8 + LV.t('% de XP') },
    { id: 'ima', nome: LV.t('Lanterna Magnética'), desc: LV.t('Distância de coleta'), base: 80, mult: 1.9, max: 10, passo: 2, efeito: (n) => 150 + n * 35 + LV.t(' de alcance') },
    { id: 'descanso', nome: LV.t('Acampamento'), desc: LV.t('Tempo máximo de ganho offline'), base: 300, mult: 2.2, max: 10, passo: 2, efeito: (n) => 2 + n + LV.t('h de ganho offline') },
    { id: 'laco', nome: LV.t('Laço Extra'), desc: LV.t('Vagas de Centelhas em campo'), base: 4000, mult: 12, max: 2, tiers: [1, 3], qtd: [12, 18], efeito: (n) => 3 + n + LV.t(' Centelhas em campo') },
  ];
  LV.upgrade = (id) => LV.UPGRADES.find((u) => u.id === id);
  /* custo do próximo nível (n = nível atual): Lumes + moeda da faixa */
  LV.custoUp = function (u, n) {
    if (n >= u.max) return null;
    const tier = u.tiers ? u.tiers[n] : Math.min(LV.MOEDAS.length - 1, Math.floor(n / u.passo));
    const q = u.qtd ? u.qtd[n] : 1 + (n % u.passo) + tier;
    return { lumes: Math.round(u.base * Math.pow(u.mult, n)), moeda: LV.MOEDAS[tier].id, tier, q };
  };

  /* ---------- Santuário: melhorias permanentes compradas com Ecos (ficam entre os renascimentos) ---------- */
  LV.META = [
    { id: 'eco', nome: LV.t('Eco Ressonante'), desc: LV.t('Ecos ganhos ao renascer'), base: 4, mult: 1.55, max: 15, efeito: (n) => '+' + n * 20 + LV.t('% de Ecos') },
    { id: 'fortuna', nome: LV.t('Fortuna dos Guardiões'), desc: LV.t('Moedas que os Guardiões soltam'), base: 5, mult: 1.55, max: 15, efeito: (n) => '+' + n * 25 + LV.t('% de moedas') },
    { id: 'ancestral', nome: LV.t('Força Ancestral'), desc: LV.t('Dano e vida de todas as Centelhas'), base: 3, mult: 1.45, max: 25, efeito: (n) => '+' + n * 8 + LV.t('% de dano e vida') },
    { id: 'mestre', nome: LV.t('Mestre das Trilhas'), desc: LV.t('XP do domador e das Centelhas'), base: 3, mult: 1.45, max: 20, efeito: (n) => '+' + n * 10 + LV.t('% de XP') },
    { id: 'heranca', nome: LV.t('Herança de Lume'), desc: LV.t('Lumes coletados e Lumes iniciais'), base: 4, mult: 1.5, max: 15, efeito: (n) => '+' + n * 6 + LV.t('% de Lumes · começa com ') + (n * 300).toLocaleString(LV.locale) },
    { id: 'lanterneiro', nome: LV.t('Lanterneiro'), desc: LV.t('Chance no lançamento e lanternas iniciais'), base: 5, mult: 1.6, max: 10, efeito: (n) => '+' + n * 8 + LV.t('% de chance · +') + n * 2 + LV.t(' lanternas') },
    { id: 'primeiro', nome: LV.t('Primeiro Passo'), desc: LV.t('Nível inicial da Centelha escolhida'), base: 6, mult: 1.8, max: 5, efeito: (n) => LV.t('começa no nível ') + (1 + n * 3) },
    { id: 'trilha', nome: LV.t('Memória da Trilha'), desc: LV.t('Caçada automática desde o primeiro mapa'), base: 8, mult: 1, max: 1, efeito: (n) => (n ? LV.t('liberada desde o início') : LV.t('só a partir do mapa 2')) },
    // auto-farm: cada etapa libera o desafio automático de mais um mapa (500 Ecos e x2,5 a cada etapa)
    { id: 'autofarm', nome: LV.t('Desafio Automático'), desc: LV.t('Ao completar a meta de abates, o Guardião é desafiado sozinho'), base: 500, mult: 2.5, max: 5,
      efeito: (n) => (n ? LV.t('liberado até ') + LV.MAPS[n - 1].nome : LV.t('nenhum mapa')) },
    { id: 'vinculo', nome: LV.t('Vínculo Eterno'), desc: LV.t('Vaga extra de Centelha em campo, em todas as jornadas'), base: 150, mult: 1, max: 1, efeito: (n) => '+' + n + LV.t(' vaga permanente') },
  ];
  LV.meta = (id) => LV.META.find((u) => u.id === id);
  /* atributos automáticos: cada vaga comprada escolhe um atributo que recebe os pontos ao subir de nível.
     A primeira vaga já custa caro e cada vaga seguinte custa o triplo */
  LV.AUTO_ATTR_CUSTO = [30, 90, 270, 810];
  LV.custoAutoAttr = (n) => (n < LV.AUTO_ATTR_CUSTO.length ? LV.AUTO_ATTR_CUSTO[n] : null);
  /* a escolha de cada vaga é fixa; redefinir apaga as escolhas de TODAS as vagas (que continuam liberadas).
     A taxa cresce com o número de vagas já liberadas: 15, 45, 135, 405 Ecos */
  LV.taxaResetAuto = (vagas) => (vagas > 0 ? Math.round(15 * Math.pow(3, vagas - 1)) : null);
  LV.custoMeta = (u, n) => (n >= u.max ? null : Math.round(u.base * Math.pow(u.mult, n)));
  /* Ecos de um renascimento: cada Guardião vencido nesta jornada, vitórias repetidas e o nível do domador */
  LV.ECOS_CHEFE = [4, 8, 14, 22, 32];

  /* ---------- domador ---------- */
  LV.RANKS = [
    { nv: 1, nome: LV.t('Andarilho'), capa: '#39404f', brilho: '#ffd9a0' },
    { nv: 10, nome: LV.t('Aprendiz de Lume'), capa: '#2b5450', brilho: '#bfffe8' },
    { nv: 20, nome: LV.t('Domador'), capa: '#5a3424', brilho: '#ffc27a' },
    { nv: 35, nome: LV.t('Domador Veterano'), capa: '#363c74', brilho: '#c6c2ff' },
    { nv: 50, nome: LV.t('Mestre das Profundezas'), capa: '#6a2638', brilho: '#ff9fb6' },
    { nv: 70, nome: LV.t('Lenda de Lumevale'), capa: '#86662a', brilho: '#fff1b8' },
  ];
  LV.rankIdx = function (nv) {
    let r = 0;
    LV.RANKS.forEach((k, i) => { if (nv >= k.nv) r = i; });
    return r;
  };
  LV.ATTR = [
    { id: 'forca', nome: LV.t('Força'), desc: LV.t('+3% de dano das Centelhas e da lanterna') },
    { id: 'vigor', nome: LV.t('Vigor'), desc: LV.t('+4% de vida das Centelhas e do domador') },
    { id: 'sorte', nome: LV.t('Sorte'), desc: LV.t('+1,5% de captura, +2% de coleta e +0,4% de crítico') },
    { id: 'vinculo', nome: LV.t('Vínculo'), desc: LV.t('+3% de XP das Centelhas e +1% de velocidade de ataque') },
  ];

  /* ---------- fórmulas ---------- */
  /* cada nível pede proporcionalmente mais caçadas: ~7 abates no nível 1, ~30 no 30, ~90 no 50, ~270 no 70 */
  LV.F = {
    xpDom: (L) => Math.floor(40 * Math.pow(1.19, L - 1) + 10 * L),
    xpPet: (L) => Math.floor(30 * Math.pow(1.17, L - 1) + 8 * L),
    ini: (L) => ({
      hp: 26 * Math.pow(1.15, L - 1) + 8 * L,
      atk: 3.5 * Math.pow(1.12, L - 1) + L,
      xp: 7 * Math.pow(1.13, L - 1) + 2 * L,
      lumes: 2 + 2.2 * Math.pow(1.12, L - 1),
    }),
    custo: (up, n) => Math.round(up.base * Math.pow(up.mult, n)),
    precoLanterna: (mapasLiberados) => [30, 90, 260, 700, 1800][LV.clamp(mapasLiberados, 1, 5) - 1],
    estagioMult: [1, 1.55, 2.3],
    escala: [1, 1.22, 1.45],
    evoNivel: [22, 45],
    capPet: (nivelDom) => nivelDom + 6,
  };

  LV.evoReq = function (spId, est) {
    const sp = LV.SPECIES[spId];
    if (!sp || est >= 2) return null;
    const mats = {};
    if (est === 0) mats[sp.evoMat[0]] = 20;
    else {
      mats[sp.evoMat[0]] = (mats[sp.evoMat[0]] || 0) + 60;
      mats[sp.evoMat[1]] = (mats[sp.evoMat[1]] || 0) + 45;
    }
    return { nivel: LV.F.evoNivel[est], mats, lumes: est === 0 ? 2500 : 60000, para: sp.nome[est + 1] };
  };
  LV.nomePet = (p) => p.apelido || LV.SPECIES[p.sp].nome[p.est];
  /* chance de captura com a vida cheia: ~30% nas primeiras áreas, caindo com o nível da criatura
     (Nv 1: 30% · Nv 10: 22% · Nv 20: 15% · Nv 30: 11% · Nv 40: 8% · Nv 50+: 5%); espécies ariscas e formas evoluídas resistem mais */
  LV.chanceBaseCaptura = (sp, lv, est) => LV.clamp(0.3 * Math.pow(0.965, Math.max(0, lv - 1)), 0.045, 0.3) * (0.75 + 0.25 * (sp.cap / 0.3)) * (est ? 0.75 : 1);
  // chance no lançamento: sobe da chance base até o teto conforme a vida da criatura cai
  LV.chanceComVida = (base, hpf) => base + (Math.min(0.95, base + 0.55) - base) * Math.pow(1 - LV.clamp(hpf, 0, 1), 1.3);

  /* =========================================================
     ARTE ILUSTRADA — sprites, alturas em pixels lógicos e cenário
     ========================================================= */
  LV.MAP_W = 2000;
  /* flipEst: a ilustração daquele estágio foi desenhada virada para a esquerda */
  const VIS = {
    fagulho: { nome: [LV.t('Fagulho'), LV.t('Brasolho'), LV.t('Pirodraco')], voa: false, alt: [46, 64, 86], desc: LV.t('Dragãozinho de brasa. Avança contra o inimigo soltando faíscas.') },
    umbrim: { nome: [LV.t('Corvim'), LV.t('Corvulto'), LV.t('Eclipsar')], voa: false, alt: [44, 60, 74], desc: LV.t('Filhote de corvo das sombras. Rápido e difícil de capturar.') },
    gotim: { nome: [LV.t('Gotim'), LV.t('Cascarola'), LV.t('Marevolto')], voa: false, alt: [36, 50, 66], flipEst: [false, false, true], desc: LV.t('Tartaruguinha das poças. Dispara gotas pesadas de longe.') },
    muscolino: { voa: true, alt: [46, 60, 80], flipEst: [false, true, false], desc: LV.t('Mariposa de musgo. Espalha esporos que atingem vários inimigos.') },
    esporito: { alt: [42, 58, 80], desc: LV.t('Cogumelo andarilho. Resistente e paciente.') },
    lascado: { alt: [34, 52, 74], flipEst: [true, false, false], desc: LV.t('Caranguejo de geodo. Carrega cristais vivos nas costas.') },
    lumagua: { alt: [44, 68, 92], desc: LV.t('Água-viva das cisternas afogadas. Pulsa ondas de luz.') },
    tecelo: { alt: [32, 50, 74], desc: LV.t('Aranha das ruínas. Golpes rápidos e precisos.') },
    brilhoca: { alt: [28, 38, 50], desc: LV.t('Larva que mastiga quartzo. Dispara lascas brilhantes.') },
    cinzelo: { nome: [LV.t('Cinzelo'), LV.t('Morcinza'), LV.t('Pirálida')], voa: true, alt: [36, 52, 70], desc: LV.t('Morceguinho de brasa. Suas asas soltam faíscas que queimam em área.') },
  };
  for (const id in VIS) Object.assign(LV.SPECIES[id], VIS[id]);
  LV.imgPet = (sp, est) => 'pets/' + sp + '_' + est;

  Object.assign(LV.HOSTIS.rastejante, { img: 'inimigos/rastejante', alt: 34 });
  Object.assign(LV.HOSTIS.casca, { img: 'inimigos/casca', alt: 60 });
  Object.assign(LV.HOSTIS.vespa, { img: 'inimigos/vespa', alt: 50, flip: true });
  LV.HOSTIS.soldado = { nome: LV.t('Besouro Soldado'), corpo: 'casca', voa: false, estilo: 'investida', alc: 58, img: 'inimigos/soldado', alt: 62 };
  LV.HOSTIS.fogofatuo = { nome: LV.t('Fogo-fátuo'), corpo: 'fantasma', voa: true, estilo: 'projetil', alc: 180, img: 'inimigos/fogofatuo', alt: 46 };
  /* Breus temáticos de cada mapa. hp/atk/vel: multiplicadores próprios (o padrão dos hostis é 1.1 / 1.05 / 1.1) */
  const NOVOS = {
    galho: { nome: LV.t('Galho Oco'), corpo: 'casca', voa: false, estilo: 'investida', alc: 46, alt: 58 },
    mariposa: { nome: LV.t('Mariposa de Breu'), corpo: 'mariposa', voa: true, estilo: 'projetil', alc: 165, alt: 44, hp: 0.85 },
    bolor: { nome: LV.t('Bolor Andante'), corpo: 'cogumelo', voa: false, estilo: 'investida', alc: 50, alt: 64, hp: 1.6, atk: 0.9, vel: 0.8 },
    esporonegro: { nome: LV.t('Esporo Negro'), corpo: 'aguaviva', voa: true, estilo: 'projetil', alc: 175, alt: 50 },
    afogado: { nome: LV.t('Afogado'), corpo: 'casca', voa: false, estilo: 'investida', alc: 56, alt: 64, hp: 1.3 },
    enguia: { nome: LV.t('Enguia de Breu'), corpo: 'larva', voa: true, estilo: 'investida', alc: 44, alt: 54, hp: 0.8, atk: 1.15, vel: 1.5 },
    mineiro: { nome: LV.t('Mineiro Oco'), corpo: 'besouro', voa: false, estilo: 'investida', alc: 50, alt: 56, hp: 1.25, atk: 1.1 },
    olho: { nome: LV.t('Olho de Breu'), corpo: 'fantasma', voa: true, estilo: 'projetil', alc: 190, alt: 52, hp: 0.9, atk: 1.1 },
    salamandra: { nome: LV.t('Salamandra de Cinza'), corpo: 'larva', voa: false, estilo: 'investida', alc: 48, alt: 40, hp: 0.9, vel: 1.45 },
    brasamorta: { nome: LV.t('Brasa Morta'), corpo: 'besouro', voa: false, estilo: 'projetil', alc: 150, alt: 60, hp: 0.8, atk: 1.15 },
  };
  for (const id in NOVOS) LV.HOSTIS[id] = Object.assign({ img: 'inimigos/' + id }, NOVOS[id]);

  // Breus de cada mapa (os primeiros viram o Breu principal de cada ninho; os ninhos misturam todos os da lista)
  const HOST = [
    ['rastejante', 'galho', 'mariposa'],                     // Raízes
    ['bolor', 'esporonegro', 'casca', 'fogofatuo'],          // Fungos
    ['afogado', 'enguia', 'soldado', 'casca'],               // Ruínas
    ['mineiro', 'olho', 'soldado', 'rastejante'],            // Cristais
    ['salamandra', 'brasamorta', 'vespa', 'fogofatuo'],      // Cinzas
  ];
  // [imagem, altura, olha para a esquerda, boca (canto da Matriarca, em fração da imagem olhando para a direita)]
  const CHEFE_IMG = [['chefes/maeraiz', 210, true], ['chefes/reibolor', 215, false], ['chefes/sentinela', 225, true], ['chefes/matriarca', 186, false, { x: 0.68, y: 0.24 }], ['chefes/coracao', 215, true]];
  const CEN = [
    { plat: 'plat_raiz', alta: 'plat_raiz', pilar: true, props: ['cogumelos', 'lapide'], tinta: '#14463f', correntes: false },
    { plat: 'laje', alta: 'borda', pilar: true, props: ['cogumelos', 'lapide', 'poste'], tinta: '#5a3216', correntes: true },
    { plat: 'laje', alta: 'plat_madeira', pilar: true, props: ['poste', 'lapide', 'poste'], tinta: '#1c3658', correntes: true },
    { plat: 'plat_madeira', alta: 'plat_madeira', pilar: true, props: ['cristais', 'poste', 'cristais'], tinta: '#3e2460', correntes: false },
    { plat: 'borda', alta: 'laje', pilar: true, props: ['lapide', 'cristais'], tinta: '#5a1a10', correntes: true },
  ];
  const KILLS_CHEFE = [100, 140, 180, 220, 260];
  LV.MAPS.forEach((m, i) => {
    m.hostis = HOST[i];
    m.cen = CEN[i];
    m.killsChefe = KILLS_CHEFE[i];
    Object.assign(m.chefe, { img: CHEFE_IMG[i][0], alt: CHEFE_IMG[i][1], flip: CHEFE_IMG[i][2], canto: CHEFE_IMG[i][3] || null });
  });

  /* peças de cenário: topo = fração da altura onde fica o piso; cap = fração das pontas no fatiamento em 3 */
  LV.PECAS = {
    plat_raiz: { topo: 0.08, alt: 92, cap: 0.1 },
    plat_madeira: { topo: 0.05, alt: 50, cap: 0.09 },
    laje: { topo: 0.12, alt: 30, cap: 0.08 },
    borda: { topo: 0.07, alt: 46, cap: 0.14 },
    escada: { baseX: 0.05, topoX: 0.99, topoY: 0.285, inclinacao: 1.45 },
    poste: { alt: 96 }, cogumelos: { alt: 34 }, cristais: { alt: 42 }, lapide: { alt: 40 }, corrente: { alt: 130 }, pilar: {},
  };
  /* com muito mais inimigos por mapa, cada um rende um pouco menos */
  const iniBase = LV.F.ini;
  LV.F.ini = (L) => { const b = iniBase(L); b.xp *= 0.75; b.lumes *= 0.8; return b; };
  /* cenário modular (v1.12): por mapa, plataforma em 3 peças (ponta, meio que se repete, ponta) e coluna em 3 peças
     (topo, meio que se repete, base), em img/kits/<tema>. plat.alt = altura desenhada; col.larg = largura do tronco */
  /* KITS:INICIO (gerado por ferramentas/kit_cortar.js) — medidas das peças de cenário modular de cada mapa */
  LV.KITS = {"raizes":{"plat":{"h":198,"topo":0.1869,"w":[224,295,236]},"col":{"w":[264,141,309],"h":[258,168,285],"cx":[0.506,0.4728,0.465],"tronco":68}},"fungos":{"plat":{"h":168,"topo":0.2262,"w":[275,189,278]},"col":{"w":[177,147,291],"h":[297,174,309],"cx":[0.5092,0.4799,0.5151],"tronco":114}},"ruinas":{"plat":{"h":156,"topo":0.0192,"w":[209,255,206]},"col":{"w":[174,123,261],"h":[240,205,258],"cx":[0.4993,0.4967,0.4742],"tronco":98}},"cristais":{"plat":{"h":141,"topo":0.0355,"w":[141,256,141]},"col":{"w":[234,69,216],"h":[276,203,288],"cx":[0.5044,0.4916,0.5152],"tronco":63}},"cinzas":{"plat":{"h":144,"topo":0.0278,"w":[275,167,281]},"col":{"w":[201,93,288],"h":[222,127,234],"cx":[0.5082,0.4918,0.4592],"tronco":89}}};
  /* KITS:FIM */
  LV.KIT_DESENHO = { plat: { alt: 64, altaAlt: 56 }, col: { larg: 30 } };
  LV.HEROI = { alt: 68, parado: 'heroi/parado', andando: 'heroi/andando', pulando: 'heroi/pulando', lanterna: 'heroi/lanterna' };
  /* HEROI_MED:INICIO (gerado por ferramentas/medir_heroi.js) — máscara (fx, fy, largura) e lanterna (lx, ly, altura) de cada sprite do domador, em frações */
  LV.HEROI_MED = {"base":{"parado":[0.4969,0.2703,0.2762,0.8993,0.2735,0.1214,1.0952],"andando":[0.5554,0.2762,0.2833,0.9122,0.2889,0.1214,1.2214],"pulando":[0.5437,0.2999,0.2881,0.9123,0.3092,0.1262,1.2238],"lanterna":[0.4305,0.2859,0.2571,0.8438,0.2903,0.1214,1.2262]},
    "brasao":{"parado":[0.5393,0.2394,0.2476,0.9475,0.242,0.1024,0.8833],"andando":[0.5926,0.2499,0.2405,0.9515,0.2601,0.1024,0.9857],"pulando":[0.5762,0.268,0.2405,0.9446,0.2655,0.0976,0.9619],"lanterna":[0.4475,0.2631,0.2262,0.8473,0.258,0.1048,0.981]},
    "cogumelo":{"parado":[0.5478,0.3296,0.2619,0.9461,0.3172,0.1024,1.0095],"andando":[0.5711,0.3313,0.2619,0.949,0.3291,0.0976,1.0357],"pulando":[0.5594,0.3411,0.2714,0.9405,0.3433,0.1071,1.0548],"lanterna":[0.4607,0.3202,0.2643,0.8576,0.3261,0.1048,1.1214]},
    "coracao":{"parado":[0.5141,0.2621,0.2571,0.9024,0.2751,0.1167,0.981],"andando":[0.5632,0.2697,0.25,0.9144,0.2845,0.1143,1.0905],"pulando":[0.5467,0.2867,0.2571,0.9021,0.3056,0.1167,1.0905],"lanterna":[0.4464,0.2832,0.25,0.8958,0.2881,0.1262,1.1071]},
    "escamas":{"parado":[0.5596,0.3333,0.25,0.9466,0.3353,0.0952,0.9714],"andando":[0.5878,0.3403,0.2548,0.8986,0.3516,0.0952,1.0048],"pulando":[0.5716,0.3649,0.2476,0.9445,0.3736,0.1024,1.0167],"lanterna":[0.4706,0.3203,0.2619,0.9027,0.3261,0.1071,1.0333]},
    "estrelada":{"parado":[0.5058,0.266,0.2667,0.8437,0.2749,0.1143,1.0095],"andando":[0.5624,0.2754,0.2595,0.9146,0.2903,0.1143,1.1143],"pulando":[0.5564,0.3025,0.2643,0.9139,0.3073,0.1143,1.1024],"lanterna":[0.4465,0.2866,0.2548,0.8572,0.2909,0.1167,1.1143]},
    "lampiao":{"parado":[0.5029,0.2715,0.2595,0.9037,0.2827,0.1024,0.9643],"andando":[0.5063,0.2803,0.2524,0.8519,0.3011,0.1048,0.9595],"pulando":[0.5148,0.3041,0.2595,0.9084,0.3186,0.1095,0.9857],"lanterna":[0.4411,0.2752,0.2524,0.8452,0.2834,0.1119,1.1167]},
    "marfim":{"parado":[0.5236,0.2486,0.2476,0.8512,0.2631,0.1,0.9571],"andando":[0.5821,0.2545,0.2476,0.9185,0.2863,0.0952,1.0714],"pulando":[0.5561,0.2879,0.25,0.9208,0.2985,0.1024,1.0333],"lanterna":[0.4507,0.2672,0.2524,0.8522,0.2801,0.1048,1.1071]},
    "penas":{"parado":[0.5102,0.3445,0.2167,0.9057,0.3473,0.0929,0.8143],"andando":[0.4968,0.3423,0.2143,0.8845,0.3502,0.0929,0.831],"pulando":[0.5041,0.3515,0.219,0.9131,0.3503,0.0952,0.8071],"lanterna":[0.393,0.3374,0.2071,0.8275,0.3429,0.1,0.819]},
    "raizes":{"parado":[0.5794,0.26,0.2071,0.9523,0.2667,0.0905,0.8286],"andando":[0.6319,0.2727,0.2024,0.9567,0.2849,0.0881,0.95],"pulando":[0.6051,0.2972,0.2048,0.9493,0.3098,0.0929,0.9095],"lanterna":[0.4632,0.2416,0.2048,0.8504,0.2536,0.1024,0.9619]},
    "real":{"parado":[0.5419,0.3022,0.2405,0.9464,0.3132,0.0929,0.8929],"andando":[0.5921,0.3113,0.2452,0.9515,0.3239,0.0976,1.0167],"pulando":[0.5865,0.3388,0.2476,0.9468,0.3371,0.1024,1.0238],"lanterna":[0.4357,0.3138,0.2429,0.8414,0.3175,0.1119,1.0357]}};
  /* HEROI_MED:FIM */

  /* =========================================================
     ATAQUES ESPECIAIS DAS CENTELHAS (v1.12) — cada espécie tem 5; até 2 ficam equipados.
     O 1º vem de início; os outros se liberam no nível 12, na 1ª evolução, no nível 32 e na 2ª evolução.
     Espécies do mesmo elemento dividem alguns ataques. n = nível dos ataques do pet (1 a 10, melhorado com Lumes).
     tipo = como o ataque funciona (motor em game.js, tentarAtaque). Efeitos extras opcionais:
       dot {k, dur} (dano por segundo, fração do ataque) · atord(n) · lento · fraco · vuln(n) · dreno
     ========================================================= */
  const pc = (v) => Math.round(v * 100) + '%';
  const s1 = (v) => (Math.round(v * 10) / 10).toLocaleString(LV.locale);
  LV.HAB_MAX = 10;
  const L1 = (a, b) => (n) => a + b * (n - 1);
  LV.ATQ = {
    // ---- brasa ----
    explosao_brasa: { nome: LV.t('Explosão de Brasa'), tipo: 'explosao', cd: 9, mult: L1(1.6, 0.15), raio: L1(95, 5), dot: { k: 0.15, dur: 3 } },
    sopro_dragao: { nome: LV.t('Sopro do Dragão'), tipo: 'sopro', cd: 10, mult: L1(1.25, 0.12), alc: L1(150, 6), dot: { k: 0.18, dur: 3 } },
    parede_chamas: { nome: LV.t('Parede de Chamas'), tipo: 'parede', cd: 13, dps: L1(0.5, 0.05), dur: 4, img: 'ataques/chamas' },
    mordida_ignea: { nome: LV.t('Mordida Ígnea'), tipo: 'mordida', cd: 7, mult: L1(2.6, 0.2), dot: { k: 0.25, dur: 3 } },
    garras_flamejantes: { nome: LV.t('Garras Flamejantes'), tipo: 'garras', cd: 8, golpes: 3, mult: L1(0.9, 0.08), dot: { k: 0.12, dur: 2 } },
    chuva_cinzas: { nome: LV.t('Chuva de Cinzas'), tipo: 'chuva', cd: 12, mult: L1(1.0, 0.1), qtd: (n) => 4 + Math.floor((n - 1) / 3), atord: L1(1, 0.05), img: 'hab/brasacai' },
    vento_escaldante: { nome: LV.t('Vento Escaldante'), tipo: 'empurrao', cd: 10, mult: L1(0.8, 0.08), alc: 170, empurra: 95, dot: { k: 0.1, dur: 2 } },
    absorcao_vampirica: { nome: LV.t('Absorção Vampírica'), tipo: 'dreno', cd: 9, mult: L1(2.0, 0.15), dreno: 0.6 },
    investida_magma: { nome: LV.t('Investida de Magma'), tipo: 'investida', cd: 11, mult: L1(3.0, 0.2), dot: { k: 0.2, dur: 3 } },
    // ---- maré ----
    casco_mare: { nome: LV.t('Casco de Maré'), tipo: 'escudo', cd: 14, pct: L1(0.18, 0.02) },
    jato_agua: { nome: LV.t('Jato d’Água'), tipo: 'lanca', cd: 9, mult: L1(1.6, 0.15), alc: L1(240, 8), lento: 2 },
    onda_curativa: { nome: LV.t('Onda Curativa'), tipo: 'cura', cd: 12, pct: L1(0.1, 0.02) },
    bolha_prisioneira: { nome: LV.t('Bolha Prisioneira'), tipo: 'prisao', cd: 12, mult: L1(0.8, 0.06), atord: L1(2.5, 0.15), img: 'hab/bolha' },
    tsunami: { nome: LV.t('Tsunami'), tipo: 'empurrao', cd: 13, mult: L1(1.3, 0.12), alc: 220, empurra: 120, lento: 2, img: 'ataques/onda' },
    pulso_paralisante: { nome: LV.t('Pulso Paralisante'), tipo: 'pulso', cd: 12, mult: L1(0.9, 0.1), raio: 125, atord: L1(1.5, 0.12) },
    tentaculos: { nome: LV.t('Tentáculos Elétricos'), tipo: 'corrente', cd: 9, mult: L1(1.0, 0.1), saltos: (n) => 2 + Math.floor((n - 1) / 4), lento: 1.5 },
    maremoto: { nome: LV.t('Maremoto'), tipo: 'explosao', cd: 11, mult: L1(1.4, 0.12), raio: L1(100, 5), atord: L1(0.8, 0.05) },
    // ---- musgo ----
    polen_restaurador: { nome: LV.t('Pólen Restaurador'), tipo: 'cura', cd: 10, pct: L1(0.12, 0.02) },
    raizes_prendedoras: { nome: LV.t('Raízes Prendedoras'), tipo: 'prisaoArea', cd: 12, mult: L1(0.7, 0.06), raio: 90, atord: L1(2, 0.12), img: 'ataques/raizbaixa' },
    folhas_navalha: { nome: LV.t('Folhas Navalha'), tipo: 'revoada', cd: 9, mult: L1(0.9, 0.09), qtd: (n) => 4 + Math.floor((n - 1) / 3), dot: { k: 0.1, dur: 3 }, img: 'hab/folha' },
    brisa_sonolenta: { nome: LV.t('Brisa Sonolenta'), tipo: 'pulso', cd: 13, mult: L1(0.4, 0.04), raio: 140, atord: L1(2, 0.1), img: 'hab/polen' },
    bencao_floresta: { nome: LV.t('Bênção da Floresta'), tipo: 'regen', cd: 16, pct: L1(0.03, 0.004), dur: 5 },
    nuvem_esporos: { nome: LV.t('Nuvem de Esporos'), tipo: 'nuvem', cd: 11, dps: L1(0.35, 0.05) },
    cabecada: { nome: LV.t('Cabeçada de Chapéu'), tipo: 'mordida', cd: 9, mult: L1(1.8, 0.14), atord: L1(1.2, 0.06) },
    esporos_explosivos: { nome: LV.t('Esporos Explosivos'), tipo: 'explosao', cd: 11, mult: L1(1.2, 0.1), raio: L1(90, 5), dot: { k: 0.2, dur: 4 } },
    muralha_fungos: { nome: LV.t('Muralha de Fungos'), tipo: 'provocar', cd: 14, dur: L1(4, 0.3), red: L1(0.4, 0.03) },
    // ---- sombra ----
    revoada_sombria: { nome: LV.t('Revoada Sombria'), tipo: 'revoada', cd: 10, mult: L1(1.1, 0.1), qtd: (n) => 3 + Math.floor((n - 1) / 3), fraco: 4 },
    eclipse: { nome: LV.t('Eclipse'), tipo: 'eclipse', cd: 14, mult: L1(1.0, 0.1), raio: 110, fraco: 4, vuln: L1(0.2, 0.02) },
    bico_sombrio: { nome: LV.t('Bico Sombrio'), tipo: 'mordida', cd: 7, mult: L1(2.3, 0.18), fraco: 4 },
    mergulho_trevas: { nome: LV.t('Mergulho das Trevas'), tipo: 'investida', cd: 11, mult: L1(2.6, 0.18), fraco: 3 },
    grito_sombrio: { nome: LV.t('Grito Sombrio'), tipo: 'pulso', cd: 12, mult: L1(0.7, 0.07), raio: 130, atord: L1(1.2, 0.08), fraco: 3 },
    teia_noturna: { nome: LV.t('Teia Noturna'), tipo: 'teia', cd: 12, vuln: L1(0.25, 0.03) },
    picada_venenosa: { nome: LV.t('Picada Venenosa'), tipo: 'mordida', cd: 8, mult: L1(1.6, 0.12), dot: { k: 0.35, dur: 4 } },
    fios_cortantes: { nome: LV.t('Fios Cortantes'), tipo: 'lanca', cd: 9, mult: L1(1.7, 0.15), alc: L1(230, 8), vuln: L1(0.15, 0.02) },
    casulo: { nome: LV.t('Casulo'), tipo: 'prisao', cd: 13, mult: L1(0.6, 0.05), atord: L1(2.8, 0.15), img: 'hab/teia' },
    // ---- cristal ----
    carapaca_geodo: { nome: LV.t('Carapaça de Geodo'), tipo: 'provocar', cd: 13, dur: L1(4, 0.3), red: L1(0.45, 0.03) },
    estilhacos: { nome: LV.t('Estilhaços'), tipo: 'chuva', cd: 11, mult: L1(1.1, 0.1), qtd: (n) => 4 + Math.floor((n - 1) / 3), vuln: L1(0.15, 0.015), img: 'ataques/lasca' },
    pinca_cristal: { nome: LV.t('Pinça de Cristal'), tipo: 'mordida', cd: 8, mult: L1(2.2, 0.17), vuln: L1(0.2, 0.02) },
    terremoto: { nome: LV.t('Terremoto de Cristal'), tipo: 'pulso', cd: 12, mult: L1(1.0, 0.1), raio: 140, atord: L1(1, 0.06), img: 'ataques/cristais' },
    espelho_prismatico: { nome: LV.t('Espelho Prismático'), tipo: 'escudo', cd: 15, pct: L1(0.16, 0.02) },
    lanca_quartzo: { nome: LV.t('Lança de Quartzo'), tipo: 'lanca', cd: 8, mult: L1(2.0, 0.18), alc: L1(260, 10) },
    prisma_ofuscante: { nome: LV.t('Prisma Ofuscante'), tipo: 'prisaoArea', cd: 13, mult: L1(0.6, 0.05), raio: 100, atord: L1(1.8, 0.1), img: 'hab/estrela' },
    chuva_cristais: { nome: LV.t('Chuva de Cristais'), tipo: 'explosao', cd: 11, mult: L1(1.4, 0.12), raio: L1(95, 5), vuln: L1(0.15, 0.015), img: 'ataques/estilhacos' },
    mordida_quartzo: { nome: LV.t('Mordida de Quartzo'), tipo: 'mordida', cd: 7, mult: L1(2.7, 0.2) },
    // ---- v1.16: fortalecimentos (próprio pet e grupo), execução e controle ----
    furia_flamejante: { nome: LV.t('Fúria Flamejante'), tipo: 'furia', cd: 16, dur: 6, dano: L1(0.35, 0.03), vel: L1(0.3, 0.02) },
    golpe_derradeiro: { nome: LV.t('Golpe Derradeiro'), tipo: 'mordida', cd: 10, mult: L1(3.0, 0.22), exec: 1 },
    instinto_predador: { nome: LV.t('Instinto Predador'), tipo: 'furia', cd: 15, dur: 6, dano: L1(0.3, 0.03), vel: L1(0.35, 0.025) },
    marca_presa: { nome: LV.t('Marca da Presa'), tipo: 'mordida', cd: 9, mult: L1(1.6, 0.12), vuln: L1(0.35, 0.025) },
    brasas_guerra: { nome: LV.t('Brasas de Guerra'), tipo: 'grito', cd: 18, dur: 8, dano: L1(0.2, 0.02) },
    seiva_coragem: { nome: LV.t('Seiva da Coragem'), tipo: 'grito', cd: 18, dur: 8, dano: L1(0.22, 0.02) },
    casca_viva: { nome: LV.t('Casca Viva'), tipo: 'guarda', cd: 18, dur: 6, red: L1(0.25, 0.02) },
    mare_alta: { nome: LV.t('Maré Alta'), tipo: 'grito', cd: 18, dur: 8, vel: L1(0.25, 0.02) },
    redemoinho: { nome: LV.t('Redemoinho'), tipo: 'prisaoArea', cd: 13, mult: L1(0.7, 0.06), raio: 105, atord: L1(1.8, 0.1), lento: 3, img: 'hab/anelagua' },
    bastiao_cristal: { nome: LV.t('Bastião de Cristal'), tipo: 'guarda', cd: 18, dur: 6, red: L1(0.3, 0.02) },
    couraca_micelio: { nome: LV.t('Couraça de Micélio'), tipo: 'furia', cd: 15, dur: 6, red: L1(0.4, 0.03), dano: L1(0.15, 0.02) },
  };
  /* especialidade de cada Centelha (v1.16): muda um pouco a vida e o ataque e define o estilo dos 5 ataques */
  LV.ESPEC = {
    dps: { nome: LV.t('Dano em alvo único'), curto: LV.t('Dano'), desc: LV.t('Golpes fortes num alvo só e fúria que acelera os próprios ataques.'), cor: '#ff7a5a', hp: 0.9, atk: 1.15 },
    area: { nome: LV.t('Dano em área'), curto: LV.t('Área'), desc: LV.t('Explosões e chuvas que atingem vários inimigos de uma vez.'), cor: '#ffb84d', hp: 1, atk: 1 },
    suporte: { nome: LV.t('Suporte e cura'), curto: LV.t('Suporte'), desc: LV.t('Cura, escudos e fortalecimentos para o domador e todo o grupo.'), cor: '#8fe07f', hp: 1.05, atk: 0.85 },
    controle: { nome: LV.t('Controle'), curto: LV.t('Controle'), desc: LV.t('Prende, atordoa, deixa lento e fraco: os inimigos mal conseguem reagir.'), cor: '#c79bff', hp: 1, atk: 0.95 },
    tanque: { nome: LV.t('Tanque'), curto: LV.t('Tanque'), desc: LV.t('Muita vida, atrai os inimigos e protege o grupo.'), cor: '#7fc8ff', hp: 1.3, atk: 0.85 },
  };
  const ESPEC_SP = { fagulho: 'dps', umbrim: 'dps', cinzelo: 'area', brilhoca: 'area', muscolino: 'suporte', gotim: 'suporte', tecelo: 'controle', lumagua: 'controle', lascado: 'tanque', esporito: 'tanque' };
  for (const sp in ESPEC_SP) if (LV.SPECIES[sp]) LV.SPECIES[sp].espec = ESPEC_SP[sp];
  LV.especDe = (sp) => LV.ESPEC[(LV.SPECIES[sp] || {}).espec] || null;
  for (const id in LV.ATQ) LV.ATQ[id].id = id;
  /* os 5 ataques de cada espécie, na ordem em que se liberam */
  LV.ATQ_SP = {
    fagulho: ['mordida_ignea', 'furia_flamejante', 'garras_flamejantes', 'golpe_derradeiro', 'investida_magma'],
    umbrim: ['bico_sombrio', 'marca_presa', 'instinto_predador', 'mergulho_trevas', 'revoada_sombria'],
    cinzelo: ['explosao_brasa', 'chuva_cinzas', 'brasas_guerra', 'parede_chamas', 'sopro_dragao'],
    brilhoca: ['estilhacos', 'chuva_cristais', 'prisma_ofuscante', 'lanca_quartzo', 'terremoto'],
    muscolino: ['polen_restaurador', 'bencao_floresta', 'seiva_coragem', 'raizes_prendedoras', 'casca_viva'],
    gotim: ['onda_curativa', 'casco_mare', 'mare_alta', 'bolha_prisioneira', 'tsunami'],
    tecelo: ['teia_noturna', 'picada_venenosa', 'casulo', 'eclipse', 'fios_cortantes'],
    lumagua: ['pulso_paralisante', 'tentaculos', 'jato_agua', 'redemoinho', 'maremoto'],
    lascado: ['carapaca_geodo', 'pinca_cristal', 'espelho_prismatico', 'bastiao_cristal', 'terremoto'],
    esporito: ['muralha_fungos', 'cabecada', 'nuvem_esporos', 'couraca_micelio', 'esporos_explosivos'],
  };
  /* quando cada um dos 5 se libera */
  LV.ATQ_LIBERA = [{ nivel: 1 }, { nivel: 25 }, { nivel: 40, est: 1 }, { nivel: 55 }, { nivel: 65, est: 2 }];
  LV.atqLiberado = (p, i) => { const r = LV.ATQ_LIBERA[i]; return p.nivel >= r.nivel && (r.est == null || p.est >= r.est); };
  LV.atqsLiberados = (p) => (LV.ATQ_SP[p.sp] || []).filter((id, i) => LV.atqLiberado(p, i));
  LV.textoLibera = (i) => { const r = LV.ATQ_LIBERA[i]; return LV.t('no nível ') + r.nivel + (r.est === 1 ? LV.t(' e após a 1ª evolução') : r.est === 2 ? LV.t(' e após a 2ª evolução') : ''); };
  /* ataques equipados (até 2) que o pet já liberou */
  LV.atqsEquipados = (p) => { const lib = LV.atqsLiberados(p); const eq = (p.atqs || []).filter((id) => lib.includes(id)).slice(0, 2); return eq.length ? eq : lib.slice(0, 1); };
  /* compatibilidade: LV.HAB[sp] = primeiro ataque da espécie */
  LV.HAB = {};
  for (const sp in LV.ATQ_SP) LV.HAB[sp] = LV.ATQ[LV.ATQ_SP[sp][0]];
  /* descrição montada a partir do tipo e dos efeitos */
  const DOT_NOME = { brasa: LV.t('queimadura'), musgo: LV.t('veneno'), sombra: LV.t('veneno de sombra'), mare: LV.t('afogamento'), cristal: LV.t('cortes') };
  LV.descAtq = function (a, n, el) {
    const v = (f) => (typeof f === 'function' ? f(n) : f);
    let t;
    switch (a.tipo) {
      case 'explosao': t = LV.t('Explode no alvo: ') + pc(v(a.mult)) + LV.t(' do ataque em todos num raio de ') + Math.round(v(a.raio)); break;
      case 'chuva': t = LV.t('Faz cair ') + v(a.qtd) + LV.t(' projéteis sobre os inimigos perto do domador: ') + pc(v(a.mult)) + LV.t(' do ataque cada'); break;
      case 'escudo': t = LV.t('Escudo em todos os aliados que absorve ') + pc(v(a.pct)) + LV.t(' da vida máxima de cada um por 6 s'); break;
      case 'pulso': t = LV.t('Descarga em volta de si: ') + pc(v(a.mult)) + LV.t(' do ataque num raio de ') + v(a.raio); break;
      case 'cura': t = LV.t('Cura ') + pc(v(a.pct)) + LV.t(' da vida máxima do domador e de todas as Centelhas'); break;
      case 'nuvem': t = LV.t('Nuvem venenosa por 4 s: ') + pc(v(a.dps)) + LV.t(' do ataque por segundo e deixa os inimigos lentos'); break;
      case 'provocar': t = LV.t('Atrai os inimigos próximos por ') + s1(v(a.dur)) + LV.t(' s e reduz o dano que recebe em ') + pc(v(a.red)); break;
      case 'lanca': t = LV.t('Raio em linha reta: ') + pc(v(a.mult)) + LV.t(' do ataque em todos no caminho (alcance ') + Math.round(v(a.alc)) + ')'; break;
      case 'revoada': t = LV.t('Solta ') + v(a.qtd) + LV.t(' projéteis que perseguem os inimigos: ') + pc(v(a.mult)) + LV.t(' do ataque cada'); break;
      case 'teia': t = LV.t('Prende os inimigos numa teia: ficam lentos por 3 s'); break;
      case 'sopro': t = LV.t('Sopro em cone à frente: ') + pc(v(a.mult)) + LV.t(' do ataque em todos até ') + Math.round(v(a.alc)) + LV.t(' de distância'); break;
      case 'parede': t = LV.t('Ergue chamas no alvo por ') + a.dur + LV.t(' s: ') + pc(v(a.dps)) + LV.t(' do ataque por segundo em quem estiver dentro'); break;
      case 'mordida': t = LV.t('Golpe único e forte: ') + pc(v(a.mult)) + LV.t(' do ataque') + (a.exec ? LV.t(' (o dobro contra alvos com menos de 35% de vida)') : ''); break;
      case 'furia': case 'grito': {
        const p = [];
        if (a.dano) p.push('+' + pc(v(a.dano)) + LV.t(' de dano'));
        if (a.vel) p.push('+' + pc(v(a.vel)) + LV.t(' de velocidade de ataque'));
        if (a.red) p.push(pc(v(a.red)) + LV.t(' menos dano recebido'));
        t = (a.tipo === 'furia' ? LV.t('Fortalece a si mesmo por ') : LV.t('Fortalece o domador e todas as Centelhas por ')) + a.dur + ' s: ' + p.join(LV.t(', '));
        break;
      }
      case 'guarda': t = LV.t('O domador e todas as Centelhas recebem ') + pc(v(a.red)) + LV.t(' menos dano por ') + a.dur + ' s'; break;
      case 'garras': t = a.golpes + LV.t(' golpes rápidos: ') + pc(v(a.mult)) + LV.t(' do ataque cada'); break;
      case 'empurrao': t = LV.t('Rajada à frente: ') + pc(v(a.mult)) + LV.t(' do ataque e empurra os inimigos para longe'); break;
      case 'dreno': t = pc(v(a.mult)) + LV.t(' do ataque num alvo e recupera ') + pc(a.dreno) + LV.t(' do dano como vida'); break;
      case 'investida': t = LV.t('Avança girando através dos inimigos: ') + pc(v(a.mult)) + LV.t(' do ataque em todos no caminho'); break;
      case 'prisao': t = LV.t('Prende um alvo: ') + pc(v(a.mult)) + LV.t(' do ataque e o deixa parado por ') + s1(v(a.atord)) + ' s'; break;
      case 'prisaoArea': t = LV.t('Prende todos numa área: ') + pc(v(a.mult)) + LV.t(' do ataque e ficam parados por ') + s1(v(a.atord)) + ' s'; break;
      case 'corrente': t = LV.t('Atinge o alvo e salta para mais ') + v(a.saltos) + LV.t(' inimigos: ') + pc(v(a.mult)) + LV.t(' do ataque cada'); break;
      case 'regen': t = LV.t('Regenera ') + pc(v(a.pct)) + LV.t(' da vida máxima do grupo todo a cada segundo, por ') + a.dur + ' s'; break;
      case 'eclipse': t = LV.t('Escurece uma área: ') + pc(v(a.mult)) + LV.t(' do ataque em todos dentro'); break;
      default: t = '';
    }
    const ex = [];
    if (a.atord && !['prisao', 'prisaoArea'].includes(a.tipo)) ex.push(LV.t('atordoa por ') + s1(v(a.atord)) + ' s');
    if (a.dot) ex.push(DOT_NOME[el] + LV.t(' por ') + a.dot.dur + ' s');
    if (a.lento) ex.push(LV.t('causa lentidão por ') + s1(a.lento) + ' s');
    if (a.fraco) ex.push(LV.t('enfraquece (−30% de ataque) por ') + a.fraco + ' s');
    if (a.vuln) ex.push(LV.t('causa vulnerabilidade (+') + pc(v(a.vuln)) + LV.t(' de dano recebido) por 4 s'));
    return t + (ex.length ? LV.t(', ') + ex.join(LV.t(', ')) : '') + '.';
  };
  LV.recargaAtq = (a, n) => a.cd * Math.max(0.6, 1 - 0.03 * (n - 1));
  LV.habRecarga = (sp, n) => LV.recargaAtq(LV.HAB[sp], n);
  for (const sp in LV.HAB) { const a = LV.HAB[sp]; if (!a.desc) a.desc = (n) => LV.descAtq(a, n, LV.SPECIES[sp] ? LV.SPECIES[sp].el : 'brasa'); }
  LV.custoHab = (sp, n) => ({ lumes: Math.round(300 * Math.pow(1.85, n - 1)), mat: LV.SPECIES[sp].evoMat[0], q: 5 * n });

  /* criaturas mansas: só atacam depois de serem atacadas (as hostis e as demais selvagens sempre atacam) */
  ['esporito', 'gotim', 'muscolino', 'lumagua', 'tecelo', 'brilhoca'].forEach((id) => { LV.SPECIES[id].passivo = true; });
  /* modos de comando dos pets */
  LV.MODOS = {
    agressivo: { nome: LV.t('Agressivo'), desc: LV.t('Atacam todos os inimigos por perto') },
    defensor: { nome: LV.t('Defensor'), desc: LV.t('Atacam só quem atacar primeiro') },
    passivo: { nome: LV.t('Passivo'), desc: LV.t('Não atacam nenhum inimigo') },
  };
  /* talentos de captura perfeita: bônus permanente no pet capturado */
  LV.TALENTOS = {
    atk: { nome: LV.t('Feroz'), desc: (v) => '+' + Math.round(v * 100) + LV.t('% de ataque') },
    hp: { nome: LV.t('Robusto'), desc: (v) => '+' + Math.round(v * 100) + LV.t('% de vida') },
    spd: { nome: LV.t('Ágil'), desc: (v) => '+' + Math.round(v * 100) + LV.t('% de velocidade de ataque') },
  };

  /* peças ilustradas dos ataques dos Guardiões (img/ataques) */
  LV.ATAQUES_IMG = ['raiz', 'vinha', 'raizbaixa', 'esporo', 'gas', 'vagem', 'onda', 'respingo', 'arco', 'cristais', 'lasca', 'estilhacos',
    'bolafogo', 'chamas', 'corrente', 'correntechao', 'explosao', 'brasas'];
  /* peças ilustradas das habilidades e dos tiros das Centelhas (img/hab) */
  LV.HAB_IMG = ['explosao', 'brasacai', 'tiro_brasa', 'bolha', 'anelagua', 'tiro_mare', 'polen', 'folha', 'nuvem', 'tiro_musgo', 'corvo', 'tiro_sombra',
    'carapaca', 'lanca', 'tiro_cristal', 'teia', 'garra', 'estrela', 'sopro', 'mordida', 'vento', 'dreno', 'rodopio', 'eclipse'];
  /* lista de todas as imagens para pré-carregar */
  LV.IMAGENS = (function () {
    const l = [];
    for (const id in LV.SPECIES) for (let e = 0; e < 3; e++) l.push(LV.imgPet(id, e));
    for (const id in LV.HOSTIS) l.push(LV.HOSTIS[id].img);
    LV.MAPS.forEach((m) => l.push(m.chefe.img));
    ['parado', 'andando', 'pulando', 'lanterna'].forEach((k) => l.push(LV.HEROI[k]));
    for (const k in LV.PECAS) l.push('pecas/' + k);
    l.push('pecas/escada_mao');
    for (const k in LV.KITS || {}) ['pe', 'pm', 'pd', 'ct', 'cm', 'cb'].forEach((p) => l.push('kits/' + k + '/' + p));
    LV.ATAQUES_IMG.forEach((n) => l.push('ataques/' + n));
    LV.HAB_IMG.forEach((n) => l.push('hab/' + n));
    ['simples', 'candeia', 'cantante', 'cura', 'mares', 'explosiva', 'breu'].forEach((n) => { l.push('lanternas/' + n); l.push('lanternas/tiros/' + n); });
    return l;
  })();
  /* =========================================================
     LUGARES (v1.16): a Vila de Alvorada (lojas, trocas, Radiantes e Santuário) e o Campo de Treino
     (bonecos de vida infinita e medidor de dano por segundo). Não são profundezas: sem ninhos nem Guardião.
     base = mapa que empresta paleta, música e peças desenhadas à mão quando falta arte própria.
     ========================================================= */
  LV.LUGARES = {
    vila: { id: 'vila', nome: LV.t('Vila de Alvorada'), sub: LV.t('A última vila ainda acesa: lojas, trocas e o Santuário dos Ecos.'), tema: 'vila', base: 1, seed: 91,
      pal: { luz: '#ffe2a8', acento: '#ffc46b', nevoa: '#a8805a' } },
    treino: { id: 'treino', nome: LV.t('Campo de Treino'), sub: LV.t('Bonecos que nunca caem: teste as suas Centelhas e veja o dano por segundo.'), tema: 'treino', base: 0, seed: 97,
      pal: { luz: '#ffe9b8', acento: '#ffcf7a' } },
  };
  /* moradores da vila (e os prédios com que se fala). As posições ficam em nivel.gerarVila */
  LV.NPCS = {
    pavio: { nome: LV.t('Mestre Pavio'), papel: LV.t('Lanterneiro'), fala: LV.t('Lanterna boa é lanterna acesa. Leve quantas precisar para a descida.'), cor: '#ffc46b' },
    agulha: { nome: LV.t('Dona Agulha'), papel: LV.t('Costureira'), fala: LV.t('Uma capa nova não deixa ninguém mais forte, mas deixa mais bonito. Escolha com calma.'), cor: '#ff9ab8' },
    bigorna: { nome: LV.t('Mestre Bigorna'), papel: LV.t('Ferreiro'), fala: LV.t('Traga as moedas dos Guardiões e eu reforço o que você e as suas Centelhas têm.'), cor: '#ff8a52' },
    escambo: { nome: LV.t('Velho Escambo'), papel: LV.t('Trocador'), fala: LV.t('Musgo por esporo, esporo por escama... Tudo tem o seu preço, e o meu é justo.'), cor: '#9ef08a' },
    iris: { nome: LV.t('Zeladora Íris'), papel: LV.t('Guardiã das Radiantes'), fala: LV.t('Toda Radiante que você conquistou deixa um rastro de luz. Mesmo depois de um renascimento, eu sei trazê-la de volta.'), cor: '#ffe27a' },
    santuario: { nome: LV.t('Santuário dos Ecos'), papel: LV.t('Melhorias permanentes'), estrutura: true, cor: '#c8b8ff' },
    portao: { nome: LV.t('Campo de Treino'), papel: LV.t('Teste o dano das Centelhas'), estrutura: true, cor: '#ffd27a' },
    portal: { nome: LV.t('Vila de Alvorada'), papel: LV.t('Voltar à vila'), estrutura: true, cor: '#ffc46b' },
  };
  /* trocas do Velho Escambo: só entre materiais vizinhos (mapa a mapa).
     Descer (para o material do mapa seguinte) custa 5 por 1; subir (para o do mapa anterior) rende 2 por 1. */
  LV.TROCA = { ordem: ['musgo', 'esporo', 'escama', 'cristal', 'brasa'], sobe: 5, desce: 2 };
  /* taxa da Zeladora Íris para trazer de volta um Radiante de conquista que você não tem mais */
  LV.TAXA_RADIANTE = 50000;

  /* cenários pintados (Gemini), um por mapa: desenhados atrás de tudo com parallax lento */
  LV.FUNDOS = LV.MAPS.map((m) => 'fundos/' + m.tema);

  /* =========================================================
     BESTIÁRIO — todas as criaturas: selvagens, hostis e Guardiões.
     A chave de cada uma é a mesma usada nas contagens (espécie, id do hostil ou "chefe<n>").
     ========================================================= */
  const DESC_HOSTIS = {
    rastejante: LV.t('Breu que rasteja pelas raízes: escuridão completa, sem nenhuma luz dentro. Ataca em bando qualquer luz que chegue perto.'),
    fogofatuo: LV.t('Uma chama fria que não ilumina nada. Breu que imita a luz para atrair domadores para longe da trilha.'),
    casca: LV.t('Uma casca que perdeu toda a luz e ainda anda. Bate forte e quase não sente dor.'),
    vespa: LV.t('Breu feito da cinza que sobe do Coração. Dispara ferrões de brasa apagada de longe.'),
    soldado: LV.t('Breu de armadura que patrulha as ruínas, como se ainda obedecesse ao Povo do Lume.'),
    galho: LV.t('Breu que se veste de galho seco. Fica parado entre as raízes até alguém passar perto, e então agarra.'),
    mariposa: LV.t('Ronda as luzes do bosque sem nunca brilhar. Solta um pó escuro que apaga o que toca.'),
    bolor: LV.t('Um monte de bolor que aprendeu a andar. Lento e pesado, aguenta muitos golpes antes de cair.'),
    esporonegro: LV.t('Esporo do Rei Bolor que flutua sobre os túmulos. Cospe nuvens de escuridão de longe.'),
    afogado: LV.t('O que restou de quem ficou na capital quando a água subiu. Arrasta um gancho velho e não larga quem prende.'),
    enguia: LV.t('Nada no ar como se a capital ainda estivesse debaixo d’água. Rápida: morde e some.'),
    mineiro: LV.t('Cavava cristais para o Povo do Lume. A lâmpada do capacete apagou há muito tempo, mas ele continua cavando.'),
    olho: LV.t('Vigia as galerias escuras das minas. Quando encontra uma luz, dispara contra ela sem piscar.'),
    salamandra: LV.t('Nasce da cinza fria perto do Coração. Corre rente ao chão e morde com dentes de carvão.'),
    brasamorta: LV.t('Uma brasa que perdeu todo o calor. Pula de pedra em pedra e arremessa carvão apagado.'),
  };
  const DESC_CHEFES = [
    LV.t('A primeira raiz de Lumevale, que bombeia o Lume para o alto como seiva. Na febre, apertou as raízes e estrangulou o fluxo.'),
    LV.t('Cresce sobre os túmulos dos primeiros domadores e usa uma velha lanterna como coroa. Seus esporos apagam qualquer luz.'),
    LV.t('Guardiã da capital afogada. Ainda cumpre a última ordem que recebeu: ninguém desce às minas.'),
    LV.t('Mãe dos cristais. Seu canto segurava as rachaduras do Coração; agora ela canta para enterrar quem se aproxima.'),
    LV.t('O coração do vale, ferido e em febre. Não é mau: queima a própria luz para continuar vivo.'),
  ];
  LV.BESTIARIO = [];
  /* selvagens: uma entrada por forma (id "espécie_estágio"). Formas evoluídas aparecem na natureza nos ninhos de nível
     alto (a partir do 18 e do 40); nos mapas rasos só por evolução */
  const NV_FORMA = [0, 24, 46];
  for (const id in LV.SPECIES) {
    const sp = LV.SPECIES[id];
    for (let est = 0; est < 3; est++) {
      LV.BESTIARIO.push({ id: id + '_' + est, sp: id, est, tipo: 'selvagem', nome: sp.nome[est], formas: sp.nome, img: LV.imgPet(id, est), el: sp.el, desc: sp.desc,
        mapas: LV.MAPS.map((m, i) => (m.selvagens.includes(id) && m.lv[1] >= NV_FORMA[est] ? i : -1)).filter((i) => i >= 0) });
    }
  }
  for (const id in LV.HOSTIS) {
    const h = LV.HOSTIS[id];
    LV.BESTIARIO.push({ id, tipo: 'hostil', nome: h.nome, img: h.img, desc: DESC_HOSTIS[id] || '',
      mapas: LV.MAPS.map((m, i) => (m.hostis.includes(id) ? i : -1)).filter((i) => i >= 0) });
  }
  LV.MAPS.forEach((m, i) => {
    LV.BESTIARIO.push({ id: 'chefe' + i, tipo: 'chefe', nome: m.chefe.nome, img: m.chefe.img, el: m.chefe.el, desc: DESC_CHEFES[i], mapas: [i] });
  });
  LV.besta = (id) => LV.BESTIARIO.find((b) => b.id === id);
  /* nome de quem recebe um bônus: espécie (forma inicial), hostil ou Guardião */
  LV.nomeAlvo = (id) => (LV.SPECIES[id] ? LV.SPECIES[id].nome[0] : LV.HOSTIS[id] ? LV.HOSTIS[id].nome : (LV.besta(id) || {}).nome || id);
  /* chaves válidas do bestiário: cada forma/criatura + as espécies (contagens que somam todas as formas) */
  LV.CHAVES_BEST = LV.BESTIARIO.map((b) => b.id).concat(Object.keys(LV.SPECIES));

  /* =========================================================
     CONQUISTAS — guardadas no Santuário (valem para sempre, mesmo depois de renascer).
     rec: { lanternas, lumes, ecos, pet: espécie (pet Radiante), buff: { tipo: 'dano'|'defesa', alvo, v } }
     ========================================================= */
  const C = (LV.CONQUISTAS = []);
  const best = (s, id, k) => ((s.meta.best[id] || {})[k] || 0);
  [[10, LV.t('Primeiros passos'), { lanternas: 2 }], [250, LV.t('Caçador'), { lumes: 800 }], [1000, LV.t('Veterano das trilhas'), { lanternas: 5, lumes: 4000 }], [5000, LV.t('Lenda das profundezas'), { lanternas: 10, lumes: 40000 }]]
    .forEach(([n, nome, rec]) => C.push({ id: 'abates' + n, cat: LV.t('Caçadas'), nome, desc: LV.t('Derrote ') + n.toLocaleString(LV.locale) + LV.t(' criaturas'), meta: n, prog: (s) => s.meta.tot.kills, rec }));
  [[1, LV.t('Primeira lanterna'), { lanternas: 3 }], [10, LV.t('Colecionador'), { lanternas: 5 }], [50, LV.t('Mestre das lanternas'), { lanternas: 15, lumes: 5000 }]]
    .forEach(([n, nome, rec]) => C.push({ id: 'capt' + n, cat: LV.t('Capturas'), nome, desc: LV.t('Capture ') + n + (n === 1 ? LV.t(' criatura') : LV.t(' criaturas')), meta: n, prog: (s) => s.meta.tot.capt, rec }));
  [[1, LV.t('Metamorfose'), { lumes: 1500 }], [10, LV.t('Mestre das formas'), { lumes: 20000, lanternas: 5 }]]
    .forEach(([n, nome, rec]) => C.push({ id: 'evo' + n, cat: LV.t('Capturas'), nome, desc: LV.t('Evolua ') + n + (n === 1 ? LV.t(' Centelha') : LV.t(' Centelhas')), meta: n, prog: (s) => s.meta.tot.evo, rec }));
  [[10, LV.t('Aprendiz de Lume'), { lanternas: 3 }], [25, LV.t('Domador'), { lumes: 5000 }], [40, LV.t('Domador veterano'), { lanternas: 8, lumes: 20000 }], [60, LV.t('Mestre das profundezas'), { lumes: 150000, ecos: 5 }]]
    .forEach(([n, nome, rec]) => C.push({ id: 'nivel' + n, cat: LV.t('Domador'), nome, desc: LV.t('Alcance o nível ') + n + LV.t(' do domador'), meta: n, prog: (s) => Math.max(s.meta.recorde, s.dom.nivel), rec }));
  [[1, LV.t('Recomeço'), { ecos: 3 }], [5, LV.t('Eterno retorno'), { ecos: 15 }]]
    .forEach(([n, nome, rec]) => C.push({ id: 'renasc' + n, cat: LV.t('Domador'), nome, desc: LV.t('Renasça ') + n + (n === 1 ? LV.t(' vez') : LV.t(' vezes')), meta: n, prog: (s) => s.meta.renasc, rec }));
  LV.MAPS.forEach((m, i) => {
    const id = 'chefe' + i;
    C.push({ id: 'chefe' + i + 'a', cat: LV.t('Guardiões'), nome: LV.t('Queda de ') + m.chefe.nome, desc: LV.t('Derrote ') + m.chefe.nome, meta: 1, prog: (s) => best(s, id, 'k'), rec: { lanternas: 3 + i, lumes: [800, 3000, 12000, 50000, 200000][i] }, alvo: id });
    C.push({ id: 'chefe' + i + 'b', cat: LV.t('Guardiões'), nome: LV.t('Algoz de ') + m.chefe.nome, desc: LV.t('Derrote ') + m.chefe.nome + LV.t(' 10 vezes'), meta: 10, prog: (s) => best(s, id, 'k'), rec: { buff: { tipo: 'dano', alvo: id, v: 0.25 } }, alvo: id });
  });
  for (const hid in LV.HOSTIS) {
    const h = LV.HOSTIS[hid];
    C.push({ id: hid + 'd', cat: LV.t('Breus'), nome: LV.t('Couraça contra ') + h.nome, desc: LV.t('Derrote 100 ') + h.nome, meta: 100, prog: (s) => best(s, hid, 'k'), rec: { buff: { tipo: 'defesa', alvo: hid, v: 0.2 } }, alvo: hid });
    C.push({ id: hid + 'a', cat: LV.t('Breus'), nome: LV.t('Flagelo de ') + h.nome, desc: LV.t('Derrote 400 ') + h.nome, meta: 400, prog: (s) => best(s, hid, 'k'), rec: { buff: { tipo: 'dano', alvo: hid, v: 0.2 } }, alvo: hid });
  }
  for (const sp in LV.SPECIES) {
    const nome = LV.SPECIES[sp].nome[0];
    C.push({ id: sp + 'k', cat: LV.t('Selvagens'), nome: LV.t('Conhecer ') + nome, desc: LV.t('Derrote 50 ') + nome, meta: 50, prog: (s) => best(s, sp, 'k'), rec: { buff: { tipo: 'dano', alvo: sp, v: 0.15 } }, alvo: sp });
    C.push({ id: sp + 'c', cat: LV.t('Selvagens'), nome: nome + LV.t(' Radiante'), desc: LV.t('Capture 20 ') + nome, meta: 20, prog: (s) => best(s, sp, 'c'), rec: { pet: sp }, alvo: sp });
  }
  /* =========================================================
     CAPAS DO DOMADOR (aba Domador → Equipamento).
     Comuns: só visuais e para sempre — vêm das conquistas ou da Loja (compra única, paga com Lumes).
     ========================================================= */
  LV.CAPAS = [
    { id: 'padrao', nome: LV.t('Capa de Viajante'), desc: LV.t('A capa de sempre, gasta de tantas trilhas.') },
    { id: 'penas', nome: LV.t('Manto de Penas'), desc: LV.t('Penas de corvo costuradas uma a uma.'), conq: 'capt10' },
    { id: 'lampiao', nome: LV.t('Poncho de Lã'), desc: LV.t('Tricotado à luz de lampião, com franjas e pompom.'), loja: { lumes: 6000 } },
    { id: 'estrelada', nome: LV.t('Capa Estrelada'), desc: LV.t('Constelações bordadas em fio de prata.'), conq: 'renasc1' },
    { id: 'cogumelo', nome: LV.t('Capuz de Cogumelo'), desc: LV.t('Um chapéu de cogumelo que alguém transformou em capuz.'), loja: { lumes: 30000 } },
    { id: 'escamas', nome: LV.t('Manto de Escamas'), desc: LV.t('Escamas que brilham como a água da Cidade Afogada.'), conq: 'nivel40' },
    { id: 'real', nome: LV.t('Capa Real'), desc: LV.t('Veludo carmim, gola de pele e uma coroinha torta.'), conq: 'abates5000' },
    { id: 'marfim', nome: LV.t('Manto de Marfim'), desc: LV.t('Bordado em prata, com a barra sempre acesa.'), conq: 'renasc5' },
    // dos Guardiões: caem na primeira vitória de cada jornada, mudam a aparência E os status (somem ao renascer)
    { id: 'raizes', nome: LV.t('Manto de Raízes'), desc: LV.t('Tecido pela própria Mãe-Raiz. A seiva dourada fecha as feridas.'), chefe: 0, bonus: { vida: 0.3, regen: 1 },
      efeito: LV.t('+30% de vida do domador e o dobro de regeneração') },
    { id: 'brasao', nome: LV.t('Brasão da Sentinela'), desc: LV.t('O tabardo da guarda da cidade submersa, com o brasão da lanterna.'), chefe: 2, bonus: { defesa: 0.25 },
      efeito: LV.t('O domador recebe 25% menos dano') },
    { id: 'coracao', nome: LV.t('Manto do Coração'), desc: LV.t('Ainda quente por dentro. As rachaduras brilham como brasa.'), chefe: 4, bonus: { dano: 0.12 },
      efeito: LV.t('+12% de dano do domador e das Centelhas') },
  ];
  LV.capa = (id) => LV.CAPAS.find((c) => c.id === id);
  /* =========================================================
     LANTERNAS DO DOMADOR — cada uma muda o golpe da lanterna.
     Loja: valem só nesta jornada (somem ao renascer, como as melhorias). Conquistas: para sempre.
     ay = altura do centro do vidro na imagem (para cobrir a lanterna do desenho do domador)
     ========================================================= */
  LV.LANTERNAS = [
    { id: 'simples', nome: LV.t('Lanterna Simples'), desc: LV.t('Um feixe de luz quente contra um alvo.'), cor: '#ffc47a', feixe: '#ffd38a', ay: 0.6 },
    { id: 'candeia', nome: LV.t('Lanterna de Candeia'), desc: LV.t('A lanterna que Candeia levou para baixo. A chama nunca treme.'), chefe: 1, cor: '#ffb43c', feixe: '#ffcf5a', mult: 1.6, ay: 0.62,
      efeito: LV.t('+60% de dano do golpe da lanterna') },
    { id: 'cantante', nome: LV.t('Lanterna Cantante'), desc: LV.t('Cristal da Matriarca que ainda canta. O feixe atravessa tudo.'), chefe: 3, cor: '#ee9cff', feixe: '#f6c6ff', el: 'cristal', fura: 3, ay: 0.55,
      efeito: LV.t('Feixe de cristal que atravessa até 3 criaturas em linha') },
    { id: 'cura', nome: LV.t('Lanterna de Cura'), desc: LV.t('Uma luz verde e mansa que não fere ninguém.'), loja: { lumes: 15000, moeda: 'trufa', q: 10 }, cor: '#9dffb0', feixe: '#b8ffc4', cura: 0.08, ay: 0.58,
      efeito: LV.t('Não ataca: a cada 4 s cura 8% da vida do domador e das Centelhas') },
    { id: 'mares', nome: LV.t('Lanterna das Marés'), desc: LV.t('Guarda uma onda presa no vidro.'), loja: { lumes: 60000, moeda: 'perola', q: 12 }, cor: '#62c9ff', feixe: '#a8e6ff', el: 'mare', lento: 3, ay: 0.6,
      efeito: LV.t('Golpe de maré que deixa o alvo lento por 3 s') },
    { id: 'explosiva', nome: LV.t('Lanterna Explosiva'), desc: LV.t('Brasa viva presa num vidro rachado.'), conq: 'brasa5000', cor: '#ff8a3a', feixe: '#ffb070', el: 'brasa', area: 85, ay: 0.6,
      efeito: LV.t('Explosão de brasa em área que deixa as criaturas queimando') },
    { id: 'breu', nome: LV.t('Lanterna de Breu'), desc: LV.t('Uma chama roxa que apaga a força de quem toca.'), conq: 'breus2000', cor: '#a99bff', feixe: '#c8bcff', el: 'sombra', fraco: 4, ay: 0.6,
      efeito: LV.t('Golpe de sombra que enfraquece o alvo (−30% de dano) por 4 s') },
  ];
  LV.lanternaEq = (id) => LV.LANTERNAS.find((c) => c.id === id);
  LV.imgLanterna = (id) => 'lanternas/' + id;
  /* item temático da PRIMEIRA vitória contra cada Guardião em cada jornada (somem ao renascer) */
  LV.ITEM_CHEFE = [{ tipo: 'capa', id: 'raizes' }, { tipo: 'lanterna', id: 'candeia' }, { tipo: 'capa', id: 'brasao' }, { tipo: 'lanterna', id: 'cantante' }, { tipo: 'capa', id: 'coracao' }];
  LV.itemDef = (it) => (it.tipo === 'capa' ? LV.capa(it.id) : LV.lanternaEq(it.id));
  LV.imgItem = (it) => (it.tipo === 'capa' ? LV.imgCapa(it.id) : LV.imgLanterna(it.id));
  LV.imgCapa = (id, pose) => (id && id !== 'padrao' ? 'heroi/capas/' + id + '/' : 'heroi/') + (pose || 'parado');
  /* capas das conquistas entram na recompensa delas */
  LV.CAPAS.forEach((k) => { if (k.conq) { const c = C.find((x) => x.id === k.conq); if (c) c.rec = Object.assign({}, c.rec, { capa: k.id }); } });
  /* lanternas das conquistas novas */
  C.push({ id: 'brasa5000', cat: LV.t('Caçadas'), nome: LV.t('Domador de Chamas'), desc: LV.t('Derrote ') + (5000).toLocaleString(LV.locale) + LV.t(' criaturas de brasa'), meta: 5000, prog: (s) => s.meta.tot.brasa || 0, rec: { lanterna: 'explosiva' } });
  C.push({ id: 'breus2000', cat: LV.t('Breus'), nome: LV.t('Apagador de Breus'), desc: LV.t('Derrote ') + (2000).toLocaleString(LV.locale) + LV.t(' Breus'), meta: 2000, prog: (s) => s.meta.tot.breus || 0, rec: { lanterna: 'breu' } });
  /* conquista da Radiante achada numa captura (v1.17): dá título */
  C.push({ id: 'radiante1', cat: LV.t('Capturas'), nome: LV.t('Brilho Raro'), desc: LV.t('Capture uma Centelha Radiante'), meta: 1, prog: (s) => s.meta.tot.radCapt || 0, rec: { lanternas: 5 } });
  LV.conquista = (id) => C.find((c) => c.id === id);
  /* chance de toda captura vir Radiante (v1.17): a única Centelha rara do jogo */
  LV.CHANCE_RADIANTE = 0.005;

  /* =========================================================
     TÍTULOS (v1.17) — cada um sai de uma conquista (ao resgatar a recompensa) e dá um bônus.
     Só um fica equipado (no Perfil). Quanto mais difícil a conquista, maior o bônus.
     b: xp, xpPet, vidaPet, danoPet, coleta, captura, radiante (pontos de chance), defBrasa, danoBreus, danoChefe, ecos
     ========================================================= */
  LV.TITULOS = [
    { id: 'chama', nome: LV.t('Chama Nova'), conq: 'nivel10', b: { xp: 0.05 } },
    { id: 'colecionador', nome: LV.t('Colecionador'), conq: 'capt10', b: { captura: 0.03 } },
    { id: 'guia', nome: LV.t('Guia de Centelhas'), conq: 'nivel25', b: { vidaPet: 0.05 } },
    { id: 'firme', nome: LV.t('Lanterna Firme'), conq: 'nivel40', b: { danoPet: 0.05 } },
    { id: 'trilhas', nome: LV.t('Caçador das Trilhas'), conq: 'abates1000', b: { coleta: 0.08 } },
    { id: 'renascido', nome: LV.t('Renascido'), conq: 'renasc1', b: { ecos: 0.05 } },
    { id: 'formas', nome: LV.t('Mestre das Formas'), conq: 'evo10', b: { xpPet: 0.1 } },
    { id: 'lanterneiro', nome: LV.t('Mestre das Lanternas'), conq: 'capt50', b: { captura: 0.06 } },
    { id: 'luzfundo', nome: LV.t('Luz das Profundezas'), conq: 'nivel60', b: { danoPet: 0.1 } },
    { id: 'coracao', nome: LV.t('Curandeiro do Coração'), conq: 'chefe4a', b: { danoChefe: 0.1 } },
    { id: 'apagador', nome: LV.t('Apagador de Breus'), conq: 'breus2000', b: { danoBreus: 0.12 } },
    { id: 'chamas', nome: LV.t('Domador de Chamas'), conq: 'brasa5000', b: { defBrasa: 0.15 } },
    { id: 'eterno', nome: LV.t('Eterno Retorno'), conq: 'renasc5', b: { ecos: 0.12 } },
    { id: 'brilho', nome: LV.t('Portador do Brilho'), conq: 'radiante1', b: { radiante: 0.0025 } },
    { id: 'lenda', nome: LV.t('Lenda das Profundezas'), conq: 'abates5000', b: { danoPet: 0.12, vidaPet: 0.12 } },
  ];
  LV.titulo = (id) => LV.TITULOS.find((t) => t.id === id);
  LV.TITULOS.forEach((t) => { const c = C.find((x) => x.id === t.conq); if (c) c.rec = Object.assign({}, c.rec, { titulo: t.id }); });
  LV.textoTitulo = function (b) {
    const p = (v) => (Math.round(v * 10000) / 100).toLocaleString(LV.locale) + '%', t = [];
    if (b.xp) t.push('+' + p(b.xp) + LV.t(' de XP do domador'));
    if (b.xpPet) t.push('+' + p(b.xpPet) + LV.t(' de XP das Centelhas'));
    if (b.danoPet) t.push('+' + p(b.danoPet) + LV.t(' de dano das Centelhas'));
    if (b.vidaPet) t.push('+' + p(b.vidaPet) + LV.t(' de vida das Centelhas'));
    if (b.coleta) t.push('+' + p(b.coleta) + LV.t(' de Lumes e materiais'));
    if (b.captura) t.push('+' + p(b.captura) + LV.t(' de chance de captura'));
    if (b.radiante) t.push('+' + p(b.radiante) + LV.t(' de chance de a captura vir Radiante'));
    if (b.defBrasa) t.push('−' + p(b.defBrasa) + LV.t(' de dano recebido de criaturas de brasa'));
    if (b.danoBreus) t.push('+' + p(b.danoBreus) + LV.t(' de dano contra Breus'));
    if (b.danoChefe) t.push('+' + p(b.danoChefe) + LV.t(' de dano contra Guardiões'));
    if (b.ecos) t.push('+' + p(b.ecos) + LV.t(' de Ecos ao renascer'));
    return t.join(' · ');
  };

  /* =========================================================
     SKILLS DO DOMADOR (v1.17) — ativas, com recarga, usadas pelos botões do HUD (ou teclas 4 a 8).
     Cada nível do domador dá 1 ponto de skill. Liberar custa 1 ponto; subir de nível custa 1 (até o 4), 2 (até o 7) e 3 (até o 10).
     nv: nível do domador para liberar. v / v2: força do efeito no nível n.
     ========================================================= */
  LV.SKILL_MAX = 10;
  LV.custoSkill = (n) => (n < 4 ? 1 : n < 7 ? 2 : 3);
  const pcS = (v) => Math.round(v * 100) + '%', sgS = (v) => (Math.round(v * 10) / 10).toLocaleString(LV.locale) + ' s';
  LV.SKILLS = [
    { id: 'brado', nome: LV.t('Brado de Comando'), nv: 3, tecla: '4', cor: '#ff8a6b',
      dur: (n) => 8 + 0.4 * (n - 1), cd: (n) => 60 - 2 * (n - 1), v: (n) => 0.2 + 0.04 * (n - 1),
      desc: (n, k) => LV.t('Todas as Centelhas causam +') + pcS(k.v(n)) + LV.t(' de dano por ') + sgS(k.dur(n)) + '.' },
    { id: 'olhar', nome: LV.t('Olhar Certeiro'), nv: 5, tecla: '5', cor: '#ffe27a',
      dur: (n) => 10 + 0.5 * (n - 1), cd: (n) => 120 - 4 * (n - 1), v: (n) => 0.08 + 0.02 * (n - 1),
      desc: (n, k) => LV.t('+') + pcS(k.v(n)) + LV.t(' de chance de captura da lanterna por ') + sgS(k.dur(n)) + LV.t(' (o tempo para enquanto você mira).') },
    { id: 'ritmo', nome: LV.t('Ritmo do Lume'), nv: 10, tecla: '6', cor: '#7fd8ff',
      dur: (n) => 8 + 0.4 * (n - 1), cd: (n) => 75 - 2.5 * (n - 1), v: (n) => 0.2 + 0.03 * (n - 1), v2: (n) => 0.5 + 0.05 * (n - 1),
      desc: (n, k) => LV.t('As Centelhas atacam ') + pcS(k.v(n)) + LV.t(' mais rápido e os ataques especiais recarregam ') + pcS(k.v2(n)) + LV.t(' mais rápido por ') + sgS(k.dur(n)) + '.' },
    { id: 'manto', nome: LV.t('Manto de Luz'), nv: 15, tecla: '7', cor: '#a8f0c0',
      dur: (n) => 6 + 0.3 * (n - 1), cd: (n) => 90 - 3 * (n - 1), v: (n) => 0.15 + 0.02 * (n - 1), v2: (n) => 0.25 + 0.02 * (n - 1),
      desc: (n, k) => LV.t('Cura ') + pcS(k.v(n)) + LV.t(' da vida do domador e de todas as Centelhas e reduz o dano recebido em ') + pcS(k.v2(n)) + LV.t(' por ') + sgS(k.dur(n)) + '.' },
    { id: 'colheita', nome: LV.t('Colheita Dourada'), nv: 20, tecla: '8', cor: '#f0cf86',
      dur: (n) => 20 + (n - 1), cd: (n) => 150 - 5 * (n - 1), v: (n) => 0.3 + 0.07 * (n - 1), v2: (n) => 0.15 + 0.03 * (n - 1),
      desc: (n, k) => LV.t('Puxa todos os itens do chão. Por ') + sgS(k.dur(n)) + LV.t(': +') + pcS(k.v(n)) + LV.t(' de Lumes e materiais e +') + pcS(k.v2(n)) + LV.t(' de XP do domador e das Centelhas.') },
  ];
  LV.skill = (id) => LV.SKILLS.find((k) => k.id === id);
  LV.descSkill = (k, n) => k.desc(Math.max(1, n), k) + LV.t(' Recarga ') + sgS(k.cd(Math.max(1, n))) + '.';
  LV.CAT_CONQ = [LV.t('Caçadas'), LV.t('Capturas'), LV.t('Domador'), LV.t('Guardiões'), LV.t('Breus'), LV.t('Selvagens')];
  /* pet Radiante (recompensa): +30% de vida e ataque, +10% de velocidade e um brilho dourado */
  LV.RADIANTE = { hp: 1.3, atk: 1.3, spd: 1.1 };
  LV.nomePet = (p) => p.apelido || LV.SPECIES[p.sp].nome[p.est] + (p.especial ? LV.t(' Radiante') : '');
  LV.textoRecompensa = function (r) {
    const t = [];
    if (r.lanternas) t.push(r.lanternas + LV.t(' lanternas'));
    if (r.lumes) t.push(r.lumes.toLocaleString(LV.locale) + LV.t(' Lumes'));
    if (r.ecos) t.push(r.ecos + LV.t(' Ecos'));
    if (r.pet) t.push(LV.SPECIES[r.pet].nome[0] + LV.t(' Radiante (+30% vida e ataque)'));
    if (r.capa) t.push(LV.t('Capa: ') + LV.capa(r.capa).nome);
    if (r.lanterna && LV.lanternaEq) t.push(LV.t('Lanterna: ') + LV.lanternaEq(r.lanterna).nome);
    if (r.titulo && LV.titulo) t.push(LV.t('Título: ') + LV.titulo(r.titulo).nome);
    if (r.buff) {
      const nome = LV.nomeAlvo(r.buff.alvo);
      t.push((r.buff.tipo === 'dano' ? '+' + Math.round(r.buff.v * 100) + LV.t('% de dano contra ') : '−' + Math.round(r.buff.v * 100) + LV.t('% de dano recebido de ')) + nome);
    }
    return t.join(' · ');
  };
})();
