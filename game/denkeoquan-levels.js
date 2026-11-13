// Đèn kéo quân - các màn chương 1 (Đèn ông sao). par: số bóng và tổng bước của lời giải tốt nhất (kiểm bằng tool/denkeoquan-solver.js).
(function (root) {
  'use strict';
  const LEVELS = [
    { name: 'Bước đầu', loop: 12, maxShadows: 0, par: { shadows: 0, steps: 8 },
      tip: 'Vuốt hoặc bấm mũi tên để đi. Tới vầng trăng là qua màn.',
      map: [
        '#######',
        '#S....#',
        '####..#',
        '#E....#',
        '#######'] },
    { name: 'Bệ và cửa', loop: 12, maxShadows: 0, par: { shadows: 0, steps: 10 },
      tip: 'Đứng trên bệ thì cửa cùng màu mở. Bước khỏi bệ là cửa đóng, trừ khi có người đang đứng trong cửa.',
      map: [
        '#######',
        '#S...a#',
        '#####A#',
        '#E....#',
        '#######'] },
    { name: 'Quay đèn', loop: 8, maxShadows: 1, par: { shadows: 1, steps: 6 },
      tip: 'Bệ quá xa cửa. Hãy đi lên bệ rồi bấm Quay đèn: vòng sau, bóng của bạn sẽ đứng giữ bệ.',
      map: [
        '#######',
        '#a#E###',
        '#.#A###',
        '#S....#',
        '#######'] },
    { name: 'Một bóng hai việc', loop: 12, maxShadows: 1, par: { shadows: 1, steps: 18 },
      tip: 'Chỉ có một bóng mà hai cửa. Bóng giữ cửa đỏ cho bạn qua, rồi đi tiếp sang bệ xanh.',
      map: [
        '#######',
        '#S.A..#',
        '#.###.#',
        '#a#b#.#',
        '#.#.#B#',
        '#...#E#',
        '#######'] },
    { name: 'Chờ đúng nhịp', loop: 14, maxShadows: 1, par: { shadows: 1, steps: 20 },
      tip: 'Có lúc phải đứng chờ. Bấm giữ dải bóng để xem bóng sẽ đi đâu ở từng bước.',
      map: [
        '#########',
        '#a.S....#',
        '#.#####.#',
        '#.#EB.A.#',
        '#b#######',
        '#########'] },
    { name: 'Va cửa', loop: 16, maxShadows: 1, par: { shadows: 1, steps: 20 },
      tip: 'Bóng lặp lại cả những lần bạn va vào cửa đóng. Vòng sau, nếu cửa mở đúng lúc, bóng sẽ đi qua.',
      map: [
        '########',
        '#bA.a#E#',
        '###.##B#',
        '#S.....#',
        '########'] },
    { name: 'Ván mục', loop: 10, maxShadows: 1, par: { shadows: 1, steps: 15 },
      tip: 'Ván mục chỉ chịu một người: bước khỏi là sụp. Bóng và bạn không đi chung lối tắt được.',
      map: [
        '########',
        '######E#',
        '######.#',
        '#S##..A#',
        '#.~.a..#',
        '#......#',
        '########'] },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
  else root.DKQ_LEVELS = LEVELS;
})(this);
