/* =====================================================
   DOM REFERENCES
===================================================== */
const canvas=document.getElementById("gameCanvas");
const ctx=canvas.getContext("2d");

const loadingScreen=document.getElementById("loadingScreen");

const diceClickArea=document.getElementById("diceWrap");
const diceWrap=document.getElementById("diceWrap");
const dice=document.getElementById("dice");

const restartBtn=document.getElementById("restartBtn");

const playerCardCount=document.getElementById("playerCardCount");
const playerShieldCount=document.getElementById("playerShieldCount");
const aiCardCount=document.getElementById("aiCardCount");
const aiShieldCount=document.getElementById("aiShieldCount");

const turnText=document.getElementById("turnText");
const message=document.getElementById("message");

const endModal=document.getElementById("endModal");
const endTitle=document.getElementById("endTitle");
const endText=document.getElementById("endText");

const playerStatCard=document.getElementById("playerStatCard");
const aiStatCard=document.getElementById("aiStatCard");

const inventoryModal=document.getElementById("inventoryModal");
const inventoryTitle=document.getElementById("inventoryTitle");
const inventorySub=document.getElementById("inventorySub");
const inventoryList=document.getElementById("inventoryList");
const closeInventoryBtn=document.getElementById("closeInventoryBtn");

/* =====================================================
   CORE STATE
===================================================== */
let openedInventoryOwner=null;

let W=0;
let H=0;
let DPR=1;

let board={
  x:0,
  y:0,
  size:0,
  cell:0
};

const state={
  turn:"player",
  busy:false,
  gameOver:false,
  particles:[],
  confetti:[]
};

const tokens={
  player:{
    name:"Bạn",
    pos:0,
    x:0,
    y:1,
    color:"#0998ff",
    dark:"#045cae",
    label:"BẠN",
    phase:0,
    animating:false
  },

  ai:{
    name:"AI",
    pos:0,
    x:0,
    y:1,
    color:"#ff6b35",
    dark:"#a83212",
    label:"AI",
    phase:1.5,
    animating:false
  }
};

const itemState={
  player:{
    inventory:[],
    shields:1,
    completedTurns:0
  },

  ai:{
    inventory:[],
    shields:1,
    completedTurns:0
  }
};

const cardDeckState={
  availableIds:[],
  usedIds:[]
};

const itemRuntime={
  player:{
    forceNextRollValue:null,
    forceNextRollParity:null,
    limitNextRollValues:null,
    rollTwiceNext:false,
    skipRollTurns:0,
    invisibleTurns:0,
    blockFinishTurns:0,
    towerFloors:0,
    trapJailTurns:0
  },

  ai:{
    forceNextRollValue:null,
    forceNextRollParity:null,
    limitNextRollValues:null,
    rollTwiceNext:false,
    skipRollTurns:0,
    invisibleTurns:0,
    blockFinishTurns:0,
    towerFloors:0,
    trapJailTurns:0
  }
};

const boardFlags=[];
const boardTraps=[];
const TRAP_JAIL_TURNS=2;

/* =====================================================
   CONSTANT MAPS
===================================================== */
const pipMap={
  1:["mid"],
  2:["tl","br"],
  3:["tl","mid","br"],
  4:["tl","tr","bl","br"],
  5:["tl","tr","mid","bl","br"],
  6:["tl","tr","ml","mr","bl","br"]
};

const AI_ITEM_USE_THRESHOLD=75;

/* =====================================================
   HELPERS
===================================================== */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

