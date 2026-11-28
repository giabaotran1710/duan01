# Bảng chọn tiếng riêng cho từng game. Mỗi game một tệp audio/sfx/<game>.mp3 + <game>.json.
# Đường dẫn tương đối với thư mục chứa các bộ âm đã giải nén (xem NGUON.txt để biết nơi tải).
# Mỗi mục: 'đường/dẫn' hoặc ('đường/dẫn', {'off': giây bắt đầu, 'len': độ dài tối đa, 'db': chỉnh to nhỏ}).
UI   = 'x/kenney_interfaceSounds/Audio/'
CAS  = 'x/kenney_casino-audio/Audio/'
RPG  = 'x/RPGsounds_Kenney/OGG/'
J    = 'x/jingleSounds_Kenney/OGG/'
WM   = 'x/100-CC0-wood-metal-SFX/'
S1   = 'x/100-CC0-SFX_0/'
S2   = 'x2/sfx_100_v2/sfx100v2_'
R80  = 'x2/80-CC0-RPG-SFX_0/'
BFH  = 'x/sfx_breaking_and_falling/bfh1_'
WAT  = 'x/water-splash-slime-sfx/'
SCI  = 'x/sci-fi_sounds/Audio/'
DIG  = 'x/Digital_SFX_Set/'
RS   = 'x/50-CC0-retro-synth-SFX/'
BANG = 'x/25-CC0-bang-sfx/'
SW   = 'x/swishes/swishes/swish-'
MS   = 'x/MoreSounds/'
AV   = 'x2/25_sounds_from_avalanche_minigame/'
WOB  = 'x2/boardgame_piece_wobbles/boardgame piece wobbles/wobble0'
BR   = 'x2/bricks_3/bricks/Brick '
CARD = 'x2/Cardsounds/cockatrice/'
PEN  = 'x/pencil/ogg/'
BOOK = 'x/book_flips_-_starninjas/book_flip.'
LOOSE= 'x2/loose/'
FSH  = 'x/fisheefects/'
R5   = 'x/512/The Essential Retro Video Game Sound Effects Collection [512 sounds] By Juhani Junkala/'
G5   = R5 + 'General Sounds/'

def jw(s): return J + 'jingles_' + s.rstrip('0123456789') + '/jingles_' + s + '.ogg'

BANKS = {
  # Cờ Caro: vẽ X/O bằng bút chì lên giấy
  'caro': {
    'place': [(PEN+'pencil_write.ogg', {'off': .02, 'len': .26}), (PEN+'pencil_write.ogg', {'off': .55, 'len': .24}), (PEN+'pencil_write.ogg', {'off': 1.0, 'len': .26})],
    'undo':  [(PEN+'pencil_erase.ogg', {'off': .55, 'len': .32})],
    'win':   [jw('HIT11')], 'lose': [jw('HIT09')], 'level': [jw('HIT02')],
  },
  # Cờ đam: quân gỗ trượt trên bàn, ăn quân thì gõ đôi, phong vua
  'codam': {
    'select':  [WM+'wood_hit_06.ogg', WM+'wood_hit_09.ogg'],
    'move':    [WM+'wood_hit_01.ogg', WM+'wood_hit_04.ogg', WM+'wood_hit_07.ogg'],
    'capture': [WM+'wood_slam_01.ogg', WM+'wood_slam_04.ogg', BFH+'wood_hit_02.ogg'],
    'level':   [S1+'bell_02.ogg'],
    'win':     [jw('HIT15')], 'lose': [jw('HIT05')],
  },
  # Cờ gánh: quân đá cuội trên bàn gỗ, gánh/vây lật quân, thắng có tiếng cồng
  'conganh': {
    'select': [R80+'item_stone_02.ogg', R80+'item_stone_04.ogg'],
    'move':   [R80+'stones_04.ogg', (R80+'stones_01.ogg', {'len': .35}), R80+'item_stone_03.ogg'],
    'flip':   [(R80+'stones_02.ogg', {'len': .5}), (R80+'stones_03.ogg', {'len': .55})],
    'undo':   [WM+'wood_misc_08.ogg'],
    'win':    [(S1+'gong_01.ogg', {'len': 1.4})], 'lose': [jw('PIZZA14')], 'level': [jw('PIZZA03')],
  },
  # Cờ thú: quân thú nhảy, ăn quân có tiếng con thú
  'cothu': {
    'select':  [(WOB+'4.ogg', {'off': .12, 'len': .2})],
    'move':    [WM+'wood_hit_02.ogg', WM+'wood_hit_08.ogg', WM+'wood_hit_03.ogg'],
    'capture': [R80+'creature_misc_01.ogg', R80+'creature_misc_07.ogg', R80+'creature_misc_08.ogg'],
    'whoosh':  [SW+'3.wav', SW+'7.wav'],
    'bump':    [UI+'error_006.ogg'],
    'win':     [jw('HIT04')], 'lose': [jw('PIZZA01')],
  },
  # Ngăn cản đến đích: quân gỗ đi, đặt thanh chắn gỗ
  'barricade': {
    'place': [WM+'wood_close_01.ogg', WM+'wood_close_02.ogg'],
    'move':  [WM+'wood_misc_05.ogg', WM+'wood_misc_02.ogg', WM+'wood_misc_08.ogg'],
    'bump':  [UI+'error_002.ogg'],
    'win':   [(LOOSE+'fanfare_3.ogg', {'len': 1.6})], 'lose': [LOOSE+'losetrumpet.ogg'],
  },
  # Chặn cua: thả đá xuống bãi cát, cua bò lạch cạch, nhạc trống thép bãi biển
  'chancua': {
    'place': [R80+'item_stone_02.ogg', R80+'item_stone_04.ogg', R80+'stones_04.ogg'],
    'tick':  ['x/UI_SFX_Set/click1.wav', 'x/UI_SFX_Set/click3.wav'],
    'win':   [jw('STEEL02')], 'lose': [jw('STEEL01')],
  },
  # Đua xúc xắc bãi biển: xúc xắc gỗ, quân nhảy, sóng vỗ, trống thép
  'duaxucxac': {
    'dice':   [CAS+'dice-shake-1.ogg', CAS+'dice-throw-2.ogg'],
    'place':  [LOOSE+'Holzw%C3%BCrfel_auf_Holztisch_2.flac'],
    'tap':    [(WOB+'4.ogg', {'off': .12, 'len': .2}), (WOB+'5.ogg', {'off': .0, 'len': .2})],
    'whoosh': [(WAT+'splash_02.ogg', {'len': .6})],
    'bad':    [UI+'error_004.ogg'],
    'win':    [jw('STEEL10')], 'lose': [jw('STEEL06')],
  },
  # Bida: bi va bi, băng đệm, bi rơi lỗ; nhạc sax kiểu quán bida
  'bida': {
    'clack': [S1+'hit_01.ogg', S1+'hit_02.ogg', BR+'07.wav'],
    'bump':  [BFH+'hit_02.ogg', BFH+'hit_07.ogg'],
    'place': [R80+'item_stone_04.ogg'],
    'win':   [jw('SAX02')], 'lose': [jw('SAX01')], 'level': [jw('SAX13')],
  },
  # Nhảy! Nhảy và nhảy!: tiếng nhảy 8-bit, đáp xuống, đồng xu khi nhảy chuẩn
  'blockjump': {
    'jump':  [R5+'Movement/Jumping and Landing/sfx_movement_jump13.wav', R5+'Movement/Jumping and Landing/sfx_movement_jump15.wav'],
    'place': [R5+'Movement/Jumping and Landing/sfx_movement_jump13_landing.wav', R5+'Movement/Jumping and Landing/sfx_movement_jump15_landing.wav'],
    'coin':  [G5+'Coins/sfx_coin_single1.wav'],
    'bump':  [G5+'Impacts/sfx_sounds_impact3.wav'],
    'lose':  [(R5+'Movement/Falling Sounds/sfx_sounds_falling3.wav', {'len': .9})],
  },
  # Điều khiển giao lộ: xe đâm, còi CSGT khi lên mức, phanh gấp, cảnh báo
  'dieukhiengiaolo': {
    'boom':   [(BFH+'metal_falling_02.ogg', {'len': 1.0}), (BFH+'glass_breaking_02.ogg', {'len': 1.0})],
    'level':  [G5+'Weird Sounds/sfx_sound_refereewhistle.wav'],
    'bump':   [UI+'error_007.ogg'],
    'whoosh': [(SW+'10.wav', {'db': -2}), SW+'12.wav'],
    'warn':   [R5+'Movement/Vehicles/sfx_vehicle_breaks.wav'],
    'lose':   [(G5+'Negative Sounds/sfx_sounds_negative1.wav', {'len': 1.3})],
  },
  # Bắn phá virus: virus vỡ nhầy, trúng đạn, nổ, tăng sức mạnh (8-bit)
  'dungsidietvirus': {
    'pop':   [WAT+'slime_01.ogg', WAT+'slime_02.ogg', WAT+'slime_04.ogg'],
    'pick':  [RS+'power_up_04.ogg'],
    'hit':   [G5+'Simple Damage Sounds/sfx_damage_hit2.wav'],
    'coin':  [G5+'Coins/sfx_coin_double1.wav'],
    'boom':  [(R5+'Explosions/Medium Length/sfx_exp_medium4.wav', {'len': 1.0})],
    'level': [G5+'Fanfares/sfx_sounds_fanfare1.wav'],
    'lose':  [DIG+'zapThreeToneDown.mp3'],
  },
  # Ghép tranh: mảnh tranh gỗ trượt, mảnh vào đúng chỗ kêu trong, xong tranh
  'gheptranh': {
    'move': [WM+'wood_misc_02.ogg', WM+'wood_misc_05.ogg'],
    'pick': [R80+'item_gem_01.ogg', R80+'item_gem_03.ogg'],
    'win':  [jw('PIZZA02')],
  },
  # Ghi nhớ Emoji: lật thẻ, đồng hồ, đúng/sai nhẹ
  'ghinho': {
    'whoosh': [CAS+'card-fan-1.ogg', CAS+'card-slide-5.ogg'],
    'tick':   [UI+'tick_002.ogg'],
    'ok':     [UI+'pluck_001.ogg', UI+'pluck_002.ogg'],
    'bad':    [UI+'error_005.ogg'],
    'win':    [jw('PIZZA16')],
  },
  # Hứng bi: bi thủy tinh lách cách, rơi vỡ
  'hungbi': {
    'whoosh': [(R5+'Movement/Falling Sounds/sfx_sounds_falling1.wav', {'len': .5, 'db': -4})],
    'pick':   [UI+'glass_002.ogg', UI+'glass_003.ogg', UI+'glass_006.ogg'],
    'level':  [UI+'glass_004.ogg'],
    'bad':    [(BFH+'glass_breaking_01.ogg', {'len': .6})],
    'win':    [jw('PIZZA10')], 'lose': [jw('PIZZA11')],
  },
  # Khinh khí cầu: va chạm là bóng nổ rồi rơi, cột mốc độ cao là tiếng chuông
  'khinhkhicau': {
    'hit':    ['x/misc/balloon_pop.ogg'],
    'whoosh': [(R5+'Movement/Falling Sounds/sfx_sounds_falling3.wav', {'len': .8, 'db': -3})],
    'coin':   [S1+'bell_02.ogg'],
    'lose':   [jw('NES07')],
  },
  # Neon Reflex: tiếng điện tử neon, thua là tắt nguồn
  'neon-reflex': {
    'ok':   [G5+'Simple Bleeps/sfx_sounds_Blip7.wav', G5+'Simple Bleeps/sfx_sounds_Blip9.wav'],
    'bad':  [G5+'Negative Sounds/sfx_sounds_error10.wav'],
    'lose': [(G5+'Weird Sounds/sfx_sound_shutdown1.wav', {'len': 1.4})],
  },
  # Nhớ đồ vật: kéo rèm/che, đúng/sai, qua vòng
  'nhodovat': {
    'whoosh': [(RPG+'cloth3.ogg'), (RPG+'cloth4.ogg')],
    'ok':     [UI+'confirmation_002.ogg'],
    'bad':    [UI+'error_003.ogg'],
    'level':  [jw('PIZZA04')], 'lose': [jw('PIZZA05')],
  },
  # Phá gạch: bóng chạm ván, gạch nứt, gạch vỡ, đồng xu (8-bit)
  'phagach': {
    'bump':  [G5+'Impacts/sfx_sounds_impact1.wav'],
    'tap':   [G5+'Simple Bleeps/sfx_sounds_Blip2.wav'],
    'pop':   [R5+'Explosions/Shortest/sfx_exp_shortest_soft1.wav', R5+'Explosions/Shortest/sfx_exp_shortest_soft3.wav', R5+'Explosions/Shortest/sfx_exp_shortest_soft5.wav'],
    'coin':  [G5+'Coins/sfx_coin_single3.wav'],
    'level': [G5+'Fanfares/sfx_sounds_fanfare2.wav'],
    'lose':  [jw('NES11')],
  },
  # Siêu đuổi bắt: nổ, bị bắt, thua (8-bit)
  'sieuduoibat': {
    'boom': [(R5+'Explosions/Short/sfx_exp_short_hard2.wav', {'len': .9})],
    'hit':  [G5+'Simple Damage Sounds/sfx_damage_hit5.wav'],
    'lose': [jw('NES04')],
  },
  # Sudoku: lật trang, viết số bằng bút chì, tẩy, xong bảng
  'sudoku': {
    'whoosh': [(BOOK+'4.ogg', {'off': .1, 'len': .5})],
    'place':  [(PEN+'pencil_write.ogg', {'off': .25, 'len': .16}), (PEN+'pencil_write.ogg', {'off': .75, 'len': .16})],
    'undo':   [(PEN+'pencil_erase.ogg', {'off': .55, 'len': .25})],
    'ok':     [UI+'confirmation_004.ogg'],
    'bad':    [UI+'error_001.ogg'],
    'win':    [(LOOSE+'win-176035.mp3', {'len': 1.4})],
  },
  # Tìm ô chữ: chọn ô chữ, tìm đúng từ, gợi ý
  'timochu': {
    'tap':  ['x/UI_SFX_Set/switch3.wav'],
    'ok':   [UI+'maximize_006.ogg'],
    'bad':  [UI+'error_008.ogg'],
    'pop':  [S1+'bell_02.ogg'],
    'win':  [jw('PIZZA12')], 'lose': [jw('PIZZA09')],
  },
  # Trốn khỏi thiên thạch: không gian, thiên thạch va, nổ lớn, phụt động cơ
  'tronkhoithienthach': {
    'boom': [(SCI+'explosionCrunch_000.ogg', {'len': 1.0}), (SCI+'explosionCrunch_002.ogg', {'len': 1.0})],
    'hit':  [SCI+'impactMetal_000.ogg', SCI+'impactMetal_002.ogg'],
    'coin': [DIG+'powerUp2.mp3', DIG+'powerUp7.mp3'],
    'jump': [(SCI+'thrusterFire_000.ogg', {'len': .4})],
    'lose': [(DIG+'lowDown.mp3')],
  },
  # Trượt băng: trượt trên băng, va tảng băng, nhạc chuông xe tuần lộc
  'truotbang': {
    'bump':   [AV+'Character/hit0.ogg', AV+'Character/step_solid.ogg'],
    'whoosh': [AV+'Character/woosh0.ogg', AV+'Character/woosh1.ogg', AV+'Character/woosh2.ogg'],
    'undo':   [UI+'back_003.ogg'],
    'win':    [AV+'Misc/jingle.ogg'],
  },
  # Truy tìm số: chạm đúng số, sai số
  'truytimso': {
    'pop':  [UI+'drop_001.ogg', UI+'drop_004.ogg'],
    'bump': [UI+'error_006.ogg'],
    'win':  [jw('HIT10')], 'lose': [G5+'Negative Sounds/sfx_sounds_negative2.wav'],
  },
  # UNO!: bài thật - đặt bài, rút bài, xáo bài, đóng dấu UNO
  'uno': {
    'flip':   [CAS+'card-place-1.ogg', CAS+'card-place-3.ogg'],
    'deal':   [CAS+'card-slide-1.ogg', CAS+'card-slide-3.ogg', CAS+'card-slide-7.ogg'],
    'whoosh': [(CAS+'card-shuffle.ogg', {'off': .1, 'len': .9})],
    'pop':    [CAS+'chips-stack-2.ogg'],
    'level':  [S1+'slam_02.ogg'],
    'win':    [jw('HIT15')], 'lose': [jw('HIT03')],
  },
  # Võ đài thẻ: thẻ bài, binh lính, gươm, tên bay, đại bác, cổng sắt, trống kèn
  'vodaithe': {
    'select': [CAS+'card-slide-2.ogg'],
    'place':  [RPG+'dropLeather.ogg', R80+'item_wood_02.ogg'],
    'deal':   [CAS+'card-place-2.ogg', CAS+'card-place-4.ogg'],
    'bump':   [UI+'error_002.ogg'],
    'level':  [(S1+'gong_02.ogg', {'len': 1.0})],
    'hit':    [R80+'blade_01.ogg', R80+'blade_02.ogg', G5+'../Weapons/Melee/sfx_wpn_punch2.wav'],
    'splash': [WAT+'splash_03.ogg'],
    'whoosh': [SW+'1.wav'],
    'flip':   [CAS+'card-fan-2.ogg'],
    'shoot':  [SW+'5.wav', SW+'8.wav'],
    'boom':   [(BANG+'cannon_01.ogg', {'len': 1.0})],
    'gate':   [(WM+'metal_close_01.ogg', {'len': .7})],
    'pop':    [RPG+'metalClick.ogg'],
    'win':    [(LOOSE+'fanfare_4.ogg', {'len': 1.6})], 'lose': [LOOSE+'losetrumpet.ogg'],
  },
  # Ghép từ: chữ cái gỗ kiểu Scrabble
  'wordgame': {
    'place': [R80+'item_wood_02.ogg', R80+'item_wood_03.ogg', WM+'wood_hit_05.ogg'],
    'pop':   [UI+'maximize_003.ogg'],
    'undo':  [WM+'wood_misc_08.ogg'],
    'ok':    [UI+'confirmation_001.ogg'],
    'bad':   [UI+'error_005.ogg'],
  },
  # Câu cá: vung cần, mồi rơi tõm xuống nước, phao bị kéo, cá quẫy lên khỏi mặt nước, nhạc steel drum
  'cauca': {
    'whoosh': [(SW+'3.wav', {'db': -4}), (SW+'7.wav', {'db': -4})],
    'splash': [(WAT+'splash_09.ogg', {'len': .4}), (WAT+'splash_10.ogg', {'len': .35})],
    'pop':    [(WAT+'bubble_02.ogg', {'len': .35, 'db': -4}), (FSH+'bloop.wav', {'len': .4, 'db': -4})],
    'hit':    [(WAT+'splash_08.ogg', {'len': .55})],
    'tick':   [(FSH+'reel.wav', {'off': .2, 'len': .45, 'db': -6})],
    'ok':     [(WAT+'splash_06.ogg', {'len': .45}), (WAT+'splash_14.ogg', {'len': .5})],
    'bad':    [(FSH+'uhoh.wav', {'len': 1.0, 'db': -3})],
    'pick':   [WM+'metal_hit_02.ogg', R80+'item_wood_01.ogg'],
    'flip':   [RPG+'bookFlip1.ogg', RPG+'bookFlip2.ogg'],
    'select': [(UI+'click_002.ogg', {'db': -3})],
    'move':   [RPG+'cloth2.ogg'],
    'coin':   [jw('STEEL09')], 'level': [jw('STEEL07')], 'win': [jw('STEEL01')],
  },
  # Bowling: bóng lăn ù trên ván gỗ, ki gỗ va lách cách, đổ ầm khi Strike, nhạc dàn nhạc HIT
  'bowling': {
    'roll':   [('gen/bowling_roll.wav', {'len': 2.6, 'db': -2})],
    'shoot':  [(SW+'3.wav', {'db': -5}), (SW+'7.wav', {'db': -5})],
    'hit':    [WM+'wood_slam_01.ogg', WM+'wood_slam_04.ogg', BFH+'wood_hit_03.ogg'],
    'clack':  [WM+'wood_hit_01.ogg', WM+'wood_hit_04.ogg', WM+'wood_hit_06.ogg', WM+'wood_hit_09.ogg', BFH+'wood_hit_01.ogg'],
    'boom':   [(BFH+'falling_04.ogg', {'len': 1.1}), (BFH+'falling_07.ogg', {'len': 1.1})],
    'bump':   [WM+'wood_misc_05.ogg', WM+'wood_close_02.ogg'],
    'bad':    [(WM+'wood_falling_04.ogg', {'db': -4})],
    'move':   [(WM+'wood_squeak_01.ogg', {'len': .45, 'db': -6})],
    'select': [(WM+'wood_hit_07.ogg', {'db': -6})],
    'ok':     [jw('HIT02')], 'level': [jw('HIT07')], 'win': [jw('HIT11')], 'lose': [jw('HIT09')],
  },
}
