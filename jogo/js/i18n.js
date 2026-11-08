'use strict';
/* Lumevale — idiomas. O texto em português é a própria chave: LV.t('Fechar') devolve 'Close' em inglês.
   O idioma vem das Configurações (lumevale.config) ou, na primeira vez, do idioma do sistema.
   Trocar de idioma recarrega a página (os dados do jogo são montados já traduzidos). */
(function () {
  const LV = (window.LV = window.LV || {});
  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('lumevale.config') || '{}') || {}; } catch (e) { cfg = {}; }
  const sistema = String((navigator.languages && navigator.languages[0]) || navigator.language || 'pt').toLowerCase();
  LV.IDIOMAS = { pt: 'Português', en: 'English' };
  LV.idioma = LV.IDIOMAS[cfg.idioma] ? cfg.idioma : sistema.startsWith('pt') ? 'pt' : 'en';
  LV.locale = LV.idioma === 'en' ? 'en-US' : 'pt-BR';
  LV.decSep = LV.idioma === 'en' ? '.' : ',';
  LV.EN = LV.EN || {};
  LV.faltando = new Set();       // textos sem tradução encontrados nesta sessão (para revisão)
  LV.t = function (pt) {
    if (LV.idioma !== 'en' || pt == null) return pt;
    const v = LV.EN[pt];
    if (v != null) return v;
    if (/[A-Za-zÀ-ú]{2,}/.test(String(pt).replace(/<[^>]*>/g, ''))) LV.faltando.add(pt);
    return pt;
  };
  try { document.documentElement.lang = LV.idioma === 'en' ? 'en' : 'pt-BR'; } catch (e) { /* sem documento */ }

  /* traduz os textos fixos do index.html (rótulos, title, aria-label, placeholder) */
  LV.traduzirPagina = function (raiz) {
    if (LV.idioma === 'pt' || !raiz) return;
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (w.nextNode()) nos.push(w.currentNode);
    nos.forEach((n) => {
      const k = n.nodeValue.trim();
      if (!k || !/[A-Za-zÀ-ú]{2,}/.test(k) || (n.parentNode && n.parentNode.closest && n.parentNode.closest('script, style'))) return;
      const v = LV.t(k);
      if (v !== k) n.nodeValue = n.nodeValue.replace(k, v);
    });
    raiz.querySelectorAll('[title], [aria-label], [placeholder]').forEach((e) => {
      ['title', 'aria-label', 'placeholder'].forEach((a) => {
        const k = e.getAttribute(a);
        if (!k) return;
        const v = LV.t(k);
        if (v !== k) e.setAttribute(a, v);
      });
    });
  };

  /* troca de idioma: salva, guarda onde o jogador estava e recarrega a página */
  LV.trocarIdioma = function (id, vista) {
    if (!LV.IDIOMAS[id] || id === LV.idioma) return;
    try {
      const c = JSON.parse(localStorage.getItem('lumevale.config') || '{}') || {};
      Object.assign(c, LV.config || {}, { idioma: id });
      localStorage.setItem('lumevale.config', JSON.stringify(c));
      const g = LV.game;
      if (LV.salvar) LV.salvar(false);
      localStorage.setItem('lumevale.retomar', JSON.stringify({ slot: g && g.slot ? g.slot : null, vista: vista || 'menu', t: Date.now() }));
    } catch (e) { /* sem armazenamento: só recarrega */ }
    location.reload();
  };
  /* depois da recarga: em qual espaço o jogador estava (vale por 30 s) */
  LV.lerRetomada = function () {
    try {
      const r = JSON.parse(localStorage.getItem('lumevale.retomar') || 'null');
      localStorage.removeItem('lumevale.retomar');
      return r && Date.now() - r.t < 30000 ? r : null;
    } catch (e) { return null; }
  };
})();
