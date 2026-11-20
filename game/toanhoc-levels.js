// Trò chơi toán học - các màn nhập môn làm tay. tool/toanhoc-check.js kiểm mỗi màn đều có lời giải.
// Tính theo thứ tự phép tính: nhân chia trước, cộng trừ sau.
(function (root) {
  'use strict';
  const L = [
    { name: 'Phép tính đầu tiên', hint: 'Chọn một thẻ trong khay rồi chạm vào toa trống. Con số đổi theo thẻ bạn đặt.',
      start: 3, steps: [{ op: null, n: null }], tray: ['+2', '*2'], target: 5 },
    { name: 'Nhân chia trước', hint: 'Nhân chia luôn tính trước cộng trừ: 4 + 2 × 3 là 4 + 6 = 10, không phải 18.',
      start: 4, steps: [{ op: null, n: null }, { op: null, n: null }], tray: ['+2', '*3'], target: 10 },
    { name: 'Cộng trừ lần lượt', hint: 'Cộng trừ cùng bậc thì tính từ trái sang phải, còn nhân chia vẫn tính trước.',
      start: 5, steps: [{ op: null, n: null }, { op: null, n: null }, { op: null, n: null }], tray: ['*2', '+4', '-3'], target: 11 },
    { name: 'Chia hết', hint: 'Chia không hết thì chuỗi đứt. Thử xem thẻ nào chia hết cho số đầu.',
      start: 8, steps: [{ op: null, n: null }, { op: null, n: null }, { op: null, n: null }], tray: ['/4', '+3', '*2'], target: 8 },
    { name: 'Điền số', hint: 'Lần này phép tính có sẵn, bạn chỉ đặt con số. Toa đầu tiên cũng là toa trống.',
      start: null, steps: [{ op: '*', n: null }, { op: '-', n: null }], tray: ['4', '2', '5'], target: 18 },
    { name: 'Thẻ thừa', hint: 'Khay có một thẻ không dùng tới. Chỉ cần lấp kín các toa trống.',
      start: 6, steps: [{ op: null, n: null }, { op: '+', n: null }, { op: null, n: null }], tray: ['/2', '*3', '5', '7'], target: 18 },
    { name: 'Tổng hợp', hint: 'Đủ cả thẻ số lẫn thẻ phép tính, lại có thẻ thừa. Bạn đã sẵn sàng leo bậc!',
      start: null, steps: [{ op: '+', n: null }, { op: null, n: null }, { op: '-', n: null }, { op: null, n: null }], tray: ['3', '6', '4', '*5', '/2', '-1'], target: 12 }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
  else root.TOANHOC_LEVELS = L;
})(this);
