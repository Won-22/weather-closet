const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/rules.js');
const data = require('./fixtures/seoul-2026-11-17.json');

test('기온 8단계 경계', () => {
  assert.equal(R.bandOf(28), 0);
  assert.equal(R.bandOf(27.4), 1);
  assert.equal(R.bandOf(22.6), 1);
  assert.equal(R.bandOf(20), 2);
  assert.equal(R.bandOf(16.5), 3);
  assert.equal(R.bandOf(12), 4);
  assert.equal(R.bandOf(8.6), 5);
  assert.equal(R.bandOf(5), 6);
  assert.equal(R.bandOf(4.4), 7);
  assert.equal(R.bandOf(-10), 7);
  assert.equal(R.bandOf(null), -1);
});

test('단계 범위를 기온 글로', () => {
  assert.equal(R.rangeText([2, 4]), '12~22℃');
  assert.equal(R.rangeText([0, 1]), '23℃ 이상');
  assert.equal(R.rangeText([6, 7]), '8℃ 이하');
  assert.equal(R.rangeText([0, 7]), '사계절');
});

test('두께에 따라 맞는 단계가 움직인다', () => {
  assert.deepEqual(R.itemRange({ sub: '맨투맨' }), [3, 6]);
  assert.deepEqual(R.itemRange({ sub: '맨투맨', thick: '두꺼움' }), [4, 7]);
  assert.deepEqual(R.itemRange({ sub: '맨투맨', thick: '얇음' }), [2, 5]);
  assert.deepEqual(R.itemRange({ sub: '민소매', thick: '얇음' }), [0, 0]);
  assert.deepEqual(R.itemRange({ sub: '롱패딩', thick: '두꺼움' }), [7, 7]);
});

test('밖에 있는 시간만 본다 (오늘 지난 시간 제외)', () => {
  const w = R.windowStats(data, 0, 8, 20, 18);
  assert.equal(w.start, 18);
  assert.equal(w.end, 20);
  assert.equal(w.hours.length, 3);
  assert.equal(w.rainMax, 99);
  assert.equal(w.rainPeak, 19);
});

test('내일 08~20시: 낮 체감 4.6℃, 저녁 0.3℃ → 패딩', () => {
  const w = R.windowStats(data, 1, 8, 20);
  assert.equal(w.feelMax, 4.6);
  assert.equal(w.feelMin, 0.3);
  const j = R.judge(w);
  assert.equal(j.inner, 6); // 4.6 → 반올림 5 → 5~8℃
  assert.equal(j.outer, 7);
  assert.equal(j.needOuter, true);
  assert.equal(j.wet, false);
  assert.equal(j.maybeRain, true); // 18시 59%
  const cards = R.genericCards(j, 'u');
  assert.equal(cards[2].name, '패딩·두꺼운 코트');
  assert.equal(cards[2].key, true);
});

test('바람 9m/s 이상이면 겉옷 한 단계 추운 쪽', () => {
  const j = R.judge({ feelMax: 18, feelMin: 13, tempMax: 19, tempMin: 14, windMax: 10, rainMax: 0, kind: 'sun' });
  assert.equal(j.rawOuter, 4);
  assert.equal(j.outer, 5);
});

test('20~22℃는 일교차 8℃ 이상일 때만 겉옷', () => {
  const a = R.judge({ feelMax: 26, feelMin: 21, tempMax: 26, tempMin: 21, windMax: 2, rainMax: 0, kind: 'sun' });
  assert.equal(a.needOuter, false);
  const b = R.judge({ feelMax: 30, feelMin: 21, tempMax: 30, tempMin: 21, windMax: 2, rainMax: 0, kind: 'sun' });
  assert.equal(b.needOuter, true);
  assert.equal(R.genericCards(a, 'u')[2].empty, true);
});

test('비 60% 이상이면 우산 카드, 밝은 하의·흰 신발 뒤로', () => {
  const j = R.judge({ feelMax: 26, feelMin: 23, tempMax: 26, tempMin: 23, windMax: 2, rainMax: 80, kind: 'rain' });
  assert.equal(j.wet, true);
  assert.equal(R.genericCards(j, 'u')[2].name, '우산');
  const closet = [
    { id: 'a', sub: '반팔 티', color: '네이비' },
    { id: 'b', sub: '면바지', color: '베이지' },
    { id: 'c', sub: '면바지', color: '블랙' },
    { id: 'd', sub: '운동화', color: '화이트', material: '캔버스' },
    { id: 'e', sub: '운동화', color: '블랙', material: '가죽' }
  ];
  for (let s = 0; s < 5; s++) {
    const o = R.closetOutfit(closet, j, s);
    assert.equal(o.bottom.id, 'c');
    assert.equal(o.shoe.id, 'e');
  }
});

test('포인트 색은 하나만 고른다', () => {
  const j = R.judge({ feelMax: 21, feelMin: 20, tempMax: 21, tempMin: 20, windMax: 1, rainMax: 0, kind: 'sun' });
  const closet = [
    { id: 't1', sub: '긴팔 티', color: '레드' },
    { id: 'b1', sub: '청바지', color: '옐로' },
    { id: 'b2', sub: '청바지', color: '진청' }
  ];
  for (let s = 0; s < 4; s++) assert.equal(R.closetOutfit(closet, j, s).bottom.id, 'b2');
  assert.match(R.colorNote([closet[0], closet[2]]), /레드 하나/);
});

test('맞는 옷이 없으면 없다고 말한다', () => {
  const j = R.judge({ feelMax: 30, feelMin: 26, tempMax: 30, tempMin: 26, windMax: 1, rainMax: 0, kind: 'sun' });
  const o = R.closetOutfit([{ id: 'x', sub: '니트', color: '그레이' }, { id: 'y', sub: '청바지', color: '진청' }], j, 0);
  assert.deepEqual(o.miss, ['상의']);
});

test('원피스는 하의 없이 코디', () => {
  const j = R.judge({ feelMax: 26, feelMin: 24, tempMax: 26, tempMin: 24, windMax: 1, rainMax: 0, kind: 'sun' });
  const o = R.closetOutfit([{ id: 'd', sub: '원피스', color: '핑크' }], j, 0);
  assert.equal(o.top.id, 'd');
  assert.equal(o.bottom, null);
});

test('겉옷이 필요한데 없으면 알려 준다', () => {
  const w = R.windowStats(data, 1, 8, 20);
  const j = R.judge(w);
  const closet = [{ id: 't', sub: '니트', color: '아이보리' }, { id: 'b', sub: '슬랙스', color: '블랙' }];
  const o = R.closetOutfit(closet, j, 0);
  assert.equal(o.coatMiss, true);
  const how = R.howTo(w, j, o, null).map((x) => x.t).join('\n');
  assert.match(how, /겉옷이 옷장에 없어요/);
  assert.match(how, /히트텍/);
});

test('같은 날·같은 옷장이면 같은 코디, 다른 조합을 누르면 바뀐다', () => {
  const j = R.judge({ feelMax: 21, feelMin: 20, tempMax: 21, tempMin: 20, windMax: 1, rainMax: 0, kind: 'sun' });
  const closet = R.SAMPLE.map((x, i) => Object.assign({ id: 's' + i }, x));
  const a = R.closetOutfit(closet, j, 100), b = R.closetOutfit(closet, j, 100), c = R.closetOutfit(closet, j, 101);
  assert.deepEqual(a, b);
  assert.ok(a.options > 1);
  assert.notDeepEqual([a.top.id, a.bottom && a.bottom.id], [c.top.id, c.bottom && c.bottom.id]);
});

test('옷장 빈 곳: 모레 영하 날씨에 패딩이 없으면 알려 준다', () => {
  const days = [1, 2].map((i) => {
    const w = R.windowStats(data, i, 8, 20);
    return { label: i === 1 ? '내일' : '모레', j: R.judge(w) };
  });
  const closet = [{ id: 't', sub: '니트', color: '그레이' }, { id: 'b', sub: '청바지', color: '진청' }, { id: 'o', sub: '트렌치코트', color: '베이지' }];
  const g = R.closetGaps(closet, days);
  assert.ok(g.some((x) => x.cat === '아우터' && x.band === 7));
});

test('조사 붙이기', () => {
  assert.equal(R.josa('트렌치·야상', '을', '를'), '트렌치·야상을');
  assert.equal(R.josa('패딩·두꺼운 코트', '을', '를'), '패딩·두꺼운 코트를');
});

test('한 줄 답: 겉옷·비를 한 문장으로', () => {
  const w = R.windowStats(data, 1, 8, 20);
  const j = R.judge(w);
  const s = R.summary(w, j, null, R.genericCards(j, 'u'));
  assert.match(s, /패딩·두꺼운 코트를 걸쳐요/);
  assert.match(s, /오후 6시 비 59%/);
  const hot = R.judge({ feelMax: 30, feelMin: 26, tempMax: 30, tempMin: 26, windMax: 1, rainMax: 0, kind: 'sun' });
  assert.match(R.summary({ rainMax: 0 }, hot, null, R.genericCards(hot, 'u')), /한 벌이면 충분해요/);
  const mid = R.judge({ feelMax: 26, feelMin: 23, tempMax: 26, tempMin: 23, windMax: 2, rainMax: 80, rainPeak: 15, kind: 'rain' });
  assert.match(R.summary({ rainMax: 80, rainPeak: 15 }, mid, null, R.genericCards(mid, 'u')), /오후 3시 비 소식, 우산도 챙겨요/);
});

test('한 줄 답: 내 옷장에 겉옷이 없으면 그렇게 말한다', () => {
  const w = R.windowStats(data, 1, 8, 20);
  const j = R.judge(w);
  const o = R.closetOutfit([{ id: 't', sub: '니트', color: '아이보리' }, { id: 'b', sub: '슬랙스', color: '블랙' }], j, 0);
  assert.match(R.summary(w, j, o, null), /맞는 겉옷이 옷장에 없어요/);
});
