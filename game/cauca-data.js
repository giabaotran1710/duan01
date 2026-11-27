/* Câu cá - dữ liệu: vùng câu, sinh vật, rác, khung giờ, thời tiết, cách chọn con cắn câu.
 * window.CC = { SLOTS, WEATHER, DAYNIGHT, TIDES, REGIONS, SPECIES, JUNK, ALL, byId, slotOf, weatherAt, eligible, pick, roll, speedOf, zoneOf, points }
 * Không đụng DOM, chạy được trong node để kiểm thử. */
(function (root) {
  'use strict';

  /* Khung giờ trong ngày (giờ trong game, 0-24). Đêm vắt qua nửa đêm. */
  var SLOTS = [
    { id: 'binhminh', name: 'Bình minh', from: 5, to: 7 },
    { id: 'sang', name: 'Buổi sáng', from: 7, to: 11 },
    { id: 'trua', name: 'Buổi trưa', from: 11, to: 14 },
    { id: 'chieu', name: 'Buổi chiều', from: 14, to: 17 },
    { id: 'hoanghon', name: 'Hoàng hôn', from: 17, to: 19 },
    { id: 'toi', name: 'Buổi tối', from: 19, to: 22 },
    { id: 'dem', name: 'Đêm khuya', from: 22, to: 29 }
  ];
  var WEATHER = {
    nang: { name: 'Nắng', night: 'Trời quang' },
    may: { name: 'Nhiều mây' },
    mua: { name: 'Mưa' },
    suong: { name: 'Sương mù' },
    giong: { name: 'Giông' }
  };
  /* Ban ngày 5-19 giờ, ban đêm 19-5 giờ. Con nước: triều cường / nước vừa / nước nông. */
  var DAYNIGHT = { ngay: { name: 'Ban ngày' }, dem: { name: 'Ban đêm' } };
  var TIDES = { cuong: { name: 'Triều cường' }, vua: { name: 'Nước vừa' }, nong: { name: 'Nước nông' } };
  var RARITY = {
    thuong: { name: 'Thường gặp', w: 10, zone: 30, pts: 1 },
    /* w: trọng số khi gặp đúng điều kiện; half: hiếm có mới đúng một phần điều kiện; off: trái điều kiện (vẫn câu được nhưng ít). */
    hiem: { name: 'Hiếm', w: 6, off: 0.6, zone: 20, pts: 3 },
    hiemco: { name: 'Hiếm có', w: 4, half: 0.6, off: 0.25, zone: 14, pts: 6 },
    rac: { name: 'Rác', w: 1, zone: 38, pts: 1 }
  };

  /* need: số sinh vật cần có trong sổ để mở vùng. wx: trọng số thời tiết của vùng. */
  var REGIONS = [
    { id: 'ao', name: 'Ao làng', water: 'ngot', need: 0, wx: { nang: 46, may: 30, mua: 16, suong: 8, giong: 4 } },
    { id: 'song', name: 'Sông quê', water: 'ngot', need: 5, wx: { nang: 40, may: 30, mua: 18, suong: 10, giong: 9 } },
    { id: 'dam', name: 'Đầm sen', water: 'ngot', need: 12, wx: { nang: 48, may: 26, mua: 14, suong: 12, giong: 4 } },
    { id: 'nui', name: 'Hồ trên núi', water: 'ngot', need: 20, wx: { nang: 34, may: 30, mua: 14, suong: 22, giong: 4 } },
    { id: 'rung', name: 'Rừng ngập mặn', water: 'man', need: 28, wx: { nang: 38, may: 28, mua: 22, suong: 10, giong: 6 } },
    { id: 'bien', name: 'Biển khơi', water: 'man', need: 36, wx: { nang: 42, may: 28, mua: 14, suong: 10, giong: 12 } },
    { id: 'suoi', name: 'Suối thác', water: 'ngot', need: 46, wx: { nang: 36, may: 30, mua: 18, suong: 18, giong: 6 } },
    { id: 'cuasong', name: 'Cửa sông', water: 'lo', need: 58, wx: { nang: 40, may: 28, mua: 18, suong: 12, giong: 8 } },
    { id: 'ran', name: 'Rạn san hô', water: 'man', need: 72, wx: { nang: 52, may: 24, mua: 12, suong: 6, giong: 8 } },
    { id: 'vinh', name: 'Vịnh đá vôi', water: 'man', need: 88, wx: { nang: 36, may: 30, mua: 14, suong: 18, giong: 8 } },
    { id: 'sau', name: 'Vực biển sâu', water: 'man', need: 106, wx: { nang: 34, may: 30, mua: 16, suong: 10, giong: 14 } }
  ];

  /* Sinh vật. r: độ hiếm; t: khung giờ; w: thời tiết; cm: [nhỏ nhất, lớn nhất]; k: hệ số cân nặng (kg = k * cm^3 * 1e-5).
   * a: hình vẽ (xem cauca-art.js). Con 'hiem' có đúng một điều kiện, 'hiemco' có cả hai. */
  function F(id, name, reg, r, t, w, cm, k, a, note) {
    return { id: id, name: name, reg: reg, r: r, t: t || null, w: w || null, cm: cm, k: k, a: a, note: note || '' };
  }
  var SPECIES = [
    // ---------- AO LÀNG ----------
    F('rodong', 'Cá rô đồng', 'ao', 'thuong', 0, 0, [8, 22], 2.2, { s: 'fish', h: .4, c: ['#4d5a3a', '#b3ad72', '#5b5a3c'], tail: 'round', dor: 'spiky', pat: 'bars', pc: 'rgba(30,40,20,.35)' }),
    F('diec', 'Cá diếc', 'ao', 'thuong', 0, 0, [8, 20], 2.4, { s: 'fish', h: .46, c: ['#6e7a62', '#dfe0cc', '#8c8a6a'], tail: 'fork', dor: 'tall', pat: 'scales' }),
    F('chep', 'Cá chép', 'ao', 'thuong', 0, 0, [20, 70], 1.6, { s: 'fish', h: .36, c: ['#7a6a3a', '#e6c77e', '#b8713a'], tail: 'fork', dor: 'long', pat: 'scales', bar: 1 }),
    F('tre', 'Cá trê', 'ao', 'thuong', 0, 0, [20, 45], 0.9, { s: 'fish', h: .2, c: ['#3d3a35', '#a89c86', '#35322d'], tail: 'round', dor: 'long', bar: 2, snout: 'blunt' }),
    F('rophi', 'Cá rô phi', 'ao', 'thuong', 0, 0, [12, 35], 2.3, { s: 'fish', h: .44, c: ['#5d6870', '#cfd3cb', '#6b5f66'], tail: 'round', dor: 'spiky', pat: 'bars', pc: 'rgba(40,50,60,.22)' }),
    F('loc', 'Cá lóc', 'ao', 'thuong', 0, 0, [25, 80], 0.9, { s: 'fish', h: .21, c: ['#3f4637', '#c4bf9f', '#3a3f31'], tail: 'round', dor: 'long', pat: 'blotch', pc: 'rgba(20,24,16,.55)', snout: 'blunt' }),
    F('me', 'Cá mè trắng', 'ao', 'thuong', 0, 0, [25, 70], 1.3, { s: 'fish', h: .32, c: ['#8a97a0', '#f0f2ee', '#9aa3a6'], tail: 'fork', dor: 'low', eye: 'low' }),
    F('tramco', 'Cá trắm cỏ', 'ao', 'hiem', ['binhminh'], 0, [40, 100], 1.1, { s: 'fish', h: .25, c: ['#5a5e42', '#dcd3a3', '#6e6a45'], tail: 'fork', dor: 'low', pat: 'scales' }, 'Ra ăn cỏ lúc trời vừa hửng sáng.'),
    F('baymau', 'Cá bảy màu', 'ao', 'hiem', ['sang'], 0, [2, 5], 1.5, { s: 'fish', h: .3, c: ['#3fa7d6', '#f1d27a', '#e8505b'], tail: 'fan', dor: 'tall', pat: 'dots', pc: '#ffd23f' }, 'Bơi thành đàn sát mặt nước buổi sáng.'),
    F('ech', 'Ếch đồng', 'ao', 'hiem', 0, ['mua'], [6, 14], 2.6, { s: 'frog', c: ['#5f8a3a', '#d8d79a', '#3d5c25'] }, 'Trời mưa là ếch nhảy ra bờ ao.'),
    F('chepvang', 'Cá chép vàng', 'ao', 'hiemco', ['hoanghon'], ['nang'], [30, 80], 1.6, { s: 'fish', h: .36, c: ['#e9a320', '#ffe08a', '#f0682a'], tail: 'fork', dor: 'long', pat: 'scales', bar: 1, glow: 1 }, 'Chỉ nổi lên khi hoàng hôn trời còn nắng.'),

    // ---------- SÔNG QUÊ ----------
    F('bong', 'Cá bống', 'song', 'thuong', 0, 0, [6, 18], 1.4, { s: 'fish', h: .24, c: ['#9b8a6a', '#e9dfc5', '#8a7a5a'], tail: 'round', dor: 'low', pat: 'spots', pc: 'rgba(60,45,25,.45)', snout: 'blunt' }),
    F('lang', 'Cá lăng', 'song', 'thuong', 0, 0, [30, 90], 0.9, { s: 'fish', h: .2, c: ['#6b6f75', '#e4e4e2', '#5d6168'], tail: 'fork', dor: 'tall', bar: 2, snout: 'blunt' }),
    F('tra', 'Cá tra', 'song', 'thuong', 0, 0, [30, 100], 1.0, { s: 'fish', h: .25, c: ['#59636e', '#dadfe3', '#4d5560'], tail: 'fork', dor: 'tall', bar: 1, snout: 'blunt' }),
    F('basa', 'Cá ba sa', 'song', 'thuong', 0, 0, [30, 90], 1.2, { s: 'fish', h: .3, c: ['#7f8790', '#f4f4f0', '#6f7780'], tail: 'fork', dor: 'tall', bar: 1, snout: 'blunt' }),
    F('chot', 'Cá chốt', 'song', 'thuong', 0, 0, [10, 25], 1.0, { s: 'fish', h: .23, c: ['#8f7c58', '#f0e5c8', '#a08452'], tail: 'fork', dor: 'tall', bar: 2, pat: 'band', pc: 'rgba(70,50,20,.35)' }),
    F('linh', 'Cá linh', 'song', 'hiem', 0, ['mua'], [6, 15], 1.6, { s: 'fish', h: .38, c: ['#8fa1a6', '#eef2f0', '#9aa8aa'], tail: 'fork', dor: 'tall', pat: 'scales' }, 'Theo con nước lên sau những cơn mưa.'),
    F('tomcang', 'Tôm càng xanh', 'song', 'hiem', ['toi'], 0, [10, 30], 1.0, { s: 'shrimp', c: ['#4a7fa0', '#c7d9df', '#2f5fae'], claw: 1 }, 'Bò ra kiếm ăn khi trời vừa tối.'),
    F('luon', 'Lươn', 'song', 'hiem', ['dem'], 0, [30, 70], 0.25, { s: 'eel', c: ['#8a6a2f', '#e0bd62', '#6e5224'] }, 'Chui khỏi hang vào ban đêm.'),
    F('chinh', 'Cá chình', 'song', 'hiem', 0, ['suong'], [50, 150], 0.3, { s: 'eel', c: ['#5b5d4a', '#c8c6a8', '#4a4c3a'], spots: 1, fin: 1 }, 'Lặng lẽ bơi lên trong sương mù.'),
    F('leo', 'Cá leo', 'song', 'hiem', ['chieu'], 0, [40, 120], 0.8, { s: 'fish', h: .2, c: ['#7a7d83', '#e6e3dc', '#6a6c70'], tail: 'fork', dor: 'none', bar: 2, anal: 1, snout: 'blunt' }, 'Hay rình mồi lúc xế chiều.'),
    F('caho', 'Cá hô', 'song', 'hiemco', ['dem'], ['giong'], [100, 300], 1.7, { s: 'fish', h: .34, c: ['#5f6b66', '#dbe0cf', '#546058'], tail: 'fork', dor: 'tall', pat: 'scales', head: 1.2 }, 'Cá khổng lồ chỉ rời đáy sông vào đêm giông.'),

    // ---------- ĐẦM SEN ----------
    F('sac', 'Cá sặc rằn', 'dam', 'thuong', 0, 0, [8, 20], 2.0, { s: 'fish', h: .42, c: ['#6f7f5a', '#d2d3a8', '#6a7350'], tail: 'round', dor: 'long', pat: 'stripes', pc: 'rgba(40,50,30,.45)', anal: 1 }),
    F('thatlat', 'Cá thát lát', 'dam', 'thuong', 0, 0, [15, 40], 1.1, { s: 'fish', h: .3, c: ['#8c8f8a', '#eceee8', '#7f827c'], tail: 'point', dor: 'tiny', anal: 1, hump: 1 }),
    F('chach', 'Cá chạch', 'dam', 'thuong', 0, 0, [10, 25], 0.35, { s: 'eel', c: ['#7d6a48', '#e3d2a8', '#6a5a3a'], spots: 1, short: 1 }),
    F('longtong', 'Cá lòng tong', 'dam', 'thuong', 0, 0, [3, 8], 1.2, { s: 'fish', h: .26, c: ['#9aa69a', '#f2f3ea', '#d36b4a'], tail: 'fork', dor: 'tall', pat: 'stripe', pc: 'rgba(30,40,40,.6)' }),
    F('rodau', 'Cá rô đầu vuông', 'dam', 'thuong', 0, 0, [10, 30], 2.4, { s: 'fish', h: .42, c: ['#3e5240', '#a6ad80', '#3f4a33'], tail: 'round', dor: 'spiky', pat: 'bars', pc: 'rgba(20,30,15,.35)', snout: 'blunt' }),
    F('tren', 'Cá trèn', 'dam', 'hiem', 0, ['suong'], [15, 40], 0.7, { s: 'fish', h: .2, c: ['#b9b8a8', '#efeee4', '#a9a898'], tail: 'fork', dor: 'tiny', anal: 1, bar: 1, glass: 1 }, 'Thân trong veo, chỉ thấy khi sương phủ mặt đầm.'),
    F('mangro', 'Cá mang rổ', 'dam', 'hiem', ['trua'], 0, [10, 30], 2.0, { s: 'fish', h: .44, c: ['#c9c08a', '#f6f2d8', '#3a3a2a'], tail: 'round', dor: 'tall', pat: 'blotch', pc: 'rgba(20,20,15,.8)', snout: 'up' }, 'Phun nước bắn côn trùng giữa trưa.'),
    F('locbong', 'Cá lóc bông', 'dam', 'hiem', 0, ['may'], [30, 100], 0.9, { s: 'fish', h: .21, c: ['#4f4d3a', '#cfc6a2', '#46442f'], tail: 'round', dor: 'long', pat: 'blotch', pc: 'rgba(20,20,12,.6)', snout: 'blunt' }, 'Trời âm u mới chịu rời bụi sen.'),
    F('liathia', 'Cá lia thia', 'dam', 'hiem', 0, ['nang'], [3, 7], 1.5, { s: 'fish', h: .34, c: ['#b53357', '#4a2a6a', '#d1385c'], tail: 'fan', dor: 'sail', anal: 1 }, 'Phô vây dưới nắng như cánh hoa.'),
    F('ruavang', 'Rùa vàng', 'dam', 'hiemco', ['binhminh'], ['suong'], [20, 50], 4.0, { s: 'turtle', c: ['#c9a23a', '#f3d77a', '#8a6a1f'], glow: 1 }, 'Hiện lên giữa sương sớm rồi lặn mất. Thả lại về đầm.'),

    // ---------- HỒ TRÊN NÚI ----------
    F('hoivan', 'Cá hồi vân', 'nui', 'thuong', 0, 0, [25, 70], 1.1, { s: 'fish', h: .26, c: ['#5f6f6a', '#f2e6da', '#6a7a70'], tail: 'fork', dor: 'tall', pat: 'dots', pc: 'rgba(30,30,30,.5)', band: '#e07a8a', adi: 1 }),
    F('damxanh', 'Cá dầm xanh', 'nui', 'thuong', 0, 0, [15, 40], 1.3, { s: 'fish', h: .3, c: ['#4f6f6a', '#dfe6d8', '#58786e'], tail: 'fork', dor: 'tall', pat: 'scales', bar: 1 }),
    F('mat', 'Cá mát', 'nui', 'thuong', 0, 0, [15, 35], 1.3, { s: 'fish', h: .3, c: ['#6c7c6e', '#e8ece4', '#7a5a4a'], tail: 'fork', dor: 'tall', pat: 'scales' }),
    F('bongnui', 'Cá bỗng', 'nui', 'thuong', 0, 0, [20, 60], 1.4, { s: 'fish', h: .3, c: ['#6a6248', '#ddd3aa', '#8a6a3a'], tail: 'fork', dor: 'tall', pat: 'scales', bar: 1, bigScale: 1 }),
    F('nien', 'Cá niên', 'nui', 'thuong', 0, 0, [8, 20], 1.3, { s: 'fish', h: .33, c: ['#8d9aa0', '#f3f5f2', '#a0a8a8'], tail: 'fork', dor: 'tall' }),
    F('hoivang', 'Cá hồi vàng', 'nui', 'hiem', ['trua'], 0, [30, 70], 1.1, { s: 'fish', h: .26, c: ['#e0a838', '#fff0b8', '#e08a3a'], tail: 'fork', dor: 'tall', adi: 1, glow: 1 }, 'Lấp lánh dưới nắng trưa trên hồ.'),
    F('tam', 'Cá tầm', 'nui', 'hiem', 0, ['suong'], [60, 200], 0.7, { s: 'sturgeon', c: ['#6b6f6a', '#e2e0d6', '#5a5e5a'] }, 'Rời đáy hồ khi sương mù dày.'),
    F('chien', 'Cá chiên', 'nui', 'hiem', ['dem'], 0, [40, 120], 0.9, { s: 'fish', h: .2, c: ['#4b4a36', '#cbc39a', '#3f3e2c'], tail: 'fork', dor: 'tall', bar: 2, pat: 'blotch', pc: 'rgba(200,180,90,.35)', snout: 'blunt' }, 'Đi săn trong đêm ở chỗ nước xiết.'),
    F('langcham', 'Cá lăng chấm', 'nui', 'hiem', 0, ['mua'], [50, 150], 0.9, { s: 'fish', h: .2, c: ['#6f6a66', '#e8e4de', '#615c58'], tail: 'fork', dor: 'tall', bar: 2, pat: 'dots', pc: 'rgba(30,25,25,.55)', snout: 'blunt', adi: 1 }, 'Mưa xuống là lên kiếm mồi.'),
    F('anhvu', 'Cá anh vũ', 'nui', 'hiemco', ['binhminh'], ['suong'], [30, 70], 1.3, { s: 'fish', h: .3, c: ['#7a7c64', '#e2ddc0', '#c98a7a'], tail: 'fork', dor: 'tall', pat: 'scales', snout: 'lips', glow: 1 }, 'Cá tiến vua, chỉ thấy trong sương lúc bình minh.'),

    // ---------- RỪNG NGẬP MẶN ----------
    F('keo', 'Cá kèo', 'rung', 'thuong', 0, 0, [10, 25], 0.6, { s: 'fish', h: .15, c: ['#8a7a5a', '#e4d9bd', '#7a6a4a'], tail: 'point', dor: 'long', pat: 'spots', pc: 'rgba(50,40,20,.4)', snout: 'blunt' }),
    F('thoiloi', 'Cá thòi lòi', 'rung', 'thuong', 0, 0, [8, 20], 1.0, { s: 'mudskip', c: ['#7a6e58', '#d8cfb6', '#3f7aa8'] }),
    F('cua', 'Cua bùn', 'rung', 'thuong', 0, 0, [8, 20], 5.0, { s: 'crab', c: ['#4f5a3a', '#a7a27a', '#3a4229'] }),
    F('chem', 'Cá chẽm', 'rung', 'thuong', 0, 0, [30, 100], 1.3, { s: 'fish', h: .3, c: ['#6d7680', '#eaeeee', '#6a7078'], tail: 'round', dor: 'spiky', pat: 'scales', snout: 'up' }),
    F('doi', 'Cá đối', 'rung', 'thuong', 0, 0, [20, 50], 1.2, { s: 'fish', h: .23, c: ['#6e7c84', '#eef1f0', '#7a868c'], tail: 'fork', dor: 'tall', pat: 'stripes', pc: 'rgba(50,60,70,.25)', snout: 'blunt' }),
    F('dia', 'Cá dìa', 'rung', 'thuong', 0, 0, [15, 35], 1.9, { s: 'fish', h: .45, c: ['#9a8a5a', '#e7dfc0', '#8a7a4a'], tail: 'fork', dor: 'spiky', pat: 'dots', pc: 'rgba(240,230,190,.6)' }),
    F('tomtit', 'Tôm tít', 'rung', 'hiem', ['dem'], 0, [10, 25], 0.9, { s: 'shrimp', c: ['#7aa06a', '#e0e8c8', '#d8803a'], mantis: 1 }, 'Rời hang dưới bùn vào ban đêm.'),
    F('ngat', 'Cá ngát', 'rung', 'hiem', ['toi'], 0, [30, 80], 0.6, { s: 'fish', h: .18, c: ['#4a4640', '#b8afa0', '#3e3a34'], tail: 'point', dor: 'tall', bar: 2, anal: 1, snout: 'blunt' }, 'Lần mò theo rễ đước khi trời tối.'),
    F('nau', 'Cá nâu', 'rung', 'hiem', 0, ['mua'], [10, 25], 2.6, { s: 'fish', h: .55, c: ['#4e5b4a', '#c6c7a6', '#46523f'], tail: 'fan', dor: 'spiky', pat: 'spots', pc: 'rgba(20,25,15,.55)' }, 'Mưa xuống làm nước lợ, cá nâu ra ăn.'),
    F('bonglau', 'Cá bông lau', 'rung', 'hiemco', ['dem'], ['mua'], [50, 120], 1.1, { s: 'fish', h: .26, c: ['#8a929a', '#f3f4f2', '#7a8088'], tail: 'fork', dor: 'tall', bar: 1, snout: 'blunt', glow: 1 }, 'Chỉ ngược dòng vào đêm mưa.'),

    // ---------- BIỂN KHƠI ----------
    F('nuc', 'Cá nục', 'bien', 'thuong', 0, 0, [12, 30], 1.2, { s: 'fish', h: .22, c: ['#3b7a9a', '#e3eff2', '#e0c040'], tail: 'fork', dor: 'tall', pat: 'stripe', pc: 'rgba(230,200,60,.7)' }),
    F('thu', 'Cá thu', 'bien', 'thuong', 0, 0, [40, 120], 0.8, { s: 'fish', h: .17, c: ['#2f5f7a', '#e5ecef', '#2a5068'], tail: 'moon', dor: 'low', pat: 'wavy', pc: 'rgba(20,40,60,.4)', finlet: 1 }),
    F('hong', 'Cá hồng', 'bien', 'thuong', 0, 0, [25, 80], 1.7, { s: 'fish', h: .36, c: ['#d0443a', '#f8c0b2', '#c03a32'], tail: 'fork', dor: 'spiky', pat: 'scales' }),
    F('mu', 'Cá mú', 'bien', 'thuong', 0, 0, [25, 100], 1.8, { s: 'fish', h: .32, c: ['#8a6a4a', '#e0c8a0', '#7a5a3a'], tail: 'round', dor: 'spiky', pat: 'spots', pc: 'rgba(220,110,50,.6)', snout: 'up' }),
    F('noc', 'Cá nóc', 'bien', 'thuong', 0, 0, [10, 35], 3.0, { s: 'puffer', c: ['#c8b46a', '#f6f0d6', '#6a5a2a'] }),
    F('he', 'Cá hề', 'bien', 'hiem', ['trua'], 0, [6, 11], 2.0, { s: 'fish', h: .4, c: ['#f07a1e', '#f7a24a', '#e0601a'], tail: 'round', dor: 'long', pat: 'clown' }, 'Ló ra khỏi hải quỳ khi nắng trưa xuyên xuống nước.'),
    F('muc', 'Mực ống', 'bien', 'hiem', ['dem'], 0, [15, 45], 0.5, { s: 'squid', c: ['#e8b0a0', '#f8e2da', '#b86a5a'] }, 'Bị ánh đèn thuyền thu hút vào ban đêm.'),
    F('bachtuoc', 'Bạch tuộc', 'bien', 'hiem', 0, ['mua'], [20, 80], 0.9, { s: 'octo', c: ['#b8604a', '#e8a88a', '#8a3a2a'] }, 'Bò khỏi hốc đá khi trời mưa.'),
    F('duoi', 'Cá đuối', 'bien', 'hiem', 0, ['suong'], [40, 150], 0.9, { s: 'ray', c: ['#6a6a5a', '#ecebe2', '#4a4a3a'] }, 'Lướt sát mặt nước trong sương.'),
    F('sua', 'Sứa', 'bien', 'hiem', ['toi'], 0, [10, 40], 0.4, { s: 'jelly', c: ['#c8b0e8', '#f2e8ff', '#9a7ad0'] }, 'Trôi dạt vào bờ lúc chập tối.'),
    F('ngu', 'Cá ngừ đại dương', 'bien', 'hiem', ['binhminh'], 0, [60, 200], 1.8, { s: 'fish', h: .28, c: ['#1f3b5c', '#d3dee4', '#e8c22a'], tail: 'moon', dor: 'tall', finlet: 1, pat: 'stripe', pc: 'rgba(120,170,210,.5)' }, 'Săn mồi gần mặt nước lúc bình minh.'),
    F('mattrang', 'Cá mặt trăng', 'bien', 'hiemco', ['trua'], ['nang'], [100, 300], 6.0, { s: 'sunfish', c: ['#9aa6ae', '#e8eef0', '#7a868e'] }, 'Nổi lên sưởi nắng giữa trưa hè.'),
    F('kiem', 'Cá kiếm', 'bien', 'hiemco', ['hoanghon'], ['giong'], [120, 400], 0.65, { s: 'fish', h: .17, c: ['#2a3f5a', '#c8d4dc', '#22344a'], tail: 'moon', dor: 'sail', snout: 'bill' }, 'Lao lên giữa sóng giông lúc hoàng hôn.')
  ];

  /* ---------- Loài bổ sung (đợt 3). N(id, tên, vùng, điều kiện, cỡ, k, hình, ghi chú)
   * Điều kiện là chuỗi các mục cách nhau bởi dấu cách: khung giờ (sang, toi...), thời tiết (mua, suong...),
   * NGAY / DEM (ban ngày / ban đêm), CUONG / NONG (triều cường / nước nông).
   * Không điều kiện = Thường gặp, một điều kiện = Hiếm, từ hai điều kiện = Hiếm có. */
  function N(id, name, reg, cond, cm, k, a, note) {
    var e = { id: id, name: name, reg: reg, t: null, w: null, d: null, n: null, cm: cm, k: k, a: a, note: note || '' }, c = 0;
    (cond || '').split(' ').forEach(function (tok) {
      if (!tok) return;
      c++;
      if (tok === 'NGAY' || tok === 'DEM') e.d = tok === 'NGAY' ? 'ngay' : 'dem';
      else if (tok === 'CUONG' || tok === 'NONG') e.n = tok === 'CUONG' ? 'cuong' : 'nong';
      else if (WEATHER[tok]) (e.w = e.w || []).push(tok);
      else (e.t = e.t || []).push(tok);
    });
    e.r = c === 0 ? 'thuong' : c === 1 ? 'hiem' : 'hiemco';
    return e;
  }
  var MORE = [
    // ---------- AO LÀNG ----------
    N('dieuhong', 'Cá diêu hồng', 'ao', '', [15, 40], 2.0, { s: 'fish', h: .42, c: ['#d8584a', '#f8c8b0', '#e0704a'], tail: 'round', dor: 'spiky', pat: 'scales' }),
    N('mehoa', 'Cá mè hoa', 'ao', '', [30, 90], 1.4, { s: 'fish', h: .33, c: ['#6a6a5a', '#e6e2d0', '#7a7464'], tail: 'fork', dor: 'low', pat: 'blotch', pc: 'rgba(30,30,25,.45)', eye: 'low', head: 1.2 }),
    N('troi', 'Cá trôi', 'ao', '', [20, 60], 1.3, { s: 'fish', h: .3, c: ['#5a6a7a', '#dfe4e2', '#6a7480'], tail: 'fork', dor: 'tall', pat: 'scales', snout: 'blunt' }),
    N('tepdong', 'Tép đồng', 'ao', '', [2, 5], 1.0, { s: 'shrimp', c: ['#a8b89a', '#e8eedc', '#8a9a7a'] }),
    N('tramden', 'Cá trắm đen', 'ao', 'DEM', [40, 120], 1.2, { s: 'fish', h: .26, c: ['#2f3236', '#9a9ea0', '#26282c'], tail: 'fork', dor: 'low', pat: 'scales' }, 'Trời tối mới rời đáy ao đi ăn ốc.'),
    N('baba', 'Ba ba', 'ao', 'NONG', [15, 45], 4.5, { s: 'turtle', c: ['#6a6a48', '#c8c098', '#5a5a3a'], soft: 1 }, 'Nước ao cạn là bò lên phơi lưng.'),
    N('cavang', 'Cá vàng', 'ao', 'NGAY', [5, 18], 2.2, { s: 'fish', h: .46, c: ['#f08a2a', '#ffd89a', '#f4a040'], tail: 'fan', dor: 'tall', pat: 'scales' }, 'Ai đó thả xuống ao, ban ngày hay bơi sát bờ.'),
    N('sacbuom', 'Cá sặc bướm', 'ao', 'CUONG', [6, 14], 1.8, { s: 'fish', h: .42, c: ['#7a8aa8', '#e2e4ec', '#5a6a98'], tail: 'round', dor: 'long', anal: 1, pat: 'dots', pc: 'rgba(30,30,60,.5)' }, 'Nước ao dâng lên là theo ra bờ cỏ.'),
    N('koi', 'Cá chép Koi', 'ao', 'sang nang', [30, 90], 1.6, { s: 'fish', h: .34, c: ['#f4f0e8', '#fffaf0', '#e8483a'], tail: 'fork', dor: 'long', bar: 1, pat: 'blotch', pc: 'rgba(230,60,40,.85)', glow: 1 }, 'Lững lờ dưới nắng sớm, đẹp như tranh.'),

    // ---------- SÔNG QUÊ ----------
    N('mevinh', 'Cá mè vinh', 'song', '', [12, 30], 2.0, { s: 'fish', h: .42, c: ['#8a9aa0', '#eef2ee', '#c89a4a'], tail: 'fork', dor: 'tall', pat: 'scales' }),
    N('hevang', 'Cá he vàng', 'song', '', [15, 35], 1.9, { s: 'fish', h: .4, c: ['#b89a4a', '#f4e8b8', '#e0703a'], tail: 'fork', dor: 'tall', pat: 'scales', pc: '#e0703a' }),
    N('cahu', 'Cá hú', 'song', '', [25, 70], 1.0, { s: 'fish', h: .22, c: ['#6a7078', '#e8eae6', '#5a6068'], tail: 'fork', dor: 'tall', bar: 2, anal: 1, snout: 'blunt' }),
    N('melui', 'Cá mè lúi', 'song', '', [15, 35], 1.5, { s: 'fish', h: .32, c: ['#8a96a0', '#f2f4f0', '#9aa4a8'], tail: 'fork', dor: 'low', pat: 'scales' }),
    N('vodem', 'Cá vồ đém', 'song', 'DEM', [30, 90], 1.0, { s: 'fish', h: .22, c: ['#5a5a52', '#d8d6c8', '#4a4a44'], tail: 'fork', dor: 'tall', bar: 2, pat: 'spots', snout: 'blunt' }, 'Lên ăn mồi khi trời đã tối hẳn.'),
    N('et', 'Cá ét', 'song', 'CUONG', [15, 40], 1.4, { s: 'fish', h: .28, c: ['#7a7a6a', '#e8e6d8', '#c85a3a'], tail: 'fork', dor: 'tall', pat: 'scales', snout: 'lips' }, 'Nước lớn tràn bờ là cá ét theo vào kênh.'),
    N('duong', 'Cá duồng', 'song', 'NONG', [30, 80], 1.3, { s: 'fish', h: .26, c: ['#4a5a5a', '#d8dcd0', '#3a4a48'], tail: 'fork', dor: 'tall', pat: 'stripes', snout: 'lips' }, 'Nước ròng cạn bãi mới thấy bơi ngang.'),
    N('tepbac', 'Tép bạc', 'song', 'hoanghon', [3, 7], 1.0, { s: 'shrimp', c: ['#d8dce0', '#f4f6f8', '#b8c0c8'], glass: 1 }, 'Chiều tà tụ thành đàn ven bờ.'),
    N('duoisong', 'Cá đuối nước ngọt', 'song', 'DEM NONG', [40, 150], 1.0, { s: 'ray', c: ['#7a6a4a', '#ece4d0', '#5a4a34'] }, 'Đêm nước cạn mới rời lớp cát đáy sông.'),

    // ---------- ĐẦM SEN ----------
    N('trevang', 'Cá trê vàng', 'dam', '', [15, 35], 0.9, { s: 'fish', h: .2, c: ['#a8883a', '#ecdca0', '#8a6a2a'], tail: 'round', dor: 'long', bar: 2, snout: 'blunt', pat: 'dots', pc: 'rgba(240,230,190,.7)' }),
    N('sacdiep', 'Cá sặc điệp', 'dam', '', [6, 15], 1.8, { s: 'fish', h: .44, c: ['#6a8a9a', '#dde8e6', '#5a7aa0'], tail: 'round', dor: 'long', anal: 1, pat: 'bars', pc: 'rgba(20,40,60,.3)' }),
    N('chotbong', 'Cá chốt bông', 'dam', '', [10, 25], 1.0, { s: 'fish', h: .22, c: ['#8a7a4a', '#f0e2b8', '#7a6a3a'], tail: 'fork', dor: 'tall', bar: 2, pat: 'blotch', pc: 'rgba(40,30,10,.5)' }),
    N('batrau', 'Cá bã trầu', 'dam', 'NONG', [3, 6], 1.5, { s: 'fish', h: .36, c: ['#a87a5a', '#ecd8b8', '#c84a3a'], tail: 'point', dor: 'tiny', anal: 1, pat: 'stripe', pc: 'rgba(60,30,20,.6)' }, 'Nấp dưới lá khi đầm cạn nước.'),
    N('com', 'Cá còm', 'dam', 'DEM', [30, 100], 1.0, { s: 'fish', h: .3, c: ['#8a8c90', '#eceee8', '#7a7c80'], tail: 'point', dor: 'tiny', anal: 1, hump: 1, pat: 'dots', pc: '#f4f0e8' }, 'Đêm xuống mới uốn mình rời bụi sen.'),
    N('bongtuong', 'Cá bống tượng', 'dam', 'CUONG', [15, 50], 1.6, { s: 'fish', h: .26, c: ['#6a5a3a', '#e0d0a8', '#5a4a30'], tail: 'round', dor: 'long', pat: 'blotch', pc: 'rgba(30,20,10,.55)', snout: 'blunt' }, 'Nước dâng ngập gốc sen thì ra rình mồi.'),
    N('day', 'Cá dày', 'dam', 'chieu', [20, 60], 0.9, { s: 'fish', h: .21, c: ['#5a6a4a', '#d8dcb0', '#4a5a3a'], tail: 'round', dor: 'long', pat: 'bars', pc: 'rgba(20,30,10,.45)', snout: 'blunt' }, 'Họ hàng cá lóc, hay đớp mồi buổi chiều.'),
    N('rongbac', 'Cá rồng bạc', 'dam', 'NGAY CUONG', [40, 90], 1.0, { s: 'fish', h: .24, c: ['#b8c0c8', '#f4f6f4', '#9aa4b0'], tail: 'round', dor: 'long', anal: 1, bigScale: 1, pat: 'scales', snout: 'up', bar: 2, glow: 1 }, 'Phóng lên đớp mồi khi nước lớn giữa ban ngày.'),

    // ---------- HỒ TRÊN NÚI ----------
    N('chaydat', 'Cá chày đất', 'nui', '', [10, 30], 1.3, { s: 'fish', h: .27, c: ['#7a7a5a', '#e8e4cc', '#c8503a'], tail: 'fork', dor: 'tall', pat: 'scales' }),
    N('sinh', 'Cá sỉnh', 'nui', '', [15, 45], 1.4, { s: 'fish', h: .3, c: ['#4a5a4a', '#d8dcc8', '#c8783a'], tail: 'fork', dor: 'tall', pat: 'scales', bigScale: 1 }),
    N('muong', 'Cá mương', 'nui', '', [8, 20], 1.0, { s: 'fish', h: .24, c: ['#8a9aa0', '#f2f4f2', '#9aa6aa'], tail: 'fork', dor: 'tall' }),
    N('nganh', 'Cá ngạnh', 'nui', '', [15, 40], 1.0, { s: 'fish', h: .22, c: ['#7a7060', '#e6e0d0', '#6a6050'], tail: 'fork', dor: 'tall', bar: 2, adi: 1, snout: 'blunt' }),
    N('langdo', 'Cá lăng đuôi đỏ', 'nui', 'DEM', [40, 120], 0.9, { s: 'fish', h: .2, c: ['#6a6a6a', '#e6e6e2', '#d84a3a'], tail: 'fork', dor: 'tall', bar: 2, adi: 1, snout: 'blunt' }, 'Đêm xuống mới mò lên chỗ nước nông.'),
    N('chepkinh', 'Cá chép kính', 'nui', 'NGAY', [25, 70], 1.7, { s: 'fish', h: .36, c: ['#8a7a4a', '#ecdcaa', '#a8783a'], tail: 'fork', dor: 'long', bar: 1, bigScale: 1, pat: 'scales' }, 'Vảy to lấp lánh như gương dưới nắng.'),
    N('hoidom', 'Cá hồi đốm', 'nui', 'NONG', [25, 60], 1.1, { s: 'fish', h: .26, c: ['#4a5a4a', '#ecdcc8', '#5a6a58'], tail: 'fork', dor: 'tall', adi: 1, pat: 'dots', pc: '#f0a040' }, 'Mực nước hồ hạ thì ra bãi đá rình mồi.'),
    N('coc', 'Cá cóc Tam Đảo', 'nui', 'suong DEM', [10, 18], 1.0, { s: 'newt', c: ['#3a2a24', '#e8783a', '#2a1e1a'] }, 'Bò ra khỏi khe đá trong đêm sương. Thả lại về hồ nhé.'),

    // ---------- RỪNG NGẬP MẶN ----------
    N('bongsao', 'Cá bống sao', 'rung', '', [8, 20], 1.0, { s: 'mudskip', c: ['#5a6a7a', '#d8dce0', '#3a7ab8'], dots: 1 }),
    N('bakhia', 'Ba khía', 'rung', '', [3, 7], 5.0, { s: 'crab', c: ['#7a3a5a', '#c87a8a', '#a83a4a'] }),
    N('cang', 'Cá căng', 'rung', '', [10, 30], 1.6, { s: 'fish', h: .34, c: ['#9a9a88', '#f0eee0', '#8a8a78'], tail: 'fork', dor: 'spiky', pat: 'stripes', pc: 'rgba(30,30,20,.5)' }),
    N('oclen', 'Ốc len', 'rung', '', [3, 6], 6.0, { s: 'snail', c: ['#5a4a3a', '#c8a888', '#3a2a1e'], tall: 1 }),
    N('tomsu', 'Tôm sú', 'rung', 'CUONG', [15, 35], 1.0, { s: 'shrimp', c: ['#3a4a4a', '#c8ccc0', '#e8c040'], bands: 1 }, 'Theo triều cường tràn vào rừng đước.'),
    N('sam', 'Sam', 'rung', 'NONG', [20, 50], 2.0, { s: 'sam', c: ['#6a5a3a', '#a8946a', '#4a3a24'] }, 'Bò lên bãi bùn lúc nước ròng. Thả lại về nước nhé.'),
    N('hongbac', 'Cá hồng bạc', 'rung', 'DEM', [25, 70], 1.6, { s: 'fish', h: .34, c: ['#a86a5a', '#f2dcd0', '#c84a3a'], tail: 'fork', dor: 'spiky', pat: 'scales' }, 'Rời gốc đước đi săn khi trời tối.'),
    N('nhai', 'Cá nhái', 'rung', 'NGAY', [30, 80], 0.25, { s: 'fish', h: .09, c: ['#3a7a6a', '#e0f0e8', '#2a6a5a'], tail: 'fork', dor: 'low', anal: 1, snout: 'bill' }, 'Lướt sát mặt nước dưới nắng.'),
    N('chinhhoa', 'Cá chình hoa', 'rung', 'DEM CUONG', [60, 150], 0.3, { s: 'eel', c: ['#6a6a3a', '#d8d4a0', '#4a4a24'], spots: 1, fin: 1 }, 'Theo con nước lớn về rừng trong đêm.'),

    // ---------- BIỂN KHƠI ----------
    N('bacma', 'Cá bạc má', 'bien', '', [15, 30], 1.2, { s: 'fish', h: .22, c: ['#3a6a8a', '#e8eef0', '#e0c040'], tail: 'fork', dor: 'tall', finlet: 1, pat: 'dots', pc: 'rgba(20,40,60,.5)' }),
    N('chim', 'Cá chim', 'bien', '', [15, 40], 2.4, { s: 'fish', h: .58, c: ['#a8b0b8', '#f4f4f2', '#98a0a8'], tail: 'fork', dor: 'tall', anal: 1 }),
    N('ho', 'Cá hố', 'bien', '', [50, 150], 0.12, { s: 'eel', c: ['#c8ccd4', '#f4f6f8', '#a8b0b8'], fin: 1 }),
    N('ghe', 'Ghẹ xanh', 'bien', '', [8, 20], 4.0, { s: 'crab', c: ['#3a6aa8', '#c8d8e8', '#2a5a98'], dots: 1 }),
    N('co', 'Cá cờ', 'bien', 'NGAY', [100, 300], 0.5, { s: 'fish', h: .17, c: ['#2a4a7a', '#d0dce4', '#3a5a9a'], tail: 'moon', dor: 'sail', snout: 'bill', pat: 'bars' }, 'Giương vây buồm săn cá giữa ban ngày.'),
    N('bop', 'Cá bớp', 'bien', 'CUONG', [50, 150], 1.0, { s: 'fish', h: .2, c: ['#3a3a3a', '#d8d4c8', '#2a2a2a'], tail: 'fork', dor: 'low', band: '#f4f0e8', snout: 'blunt' }, 'Triều cường đẩy cá bớp vào gần bờ.'),
    N('mucnang', 'Mực nang', 'bien', 'NONG', [15, 40], 1.6, { s: 'squid', c: ['#a8846a', '#f0dcc8', '#7a5a44'], stout: 1 }, 'Nước nông là vào bãi đá đẻ trứng.'),
    N('mapden', 'Cá mập vây đen', 'bien', 'DEM', [80, 180], 0.9, { s: 'shark', c: ['#7a8890', '#eceeee', '#1f2228'] }, 'Đêm đến mới vào gần bãi cạn.'),
    N('ruabien', 'Rùa xanh', 'bien', 'DEM CUONG', [60, 120], 2.4, { s: 'turtle', c: ['#4a6a4a', '#d8d0a0', '#3a5a3a'], glow: 1, sea: 1 }, 'Theo triều cường lên bãi đẻ trứng giữa đêm. Thả lại về biển nhé.')
  ];
  MORE = MORE.concat([
    // ---------- SUỐI THÁC ----------
    N('chat', 'Cá chát', 'suoi', '', [10, 30], 1.3, { s: 'fish', h: .28, c: ['#6a7a6a', '#e4e8dc', '#7a6a4a'], tail: 'fork', dor: 'tall', pat: 'bars', pc: 'rgba(30,40,30,.35)' }),
    N('bongda', 'Cá bống đá', 'suoi', '', [6, 15], 1.3, { s: 'fish', h: .22, c: ['#6a6052', '#d8d0c0', '#5a5044'], tail: 'round', dor: 'long', pat: 'spots', pc: 'rgba(30,25,20,.5)', snout: 'blunt' }),
    N('chachsuoi', 'Cá chạch suối', 'suoi', '', [8, 20], 0.35, { s: 'eel', c: ['#8a7a5a', '#e8dcc0', '#6a5a3a'], spots: 1, short: 1 }),
    N('longtongda', 'Cá lòng tong đá', 'suoi', '', [4, 10], 1.2, { s: 'fish', h: .25, c: ['#7a8a7a', '#eef0e8', '#c8583a'], tail: 'fork', dor: 'tall', pat: 'stripe', pc: 'rgba(20,30,30,.6)' }),
    N('phao', 'Cá phao', 'suoi', '', [10, 30], 1.4, { s: 'fish', h: .3, c: ['#5a6a5a', '#e0e4d8', '#6a7a6a'], tail: 'fork', dor: 'tall', pat: 'scales', snout: 'lips' }),
    N('cuasuoi', 'Cua suối', 'suoi', '', [4, 10], 5.0, { s: 'crab', c: ['#a84a2a', '#e8a07a', '#8a3a20'] }),
    N('bamda', 'Cá bám đá', 'suoi', '', [4, 10], 1.0, { s: 'fish', h: .18, c: ['#6a6a5a', '#d8d4c0', '#5a5a4a'], tail: 'round', dor: 'long', pat: 'blotch', pc: 'rgba(30,30,20,.5)', snout: 'blunt' }),
    N('ven', 'Cá vền', 'suoi', '', [12, 35], 2.0, { s: 'fish', h: .44, c: ['#8a96a0', '#f0f2ee', '#8a8a80'], tail: 'fork', dor: 'tall', anal: 1 }),
    N('langsuoi', 'Cá lăng suối', 'suoi', 'DEM', [25, 70], 0.9, { s: 'fish', h: .2, c: ['#5a5a4a', '#dcd8c4', '#4a4a3a'], tail: 'fork', dor: 'tall', bar: 2, adi: 1, snout: 'blunt', pat: 'blotch' }, 'Rời hốc đá dưới thác khi trời tối.'),
    N('tomsuoi', 'Tôm suối', 'suoi', 'toi', [4, 10], 1.0, { s: 'shrimp', c: ['#8a7a5a', '#e0d8c0', '#6a5a3a'], claw: 1 }, 'Bò ra khe đá lúc chập tối.'),
    N('niet', 'Cá niết', 'suoi', 'NGAY', [8, 20], 1.2, { s: 'fish', h: .26, c: ['#6a7a8a', '#eef0f0', '#e0a03a'], tail: 'fork', dor: 'tall', pat: 'dots', pc: 'rgba(20,30,40,.5)' }, 'Ban ngày đớp ruồi rơi xuống suối.'),
    N('mi', 'Cá mị', 'suoi', 'suong', [10, 30], 1.2, { s: 'fish', h: .28, c: ['#8a9aa0', '#f0f4f2', '#a8b4b8'], tail: 'fork', dor: 'tall', glass: 1 }, 'Chỉ thấy khi sương phủ kín lòng suối.'),
    N('sutmui', 'Cá sứt mũi', 'suoi', 'NONG', [15, 40], 1.3, { s: 'fish', h: .27, c: ['#5a6a6a', '#dce4e0', '#4a5a5a'], tail: 'fork', dor: 'tall', pat: 'scales', snout: 'up' }, 'Suối cạn là ra vũng nước đọng.'),
    N('chaymat', 'Cá chày mắt đỏ', 'suoi', 'binhminh', [12, 35], 1.3, { s: 'fish', h: .28, c: ['#6a7a7a', '#eaeee8', '#d8503a'], tail: 'fork', dor: 'tall', pat: 'scales', eye: 'red' }, 'Bơi ngược thác lúc trời vừa sáng.'),
    N('mo', 'Cá mỡ', 'suoi', 'CUONG', [8, 20], 1.6, { s: 'fish', h: .32, c: ['#a89a6a', '#f4eccc', '#c8a050'], tail: 'fork', dor: 'tall' }, 'Nước suối dâng là cá mỡ theo dòng xuống.'),
    N('echgai', 'Ếch gai', 'suoi', 'mua', [8, 14], 3.0, { s: 'frog', c: ['#6a5a3a', '#d8c8a0', '#4a3a24'], warts: 1 }, 'Kêu ồm ộp khi mưa rơi trên suối.'),
    N('chinhmun', 'Cá chình mun', 'suoi', 'DEM mua', [50, 120], 0.3, { s: 'eel', c: ['#2a2a2a', '#8a8a80', '#1e1e1e'], fin: 1 }, 'Chỉ trườn lên trong đêm mưa.'),
    N('hoa', 'Cá hỏa', 'suoi', 'suong NONG', [25, 60], 1.5, { s: 'fish', h: .3, c: ['#c84a2a', '#f8d8b8', '#e86a3a'], tail: 'fork', dor: 'tall', pat: 'scales', snout: 'lips', glow: 1 }, 'Đỏ rực như lửa, ra vũng cạn trong sương.'),
    N('chienvang', 'Cá chiên vàng', 'suoi', 'giong DEM', [40, 120], 0.9, { s: 'fish', h: .2, c: ['#a8883a', '#f0e0a8', '#8a6a2a'], tail: 'fork', dor: 'tall', bar: 2, pat: 'blotch', pc: 'rgba(60,40,10,.5)', snout: 'blunt', glow: 1 }, 'Quẫy lên giữa thác trong đêm giông.'),

    // ---------- CỬA SÔNG (nước lợ) ----------
    N('son', 'Cá sơn', 'cuasong', '', [4, 10], 1.6, { s: 'fish', h: .4, c: ['#c8ccc4', '#f4f4f0', '#d8c8a0'], tail: 'fork', dor: 'spiky', glass: 1 }),
    N('liet', 'Cá liệt', 'cuasong', '', [6, 14], 2.0, { s: 'fish', h: .5, c: ['#b8bcc0', '#f4f4f2', '#e0c040'], tail: 'fork', dor: 'spiky', pat: 'wavy' }),
    N('comsong', 'Cá cơm', 'cuasong', '', [5, 12], 0.8, { s: 'fish', h: .18, c: ['#9aa8b0', '#f2f4f4', '#a8b4b8'], tail: 'fork', dor: 'tall', pat: 'stripe', pc: 'rgba(240,240,240,.9)', glass: 1 }),
    N('moi', 'Cá mòi', 'cuasong', '', [12, 28], 1.2, { s: 'fish', h: .3, c: ['#4a6a8a', '#eef2f2', '#8a9aa8'], tail: 'fork', dor: 'tall', pat: 'dots', pc: 'rgba(20,30,50,.6)' }),
    N('du', 'Cá đù', 'cuasong', '', [12, 35], 1.4, { s: 'fish', h: .3, c: ['#a8a08a', '#f0ece0', '#c8a868'], tail: 'point', dor: 'long', pat: 'scales' }),
    N('phen', 'Cá phèn', 'cuasong', '', [12, 30], 1.3, { s: 'fish', h: .28, c: ['#d8a88a', '#f8ecdc', '#e0c060'], tail: 'fork', dor: 'tall', bar: 2, pat: 'stripe', pc: '#f0c040' }),
    N('tomthe', 'Tôm thẻ', 'cuasong', '', [8, 20], 1.0, { s: 'shrimp', c: ['#c8ccc4', '#eef0ec', '#d8a08a'] }),
    N('luoitrau', 'Cá lưỡi trâu', 'cuasong', '', [12, 35], 0.9, { s: 'flat', c: ['#8a7a5a', '#ece4d0', '#6a5a40'], tongue: 1 }),
    N('ngua', 'Cá ngựa', 'cuasong', 'NONG', [6, 18], 1.0, { s: 'seahorse', c: ['#c89a3a', '#f0d890', '#a87a2a'] }, 'Bám vào rong khi nước rút nông.'),
    N('bon', 'Cá bơn', 'cuasong', 'DEM', [15, 45], 1.0, { s: 'flat', c: ['#6a6a50', '#e8e4d0', '#4a4a38'], spots: 1 }, 'Rời lớp cát đáy đi ăn khi trời tối.'),
    N('uc', 'Cá úc', 'cuasong', 'CUONG', [25, 70], 1.0, { s: 'fish', h: .23, c: ['#5a6a7a', '#e4e8ea', '#4a5a6a'], tail: 'fork', dor: 'tall', bar: 2, adi: 1, snout: 'blunt' }, 'Theo con nước lớn từ biển vào sông.'),
    N('dua', 'Cá dứa', 'cuasong', 'mua', [30, 90], 1.0, { s: 'fish', h: .24, c: ['#6a7a70', '#eef0ea', '#5a6a60'], tail: 'fork', dor: 'tall', bar: 2, adi: 1, snout: 'blunt' }, 'Mưa xuống nước ngọt tràn ra là cá dứa ăn mạnh.'),
    N('thieu', 'Cá thiều', 'cuasong', 'toi', [30, 80], 1.0, { s: 'fish', h: .24, c: ['#4a5a6a', '#dde2e4', '#3a4a5a'], tail: 'fork', dor: 'tall', bar: 2, snout: 'blunt' }, 'Lên kiếm mồi lúc chập tối.'),
    N('kim', 'Cá kìm', 'cuasong', 'NGAY', [10, 30], 0.3, { s: 'fish', h: .1, c: ['#7a9a8a', '#eef4f0', '#d8483a'], tail: 'fork', dor: 'low', anal: 1, snout: 'bill' }, 'Lượn sát mặt nước giữa ban ngày.'),
    N('chet', 'Cá chét', 'cuasong', 'binhminh', [20, 60], 1.2, { s: 'fish', h: .28, c: ['#a8a890', '#f2f0e4', '#e0b040'], tail: 'fork', dor: 'tall', bar: 3, snout: 'blunt' }, 'Râu dài như sợi chỉ, ra ăn lúc rạng sáng.'),
    N('bongtrung', 'Cá bống trứng', 'cuasong', 'suong', [8, 20], 1.3, { s: 'fish', h: .24, c: ['#9a8a6a', '#f0e8d0', '#8a7a5a'], tail: 'round', dor: 'long', pat: 'spots', snout: 'blunt' }, 'Ra cửa hang khi sương phủ bãi bồi.'),
    N('chay', 'Cá cháy', 'cuasong', 'binhminh CUONG', [30, 60], 1.3, { s: 'fish', h: .32, c: ['#5a7a9a', '#f2f4f4', '#9aa8b4'], tail: 'fork', dor: 'tall', pat: 'scales', glow: 1 }, 'Loài cá quý, chỉ ngược sông khi triều cường lúc rạng sáng.'),
    N('suvang', 'Cá sủ vàng', 'cuasong', 'DEM giong', [60, 150], 1.3, { s: 'fish', h: .28, c: ['#c89a3a', '#f8e8b0', '#a87a2a'], tail: 'point', dor: 'long', pat: 'scales', glow: 1 }, 'Hiếm lắm mới gặp, chỉ lên trong đêm giông.'),
    N('lac', 'Cá lạc', 'cuasong', 'suong NONG', [60, 180], 0.3, { s: 'eel', c: ['#6a6a62', '#e4e2d8', '#4a4a44'], fin: 1 }, 'Trườn ra từ hốc đá khi nước cạn trong sương.'),

    // ---------- RẠN SAN HÔ ----------
    N('thia', 'Cá thia', 'ran', '', [4, 10], 2.0, { s: 'fish', h: .44, c: ['#3a7ad8', '#8ac0f0', '#2a5ab8'], tail: 'fork', dor: 'long', glow: 1 }),
    N('bangchai', 'Cá bàng chài', 'ran', '', [12, 35], 1.5, { s: 'fish', h: .32, c: ['#3aa88a', '#c8f0d8', '#e85a8a'], tail: 'round', dor: 'long', pat: 'wavy', pc: 'rgba(230,90,140,.6)', snout: 'lips' }),
    N('buom', 'Cá bướm', 'ran', '', [8, 20], 1.8, { s: 'fish', h: .66, c: ['#f0d040', '#fff4c0', '#1b1d2a'], tail: 'round', dor: 'long', anal: 1, pat: 'stripe', pc: '#1b1d2a', snout: 'up' }),
    N('duoigai', 'Cá đuôi gai', 'ran', '', [15, 35], 1.6, { s: 'fish', h: .5, c: ['#3a5ac8', '#6a8ae8', '#f0d040'], tail: 'moon', dor: 'long', anal: 1, pat: 'stripe', pc: '#1b1d2a' }),
    N('mo2', 'Cá mó', 'ran', '', [20, 60], 1.6, { s: 'fish', h: .36, c: ['#3ab8a0', '#a8e8d0', '#e870a0'], tail: 'moon', dor: 'long', pat: 'scales', snout: 'blunt' }),
    N('sonda', 'Cá sơn đá', 'ran', '', [12, 30], 1.6, { s: 'fish', h: .38, c: ['#d83a3a', '#f8b0a0', '#c82a2a'], tail: 'fork', dor: 'spiky', pat: 'stripes', pc: 'rgba(255,240,230,.5)', eye: 'big' }),
    N('luong', 'Cá lượng', 'ran', '', [15, 35], 1.4, { s: 'fish', h: .3, c: ['#d87a8a', '#f8e0e4', '#f0d040'], tail: 'fork', dor: 'tall', pat: 'stripe', pc: '#f0d040' }),
    N('bo', 'Cá bò', 'ran', '', [15, 45], 1.8, { s: 'fish', h: .5, c: ['#5a6a8a', '#d8dce8', '#f0a040'], tail: 'round', dor: 'tall', anal: 1, pat: 'dots', pc: '#f0d040', snout: 'up' }),
    N('maotien', 'Cá mao tiên', 'ran', 'DEM', [15, 38], 1.6, { s: 'fish', h: .4, c: ['#d8603a', '#f8e0d0', '#e88a6a'], tail: 'round', dor: 'sail', pat: 'bars', pc: 'rgba(255,250,240,.9)', lion: 1 }, 'Xòe vây gai đi săn trong đêm.'),
    N('tomhum', 'Tôm hùm bông', 'ran', 'toi', [20, 50], 1.4, { s: 'shrimp', c: ['#3a7a8a', '#e8d8a8', '#e8a040'], lobster: 1 }, 'Rời hang đá lúc chập tối.'),
    N('thantien', 'Cá thần tiên hoàng đế', 'ran', 'NGAY', [15, 40], 1.8, { s: 'fish', h: .58, c: ['#2a3aa8', '#f0d040', '#f0d040'], tail: 'round', dor: 'long', anal: 1, pat: 'stripes', pc: 'rgba(240,210,60,.9)' }, 'Bơi lượn quanh rạn khi nắng chiếu xuống.'),
    N('matquy', 'Cá mặt quỷ', 'ran', 'NONG', [15, 40], 2.4, { s: 'fish', h: .4, c: ['#8a6a5a', '#c8a890', '#6a4a3a'], tail: 'round', dor: 'spiky', pat: 'blotch', pc: 'rgba(200,120,90,.6)', snout: 'up' }, 'Nằm im như hòn đá khi nước rút. Cẩn thận gai độc.'),
    N('nocgai', 'Cá nóc gai', 'ran', 'CUONG', [15, 45], 3.0, { s: 'puffer', c: ['#c8b88a', '#f8f0d8', '#5a4a2a'], spines: 1 }, 'Nước lớn là phồng mình trôi ra khỏi rạn.'),
    N('saobien', 'Sao biển', 'ran', 'trua', [10, 30], 2.0, { s: 'star', c: ['#e8603a', '#f8a07a', '#c8402a'] }, 'Nằm phơi trên cát trắng lúc giữa trưa.'),
    N('nhum', 'Nhum biển', 'ran', 'suong', [5, 12], 3.0, { s: 'urchin', c: ['#3a2a4a', '#6a4a7a', '#2a1a3a'] }, 'Lăn ra khỏi khe đá khi biển phủ sương.'),
    N('lich', 'Cá lịch', 'ran', 'mua', [40, 150], 0.3, { s: 'eel', c: ['#8a8a3a', '#e8e0a0', '#6a6a2a'], spots: 1, fin: 1, moray: 1 }, 'Thò đầu ra khỏi hốc đá khi mưa.'),
    N('banggu', 'Cá bàng chài đầu gù', 'ran', 'NGAY CUONG', [60, 200], 2.0, { s: 'fish', h: .42, c: ['#3a9a8a', '#a8e0d0', '#2a7a6a'], tail: 'round', dor: 'long', anal: 1, pat: 'wavy', pc: 'rgba(20,60,60,.4)', snout: 'lips', hump: 1, glow: 1 }, 'Gã khổng lồ của rạn, chỉ ra khi nước lớn giữa ban ngày.'),
    N('doimoi', 'Rùa đồi mồi', 'ran', 'trua nang', [50, 100], 2.6, { s: 'turtle', c: ['#8a5a2a', '#e8c890', '#5a3a1a'], shell: 1, glow: 1, sea: 1 }, 'Nổi lên thở dưới nắng trưa. Thả lại về biển nhé.'),
    N('manta', 'Cá đuối manta', 'ran', 'hoanghon nang', [200, 500], 0.4, { s: 'ray', c: ['#2a2e3a', '#f0f0ec', '#1e2028'], manta: 1, glow: 1 }, 'Lướt qua rạn như cánh diều lúc hoàng hôn.'),

    // ---------- VỊNH ĐÁ VÔI ----------
    N('banhduong', 'Cá bánh đường', 'vinh', '', [12, 30], 1.6, { s: 'fish', h: .36, c: ['#c8a8a0', '#f4ece8', '#d88a7a'], tail: 'fork', dor: 'spiky', pat: 'scales' }),
    N('kem', 'Cá kẽm', 'vinh', '', [15, 40], 1.8, { s: 'fish', h: .42, c: ['#8a8a92', '#ececec', '#5a5a62'], tail: 'fork', dor: 'spiky', pat: 'dots', pc: 'rgba(240,200,60,.7)', snout: 'lips' }),
    N('sao', 'Cá sạo', 'vinh', '', [15, 40], 1.6, { s: 'fish', h: .36, c: ['#9a9aa0', '#f0f0ee', '#e0c060'], tail: 'fork', dor: 'spiky', pat: 'stripes', pc: 'rgba(240,210,90,.6)' }),
    N('moi2', 'Cá mối', 'vinh', '', [15, 40], 0.9, { s: 'fish', h: .2, c: ['#8a7a6a', '#ece4d8', '#7a6a5a'], tail: 'fork', dor: 'long', pat: 'bars', snout: 'blunt' }),
    N('trac', 'Cá trác', 'vinh', '', [15, 35], 1.6, { s: 'fish', h: .36, c: ['#d86a5a', '#f8d8d0', '#c84a3a'], tail: 'fork', dor: 'spiky', eye: 'big' }),
    N('phensoc', 'Cá phèn sọc', 'vinh', '', [12, 30], 1.3, { s: 'fish', h: .28, c: ['#e0c8a8', '#f8f0e0', '#e0a040'], tail: 'fork', dor: 'tall', bar: 2, pat: 'stripes', pc: 'rgba(230,160,60,.8)' }),
    N('sasung', 'Sá sùng', 'vinh', '', [10, 25], 0.4, { s: 'eel', c: ['#d8b89a', '#f4e8d8', '#c8a080'], short: 1, worm: 1 }),
    N('nham', 'Cá nhám', 'vinh', '', [40, 100], 0.8, { s: 'shark', c: ['#8a8070', '#e8e4d8', '#6a6050'], small: 1 }),
    N('gio', 'Cá giò', 'vinh', 'CUONG', [60, 180], 1.0, { s: 'fish', h: .2, c: ['#3a3a40', '#d8d8d4', '#2a2a30'], tail: 'fork', dor: 'low', band: '#e8e4d8', snout: 'blunt' }, 'Bám theo con nước lớn vào giữa vịnh.'),
    N('nguchu', 'Cá ngừ chù', 'vinh', 'NGAY', [25, 50], 1.6, { s: 'fish', h: .28, c: ['#2a4a6a', '#e0e8ee', '#2a3a5a'], tail: 'moon', dor: 'tall', finlet: 1, pat: 'wavy', pc: 'rgba(20,30,50,.5)' }, 'Đuổi đàn cá cơm giữa ban ngày.'),
    N('mucla', 'Mực lá', 'vinh', 'DEM', [20, 45], 0.9, { s: 'squid', c: ['#d8b8a8', '#f8ece4', '#b88a7a'], wide: 1 }, 'Đêm xuống, mực lá kéo về theo ánh đèn.'),
    N('tomtitbong', 'Tôm tít bông', 'vinh', 'trua', [10, 20], 1.0, { s: 'shrimp', c: ['#3aa86a', '#f0d0a0', '#e84a6a'], mantis: 1 }, 'Rực rỡ sắc màu, ló khỏi hang lúc giữa trưa.'),
    N('duoibong', 'Cá đuối bồng', 'vinh', 'NONG', [40, 120], 0.9, { s: 'ray', c: ['#8a7a6a', '#ece8e0', '#5a4a3a'], spots: 1 }, 'Vùi mình ở bãi cát khi nước rút.'),
    N('chimvang', 'Cá chim vây vàng', 'vinh', 'mua', [20, 50], 2.2, { s: 'fish', h: .54, c: ['#a8b0b8', '#f4f4f2', '#f0c040'], tail: 'fork', dor: 'tall', anal: 1 }, 'Trời mưa là ăn mồi hăng.'),
    N('nhong', 'Cá nhồng', 'vinh', 'hoanghon', [40, 150], 0.6, { s: 'fish', h: .14, c: ['#6a7a8a', '#eceef0', '#5a6a7a'], tail: 'fork', dor: 'low', pat: 'bars', snout: 'up' }, 'Lao vun vút đi săn lúc hoàng hôn.'),
    N('cam', 'Cá cam', 'vinh', 'suong', [40, 150], 1.1, { s: 'fish', h: .26, c: ['#7a8a7a', '#eef0e8', '#e0b040'], tail: 'moon', dor: 'low', band: '#e0b040' }, 'Bơi dưới lớp sương mờ giữa các đảo đá.'),
    N('munghe', 'Cá mú nghệ', 'vinh', 'DEM CUONG', [80, 250], 2.0, { s: 'fish', h: .36, c: ['#6a6a3a', '#d8d0a0', '#e0c040'], tail: 'round', dor: 'spiky', pat: 'blotch', pc: 'rgba(30,30,10,.5)', snout: 'up', glow: 1 }, 'Cá mú khổng lồ, chỉ rời hang đá khi triều cường về đêm.'),
    N('de', 'Cá đé', 'vinh', 'binhminh suong', [25, 50], 1.2, { s: 'fish', h: .3, c: ['#9aa8b8', '#f4f6f8', '#b8c4d0'], tail: 'fork', dor: 'tiny', anal: 1, pat: 'scales', glow: 1 }, 'Cá tiến vua, chỉ thấy trong sương lúc bình minh.'),
    N('cogon', 'Cá cờ gòn', 'vinh', 'NGAY giong', [150, 450], 0.7, { s: 'fish', h: .19, c: ['#1e2a3a', '#d0d8e0', '#1a2230'], tail: 'moon', dor: 'tall', snout: 'bill', glow: 1 }, 'Phóng khỏi mặt nước giữa cơn giông ban ngày.'),

    // ---------- VỰC BIỂN SÂU ----------
    N('denlong', 'Cá đèn lồng', 'sau', '', [4, 12], 1.0, { s: 'fish', h: .26, c: ['#2a3a5a', '#6a7a9a', '#1e2a44'], tail: 'fork', dor: 'tall', pat: 'dots', pc: '#8af0ff', eye: 'big' }),
    N('rangnanh', 'Cá răng nanh', 'sau', '', [8, 16], 2.6, { s: 'fish', h: .5, c: ['#2a2224', '#5a4a4a', '#1e1a1a'], tail: 'fork', dor: 'tall', head: 1.3, fangs: 1 }),
    N('riu', 'Cá rìu', 'sau', '', [3, 8], 2.0, { s: 'fish', h: .7, c: ['#9aa8b8', '#e8f0f8', '#7a8898'], tail: 'fork', dor: 'tiny', pat: 'dots', pc: '#8af0ff', glass: 1 }),
    N('duoichuot', 'Cá đuôi chuột', 'sau', '', [30, 80], 0.5, { s: 'fish', h: .2, c: ['#6a6a70', '#c8c8cc', '#5a5a60'], tail: 'point', dor: 'tall', anal: 1, eye: 'big', snout: 'up' }),
    N('rongbien', 'Cá rồng biển sâu', 'sau', '', [10, 40], 0.4, { s: 'fish', h: .14, c: ['#1e1e24', '#3a3a44', '#1a1a20'], tail: 'fork', dor: 'tiny', anal: 1, bar: 1, fangs: 1, pat: 'dots', pc: '#8af0ff' }),
    N('tomdo', 'Tôm đỏ biển sâu', 'sau', '', [8, 20], 1.0, { s: 'shrimp', c: ['#c82a2a', '#f08a7a', '#a81e1e'] }),
    N('mato', 'Cá mắt to', 'sau', '', [20, 50], 1.6, { s: 'fish', h: .38, c: ['#c84a3a', '#f8c0b0', '#b83a2a'], tail: 'fork', dor: 'spiky', anal: 1, eye: 'big' }),
    N('bonsau', 'Cá bơn sâu', 'sau', '', [20, 60], 1.0, { s: 'flat', c: ['#5a4a44', '#d8ccc4', '#3a2e2a'] }),
    N('cancau', 'Cá cần câu', 'sau', 'DEM', [10, 60], 3.0, { s: 'angler', c: ['#3a2e2a', '#6a5a50', '#2a201c'] }, 'Đèn mồi trên đầu sáng lên trong đêm tối.'),
    N('mucma', 'Mực ma cà rồng', 'sau', 'suong', [15, 30], 0.8, { s: 'octo', c: ['#6a1e2a', '#a84a5a', '#4a1018'], web: 1 }, 'Trồi lên từ vực khi biển phủ sương.'),
    N('dumbo', 'Bạch tuộc Dumbo', 'sau', 'NONG', [15, 30], 0.8, { s: 'octo', c: ['#e8a8a0', '#f8d8d0', '#c87a70'], ears: 1 }, 'Vẫy đôi tai khi nước biển hạ.'),
    N('maicheo', 'Cá mái chèo', 'sau', 'giong', [200, 800], 0.04, { s: 'eel', c: ['#c8ccd4', '#f0f2f4', '#e84a3a'], fin: 1, crest: 1 }, 'Sóng giông cuộn nó lên từ dưới sâu.'),
    N('yeutinh', 'Cá mập yêu tinh', 'sau', 'CUONG', [100, 300], 0.5, { s: 'shark', c: ['#c8a0a0', '#ecd8d4', '#a87a7a'], goblin: 1 }, 'Theo con nước lớn trồi lên từ vực.'),
    N('mangxep', 'Cá nhám mang xếp', 'sau', 'toi', [80, 200], 0.2, { s: 'eel', c: ['#5a4a3a', '#a8987a', '#3a2e24'], fin: 1, frill: 1 }, 'Lên gần mặt nước lúc chập tối.'),
    N('anhvuoc', 'Ốc anh vũ', 'sau', 'NGAY', [10, 25], 3.0, { s: 'nautilus', c: ['#f4ece0', '#c86a3a', '#a85a2a'] }, 'Nổi lên ban ngày rồi lại chìm xuống vực.'),
    N('cuanhen', 'Cua nhện', 'sau', 'mua', [20, 120], 0.6, { s: 'crab', c: ['#d8783a', '#f0c8a0', '#c85a2a'], long: 1 }, 'Chân dài nghêu ngao, bò lên khi mưa lớn.'),
    N('mucto', 'Mực khổng lồ', 'sau', 'DEM giong', [200, 900], 0.04, { s: 'squid', c: ['#c86a5a', '#f0c0b0', '#a84a3a'], giant: 1, glow: 1 }, 'Truyền thuyết của biển sâu, chỉ lên trong đêm giông.'),
    N('vaytay', 'Cá vây tay', 'sau', 'suong NONG', [100, 200], 1.0, { s: 'fish', h: .3, c: ['#3a4a6a', '#8a9ab8', '#2a3a5a'], tail: 'fan', dor: 'tall', anal: 1, pat: 'spots', pc: '#e8ecf4', glow: 1 }, 'Hóa thạch sống, hiện ra trong sương khi nước hạ.'),
    N('bonong', 'Cá chình bồ nông', 'sau', 'toi NONG', [40, 100], 0.2, { s: 'eel', c: ['#1e1e24', '#3a3a44', '#14141a'], gulper: 1 }, 'Há chiếc miệng khổng lồ lúc chập tối.')
  ]);
  SPECIES = SPECIES.concat(MORE);

  /* Một số loài vùng cũ cũng có ở vùng mở sau. */
  var ALSO = {"rodong": ["dam"], "chep": ["song", "dam", "nui"], "tre": ["song", "dam"], "rophi": ["song", "dam"], "loc": ["dam"], "me": ["song", "nui"], "lang": ["nui"], "tomcang": ["dam"], "luon": ["dam"], "sac": ["nui"], "cua": ["bien"], "dia": ["bien"], "mat": ["suoi"], "chien": ["suoi"], "anhvu": ["suoi"], "hoivan": ["suoi"], "bong": ["rung", "cuasong"], "chem": ["bien", "cuasong"], "doi": ["bien", "cuasong"], "keo": ["cuasong"], "tomsu": ["cuasong"], "bonglau": ["cuasong"], "he": ["ran"], "mu": ["ran", "vinh"], "noc": ["ran"], "bachtuoc": ["ran", "vinh"], "hong": ["vinh"], "thu": ["vinh"], "muc": ["vinh", "sau"], "sua": ["sau"], "kiem": ["sau"], "nuc": ["vinh"], "ghe": ["vinh"]};
  SPECIES.forEach(function (e) { e.also = ALSO[e.id] || []; });

  /* Rác và vật phẩm: reg là danh sách vùng có thể vớt được, rare = ít gặp. */
  function J(id, name, reg, a, rare, note) { return { id: id, name: name, reg: reg, r: 'rac', a: a, rare: !!rare, note: note || '' }; }
  var JUNK = [
    J('lon', 'Lon nước ngọt', ['ao', 'song', 'dam', 'nui', 'rung', 'bien', 'suoi', 'cuasong', 'ran', 'vinh', 'sau'], 'can'),
    J('chai', 'Chai nhựa', ['ao', 'song', 'dam', 'nui', 'rung', 'bien', 'suoi', 'cuasong', 'ran', 'vinh', 'sau'], 'bottle'),
    J('tui', 'Túi ni lông', ['ao', 'song', 'dam', 'rung', 'bien', 'cuasong', 'vinh'], 'bag'),
    J('dep', 'Dép tổ ong', ['ao', 'song', 'dam'], 'sandal'),
    J('non', 'Nón lá rách', ['ao', 'dam'], 'hat'),
    J('ung', 'Ủng cao su', ['song', 'nui', 'suoi'], 'boot'),
    J('lop', 'Lốp xe đạp', ['ao', 'song'], 'tire'),
    J('canh', 'Cành củi khô', ['ao', 'song', 'dam', 'nui', 'rung', 'suoi', 'cuasong'], 'branch'),
    J('o', 'Ô gãy', ['song', 'nui'], 'umbrella'),
    J('xo', 'Xô nhựa thủng', ['ao', 'rung'], 'bucket'),
    J('luoi', 'Lưới rách', ['rung', 'bien', 'cuasong', 'ran', 'vinh', 'sau'], 'net'),
    J('xop', 'Hộp xốp', ['song', 'rung', 'bien', 'cuasong', 'vinh'], 'foam'),
    J('neo', 'Mỏ neo gỉ', ['bien', 'vinh', 'sau'], 'anchor'),
    J('xu', 'Đồng xu cổ', ['song', 'nui', 'suoi', 'ran'], 'coin', 1, 'Ai đánh rơi từ thuở nào.'),
    J('hu', 'Hũ sành cổ', ['song', 'dam'], 'jar', 1, 'Bám đầy rong, chắc đã nằm dưới nước lâu lắm.'),
    J('thuchai', 'Chai có thư', ['bien', 'ran', 'sau'], 'letter', 1, 'Bên trong là một lá thư đã nhòe chữ.')
  ];

  var ALL = SPECIES.concat(JUNK), byId = {};
  ALL.forEach(function (e) { byId[e.id] = e; });

  function slotOf(hour) {
    var h = ((hour % 24) + 24) % 24;
    if (h < 5) h += 24;
    for (var i = 0; i < SLOTS.length; i++) if (h >= SLOTS[i].from && h < SLOTS[i].to) return SLOTS[i].id;
    return 'dem';
  }

  /* hàm băm số nguyên -> [0,1) */
  function hash(a, b) {
    var h = (a * 374761393 + b * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }
  /* Thời tiết đổi mỗi 3 giờ trong game, cố định theo (phút trong game, vùng): ai chơi cũng thấy giống nhau.
   * Sương mù chỉ có từ nửa đêm tới 9 giờ sáng và sau 21 giờ. */
  function weatherAt(minutes, regionId) {
    var block = Math.floor(minutes / 180), ri = 0;
    for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].id === regionId) ri = i;
    var wx = REGIONS[ri].wx, hb = block % 8, keys = ['nang', 'may', 'mua', 'suong', 'giong'], tot = 0, w = {};
    keys.forEach(function (k) {
      var v = wx[k];
      if (k === 'suong') v = (hb <= 2 || hb === 7) ? v * 2.2 : 0;
      w[k] = v; tot += v;
    });
    var r = hash(block, ri + 11) * tot;
    for (var j = 0; j < keys.length; j++) { r -= w[keys[j]]; if (r < 0) return keys[j]; }
    return 'nang';
  }

  /* Ban ngày từ bình minh tới hết hoàng hôn. */
  function dayOf(slot) { return slot === 'toi' || slot === 'dem' ? 'dem' : 'ngay'; }
  /* Con nước lên xuống theo chu kỳ 12,4 giờ trong game, lệch pha theo vùng. */
  function tideLevel(minutes, regionId) {
    var ri = 0;
    for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].id === regionId) ri = i;
    return Math.sin((minutes / 60 / 12.4 + hash(ri, 29)) * Math.PI * 2);
  }
  function tideAt(minutes, regionId) {
    var v = tideLevel(minutes, regionId);
    return v > .5 ? 'cuong' : v < -.5 ? 'nong' : 'vua';
  }
  /* Đếm số nhóm điều kiện (khung giờ, thời tiết, ngày/đêm, con nước) của loài và số nhóm đang đúng. */
  function condMatch(e, slot, wx, tide) {
    var all = 0, ok = 0;
    if (e.t) { all++; if (e.t.indexOf(slot) >= 0) ok++; }
    if (e.w) { all++; if (e.w.indexOf(wx) >= 0) ok++; }
    if (e.d) { all++; if (e.d === dayOf(slot)) ok++; }
    if (e.n) { all++; if (e.n === tide) ok++; }
    return { all: all, ok: ok };
  }
  function condOk(e, slot, wx, tide) { var m = condMatch(e, slot, wx, tide); return m.ok === m.all; }
  /* Các sinh vật/rác có thể cắn câu ở vùng này. Loài hiếm trái điều kiện vẫn có mặt, chỉ ít cắn hơn (xem rateOf). */
  function eligible(regionId) {
    var out = [];
    SPECIES.forEach(function (e) { if (e.reg === regionId || e.also.indexOf(regionId) >= 0) out.push(e); });
    JUNK.forEach(function (e) { if (e.reg.indexOf(regionId) >= 0) out.push(e); });
    return out;
  }
  /* Trọng số gốc của một sinh vật lúc này (chưa tính mồi): đúng điều kiện thì cắn nhiều, trái điều kiện thì hiếm hoi. */
  function rateOf(e, slot, wx, tide) {
    var R = RARITY[e.r];
    if (e.r === 'thuong' || e.r === 'rac') return R.w;
    var m = condMatch(e, slot, wx, tide);
    if (m.ok === m.all) return R.w;
    if (m.ok > 0 && R.half) return R.half;
    return R.off;
  }
  /* Chọn con cắn câu. found: sổ đã có (loài chưa có được ưu tiên nhẹ). rnd: hàm ngẫu nhiên. */
  function pick(regionId, slot, wx, found, rnd, bait, tide, mods) {
    rnd = rnd || Math.random;
    var B = BAITS[bait] || BAITS.giun;
    tide = tide || 'vua';
    var list = eligible(regionId), tot = 0, ws = [];
    var nJunk = 0; list.forEach(function (e) { if (e.r === 'rac') nJunk++; });
    list.forEach(function (e) {
      var w;
      if (e.r === 'rac') w = (e.rare ? 0.35 : 1) * 15 / Math.max(1, nJunk) * 0.1 * 10; // rác chiếm khoảng 12-15% số lần cắn
      else w = rateOf(e, slot, wx, tide) * (e.r === 'thuong' ? 1 : B.rare * (mods && mods.rare || 1));
      if (e.r === 'rac') w *= B.junk;
      if (found && !found[e.id]) w *= e.r === 'rac' ? 1.2 : 1.5;
      ws.push(w); tot += w;
    });
    var r = rnd() * tot;
    for (var i = 0; i < list.length; i++) { r -= ws[i]; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }
  /* Kích cỡ một con: phần lớn nhỏ, thỉnh thoảng (4%) gặp con cỡ lớn. Trả về { cm, kg, q (0..1 vị trí trong khoảng) } */
  function roll(e, rnd, bait, mods) {
    rnd = rnd || Math.random;
    var B = BAITS[bait] || BAITS.giun, sz = B.size * (mods && mods.size || 1);
    if (e.r === 'rac') return { cm: 0, kg: 0, q: 0 };
    var q = rnd() < 0.04 * sz ? 0.85 + rnd() * 0.15 : Math.pow(rnd(), 1.6 / sz);
    var cm = e.cm[0] + (e.cm[1] - e.cm[0]) * q;
    cm = cm < 10 ? Math.round(cm * 10) / 10 : Math.round(cm);
    var kg = e.k * cm * cm * cm * 1e-5;
    kg = kg < 1 ? Math.round(kg * 1000) / 1000 : kg < 100 ? Math.round(kg * 10) / 10 : Math.round(kg);
    return { cm: cm, kg: kg, q: q };
  }
  /* Tốc độ kim (độ/giây): cá càng to kim càng nhanh. */
  function speedOf(e, cm) {
    if (e.r === 'rac') return 70;
    var sz = Math.max(0, Math.min(1, (Math.log(cm) - Math.log(5)) / (Math.log(300) - Math.log(5))));
    var q = (cm - e.cm[0]) / Math.max(1, e.cm[1] - e.cm[0]);
    return 80 + 110 * sz + 20 * Math.max(0, Math.min(1, q));
  }
  /* Bề rộng điểm vàng (độ): cá càng hiếm điểm vàng càng bé. */
  function zoneOf(e) { return RARITY[e.r].zone; }
  /* Mồi câu: size làm cá to hơn, rare tăng cơ hội loài hiếm, junk bớt rác. pack: số mồi mỗi gói. */
  var BAITS = {
    giun: { name: 'Giun đất', size: 1, rare: 1, junk: 1, price: 0, pack: 0, desc: 'Mồi thường, dùng mãi không hết.' },
    tom: { name: 'Mồi tôm', size: 1.7, rare: 1, junk: .7, price: 60, pack: 10, desc: 'Cá to cắn nhiều hơn.' },
    cam: { name: 'Cám thơm', size: 1, rare: 2, junk: .6, price: 100, pack: 10, desc: 'Dễ gặp loài hiếm và hiếm có hơn.' },
    vang: { name: 'Mồi vàng', size: 2, rare: 2.8, junk: .3, price: 260, pack: 5, desc: 'Vừa cá to vừa cá hiếm.' }
  };
  /* Giá bán (xu): theo độ hiếm, cỡ của loài và cỡ của con này. */
  var BASE = { thuong: 6, hiem: 26, hiemco: 110, rac: 1 };
  function price(e, cm, mods) {
    if (e.r === 'rac') return 1 + (mods && mods.junk || 0);
    var q = Math.max(0, Math.min(1, (cm - e.cm[0]) / Math.max(1, e.cm[1] - e.cm[0])));
    var cls = Math.max(.7, Math.min(2.4, 1 + Math.log(e.cm[1] / 20) / 2.2));
    return Math.max(1, Math.round(BASE[e.r] * cls * (.6 + 1.4 * q)));
  }
  /* Đồ trang trí bể cá */
  var DECOS = [
    { id: 'soi', name: 'Đá cuội', price: 30 }, { id: 'rong', name: 'Rong xanh', price: 40 }, { id: 'cat', name: 'Cát trắng', price: 60 },
    { id: 'suc', name: 'Máy sục khí', price: 80 }, { id: 'sanho', name: 'San hô', price: 120 }, { id: 'den', name: 'Đèn bể', price: 150 },
    { id: 'ruong', name: 'Rương báu', price: 260 }, { id: 'laudai', name: 'Lâu đài', price: 300 }, { id: 'tuong', name: 'Tượng cá chép', price: 400 },
    { id: 'thuyen', name: 'Thuyền đắm', price: 500 }
  ];
  var TANK = { start: 3, max: 15, cost: function (slots) { return Math.round(80 * Math.pow(1.25, slots - 3) / 10) * 10; } };
  var ENERGY = { max: 60, regenMs: 5 * 60 * 1000, drink: { name: 'Nước tăng lực', gain: 30, price: 90, cap: 120 } };

  /* Năng lực: nâng bằng xu. Cấp 0 = chỉ số gốc của game. cost(lv) là giá nâng từ cấp lv lên lv+1. */
  function upCost(base, grow) { return function (lv) { return Math.round(base * Math.pow(grow, lv) / 10) * 10; }; }
  var UPGRADES = [
    { id: 'nl', name: 'Giới hạn năng lượng', icon: 'drink', max: 10, cost: upCost(80, 1.3),
      val: function (lv) { return ENERGY.max + 6 * lv; }, text: function (v) { return v + ' năng lượng tối đa'; }, per: '+6 năng lượng tối đa mỗi cấp' },
    { id: 'hoi', name: 'Tốc độ hồi năng lượng', icon: 'clock', max: 8, cost: upCost(80, 1.4),
      val: function (lv) { return Math.round(ENERGY.regenMs * (1 - 0.06 * lv)); }, text: function (v) { var t = Math.round(v / 1000); return '1 năng lượng mỗi ' + Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60); }, per: 'hồi nhanh hơn 6% mỗi cấp' },
    { id: 'kt', name: 'Tăng kích thước cá', icon: 'tom', max: 10, cost: upCost(90, 1.32),
      val: function (lv) { return 1 + 0.12 * lv; }, text: function (v) { return 'cá to hơn, hệ số ×' + v.toFixed(2); }, per: 'dễ câu cá cỡ lớn, bán được giá hơn' },
    { id: 'hiem', name: 'Tăng tỉ lệ câu cá hiếm', icon: 'cam', max: 10, cost: upCost(120, 1.34),
      val: function (lv) { return 1 + 0.15 * lv; }, text: function (v) { return 'loài hiếm cắn nhiều hơn ×' + v.toFixed(2); }, per: 'cộng dồn với mồi Cám thơm và Mồi vàng' },
    { id: 'rac', name: 'Tăng giá bán rác', icon: 'foam', max: 6, cost: upCost(50, 1.5),
      val: function (lv) { return 1 + 2 * lv; }, text: function (v) { return 'rác bán ' + v + ' xu mỗi món'; }, per: '+2 xu mỗi món rác' }
  ];
  var UPBYID = {}; UPGRADES.forEach(function (u) { UPBYID[u.id] = u; });
  /* Từ bảng cấp (up: {nl, hoi, kt, hiem, rac}) ra các hệ số dùng cho pick, roll, price. */
  function upMods(up) {
    up = up || {};
    return { size: UPBYID.kt.val(up.kt | 0), rare: UPBYID.hiem.val(up.hiem | 0), junk: 2 * (up.rac | 0) };
  }
  function energyMax(up) { return UPBYID.nl.val((up || {}).nl | 0); }
  function regenMs(up) { return UPBYID.hoi.val((up || {}).hoi | 0); }
  /* Nước tăng lực được nạp vượt mức tối đa thêm 60. */
  function drinkCap(up) { return energyMax(up) + 60; }
  function points(found) {
    var p = 0;
    for (var id in found) if (byId[id]) p += RARITY[byId[id].r].pts;
    return p;
  }

  root.CC = { SLOTS: SLOTS, WEATHER: WEATHER, DAYNIGHT: DAYNIGHT, TIDES: TIDES, dayOf: dayOf, tideAt: tideAt, tideLevel: tideLevel, RARITY: RARITY, REGIONS: REGIONS, SPECIES: SPECIES, JUNK: JUNK, ALL: ALL, byId: byId,
    BAITS: BAITS, UPGRADES: UPGRADES, UPBYID: UPBYID, upMods: upMods, energyMax: energyMax, regenMs: regenMs, drinkCap: drinkCap, DECOS: DECOS, TANK: TANK, ENERGY: ENERGY, price: price,
    slotOf: slotOf, weatherAt: weatherAt, eligible: eligible, condOk: condOk, rateOf: rateOf, pick: pick, roll: roll, speedOf: speedOf, zoneOf: zoneOf, points: points, hash: hash };
})(typeof window !== 'undefined' ? window : globalThis);
