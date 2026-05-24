/* =====================================================
   GAME CARD - DECK / INVENTORY / CARD EFFECT UI
===================================================== */

function initCardDeck(){
  if(!window.BeachItemDB){
    console.error("Chưa tìm thấy BeachItemDB. Hãy nhúng item.js trước script game chính.");
    cardDeckState.availableIds=[];
    cardDeckState.usedIds=[];
    return;
  }

  cardDeckState.availableIds=BeachItemDB
    .getAllItems()
    .map(item=>item.id);

  cardDeckState.usedIds=[];
}

function drawUniqueCard(){
  if(cardDeckState.availableIds.length<=0){
    return null;
  }

  const randomIndex=Math.floor(Math.random()*cardDeckState.availableIds.length);
  const itemId=cardDeckState.availableIds.splice(randomIndex,1)[0];

  cardDeckState.usedIds.push(itemId);

  return BeachItemDB.createInventoryItem(itemId);
}

function giveRandomCard(who){
  const item=drawUniqueCard();

  if(!item){
    updateStatus(
      "Kho thẻ đã hết",
      "Tất cả 33 thẻ đã được rút hết. Không còn thẻ mới để nhận."
    );
    return null;
  }

  itemState[who].inventory.push(item);
  updateStats();

  return item;
}

function getItemGroupText(item){
  return item.group==="disadvantage" ? "Bất lợi" : "Lợi thế";
}

function getItemRarityText(rarity){
  const map={
    common:"Thường",
    rare:"Hiếm",
    epic:"Sử thi",
    legendary:"Huyền thoại"
  };

  return map[rarity] || rarity || "Thường";
}

function showCardReward(who,item){
  return new Promise(resolve=>{
    const ownerText=who==="player" ? "BẠN NHẬN ĐƯỢC THẺ" : "AI NHẬN ĐƯỢC THẺ";
    const groupText=getItemGroupText(item);
    const rarityText=getItemRarityText(item.rarity);
    const groupClass=item.group==="disadvantage" ? "bad" : "";

    const overlay=document.createElement("div");
    overlay.className="cardRewardOverlay";

    overlay.innerHTML=`
      <div class="rewardGlow"></div>
      <div class="rewardRays"></div>

      <div class="rewardCard">
        <div class="rewardTop">🎴 THẺ MỚI</div>

        <div class="rewardOwner">${ownerText}</div>

        <div class="rewardIcon">${item.icon || "🎴"}</div>

        <div class="rewardName">Thẻ ${item.no}: ${item.name}</div>

        <div class="rewardDesc">${item.desc || "Một thẻ vật phẩm mới đã được thêm vào kho."}</div>

        <div class="rewardBottom">
          <span class="rewardBadge ${groupClass}">${groupText}</span>
          <span class="rewardBadge">${rarityText}</span>
        </div>
      </div>
    `;

    for(let i=0;i<22;i++){
      const spark=document.createElement("span");
      spark.className="rewardSpark";

      const angle=Math.random()*Math.PI*2;
      const dist=105+Math.random()*120;

      spark.style.setProperty("--sx",Math.cos(angle)*dist+"px");
      spark.style.setProperty("--sy",Math.sin(angle)*dist+"px");
      spark.style.animationDelay=(Math.random()*0.32)+"s";

      overlay.appendChild(spark);
    }

    document.body.appendChild(overlay);

    const statTarget=who==="player" ? playerStatCard : aiStatCard;
    const rewardCard=overlay.querySelector(".rewardCard");

    setTimeout(()=>{
      overlay.classList.add("show");
    },20);

    setTimeout(()=>{
      const cardRect=rewardCard.getBoundingClientRect();
      const statRect=statTarget.getBoundingClientRect();

      const cardCenterX=cardRect.left+cardRect.width/2;
      const cardCenterY=cardRect.top+cardRect.height/2;

      const statCenterX=statRect.left+statRect.width/2;
      const statCenterY=statRect.top+statRect.height/2;

      const flyX=statCenterX-cardCenterX;
      const flyY=statCenterY-cardCenterY;

      rewardCard.style.setProperty("--fly-x",flyX+"px");
      rewardCard.style.setProperty("--fly-y",flyY+"px");

      rewardCard.classList.add("flyToStat");
    },1550);

    setTimeout(()=>{
      statTarget.classList.add("cardGainPulse");
    },2050);

    setTimeout(()=>{
      statTarget.classList.remove("cardGainPulse");
    },2850);

    setTimeout(()=>{
      overlay.classList.add("hide");
    },2200);

    setTimeout(()=>{
      overlay.remove();
      resolve();
    },2550);
  });
}

async function registerCompletedTurn(who){
  itemState[who].completedTurns++;

  if(itemState[who].completedTurns%2!==0){
    return;
  }

  const item=giveRandomCard(who);

  if(item){
    updateStatus(
      who==="player" ? "Bạn nhận thẻ!" : "AI nhận thẻ!",
      `${tokens[who].name} nhận được thẻ ${item.name}`
    );

    await showCardReward(who,item);
  }
}

function updateStats(){
  playerCardCount.textContent=itemState.player.inventory.length;
  playerShieldCount.textContent=itemState.player.shields;

  aiCardCount.textContent=itemState.ai.inventory.length;
  aiShieldCount.textContent=itemState.ai.shields;
}

function openInventory(who){
  openedInventoryOwner=who;

  const ownerName=who==="player" ? "" : "AI";
  const inventory=itemState[who].inventory;

  inventoryTitle.textContent=`Kho thẻ ${ownerName}`;
  inventorySub.textContent=`Đang có ${inventory.length} thẻ`;

  renderInventoryList(who);

  inventoryModal.classList.remove("hidden");
}

function closeInventory(){
  openedInventoryOwner=null;
  inventoryModal.classList.add("hidden");
}

function renderInventoryList(who){
  const inventory=itemState[who].inventory;
  inventoryList.innerHTML="";

  if(inventory.length===0){
    inventoryList.innerHTML=`
      <div class="inventoryEmpty">
        Chưa có thẻ nào.<br>
        Cứ mỗi 2 lượt hoàn thành sẽ nhận 1 thẻ ngẫu nhiên.
      </div>
    `;
    return;
  }

  inventory.forEach(item=>{
    const row=document.createElement("div");
    row.className="inventoryItem";

    const isPlayerInventory=who==="player";
    const groupText=item.group==="advantage" ? "Lợi thế" : "Bất lợi";
    const groupClass=item.group==="disadvantage" ? "bad" : "";

    row.innerHTML=`
      <div class="inventoryIcon">${item.icon || "🎴"}</div>

      <div class="inventoryInfo">
        <div class="inventoryName">
          <span>Thẻ ${item.no}</span>
          <span>${item.name}</span>
        </div>

        <div class="inventoryDesc">${item.desc || "Chưa có mô tả."}</div>

        <div class="inventoryMeta">
          <span class="inventoryBadge ${groupClass}">${groupText}</span>
          <span class="inventoryBadge">${item.rarity || "common"}</span>
        </div>
      </div>

      <button class="useItemBtn" ${isPlayerInventory ? "" : "disabled"}>
        ${isPlayerInventory ? "Sử dụng" : "Chỉ xem"}
      </button>
    `;

    const useBtn=row.querySelector(".useItemBtn");

    if(isPlayerInventory){
      useBtn.addEventListener("click",e=>{
        e.stopPropagation();
        useInventoryItem(who,item.uid);
      });
    }

    inventoryList.appendChild(row);
  });
}

function showCardConsumeEffect(who,item){
  return new Promise(resolve=>{
    const statTarget=who==="player" ? playerStatCard : aiStatCard;
    const statRect=statTarget.getBoundingClientRect();

    const statCenterX=statRect.left+statRect.width/2;
    const statCenterY=statRect.top+statRect.height/2;

    const screenCenterX=window.innerWidth/2;
    const screenCenterY=window.innerHeight/2;

    const startX=statCenterX-screenCenterX;
    const startY=statCenterY-screenCenterY;

    const groupText=item.group==="advantage" ? "Lợi thế" : "Bất lợi";
    const groupClass=item.group==="disadvantage" ? "bad" : "";
    const rarityText=(item.rarity || "common").toUpperCase();

    const ownerText=who==="player" ? "⚡ TIÊU THẺ" : "🤖 AI KÍCH HOẠT";
    const ownerName=who==="player" ? "BẠN DÙNG THẺ" : "AI DÙNG THẺ";

    const overlay=document.createElement("div");
    overlay.className="cardConsumeOverlay";

    overlay.innerHTML=`
      <div class="consumeFlash"></div>

      <div class="consumeCard">
        <div class="consumeTop">${ownerText}</div>

        <div class="consumeOwner">${ownerName}</div>

        <div class="consumeIcon">${item.icon || "🎴"}</div>

        <div class="consumeName">Thẻ ${item.no}: ${item.name}</div>

        <div class="consumeDesc">${item.desc || "Thẻ đang được kích hoạt."}</div>

        <div class="consumeBadgeRow">
          <span class="consumeBadge ${groupClass}">${groupText}</span>
          <span class="consumeBadge">${rarityText}</span>
        </div>
      </div>
    `;

    const consumeCard=overlay.querySelector(".consumeCard");
    consumeCard.style.setProperty("--start-x",startX+"px");
    consumeCard.style.setProperty("--start-y",startY+"px");

    for(let i=0;i<24;i++){
      const spark=document.createElement("span");
      spark.className="consumeSpark";

      const angle=Math.random()*Math.PI*2;
      const dist=80+Math.random()*150;

      spark.style.setProperty("--sx",Math.cos(angle)*dist+"px");
      spark.style.setProperty("--sy",Math.sin(angle)*dist+"px");
      spark.style.animationDelay=(0.32+Math.random()*0.34)+"s";

      overlay.appendChild(spark);
    }

    document.body.appendChild(overlay);

    statTarget.classList.add("cardUsePulse");

    setTimeout(()=>{
      statTarget.classList.remove("cardUsePulse");
    },820);

    setTimeout(()=>{
      overlay.remove();
      resolve();
    },2500);
  });
}

async function useInventoryItem(who,uid){
  if(who!=="player"){
    updateStatus(
      "Không thể dùng",
      "Bạn chỉ có thể sử dụng thẻ của bản thân."
    );
    return;
  }

  if(state.gameOver || state.busy || state.turn!=="player"){
    updateStatus(
      "Chưa thể dùng thẻ",
      "Bạn chỉ có thể dùng thẻ khi đang tới lượt và xúc xắc chưa được tung."
    );
    return;
  }

  const inventory=itemState[who].inventory;
  const index=inventory.findIndex(item=>item.uid===uid);

  if(index<0) return;

  const item=inventory[index];

  closeInventory();

  state.busy=true;
  setDiceEnabled(false);

  await showCardConsumeEffect(who,item);

  const used=await applyItemEffect(who,item);

  if(used){
    inventory.splice(index,1);
    updateStats();

    console.log("Đã tiêu thẻ:",item);
  }

  if(!state.gameOver){
    state.busy=false;
    setDiceEnabled(state.turn==="player");
  }
}

