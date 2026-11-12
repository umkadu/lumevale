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
  /* carrega sob demanda (capas do domador): devolve true quando a imagem já está pronta */
  const pedidos = {};
  spr.garantir = function (nome) {
    if (spr.imgs[nome]) return true;
    if (!pedidos[nome]) {
      pedidos[nome] = 1;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { spr.imgs[nome] = im; };
      im.src = 'img/' + nome + '.webp';
    }
    return false;
  };
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
     o = { x, y, h, face, t, mov, voa, atk, flash, alpha, flip, sy, rot, depois }
     depois(c, dx, dy, dw, dh): desenha por cima com a mesma animação (ex.: lanterna equipada)
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
    if (o.depois) { c.globalAlpha = o.alpha != null ? o.alpha : 1; o.depois(c, dx, dy, dw, dh); }
    c.restore();
    return true;
  };

  /* retratos da interface passam a usar as ilustrações */
  if (LV.art) {
    const retOrig = LV.art.retrato;
    LV.art.retrato = (sp, est, size) => (LV.SPECIES[sp] ? spr.url(LV.imgPet(sp, est)) : retOrig(sp, est, size));
    LV.art.retratoDomador = () => spr.url(LV.imgCapa(LV.game && LV.game.S && LV.game.capaAtual ? LV.game.capaAtual() : 'padrao'));
  }

  /* cópia com uma borda esfumada (some aos poucos): lado 'e' esquerda, 'd' direita, 'c' cima, 'b' baixo.
     As peças modulares se sobrepõem com essas bordas, então não sobra linha de emenda entre elas. */
  const esfumadas = new WeakMap();
  function esf(im, lado, frac) {
    let m = esfumadas.get(im);
    if (!m) { m = {}; esfumadas.set(im, m); }
    const k = lado + frac;
    if (m[k]) return m[k];
    const w = im.width || im.naturalWidth, h = im.height || im.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    const gr = lado === 'e' ? g.createLinearGradient(0, 0, w * frac, 0)
      : lado === 'd' ? g.createLinearGradient(w, 0, w * (1 - frac), 0)
      : lado === 'c' ? g.createLinearGradient(0, 0, 0, h * frac)
      : g.createLinearGradient(0, h, 0, h * (1 - frac));
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    m[k] = cv;
    return cv;
  }
  spr.esfumar = esf;
  const FE = 0.32, OV = 0.16;   // fração esfumada das pontas e sobreposição entre as peças do meio

  /* plataforma modular: ponta esquerda, meio repetido (sem esticar) e ponta direita, todas na mesma altura.
     O meio fica por baixo e as pontas se fundem nele pela borda de dentro, esfumada.
     K = { h, topo, w: [esq, meio, dir] } em pixels da imagem; alt = altura desenhada */
  spr.platModular = function (c, im, x0, x1, ytopo, K, alt) {
    if (!im[0] || !im[1] || !im[2]) return false;
    const s = alt / K.h, y = ytopo - K.topo * alt, w = x1 - x0;
    let we = K.w[0] * s, wd = K.w[2] * s;
    const wm = K.w[1] * s, lim = (we + wd) * 0.8;
    if (w < lim) { const k = w / lim; we *= k; wd *= k; }      // plataforma curta: pontas mais estreitas
    const ext = Math.min(we, wd) * 0.15;
    const m0 = x0 + we * (1 - FE) - ext, m1 = x1 - wd * (1 - FE) + ext;
    if (m1 - m0 > 2) {
      const meio = im[1], meioE = esf(im[1], 'e', OV), iw = meio.width || meio.naturalWidth, ih = meio.height || meio.naturalHeight;
      if (m1 - m0 <= wm) c.drawImage(meioE, 0, 0, iw * (m1 - m0) / wm, ih, m0, y, m1 - m0, alt);
      else {
        let x = m0;
        while (x + wm < m1) { c.drawImage(meioE, x, y, wm, alt); x += wm * (1 - OV); }
        c.drawImage(meioE, m1 - wm, y, wm, alt);             // a última encosta no fim (sobrepõe a anterior)
      }
    }
    c.drawImage(esf(im[0], 'd', FE), x0, y, we, alt);
    c.drawImage(esf(im[2], 'e', FE), x1 - wd, y, wd, alt);
    return true;
  };
  /* coluna modular: topo (encosta na plataforma), meio repetido e base no chão, centralizados no tronco.
     O meio fica por baixo; topo e base se fundem nele pela borda esfumada (sem linha de corte).
     K = { w: [], h: [], cx: [], tronco } em pixels da imagem; larg = largura desenhada do tronco */
  spr.colunaModular = function (c, im, x, y0, y1, K, larg) {
    if (!im[0] || !im[1] || !im[2] || y1 - y0 < 20) return false;
    let s = larg / K.tronco;
    const tot = y1 - y0;
    if ((K.h[0] + K.h[2]) * s * 0.8 > tot) s = tot / ((K.h[0] + K.h[2]) * 0.8);
    const ht = K.h[0] * s, hb = K.h[2] * s, hm = K.h[1] * s, wm = K.w[1] * s, xm = x - K.cx[1] * wm;
    const ext = Math.min(ht, hb) * 0.12;
    const m0 = y0 + ht * (1 - FE) - ext, m1 = y1 - hb * (1 - FE) + ext;
    if (m1 - m0 > 2) {
      const meioC = esf(im[1], 'c', OV), iw = im[1].width || im[1].naturalWidth, ih = im[1].height || im[1].naturalHeight;
      if (m1 - m0 <= hm) c.drawImage(meioC, 0, 0, iw, ih * (m1 - m0) / hm, xm, m0, wm, m1 - m0);
      else {
        let y = m0;
        while (y + hm < m1) { c.drawImage(meioC, xm, y, wm, hm); y += hm * (1 - OV); }
        c.drawImage(meioC, xm, m1 - hm, wm, hm);
      }
    }
    c.drawImage(esf(im[2], 'c', FE), x - K.cx[2] * K.w[2] * s, y1 - hb, K.w[2] * s, hb);
    c.drawImage(esf(im[0], 'b', FE), x - K.cx[0] * K.w[0] * s, y0, K.w[0] * s, ht);
    return true;
  };

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
