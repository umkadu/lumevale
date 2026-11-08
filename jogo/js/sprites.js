'use strict';
/* Lumevale — sprites ilustrados: carregamento, animação procedural, clarão de dano e tingimento. */
(function () {
  const LV = window.LV;
  const spr = (LV.spr = { imgs: {}, prontas: 0, total: 0 });
  const brancos = {}, tintas = {};

  spr.carregar = function (lista, aoTerminar) {
    spr.total = lista.length;
    lista.forEach((nome) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { spr.imgs[nome] = im; spr.prontas++; if (spr.prontas === spr.total && aoTerminar) aoTerminar(); };
      im.onerror = () => { spr.prontas++; if (spr.prontas === spr.total && aoTerminar) aoTerminar(); };
      im.src = 'img/' + nome + '.webp';
    });
  };
  spr.get = (nome) => spr.imgs[nome] || null;
  spr.url = (nome) => 'img/' + nome + '.webp';

  /* silhueta branca usada no clarão de dano e na evolução */
  function branco(nome, im) {
    let c = brancos[nome];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    brancos[nome] = c;
    return c;
  }
  spr.branco = (nome) => { const im = spr.get(nome); return im ? branco(nome, im) : null; };

  /* cópia tingida (para harmonizar peças de cenário com a cor do mapa) */
  spr.tingida = function (nome, cor, k) {
    const chave = nome + cor + k;
    if (tintas[chave]) return tintas[chave];
    const im = spr.get(nome);
    if (!im) return null;
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = k; g.fillStyle = cor; g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 0.18; g.fillStyle = '#000000'; g.fillRect(0, 0, c.width, c.height);
    tintas[chave] = c;
    return c;
  };

  /* Desenha um sprite de criatura.
     o = { x, y, h, face, t, mov, voa, atk, flash, alpha, flip, sy, rot }
     terrestres: (x, y) = pés; voadores: (x, y) = centro */
  spr.desenhar = function (c, nome, o) {
    const im = spr.get(nome);
    if (!im) return false;
    const h = o.h, w = (im.naturalWidth / im.naturalHeight) * h;
    const t = o.t || 0, mov = o.mov || 0;
    let sx = 1, sy = o.sy || 1, rot = o.rot || 0, oy = 0;
    if (o.voa) {
      oy = Math.sin(t * 3.6) * 3;
      const bate = Math.sin(t * 11);
      sy *= 1 + bate * 0.035; sx *= 1 - bate * 0.02;
      rot += Math.sin(t * 1.7) * 0.04;
    } else {
      const br = Math.sin(t * 2.8) * 0.022;
      sx *= 1 - br * 0.6; sy *= 1 + br;
      if (mov > 0.05) { oy -= Math.abs(Math.sin(t * 11)) * 3.2 * mov; rot += Math.sin(t * 11) * 0.045 * mov; }
    }
    if (o.atk > 0) rot += Math.sin(o.atk * Math.PI) * 0.2;
    c.save();
    c.translate(o.x, o.y);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    let f = o.face < 0 ? -1 : 1;
    if (o.flip) f = -f;
    c.scale(f, 1);
    c.rotate(rot);
    const dw = w * sx, dh = h * sy;
    const dx = -dw / 2, dy = o.voa ? -dh / 2 + oy : -dh + oy;
    c.drawImage(im, dx, dy, dw, dh);
    if (o.flash > 0.02) {
      c.globalAlpha *= Math.min(1, o.flash);
      c.drawImage(branco(nome, im), dx, dy, dw, dh);
    }
    c.restore();
    return true;
  };

  /* retratos da interface passam a usar as ilustrações */
  if (LV.art) {
    const retOrig = LV.art.retrato;
    LV.art.retrato = (sp, est, size) => (LV.SPECIES[sp] ? spr.url(LV.imgPet(sp, est)) : retOrig(sp, est, size));
    LV.art.retratoDomador = () => spr.url(LV.HEROI.parado);
  }

  /* fatiamento em 3 partes na horizontal: pontas sem distorção, meio esticado */
  spr.plataforma = function (c, img, x0, x1, ytopo, peca) {
    if (!img) return false;
    const iw = img.width, ih = img.height;
    const h = peca.alt, s = h / ih;
    const y = ytopo - peca.topo * h;
    const cw = iw * peca.cap, dcw = cw * s;
    const w = x1 - x0;
    if (w <= dcw * 2 + 4) { c.drawImage(img, x0, y, w, h); return true; }
    c.drawImage(img, 0, 0, cw, ih, x0, y, dcw, h);
    c.drawImage(img, cw, 0, iw - cw * 2, ih, x0 + dcw, y, w - dcw * 2, h);
    c.drawImage(img, iw - cw, 0, cw, ih, x1 - dcw, y, dcw, h);
    return true;
  };
})();
