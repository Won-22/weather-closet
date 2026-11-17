/* 옷장 예보 · 화면
   - 날씨: Open-Meteo (키 없음, 브라우저에서 바로 부름). 30분 동안은 이 브라우저에 저장한 값을 다시 씀
   - 위치: 코드에 넣어 둔 도시 좌표 중 고르기, 또는 브라우저 위치(소수 둘째 자리로 줄여 이 브라우저에만 저장)
   - 내 옷장: 이 브라우저(localStorage)에만 저장. 서버·로그인 없음 */
(function () {
  'use strict';
  var R = window.Rules, I = window.Icons;

  var CITIES = [
    ['seoul', '서울', 37.5665, 126.978, '수도권'], ['incheon', '인천', 37.4563, 126.7052, '수도권'], ['suwon', '수원', 37.2636, 127.0286, '수도권'],
    ['chuncheon', '춘천', 37.8813, 127.7298, '강원'], ['wonju', '원주', 37.3422, 127.9202, '강원'], ['gangneung', '강릉', 37.7519, 128.8761, '강원'],
    ['daejeon', '대전', 36.3504, 127.3845, '충청'], ['sejong', '세종', 36.48, 127.289, '충청'], ['cheongju', '청주', 36.6424, 127.489, '충청'], ['cheonan', '천안', 36.8151, 127.1139, '충청'],
    ['jeonju', '전주', 35.8242, 127.148, '전라'], ['gwangju', '광주', 35.1595, 126.8526, '전라'], ['mokpo', '목포', 34.8118, 126.3922, '전라'], ['yeosu', '여수', 34.7604, 127.6622, '전라'],
    ['daegu', '대구', 35.8714, 128.6014, '경상'], ['andong', '안동', 36.5684, 128.7294, '경상'], ['pohang', '포항', 36.019, 129.3435, '경상'], ['ulsan', '울산', 35.5384, 129.3114, '경상'],
    ['busan', '부산', 35.1796, 129.0756, '경상'], ['changwon', '창원', 35.228, 128.6811, '경상'], ['jinju', '진주', 35.18, 128.1076, '경상'],
    ['jeju', '제주', 33.4996, 126.5312, '제주'], ['seogwipo', '서귀포', 33.2541, 126.56, '제주']
  ].map(function (c) { return { id: c[0], name: c[1], lat: c[2], lon: c[3], area: c[4] }; });
  var AREAS = ['수도권', '강원', '충청', '전라', '경상', '제주'];
  var SRC_URL = 'https://open-meteo.com/';
  var CACHE_MIN = 30;

  /* ---------- 저장 (이 브라우저에만) ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('wc.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('wc.' + k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 화면은 동작 */ } },
    del: function (k) { try { localStorage.removeItem('wc.' + k); } catch (e) { } }
  };

  var S = {
    city: store.get('city', null) || CITIES[0],
    win: store.get('win', { start: 8, end: 20 }),
    g: store.get('g', 'u'),
    closet: store.get('closet', []),
    mode: null, day: 0, dayAuto: true, shift: 0,
    view: 'home', wx: null, wxState: 'loading', mock: false, locating: false,
    toast: null, undo: null, clearArm: false, sheet: null
  };

  /* ---------- 도움 함수 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kstNow() { var d = new Date(Date.now() + 9 * 36e5); return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() }; }
  function dayName(date) { var d = new Date(date + 'T00:00:00Z'); return { m: d.getUTCMonth() + 1, d: d.getUTCDate(), w: '일월화수목금토'[d.getUTCDay()] }; }
  function r0(v) { return v == null ? '-' : Math.round(v); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function colorHex(c) { return (R.COLOR_OF[c] || { hex: '#c9ccd2' }).hex; }
  function iconOf(x) { return (R.SUB_META[x.sub] || { icon: 'tee' }).icon; }
  function catOf(x) { return (R.SUB_META[x.sub] || { cat: '' }).cat; }
  function hh(h) { return (h < 10 ? '0' : '') + h + '시'; }
  function nearestCity(lat, lon) {
    var best = null, bd = 1e9;
    CITIES.forEach(function (c) { var d = Math.pow(c.lat - lat, 2) + Math.pow((c.lon - lon) * Math.cos(lat * Math.PI / 180), 2); if (d < bd) { bd = d; best = c; } });
    return best;
  }
  function saveCloset() { store.set('closet', S.closet); }

  /* ---------- 날씨 불러오기 ---------- */
  function wxUrl(c) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day' +
      '&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,uv_index' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max' +
      '&timezone=Asia%2FSeoul&forecast_days=3&wind_speed_unit=ms';
  }
  function cityKey(c) { return c.lat.toFixed(2) + ',' + c.lon.toFixed(2); }
  function valid(d) { return d && d.hourly && d.daily && d.current && Array.isArray(d.hourly.time) && d.hourly.time.length >= 24; }

  function loadWx(force, tries) {
    var c = S.city, key = cityKey(c);
    var cache = store.get('wx', null);
    if (!force && cache && cache.key === key && Date.now() - cache.at < CACHE_MIN * 6e4 && valid(cache.data)) {
      S.wx = cache; S.wxState = 'ok'; S.mock = false; afterLoad(); return;
    }
    S.wxState = 'loading'; render();
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    fetch(wxUrl(c), ctl ? { signal: ctl.signal } : {}).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status); return r.json();
    }).then(function (d) {
      clearTimeout(tm);
      if (cityKey(S.city) !== key) return;
      if (!valid(d)) throw new Error('empty');
      S.wx = { key: key, at: Date.now(), data: d }; S.mock = false; S.wxState = 'ok';
      store.set('wx', S.wx); afterLoad();
    }).catch(function () {
      clearTimeout(tm);
      if (cityKey(S.city) !== key) return;
      if (cache && cache.key === key && valid(cache.data)) { S.wx = cache; S.wxState = 'stale'; S.mock = false; afterLoad(); return; }
      /* 첫 연결이 느릴 때가 있어 한 번은 조용히 다시 */
      if (!tries) { setTimeout(function () { if (cityKey(S.city) === key) loadWx(true, 1); }, 1200); return; }
      S.wx = null; S.wxState = 'fail'; render();
    });
  }
  function afterLoad() {
    var t = today();
    /* 오늘 밖에 있을 시간이 2시간도 안 남았으면 내일 옷차림부터 */
    if (S.dayAuto && t) S.day = (t.days > 1 && t.nowHour >= Math.max(S.win.start, S.win.end) - 1 ? 1 : 0);
    render();
  }

  /* 모의 날씨 (네트워크가 안 될 때만, 화면에 "모의 데이터예요"를 크게 밝힘) */
  function mockData() {
    var n = kstNow(), base = new Date(n.date + 'T00:00:00Z');
    var days = [0, 1, 2].map(function (i) { return new Date(base.getTime() + i * 864e5).toISOString().slice(0, 10); });
    var spec = [[6, 14, 20], [2, 9, 60], [-3, 3, 5]];
    var H = { time: [], temperature_2m: [], apparent_temperature: [], precipitation_probability: [], weather_code: [], wind_speed_10m: [], uv_index: [] };
    days.forEach(function (d, i) {
      for (var h = 0; h < 24; h++) {
        var lo = spec[i][0], hi = spec[i][1], f = Math.max(0, Math.sin((h - 6) / 18 * Math.PI));
        var t = lo + (hi - lo) * f, rain = i === 1 && h >= 15 && h <= 20 ? spec[i][2] : 5;
        H.time.push(d + 'T' + (h < 10 ? '0' : '') + h + ':00');
        H.temperature_2m.push(+t.toFixed(1)); H.apparent_temperature.push(+(t - 2).toFixed(1));
        H.precipitation_probability.push(rain); H.weather_code.push(rain >= 60 ? 61 : i === 2 ? 0 : 2);
        H.wind_speed_10m.push(i === 2 ? 6 : 2.5); H.uv_index.push(h > 9 && h < 16 ? 3 : 0);
      }
    });
    return {
      current: { time: n.date + 'T' + (n.hour < 10 ? '0' : '') + n.hour + ':00', temperature_2m: 12, apparent_temperature: 10, relative_humidity_2m: 54, weather_code: 2, wind_speed_10m: 2.5, is_day: 1 },
      hourly: H,
      daily: { time: days, weather_code: [2, 61, 0], temperature_2m_max: [14, 9, 3], temperature_2m_min: [6, 2, -3], apparent_temperature_max: [12, 7, 1], apparent_temperature_min: [4, 0, -5], precipitation_probability_max: [20, 60, 5], wind_speed_10m_max: [2.5, 2.5, 6], uv_index_max: [3, 3, 3] }
    };
  }

  /* 고른 날·시간의 계산 결과 */
  function today() {
    if (!S.wx) return null;
    var d = S.wx.data, n = kstNow();
    var base = d.daily.time.indexOf(n.date);
    if (base < 0) base = 0;
    return { data: d, base: base, nowHour: n.date === d.daily.time[base] ? n.hour : 0, days: Math.min(3, d.daily.time.length - base) };
  }
  function calc(dayOff) {
    var t = today(); if (!t) return null;
    var idx = t.base + dayOff; if (idx >= t.data.daily.time.length) return null;
    var from = dayOff === 0 ? t.nowHour : null;
    var w = R.windowStats(t.data, idx, S.win.start, S.win.end, from);
    var past = false;
    if (!w && dayOff === 0) { w = R.windowStats(t.data, idx, S.win.start, S.win.end, null); past = true; }
    if (!w) return null;
    return { w: w, j: R.judge(w), date: t.data.daily.time[idx], past: past, idx: idx };
  }

  /* ---------- 그리기 ---------- */
  var app;
  function render() {
    var ae = document.activeElement, fk = ae && ae.getAttribute && ae.getAttribute('data-fk');
    app.innerHTML = S.view === 'closet' ? viewCloset() : viewHome();
    if (fk) { var el = app.querySelector('[data-fk="' + fk + '"]'); if (el) el.focus({ preventScroll: true }); }
    afterPaint();
    renderToast();
  }

  /* 그린 뒤: 옆으로 넘기는 칸엔 끝 흐림 단서, 추천이 바뀌었을 때만 옷 카드를 살짝 띄움 */
  var lastSig = '';
  function afterPaint() {
    var h = app.querySelector('.hours');
    if (h) {
      var wrap = h.parentNode, upd = function () { wrap.classList.toggle('more-r', h.scrollLeft + h.clientWidth < h.scrollWidth - 4); wrap.classList.toggle('more-l', h.scrollLeft > 4); };
      upd(); h.addEventListener('scroll', upd, { passive: true });
    }
    var tiles = app.querySelector('.outfit [class^="tiles"]');
    if (tiles) {
      var sig = tiles.textContent;
      if (lastSig && sig !== lastSig) tiles.classList.add('pop');
      lastSig = sig;
    }
  }

  function topBar() {
    var n = S.closet.length;
    return '<header class="bar"><div class="bar-in">' +
      '<a class="brand" href="#" data-act="home" aria-label="옷장 예보 처음 화면">' + I.cloth('coat', 'var(--primary)', 'brand-ic') + '<span>옷장 예보</span></a>' +
      '<div class="row g4">' + (S.wx || S.wxState !== 'loading' ? '<button type="button" class="btn btn-ghost bar-btn" data-act="open-city" data-fk="open-city" aria-haspopup="dialog" aria-label="도시 바꾸기, 지금 ' + esc(S.city.id === 'here' ? '내 위치' : S.city.name) + '">' + I.ui('pin', 18) + '<span>' + esc(S.city.id === 'here' ? '내 위치' : S.city.name) + '</span>' + I.ui('down', 14) + '</button>' : '') +
      '<button type="button" class="btn btn-ghost bar-btn" data-act="go-closet" data-fk="go-closet">' + I.ui('closet') + '<span>내 옷장</span>' + (n ? '<span class="count num">' + n + '</span>' : '') + '</button></div>' +
      '</div></header>';
  }

  function mockBanner() {
    return S.mock ? '<div class="mock" role="status"><b>모의 데이터예요.</b> 날씨를 불러오지 못해 예시 날씨로 보여 드리고 있어요. <button type="button" class="link" data-act="retry">진짜 날씨 다시 불러오기</button></div>' : '';
  }

  function viewHome() {
    var head = topBar();
    if (S.wxState === 'loading' && !S.wx) {
      return head + '<main class="wrap"><section class="card hero" aria-busy="true"><div class="skel" style="width:30%"></div><div class="skel" style="width:60%;height:28px"></div><div class="skel" style="width:45%"></div></section>' +
        '<section class="card" aria-busy="true"><div class="skel" style="width:40%"></div><div class="tiles3"><div class="skel tile-sk"></div><div class="skel tile-sk"></div><div class="skel tile-sk"></div></div></section>' +
        '<p class="sr-only" role="status">' + esc(S.city.name) + ' 날씨를 불러오는 중이에요</p></main>' + footer();
    }
    if (!S.wx) {
      return head + '<main class="wrap"><section class="card empty-state" role="alert">' + I.sky('cloud') +
        '<h1 class="title2">' + esc(S.city.name) + ' 날씨를 못 가져왔어요</h1><p class="body2 c2">인터넷 연결을 확인하고 다시 시도해 주세요. 그래도 안 되면 예시 날씨로 어떻게 동작하는지 볼 수 있어요.</p>' +
        '<div class="row g8 wrapr"><button type="button" class="btn btn-primary" data-act="retry">' + I.ui('refresh', 18) + '다시 불러오기</button>' +
        '<button type="button" class="btn btn-secondary" data-act="mock">예시 날씨로 보기 (모의 데이터)</button>' +
        '<button type="button" class="btn btn-ghost" data-act="open-city">' + I.ui('pin', 18) + '다른 도시</button></div></section></main>' + footer();
    }
    var C = calc(S.day);
    if (!C) { S.day = 0; C = calc(0); }
    var mineOk = S.closet.length > 0;
    var mode = S.mode || (mineOk ? 'mine' : 'basic');
    if (!mineOk) mode = 'basic';
    var cards = R.genericCards(C.j, S.g);
    var seed = Math.floor(Date.parse(C.date) / 864e5) + S.shift;
    var outfit = mode === 'mine' ? R.closetOutfit(S.closet, C.j, seed) : null;
    var useOutfit = outfit && !outfit.miss ? outfit : null;
    var how = R.howTo(C.w, C.j, useOutfit, cards);
    return head + mockBanner() + '<main class="wrap grid">' +
      '<div class="col-a">' + heroCard() + planCard(C) + aboutCard() + '</div>' +
      '<div class="col-b">' + outfitCard(C, mode, cards, outfit) + howCard(how, C) + hourCard(C) + (mineOk ? gapCard() : '') + bandsCard(C) + '</div>' +
      '</main>' + footer();
  }

  function heroCard() {
    var d = S.wx.data, c = d.current, k = R.codeKind(c.weather_code), night = c.is_day === 0;
        var stale = S.wxState === 'stale' ? '<p class="hero-warn">' + I.ui('alert', 14) + ' 최신 날씨를 못 가져와 ' + Math.max(1, Math.round((Date.now() - S.wx.at) / 6e4)) + '분 전 날씨예요</p>' : '';
    var name = S.city.id === 'here' ? '내 위치' : S.city.name;
    var at = new Date(S.wx.at + 9 * 36e5), ah = at.getUTCHours(), am = at.getUTCMinutes();
    var upd = S.mock ? '모의 데이터' : (ah < 12 ? '오전 ' : '오후 ') + ((ah % 12) || 12) + ':' + (am < 10 ? '0' : '') + am + ' 기준';
    return '<section class="hero sky-' + (night ? 'night' : k) + '" aria-labelledby="hero-t">' +
      '<div class="hero-row"><p class="hero-place">' + I.ui('pin', 16) + esc(name) + (S.city.id === 'here' && S.city.near ? ' <span class="hero-near">' + esc(S.city.near) + ' 근처</span>' : '') + '</p>' +
      '<button type="button" class="hero-refresh' + (S.wxState === 'loading' ? ' spin' : '') + '" data-act="retry" data-fk="refresh" aria-label="날씨 새로 고침, ' + upd + '">' + I.ui('refresh', 15) + '<span class="num">' + upd + '</span></button></div>' +
      '<div class="hero-main"><h1 id="hero-t" class="hero-t"><span class="sr-only">' + esc(name) + ' · </span><span class="hero-temp num">' + r0(c.temperature_2m) + '°</span><span class="sr-only"> · </span>' +
      '<span class="hero-cond">' + esc(R.codeText(c.weather_code)) + '<span class="hero-feel">체감 <span class="num">' + r0(c.apparent_temperature) + '°</span></span></span></h1>' +
      I.sky(k, night) + '</div>' +
      stale + '</section>';
  }

  function planCard(C) {
    var t = today(), d = t.data;
    var tabs = [];
    for (var i = 0; i < t.days; i++) {
      var di = t.base + i, dn = dayName(d.daily.time[di]);
      var lbl = ['오늘', '내일', '모레'][i];
      tabs.push('<button type="button" role="tab" class="day-tab" data-act="day" data-v="' + i + '" data-fk="day' + i + '" aria-selected="' + (S.day === i) + '" tabindex="' + (S.day === i ? 0 : -1) + '">' +
        '<span class="day-l">' + lbl + ' <span class="c3">' + dn.d + '일 ' + dn.w + '</span></span>' +
        '<span class="day-v">' + I.sky(R.codeKind(d.daily.weather_code[di])) + '<span class="num">' + r0(d.daily.temperature_2m_min[di]) + '° / ' + r0(d.daily.temperature_2m_max[di]) + '°</span></span></button>');
    }
    var hours = function (sel, key) {
      var o = '';
      for (var h = 5; h <= 23; h++) o += '<option value="' + h + '"' + (h === sel ? ' selected' : '') + '>' + R.hourText(h) + '</option>';
      return '<select id="' + key + '" data-act="' + key + '" data-fk="' + key + '">' + o + '</select>';
    };
    var autoNote = S.dayAuto && S.day === 1 && t.nowHour >= Math.max(S.win.start, S.win.end) - 1 ? '<p class="caption c3">오늘 밖에 있을 시간이 거의 지나 내일 옷차림을 먼저 보여 드려요.</p>' : '';
    return '<section class="card o2" aria-labelledby="plan-t"><h2 id="plan-t" class="sr-only">언제 밖에 있나요</h2>' +
      '<div class="day-tabs" role="tablist" aria-label="날짜">' + tabs.join('') + '</div>' +
      '<div class="win"><span class="win-l">밖에 있는 시간</span>' +
      '<label class="sel"><span class="sr-only">나가는 시간</span>' + hours(S.win.start, 'win-start') + I.ui('down', 16) + '</label><span class="c3" aria-hidden="true">~</span>' +
      '<label class="sel"><span class="sr-only">돌아오는 시간</span>' + hours(S.win.end, 'win-end') + I.ui('down', 16) + '</label></div>' +
      autoNote + '</section>';
  }

  function slotTile(slot, x, key, rangeLabel, empty) {
    var fill = empty ? 'transparent' : x.fill;
    return '<div class="tile' + (key ? ' key' : '') + (empty ? ' empty' : '') + '">' +
      (key ? '<span class="key-badge">꼭 챙길 옷</span>' : '') +
      '<div class="tile-ic">' + I.cloth(x.icon, fill) + '</div>' +
      '<span class="tile-slot">' + esc(slot) + '</span><span class="tile-name">' + esc(x.name) + '</span>' +
      (rangeLabel ? '<span class="tile-r num">' + esc(rangeLabel) + '</span>' : '') + '</div>';
  }

  function outfitCard(C, mode, cards, outfit) {
    var dl = ['오늘', '내일', '모레'][S.day];
    var mineOk = S.closet.length > 0;
    var seg = mineOk ? '<div class="seg" role="radiogroup" aria-label="추천 방식">' +
      [['mine', '내 옷장'], ['basic', '기본 추천']].map(function (m) { return '<button type="button" role="radio" data-act="mode" data-v="' + m[0] + '" data-fk="mode-' + m[0] + '" aria-checked="' + (mode === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' : '';
    var body = '', foot = '';
    var basicTiles = function () {
      return '<div class="tiles3">' + cards.map(function (c) {
        return slotTile(c.slot, { name: c.name, icon: c.icon, fill: c.key ? 'var(--primary)' : 'var(--cloth)' }, c.key, c.band != null ? R.BANDS[c.band].t : '', c.empty);
      }).join('') + '</div>';
    };
    if (mode === 'mine' && outfit && !outfit.miss) {
      var L = [];
      if (C.j.needOuter) L.push(outfit.outer ? ['겉옷', outfit.outer] : ['겉옷', null]);
      L.push(['상의', outfit.top]);
      if (outfit.bottom) L.push(['하의', outfit.bottom]);
      if (outfit.shoe) L.push(['신발', outfit.shoe]);
      body = '<div class="tiles' + L.length + '">' + L.map(function (p, i) {
        var x = p[1];
        if (!x) return slotTile(p[0], { name: '맞는 겉옷 없음', icon: 'none' }, false, R.BANDS[C.j.outer].t, true);
        return slotTile(p[0], { name: R.itemLabel(x), icon: iconOf(x), fill: colorHex(x.color) }, p[0] === '겉옷' && i === 0, R.rangeText(R.itemRange(x)), false);
      }).join('') + '</div>' +
        '<p class="combo">' + esc([outfit.outer, outfit.top, outfit.bottom, outfit.shoe].filter(Boolean).map(R.itemLabel).join(' + ')) + '</p>' +
        (outfit.color ? '<p class="body2 c2 row g6">' + I.ui('palette', 16) + '<span>' + esc(outfit.color) + '</span></p>' : '');
      foot = '<div class="card-foot"><span class="caption c3">내 옷 ' + S.closet.length + '벌 중에서 골랐어요</span>' +
        (outfit.options > 1 ? '<button type="button" class="btn btn-secondary btn-s" data-act="shuffle" data-fk="shuffle">' + I.ui('shuffle', 16) + '다른 조합</button>' : '') + '</div>';
    } else if (mode === 'mine' && outfit && outfit.miss) {
      body = '<p class="notice">' + I.ui('info', 18) + '<span>' + dl + ' 날씨(' + esc(R.BANDS[C.j.inner].t) + ')에 맞는 <b>' + outfit.miss.join('·') + '</b>가 옷장에 없어요. 아래는 기본 추천이에요.</span></p>' + basicTiles();
      foot = '<div class="card-foot"><span class="caption c3">이 날씨엔 ' + esc(R.BANDS[C.j.inner].wear.split(' · ').slice(0, 3).join(', ')) + '</span><button type="button" class="btn btn-secondary btn-s" data-act="add" data-fk="add-miss">' + I.ui('plus', 16) + '옷 등록</button></div>';
    } else {
      body = basicTiles();
      var gseg = '<div class="seg seg-s" role="radiogroup" aria-label="옷차림 표">' + [['u', '공용'], ['f', '여성']].map(function (g) { return '<button type="button" role="radio" data-act="g" data-v="' + g[0] + '" data-fk="g-' + g[0] + '" aria-checked="' + (S.g === g[0]) + '">' + g[1] + '</button>'; }).join('') + '</div>';
      foot = mineOk ? '<div class="card-foot"><span class="caption c3">기온별 옷차림 기준</span>' + gseg + '</div>' :
        '<div class="cta"><div class="minw0"><p class="cta-t">내 옷을 등록하면, 내 옷으로 골라 드려요</p><p class="caption c2">종류·색·두께만 고르면 돼요. 사진·로그인 없이 이 브라우저에만 저장돼요.</p></div>' +
        '<div class="row g8 wrapr"><button type="button" class="btn btn-primary" data-act="add" data-fk="add-cta">' + I.ui('plus', 18) + '내 옷 등록</button><button type="button" class="btn btn-secondary" data-act="sample" data-fk="sample">예시 옷장으로 체험</button></div></div>' +
        '<div class="card-foot"><span class="caption c3">기온별 옷차림 기준</span>' + gseg + '</div>';
    }
    return '<section class="card outfit o3" aria-labelledby="of-t"><div class="card-h"><h2 id="of-t" class="title3">' + dl + '의 옷차림 <span class="c3 num title-sub">' + hh(C.w.start) + '~' + hh(C.w.end) + '</span></h2>' + seg + '</div>' +
      body + foot + '</section>';
  }

  /* PC 왼쪽 빈 곳: 어떻게 고르는지 3줄 (폰에서는 아래 8단계 표의 규칙으로 대신) */
  function aboutCard() {
    var L = [['clock', '밖에 있는 시간만 봐요', '하루 최고·최저 대신, 고른 시간의 1시간 단위 체감기온으로 판단해요.'],
      ['layer', '낮 옷과 겉옷을 따로 골라요', '상의·하의는 가장 따뜻할 때, 겉옷은 가장 추울 때 기준이에요.'],
      ['closet', '내 옷의 두께와 색까지', '기모·누빔은 더 추운 날로, 포인트 색은 한 벌만 들어가게 골라요.']];
    return '<section class="card about" aria-labelledby="ab-t"><h2 id="ab-t" class="title3">옷장 예보는 이렇게 골라요</h2><ol class="about-l">' +
      L.map(function (x) { return '<li>' + I.ui(x[0], 20) + '<div><p class="about-t">' + x[1] + '</p><p class="caption c2">' + x[2] + '</p></div></li>'; }).join('') + '</ol></section>';
  }

  function howCard(how, C) {
    var w = C.w, j = C.j;
    var facts = [
      ['thermo', '체감', (r0(w.feelMin) === r0(w.feelMax) ? r0(w.feelMax) : r0(w.feelMin) + '~' + r0(w.feelMax)) + '°', false],
      ['layer', '일교차', j.gap + '°', j.gap >= 8],
      ['drop', '비', (w.rainMax == null ? '-' : w.rainMax + '%'), j.wet],
      ['wind', '바람', (w.windMax == null ? '-' : w.windMax.toFixed(1) + 'm/s'), j.wind]
    ];
    var note = '';
    if (S.day === 0 && C.past) note = '<p class="caption c3">오늘 외출 시간이 지나 하루 전체로 계산했어요.</p>';
    else if (S.day === 0 && w.start > Math.min(S.win.start, S.win.end)) note = '<p class="caption c3">지난 시간은 빼고 ' + R.hourText(w.start) + '부터 계산했어요.</p>';
    if (!how.length) how = [{ k: 'ok', t: '특별히 챙길 것 없는 날이에요. 위 옷차림 그대로 나가면 돼요' }];
    var ic = { layer: 'layer', gap: 'layer', warm: 'thermo', wind: 'wind', rain: 'drop', sun: 'sun', miss: 'info', ok: 'check' };
    return '<section class="card o4" aria-labelledby="how-t"><h2 id="how-t" class="title3">이렇게 입어요</h2>' +
      '<ul class="facts" aria-label="밖에 있는 동안 날씨">' + facts.map(function (f) { return '<li class="' + (f[3] ? 'hot' : '') + '">' + I.ui(f[0], 16) + '<span class="c3">' + f[1] + '</span><b class="num">' + esc(f[2]) + '</b></li>'; }).join('') + '</ul><ul class="how">' +
      how.map(function (x) { return '<li class="how-' + x.k + '">' + I.ui(ic[x.k] || 'info', 18) + '<span>' + esc(x.t) + '</span></li>'; }).join('') +
      '</ul><p class="caption c3">상의·하의는 가장 따뜻할 때(체감 ' + r0(C.w.feelMax) + '℃), 겉옷은 가장 추울 때(체감 ' + r0(C.w.feelMin) + '℃) 기준이에요.</p>' + note + '</section>';
  }

  function hourCard(C) {
    var H = C.w.hours;
    var lo = Math.min.apply(null, H.map(function (x) { return x.feel; })), hi = Math.max.apply(null, H.map(function (x) { return x.feel; }));
    var span = Math.max(4, hi - lo);
    return '<section class="card o5" aria-labelledby="hr-t"><div class="card-h"><h2 id="hr-t" class="title3">시간별 체감기온</h2><span class="caption c3">밖에 있는 ' + H.length + '시간</span></div>' +
      '<div class="hours-wrap"><div class="hours" role="list" tabindex="0" aria-label="시간별 체감기온, 옆으로 넘겨 보기">' + H.map(function (x) {
        var hgt = 14 + Math.round((x.feel - lo) / span * 48);
        var mark = x.h === C.w.coldHour && lo !== hi ? 'cold' : x.h === C.w.hotHour && lo !== hi ? 'hot' : '';
        var tag = mark === 'cold' ? '최저' : mark === 'hot' ? '최고' : '';
        return '<div class="hr ' + mark + '" role="listitem" aria-label="' + R.hourText(x.h) + ' 체감 ' + Math.round(x.feel) + '도, ' + R.codeText(x.code) + (x.rain >= 20 ? ', 비 ' + x.rain + '%' : '') + (tag ? ', 가장 ' + (mark === 'cold' ? '추울' : '따뜻할') + ' 때' : '') + '">' +
          '<span class="hr-tag">' + tag + '</span>' +
          '<span class="hr-v num">' + Math.round(x.feel) + '°</span><span class="hr-bar" style="height:' + hgt + 'px"></span>' +
          I.sky(R.codeKind(x.code), x.h < 6 || x.h >= 19) +
          '<span class="hr-r num">' + (x.rain >= 20 ? x.rain + '%' : '') + '</span><span class="hr-h num">' + x.h + '시</span></div>';
      }).join('') + '</div></div>' +
      '<p class="caption c3">막대는 체감기온, 파란 숫자는 비 올 확률이에요.</p></section>';
  }

  function gapCard() {
    var t = today(); if (!t) return '';
    var days = [];
    for (var i = 0; i < t.days; i++) { var c = calc(i); if (c) days.push({ label: ['오늘', '내일', '모레'][i], j: c.j }); }
    var g = R.closetGaps(S.closet, days);
    var body = !g.length ? '<p class="body2 c2 row g6">' + I.ui('check', 18) + '<span>앞으로 ' + days.length + '일 날씨에 입을 옷은 옷장에 다 있어요</span></p>' :
      '<ul class="gaps">' + g.slice(0, 4).map(function (x) {
        return '<li><div class="minw0"><p class="gap-t"><span class="tag">' + x.day + '</span>' + esc(R.BANDS[x.band].t) + '에 입을 <b>' + x.cat + '</b>가 없어요</p>' +
          '<p class="caption c3">이런 옷이 맞아요: ' + esc(x.subs.join(' · ')) + '</p></div>' +
          '<button type="button" class="btn btn-ghost btn-s" data-act="add" data-sub="' + esc(x.subs[0] || '') + '" aria-label="' + esc(x.subs[0] || x.cat) + ' 등록">' + I.ui('plus', 16) + '있어요</button></li>';
      }).join('') + '</ul><p class="caption c3">옷장에 있는데 안 넣은 옷이라면 "있어요"를 눌러 등록해요.</p>';
    return '<section class="card o6" aria-labelledby="gap-t"><div class="card-h"><h2 id="gap-t" class="title3">옷장 빈 곳</h2><span class="caption c3">' + days.length + '일 예보 기준</span></div>' + body + '</section>';
  }

  function bandsCard(C) {
    var inB = C.j.inner, outB = C.j.outer;
    var rows = R.BANDS.map(function (b, i) {
      var tag = i === inB && i === outB ? '종일' : i === inB ? '낮' : (i === outB && C.j.needOuter) ? '겉옷' : '';
      return '<tr class="' + (tag ? 'on' : '') + '"><th scope="row" class="num">' + b.t + '</th><td>' + esc(S.g === 'f' ? b.fwear : b.wear) + '</td><td>' + (tag ? '<span class="tag strong">' + tag + '</span>' : '') + '</td></tr>';
    }).join('');
    return '<details class="card bands o7"><summary><span class="title3">기온별 옷차림 8단계</span>' + I.ui('down', 18) + '</summary>' +
      '<table><caption class="sr-only">기온별 옷차림 8단계 표</caption><tbody>' + rows + '</tbody></table>' +
      '<ul class="rules caption c2"><li>상의·하의 = 밖에 있는 시간의 최고 체감기온</li><li>겉옷 = 최저 체감기온 · 바람 9m/s 이상이면 한 단계 두껍게</li><li>겉옷이 필요한 날 = 17~19℃ 이하, 또는 20~22℃에 일교차 8℃ 이상</li><li>비 60% 이상 = 밝은 색 하의·스웨이드·캔버스·흰 신발은 뒤로</li></ul></details>';
  }

  function footer() {
    return '<footer class="foot"><div class="wrap">' +
      '<p><b>날씨 정보: <a href="' + SRC_URL + '" target="_blank" rel="noopener">Open-Meteo</a></b> (무료 공개 날씨 API, CC BY 4.0) · 1시간 단위 예보</p>' +
      '<p>옷차림 기준: 널리 쓰이는 기온별 옷차림 8단계에 체감기온·일교차·비·바람 규칙을 더했어요.</p>' +
      '<p>내 옷장·도시·시간 설정은 이 브라우저에만 저장되고 어디로도 보내지 않아요. 로그인·광고·쇼핑 링크가 없어요.</p>' +
      '</div></footer>';
  }

  /* ---------- 내 옷장 화면 ---------- */
  function viewCloset() {
    var C = S.wx ? calc(S.day) : null;
    var groups = R.CATS.map(function (cat) {
      var L = S.closet.filter(function (x) { return catOf(x) === cat; });
      if (!L.length) return '';
      return '<section class="cl-group" aria-labelledby="g-' + cat + '"><h2 id="g-' + cat + '" class="label">' + cat + ' <span class="c3 num">' + L.length + '</span></h2><ul class="items">' + L.map(function (x) {
        var r = R.itemRange(x);
        var band = C ? (cat === '아우터' ? C.j.outer : C.j.inner) : -1;
        var fit = C && R.dist(r, band) === 0 && (cat !== '아우터' || C.j.needOuter);
        return '<li class="item"><div class="item-ic">' + I.cloth(iconOf(x), colorHex(x.color)) + '</div>' +
          '<div class="minw0 grow"><p class="item-n">' + esc(R.itemLabel(x)) + (fit ? ' <span class="tag ok">' + ['오늘', '내일', '모레'][S.day] + ' 딱</span>' : '') + '</p>' +
          '<p class="caption c3"><span class="num">' + esc(R.rangeText(r)) + '</span>' + (x.thick && x.thick !== '보통' ? ' · ' + esc(x.thick) : '') + (x.material ? ' · ' + esc(x.material) : '') + (x.name ? ' · ' + esc([x.color, x.sub].join(' ')) : '') + '</p></div>' +
          '<button type="button" class="icon-btn" data-act="edit" data-id="' + esc(x.id) + '" aria-label="' + esc(R.itemLabel(x)) + ' 고치기">' + I.ui('edit', 18) + '</button>' +
          '<button type="button" class="icon-btn" data-act="del" data-id="' + esc(x.id) + '" aria-label="' + esc(R.itemLabel(x)) + ' 빼기">' + I.ui('trash', 18) + '</button></li>';
      }).join('') + '</ul></section>';
    }).join('');
    var have = function (q) { return S.closet.some(function (x) { return x.sub === q.sub && x.color === q.color; }); };
    var quick = '<section class="card" aria-labelledby="q-t"><h2 id="q-t" class="title3">자주 입는 옷, 눌러서 바로 담기</h2><div class="chips">' +
      R.QUICK.map(function (q, i) { var h = have(q); return '<button type="button" class="chip' + (h ? ' on' : '') + '" data-act="quick" data-i="' + i + '" aria-pressed="' + h + '">' + '<span class="dot" style="--c:' + colorHex(q.color) + '"></span>' + esc(q.color + ' ' + q.sub) + '</button>'; }).join('') +
      '</div><p class="caption c3">한 번 누르면 담기고, 다시 누르면 빠져요. 자세히 고르려면 "옷 등록"을 써요.</p></section>';
    var empty = !S.closet.length ? '<section class="card empty-state">' + I.cloth('none', 'transparent') +
      '<p class="title3">아직 옷장이 비어 있어요</p><p class="body2 c2">옷을 등록하면 날씨에 맞춰 내 옷으로 코디해 드려요.</p>' +
      '<div class="row g8 wrapr"><button type="button" class="btn btn-primary" data-act="add">' + I.ui('plus', 18) + '옷 등록</button><button type="button" class="btn btn-secondary" data-act="sample">예시 옷장 채우기</button></div></section>' : '';
    return '<header class="bar"><div class="bar-in"><button type="button" class="btn btn-ghost bar-btn" data-act="home" data-fk="back">' + I.ui('back') + '<span>날씨로</span></button>' +
      '<h1 class="bar-t">내 옷장 <span class="c3 num">' + S.closet.length + '벌</span></h1>' +
      '<button type="button" class="btn btn-primary bar-btn" data-act="add" data-fk="add-top">' + I.ui('plus', 18) + '<span>옷 등록</span></button></div></header>' +
      '<main class="wrap closet">' + empty + (S.closet.length ? '<section class="card">' + groups + '</section>' : '') + quick +
      (S.closet.length ? '<div class="danger-zone"><button type="button" class="btn btn-ghost btn-s" data-act="clear" data-fk="clear">' + (S.clearArm ? '한 번 더 누르면 모두 지워요' : '옷장 모두 지우기') + '</button></div>' : '') +
      '<p class="caption c3 center">옷장은 이 브라우저에만 저장돼요. 다른 기기·브라우저에서는 보이지 않아요.</p></main>' + footer();
  }

  /* ---------- 도시 고르기 시트 ---------- */
  var citySheet, itemSheet;
  function openCity() {
    citySheet.querySelector('.sheet-b').innerHTML =
      '<button type="button" class="btn btn-secondary wide" data-act="locate"' + (S.locating ? ' disabled' : '') + '>' + I.ui('locate', 18) + (S.locating ? '위치 찾는 중…' : '내 위치로 (브라우저 안에서만 써요)') + '</button>' +
      AREAS.map(function (a) {
        return '<div class="area"><p class="label c3">' + a + '</p><div class="chips">' + CITIES.filter(function (c) { return c.area === a; }).map(function (c) {
          return '<button type="button" class="chip' + (S.city.id === c.id ? ' on' : '') + '" data-act="city" data-id="' + c.id + '" aria-pressed="' + (S.city.id === c.id) + '">' + c.name + '</button>';
        }).join('') + '</div></div>';
      }).join('');
    showSheet(citySheet);
  }
  function showSheet(d) { if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', ''); }
  function closeSheet(d) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); }

  function setCity(c) {
    S.city = c; store.set('city', c); S.shift = 0; S.dayAuto = true;
    closeSheet(citySheet); loadWx(false);
  }
  function locate() {
    if (!navigator.geolocation) { toast('이 브라우저는 위치를 쓸 수 없어요. 도시를 골라 주세요'); return; }
    S.locating = true; openCity();
    navigator.geolocation.getCurrentPosition(function (p) {
      S.locating = false;
      var lat = Math.round(p.coords.latitude * 100) / 100, lon = Math.round(p.coords.longitude * 100) / 100;
      var n = nearestCity(lat, lon);
      setCity({ id: 'here', name: '내 위치', lat: lat, lon: lon, near: n ? n.name : '' });
      toast('내 위치 날씨로 바꿨어요');
    }, function () {
      S.locating = false; openCity(); toast('위치를 못 가져왔어요. 도시를 골라 주세요');
    }, { timeout: 10000, maximumAge: 6e5 });
  }

  /* ---------- 옷 등록·고치기 시트 ---------- */
  var draft = null;
  function openItem(x, sub) {
    draft = x ? JSON.parse(JSON.stringify(x)) : { id: null, sub: sub || '', color: '', thick: '보통', name: '', material: '' };
    draft.cat = draft.sub ? catOf(draft) : (draft.cat || '상의');
    itemSheet.querySelector('.sheet-h h2').textContent = x ? '옷 고치기' : '옷 등록';
    drawItem();
    showSheet(itemSheet);
  }
  function drawItem() {
    var d = draft, ok = d.sub && d.color;
    var r = d.sub ? R.itemRange(d) : null;
    var subs = R.SUBS[d.cat] || [];
    var mats = ['가죽', '캔버스', '스웨이드', '메쉬', '고무'];
    itemSheet.querySelector('.sheet-b').innerHTML =
      '<div class="preview"><div class="pv-ic">' + I.cloth(d.sub ? iconOf(d) : 'none', d.color ? colorHex(d.color) : 'var(--cloth)') + '</div>' +
      '<div class="minw0"><p class="title3">' + esc(d.sub ? R.itemLabel({ name: d.name, color: d.color, sub: d.sub }) : '종류를 골라 주세요') + '</p>' +
      '<p class="body2 ' + (r ? 'pv-ok' : 'c3') + '">' + (r ? '이 옷은 <b class="num">' + esc(R.rangeText(r)) + '</b>에 입기 좋아요' : '고르면 입기 좋은 기온을 알려 드려요') + '</p></div></div>' +
      '<fieldset><legend class="label">종류</legend><div class="seg" role="radiogroup" aria-label="분류">' + R.CATS.map(function (c) { return '<button type="button" role="radio" data-act="i-cat" data-v="' + c + '" aria-checked="' + (d.cat === c) + '">' + c + '</button>'; }).join('') + '</div>' +
      '<div class="chips sub-chips">' + subs.map(function (s) { return '<button type="button" class="chip' + (d.sub === s[0] ? ' on' : '') + '" data-act="i-sub" data-v="' + esc(s[0]) + '" aria-pressed="' + (d.sub === s[0]) + '">' + I.cloth(s[2], d.sub === s[0] ? 'var(--primary)' : 'var(--cloth)', 'chip-ic') + esc(s[0]) + '</button>'; }).join('') + '</div></fieldset>' +
      '<fieldset><legend class="label">색</legend><div class="swatches">' + R.COLORS.map(function (c) { return '<button type="button" class="sw' + (d.color === c[0] ? ' on' : '') + '" data-act="i-color" data-v="' + c[0] + '" aria-pressed="' + (d.color === c[0]) + '"><span class="sw-c" style="--c:' + c[1] + '"></span><span class="sw-l">' + c[0] + '</span></button>'; }).join('') + '</div></fieldset>' +
      '<fieldset><legend class="label">두께</legend><div class="seg" role="radiogroup" aria-label="두께">' + R.THICK.map(function (t) { return '<button type="button" role="radio" data-act="i-thick" data-v="' + t + '" aria-checked="' + (d.thick === t) + '">' + (t === '두꺼움' ? '두꺼움 (기모·누빔)' : t) + '</button>'; }).join('') + '</div></fieldset>' +
      (d.cat === '신발' ? '<fieldset><legend class="label">소재 <span class="c3">(비 오는 날 고를 때 써요)</span></legend><div class="chips">' + mats.map(function (m) { return '<button type="button" class="chip' + (d.material === m ? ' on' : '') + '" data-act="i-mat" data-v="' + m + '" aria-pressed="' + (d.material === m) + '">' + m + '</button>'; }).join('') + '</div></fieldset>' : '') +
      '<label class="field"><span class="label">별명 <span class="c3">(선택)</span></span><input type="text" id="i-name" maxlength="20" value="' + esc(d.name || '') + '" placeholder="예: 출근용 셔츠" autocomplete="off"></label>';
    var save = itemSheet.querySelector('[data-act="i-save"]');
    save.disabled = !ok;
    save.textContent = !d.sub ? '종류를 골라 주세요' : !d.color ? '색을 골라 주세요' : (d.id ? '고친 내용 저장' : '옷장에 넣기');
  }
  function saveItem() {
    var d = draft; if (!d || !d.sub || !d.color) return;
    var nm = itemSheet.querySelector('#i-name'); d.name = nm ? nm.value.trim().slice(0, 20) : '';
    var x = { id: d.id || uid(), sub: d.sub, color: d.color, thick: d.thick || '보통' };
    if (d.name) x.name = d.name;
    if (d.cat === '신발' && d.material) x.material = d.material;
    var i = S.closet.findIndex(function (y) { return y.id === x.id; });
    if (i >= 0) S.closet[i] = x; else S.closet.push(x);
    saveCloset(); closeSheet(itemSheet);
    toast((i >= 0 ? '고쳤어요: ' : '옷장에 넣었어요: ') + R.itemLabel(x));
    render();
  }

  /* ---------- 알림 ---------- */
  var toastTimer;
  function toast(msg, undo) {
    S.toast = msg; S.undo = undo || null; renderToast();
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { S.toast = null; S.undo = null; renderToast(); }, undo ? 6000 : 3000);
  }
  function renderToast() {
    var t = document.getElementById('toast'); if (!t) return;
    t.innerHTML = S.toast ? '<div class="toast-in"><span>' + esc(S.toast) + '</span>' + (S.undo ? '<button type="button" class="link" data-act="undo">되돌리기</button>' : '') + '</div>' : '';
  }

  /* ---------- 이벤트 ---------- */
  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act'), v = b.getAttribute('data-v');
    if (b.tagName === 'SELECT') return;
    if (a === 'home') { e.preventDefault(); S.view = 'home'; S.clearArm = false; render(); window.scrollTo(0, 0); return; }
    if (a === 'go-closet') { S.view = 'closet'; render(); window.scrollTo(0, 0); return; }
    if (a === 'retry') { loadWx(true); return; }
    if (a === 'mock') { S.wx = { key: cityKey(S.city), at: Date.now(), data: mockData() }; S.mock = true; S.wxState = 'ok'; afterLoad(); return; }
    if (a === 'open-city') { openCity(); return; }
    if (a === 'city') { var c = CITIES.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0]; if (c) setCity(c); return; }
    if (a === 'locate') { locate(); return; }
    if (a === 'close') { closeSheet(b.closest('dialog')); return; }
    if (a === 'day') { S.day = Number(v); S.dayAuto = false; S.shift = 0; render(); return; }
    if (a === 'mode') { S.mode = v; render(); return; }
    if (a === 'g') { S.g = v; store.set('g', v); render(); return; }
    if (a === 'shuffle') { S.shift++; render(); return; }
    if (a === 'sample') {
      var add = R.SAMPLE.map(function (x) { return Object.assign({ id: uid(), thick: '보통' }, x); });
      S.closet = S.closet.concat(add); saveCloset(); S.mode = 'mine';
      toast('예시 옷 ' + add.length + '벌을 담았어요. 내 옷장에서 고치거나 뺄 수 있어요'); S.view = 'home'; render(); return;
    }
    if (a === 'add') { openItem(null, b.getAttribute('data-sub')); return; }
    if (a === 'edit') { var it = S.closet.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0]; if (it) openItem(it); return; }
    if (a === 'del') {
      var id = b.getAttribute('data-id'), idx = S.closet.findIndex(function (x) { return x.id === id; });
      if (idx < 0) return;
      var gone = S.closet.splice(idx, 1)[0]; saveCloset(); render();
      toast('뺐어요: ' + R.itemLabel(gone), function () { S.closet.splice(idx, 0, gone); saveCloset(); render(); });
      return;
    }
    if (a === 'undo') { var u = S.undo; S.toast = null; S.undo = null; if (u) u(); renderToast(); return; }
    if (a === 'quick') {
      var q = R.QUICK[Number(b.getAttribute('data-i'))];
      var hi = S.closet.findIndex(function (x) { return x.sub === q.sub && x.color === q.color; });
      if (hi >= 0) { S.closet.splice(hi, 1); toast('뺐어요: ' + q.color + ' ' + q.sub); }
      else { S.closet.push(Object.assign({ id: uid() }, q)); toast('담았어요: ' + q.color + ' ' + q.sub); }
      saveCloset(); render(); return;
    }
    if (a === 'clear') {
      if (!S.clearArm) { S.clearArm = true; render(); setTimeout(function () { if (S.clearArm) { S.clearArm = false; render(); } }, 4000); return; }
      var old = S.closet.slice(); S.closet = []; S.clearArm = false; saveCloset(); render();
      toast('옷장을 모두 지웠어요', function () { S.closet = old; saveCloset(); render(); }); return;
    }
    /* 시트 안 */
    if (a === 'i-cat') { var nm = itemSheet.querySelector('#i-name'); if (nm) draft.name = nm.value; draft.cat = v; if (catOf(draft) !== v) draft.sub = ''; if (v !== '신발') draft.material = ''; drawItem(); return; }
    if (a === 'i-sub' || a === 'i-color' || a === 'i-thick' || a === 'i-mat') {
      var nm2 = itemSheet.querySelector('#i-name'); if (nm2) draft.name = nm2.value;
      draft[{ 'i-sub': 'sub', 'i-color': 'color', 'i-thick': 'thick', 'i-mat': 'material' }[a]] = v;
      drawItem();
      var again = itemSheet.querySelector('[data-act="' + a + '"][data-v="' + v + '"]'); if (again) again.focus();
      return;
    }
    if (a === 'i-save') return; /* 저장은 form submit 하나로만 */
  }
  function onChange(e) {
    var t = e.target, a = t.getAttribute && t.getAttribute('data-act');
    if (a === 'win-start' || a === 'win-end') {
      S.win[a === 'win-start' ? 'start' : 'end'] = Number(t.value);
      if (S.win.end < S.win.start) { var s = S.win.start; S.win.start = S.win.end; S.win.end = s; }
      store.set('win', S.win); S.shift = 0; render();
    }
  }
  function onKey(e) {
    /* 날짜 탭: 좌우 화살표로 이동 */
    var t = e.target;
    if (t.classList && t.classList.contains('day-tab') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      var n = today().days, i = (S.day + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
      S.day = i; S.dayAuto = false; render();
      var el = app.querySelector('[data-fk="day' + i + '"]'); if (el) el.focus();
      e.preventDefault();
    }
  }

  /* 시트: 손잡이·제목 줄을 아래로 끌면 닫힘 */
  function dragClose(d) {
    var y0 = null, dy = 0, zone = d.querySelector('.sheet-top');
    zone.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; dy = 0; d.classList.add('dragging'); }, { passive: true });
    zone.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); d.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
    zone.addEventListener('touchend', function () { d.classList.remove('dragging'); d.style.transform = ''; if (dy > 90) closeSheet(d); y0 = null; });
  }

  function init() {
    app = document.getElementById('app');
    citySheet = document.getElementById('city-sheet');
    itemSheet = document.getElementById('item-sheet');
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKey);
    [citySheet, itemSheet].forEach(function (d) {
      d.addEventListener('click', function (e) { if (e.target === d) closeSheet(d); });
    });
    dragClose(citySheet); dragClose(itemSheet);
    itemSheet.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); saveItem(); });
    loadWx(false);
    /* 오래 열어 둔 화면은 돌아왔을 때 새로 */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && S.wx && !S.mock && Date.now() - S.wx.at > CACHE_MIN * 6e4) loadWx(true);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
