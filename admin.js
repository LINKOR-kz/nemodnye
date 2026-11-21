/* Админка «Братья Немодные»: товары, размеры, акции, категории, тексты и контакты */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = BN.esc, money = BN.money, API = BN.APIC;
  var TOKEN_KEY = 'bn_admin_token_' + BN.CITY;
  var token = '', D = null, ver = 0, tab = 'items', itemCat = '', itemQ = '';

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- сервер ---------- */
  function call(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}, opts.headers || {});
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && path !== '/login') { logout(); }
        if (!r.ok) { var e = new Error(j.error || ('Ошибка ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    }, function () { throw new Error('Нет связи с сервером. Проверьте интернет.'); });
  }
  function normalize(d) {
    d = d || {};
    d.settings = d.settings || {}; d.cats = d.cats || []; d.items = d.items || []; d.promos = d.promos || [];
    d.settings.branches = d.settings.branches || []; d.settings.gallery = d.settings.gallery || []; d.settings.marquee = d.settings.marquee || [];
    return d;
  }
  function loadData() {
    busy('Загружаю каталог…');
    return call('/admin/data').then(function (r) {
      ver = r.version || 0;
      if (r.data) return r.data;
      return fetch(BN.BASE + 'data/catalog-' + BN.CITY + '.json?t=' + Date.now()).then(function (x) { return x.json(); });
    }).then(function (d) { D = normalize(d); unbusy(); renderAll(); })
      .catch(function (e) { unbusy(); toast(e.message, 'err'); });
  }
  /* Сохранить изменение: применяется к копии и сразу публикуется на сайте */
  function commit(fn, okMsg) {
    var next = clone(D);
    var res = fn(next);
    if (res === false) return Promise.resolve(false);
    busy('Сохраняю…');
    return call('/admin/save', { method: 'POST', body: JSON.stringify({ data: next, version: ver }) }).then(function (r) {
      ver = r.version; D = normalize(next); unbusy(); renderAll(); toast(okMsg || 'Сохранено — уже на сайте', 'ok'); return true;
    }).catch(function (e) {
      unbusy(); toast(e.message, 'err');
      if (e.status === 409) loadData();
      return false;
    });
  }

  /* ---------- вход ---------- */
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#loginLogo').innerHTML = BN.logo(); setTimeout(function () { $('#pwd').focus(); }, 50); }
  function logout() { token = ''; store(TOKEN_KEY, null); closeSheet(true); showLogin(); }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var b = $('#loginBtn'); b.disabled = true; b.textContent = 'Вхожу…'; $('#loginErr').textContent = '';
    call('/login', { method: 'POST', body: JSON.stringify({ password: $('#pwd').value }) }).then(function (r) {
      token = r.token; store(TOKEN_KEY, token); $('#pwd').value = ''; start();
    }).catch(function (err) { $('#loginErr').textContent = err.message; })
      .then(function () { b.disabled = false; b.textContent = 'Войти'; });
  });
  $('#logout').addEventListener('click', logout);
  function start() { $('#login').hidden = true; $('#app').hidden = false; $('#sideLogo').innerHTML = BN.logo(); loadData(); }

  /* ---------- уведомления ---------- */
  var tt;
  function toast(msg, kind) { var t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (kind || ''); clearTimeout(tt); tt = setTimeout(function () { t.className = 'toast'; }, kind === 'err' ? 5000 : 2600); }
  function busy(msg, p) { $('#busy').hidden = false; $('#busyText').textContent = msg; $('#busyBar').parentNode.hidden = p == null; $('#busyBar').style.width = Math.round((p || 0) * 100) + '%'; }
  function unbusy() { $('#busy').hidden = true; }

  /* ---------- вкладки ---------- */
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    tab = b.getAttribute('data-tab');
    $$('#tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
    $$('.pane').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== tab; });
    renderAll(); window.scrollTo(0, 0);
  });
  function renderAll() {
    if (!D) return;
    $('#cntItems').textContent = D.items.length;
    $('#cntPromos').textContent = D.promos.filter(BN.promoLive).length || '';
    if (tab === 'items') renderItems();
    if (tab === 'promos') renderPromos();
    if (tab === 'cats') renderCats();
    if (tab === 'site') renderSite();
  }
  function catName(id) { var c = D.cats.filter(function (x) { return x.id === id; })[0]; return c ? c.name : 'Без категории'; }
  var ICON = {
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
  };

  /* ================= ТОВАРЫ ================= */
  function renderItems() {
    var counts = {}; D.items.forEach(function (it) { counts[it.cat] = (counts[it.cat] || 0) + 1; });
    $('#itemCats').innerHTML = ['<button class="chip' + (itemCat ? '' : ' on') + '" data-icat="">Все <small>' + D.items.length + '</small></button>']
      .concat(D.cats.map(function (c) { return '<button class="chip' + (itemCat === c.id ? ' on' : '') + '" data-icat="' + esc(c.id) + '">' + esc(c.name) + ' <small>' + (counts[c.id] || 0) + '</small></button>'; })).join('');
    var q = BN.norm(itemQ).trim();
    var list = D.items.filter(function (it) {
      if (itemCat && it.cat !== itemCat) return false;
      return !q || BN.norm(it.name + ' ' + it.brand).indexOf(q) >= 0;
    });
    var out = D.items.filter(function (it) { return !BN.inStock(it); }).length;
    $('#itemsSub').textContent = D.items.length + ' товаров · ' + D.items.filter(function (i) { return i.status !== 'hidden'; }).length + ' на сайте' + (out ? ' · ' + out + ' закончились' : '');
    if (!list.length) { $('#itemRows').innerHTML = '<div class="empty-box"><b>' + (D.items.length ? 'Ничего не найдено' : 'Пока нет товаров') + '</b>Нажмите «Добавить товар», чтобы выложить первую вещь.</div>'; return; }
    $('#itemRows').innerHTML = list.map(function (it) {
      var pr = BN.pricing(it, D.promos), ph = (it.photos || [])[0];
      var sz = it.sizes || [], have = BN.sizesIn(it);
      var szTxt = !sz.length ? 'Без размеров' : (have.length ? 'Размеры: ' + have.map(function (s) { return s.s; }).join(', ') : 'Нет в наличии');
      return '<div class="irow' + (it.status === 'hidden' ? ' off' : '') + '" data-id="' + esc(it.id) + '">' +
        '<div class="irow__img" data-act="edit">' + (ph ? '<img src="' + esc(BN.src(ph)) + '" alt="" loading="lazy">' : '<div class="ph">' + BN.FIG.figure + '</div>') + '</div>' +
        '<div class="irow__main" data-act="edit"><div class="irow__brand">' + esc(it.brand || '') + ' · ' + esc(catName(it.cat)) + '</div>' +
        '<div class="irow__name">' + esc(it.name || 'Без названия') + '</div>' +
        '<div class="irow__meta"><b>' + money(pr.price) + '</b>' + (pr.old ? '<s>' + money(pr.old) + '</s><span class="pill pill--red">−' + pr.pct + '%' + (pr.promo ? ' акция' : '') + '</span>' : '') +
        '<span class="pill' + (have.length || !sz.length ? '' : ' pill--red') + '">' + esc(szTxt) + '</span>' + (it.video ? '<span class="pill">▶ видео</span>' : '') +
        ((it.tags || []).indexOf('new') >= 0 ? '<span class="pill pill--lime">New</span>' : '') + '</div></div>' +
        '<div class="irow__acts"><label class="sw" title="Показывать на сайте"><input type="checkbox" data-act="vis"' + (it.status !== 'hidden' ? ' checked' : '') + '><i></i><span class="mobile-only">На сайте</span></label><button class="ibtn" data-act="edit" title="Изменить">' + ICON.edit + '</button><button class="ibtn" data-act="copy" title="Копировать">' + ICON.copy + '</button><button class="ibtn ibtn--del" data-act="del" title="Удалить">' + ICON.del + '</button></div></div>';
    }).join('');
  }
  $('#itemCats').addEventListener('click', function (e) { var b = e.target.closest('[data-icat]'); if (b) { itemCat = b.getAttribute('data-icat'); renderItems(); } });
  $('#itemQ').addEventListener('input', function (e) { itemQ = e.target.value; renderItems(); });
  $('#itemRows').addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]'); if (!a) return;
    var id = a.closest('.irow').getAttribute('data-id'), act = a.getAttribute('data-act');
    var it = D.items.filter(function (x) { return x.id === id; })[0];
    if (act === 'edit') editItem(it);
    if (act === 'copy') { var c = clone(it); c.id = BN.uid('i-'); c.name += ' (копия)'; editItem(c, true); }
    if (act === 'del' && confirm('Удалить «' + it.name + '» с сайта?')) commit(function (d) { d.items = d.items.filter(function (x) { return x.id !== id; }); }, 'Товар удалён');
  });
  $('#itemRows').addEventListener('change', function (e) {
    if (e.target.getAttribute('data-act') !== 'vis') return;
    var id = e.target.closest('.irow').getAttribute('data-id'), on = e.target.checked;
    commit(function (d) { d.items.forEach(function (x) { if (x.id === id) x.status = on ? 'active' : 'hidden'; }); }, on ? 'Товар снова на сайте' : 'Товар скрыт с сайта');
  });
  $('#addItem').addEventListener('click', function () {
    var cat = itemCat || (D.cats[0] && D.cats[0].id) || '';
    editItem({ id: BN.uid('i-'), name: '', brand: '', cat: cat, gender: 'uni', price: '', oldPrice: 0, tags: ['new'], status: 'active', desc: '', sizeType: cat === 'sneakers' ? 'shoes' : 'clothes', sizes: [], photos: [], video: '' }, true);
  });

  /* ---------- редактор (общий) ---------- */
  var SH = null; // { draft, isNew, kind, dirty, save, preview }
  function openSheet(o) {
    SH = o; SH.dirty = false;
    $('#sheetTitle').textContent = o.title;
    $('#sheet').hidden = false; document.body.classList.add('lock');
    o.render(); o.preview && o.preview();
    $('.sheet__body').scrollTop = 0;
  }
  function closeSheet(force) {
    if (!SH) return;
    if (!force && SH.dirty && !confirm('Закрыть без сохранения? Изменения пропадут.')) return;
    SH = null; $('#sheet').hidden = true; document.body.classList.remove('lock');
    $$('#sheet video').forEach(function (v) { v.pause(); });
  }
  $('#sheet').addEventListener('click', function (e) { if (e.target.closest('[data-sheet-close]')) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && SH) closeSheet(); });
  $('#sheetSave').addEventListener('click', function () { if (SH) SH.save(); });
  function touch() { if (SH) { SH.dirty = true; SH.preview && SH.preview(); } }

  /* ---------- загрузка файлов ---------- */
  function pickFiles(accept, multiple) {
    return new Promise(function (res) {
      var inp = $('#filePick'); inp.value = ''; inp.accept = accept; inp.multiple = !!multiple;
      inp.onchange = function () { res(Array.prototype.slice.call(inp.files || [])); };
      inp.click();
    });
  }
  function uploadMany(files) {
    var refs = [], i = 0;
    function next() {
      if (i >= files.length) { unbusy(); return refs; }
      var f = files[i], isVid = /^video\//.test(f.type);
      var label = (isVid ? 'Загружаю видео' : 'Загружаю фото') + (files.length > 1 ? ' ' + (i + 1) + ' из ' + files.length : '') + '…';
      busy(label, 0);
      var prep = isVid ? Promise.resolve(f) : (f.type === 'image/gif' ? Promise.resolve(f) : BN.compressImage(f));
      return prep.then(function (blob) { return BN.uploadFile(blob, token, function (p) { busy(label, p); }); })
        .then(function (ref) { refs.push(ref); i++; return next(); });
    }
    return next().catch(function (e) { unbusy(); toast(e.message, 'err'); return refs; });
  }
  function mediaTag(ref, isVid) { return isVid ? '<video src="' + esc(BN.src(ref)) + '#t=0.5" muted playsinline preload="metadata"></video>' : '<img src="' + esc(BN.src(ref)) + '" alt="">'; }

  /* ---------- товар ---------- */
  function editItem(it, isNew) {
    var d = clone(it);
    d.photos = d.photos || []; d.sizes = d.sizes || []; d.tags = d.tags || [];
    if (!d.sizeType) d.sizeType = 'clothes';
    openSheet({
      title: isNew ? 'Новый товар' : 'Изменить товар', draft: d, isNew: isNew, kind: 'item',
      render: function () { $('#sheetForm').innerHTML = itemForm(d); renderItemMedia(); renderSizes(); updDisc(); },
      preview: function () { $('#sheetPreview').innerHTML = previewCard(d); },
      save: function () {
        d.name = String(d.name || '').trim();
        if (!d.name) { toast('Напишите название товара', 'err'); return $('[data-k="name"]').focus(); }
        if (!(+d.price > 0)) { toast('Укажите цену', 'err'); return $('[data-k="price"]').focus(); }
        d.price = Math.round(+d.price); d.oldPrice = +d.oldPrice > d.price ? Math.round(+d.oldPrice) : 0;
        commit(function (data) {
          var i = -1; data.items.forEach(function (x, n) { if (x.id === d.id) i = n; });
          if (i >= 0) data.items[i] = d; else data.items.unshift(d);
        }, isNew ? 'Товар добавлен на сайт' : 'Изменения на сайте').then(function (ok) { if (ok) closeSheet(true); });
      }
    });
  }
  function itemForm(d) {
    var catOpts = D.cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === d.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
    var g = Object.keys(BN.GENDER).map(function (k) { return '<label><input type="radio" name="gender" value="' + k + '"' + (d.gender === k ? ' checked' : '') + '><span>' + BN.GENDER[k] + '</span></label>'; }).join('');
    var tags = Object.keys(BN.TAGS).map(function (k) { return '<label><input type="checkbox" data-tag="' + k + '"' + (d.tags.indexOf(k) >= 0 ? ' checked' : '') + '><span>' + BN.TAGS[k] + '</span></label>'; }).join('');
    return '' +
      '<section class="box"><h3>Фото и видео</h3><div class="media" id="edMedia"></div><p class="hint">Первое фото — главное, второе показывается при наведении. Перетащите фото или используйте стрелки, чтобы поменять порядок. Видео — до 80 МБ.</p></section>' +
      '<section class="box"><h3>Основное</h3>' +
      '<label class="fld"><span>Название *</span><input class="inp" data-k="name" value="' + esc(d.name) + '" placeholder="Например: Air Force 1 «Triple White»"></label>' +
      '<div class="row2"><label class="fld"><span>Бренд</span><input class="inp" data-k="brand" list="brandList" value="' + esc(d.brand) + '" placeholder="Nike, Adidas…"><datalist id="brandList">' + BN.BRANDS.map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></label>' +
      '<label class="fld"><span>Категория</span><select class="inp" data-k="cat">' + catOpts + '</select></label></div>' +
      '<div class="fld"><span>Для кого</span><div class="tagset" id="edGender">' + g + '</div></div>' +
      '<label class="fld"><span>Описание</span><textarea class="inp" data-k="desc" placeholder="Материал, посадка, на что обратить внимание">' + esc(d.desc) + '</textarea></label></section>' +
      '<section class="box"><h3>Цена и скидка</h3>' +
      '<div class="row2"><label class="fld"><span>Цена, ₸ *</span><input class="inp" data-k="price" type="number" inputmode="numeric" min="0" step="10" value="' + esc(d.price) + '" placeholder="29900"></label>' +
      '<label class="fld"><span>Старая цена, ₸</span><input class="inp" data-k="oldPrice" type="number" inputmode="numeric" min="0" step="10" value="' + esc(d.oldPrice || '') + '" placeholder="если есть скидка"><small>Будет зачёркнута рядом с ценой</small></label></div>' +
      '<div class="disc"><span class="hint">Быстрая скидка:</span><button type="button" class="tbtn" data-disc="10">−10%</button><button type="button" class="tbtn" data-disc="20">−20%</button><button type="button" class="tbtn" data-disc="30">−30%</button><button type="button" class="tbtn" data-disc="50">−50%</button><button type="button" class="tbtn" data-disc="0">Убрать скидку</button></div>' +
      '<p class="disc-out" id="discOut"></p></section>' +
      '<section class="box"><h3>Размеры и наличие</h3>' +
      '<div class="presets" id="edPresets">' + Object.keys(BN.SIZE_PRESETS).map(function (k) { return '<button type="button" data-preset="' + k + '"' + (d.sizeType === k ? ' class="on"' : '') + '>' + BN.SIZE_PRESETS[k].name + '</button>'; }).join('') + '</div>' +
      '<p class="hint">Нажмите на размер, чтобы он появился на сайте. Цифра — сколько штук или пар в наличии. Если поставить 0 — размер будет зачёркнут («закончился»).</p>' +
      '<div class="sgrid" id="edSizes"></div>' +
      '<div class="sz-tools"><button type="button" class="tbtn tbtn--lime" id="szAll">Отметить все</button><button type="button" class="tbtn" id="szNone">Очистить</button><input class="inp" id="szCustom" placeholder="Свой размер, напр. 47"><button type="button" class="tbtn" id="szAdd">+ Добавить</button></div></section>' +
      '<section class="box"><h3>Метки и показ</h3><div class="tagset" id="edTags">' + tags + '</div>' +
      '<label class="sw"><input type="checkbox" id="edVis"' + (d.status !== 'hidden' ? ' checked' : '') + '><i></i>Показывать на сайте</label></section>';
  }
  function renderItemMedia() {
    var d = SH.draft, box = $('#edMedia'); if (!box) return;
    var html = d.photos.map(function (p, i) {
      return '<div class="mtile' + (i ? '' : ' main') + '" draggable="true" data-i="' + i + '">' + mediaTag(p) + (i ? '' : '<span class="tag">Главное</span>') +
        '<div class="ctl"><span><button type="button" data-mv="-1" title="Левее">‹</button> <button type="button" data-mv="1" title="Правее">›</button></span><button type="button" class="x" data-rm="' + i + '" title="Удалить">×</button></div></div>';
    }).join('');
    html += '<div class="madd" id="addPhotos" tabindex="0" role="button"><b>+</b>Добавить фото<small>можно сразу несколько</small></div>';
    html += d.video ? '<div class="mtile"><video src="' + esc(BN.src(d.video)) + '" muted playsinline controls preload="metadata"></video><span class="tag">Видео</span><div class="ctl"><span></span><button type="button" class="x" data-rmvid title="Удалить видео">×</button></div></div>'
      : '<div class="madd" id="addVideo" tabindex="0" role="button"><b>▶</b>Добавить видео<small>MP4 / MOV</small></div>';
    box.innerHTML = html;
  }
  function moveArr(a, i, j) { if (j < 0 || j >= a.length) return; var x = a.splice(i, 1)[0]; a.splice(j, 0, x); }

  /* размеры */
  function renderSizes() {
    var d = SH.draft, box = $('#edSizes'); if (!box) return;
    var preset = (BN.SIZE_PRESETS[d.sizeType] || BN.SIZE_PRESETS.clothes).list;
    var all = preset.slice();
    d.sizes.forEach(function (s) { if (all.indexOf(s.s) < 0) all.push(s.s); });
    box.innerHTML = all.map(function (s) {
      var cur = d.sizes.filter(function (x) { return x.s === s; })[0];
      if (!cur) return '<div class="sz" data-sz="' + esc(s) + '"><b>' + esc(s) + '</b><small>нет</small></div>';
      var q = +cur.q || 0;
      return '<div class="sz in' + (q ? '' : ' zero') + '" data-sz="' + esc(s) + '"><b>' + esc(s) + '</b><div class="step"><button type="button" data-q="-1" aria-label="Меньше">−</button><span>' + q + '</span><button type="button" data-q="1" aria-label="Больше">+</button></div><small>' + (q ? 'в наличии' : 'закончился') + '</small></div>';
    }).join('');
  }
  function sortSizes(d) {
    var order = (BN.SIZE_PRESETS[d.sizeType] || { list: [] }).list;
    d.sizes.sort(function (a, b) {
      var ia = order.indexOf(a.s), ib = order.indexOf(b.s);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1; if (ib >= 0) return 1;
      return (parseFloat(a.s) || 0) - (parseFloat(b.s) || 0);
    });
  }
  function updDisc() {
    var d = SH && SH.draft, o = $('#discOut'); if (!o || !d) return;
    var pr = BN.pricing(d, D.promos);
    var txt = '';
    if (+d.oldPrice > +d.price && +d.price > 0) txt = 'Скидка ' + Math.round((1 - d.price / d.oldPrice) * 100) + '% — покупатель увидит ' + money(d.price) + ' вместо ' + money(d.oldPrice);
    if (pr.promo) txt += (txt ? '. ' : '') + 'Акция «' + pr.promo.title + '» даёт ещё −' + pr.promo.percent + '%: итоговая цена ' + money(pr.price);
    o.textContent = txt; o.classList.toggle('on', !!txt);
  }

  /* ---------- предпросмотр карточки ---------- */
  function previewCard(it) {
    var pr = BN.pricing(it, D.promos), ph = (it.photos || [])[0], b = [];
    if (pr.pct > 0) b.push('<span class="badge badge--sale">−' + pr.pct + '%</span>');
    if ((it.tags || []).indexOf('new') >= 0) b.push('<span class="badge badge--lime">New</span>');
    if ((it.tags || []).indexOf('hit') >= 0) b.push('<span class="badge badge--ink">Хит</span>');
    if ((it.tags || []).indexOf('last') >= 0) b.push('<span class="badge">Последние</span>');
    if ((it.tags || []).indexOf('gift') >= 0) b.push('<span class="badge">Подарок</span>');
    var sz = (it.sizes || []).slice(0, 10).map(function (s) { return '<span' + (+s.q > 0 ? '' : ' class="no"') + '>' + esc(s.s) + '</span>'; }).join('');
    return '<div class="card"><div class="card__media">' + (ph ? '<img src="' + esc(BN.src(ph)) + '" alt="">' : '<div class="ph">' + BN.FIG.figure + '</div>') +
      '<div class="badges">' + b.join('') + '</div>' + (it.video ? '<span class="card__vid"><svg viewBox="0 0 12 14"><path d="M0 0l12 7-12 7z" fill="#fff"/></svg></span>' : '') +
      (BN.inStock(it) ? '' : '<div class="card__out">Нет в наличии</div>') + '</div>' +
      '<div class="card__body"><div class="card__brand">' + esc(it.brand || catName(it.cat)) + '</div><h3 class="card__title">' + esc(it.name || 'Название товара') + '</h3>' +
      '<div class="card__price"><b>' + money(pr.price) + '</b>' + (pr.old ? '<s>' + money(pr.old) + '</s>' : '') + '</div>' + (sz ? '<div class="card__sizes">' + sz + '</div>' : '') + '</div></div>' +
      (it.status === 'hidden' ? '<p class="hint" style="margin-top:12px">Товар скрыт — на сайте его не видно.</p>' : '');
  }
  function previewPromo(p) {
    var t = BN.PROMO_THEMES[p.theme] || BN.PROMO_THEMES.lime;
    var media = p.image ? '<img src="' + esc(BN.src(p.image)) + '" alt="">' : (p.video ? mediaTag(p.video, true) : '');
    var dt = p.from && p.to ? 'с ' + p.from.slice(8) + '.' + p.from.slice(5, 7) + ' по ' + p.to.slice(8) + '.' + p.to.slice(5, 7) : (p.to ? 'до ' + p.to.slice(8) + '.' + p.to.slice(5, 7) : 'Акция действует');
    return '<div class="promo' + (p.theme === 'white' ? ' promo--white' : '') + '" style="--bg:' + t.bg + ';--fg:' + t.fg + '"><div class="promo__img">' + media + (p.badge ? '<span class="promo__badge">' + esc(p.badge) + '</span>' : '') + '</div>' +
      '<div class="promo__body"><h3 class="promo__title">' + esc(p.title || 'Заголовок акции') + '</h3><p class="promo__text">' + esc(p.text || 'Текст акции') + '</p>' +
      '<div class="promo__foot"><span>' + esc(dt) + '</span><span class="go"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div></div></div>';
  }

  /* ---------- события в редакторе ---------- */
  var form = $('#sheetForm');
  form.addEventListener('input', function (e) {
    if (!SH) return;
    var k = e.target.getAttribute('data-k'), d = SH.draft;
    if (k) { d[k] = e.target.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value; touch(); if (SH.kind === 'item') updDisc(); }
    if (e.target.id === 'pickQ') filterPick(e.target.value);
  });
  form.addEventListener('change', function (e) {
    if (!SH) return;
    var d = SH.draft, t = e.target;
    if (t.name === 'gender') { d.gender = t.value; touch(); }
    if (t.hasAttribute('data-tag')) { var k = t.getAttribute('data-tag'); d.tags = d.tags.filter(function (x) { return x !== k; }); if (t.checked) d.tags.push(k); touch(); }
    if (t.id === 'edVis') { d.status = t.checked ? 'active' : 'hidden'; touch(); }
    if (t.id === 'prActive') { d.active = t.checked; touch(); }
    if (t.id === 'prHero') { d.hero = t.checked; touch(); }
    if (t.name === 'theme') { d.theme = t.value; touch(); }
    if (t.name === 'applyTo') { d.applyTo = t.value; renderApply(); touch(); }
    if (t.hasAttribute('data-pcat')) { var c = t.getAttribute('data-pcat'); d.cats = d.cats.filter(function (x) { return x !== c; }); if (t.checked) d.cats.push(c); touch(); }
    if (t.hasAttribute('data-pitem')) { var id = t.getAttribute('data-pitem'); d.items = d.items.filter(function (x) { return x !== id; }); if (t.checked) d.items.push(id); if ($('#pickN')) $('#pickN').textContent = d.items.length; touch(); }
    if (t.getAttribute('data-k') === 'cat' && SH.kind === 'item') {
      if (!d.sizes.length) { d.sizeType = d.cat === 'sneakers' ? 'shoes' : (d.cat === 'acc' ? 'one' : (d.cat === 'pants' ? 'jeans' : 'clothes')); $$('#edPresets button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-preset') === d.sizeType); }); renderSizes(); }
    }
  });
  form.addEventListener('click', function (e) {
    if (!SH) return;
    var d = SH.draft, t;
    /* фото товара */
    if (e.target.closest('#addPhotos')) {
      return pickFiles('image/*', true).then(function (fs) { if (!fs.length) return; return uploadMany(fs).then(function (refs) { d.photos = d.photos.concat(refs); renderItemMedia(); touch(); }); });
    }
    if (e.target.closest('#addVideo')) {
      return pickFiles('video/mp4,video/quicktime,video/webm,video/*', false).then(function (fs) { if (!fs.length) return; return uploadMany(fs).then(function (refs) { if (refs[0]) { d.video = refs[0]; renderItemMedia(); touch(); } }); });
    }
    if ((t = e.target.closest('[data-rm]'))) { d.photos.splice(+t.getAttribute('data-rm'), 1); renderItemMedia(); return touch(); }
    if (e.target.closest('[data-rmvid]')) { d.video = ''; renderItemMedia(); return touch(); }
    if ((t = e.target.closest('[data-mv]'))) { var i = +t.closest('.mtile').getAttribute('data-i'); moveArr(d.photos, i, i + +t.getAttribute('data-mv')); renderItemMedia(); return touch(); }
    /* скидка */
    if ((t = e.target.closest('[data-disc]'))) {
      var p = +t.getAttribute('data-disc'), base = +d.oldPrice > +d.price ? +d.oldPrice : +d.price;
      if (!(base > 0)) return toast('Сначала укажите цену', 'err');
      if (!p) { d.price = base; d.oldPrice = 0; } else { d.oldPrice = base; d.price = Math.round(base * (1 - p / 100) / 10) * 10; }
      $('[data-k="price"]').value = d.price; $('[data-k="oldPrice"]').value = d.oldPrice || '';
      updDisc(); return touch();
    }
    /* размеры */
    if ((t = e.target.closest('[data-preset]'))) {
      d.sizeType = t.getAttribute('data-preset');
      $$('#edPresets button').forEach(function (b) { b.classList.toggle('on', b === t); });
      var keep = BN.SIZE_PRESETS[d.sizeType].list;
      if (d.sizes.some(function (s) { return keep.indexOf(s.s) < 0; }) && confirm('Убрать размеры, которых нет в новой сетке?')) d.sizes = d.sizes.filter(function (s) { return keep.indexOf(s.s) >= 0; });
      renderSizes(); return touch();
    }
    if ((t = e.target.closest('[data-q]'))) {
      var s = t.closest('.sz').getAttribute('data-sz'), cur = d.sizes.filter(function (x) { return x.s === s; })[0];
      if (cur) cur.q = Math.max(0, (+cur.q || 0) + +t.getAttribute('data-q'));
      renderSizes(); return touch();
    }
    if ((t = e.target.closest('.sz'))) {
      var sz = t.getAttribute('data-sz'), has = d.sizes.some(function (x) { return x.s === sz; });
      if (has) d.sizes = d.sizes.filter(function (x) { return x.s !== sz; }); else { d.sizes.push({ s: sz, q: 1 }); sortSizes(d); }
      renderSizes(); return touch();
    }
    if (e.target.id === 'szAll') { BN.SIZE_PRESETS[d.sizeType].list.forEach(function (s) { if (!d.sizes.some(function (x) { return x.s === s; })) d.sizes.push({ s: s, q: 1 }); }); sortSizes(d); renderSizes(); return touch(); }
    if (e.target.id === 'szNone') { d.sizes = []; renderSizes(); return touch(); }
    if (e.target.id === 'szAdd') {
      var v = $('#szCustom').value.trim().toUpperCase(); if (!v) return;
      if (!d.sizes.some(function (x) { return x.s === v; })) { d.sizes.push({ s: v, q: 1 }); sortSizes(d); }
      $('#szCustom').value = ''; renderSizes(); return touch();
    }
    /* акция: медиа */
    if (e.target.closest('#prImgAdd')) return pickFiles('image/*', false).then(function (fs) { if (!fs.length) return; return uploadMany(fs).then(function (r) { if (r[0]) { d.image = r[0]; renderPromoMedia(); touch(); } }); });
    if (e.target.closest('#prVidAdd')) return pickFiles('video/mp4,video/quicktime,video/webm,video/*', false).then(function (fs) { if (!fs.length) return; return uploadMany(fs).then(function (r) { if (r[0]) { d.video = r[0]; renderPromoMedia(); touch(); } }); });
    if (e.target.closest('[data-prrm]')) { d[e.target.closest('[data-prrm]').getAttribute('data-prrm')] = ''; renderPromoMedia(); return touch(); }
    if ((t = e.target.closest('[data-pall]'))) { var on = t.getAttribute('data-pall') === '1'; d.items = on ? D.items.map(function (x) { return x.id; }) : []; renderApply(); return touch(); }
  });
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'szCustom') { e.preventDefault(); $('#szAdd').click(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('madd')) { e.preventDefault(); e.target.click(); }
  });
  /* перетаскивание фото */
  var dragI = -1;
  form.addEventListener('dragstart', function (e) { var t = e.target.closest('.mtile[data-i]'); if (!t) return; dragI = +t.getAttribute('data-i'); t.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
  form.addEventListener('dragend', function () { dragI = -1; $$('.mtile').forEach(function (m) { m.classList.remove('drag', 'over'); }); });
  form.addEventListener('dragover', function (e) {
    var t = e.target.closest('.mtile[data-i]'), add = e.target.closest('.madd');
    if (t && dragI >= 0) { e.preventDefault(); $$('.mtile').forEach(function (m) { m.classList.toggle('over', m === t); }); }
    if (add && e.dataTransfer.types.indexOf('Files') >= 0) { e.preventDefault(); add.classList.add('over'); }
  });
  form.addEventListener('dragleave', function (e) { var add = e.target.closest('.madd'); if (add) add.classList.remove('over'); });
  form.addEventListener('drop', function (e) {
    if (!SH) return;
    var d = SH.draft, t = e.target.closest('.mtile[data-i]'), add = e.target.closest('.madd');
    if (t && dragI >= 0) { e.preventDefault(); moveArr(d.photos, dragI, +t.getAttribute('data-i')); dragI = -1; renderItemMedia(); return touch(); }
    if (add && e.dataTransfer.files.length) {
      e.preventDefault(); add.classList.remove('over');
      var fs = Array.prototype.slice.call(e.dataTransfer.files);
      var imgs = fs.filter(function (f) { return /^image\//.test(f.type); }), vids = fs.filter(function (f) { return /^video\//.test(f.type); });
      uploadMany(imgs.concat(vids.slice(0, 1))).then(function (refs) {
        refs.forEach(function (r, i) {
          if (i < imgs.length) { if (SH.kind === 'item') d.photos.push(r); else d.image = r; }
          else d.video = r;
        });
        if (SH.kind === 'item') renderItemMedia(); else renderPromoMedia();
        touch();
      });
    }
  });

  /* ================= АКЦИИ ================= */
  var TPL = [
    { k: 'kaspi', name: 'Kaspi 0-0-24', p: { theme: 'red', badge: 'Kaspi 0-0-24', title: 'Рассрочка 0-0-24', text: 'Покупайте в рассрочку Kaspi на 24 месяца без переплат и первого взноса. Оформление прямо в шоуруме.', percent: 0, applyTo: 'none', button: 'Узнать подробнее' } },
    { k: 'red', name: 'Kaspi Red', p: { theme: 'red', badge: 'Kaspi Red', title: 'Оплата с Kaspi Red', text: 'Оплачивайте покупки через Kaspi Red — без переплат, частями.', percent: 0, applyTo: 'none', button: 'Спросить в WhatsApp' } },
    { k: 'juma', name: 'Жұма скидки', p: { theme: 'lime', badge: 'Жұма −10%', title: 'Пятничные скидки', text: 'Каждую пятницу −10% на весь ассортимент. Скидка уже в ценах на сайте.', percent: 10, applyTo: 'all', button: 'Смотреть товары' } },
    { k: 'bf', name: 'Чёрная пятница', p: { theme: 'black', badge: '−20%', title: 'Чёрная пятница', text: 'Минус 20% на всё. Только несколько дней — успейте забрать свой размер.', percent: 20, applyTo: 'all', button: 'Смотреть товары' } },
    { k: 'cat', name: 'Скидка на категорию', p: { theme: 'lime', badge: '−15%', title: 'Скидка на кроссовки', text: 'Минус 15% на все кроссовки.', percent: 15, applyTo: 'cat', button: 'Смотреть кроссовки' } },
    { k: 'empty', name: 'Пустая', p: { theme: 'lime', badge: '', title: '', text: '', percent: 0, applyTo: 'none', button: '' } }
  ];
  function newPromo(tpl) {
    var base = { id: BN.uid('p-'), active: true, hero: true, theme: 'lime', badge: '', title: '', text: '', image: '', video: '', from: BN.today(), to: '', percent: 0, applyTo: 'none', cats: [], items: [], button: '' };
    var p = Object.assign(base, clone(tpl.p));
    if (tpl.k === 'cat' && D.cats[0]) p.cats = [D.cats.filter(function (c) { return c.id === 'sneakers'; }).length ? 'sneakers' : D.cats[0].id];
    editPromo(p, true);
  }
  function renderPromos() {
    $('#promoTpls').innerHTML = '<span class="hint" style="align-self:center">Быстрый старт:</span>' + TPL.map(function (t) { return '<button data-tpl="' + t.k + '">+ ' + esc(t.name) + '</button>'; }).join('');
    if (!D.promos.length) { $('#promoRows').innerHTML = '<div class="empty-box"><b>Акций пока нет</b>Выберите шаблон выше — например, «Kaspi 0-0-24».</div>'; return; }
    var t = BN.today();
    $('#promoRows').innerHTML = D.promos.map(function (p, i) {
      var live = BN.promoLive(p), st;
      if (!p.active) st = ['Выключена', '#eee', '#666'];
      else if (p.from && t < p.from) st = ['Начнётся ' + p.from.split('-').reverse().join('.'), '#fff4c2', '#7a5a00'];
      else if (p.to && t > p.to) st = ['Закончилась', '#ffe3df', '#c22a1b'];
      else st = ['Идёт сейчас', 'var(--lime)', 'var(--ink)'];
      var disc = +p.percent > 0 && p.applyTo !== 'none' ? '<span class="pill pill--red">−' + p.percent + '% ' + (p.applyTo === 'all' ? 'на всё' : p.applyTo === 'cat' ? 'на ' + p.cats.map(catName).join(', ') : 'на ' + p.items.length + ' тов.') + '</span>' : '';
      return '<div class="pcard' + (live ? '' : ' off') + '" data-id="' + esc(p.id) + '"><div data-pact="edit">' + previewPromo(p) + '</div>' +
        (disc ? '<div class="pcard__disc">' + disc + '</div>' : '') + '<div class="pcard__bar"><label class="sw"><input type="checkbox" data-pact="on"' + (p.active ? ' checked' : '') + '><i></i><span class="pcard__state" style="background:' + st[1] + ';color:' + st[2] + '">' + st[0] + '</span></label>' +
        '<button class="ibtn" data-pact="up" title="Выше"' + (i ? '' : ' disabled') + '>↑</button><button class="ibtn" data-pact="edit" title="Изменить">' + ICON.edit + '</button><button class="ibtn ibtn--del" data-pact="del" title="Удалить">' + ICON.del + '</button></div></div>';
    }).join('');
  }
  $('#promoTpls').addEventListener('click', function (e) { var b = e.target.closest('[data-tpl]'); if (b) newPromo(TPL.filter(function (t) { return t.k === b.getAttribute('data-tpl'); })[0]); });
  $('#addPromo').addEventListener('click', function () { newPromo(TPL[5]); });
  $('#promoRows').addEventListener('click', function (e) {
    var a = e.target.closest('[data-pact]'); if (!a || a.tagName === 'INPUT') return;
    var id = a.closest('.pcard').getAttribute('data-id'), act = a.getAttribute('data-pact');
    var p = D.promos.filter(function (x) { return x.id === id; })[0];
    if (act === 'edit') editPromo(p);
    if (act === 'del' && confirm('Удалить акцию «' + (p.title || 'без названия') + '»?')) commit(function (d) { d.promos = d.promos.filter(function (x) { return x.id !== id; }); }, 'Акция удалена');
    if (act === 'up') commit(function (d) { var i = -1; d.promos.forEach(function (x, n) { if (x.id === id) i = n; }); moveArr(d.promos, i, i - 1); }, 'Порядок изменён');
  });
  $('#promoRows').addEventListener('change', function (e) {
    if (e.target.getAttribute('data-pact') !== 'on') return;
    var id = e.target.closest('.pcard').getAttribute('data-id'), on = e.target.checked;
    commit(function (d) { d.promos.forEach(function (x) { if (x.id === id) x.active = on; }); }, on ? 'Акция включена' : 'Акция выключена');
  });

  function editPromo(p, isNew) {
    var d = clone(p); d.cats = d.cats || []; d.items = d.items || [];
    openSheet({
      title: isNew ? 'Новая акция' : 'Изменить акцию', draft: d, isNew: isNew, kind: 'promo',
      render: function () { $('#sheetForm').innerHTML = promoForm(d); renderPromoMedia(); renderApply(); },
      preview: function () { $('#sheetPreview').innerHTML = previewPromo(d); },
      save: function () {
        d.title = String(d.title || '').trim();
        if (!d.title) { toast('Напишите заголовок акции', 'err'); return $('[data-k="title"]').focus(); }
        d.percent = Math.max(0, Math.min(90, +d.percent || 0));
        if (d.from && d.to && d.to < d.from) return toast('Дата окончания раньше даты начала', 'err');
        if (d.applyTo === 'cat' && !d.cats.length) return toast('Выберите категории для скидки', 'err');
        if (d.applyTo === 'items' && !d.items.length) return toast('Отметьте товары для скидки', 'err');
        if (d.applyTo !== 'none' && !d.percent) return toast('Укажите процент скидки', 'err');
        commit(function (data) {
          var i = -1; data.promos.forEach(function (x, n) { if (x.id === d.id) i = n; });
          if (i >= 0) data.promos[i] = d; else data.promos.unshift(d);
        }, isNew ? 'Акция опубликована' : 'Акция обновлена').then(function (ok) { if (ok) closeSheet(true); });
      }
    });
  }
  function promoForm(d) {
    var th = Object.keys(BN.PROMO_THEMES).map(function (k) { var t = BN.PROMO_THEMES[k]; return '<label><input type="radio" name="theme" value="' + k + '"' + (d.theme === k ? ' checked' : '') + '><span><i style="background:' + t.bg + '"></i>' + t.name + '</span></label>'; }).join('');
    var ap = [['none', 'Без скидки — просто баннер'], ['all', 'На все товары'], ['cat', 'На категории'], ['items', 'На выбранные товары']].map(function (a) { return '<label><input type="radio" name="applyTo" value="' + a[0] + '"' + (d.applyTo === a[0] ? ' checked' : '') + '><span>' + a[1] + '</span></label>'; }).join('');
    return '' +
      '<section class="box"><h3>Текст акции</h3>' +
      '<div class="row2"><label class="fld"><span>Плашка</span><input class="inp" data-k="badge" value="' + esc(d.badge) + '" placeholder="−20%, Kaspi Red, NEW"><small>Короткая надпись на картинке</small></label>' +
      '<label class="fld"><span>Текст кнопки</span><input class="inp" data-k="button" value="' + esc(d.button) + '" placeholder="Смотреть товары"></label></div>' +
      '<label class="fld"><span>Заголовок *</span><input class="inp" data-k="title" value="' + esc(d.title) + '" placeholder="Чёрная пятница на пуховики"></label>' +
      '<label class="fld"><span>Описание</span><textarea class="inp" data-k="text" placeholder="Условия акции">' + esc(d.text) + '</textarea></label>' +
      '<div class="fld"><span>Цвет карточки</span><div class="swatches">' + th + '</div></div></section>' +
      '<section class="box"><h3>Фото и видео</h3><div class="media" id="prMedia"></div><p class="hint">Фото будет обложкой карточки. Видео проигрывается, когда покупатель открывает акцию.</p></section>' +
      '<section class="box"><h3>Когда показывать</h3>' +
      '<div class="row2"><label class="fld"><span>Начало</span><input class="inp" type="date" data-k="from" value="' + esc(d.from) + '"></label><label class="fld"><span>Окончание</span><input class="inp" type="date" data-k="to" value="' + esc(d.to) + '"><small>Пусто — без срока. После этой даты акция скроется сама</small></label></div>' +
      '<label class="sw"><input type="checkbox" id="prActive"' + (d.active ? ' checked' : '') + '><i></i>Акция включена</label></section>' +
      '<section class="box"><h3>Скидка на товары</h3><p class="hint">Если включить, цены на сайте пересчитаются сами: старая цена зачеркнётся, появится новая.</p>' +
      '<div class="tagset">' + ap + '</div><div id="applyBox"></div></section>';
  }
  function renderPromoMedia() {
    var d = SH.draft, box = $('#prMedia'); if (!box) return;
    box.style.gridTemplateColumns = 'repeat(auto-fill,minmax(180px,1fr))';
    box.innerHTML = (d.image ? '<div class="mtile mtile--wide">' + mediaTag(d.image) + '<span class="tag">Обложка</span><div class="ctl"><span></span><button type="button" class="x" data-prrm="image">×</button></div></div>'
      : '<div class="madd mtile--wide" id="prImgAdd" tabindex="0" role="button"><b>+</b>Фото обложки</div>') +
      (d.video ? '<div class="mtile mtile--wide"><video src="' + esc(BN.src(d.video)) + '" muted playsinline controls preload="metadata"></video><span class="tag">Видео</span><div class="ctl"><span></span><button type="button" class="x" data-prrm="video">×</button></div></div>'
        : '<div class="madd mtile--wide" id="prVidAdd" tabindex="0" role="button"><b>▶</b>Видео (по желанию)</div>');
  }
  function renderApply() {
    var d = SH.draft, box = $('#applyBox'); if (!box) return;
    if (d.applyTo === 'none') { box.innerHTML = ''; return; }
    var h = '<div class="row2" style="margin-top:6px"><label class="fld"><span>Скидка, %</span><input class="inp" type="number" inputmode="numeric" min="1" max="90" data-k="percent" value="' + esc(d.percent || '') + '" placeholder="15"></label><div></div></div>';
    if (d.applyTo === 'cat') h += '<div class="fld" style="margin-top:12px"><span>Категории</span><div class="tagset">' + D.cats.map(function (c) { return '<label><input type="checkbox" data-pcat="' + esc(c.id) + '"' + (d.cats.indexOf(c.id) >= 0 ? ' checked' : '') + '><span>' + esc(c.name) + '</span></label>'; }).join('') + '</div></div>';
    if (d.applyTo === 'items') h += '<div class="fld" style="margin-top:12px"><span>Товары <small class="hint">(отмечено: <b id="pickN">' + d.items.length + '</b>)</small></span><div class="sz-tools"><input class="inp" id="pickQ" placeholder="Поиск товара" style="width:220px"><button type="button" class="tbtn" data-pall="1">Выбрать все</button><button type="button" class="tbtn" data-pall="0">Снять все</button></div><div class="picklist" id="pickList">' +
      D.items.map(function (it) { return '<label data-n="' + esc(BN.norm(it.name + ' ' + it.brand)) + '"><input type="checkbox" data-pitem="' + esc(it.id) + '"' + (d.items.indexOf(it.id) >= 0 ? ' checked' : '') + '>' + ((it.photos || [])[0] ? '<img src="' + esc(BN.src(it.photos[0])) + '" alt="">' : '') + esc((it.brand ? it.brand + ' ' : '') + it.name) + ' — ' + money(it.price) + '</label>'; }).join('') + '</div></div>';
    box.innerHTML = h;
  }
  function filterPick(q) { q = BN.norm(q); $$('#pickList label').forEach(function (l) { l.hidden = q && l.getAttribute('data-n').indexOf(q) < 0; }); }

  /* ================= КАТЕГОРИИ ================= */
  function renderCats() {
    var counts = {}; D.items.forEach(function (it) { counts[it.cat] = (counts[it.cat] || 0) + 1; });
    $('#catRows').innerHTML = D.cats.map(function (c, i) {
      return '<div class="cat-row" data-id="' + esc(c.id) + '"><div class="mv"><button data-cmv="-1"' + (i ? '' : ' disabled') + ' aria-label="Выше">▲</button><button data-cmv="1"' + (i < D.cats.length - 1 ? '' : ' disabled') + ' aria-label="Ниже">▼</button></div>' +
        '<input class="inp" data-cname value="' + esc(c.name) + '"><span class="count">' + (counts[c.id] || 0) + ' тов.</span><button class="ibtn ibtn--del" data-cdel title="Удалить">' + ICON.del + '</button></div>';
    }).join('') || '<p class="hint">Категорий нет — добавьте первую.</p>';
  }
  $('#catRows').addEventListener('change', function (e) {
    if (!e.target.hasAttribute('data-cname')) return;
    var id = e.target.closest('.cat-row').getAttribute('data-id'), v = e.target.value.trim();
    if (!v) return renderCats();
    commit(function (d) { d.cats.forEach(function (c) { if (c.id === id) c.name = v; }); }, 'Категория переименована');
  });
  $('#catRows').addEventListener('click', function (e) {
    var row = e.target.closest('.cat-row'); if (!row) return;
    var id = row.getAttribute('data-id'), b;
    if ((b = e.target.closest('[data-cmv]'))) commit(function (d) { var i = -1; d.cats.forEach(function (c, n) { if (c.id === id) i = n; }); moveArr(d.cats, i, i + +b.getAttribute('data-cmv')); }, 'Порядок изменён');
    if (e.target.closest('[data-cdel]')) {
      var n = D.items.filter(function (it) { return it.cat === id; }).length;
      var other = D.cats.filter(function (c) { return c.id !== id; })[0];
      if (n && !other) return toast('Нельзя удалить единственную категорию с товарами', 'err');
      var msg = n ? 'В категории ' + n + ' тов. Удалить её и перенести товары в «' + other.name + '»?' : 'Удалить категорию «' + catName(id) + '»?';
      if (confirm(msg)) commit(function (d) { d.cats = d.cats.filter(function (c) { return c.id !== id; }); d.items.forEach(function (it) { if (it.cat === id) it.cat = other.id; }); d.promos.forEach(function (p) { p.cats = (p.cats || []).filter(function (c) { return c !== id; }); }); }, 'Категория удалена');
    }
  });
  $('#catAdd').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('#catNew').value.trim(); if (!v) return;
    commit(function (d) { d.cats.push({ id: BN.uid('c-'), name: v }); }, 'Категория добавлена').then(function (ok) { if (ok) $('#catNew').value = ''; });
  });

  /* ================= САЙТ ================= */
  var SD = null;
  function renderSite() {
    SD = clone(D.settings);
    var s = SD;
    function f(k, label, ph, hint, type) { return '<label class="fld"><span>' + label + '</span><input class="inp" data-s="' + k + '" value="' + esc(s[k] || '') + '" placeholder="' + esc(ph || '') + '"' + (type ? ' type="' + type + '"' : '') + '>' + (hint ? '<small>' + hint + '</small>' : '') + '</label>'; }
    function ta(k, label, hint, rows) { return '<label class="fld"><span>' + label + '</span><textarea class="inp" data-s="' + k + '" rows="' + (rows || 4) + '">' + esc(k === 'marquee' ? (s.marquee || []).join('\n') : (s[k] || '')) + '</textarea>' + (hint ? '<small>' + hint + '</small>' : '') + '</label>'; }
    $('#siteForm').innerHTML = '' +
      '<section class="box"><h3>Контакты</h3>' + f('whatsapp', 'WhatsApp для заказов', '77001621162', 'Номер без +, сюда приходят все заказы с сайта') + f('instagram', 'Instagram', 'br.nemodnye', 'Имя аккаунта без @') +
      '<div class="row2">' + f('rating', 'Рейтинг 2ГИС', '4.9') + f('reviews', 'Кол-во отзывов', '1028') + '</div></section>' +
      '<section class="box"><h3>Главный экран</h3>' + f('heroKicker', 'Надпись над заголовком', 'Кроссовки · Одежда · Куртки') + ta('heroTitle', 'Большой заголовок', 'Каждая строка — с новой строки. Последняя строка выделится лаймом', 2) + ta('heroText', 'Текст под заголовком', '', 3) +
      f('heroCaption', 'Подпись на фото', 'Новая коллекция уже в шоуруме') +
      f('heroTag', 'Ценник «кроссовки от» на фото', '3 990 ₸', 'Пусто — ценник не показывается') +
      '<div class="row2"><div class="fld"><span>Главное фото</span><div class="media" id="siteHero"></div></div><div class="fld"><span>Маленькое фото</span><div class="media" id="siteHero2"></div></div></div></section>' +
      '<section class="box"><h3>Бегущая строка</h3>' + ta('marquee', 'Фразы', 'Каждая фраза — с новой строки', 5) + '</section>' +
      '<section class="box"><h3>Шоурум</h3>' + f('aboutTitle', 'Заголовок', '') + ta('aboutText', 'Текст', '', 4) + '<div class="fld"><span>Фото шоурума (до 3)</span><div class="media" id="siteGal"></div></div></section>' +
      '<section class="box" style="grid-column:1/-1"><h3>Адреса шоурумов</h3><div class="site-grid" id="siteBranches"></div><button type="button" class="tbtn" id="brAdd" style="justify-self:start">+ Добавить шоурум</button></section>';
    renderSiteMedia(); renderBranches();
  }
  function renderSiteMedia() {
    var s = SD;
    $('#siteHero').innerHTML = s.heroImage ? '<div class="mtile main">' + mediaTag(s.heroImage) + '<div class="ctl"><span></span><button type="button" class="x" data-shero>×</button></div></div>' : '<div class="madd" data-sheroadd tabindex="0" role="button"><b>+</b>Фото</div>';
    $('#siteHero2').innerHTML = s.heroImage2 ? '<div class="mtile">' + mediaTag(s.heroImage2) + '<div class="ctl"><span></span><button type="button" class="x" data-shero2>×</button></div></div>' : '<div class="madd" data-shero2add tabindex="0" role="button"><b>+</b>Фото</div>';
    $('#siteGal').innerHTML = s.gallery.map(function (g, i) { return '<div class="mtile">' + mediaTag(g) + '<div class="ctl"><span><button type="button" data-gmv="' + i + '">‹</button></span><button type="button" class="x" data-grm="' + i + '">×</button></div></div>'; }).join('') +
      (s.gallery.length < 3 ? '<div class="madd" data-galadd tabindex="0" role="button"><b>+</b>Фото</div>' : '');
  }
  function renderBranches() {
    $('#siteBranches').innerHTML = SD.branches.map(function (b, i) {
      function bf(k, l, ph) { return '<label class="fld"><span>' + l + '</span><input class="inp" data-b="' + i + '" data-bk="' + k + '" value="' + esc(b[k] || '') + '" placeholder="' + esc(ph) + '"></label>'; }
      return '<div class="branch-ed"><button type="button" class="ibtn ibtn--del" data-brdel="' + i + '" title="Удалить">' + ICON.del + '</button>' + bf('city', 'Город', 'Караганда') + bf('address', 'Адрес', 'пр. Бухар-жырау, 53а') + bf('hours', 'Время работы', 'Ежедневно 10:00–20:00') +
        '<div class="row2">' + bf('whatsapp', 'WhatsApp', 'пусто = общий') + bf('instagram', 'Instagram', 'br.nemodnye') + '</div>' + bf('map', 'Ссылка на 2ГИС / карту', 'https://2gis.kz/…') + '</div>';
    }).join('');
  }
  var sf = $('#siteForm');
  sf.addEventListener('input', function (e) {
    var k = e.target.getAttribute('data-s');
    if (k) SD[k] = k === 'marquee' ? e.target.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean) : e.target.value;
    if (e.target.hasAttribute('data-bk')) SD.branches[+e.target.getAttribute('data-b')][e.target.getAttribute('data-bk')] = e.target.value;
    if (k === 'whatsapp') SD.whatsapp = BN.digits(e.target.value);
  });
  sf.addEventListener('click', function (e) {
    var t;
    if (e.target.closest('[data-shero]')) { SD.heroImage = ''; return renderSiteMedia(); }
    if (e.target.closest('[data-sheroadd]')) return pickFiles('image/*').then(function (fs) { if (fs.length) uploadMany(fs).then(function (r) { if (r[0]) { SD.heroImage = r[0]; renderSiteMedia(); } }); });
    if (e.target.closest('[data-shero2]')) { SD.heroImage2 = ''; return renderSiteMedia(); }
    if (e.target.closest('[data-shero2add]')) return pickFiles('image/*').then(function (fs) { if (fs.length) uploadMany(fs).then(function (r) { if (r[0]) { SD.heroImage2 = r[0]; renderSiteMedia(); } }); });
    if (e.target.closest('[data-galadd]')) return pickFiles('image/*', true).then(function (fs) { if (fs.length) uploadMany(fs.slice(0, 3 - SD.gallery.length)).then(function (r) { SD.gallery = SD.gallery.concat(r); renderSiteMedia(); }); });
    if ((t = e.target.closest('[data-grm]'))) { SD.gallery.splice(+t.getAttribute('data-grm'), 1); return renderSiteMedia(); }
    if ((t = e.target.closest('[data-gmv]'))) { var i = +t.getAttribute('data-gmv'); moveArr(SD.gallery, i, i - 1); return renderSiteMedia(); }
    if (e.target.closest('#brAdd')) { SD.branches.push({ city: '', address: '', hours: 'Ежедневно 10:00–20:00', whatsapp: '', instagram: '', map: '' }); return renderBranches(); }
    if ((t = e.target.closest('[data-brdel]')) && confirm('Удалить этот адрес?')) { SD.branches.splice(+t.getAttribute('data-brdel'), 1); return renderBranches(); }
  });
  $('#saveSite').addEventListener('click', function () {
    if (!BN.digits(SD.whatsapp)) return toast('Укажите номер WhatsApp', 'err');
    var s = clone(SD);
    commit(function (d) { d.settings = s; }, 'Сайт обновлён');
  });

  /* ---------- старт ---------- */
  token = store(TOKEN_KEY) || '';
  if (token) start(); else showLogin();
})();
