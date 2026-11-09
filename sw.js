'use strict';
/* Lumevale — guarda o jogo no aparelho e troca de versão quando o jogador aceita (ou no menu, na hora). Gerado por montar_site.js. */
const VERSAO = '1.11.4-092e5d308d';
const CACHE = 'lumevale-' + VERSAO;
const ARQUIVOS = ["./","jogo/","icones/apple-180.png","icones/icone-192.png","icones/icone-512.png","icones/icone-mascara-512.png","index.html","jogo/audio/brilho.mp3","jogo/audio/captura.mp3","jogo/audio/chefe.mp3","jogo/audio/clique.mp3","jogo/audio/desmaio.mp3","jogo/audio/escapou.mp3","jogo/audio/evolucao.mp3","jogo/audio/golpe.mp3","jogo/audio/impacto.mp3","jogo/audio/lanterna.mp3","jogo/audio/moeda.mp3","jogo/audio/nivel.mp3","jogo/fontes/f1.woff2","jogo/fontes/f10.woff2","jogo/fontes/f11.woff2","jogo/fontes/f2.woff2","jogo/fontes/f3.woff2","jogo/fontes/f4.woff2","jogo/fontes/f5.woff2","jogo/fontes/f6.woff2","jogo/fontes/f7.woff2","jogo/fontes/f8.woff2","jogo/fontes/f9.woff2","jogo/fontes/fontes.css","jogo/img/ataques/arco.webp","jogo/img/ataques/bolafogo.webp","jogo/img/ataques/brasas.webp","jogo/img/ataques/chamas.webp","jogo/img/ataques/corrente.webp","jogo/img/ataques/correntechao.webp","jogo/img/ataques/cristais.webp","jogo/img/ataques/esporo.webp","jogo/img/ataques/estilhacos.webp","jogo/img/ataques/explosao.webp","jogo/img/ataques/gas.webp","jogo/img/ataques/lasca.webp","jogo/img/ataques/onda.webp","jogo/img/ataques/raiz.webp","jogo/img/ataques/raizbaixa.webp","jogo/img/ataques/respingo.webp","jogo/img/ataques/vagem.webp","jogo/img/ataques/vinha.webp","jogo/img/chefes/coracao.webp","jogo/img/chefes/maeraiz.webp","jogo/img/chefes/matriarca.webp","jogo/img/chefes/reibolor.webp","jogo/img/chefes/sentinela.webp","jogo/img/fundos/cinzas.webp","jogo/img/fundos/cristais.webp","jogo/img/fundos/fungos.webp","jogo/img/fundos/raizes.webp","jogo/img/fundos/ruinas.webp","jogo/img/heroi/andando.webp","jogo/img/heroi/lanterna.webp","jogo/img/heroi/parado.webp","jogo/img/heroi/pulando.webp","jogo/img/inimigos/afogado.webp","jogo/img/inimigos/bolor.webp","jogo/img/inimigos/brasamorta.webp","jogo/img/inimigos/casca.webp","jogo/img/inimigos/enguia.webp","jogo/img/inimigos/esporonegro.webp","jogo/img/inimigos/fogofatuo.webp","jogo/img/inimigos/galho.webp","jogo/img/inimigos/mariposa.webp","jogo/img/inimigos/mineiro.webp","jogo/img/inimigos/olho.webp","jogo/img/inimigos/rastejante.webp","jogo/img/inimigos/salamandra.webp","jogo/img/inimigos/soldado.webp","jogo/img/inimigos/vespa.webp","jogo/img/pecas/borda.webp","jogo/img/pecas/cogumelos.webp","jogo/img/pecas/corrente.webp","jogo/img/pecas/cristais.webp","jogo/img/pecas/escada.webp","jogo/img/pecas/escada_mao.webp","jogo/img/pecas/laje.webp","jogo/img/pecas/lapide.webp","jogo/img/pecas/pilar.webp","jogo/img/pecas/plat_madeira.webp","jogo/img/pecas/plat_raiz.webp","jogo/img/pecas/poste.webp","jogo/img/pets/brilhoca_0.webp","jogo/img/pets/brilhoca_1.webp","jogo/img/pets/brilhoca_2.webp","jogo/img/pets/cinzelo_0.webp","jogo/img/pets/cinzelo_1.webp","jogo/img/pets/cinzelo_2.webp","jogo/img/pets/esporito_0.webp","jogo/img/pets/esporito_1.webp","jogo/img/pets/esporito_2.webp","jogo/img/pets/fagulho_0.webp","jogo/img/pets/fagulho_1.webp","jogo/img/pets/fagulho_2.webp","jogo/img/pets/gotim_0.webp","jogo/img/pets/gotim_1.webp","jogo/img/pets/gotim_2.webp","jogo/img/pets/lascado_0.webp","jogo/img/pets/lascado_1.webp","jogo/img/pets/lascado_2.webp","jogo/img/pets/lumagua_0.webp","jogo/img/pets/lumagua_1.webp","jogo/img/pets/lumagua_2.webp","jogo/img/pets/muscolino_0.webp","jogo/img/pets/muscolino_1.webp","jogo/img/pets/muscolino_2.webp","jogo/img/pets/tecelo_0.webp","jogo/img/pets/tecelo_1.webp","jogo/img/pets/tecelo_2.webp","jogo/img/pets/umbrim_0.webp","jogo/img/pets/umbrim_1.webp","jogo/img/pets/umbrim_2.webp","jogo/index.html","jogo/js/admin.js","jogo/js/ajuda.js","jogo/js/art.js","jogo/js/audio.js","jogo/js/data.js","jogo/js/game.js","jogo/js/historia.js","jogo/js/i18n.js","jogo/js/lang_en.js","jogo/js/main.js","jogo/js/nivel.js","jogo/js/sprites.js","jogo/js/ui.js","manifest.webmanifest"];
self.addEventListener('install', (e) => {
  // baixa a versão nova inteira em segundo plano, sem passar pelo cache HTTP
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('lumevale-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'atualizar') self.skipWaiting(); });
// áudio pede pedaços do arquivo (Range): responde com o pedaço guardado
async function comFaixa(req, resp) {
  const faixa = req.headers.get('range');
  if (!faixa || !resp || resp.status !== 200) return resp;
  const m = /bytes=(\d+)-(\d*)/.exec(faixa);
  if (!m) return resp;
  const buf = await resp.arrayBuffer();
  const ini = +m[1], fim = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(ini, fim + 1), { status: 206, headers: {
    'Content-Type': resp.headers.get('Content-Type') || 'application/octet-stream',
    'Content-Range': 'bytes ' + ini + '-' + fim + '/' + buf.byteLength, 'Content-Length': String(fim - ini + 1), 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }))
    .then((r) => (r ? comFaixa(req, r) : fetch(req))));
});
