/* =========================================================
   BEACH DICE RACE - CUSTOM ITEM CATALOG
   File: items.js
   Tác giả ý tưởng thẻ: Bảo

   Ghi chú:
   - File này chỉ chứa dữ liệu thẻ.
   - Logic thực thi sẽ nằm trong file game chính.
   - Thẻ bất lợi có:
     harmful: true
     shieldable: true
========================================================= */

(function(){
  "use strict";

  const ITEM_GROUP = {
    ADVANTAGE: "advantage",
    DISADVANTAGE: "disadvantage"
  };

  const ITEM_TIMING = {
    INSTANT: "instant",
    TURN_START: "turnStart",
    BEFORE_ROLL: "beforeRoll",
    AFTER_ROLL: "afterRoll",
    BEFORE_MOVE: "beforeMove",
    AFTER_MOVE: "afterMove",
    NEXT_ROLL: "nextRoll",
    NEXT_TURN: "nextTurn",
    PASSIVE: "passive"
  };

  const ITEM_TARGET = {
    SELF: "self",
    OPPONENT: "opponent",
    BOARD_CELL: "boardCell",
    BOTH: "both"
  };

  const ITEM_RARITY = {
    COMMON: "common",
    RARE: "rare",
    EPIC: "epic",
    LEGENDARY: "legendary"
  };

  const ITEM_CATALOG = {};

  function addItem(item){
    ITEM_CATALOG[item.id] = item;
  }

  function createBaseItem({
    no,
    id,
    name,
    icon,
    group,
    rarity = ITEM_RARITY.COMMON,
    timing,
    target,
    desc,
    harmful = false,
    shieldable = false,
    effect
  }){
    return {
      no,
      id,
      name,
      icon,
      group,
      rarity,
      timing,
      target,
      desc,
      harmful,
      shieldable,
      effect
    };
  }

  /* =====================================================
     NHÓM LỢI THẾ
     Thẻ 1 - 14
  ===================================================== */

  // Thẻ 1-6: Tiến 1/2/3/4/5/6 bước
  for(let step = 1; step <= 6; step++){
  addItem(createBaseItem({
    no: step,
    id: `adv_move_${step}`,
    name: `Tiến ${step} Bước`,
    icon: "👣",
    group: ITEM_GROUP.ADVANTAGE,
    rarity: step <= 3 ? ITEM_RARITY.COMMON : ITEM_RARITY.RARE,
    timing: ITEM_TIMING.INSTANT,
    target: ITEM_TARGET.SELF,
    desc: `Tiến ngay ${step} bước.`,
    effect: {
      type: "move_self_steps",
      steps: step
    }
  }));
}
  // Thẻ 7: Lần đổ xúc xắc sau sẽ là số chẵn
  addItem(createBaseItem({
    no: 7,
    id: "adv_next_roll_even",
    name: "Xúc Xắc Chẵn",
    icon: "🎲",
    group: ITEM_GROUP.ADVANTAGE,
    rarity: ITEM_RARITY.RARE,
    timing: ITEM_TIMING.NEXT_ROLL,
    target: ITEM_TARGET.SELF,
    desc: "Lần đổ xúc xắc sau của bạn chắc chắn ra số chẵn.",
    effect: {
      type: "force_next_roll_parity",
      parity: "even",
      owner: "self"
    }
  }));

  // Thẻ 8: Lần đổ xúc xắc sau sẽ là số lẻ
  addItem(createBaseItem({
    no: 8,
    id: "adv_next_roll_odd",
    name: "Xúc Xắc Lẻ",
    icon: "🎲",
    group: ITEM_GROUP.ADVANTAGE,
    rarity: ITEM_RARITY.RARE,
    timing: ITEM_TIMING.NEXT_ROLL,
    target: ITEM_TARGET.SELF,
    desc: "Lần đổ xúc xắc sau của bạn chắc chắn ra số lẻ.",
    effect: {
      type: "force_next_roll_parity",
      parity: "odd",
      owner: "self"
    }
  }));

  // Thẻ 9: Tiến 10 bước, lượt sau không thể tung xúc xắc
  addItem(createBaseItem({
    no: 9,
    id: "adv_dash_10_skip_next",
    name: "Bứt Tốc 10 Bước",
    icon: "🚀",
    group: ITEM_GROUP.ADVANTAGE,
    rarity: ITEM_RARITY.EPIC,
    timing: ITEM_TIMING.INSTANT,
    target: ITEM_TARGET.SELF,
    desc: "Tiến ngay 10 bước, nhưng sẽ bị mất lượt.",
    effect: {
      type: "move_self_and_skip_next_turn",
      steps: 10,
      skipTurns: 1
    }
  }));

  // Thẻ 10: Chỉ đổ ra 1/2/3 nút cho lượt này
  addItem(createBaseItem({
    no: 10,
    id: "adv_roll_low_this_turn",
    name: "Xúc Xắc Nhỏ",
    icon: "🎲",
    group: ITEM_GROUP.ADVANTAGE,
    rarity: ITEM_RARITY.COMMON,
    timing: ITEM_TIMING.BEFORE_ROLL,
    target: ITEM_TARGET.SELF,
    desc: "Lượt này bạn chỉ đổ ra 1, 2 hoặc 3 nút.",
    effect: {
      type: "limit_roll_values_this_turn",
      values: [1, 2, 3],
      owner: "self"
    }
  }));

  // Thẻ 11: Chỉ đổ ra 4/5/6 nút cho lượt này
  addItem(createBaseItem({
    no: 11,
    id: "adv_roll_high_this_turn",
    name: "Xúc Xắc Lớn",
    icon: "🎲",
    group: ITEM_GROUP.ADVANTAGE,
    rarity: ITEM_RARITY.RARE,
    timing: ITEM_TIMING.BEFORE_ROLL,
    target: ITEM_TARGET.SELF,
    desc: "Lượt này bạn chỉ đổ ra 4, 5 hoặc 6 nút.",
    effect: {
      type: "limit_roll_values_this_turn",
      values: [4, 5, 6],
      owner: "self"
    }
  }));

  // Thẻ 12: Được tung 2 lần xúc xắc
  addItem(createBaseItem({
    no: 12,
    id: "adv_double_roll",
    name: "Tung Hai Lần",
    icon: "🎲×2",
    group: ITEM_GROUP.ADVANTAGE,
    rarity: ITEM_RARITY.EPIC,
    timing: ITEM_TIMING.BEFORE_ROLL,
    target: ITEM_TARGET.SELF,
    desc: "Lượt này bạn được tung xúc xắc 2 lần.",
    effect: {
      type: "roll_twice_this_turn",
      rolls: 2,
      mode: "sum"
    }
  }));

  // Thẻ 13: Leo lên một tầng tháp
  addItem(createBaseItem({
    no: 13,
    id: "adv_tower_up_1",
    name: "Leo Tầng Tháp",
    icon: "🗼",
    group: ITEM_GROUP.ADVANTAGE,
    rarity: ITEM_RARITY.EPIC,
    timing: ITEM_TIMING.INSTANT,
    target: ITEM_TARGET.SELF,
    desc: "Leo lên 1 tầng tháp.",
    effect: {
      type: "tower_up",
      floors: 1
    }
  }));

  // Thẻ 14: Tàng hình trong 3 lượt
  addItem(createBaseItem({
    no: 14,
    id: "adv_invisible_3_turns",
    name: "Tàng Hình",
    icon: "👻",
    group: ITEM_GROUP.ADVANTAGE,
    rarity: ITEM_RARITY.LEGENDARY,
    timing: ITEM_TIMING.INSTANT,
    target: ITEM_TARGET.SELF,
    desc: "Tàng hình trong 3 lượt. Đối thủ không thấy bạn và không thể gây hiệu ứng xấu lên bạn.",
    effect: {
      type: "add_status",
      status: "invisible",
      turns: 3,
      blocksNegativeEffects: true,
      hideFromOpponent: true
    }
  }));

  /* =====================================================
     NHÓM BẤT LỢI
     Thẻ 15 - 33
  ===================================================== */

  // Thẻ 15: Làm đối thủ đang tàng hình bị lộ diện
  addItem(createBaseItem({
    no: 15,
    id: "bad_reveal_invisible",
    name: "Lộ Diện",
    icon: "👁️",
    group: ITEM_GROUP.DISADVANTAGE,
    rarity: ITEM_RARITY.RARE,
    timing: ITEM_TIMING.INSTANT,
    target: ITEM_TARGET.OPPONENT,
    desc: "Làm đối thủ đang tàng hình bị lộ diện.",
    harmful: true,
    shieldable: true,
    effect: {
      type: "remove_status",
      status: "invisible",
      targetOwner: "opponent"
    }
  }));

  // Thẻ 16-21: Buộc đối thủ lùi 1/2/3/4/5/6 bước
  for(let back = 1; back <= 6; back++){
    addItem(createBaseItem({
      no: 15 + back,
      id: `bad_opponent_back_${back}`,
      name: `Đẩy Lùi ${back} Bước`,
      icon: "↩️",
      group: ITEM_GROUP.DISADVANTAGE,
      rarity: back <= 3 ? ITEM_RARITY.COMMON : ITEM_RARITY.RARE,
      timing: ITEM_TIMING.INSTANT,
      target: ITEM_TARGET.OPPONENT,
      desc: `Buộc đối thủ lùi ngay ${back} bước.`,
      harmful: true,
      shieldable: true,
      effect: {
        type: "move_opponent_steps",
        steps: -back
      }
    }));
  }

  // Thẻ 22-27: Khiến xúc xắc đối phương đổ ra 1/2/3/4/5/6 trong lượt tiếp theo
  for(let diceValue = 1; diceValue <= 6; diceValue++){
    addItem(createBaseItem({
      no: 21 + diceValue,
      id: `bad_force_opponent_next_roll_${diceValue}`,
      name: `Ép Xúc Xắc ${diceValue}`,
      icon: "🔗",
      group: ITEM_GROUP.DISADVANTAGE,
      rarity: diceValue <= 3 ? ITEM_RARITY.RARE : ITEM_RARITY.EPIC,
      timing: ITEM_TIMING.NEXT_ROLL,
      target: ITEM_TARGET.OPPONENT,
      desc: `Lượt tiếp theo, xúc xắc của đối thủ sẽ ra ${diceValue}.`,
      harmful: true,
      shieldable: true,
      effect: {
        type: "force_next_roll_value",
        value: diceValue,
        owner: "opponent"
      }
    }));
  }

  // Thẻ 28: Khiến đối thủ chỉ tung ra số lẻ trong lượt kế
  addItem(createBaseItem({
    no: 28,
    id: "bad_opponent_next_roll_odd",
    name: "Ép Xúc Xắc Lẻ",
    icon: "🎲",
    group: ITEM_GROUP.DISADVANTAGE,
    rarity: ITEM_RARITY.RARE,
    timing: ITEM_TIMING.NEXT_ROLL,
    target: ITEM_TARGET.OPPONENT,
    desc: "Lượt kế tiếp, đối thủ chỉ tung ra số lẻ.",
    harmful: true,
    shieldable: true,
    effect: {
      type: "force_next_roll_parity",
      parity: "odd",
      owner: "opponent"
    }
  }));

  // Thẻ 29: Khiến đối thủ chỉ tung ra số chẵn trong lượt kế
  addItem(createBaseItem({
    no: 29,
    id: "bad_opponent_next_roll_even",
    name: "Ép Xúc Xắc Chẵn",
    icon: "🎲",
    group: ITEM_GROUP.DISADVANTAGE,
    rarity: ITEM_RARITY.RARE,
    timing: ITEM_TIMING.NEXT_ROLL,
    target: ITEM_TARGET.OPPONENT,
    desc: "Lượt kế tiếp, đối thủ chỉ tung ra số chẵn.",
    harmful: true,
    shieldable: true,
    effect: {
      type: "force_next_roll_parity",
      parity: "even",
      owner: "opponent"
    }
  }));

  // Thẻ 30: Cắm cờ - khiến đối thủ đi đến ô đó phải dừng lại
  addItem(createBaseItem({
    no: 30,
    id: "bad_stop_flag",
    name: "Cắm Cờ Chặn Đường",
    icon: "🚩",
    group: ITEM_GROUP.DISADVANTAGE,
    rarity: ITEM_RARITY.EPIC,
    timing: ITEM_TIMING.INSTANT,
    target: ITEM_TARGET.BOARD_CELL,
    desc: "Chọn một ô để cắm cờ. Khi đối thủ đi đến ô đó, đối thủ phải dừng lại.",
    harmful: true,
    shieldable: true,
    effect: {
      type: "place_stop_flag",
      targetOwner: "opponent",
      requiresCellSelection: true,
      stopWhenPassing: true,
      consumeAfterTrigger: true
    }
  }));

  // Thẻ 31: Cấm đối thủ tung xúc xắc vào lượt sau
  addItem(createBaseItem({
    no: 31,
    id: "bad_opponent_skip_roll",
    name: "Cấm Tung Xúc Xắc",
    icon: "🚫",
    group: ITEM_GROUP.DISADVANTAGE,
    rarity: ITEM_RARITY.EPIC,
    timing: ITEM_TIMING.INSTANT,
    target: ITEM_TARGET.OPPONENT,
    desc: "Cấm đối thủ tung xúc xắc vào lượt sau.",
    harmful: true,
    shieldable: true,
    effect: {
      type: "skip_next_roll",
      targetOwner: "opponent",
      turns: 1
    }
  }));

  // Thẻ 32: Cấm đối thủ về đích
  addItem(createBaseItem({
    no: 32,
    id: "bad_block_finish",
    name: "Khóa Vạch Đích",
    icon: "🔒",
    group: ITEM_GROUP.DISADVANTAGE,
    rarity: ITEM_RARITY.LEGENDARY,
    timing: ITEM_TIMING.INSTANT,
    target: ITEM_TARGET.OPPONENT,
    desc: "Lượt sau, nếu đối thủ đổ đúng số để về đích hoặc dùng item để về đích, việc về đích sẽ bị chặn.",
    harmful: true,
    shieldable: true,
    effect: {
      type: "block_finish_next_turn",
      targetOwner: "opponent",
      turns: 1,
      blockDiceFinish: true,
      blockItemFinish: true
    }
  }));

  // Thẻ 33: Đổi chỗ giữa bạn và đối thủ
  addItem(createBaseItem({
    no: 33,
    id: "bad_swap_position",
    name: "Đổi Chỗ",
    icon: "🔄",
    group: ITEM_GROUP.DISADVANTAGE,
    rarity: ITEM_RARITY.LEGENDARY,
    timing: ITEM_TIMING.INSTANT,
    target: ITEM_TARGET.BOTH,
    desc: "Đổi vị trí giữa bạn và đối thủ.",
    harmful: true,
    shieldable: true,
    effect: {
      type: "swap_positions",
      selfOwner: "self",
      targetOwner: "opponent"
    }
  }));

  /* =====================================================
     HELPER FUNCTIONS
  ===================================================== */

  function getAllItems(){
    return Object.values(ITEM_CATALOG).sort((a,b) => a.no - b.no);
  }

  function getItemById(id){
    return ITEM_CATALOG[id] || null;
  }

  function getItemsByGroup(group){
    return getAllItems().filter(item => item.group === group);
  }

  function getAdvantageItems(){
    return getItemsByGroup(ITEM_GROUP.ADVANTAGE);
  }

  function getDisadvantageItems(){
    return getItemsByGroup(ITEM_GROUP.DISADVANTAGE);
  }

  function getItemsByTiming(timing){
    return getAllItems().filter(item => item.timing === timing);
  }

  function createInventoryItem(itemId){
    const item = getItemById(itemId);

    if(!item) return null;

    return {
      uid: "item_" + Date.now() + "_" + Math.floor(Math.random() * 999999),
      id: item.id,
      no: item.no,
      name: item.name,
      icon: item.icon,
      group: item.group,
      rarity: item.rarity,
      timing: item.timing,
      target: item.target,
      desc: item.desc,
      harmful: item.harmful,
      shieldable: item.shieldable,
      effect: structuredCloneSafe(item.effect)
    };
  }

  function drawRandomItem(options = {}){
    const {
      group = null,
      timing = null,
      excludeIds = []
    } = options;

    let pool = getAllItems();

    if(group){
      pool = pool.filter(item => item.group === group);
    }

    if(timing){
      pool = pool.filter(item => item.timing === timing);
    }

    if(Array.isArray(excludeIds) && excludeIds.length > 0){
      pool = pool.filter(item => !excludeIds.includes(item.id));
    }

    if(pool.length === 0) return null;

    const item = pool[Math.floor(Math.random() * pool.length)];
    return createInventoryItem(item.id);
  }

  function structuredCloneSafe(data){
    if(typeof structuredClone === "function"){
      return structuredClone(data);
    }

    return JSON.parse(JSON.stringify(data));
  }

  window.BeachItemDB = {
    ITEM_GROUP,
    ITEM_TIMING,
    ITEM_TARGET,
    ITEM_RARITY,
    ITEM_CATALOG,

    getAllItems,
    getItemById,
    getItemsByGroup,
    getAdvantageItems,
    getDisadvantageItems,
    getItemsByTiming,
    createInventoryItem,
    drawRandomItem
  };
console.log("item.js đã tải xong:", getAllItems().length, "thẻ", window.BeachItemDB);
})();

