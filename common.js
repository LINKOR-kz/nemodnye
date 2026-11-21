/* Общие данные и функции сайта и админки «Братья Немодные» */
(function (w) {
  'use strict';

  /* Сервер админки (Cloudflare Worker): каталог, фото и видео */
  var API = 'https://nemodnye-admin.sentora-admin-worker.workers.dev';
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]api=local/.test(location.search)) API = 'http://127.0.0.1:8787';

  /* Готовые сетки размеров */
  var SIZE_PRESETS = {
    shoes: { name: 'Обувь (EU)', list: ['36', '36.5', '37', '37.5', '38', '38.5', '39', '40', '40.5', '41', '42', '42.5', '43', '44', '44.5', '45', '46'] },
    clothes: { name: 'Одежда (XS–3XL)', list: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
    ru: { name: 'Одежда (42–56)', list: ['42', '44', '46', '48', '50', '52', '54', '56'] },
    jeans: { name: 'Джинсы (W)', list: ['28', '29', '30', '31', '32', '33', '34', '36', '38'] },
    one: { name: 'Один размер', list: ['ONE SIZE'] }
  };

  var GENDER = { his: 'Для него', her: 'Для неё', uni: 'Унисекс' };
  var TAGS = { new: 'Новинка', hit: 'Хит', last: 'Последние размеры', gift: 'В подарок' };
  var BRANDS = ['Nike', 'Jordan', 'Adidas', 'New Balance', 'ASICS', 'Puma', 'Reebok', 'Vans', 'Converse', 'Salomon', 'On', 'Hoka', 'Balenciaga', 'Stone Island', 'The North Face', 'Carhartt WIP', 'Stüssy', 'Supreme', 'Under Armour', 'Columbia', 'Братья Немодные'];

  var PROMO_THEMES = {
    lime: { name: 'Лайм', bg: '#A6DD1E', fg: '#0A0A0A' },
    black: { name: 'Чёрный', bg: '#0A0A0A', fg: '#FFFFFF' },
    red: { name: 'Kaspi красный', bg: '#F14635', fg: '#FFFFFF' },
    white: { name: 'Белый', bg: '#FFFFFF', fg: '#0A0A0A' }
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return (Math.round(+n) || 0).toLocaleString('ru-RU').replace(/[  ]/g, ' ') + ' ₸'; }
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); }
  function uid(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  /* ---------- Каталог: сначала с сервера, если пусто или нет связи — из файла на сайте ---------- */
  function fileCatalog() { return fetch('data/catalog.json?t=' + Date.now()).then(function (r) { return r.json(); }); }
  function loadCatalog() {
    var ctl = w.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
    return fetch(API + '/catalog', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('empty'); return r.json(); })
      .then(function (d) { return { data: d, server: true }; })
      .catch(function () { clearTimeout(t); return fileCatalog().then(function (d) { return { data: d, server: false }; }); });
  }

  /* ---------- Файлы: kv:<id> — файл на сервере, остальное — файл на сайте ---------- */
  function src(ref) { return ref && ref.indexOf('kv:') === 0 ? API + '/m/' + ref.slice(3) : (ref || ''); }

  function uploadFile(blob, token, onProgress) {
    var type = blob.type || 'application/octet-stream';
    if (type === 'video/x-m4v') type = 'video/mp4';
    var h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
    function call(path, opts) {
      return fetch(API + path, opts).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || ('Ошибка ' + r.status)); e.status = r.status; throw e; } return j; });
      });
    }
    return call('/admin/upload/start', { method: 'POST', headers: h, body: JSON.stringify({ type: type, size: blob.size }) }).then(function (s) {
      var i = 0;
      function next() {
        if (i >= s.parts) return call('/admin/upload/' + s.id + '/finish', { method: 'POST', headers: h, body: JSON.stringify({ type: type, size: blob.size }) });
        var part = blob.slice(i * s.chunk, Math.min(blob.size, (i + 1) * s.chunk));
        return call('/admin/upload/' + s.id + '/' + i, { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/octet-stream' }, body: part })
          .then(function () { i++; if (onProgress) onProgress(i / s.parts); return next(); });
      }
      return next();
    }).then(function (f) { return f.ref; });
  }

  /* Сжатие фото перед загрузкой */
  function compressImage(file, max) {
    max = max || 1600;
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('Не удалось обработать фото')); }, 'image/webp', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Не удалось открыть фото')); };
      img.src = u;
    });
  }

  /* ---------- Акции и цены ---------- */
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function promoLive(p) {
    if (!p || !p.active) return false;
    var t = today();
    if (p.from && t < p.from) return false;
    if (p.to && t > p.to) return false;
    return true;
  }
  function promoHits(p, it) {
    if (!(+p.percent > 0) || !p.applyTo || p.applyTo === 'none') return false;
    if (p.applyTo === 'all') return true;
    if (p.applyTo === 'cat') return (p.cats || []).indexOf(it.cat) >= 0;
    if (p.applyTo === 'items') return (p.items || []).indexOf(it.id) >= 0;
    return false;
  }
  /* Итоговая цена товара с учётом скидки в карточке и действующих акций */
  function pricing(it, promos) {
    var base = +it.price || 0, old = +it.oldPrice > base ? +it.oldPrice : 0;
    var best = null;
    (promos || []).forEach(function (p) {
      if (promoLive(p) && promoHits(p, it) && (!best || +p.percent > +best.percent)) best = p;
    });
    var price = base;
    if (best) { price = Math.round(base * (1 - best.percent / 100) / 10) * 10; if (!old) old = base; }
    var pct = old ? Math.round((1 - price / old) * 100) : 0;
    return { price: price, old: old, pct: pct, promo: best };
  }

  function sizesIn(it) { return (it.sizes || []).filter(function (s) { return +s.q > 0; }); }
  function inStock(it) { return !it.sizes || !it.sizes.length || sizesIn(it).length > 0; }

  /* ---------- Логотип (как на вывеске: «БРАТЬЯ / НЕ зеркально / МОДНЫЕ») ---------- */
  function logo(cls) {
    return '<svg class="bn-logo ' + (cls || '') + '" viewBox="0 0 120 120" role="img" aria-label="Братья Немодные">' +
      '<rect width="120" height="120" rx="22" fill="#A6DD1E"/>' +
      '<g fill="#0A0A0A" font-family="Unbounded, Arial Black, sans-serif" font-weight="900">' +
      '<text x="15" y="35" font-size="17.5" textLength="90" lengthAdjust="spacingAndGlyphs">БРАТЬЯ</text>' +
      '<text transform="translate(120 0) scale(-1 1)" x="13" y="84" font-size="56" textLength="94" lengthAdjust="spacingAndGlyphs">НЕ</text>' +
      '<text x="15" y="104" font-size="17.5" textLength="90" lengthAdjust="spacingAndGlyphs">МОДНЫЕ</text></g></svg>';
  }

  /* ---------- Силуэты игрушек для фона (дизайнерская фигурка, мишка-кубрик, кубики конструктора) ---------- */
  var FIG = {
    figure: '<svg viewBox="0 0 120 200"><path d="M60 6c-21 0-36 14-36 33 0 9 3 16 8 22l-5 3c-7-5-15-2-17 5s3 14 10 14l6-1-4 22c-8 2-14 9-13 17s9 13 17 11l7-3-1 28H25c-6 0-10 5-10 11v9c0 5 4 9 9 9h28c4 0 7-3 7-7v-27h2v27c0 4 3 7 7 7h28c5 0 9-4 9-9v-9c0-6-4-11-10-11H88l-1-28 7 3c8 2 16-3 17-11s-5-15-13-17l-4-22 6 1c7 0 12-7 10-14s-10-10-17-5l-5-3c5-6 8-13 8-22C96 20 81 6 60 6z"/><path d="M40 30l12 12M52 30L40 42M68 30l12 12M80 30L68 42" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>',
    bear: '<svg viewBox="0 0 120 200"><circle cx="30" cy="20" r="14"/><circle cx="90" cy="20" r="14"/><rect x="18" y="14" width="84" height="66" rx="30"/><rect x="34" y="78" width="52" height="8" rx="3"/><rect x="26" y="84" width="68" height="60" rx="14"/><rect x="6" y="88" width="20" height="50" rx="10"/><rect x="94" y="88" width="20" height="50" rx="10"/><rect x="28" y="140" width="28" height="54" rx="10"/><rect x="64" y="140" width="28" height="54" rx="10"/></svg>',
    brick: '<svg viewBox="0 0 160 110"><rect x="18" y="4" width="26" height="18" rx="4"/><rect x="67" y="4" width="26" height="18" rx="4"/><rect x="116" y="4" width="26" height="18" rx="4"/><rect x="4" y="18" width="152" height="88" rx="8"/></svg>',
    mini: '<svg viewBox="0 0 120 200"><rect x="48" y="2" width="24" height="12" rx="3"/><rect x="34" y="12" width="52" height="44" rx="14"/><rect x="50" y="54" width="20" height="8"/><path d="M30 62h60l12 64H18z"/><rect x="6" y="66" width="18" height="52" rx="9" transform="rotate(12 15 92)"/><rect x="96" y="66" width="18" height="52" rx="9" transform="rotate(-12 105 92)"/><rect x="20" y="126" width="80" height="14" rx="3"/><rect x="20" y="138" width="38" height="58" rx="4"/><rect x="62" y="138" width="38" height="58" rx="4"/></svg>'
  };

  w.BN = {
    API: API, SIZE_PRESETS: SIZE_PRESETS, GENDER: GENDER, TAGS: TAGS, BRANDS: BRANDS, PROMO_THEMES: PROMO_THEMES, FIG: FIG,
    esc: esc, money: money, norm: norm, uid: uid, digits: digits, nl2br: nl2br,
    loadCatalog: loadCatalog, src: src, uploadFile: uploadFile, compressImage: compressImage,
    promoLive: promoLive, pricing: pricing, sizesIn: sizesIn, inStock: inStock, logo: logo, today: today
  };
})(window);
