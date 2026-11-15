'use strict';
/* O Lumevale mudou para https://lumevale.com.br/. Este service worker troca o app antigo (guardado no aparelho) pela página que
   leva cada jogador, com os saves, para o endereço novo. Gerado por publicar_site_antigo.js. */
// o jogo antigo pede a troca com 'atualizar' (no menu na hora; durante o jogo pelo botão Atualizar, que salva antes)
self.addEventListener('message', (e) => { if (e.data === 'atualizar') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
    // páginas que ainda mostram o jogo antigo recarregam (o jogo salva ao sair da página)
    .then(() => new Promise((ok) => setTimeout(ok, 1500)))
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then((cs) => Promise.all(cs.map((c) => (c.navigate ? c.navigate(c.url).catch(() => null) : null)))));
});
