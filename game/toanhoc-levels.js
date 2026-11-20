// Trò chơi toán học - các màn nhập môn làm tay. tool/toanhoc-check.js kiểm mỗi màn đều có lời giải.
(function (root) {
  'use strict';
  const L = [
    { name: 'Phép tính đầu tiên', hint: 'Chọn một thẻ trong khay rồi chạm vào ô trống. Con số đổi theo thẻ bạn đặt.',
      start: 3, steps: [{ op: null, n: null }], tray: ['+2', '*2'], target: 5 },
    { name: 'Thứ tự', hint: 'Cùng hai thẻ, đổi chỗ cho nhau là ra số khác. Chuỗi tính lần lượt từ trái sang phải.',
      start: 3, steps: [{ op: null, n: null }, { op: null, n: null }], tray: ['*3', '+2'], target: 15 },
    { name: 'Tính ngược', hint: 'Bí thì tính ngược từ đáp án: số nào nhân 2 ra 12?',
      start: 5, steps: [{ op: null, n: null }, { op: null, n: null }, { op: null, n: null }], tray: ['*2', '+4', '-3'], target: 12 },
    { name: 'Chia hết', hint: 'Chia không hết thì chuỗi đứt. Làm cho số chia hết trước đã.',
      start: 7, steps: [{ op: null, n: null }, { op: null, n: null }, { op: null, n: null }], tray: ['/3', '+2', '*4'], target: 12 },
    { name: 'Điền số', hint: 'Lần này phép tính có sẵn, bạn chỉ đặt con số. Ô đầu tiên cũng là ô trống.',
      start: null, steps: [{ op: '*', n: null }, { op: '-', n: null }], tray: ['4', '2', '5'], target: 18 },
    { name: 'Thẻ thừa', hint: 'Khay có một thẻ không dùng tới. Chỉ cần lấp kín các ô trống.',
      start: 6, steps: [{ op: null, n: null }, { op: '+', n: null }, { op: null, n: null }], tray: ['/2', '*3', '5', '7'], target: 24 },
    { name: 'Tổng hợp', hint: 'Đủ cả thẻ số lẫn thẻ phép tính. Bạn đã sẵn sàng leo bậc!',
      start: null, steps: [{ op: '+', n: null }, { op: null, n: null }, { op: '-', n: null }, { op: null, n: null }], tray: ['3', '6', '4', '*5', '/2', '-1'], target: 10 }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
  else root.TOANHOC_LEVELS = L;
})(this);
