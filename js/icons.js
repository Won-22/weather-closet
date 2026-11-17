/* 옷·날씨 그림 (직접 그린 단순 선화). 옷은 등록한 색으로 칠한다 */
(function (root) {
  'use strict';
  var BODY_L = 'M16 8 L10 10 L5 30 L4 40 L10 41 L12 26 L12 42 L36 42 L36 26 L38 41 L44 40 L43 30 L38 10 L32 8';
  var CLOTH = {
    tank: { d: 'M17 6 L17 12 Q14 18 13 22 L13 42 L35 42 L35 22 Q34 18 31 12 L31 6 L28 6 Q24 14 20 6 Z' },
    tee: { d: 'M16 8 L10 10 L3 17 L8 23 L12 20 L12 42 L36 42 L36 20 L40 23 L45 17 L38 10 L32 8 Q24 14 16 8 Z' },
    polo: { d: 'M16 8 L10 10 L3 17 L8 23 L12 20 L12 42 L36 42 L36 20 L40 23 L45 17 L38 10 L32 8 L24 12 Z', x: 'M18 8 L24 13 L30 8 M24 12 L24 20' },
    longsleeve: { d: BODY_L + ' Q24 14 16 8 Z' },
    shirt: { d: BODY_L + ' L24 13 Z', x: 'M17 7 L24 14 L31 7 M24 14 L24 42 M26.5 20 h0.1 M26.5 27 h0.1 M26.5 34 h0.1' },
    blouse: { d: BODY_L + ' Q24 16 16 8 Z', x: 'M20 10 Q24 18 28 10 M24 15 L24 24' },
    sweat: { d: BODY_L + ' Q24 14 16 8 Z', x: 'M12 38 L36 38 M5 37 L11 38 M37 38 L43 37 M19 9.5 Q24 13 29 9.5' },
    hoodie: { d: BODY_L + ' Q24 14 16 8 Z', pre: 'M15 10 Q14 2 24 2 Q34 2 33 10 Q24 16 15 10 Z', x: 'M17 30 L31 30 L31 38 L17 38 Z M21 13 L21 19 M27 13 L27 19' },
    knit: { d: BODY_L + ' Q24 14 16 8 Z', x: 'M12 38 L36 38 M18 18 L18 36 M24 18 L24 36 M30 18 L30 36 M19 9.5 Q24 13 29 9.5' },
    dress: { d: 'M18 4 L18 10 L14 18 L18 22 L8 44 L40 44 L30 22 L34 18 L30 10 L30 4 L27 4 Q24 9 21 4 Z', x: 'M17 22 L31 22' },
    cardigan: { d: BODY_L + ' L24 22 Z', x: 'M24 22 L24 42 M26.5 26 h0.1 M26.5 32 h0.1 M26.5 38 h0.1 M12 38 L36 38' },
    zipup: { d: BODY_L + ' Q24 14 16 8 Z', pre: 'M15 10 Q14 2 24 2 Q34 2 33 10 Q24 16 15 10 Z', x: 'M24 12 L24 42 M15 30 L20 30 M28 30 L33 30' },
    windbreaker: { d: BODY_L + ' L24 10 Z', x: 'M24 10 L24 42 M12 24 L36 24 M17 7 L18 12 M31 7 L30 12' },
    blazer: { d: BODY_L + ' L24 26 Z', x: 'M16 8 L20 18 L24 26 L28 18 L32 8 M24 26 L24 42 M26.5 32 h0.1 M17 34 L21 34' },
    jacket: { d: BODY_L + ' L24 12 Z', x: 'M16 8 L20 14 L24 12 L28 14 L32 8 M24 12 L24 42 M15 20 L21 20 L21 25 L15 25 Z M27 20 L33 20 L33 25 L27 25 Z' },
    fleece: { d: BODY_L + ' L24 10 Z', x: 'M18 6 L24 10 L30 6 M24 10 L24 42 M12 38 L36 38' },
    trench: { d: 'M16 6 L10 8 L5 30 L4 42 L10 43 L12 28 L12 46 L36 46 L36 28 L38 43 L44 42 L43 30 L38 8 L32 6 L24 18 Z', x: 'M16 6 L20 16 L24 18 L28 16 L32 6 M24 18 L24 46 M12 30 L36 30 M20.5 23 h0.1 M27.5 23 h0.1 M20.5 36 h0.1 M27.5 36 h0.1' },
    coat: { d: 'M16 6 L10 8 L5 30 L4 42 L10 43 L12 28 L12 46 L36 46 L36 28 L38 43 L44 42 L43 30 L38 8 L32 6 L24 18 Z', x: 'M16 6 L20 16 L24 18 L28 16 L32 6 M24 18 L24 46 M26.5 26 h0.1 M26.5 34 h0.1' },
    padding: { d: 'M15 7 Q10 8 8 12 L4 36 Q4 40 9 40 L12 30 L12 42 Q24 45 36 42 L36 30 L39 40 Q44 40 44 36 L40 12 Q38 8 33 7 Q24 12 15 7 Z', x: 'M12 18 Q24 21 36 18 M12 26 Q24 29 36 26 M12 34 Q24 37 36 34 M24 10 L24 43' },
    longpadding: { d: 'M15 4 Q10 5 8 9 L4 34 Q4 38 9 38 L12 28 L12 46 Q24 48 36 46 L36 28 L39 38 Q44 38 44 34 L40 9 Q38 5 33 4 Q24 9 15 4 Z', x: 'M12 14 Q24 17 36 14 M12 22 Q24 25 36 22 M12 30 Q24 33 36 30 M12 38 Q24 41 36 38 M24 7 L24 47' },
    vest: { d: 'M17 6 Q14 8 14 14 L12 22 L12 42 Q24 45 36 42 L36 22 L34 14 Q34 8 31 6 Q24 11 17 6 Z', x: 'M12 22 Q24 25 36 22 M12 32 Q24 35 36 32 M24 9 L24 43' },
    shorts: { d: 'M10 10 L38 10 L41 34 L27 36 L24 20 L21 36 L7 34 Z', x: 'M10 14 L38 14' },
    pants: { d: 'M12 4 L36 4 L39 45 L28 45 L24 16 L20 45 L9 45 Z', x: 'M12 8 L36 8' },
    jeans: { d: 'M12 4 L36 4 L39 45 L28 45 L24 16 L20 45 L9 45 Z', x: 'M12 8 L36 8 M14 8 Q16 14 22 13 M34 8 Q32 14 26 13' },
    leggings: { d: 'M14 4 L34 4 L35 45 L28 45 L24 14 L20 45 L13 45 Z', x: 'M14 8 L34 8' },
    skirt: { d: 'M15 10 L33 10 L42 36 Q24 40 6 36 Z', x: 'M15 14 L33 14 M20 14 L16 37 M28 14 L32 37' },
    longskirt: { d: 'M16 4 L32 4 L41 44 Q24 47 7 44 Z', x: 'M16 8 L32 8 M21 8 L17 45 M27 8 L31 45' },
    sneakers: { d: 'M4 26 L4 37 L44 37 L44 32 Q44 28 38 27 L28 24 L22 16 L14 18 L12 22 L4 22 Z', x: 'M4 33 L44 33 M16 20 L19 24 M20 19 L23 23' },
    loafer: { d: 'M4 28 Q4 24 10 24 L26 24 Q32 24 40 28 Q45 30 44 35 L4 35 Z', x: 'M4 32 L44 32 M14 24 Q20 29 26 24' },
    boots: { d: 'M12 6 L26 6 L26 26 L38 30 Q44 32 44 37 L44 41 L12 41 Z', x: 'M12 37 L44 37 M12 10 L26 10' },
    sandal: { d: 'M4 33 Q4 29 10 29 L38 29 Q44 29 44 33 L44 37 L4 37 Z', x: 'M14 29 Q16 20 22 22 Q26 24 24 29 M28 29 L32 21 L36 29' },
    umbrella: { d: 'M4 24 Q4 6 24 6 Q44 6 44 24 Q40 21 36 24 Q32 21 28 24 Q24 21 20 24 Q16 21 12 24 Q8 21 4 24 Z', x: 'M24 6 L24 40 Q24 44 20 44 Q16 44 16 40 M24 3 L24 6' },
    cap: { d: 'M8 30 Q8 12 24 12 Q38 12 38 28 L46 30 Q46 34 38 34 L8 34 Z', x: 'M24 12 L24 30 M38 28 L38 34' },
    none: { d: '', x: 'M10 24 L38 24' }
  };

  function cloth(key, fill, cls) {
    var c = CLOTH[key] || CLOTH.tee;
    var light = isLight(fill);
    var line = light ? 'var(--line-strong)' : 'rgba(0,0,0,.35)';
    var det = light ? 'var(--line-strong)' : 'rgba(255,255,255,.55)';
    return '<svg class="' + (cls || 'cl') + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      (c.pre ? '<path d="' + c.pre + '" fill="' + fill + '" stroke="' + line + '" stroke-width="1.2" stroke-linejoin="round"/>' : '') +
      (c.d ? '<path d="' + c.d + '" fill="' + fill + '" stroke="' + line + '" stroke-width="1.2" stroke-linejoin="round"/>' : '') +
      (c.x ? '<path d="' + c.x + '" fill="none" stroke="' + (c.d ? det : 'var(--text-3)') + '" stroke-width="' + (c.d ? 1.3 : 2) + '" stroke-linecap="round" stroke-linejoin="round"' + (c.d ? '' : ' stroke-dasharray="3 4"') + '/>' : '') +
      '</svg>';
  }
  function isLight(hex) {
    if (!hex || hex.charAt(0) !== '#') return false;
    var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
  }

  /* 날씨 그림 */
  function sky(kind, night) {
    var sun = night
      ? '<path d="M30 8 A14 14 0 1 0 42 26 A11 11 0 1 1 30 8 Z" fill="#f5d77a"/>'
      : '<circle cx="24" cy="24" r="9" fill="#ffc83d"/><g stroke="#ffc83d" stroke-width="3" stroke-linecap="round"><path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.5 10.5l3.5 3.5M34 34l3.5 3.5M10.5 37.5l3.5-3.5M34 14l3.5-3.5"/></g>';
    var cloud = function (x, y, s, c) { return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M10 30 Q2 30 2 23 Q2 16 10 16 Q12 8 21 8 Q30 8 32 16 Q40 16 40 23 Q40 30 32 30 Z" fill="' + c + '"/>'; };
    var drops = '<g stroke="#3f7be0" stroke-width="2.6" stroke-linecap="round"><path d="M16 38l-2 5M25 38l-2 5M34 38l-2 5"/></g>';
    var flakes = '<g fill="#8fb3e8"><circle cx="15" cy="41" r="2.2"/><circle cx="24" cy="44" r="2.2"/><circle cx="33" cy="41" r="2.2"/></g>';
    var bolt = '<path d="M25 33 L20 41 L25 41 L22 47 L31 37 L26 37 L29 33 Z" fill="#ffc83d"/>';
    var body;
    if (kind === 'sun') body = sun;
    else if (kind === 'part') body = '<g transform="translate(-6 -6) scale(.85)">' + sun + '</g>' + cloud(6, 10, 0.95, 'var(--cloud)');
    else if (kind === 'fog') body = cloud(3, 2, 1, 'var(--cloud)') + '<g stroke="var(--cloud-dark)" stroke-width="2.6" stroke-linecap="round"><path d="M8 38h32M12 44h24"/></g>';
    else if (kind === 'rain') body = cloud(3, 0, 1, 'var(--cloud-dark)') + drops;
    else if (kind === 'snow') body = cloud(3, 0, 1, 'var(--cloud)') + flakes;
    else if (kind === 'storm') body = cloud(3, 0, 1, 'var(--cloud-dark)') + bolt;
    else body = cloud(1, 4, 1.05, 'var(--cloud)');
    return '<svg class="sky" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  var UI = {
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    shuffle: '<path d="M4 7h3c5 0 5 10 10 10h3M17 14l3 3-3 3M4 17h3c1.6 0 2.7-1 3.6-2.4M14 9.4C14.9 8 16 7 17.6 7H20M17 4l3 3-3 3"/>',
    closet: '<path d="M5 3h14v18H5zM12 3v18M9.5 11v2M14.5 11v2"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    layer: '<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"/>',
    thermo: '<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/>',
    alert: '<path d="M12 3l10 18H2L12 3zM12 10v5M12 18v.1"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>'
  };
  function ui(name, size) {
    return '<svg class="ui" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (UI[name] || '') + '</svg>';
  }

  root.Icons = { cloth: cloth, sky: sky, ui: ui, isLight: isLight };
})(this);
