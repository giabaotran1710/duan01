// Tia số - 8 màn làm tay. par (số ô ít nhất) do tool/tiaso-solver.js kiểm.
(function (root) {
  'use strict';
  const L = [
    { name: 'Phép tính đầu tiên', hint: 'Đặt một ô lên đường tia. Tia đi qua ô nào thì con số đổi theo ô đó.',
      map: [',,,,,', 'A...B', ',,,,,'],
      ents: { A: { t: 'src', d: 'R', v: 3 }, B: { t: 'tgt', v: 5 } },
      tray: ['+2', '*2'], par: 1 },
    { name: 'Gương', hint: 'Gương bẻ tia sang ngang. Đích nằm ở góc khác, hãy bẻ tia về phía nó.',
      map: [',,,,B,', ',,,,.,', 'A.....', ',,,,,,'],
      ents: { A: { t: 'src', d: 'R', v: 4 }, B: { t: 'tgt', v: 12 } },
      tray: ['/', '*3', '+6'], par: 2 },
    { name: 'Thứ tự', hint: 'Cùng hai ô, đổi chỗ cho nhau là ra số khác. Tính ngược từ đích về đèn.',
      map: [',,,,,,', 'A....B', ',,,,,,'],
      ents: { A: { t: 'src', d: 'R', v: 3 }, B: { t: 'tgt', v: 15 } },
      tray: ['*3', '+2', '-1'], par: 2 },
    { name: 'Chia cẩn thận', hint: 'Chia ra số lẻ thì tia tắt. Làm cho số chia hết trước đã.',
      map: ['A...#,', '##,.#,', ',,,..B'],
      ents: { A: { t: 'src', d: 'R', v: 7 }, B: { t: 'tgt', v: 4 } },
      tray: ['\\', '\\', '/2', '+1', '*2'], par: 4 },
    { name: 'Tách tia', hint: 'Ô tách chia tia làm hai nhánh sang hai bên, cùng một con số.',
      map: [',,,B,', ',,,.,', 'A...#', ',,,.,', ',,,C,'],
      ents: { A: { t: 'src', d: 'R', v: 6 }, B: { t: 'tgt', v: 12 }, C: { t: 'tgt', v: 3 } },
      tray: ['split', '*2', '/2', '+3'], par: 3 },
    { name: 'Hợp tia', hint: 'Ô hợp chờ đủ hai tia rồi cộng lại thành một tia đi tiếp.',
      map: [',,/..\\,', ',,.,,.,', 'A,o,,MB', ',,.,,.,', ',,\\../,'],
      ents: { A: { t: 'src', d: 'R', v: 4 }, M: { t: 'merge', d: 'R' }, B: { t: 'tgt', v: 20 } },
      tray: ['*3', '+4', '-1'], par: 2 },
    { name: 'Ngã tư', hint: 'Hai tia cắt nhau ở giữa. Ô đặt ở ngã tư đổi số của cả hai tia.',
      map: [',,C,,', ',,.,,', 'A...T', ',,.,,', ',,U,,'],
      ents: { A: { t: 'src', d: 'R', v: 2 }, C: { t: 'src', d: 'D', v: 5 }, T: { t: 'tgt', v: 49 }, U: { t: 'tgt', v: 64 } },
      tray: ['sq', '+5', '+3', '*2'], par: 3 },
    { name: 'Đảo ngược', hint: 'Ô ⇄ đọc ngược con số: 19 thành 91. Một tia phải nuôi hai đích.',
      map: [',,,T,,', 'A....#', ',,,.,,', ',,,.,,', ',,,U,,'],
      ents: { A: { t: 'src', d: 'R', v: 14 }, T: { t: 'tgt', v: 91 }, U: { t: 'tgt', v: 182 } },
      tray: ['split', 'rev', '+5', '*2', '/2', '-1'], par: 4 }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
  else root.TIASO_LEVELS = L;
})(this);
