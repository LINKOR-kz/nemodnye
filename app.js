/* Братья Немодные — витрина */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = BN.esc, money = BN.money;
  var D = null, S = {}, view = { cat: '', gender: '', size: '', sort: 'new', q: '', sale: false };

  /* ---------- силуэты на фоне ---------- */
  var LAYOUTS = {
    hero: [['figure', 4, 14, 150, -8], ['brick', 44, 6, 120, 10, 'outline'], ['bear', 88, 60, 130, 6], ['mini', 36, 74, 90, -6], ['brick', 92, 6, 90, -14, 'lime'], ['figure', 66, 82, 80, 12, 'outline']],
    catalog: [['bear', -2, 4, 160, 8], ['figure', 92, 30, 170, -6], ['brick', 6, 70, 130, -10], ['mini', 88, 84, 110, 4]],
    dark: [['figure', 2, 8, 200, -6], ['bear', 90, 64, 170, 8, 'lime'], ['brick', 52, 86, 140, 6], ['mini', 44, 2, 100, -10]]
  };
  function figs() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-figs]'), function (box) {
      var L = LAYOUTS[box.getAttribute('data-figs')] || [];
      box.innerHTML = L.map(function (f, i) {
        return '<div class="fig' + (f[5] ? ' fig--' + f[5] : '') + '" style="left:' + f[1] + '%;top:' + f[2] + '%;width:' + f[3] + 'px;--rot:' + f[4] + 'deg;animation-delay:-' + (i * 1.7) + 's">' + BN.FIG[f[0]] + '</div>';
      }).join('');
    });
  }

  /* ---------- ссылки ---------- */
  function wa(text, num) { return 'https://wa.me/' + BN.digits(num || S.whatsapp) + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function ig(u) { return 'https://instagram.com/' + String(u || S.instagram || '').replace(/^@/, ''); }

  /* ---------- оформление из настроек ---------- */
  function renderShell() {
    $('#logo').innerHTML = BN.logo();
    $('#heroLogo').innerHTML = BN.logo();
    $('#footLogo').innerHTML = BN.logo();
    var m = (S.marquee || []).filter(Boolean);
    if (!m.length) m = ['Кроссовки', 'Одежда', 'Куртки'];
    var run = m.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    $('#ticker').innerHTML = run + run + run + run;

    $('#heroKicker').textContent = S.heroKicker || '';
    var lines = String(S.heroTitle || 'Братья Немодные').split('\n');
    $('#heroTitle').innerHTML = lines.map(function (l, i) { return i === lines.length - 1 && lines.length > 1 ? '<em>' + esc(l) + '</em>' : esc(l); }).join('<br>');
    $('#heroText').textContent = S.heroText || '';
    $('#heroImg').src = BN.src(S.heroImage || 'media/showroom-led.webp');
    $('#factRating').textContent = S.rating || '4.9';
    $('#ratingNum').textContent = S.rating || '4.9';
    $('#ratingText').textContent = (S.reviews ? S.reviews + ' ' : '') + 'отзывов в 2ГИС';

    ['#waTop', '#waHero', '#fab'].forEach(function (s) { $(s).href = wa('Здравствуйте! Пишу с сайта.'); });
    $('#waEmpty').href = wa('Здравствуйте! Не нашёл на сайте нужную вещь, подскажите, пожалуйста:');
    $('#igTop').href = ig();

    $('#aboutTitle').textContent = S.aboutTitle || '';
    $('#aboutText').textContent = S.aboutText || '';
    $('#gallery').innerHTML = (S.gallery || []).slice(0, 3).map(function (g) { return '<figure><img src="' + esc(BN.src(g)) + '" alt="Шоурум Братья Немодные" loading="lazy"></figure>'; }).join('');

    var br = S.branches || [];
    $('#branches').innerHTML = br.map(function (b) {
      return '<article class="branch"><h3 class="branch__city">' + esc(b.city) + '</h3>' +
        '<p class="branch__addr">' + esc(b.address) + '</p><p class="branch__hours">' + esc(b.hours) + '</p>' +
        '<div class="branch__btns">' +
        '<a class="btn btn--ink" target="_blank" rel="noopener" href="' + esc(wa('Здравствуйте! Пишу с сайта (' + b.city + ').', b.whatsapp || S.whatsapp)) + '">WhatsApp</a>' +
        (b.instagram ? '<a class="btn btn--ghost" target="_blank" rel="noopener" href="' + esc(ig(b.instagram)) + '">@' + esc(String(b.instagram).replace(/^@/, '')) + '</a>' : '') +
        (b.map ? '<a class="btn btn--ghost" target="_blank" rel="noopener" href="' + esc(b.map) + '">Маршрут</a>' : '') +
        '</div><div class="fig-corner">' + BN.FIG.bear + '</div></article>';
    }).join('');

    var links = ['<a target="_blank" rel="noopener" href="' + esc(wa()) + '">WhatsApp +' + esc(BN.digits(S.whatsapp)) + '</a>'];
    br.forEach(function (b) { if (b.instagram) links.push('<a target="_blank" rel="noopener" href="' + esc(ig(b.instagram)) + '">Instagram · ' + esc(b.city) + '</a>'); });
    $('#footLinks').innerHTML = links.join('');
    $('#year').textContent = new Date().getFullYear();
  }

  /* ---------- акции ---------- */
  function promoStyle(p) { var t = BN.PROMO_THEMES[p.theme] || BN.PROMO_THEMES.lime; return '--bg:' + t.bg + ';--fg:' + t.fg; }
  function fmtDate(s) { if (!s) return ''; var p = s.split('-'); return p[2] + '.' + p[1]; }
  function dates(p) {
    if (p.from && p.to) return 'с ' + fmtDate(p.from) + ' по ' + fmtDate(p.to);
    if (p.to) return 'до ' + fmtDate(p.to);
    if (p.from) return 'с ' + fmtDate(p.from);
    return '';
  }
  function renderPromos() {
    var list = (D.promos || []).filter(BN.promoLive);
    $('#promo').hidden = !list.length;
    $('#promos').innerHTML = list.map(function (p) {
      var media = p.image ? '<img src="' + esc(BN.src(p.image)) + '" alt="" loading="lazy">' : (p.video ? '<video src="' + esc(BN.src(p.video)) + '" muted playsinline loop autoplay></video>' : '');
      return '<button type="button" class="promo' + (p.theme === 'white' ? ' promo--white' : '') + '" style="' + promoStyle(p) + '" data-promo="' + esc(p.id) + '">' +
        '<div class="promo__img">' + media + (p.badge ? '<span class="promo__badge">' + esc(p.badge) + '</span>' : '') + '</div>' +
        '<div class="promo__body"><h3 class="promo__title">' + esc(p.title) + '</h3><p class="promo__text">' + esc(p.text) + '</p>' +
        '<div class="promo__foot"><span>' + esc(dates(p) || 'Акция действует') + '</span><span class="go"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div></div></button>';
    }).join('');
  }
  function openPromo(id) {
    var p = (D.promos || []).filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var t = BN.PROMO_THEMES[p.theme] || BN.PROMO_THEMES.lime;
    $('#prmMedia').innerHTML = p.video ? '<video src="' + esc(BN.src(p.video)) + '" controls playsinline autoplay muted loop' + (p.image ? ' poster="' + esc(BN.src(p.image)) + '"' : '') + '></video>'
      : (p.image ? '<img src="' + esc(BN.src(p.image)) + '" alt="">' : '');
    $('#prmMedia').hidden = !(p.video || p.image);
    var b = $('#prmBadge'); b.textContent = p.badge || ''; b.hidden = !p.badge; b.style.background = t.bg; b.style.color = t.fg; if (p.theme === 'white') b.style.border = '1.5px solid #ddd';
    $('#prmTitle').textContent = p.title || '';
    $('#prmDates').textContent = dates(p) ? 'Акция действует ' + dates(p) : '';
    $('#prmText').textContent = p.text || '';
    var cta = [];
    if (p.applyTo === 'cat' && (p.cats || []).length === 1) cta.push('<button class="btn btn--lime" data-gocat="' + esc(p.cats[0]) + '">' + esc(p.button || 'Смотреть товары') + '</button>');
    else if (p.applyTo === 'all' || p.applyTo === 'cat' || p.applyTo === 'items') cta.push('<button class="btn btn--lime" data-gosale>' + esc(p.button || 'Смотреть товары') + '</button>');
    cta.push('<a class="btn btn--ink" target="_blank" rel="noopener" href="' + esc(wa('Здравствуйте! Хочу узнать про акцию «' + p.title + '».')) + '">' + (cta.length ? 'Спросить в WhatsApp' : esc(p.button || 'Узнать в WhatsApp')) + '</a>');
    $('#prmCta').innerHTML = cta.join('');
    open('#prm');
  }

  /* ---------- каталог ---------- */
  function visible() { return (D.items || []).filter(function (it) { return it.status !== 'hidden'; }); }
  function catName(id) { var c = (D.cats || []).filter(function (x) { return x.id === id; })[0]; return c ? c.name : ''; }

  function renderFilters() {
    var items = visible();
    var counts = {}; items.forEach(function (it) { counts[it.cat] = (counts[it.cat] || 0) + 1; });
    var chips = ['<button class="chip' + (view.cat ? '' : ' on') + '" data-cat="">Всё <small>' + items.length + '</small></button>'];
    (D.cats || []).forEach(function (c) { if (counts[c.id]) chips.push('<button class="chip' + (view.cat === c.id ? ' on' : '') + '" data-cat="' + esc(c.id) + '">' + esc(c.name) + ' <small>' + counts[c.id] + '</small></button>'); });
    $('#cats').innerHTML = chips.join('');

    var pool = items.filter(function (it) { return !view.cat || it.cat === view.cat; });
    var seen = {}, order = [];
    Object.keys(BN.SIZE_PRESETS).forEach(function (k) { BN.SIZE_PRESETS[k].list.forEach(function (s) { if (order.indexOf(s) < 0) order.push(s); }); });
    pool.forEach(function (it) { BN.sizesIn(it).forEach(function (s) { seen[s.s] = 1; }); });
    var sizes = Object.keys(seen).sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      var na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    if (view.size && !seen[view.size]) view.size = '';
    $('#size').innerHTML = '<option value="">Любой</option>' + sizes.map(function (s) { return '<option' + (s === view.size ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('');
  }

  function cardHtml(it) {
    var pr = BN.pricing(it, D.promos), ph = it.photos || [];
    var b = [];
    if (pr.pct > 0) b.push('<span class="badge badge--sale">−' + pr.pct + '%</span>');
    if ((it.tags || []).indexOf('new') >= 0) b.push('<span class="badge badge--lime">New</span>');
    if ((it.tags || []).indexOf('hit') >= 0) b.push('<span class="badge badge--ink">Хит</span>');
    if ((it.tags || []).indexOf('last') >= 0) b.push('<span class="badge">Последние</span>');
    if ((it.tags || []).indexOf('gift') >= 0) b.push('<span class="badge">Подарок</span>');
    var media = ph[0] ? '<img src="' + esc(BN.src(ph[0])) + '" alt="' + esc(it.name) + '" loading="lazy">' + (ph[1] ? '<img class="alt" src="' + esc(BN.src(ph[1])) + '" alt="" loading="lazy">' : '')
      : '<div class="ph">' + BN.FIG.figure + '</div>';
    var sz = (it.sizes || []).slice(0, 8).map(function (s) { return '<span' + (+s.q > 0 ? '' : ' class="no"') + '>' + esc(s.s) + '</span>'; }).join('');
    return '<button type="button" class="card" data-id="' + esc(it.id) + '">' +
      '<div class="card__media">' + media + '<div class="badges">' + b.join('') + '</div>' +
      (it.video ? '<span class="card__vid" title="Есть видео"><svg viewBox="0 0 12 14"><path d="M0 0l12 7-12 7z" fill="#fff"/></svg></span>' : '') +
      (BN.inStock(it) ? '' : '<div class="card__out">Нет в наличии</div>') + '</div>' +
      '<div class="card__body"><div class="card__brand">' + esc(it.brand || catName(it.cat)) + '</div><h3 class="card__title">' + esc(it.name) + '</h3>' +
      '<div class="card__price"><b>' + money(pr.price) + '</b>' + (pr.old ? '<s>' + money(pr.old) + '</s>' : '') + '</div>' +
      (sz ? '<div class="card__sizes">' + sz + '</div>' : '') + '</div></button>';
  }

  function renderGrid() {
    var q = BN.norm(view.q).trim();
    var list = visible().filter(function (it) {
      if (view.cat && it.cat !== view.cat) return false;
      if (view.gender && it.gender !== view.gender && it.gender !== 'uni') return false;
      if (view.size && !BN.sizesIn(it).some(function (s) { return s.s === view.size; })) return false;
      if (view.sale && !(BN.pricing(it, D.promos).pct > 0)) return false;
      if (q) {
        var hay = BN.norm([it.name, it.brand, catName(it.cat), it.desc, (it.sizes || []).map(function (s) { return s.s; }).join(' ')].join(' '));
        if (!q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; })) return false;
      }
      return true;
    });
    var idx = {}; (D.items || []).forEach(function (it, i) { idx[it.id] = i; });
    list.sort(function (a, b) {
      var sa = BN.inStock(a) ? 0 : 1, sb = BN.inStock(b) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      if (view.sort === 'cheap') return BN.pricing(a, D.promos).price - BN.pricing(b, D.promos).price;
      if (view.sort === 'exp') return BN.pricing(b, D.promos).price - BN.pricing(a, D.promos).price;
      if (view.sort === 'sale') return BN.pricing(b, D.promos).pct - BN.pricing(a, D.promos).pct;
      return idx[a.id] - idx[b.id];
    });
    $('#grid').innerHTML = list.map(cardHtml).join('');
    $('#empty').hidden = list.length > 0;
    var n = list.length;
    $('#catCount').textContent = n + ' ' + plural(n, 'товар', 'товара', 'товаров') + (view.cat ? ' · ' + catName(view.cat) : ' в наличии и под заказ');
  }
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : (m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c); }
  function render() { renderFilters(); renderGrid(); }

  /* ---------- карточка товара ---------- */
  var cur = null, curSize = '';
  function openItem(id) {
    var it = (D.items || []).filter(function (x) { return x.id === id; })[0]; if (!it) return;
    cur = it; curSize = '';
    var pr = BN.pricing(it, D.promos);
    $('#pmBrand').textContent = [it.brand, catName(it.cat), BN.GENDER[it.gender]].filter(Boolean).join(' · ');
    $('#pmTitle').textContent = it.name;
    $('#pmPrice').innerHTML = '<b>' + money(pr.price) + '</b>' + (pr.old ? '<s>' + money(pr.old) + '</s><span class="pct">−' + pr.pct + '%</span>' : '');
    $('#pmPromo').hidden = !pr.promo;
    if (pr.promo) $('#pmPromo').textContent = '🔥 ' + pr.promo.title + ' — скидка ' + pr.promo.percent + '% уже в цене';
    $('#pmDesc').textContent = it.desc || '';
    var sizes = it.sizes || [];
    $('#pmSizes').parentNode.hidden = !sizes.length;
    $('#pmSizes').innerHTML = sizes.map(function (s) {
      var q = +s.q || 0;
      return '<button type="button" data-size="' + esc(s.s) + '"' + (q > 0 ? '' : ' disabled title="Нет в наличии"') + '>' + esc(s.s) + (q === 1 ? '<span class="last">1 шт</span>' : '') + '</button>';
    }).join('');
    if (sizes.length === 1 && +sizes[0].q > 0) pickSize(sizes[0].s);
    $('#pmSizeHint').textContent = BN.inStock(it) ? (sizes.length > 1 ? 'Выберите размер' : '') : 'Нет в наличии — можно заказать';
    var media = (it.photos || []).map(function (p) { return { t: 'img', s: p }; });
    if (it.video) media.push({ t: 'video', s: it.video });
    if (!media.length) media.push({ t: 'ph' });
    $('#pmThumbs').innerHTML = media.length > 1 ? media.map(function (m, i) {
      return '<button type="button" data-m="' + i + '"' + (i ? '' : ' class="on"') + '>' + (m.t === 'img' ? '<img src="' + esc(BN.src(m.s)) + '" alt="">' : '<video src="' + esc(BN.src(m.s)) + '#t=0.5" muted preload="metadata"></video><span class="play">▶</span>') + '</button>';
    }).join('') : '';
    $('#pmThumbs').media = media;
    show(media[0]);
    updateOrder();
    open('#pm');
  }
  function show(m) {
    var st = $('#pmStage');
    if (m.t === 'img') st.innerHTML = '<img src="' + esc(BN.src(m.s)) + '" alt="' + esc(cur.name) + '">';
    else if (m.t === 'video') st.innerHTML = '<video src="' + esc(BN.src(m.s)) + '" controls autoplay playsinline muted loop></video>';
    else st.innerHTML = '<div class="ph">' + BN.FIG.figure + '</div>';
  }
  function pickSize(s) {
    curSize = s;
    Array.prototype.forEach.call(document.querySelectorAll('#pmSizes button'), function (b) { b.classList.toggle('on', b.getAttribute('data-size') === s); });
    $('#pmSizeHint').textContent = 'Выбран: ' + s;
    updateOrder();
  }
  function updateOrder() {
    var pr = BN.pricing(cur, D.promos);
    var t = 'Здравствуйте! Хочу заказать с сайта:\n' + [cur.brand, cur.name].filter(Boolean).join(' ') + (curSize ? '\nРазмер: ' + curSize : '') + '\nЦена: ' + money(pr.price) + '\n' + location.href.split('#')[0] + '#item=' + cur.id;
    $('#pmOrder').href = wa(t);
    $('#pmOrder').textContent = BN.inStock(cur) ? (curSize || !(cur.sizes || []).length ? 'Заказать в WhatsApp' : 'Заказать — выберите размер') : 'Заказать под заказ';
    $('#pmAsk').href = ig();
  }

  /* ---------- окна ---------- */
  var lastFocus = null;
  function open(sel) { lastFocus = document.activeElement; $(sel).hidden = false; document.body.classList.add('lock'); var x = $(sel + ' .modal__x'); if (x) x.focus(); if (sel === '#pm') history.replaceState(null, '', '#item=' + cur.id); }
  function closeAll() {
    Array.prototype.forEach.call(document.querySelectorAll('.modal'), function (m) { if (!m.hidden) { m.hidden = true; Array.prototype.forEach.call(m.querySelectorAll('video'), function (v) { v.pause(); }); } });
    document.body.classList.remove('lock');
    if (/^#item=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- события ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-close]'); if (t) return closeAll();
    t = e.target.closest('.card'); if (t) return openItem(t.getAttribute('data-id'));
    t = e.target.closest('[data-promo]'); if (t) return openPromo(t.getAttribute('data-promo'));
    t = e.target.closest('[data-cat]'); if (t) { view.cat = t.getAttribute('data-cat'); return render(); }
    t = e.target.closest('#gender button'); if (t) {
      view.gender = t.getAttribute('data-g');
      Array.prototype.forEach.call(document.querySelectorAll('#gender button'), function (b) { b.classList.toggle('on', b === t); });
      return renderGrid();
    }
    t = e.target.closest('#pmSizes button'); if (t && !t.disabled) return pickSize(t.getAttribute('data-size'));
    t = e.target.closest('#pmThumbs button'); if (t) {
      Array.prototype.forEach.call(document.querySelectorAll('#pmThumbs button'), function (b) { b.classList.toggle('on', b === t); });
      return show($('#pmThumbs').media[+t.getAttribute('data-m')]);
    }
    t = e.target.closest('[data-gocat]'); if (t) { closeAll(); view.cat = t.getAttribute('data-gocat'); render(); return $('#catalog').scrollIntoView(); }
    t = e.target.closest('[data-gosale]'); if (t) { closeAll(); view.cat = ''; view.sale = true; $('#onlySale').checked = true; render(); return $('#catalog').scrollIntoView(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  var qt; $('#q').addEventListener('input', function (e) { clearTimeout(qt); qt = setTimeout(function () { view.q = e.target.value; renderGrid(); }, 120); });
  $('#size').addEventListener('change', function (e) { view.size = e.target.value; renderGrid(); });
  $('#sort').addEventListener('change', function (e) { view.sort = e.target.value; renderGrid(); });
  $('#onlySale').addEventListener('change', function (e) { view.sale = e.target.checked; renderGrid(); });

  /* ---------- старт ---------- */
  figs();
  BN.loadCatalog().then(function (r) {
    D = r.data || {}; S = D.settings || {};
    renderShell(); renderPromos(); render();
    $('#factStock').textContent = visible().filter(BN.inStock).length;
    var m = /#item=([\w-]+)/.exec(location.hash); if (m) openItem(m[1]);
  }).catch(function () {
    $('#grid').innerHTML = '<p>Не удалось загрузить каталог. Обновите страницу.</p>';
  });
})();
