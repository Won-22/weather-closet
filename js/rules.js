/* 옷장 예보 · 추천 규칙 (화면과 무관한 순수 함수만 둔다. tests/rules.test.js가 시험한다)
   기준: 널리 쓰이는 기온별 옷차림 8단계 + 판정 규칙
   - 상의·하의 = 밖에 있는 시간의 최고 체감기온 단계
   - 겉옷 = 밖에 있는 시간의 최저 체감기온 단계 (바람 9m/s 이상이면 한 단계 추운 쪽)
   - 겉옷이 필요한 날 = 겉옷 단계가 17~19℃ 이하, 또는 20~22℃인데 일교차 8℃ 이상
   - 비(강수확률 60% 이상) = 스웨이드·캔버스·흰 신발, 밝은 색 하의는 뒤로 */
(function (root) {
  'use strict';

  /* 0 = 가장 더움 … 7 = 가장 추움 */
  var BANDS = [
    { lo: 28, t: '28℃ 이상', s: '28↑', wear: '민소매 · 반팔 · 반바지 · 린넨', fwear: '민소매 · 반팔 · 짧은 치마 · 원피스' },
    { lo: 23, t: '23~27℃', s: '23', wear: '반팔 · 얇은 셔츠 · 반바지 · 면바지', fwear: '반팔 · 얇은 셔츠 · 면바지 · 롱스커트' },
    { lo: 20, t: '20~22℃', s: '20', wear: '긴팔 티 · 셔츠 · 얇은 가디건 · 청바지', fwear: '블라우스 · 긴팔 티 · 얇은 가디건 · 슬랙스' },
    { lo: 17, t: '17~19℃', s: '17', wear: '얇은 니트 · 맨투맨 · 후드 · 바람막이', fwear: '얇은 니트 · 가디건 · 맨투맨 · 얇은 자켓' },
    { lo: 12, t: '12~16℃', s: '12', wear: '자켓 · 청자켓 · 가디건 · 니트', fwear: '자켓 · 가디건 · 니트 · 스타킹' },
    { lo: 9, t: '9~11℃', s: '9', wear: '트렌치 · 야상 · 점퍼 · 니트', fwear: '트렌치 · 야상 · 니트 · 스타킹' },
    { lo: 5, t: '5~8℃', s: '5', wear: '코트 · 가죽 자켓 · 히트텍 · 니트 · 기모', fwear: '코트 · 가죽 자켓 · 히트텍 · 니트 · 레깅스' },
    { lo: -99, t: '4℃ 이하', s: '4↓', wear: '패딩 · 두꺼운 코트 · 기모 · 목도리 · 장갑', fwear: '패딩 · 두꺼운 코트 · 기모 · 목도리 · 장갑' }
  ];

  function bandOf(t) {
    if (t == null || t === '' || isNaN(Number(t))) return -1;
    var r = Math.round(Number(t));
    for (var i = 0; i < BANDS.length; i++) if (r >= BANDS[i].lo) return i;
    return BANDS.length - 1;
  }
  /* 단계 범위 [더운 쪽, 추운 쪽] → "12~22℃" 같은 말 */
  function rangeText(r) {
    var hot = BANDS[r[0]], cold = BANDS[r[1]];
    var hi = r[0] === 0 ? null : BANDS[r[0] - 1].lo - 1;
    var lo = cold.lo === -99 ? null : cold.lo;
    if (hi == null && lo == null) return '사계절';
    if (hi == null) return lo + '℃ 이상';
    if (lo == null) return hi + '℃ 이하';
    return lo + '~' + hi + '℃';
  }

  /* 옷 종류: 분류 · 맞는 단계 [더운 쪽, 추운 쪽] · 그림 */
  var CATS = ['아우터', '상의', '하의', '신발'];
  var SUBS = {
    '아우터': [
      ['카디건', [2, 4], 'cardigan'], ['후드 집업', [3, 4], 'zipup'], ['바람막이', [3, 4], 'windbreaker'],
      ['블레이저', [3, 5], 'blazer'], ['청자켓', [4, 5], 'jacket'], ['블루종·MA-1', [4, 5], 'jacket'],
      ['가죽 자켓', [4, 6], 'jacket'], ['플리스', [4, 6], 'fleece'], ['트렌치코트', [5, 6], 'trench'],
      ['야상', [5, 6], 'jacket'], ['경량 패딩', [5, 6], 'padding'], ['패딩 조끼', [5, 6], 'vest'],
      ['울 코트', [6, 7], 'coat'], ['숏패딩', [6, 7], 'padding'], ['롱패딩', [7, 7], 'longpadding']
    ],
    '상의': [
      ['민소매', [0, 0], 'tank'], ['반팔 티', [0, 1], 'tee'], ['카라 티', [1, 2], 'polo'],
      ['셔츠', [1, 4], 'shirt'], ['블라우스', [1, 4], 'blouse'], ['긴팔 티', [2, 4], 'longsleeve'],
      ['맨투맨', [3, 6], 'sweat'], ['후드 티', [3, 6], 'hoodie'], ['니트', [3, 7], 'knit'],
      ['원피스', [0, 3], 'dress']
    ],
    '하의': [
      ['반바지', [0, 1], 'shorts'], ['짧은 치마', [0, 3], 'skirt'], ['롱스커트', [1, 5], 'longskirt'],
      ['면바지', [1, 6], 'pants'], ['청바지', [1, 7], 'jeans'], ['슬랙스', [1, 7], 'pants'],
      ['트레이닝 바지', [1, 6], 'pants'], ['레깅스', [4, 7], 'leggings']
    ],
    '신발': [
      ['샌들', [0, 1], 'sandal'], ['운동화', [0, 7], 'sneakers'], ['로퍼·구두', [0, 7], 'loafer'],
      ['부츠', [4, 7], 'boots']
    ]
  };
  var SUB_META = {};
  CATS.forEach(function (c) { SUBS[c].forEach(function (s) { SUB_META[s[0]] = { cat: c, range: s[1], icon: s[2] }; }); });

  var COLORS = [
    ['블랙', '#1d1d1f', 'n'], ['차콜', '#4a4a50', 'n'], ['그레이', '#a3a3aa', 'n'], ['화이트', '#ffffff', 'n'],
    ['아이보리', '#f2ecdc', 'n'], ['베이지', '#d8c3a0', 'n'], ['네이비', '#25324f', 'n'], ['연청', '#9bb8da', 'n'],
    ['진청', '#3d5a85', 'n'], ['브라운', '#7a5235', 'e'], ['카키', '#6f6f40', 'e'], ['버건디', '#6e2232', 'e'],
    ['블루', '#2f6fd6', 'p'], ['스카이블루', '#a9d0f2', 'p'], ['그린', '#3f8a5a', 'p'], ['레드', '#cc3a2f', 'p'],
    ['핑크', '#f1a9bb', 'p'], ['옐로', '#f2c94c', 'p'], ['퍼플', '#7d5fab', 'p']
  ];
  var COLOR_OF = {};
  COLORS.forEach(function (c) { COLOR_OF[c[0]] = { hex: c[1], kind: c[2] }; });
  var LIGHT = ['화이트', '아이보리', '베이지', '스카이블루', '연청', '핑크', '옐로'];
  var THICK = ['얇음', '보통', '두꺼움'];

  /* 내 옷 하나가 맞는 단계. 두꺼움(기모·누빔)은 한 단계 추운 쪽, 얇음은 한 단계 더운 쪽 */
  function itemRange(x) {
    var m = SUB_META[x.sub];
    var r = m ? m.range.slice() : [2, 5];
    if (x.thick === '두꺼움') r = [Math.min(7, r[0] + 1), Math.min(7, r[1] + 1)];
    else if (x.thick === '얇음') r = [Math.max(0, r[0] - 1), Math.max(Math.max(0, r[0] - 1), r[1] - 1)];
    return r;
  }
  function dist(r, b) { return b < r[0] ? r[0] - b : b > r[1] ? b - r[1] : 0; }

  /* ---------- 날씨 → 밖에 있는 시간의 조건 ---------- */
  var CODE_TEXT = {
    0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림', 45: '안개', 48: '짙은 안개',
    51: '약한 이슬비', 53: '이슬비', 55: '강한 이슬비', 56: '어는 이슬비', 57: '어는 이슬비',
    61: '약한 비', 63: '비', 65: '강한 비', 66: '어는 비', 67: '어는 비',
    71: '약한 눈', 73: '눈', 75: '강한 눈', 77: '싸락눈', 80: '소나기', 81: '소나기', 82: '강한 소나기',
    85: '눈 소나기', 86: '강한 눈 소나기', 95: '뇌우', 96: '우박 동반 뇌우', 99: '우박 동반 뇌우'
  };
  function codeText(c) { return CODE_TEXT[c] || '정보 없음'; }
  function codeKind(c) {
    if (c == null) return 'cloud';
    if ([71, 73, 75, 77, 85, 86].indexOf(c) >= 0) return 'snow';
    if (c >= 95) return 'storm';
    if (c >= 51 && c <= 82) return 'rain';
    if (c === 45 || c === 48) return 'fog';
    if (c === 0 || c === 1) return 'sun';
    if (c === 2) return 'part';
    return 'cloud';
  }
  var KIND_RANK = { sun: 0, part: 1, cloud: 2, fog: 3, rain: 4, snow: 5, storm: 6 };
  function windText(v) {
    if (v == null) return '';
    if (v < 3.4) return '바람 약함';
    if (v < 5.5) return '바람 조금';
    if (v < 9) return '바람 보통';
    return '바람 강함';
  }

  /* data = Open-Meteo 응답. dayIdx = daily 순번(0 오늘). start/end = 시(0~23, 둘 다 포함). fromHour = 이보다 이른 시간은 뺌(오늘 지난 시간) */
  function windowStats(data, dayIdx, start, end, fromHour) {
    var h = data.hourly, date = data.daily.time[dayIdx];
    if (end < start) { var t = start; start = end; end = t; }
    var s = Math.max(start, fromHour == null ? 0 : fromHour);
    var hours = [];
    for (var i = 0; i < h.time.length; i++) {
      var tm = h.time[i];
      if (tm.slice(0, 10) !== date) continue;
      var hr = Number(tm.slice(11, 13));
      if (hr < s || hr > end) continue;
      hours.push({
        h: hr, feel: h.apparent_temperature[i], temp: h.temperature_2m[i],
        rain: h.precipitation_probability ? h.precipitation_probability[i] : null,
        code: h.weather_code ? h.weather_code[i] : null,
        wind: h.wind_speed_10m ? h.wind_speed_10m[i] : null,
        uv: h.uv_index ? h.uv_index[i] : null
      });
    }
    hours = hours.filter(function (x) { return x.feel != null && x.temp != null; });
    if (!hours.length) return null;
    var pick = function (k, fn) { var v = hours.map(function (x) { return x[k]; }).filter(function (v) { return v != null; }); return v.length ? fn.apply(null, v) : null; };
    var feelMax = pick('feel', Math.max), feelMin = pick('feel', Math.min);
    var rainMax = pick('rain', Math.max);
    var peak = null;
    hours.forEach(function (x) { if (x.rain != null && (peak == null || x.rain > peak.rain)) peak = x; });
    var worst = hours.reduce(function (a, x) { return KIND_RANK[codeKind(x.code)] > KIND_RANK[codeKind(a.code)] ? x : a; }, hours[0]);
    var hiHour = hours.reduce(function (a, x) { return x.feel > a.feel ? x : a; }, hours[0]);
    var loHour = hours.reduce(function (a, x) { return x.feel < a.feel ? x : a; }, hours[0]);
    return {
      date: date, start: hours[0].h, end: hours[hours.length - 1].h, hours: hours,
      feelMax: feelMax, feelMin: feelMin,
      tempMax: pick('temp', Math.max), tempMin: pick('temp', Math.min),
      rainMax: rainMax, rainPeak: peak && peak.rain != null ? peak.h : null,
      windMax: pick('wind', Math.max), uvMax: pick('uv', Math.max),
      code: worst.code, kind: codeKind(worst.code),
      hotHour: hiHour.h, coldHour: loHour.h
    };
  }

  /* 판정: 단계·겉옷 필요·비·바람·눈·자외선 */
  function judge(w) {
    var inner = bandOf(w.feelMax), rawOuter = bandOf(w.feelMin);
    var wind = w.windMax != null && w.windMax >= 9;
    var outer = Math.min(7, rawOuter + (wind ? 1 : 0));
    var gap = w.tempMax != null && w.tempMin != null ? w.tempMax - w.tempMin : 0;
    var needOuter = outer >= 3 || (outer === 2 && gap >= 8);
    var snow = w.kind === 'snow';
    var wet = (w.rainMax != null && w.rainMax >= 60) || snow || w.kind === 'storm';
    var maybeRain = !wet && w.rainMax != null && w.rainMax >= 30;
    return {
      inner: inner, outer: outer, rawOuter: rawOuter, wind: wind, gap: Math.round(gap), needOuter: needOuter,
      wet: wet, maybeRain: maybeRain, snow: snow, uv: w.uvMax != null && w.uvMax >= 6,
      freezing: w.feelMin != null && w.feelMin <= 0
    };
  }

  /* ---------- 일반 옷차림 카드 3장 (내 옷장이 비었을 때) ---------- */
  var GEN_TOP = [
    { u: ['반팔 티', 'tee'], f: ['민소매·원피스', 'dress'] },
    { u: ['반팔·얇은 셔츠', 'tee'] },
    { u: ['긴팔 티·셔츠', 'shirt'], f: ['블라우스·긴팔 티', 'blouse'] },
    { u: ['얇은 니트·맨투맨', 'sweat'] },
    { u: ['니트·긴팔 셔츠', 'knit'] },
    { u: ['니트', 'knit'] },
    { u: ['니트 + 히트텍', 'knit'] },
    { u: ['두꺼운 니트 + 히트텍', 'knit'] }
  ];
  var GEN_BOTTOM = [
    { u: ['반바지', 'shorts'], f: ['짧은 치마·반바지', 'skirt'] },
    { u: ['면바지·반바지', 'pants'], f: ['롱스커트·면바지', 'longskirt'] },
    { u: ['청바지·면바지', 'jeans'], f: ['슬랙스·청바지', 'pants'] },
    { u: ['긴바지', 'jeans'] },
    { u: ['청바지·슬랙스', 'jeans'], f: ['긴바지·치마 + 스타킹', 'longskirt'] },
    { u: ['도톰한 긴바지', 'pants'], f: ['긴바지·스타킹', 'pants'] },
    { u: ['기모 바지', 'pants'], f: ['기모 바지·레깅스', 'leggings'] },
    { u: ['기모 바지', 'pants'] }
  ];
  var GEN_OUTER = [
    null, null,
    { u: ['얇은 가디건', 'cardigan'] },
    { u: ['바람막이·얇은 자켓', 'windbreaker'], f: ['가디건·얇은 자켓', 'cardigan'] },
    { u: ['자켓·청자켓', 'jacket'] },
    { u: ['트렌치·야상', 'trench'] },
    { u: ['코트·가죽 자켓', 'coat'] },
    { u: ['패딩·두꺼운 코트', 'padding'] }
  ];
  function gen(table, b, g) { var x = table[b]; if (!x) return null; return (g === 'f' && x.f) || x.u; }

  function genericCards(j, g) {
    var top = gen(GEN_TOP, j.inner, g), bottom = gen(GEN_BOTTOM, j.inner, g);
    var cards = [];
    var third;
    if (j.needOuter) {
      var o = gen(GEN_OUTER, Math.max(2, j.outer), g);
      third = { slot: '겉옷', name: o[0], icon: o[1], band: j.outer };
    } else if (j.wet) third = { slot: '챙길 것', name: '우산', icon: 'umbrella' };
    else if (j.uv) third = { slot: '챙길 것', name: '모자·선글라스', icon: 'cap' };
    else third = { slot: '겉옷', name: '없어도 돼요', icon: 'none', empty: true };
    cards.push({ slot: '상의', name: top[0], icon: top[1], band: j.inner });
    cards.push({ slot: '하의', name: bottom[0], icon: bottom[1], band: j.inner });
    cards.push(third);
    /* 오늘 가장 중요한 한 장: 겉옷이 필요하면 겉옷, 아니면 상의 */
    var key = j.needOuter ? 2 : 0;
    cards[key].key = true;
    return cards;
  }

  /* ---------- 내 옷장 코디 ---------- */
  function colorKind(x) {
    var c = COLOR_OF[x.color];
    if (!c) return 'n';
    return c.kind;
  }
  function colorScore(items, wet) {
    var pts = items.filter(function (x) { return colorKind(x) === 'p'; });
    var distinct = pts.map(function (x) { return x.color; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var s = Math.max(0, distinct.length - 1) * 5;
    var bottom = items.filter(function (x) { return SUB_META[x.sub] && SUB_META[x.sub].cat === '하의'; })[0];
    if (wet && bottom && LIGHT.indexOf(bottom.color) >= 0) s += 4;
    return s;
  }
  function colorNote(items) {
    var cs = items.map(function (x) { return x.color; }).filter(Boolean);
    if (!cs.length) return '';
    var pts = cs.filter(function (c) { return COLOR_OF[c] && COLOR_OF[c].kind === 'p'; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var earth = cs.filter(function (c) { return COLOR_OF[c] && COLOR_OF[c].kind === 'e'; });
    if (cs.every(function (c) { return c === '블랙' || c === '차콜'; })) return '올블랙 — 한 가지 색이라 깔끔해요';
    if (pts.length === 1) return '포인트 색은 ' + pts[0] + ' 하나, 나머지는 기본색이 받쳐 줘요';
    if (pts.length > 1) return '포인트 색이 ' + pts.join('·') + ' 둘 이상이에요. 하나를 기본색 옷으로 바꾸면 더 차분해요';
    if (earth.length && cs.every(function (c) { return ['브라운', '카키', '버건디', '베이지', '아이보리'].indexOf(c) >= 0; })) return '비슷한 색끼리 이어지는 톤온톤이에요';
    return '기본색끼리라 어디에나 무난해요';
  }
  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  function shoeBad(x, j) {
    if (!j.wet) return false;
    var mat = x.material || '';
    return /스웨이드|캔버스/.test(mat) || x.color === '화이트' || x.sub === '샌들';
  }

  /* closet = [{id, sub, color, thick, name, material}], j = judge(), seed = 날짜 수 + "다른 조합" 횟수 */
  function closetOutfit(closet, j, seed) {
    var byCat = function (c) { return closet.filter(function (x) { return SUB_META[x.sub] && SUB_META[x.sub].cat === c; }); };
    var cand = function (c, band) {
      var L = byCat(c).map(function (x) { return { x: x, d: dist(itemRange(x), band) }; });
      if (!L.length) return { list: [], best: null };
      var m = Math.min.apply(null, L.map(function (o) { return o.d; }));
      if (m > 1) return { list: [], best: m };
      return { list: L.filter(function (o) { return o.d === m; }), best: m };
    };
    var tops = cand('상의', j.inner), bottoms = cand('하의', j.inner);
    var outers = j.needOuter ? cand('아우터', j.outer) : { list: [], best: null };
    var miss = [];
    if (!tops.list.length) miss.push('상의');
    var onePieces = tops.list.filter(function (o) { return o.x.sub === '원피스'; });
    if (!bottoms.list.length && onePieces.length < 1) miss.push('하의');
    if (miss.length) return { miss: miss, tops: tops, bottoms: bottoms };
    var combos = [];
    tops.list.forEach(function (t) {
      var bl = t.x.sub === '원피스' ? [null] : bottoms.list;
      bl.forEach(function (b) {
        var ol = outers.list.length ? outers.list : [null];
        ol.forEach(function (o) {
          var items = [o && o.x, t.x, b && b.x].filter(Boolean);
          var fitC = function (q, band) { if (!q) return 0; var r = itemRange(q.x); return Math.abs((r[0] + r[1]) / 2 - band); };
          /* 단계 안에서도 범위 가운데에 가까운 옷을 먼저 (12℃에 반팔 겸용 셔츠보다 니트) */
          var score = colorScore(items, j.wet) + (t.d + (b ? b.d : 0) + (o ? o.d : 0)) * 3 + (fitC(t, j.inner) + fitC(b, j.inner) + fitC(o, j.outer)) * 0.6;
          combos.push({ outer: o && o.x, top: t.x, bottom: b && b.x, score: score, near: [t, b, o].some(function (q) { return q && q.d > 0; }) });
        });
      });
    });
    var best = Math.min.apply(null, combos.map(function (c) { return c.score; }));
    var good = combos.filter(function (c) { return c.score <= best + 2; });
    good.sort(function (a, b) {
      return a.score - b.score || hashStr(ids(a) + ':' + seed) - hashStr(ids(b) + ':' + seed);
    });
    var pickI = good.length ? ((seed % good.length) + good.length) % good.length : 0;
    var c = good[pickI];
    /* 신발: 비·눈이면 젖어도 되는 신발 먼저, 단계 맞는 것 중에서 */
    var shoes = byCat('신발').map(function (x) { return { x: x, d: dist(itemRange(x), j.inner) + (shoeBad(x, j) ? 5 : 0) }; });
    var shoe = null, shoeWarn = false;
    if (shoes.length) {
      var ms = Math.min.apply(null, shoes.map(function (o) { return o.d; }));
      var sl = shoes.filter(function (o) { return o.d === ms; }).sort(function (a, b) { return String(a.x.id).localeCompare(String(b.x.id)); });
      shoe = sl[(seed % sl.length + sl.length) % sl.length].x;
      shoeWarn = shoeBad(shoe, j);
    }
    return {
      outer: c.outer, top: c.top, bottom: c.bottom, shoe: shoe, shoeWarn: shoeWarn,
      coatMiss: j.needOuter && !c.outer, near: c.near,
      options: good.length, index: pickI,
      color: colorNote([c.outer, c.top, c.bottom].filter(Boolean))
    };
  }
  function ids(c) { return [c.outer, c.top, c.bottom].map(function (x) { return x ? x.id : '-'; }).join('|'); }

  /* ---------- 입는 법 (상황 규칙) ---------- */
  /* 받침에 따라 을/를, 은/는 */
  function josa(w, a, b) {
    var c = String(w || '').charCodeAt(String(w || '').length - 1);
    if (!(c >= 0xac00 && c <= 0xd7a3)) return w + a;
    return w + ((c - 0xac00) % 28 ? a : b);
  }
  function hourText(h) { return h === 0 ? '밤 12시' : h < 12 ? '오전 ' + h + '시' : h === 12 ? '낮 12시' : '오후 ' + (h - 12) + '시'; }
  function itemLabel(x) {
    if (!x) return '';
    if (x.name) return x.name;
    return [x.color, x.sub].filter(Boolean).join(' ');
  }

  /* outfit = closetOutfit 결과 또는 null(일반 카드), cards = genericCards 결과 */
  function howTo(w, j, outfit, cards) {
    var L = [];
    var outerName = outfit ? (outfit.outer ? itemLabel(outfit.outer) : '') : (j.needOuter ? cards[2].name : '');
    if (j.needOuter && outerName) {
      if (j.inner <= 2 && j.inner < j.outer) L.push({ k: 'layer', t: hourText(w.coldHour) + '쯤 체감 ' + Math.round(w.feelMin) + '℃엔 ' + josa(outerName, '을', '를') + ' 입고, ' + hourText(w.hotHour) + '쯤 ' + Math.round(w.feelMax) + '℃엔 벗어서 들어요' });
      else if (j.inner < j.outer) L.push({ k: 'layer', t: '아침·저녁(체감 ' + Math.round(w.feelMin) + '℃)이 낮(' + Math.round(w.feelMax) + '℃)보다 추워요. ' + (outfit ? josa(outerName, '은', '는') + ' 아침·저녁엔 여미고, 낮엔 앞을 열어 입어요' : josa(outerName, '은', '는') + ' 앞을 여닫기 쉬운 걸로 골라요') });
      else L.push({ k: 'layer', t: '하루 종일 체감 ' + Math.round(w.feelMin) + '~' + Math.round(w.feelMax) + '℃라 ' + josa(outerName, '을', '를') + ' 계속 입어요' });
    }
    if (j.gap >= 8) L.push({ k: 'gap', t: '일교차 ' + j.gap + '℃ — 얇은 옷을 겹쳐 입으면 더울 때 하나씩 벗기 쉬워요' });
    if (j.inner >= 6) L.push({ k: 'warm', t: '상의 안에 히트텍 같은 얇은 내복을 겹치면 두꺼운 옷 한 벌보다 따뜻해요' });
    if (j.outer >= 7 || j.freezing) L.push({ k: 'warm', t: '체감 ' + Math.round(w.feelMin) + '℃까지 내려가요 — 목도리·장갑을 챙겨요' });
    if (j.wind) L.push({ k: 'wind', t: '바람 최대 ' + Math.round(w.windMax) + 'm/s — 겉옷을 한 단계 두껍게 골랐어요. 바람막이처럼 바람을 막는 소재면 더 좋아요' });
    if (j.snow) L.push({ k: 'rain', t: '눈 소식 — 미끄럽지 않은 신발을 신고, 캔버스·스웨이드 신발은 피해요' });
    else if (j.wet) L.push({ k: 'rain', t: hourText(w.rainPeak) + ' 비 ' + w.rainMax + '% — 우산을 챙기고, 밝은 색 하의·스웨이드·캔버스·흰 신발은 피해요' });
    else if (j.maybeRain) L.push({ k: 'rain', t: hourText(w.rainPeak) + ' 비 ' + w.rainMax + '% — 작은 우산이 있으면 든든해요' });
    if (j.uv) L.push({ k: 'sun', t: '자외선이 강해요(최대 ' + Math.round(w.uvMax) + ') — 모자·선글라스를 챙겨요' });
    if (j.inner <= 1 && !j.wet) L.push({ k: 'sun', t: '더운 날엔 린넨·면처럼 바람이 잘 통하는 소재가 좋아요' });
    if (outfit) {
      if (outfit.coatMiss) L.push({ k: 'miss', t: '오늘 ' + BANDS[j.outer].t + '에 맞는 겉옷이 옷장에 없어요. 이럴 땐 ' + BANDS[j.outer].wear.split(' · ').slice(0, 2).join('·') + ' 같은 옷이 좋아요' });
      if (outfit.near) L.push({ k: 'miss', t: '딱 맞는 옷이 없어 가장 가까운 옷으로 골랐어요. 춥거나 더우면 겹쳐 입기로 맞춰요' });
      if (outfit.shoeWarn) L.push({ k: 'rain', t: '젖어도 되는 신발이 옷장에 없어요. 오늘은 물에 강한 신발이 좋아요' });
    }
    return L;
  }

  /* ---------- 옷장 빈 곳: 앞으로 며칠 날씨에 입을 옷이 비었는지 ---------- */
  function closetGaps(closet, days) {
    var out = [];
    days.forEach(function (d) {
      var j = d.j;
      var slots = [['상의', j.inner], ['하의', j.inner]];
      if (j.needOuter) slots.push(['아우터', j.outer]);
      slots.forEach(function (s) {
        var have = closet.filter(function (x) { return SUB_META[x.sub] && SUB_META[x.sub].cat === s[0] && dist(itemRange(x), s[1]) <= (s[0] === '아우터' ? 0 : 1); });
        if (s[0] === '하의' && !have.length) {
          var dress = closet.filter(function (x) { return x.sub === '원피스' && dist(itemRange(x), s[1]) <= 1; });
          if (dress.length) return;
        }
        if (!have.length && !out.some(function (o) { return o.cat === s[0] && o.band === s[1]; })) {
          var subs = SUBS[s[0]].filter(function (q) { return s[1] >= q[1][0] && s[1] <= q[1][1]; }).map(function (q) { return q[0]; });
          out.push({ day: d.label, cat: s[0], band: s[1], subs: subs.slice(0, 3) });
        }
      });
    });
    return out;
  }

  /* 빠르게 담기 · 예시 옷장 */
  var QUICK = [
    { sub: '반팔 티', color: '화이트', thick: '보통' }, { sub: '긴팔 티', color: '그레이', thick: '보통' },
    { sub: '셔츠', color: '스카이블루', thick: '보통' }, { sub: '맨투맨', color: '네이비', thick: '보통' },
    { sub: '후드 티', color: '그레이', thick: '두꺼움' }, { sub: '니트', color: '아이보리', thick: '보통' },
    { sub: '청바지', color: '진청', thick: '보통' }, { sub: '슬랙스', color: '블랙', thick: '보통' },
    { sub: '면바지', color: '베이지', thick: '보통' }, { sub: '반바지', color: '네이비', thick: '보통' },
    { sub: '롱스커트', color: '블랙', thick: '보통' }, { sub: '카디건', color: '베이지', thick: '얇음' },
    { sub: '바람막이', color: '블랙', thick: '보통' }, { sub: '청자켓', color: '연청', thick: '보통' },
    { sub: '트렌치코트', color: '베이지', thick: '보통' }, { sub: '울 코트', color: '차콜', thick: '보통' },
    { sub: '숏패딩', color: '블랙', thick: '보통' }, { sub: '운동화', color: '화이트', thick: '보통', material: '가죽' },
    { sub: '부츠', color: '브라운', thick: '보통', material: '가죽' }
  ];
  var SAMPLE = [
    { sub: '반팔 티', color: '화이트' }, { sub: '긴팔 티', color: '그레이' }, { sub: '셔츠', color: '스카이블루' },
    { sub: '맨투맨', color: '네이비' }, { sub: '니트', color: '아이보리' }, { sub: '니트', color: '버건디', thick: '두꺼움' },
    { sub: '청바지', color: '진청' }, { sub: '슬랙스', color: '블랙' }, { sub: '면바지', color: '베이지' },
    { sub: '반바지', color: '카키' }, { sub: '카디건', color: '베이지', thick: '얇음' }, { sub: '바람막이', color: '블랙' },
    { sub: '청자켓', color: '연청' }, { sub: '트렌치코트', color: '베이지' }, { sub: '울 코트', color: '차콜' },
    { sub: '숏패딩', color: '블랙' }, { sub: '운동화', color: '화이트', material: '캔버스' }, { sub: '부츠', color: '브라운', material: '가죽' }
  ];

  var api = {
    BANDS: BANDS, CATS: CATS, SUBS: SUBS, SUB_META: SUB_META, COLORS: COLORS, COLOR_OF: COLOR_OF, THICK: THICK,
    QUICK: QUICK, SAMPLE: SAMPLE,
    bandOf: bandOf, rangeText: rangeText, itemRange: itemRange, dist: dist,
    codeText: codeText, josa: josa, codeKind: codeKind, windText: windText, hourText: hourText, itemLabel: itemLabel,
    windowStats: windowStats, judge: judge, genericCards: genericCards,
    closetOutfit: closetOutfit, colorNote: colorNote, howTo: howTo, closetGaps: closetGaps
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Rules = api;
})(this);
