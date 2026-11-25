/* Câu cá - dữ liệu: vùng câu, sinh vật, rác, khung giờ, thời tiết, cách chọn con cắn câu.
 * window.CC = { SLOTS, WEATHER, REGIONS, SPECIES, JUNK, ALL, byId, slotOf, weatherAt, eligible, pick, roll, speedOf, zoneOf, points }
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
    { id: 'dem', name: 'Ban đêm', from: 22, to: 29 }
  ];
  var WEATHER = {
    nang: { name: 'Nắng', night: 'Trời quang' },
    may: { name: 'Nhiều mây' },
    mua: { name: 'Mưa' },
    suong: { name: 'Sương mù' },
    giong: { name: 'Giông' }
  };
  var RARITY = {
    thuong: { name: 'Thường gặp', w: 10, zone: 30, pts: 1 },
    hiem: { name: 'Hiếm', w: 4, zone: 20, pts: 3 },
    hiemco: { name: 'Hiếm có', w: 2.6, zone: 14, pts: 6 },
    rac: { name: 'Rác', w: 1, zone: 38, pts: 1 }
  };

  /* need: số sinh vật cần có trong sổ để mở vùng. wx: trọng số thời tiết của vùng. */
  var REGIONS = [
    { id: 'ao', name: 'Ao làng', water: 'ngot', need: 0, wx: { nang: 46, may: 30, mua: 16, suong: 8, giong: 4 } },
    { id: 'song', name: 'Sông quê', water: 'ngot', need: 5, wx: { nang: 40, may: 30, mua: 18, suong: 10, giong: 9 } },
    { id: 'dam', name: 'Đầm sen', water: 'ngot', need: 12, wx: { nang: 48, may: 26, mua: 14, suong: 12, giong: 4 } },
    { id: 'nui', name: 'Hồ trên núi', water: 'ngot', need: 20, wx: { nang: 34, may: 30, mua: 14, suong: 22, giong: 4 } },
    { id: 'rung', name: 'Rừng ngập mặn', water: 'man', need: 28, wx: { nang: 38, may: 28, mua: 22, suong: 10, giong: 6 } },
    { id: 'bien', name: 'Biển khơi', water: 'man', need: 36, wx: { nang: 42, may: 28, mua: 14, suong: 10, giong: 12 } }
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

  /* Một số loài vùng cũ cũng có ở vùng mở sau. */
  var ALSO = {"rodong": ["dam"], "chep": ["song", "dam", "nui"], "tre": ["song", "dam"], "rophi": ["song", "dam"], "loc": ["dam"], "me": ["song", "nui"], "bong": ["rung"], "lang": ["nui"], "tomcang": ["dam"], "luon": ["dam"], "sac": ["nui"], "doi": ["bien"], "chem": ["bien"], "cua": ["bien"], "dia": ["bien"]};
  SPECIES.forEach(function (e) { e.also = ALSO[e.id] || []; });

  /* Rác và vật phẩm: reg là danh sách vùng có thể vớt được, rare = ít gặp. */
  function J(id, name, reg, a, rare, note) { return { id: id, name: name, reg: reg, r: 'rac', a: a, rare: !!rare, note: note || '' }; }
  var JUNK = [
    J('lon', 'Lon nước ngọt', ['ao', 'song', 'dam', 'nui', 'rung', 'bien'], 'can'),
    J('chai', 'Chai nhựa', ['ao', 'song', 'dam', 'nui', 'rung', 'bien'], 'bottle'),
    J('tui', 'Túi ni lông', ['ao', 'song', 'dam', 'rung', 'bien'], 'bag'),
    J('dep', 'Dép tổ ong', ['ao', 'song', 'dam'], 'sandal'),
    J('non', 'Nón lá rách', ['ao', 'dam'], 'hat'),
    J('ung', 'Ủng cao su', ['song', 'nui'], 'boot'),
    J('lop', 'Lốp xe đạp', ['ao', 'song'], 'tire'),
    J('canh', 'Cành củi khô', ['ao', 'song', 'dam', 'nui', 'rung'], 'branch'),
    J('o', 'Ô gãy', ['song', 'nui'], 'umbrella'),
    J('xo', 'Xô nhựa thủng', ['ao', 'rung'], 'bucket'),
    J('luoi', 'Lưới rách', ['rung', 'bien'], 'net'),
    J('xop', 'Hộp xốp', ['song', 'rung', 'bien'], 'foam'),
    J('neo', 'Mỏ neo gỉ', ['bien'], 'anchor'),
    J('xu', 'Đồng xu cổ', ['song', 'nui'], 'coin', 1, 'Ai đánh rơi từ thuở nào.'),
    J('hu', 'Hũ sành cổ', ['song', 'dam'], 'jar', 1, 'Bám đầy rong, chắc đã nằm dưới nước lâu lắm.'),
    J('thuchai', 'Chai có thư', ['bien'], 'letter', 1, 'Bên trong là một lá thư đã nhòe chữ.')
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

  function condOk(e, slot, wx) {
    if (e.t && e.t.indexOf(slot) < 0) return false;
    if (e.w && e.w.indexOf(wx) < 0) return false;
    return true;
  }
  /* các sinh vật/rác có thể cắn câu ở vùng này, lúc này */
  function eligible(regionId, slot, wx) {
    var out = [];
    SPECIES.forEach(function (e) { if ((e.reg === regionId || e.also.indexOf(regionId) >= 0) && condOk(e, slot, wx)) out.push(e); });
    JUNK.forEach(function (e) { if (e.reg.indexOf(regionId) >= 0) out.push(e); });
    return out;
  }
  /* Chọn con cắn câu. found: sổ đã có (loài chưa có được ưu tiên nhẹ). rnd: hàm ngẫu nhiên. */
  function pick(regionId, slot, wx, found, rnd, bait) {
    rnd = rnd || Math.random;
    var B = BAITS[bait] || BAITS.giun;
    var list = eligible(regionId, slot, wx), tot = 0, ws = [];
    var nJunk = 0; list.forEach(function (e) { if (e.r === 'rac') nJunk++; });
    list.forEach(function (e) {
      var w;
      if (e.r === 'rac') w = (e.rare ? 0.35 : 1) * 15 / Math.max(1, nJunk) * 0.1 * 10; // rác chiếm khoảng 12-15% số lần cắn
      else w = RARITY[e.r].w * (e.r === 'thuong' ? 1 : B.rare);
      if (e.r === 'rac') w *= B.junk;
      if (found && !found[e.id]) w *= e.r === 'rac' ? 1.2 : 1.5;
      ws.push(w); tot += w;
    });
    var r = rnd() * tot;
    for (var i = 0; i < list.length; i++) { r -= ws[i]; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }
  /* Kích cỡ một con: phần lớn nhỏ, thỉnh thoảng (4%) gặp con cỡ lớn. Trả về { cm, kg, q (0..1 vị trí trong khoảng) } */
  function roll(e, rnd, bait) {
    rnd = rnd || Math.random;
    var B = BAITS[bait] || BAITS.giun;
    if (e.r === 'rac') return { cm: 0, kg: 0, q: 0 };
    var q = rnd() < 0.04 * B.size ? 0.85 + rnd() * 0.15 : Math.pow(rnd(), 1.6 / B.size);
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
  function price(e, cm) {
    if (e.r === 'rac') return 1;
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
  function points(found) {
    var p = 0;
    for (var id in found) if (byId[id]) p += RARITY[byId[id].r].pts;
    return p;
  }

  root.CC = { SLOTS: SLOTS, WEATHER: WEATHER, RARITY: RARITY, REGIONS: REGIONS, SPECIES: SPECIES, JUNK: JUNK, ALL: ALL, byId: byId,
    BAITS: BAITS, DECOS: DECOS, TANK: TANK, ENERGY: ENERGY, price: price,
    slotOf: slotOf, weatherAt: weatherAt, eligible: eligible, pick: pick, roll: roll, speedOf: speedOf, zoneOf: zoneOf, points: points, hash: hash };
})(typeof window !== 'undefined' ? window : globalThis);
