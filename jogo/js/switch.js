'use strict';
/* Lumevale no Nintendo Switch (v1.19). O jogo roda no navegador do console aberto por um app nx.js (ferramentas/
   switch/), que fica rodando por trás e conversa com a página por window.nx (só existe dentro desse app).
   - Antes de o jogo ler os saves, pede ao app o que está guardado no cartão SD e coloca no localStorage.
   - Tudo o que o jogo grava com o prefixo "lumevale" vai também para o cartão (o localStorage do navegador do
     console pode não sobreviver ao fechar o app).
   Fora do Switch este arquivo não faz nada. */
(function () {
  const nx = window.nx;
  if (!nx || typeof nx.sendMessage !== 'function') return;
  window.LV_PLATAFORMA = 'switch';
  const PREF = 'lumevale';
  const setOrig = Storage.prototype.setItem, remOrig = Storage.prototype.removeItem;
  const enviar = (o) => { try { nx.sendMessage(JSON.stringify(o)); } catch (e) { /* sem ponte */ } };
  const ouvintes = [];
  const receber = (dado) => {
    let m; try { m = JSON.parse(typeof dado === 'string' ? dado : dado && dado.data); } catch (e) { return; }
    if (m) ouvintes.forEach((f) => f(m));
  };
  if (typeof nx.addEventListener === 'function') nx.addEventListener('message', (e) => receber(e && e.data !== undefined ? e.data : e));
  else nx.onMessage = receber;
  // o jogo só começa depois de receber os saves (ou de 4 s sem resposta)
  window.LV_ESPERA = new Promise((ok) => {
    const fim = setTimeout(ok, 4000);
    ouvintes.push((m) => {
      if (m.tipo !== 'saves') return;
      try { for (const k in m.dados || {}) setOrig.call(window.localStorage, k, m.dados[k]); } catch (e) { /* sem armazenamento */ }
      clearTimeout(fim); ok();
    });
    enviar({ tipo: 'carregar' });
  });
  // gravações do jogo também vão para o cartão SD, juntas a cada 0,8 s
  const pend = new Map(); let timer = 0;
  const descarregar = () => {
    timer = 0;
    for (const [k, v] of pend) enviar(v === null ? { tipo: 'apagar', k } : { tipo: 'salvar', k, v });
    pend.clear();
  };
  const marcar = (k, v) => { pend.set(k, v); if (!timer) timer = setTimeout(descarregar, 800); };
  Storage.prototype.setItem = function (k, v) {
    setOrig.call(this, k, v);
    if (this === window.localStorage && String(k).startsWith(PREF)) marcar(String(k), String(v));
  };
  Storage.prototype.removeItem = function (k) {
    remOrig.call(this, k);
    if (this === window.localStorage && String(k).startsWith(PREF)) marcar(String(k), null);
  };
  window.addEventListener('pagehide', descarregar);
  window.LV_SWITCH = { enviar, descarregar, sair: () => { descarregar(); enviar({ tipo: 'sair' }); } };
})();
