// GridRush: The Logic Race — Core Architecture Refactor
// Board viewBox: 1190 x 841. Coordinates scaled to percentage-based targets.

const VB_W = 1190, VB_H = 841;
const pct = (x, y) => ({ left: (x / VB_W * 100) + "%", top: (y / VB_H * 100) + "%" });

const TRACK = [
  { n: "START", x: 68,   y: 51,   type: "start" },
  { n: 1,  x: 164,  y: 51 },
  { n: 2,  x: 260,  y: 51 },
  { n: 3,  x: 356,  y: 51, type: "move" },
  { n: 4,  x: 452,  y: 51 },
  { n: 5,  x: 548,  y: 51 },
  { n: 6,  x: 644,  y: 51, type: "lose" },
  { n: 7,  x: 740,  y: 51 },
  { n: 8,  x: 836,  y: 51 },
  { n: 9,  x: 932,  y: 51 },
  { n: 10, x: 1028, y: 51 },
  { n: 11, x: 1123, y: 69 },
  { n: 12, x: 1123, y: 169 },
  { n: 13, x: 1123, y: 269, type: "move" },
  { n: 14, x: 1123, y: 369, type: "lose" },
  { n: 15, x: 1123, y: 469 },
  { n: 16, x: 1123, y: 571 },
  { n: 17, x: 1123, y: 658 },
  { n: 18, x: 1123, y: 728 },
  { n: 19, x: 1123, y: 790 },
  { n: 20, x: 1028, y: 790 },
  { n: 21, x: 932,  y: 790 },
  { n: 22, x: 836,  y: 790, type: "move" },
  { n: 23, x: 740,  y: 790 },
  { n: 24, x: 644,  y: 790 },
  { n: 25, x: 548,  y: 790, type: "lose" },
  { n: 26, x: 452,  y: 790 },
  { n: 27, x: 356,  y: 790 },
  { n: 28, x: 260,  y: 790 },
  { n: 29, x: 164,  y: 790 },
  { n: 30, x: 68,   y: 790 }, 
  { n: 31, x: 68,   y: 688 },
  { n: 32, x: 68,   y: 570, type: "move" },
  { n: 33, x: 68,   y: 470 },
  { n: 34, x: 68,   y: 369, type: "lose" },
  { n: 35, x: 68,   y: 269 },
  { n: 36, x: 68,   y: 169 },
  { n: "FINISH", x: 68, y: 101, type: "finish" },
];
const FINISH_IDX = TRACK.length - 1;

const PLAYER_COLORS = [
  { name: "Blue",  fill: "#2746a6", stroke: "#0e1f55" },
  { name: "Red",   fill: "#c52323", stroke: "#700909" },
  { name: "Green", fill: "#1d9d2b", stroke: "#0d4d14" },
  { name: "White", fill: "#f5f5f5", stroke: "#333" },
];

// ---- Global State Engine ----
const state = {
  players: [],
  leaderboard: [], 
  current: 0,
  grid: [],
  baseCluesMask: [], 
  lastRoll: null,
  awaitingPlacement: false,
  timerId: null,
  timerEndsAt: 0,
  gameOver: false,
};

const $ = (id) => document.getElementById(id);

// ---- Dynamic 6x6 Sudoku Matrix Generator ----
function generateDynamicMatrix() {
  let initialGrid = Array.from({ length: 6 }, () => Array(6).fill(0));
  
  function fillGrid(g, r = 0, c = 0) {
    if (r === 6) return true;
    if (c === 6) return fillGrid(g, r + 1, 0);
    
    let nums = [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
    for (let num of nums) {
      if (isLegal(g, r, c, num)) {
        g[r][c] = num;
        if (fillGrid(g, r, c + 1)) return true;
        g[r][c] = 0;
      }
    }
    return false;
  }
  
  fillGrid(initialGrid);
  
  // Create randomized baseline clues (keep approx 14 structural tiles)
  state.grid = Array.from({ length: 6 }, () => Array(6).fill(0));
  state.baseCluesMask = Array.from({ length: 6 }, () => Array(6).fill(false));
  
  let structuralCount = 0;
  while (structuralCount < 14) {
    let randRow = Math.floor(Math.random() * 6);
    let randCol = Math.floor(Math.random() * 6);
    if (state.grid[randRow][randCol] === 0) {
      state.grid[randRow][randCol] = initialGrid[randRow][randCol];
      state.baseCluesMask[randRow][randCol] = true;
      structuralCount++;
    }
  }
}

// ---- Check Grid Fill and Capacity Management (75% Max Limit) ----
function checkAndManageGridCapacity() {
  let totalCells = 36;
  let filledCells = 0;

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if (state.grid[r][c] !== 0) filledCells++;
    }
  }

  // Refreshes structural layout at 75% capacity (27 or more filled cells out of 36)
  if ((filledCells / totalCells) >= 0.75) {
    generateDynamicMatrix();
    setMessage("Sudoku matrix reached 75% capacity! Shuffling new structural layout...", "good");
    renderGrid();
    return true;
  }
  return false;
}

// ---- Setup & Modal UI Modifications ----
function showSetup() {
  const modal = $("setupModal");
  const np = $("numPlayers");
  
  const rebuild = () => {
    const n = +np.value;
    const wrap = $("playerNames");
    wrap.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const c = PLAYER_COLORS[i];
      const row = document.createElement("div");
      row.className = "player-row";
      
      row.innerHTML = `
        <span class="swatch" style="background:${c.fill}"></span>
        <input type="text" data-i="${i}" value="Player ${i+1}" maxlength="14" />
        <select id="type-${i}">
          <option value="human">Human</option>
          <option value="computer">Computer (AI)</option>
        </select>
      `;
      wrap.appendChild(row);
    }
  };
  np.onchange = rebuild;
  rebuild();
  modal.classList.remove("hidden");
}

$("newGameBtn").onclick = showSetup;
$("startGameBtn").onclick = () => {
  const n = +$("numPlayers").value;
  const inputs = $("playerNames").querySelectorAll("input");
  const players = [];
  
  inputs.forEach((inp, i) => {
    const isAI = $(`type-${i}`).value === "computer";
    players.push({
      name: inp.value.trim() || (isAI ? `AI Unit ${i+1}` : `Player ${i+1}`),
      color: PLAYER_COLORS[i],
      pos: 0,        
      onTrack: false,
      skipNext: false,
      isAI: isAI,
      hasFinished: false
    });
  });
  
  startGame(players);
  $("setupModal").classList.add("hidden");
};

function startGame(players) {
  state.players = players;
  state.leaderboard = [];
  state.current = 0;
  state.gameOver = false;
  generateDynamicMatrix();
  stopTimer();
  renderAll();
  
  executeTurnSequence();
}

// ---- Turn Execution Pipeline ----
function executeTurnSequence() {
  if (state.gameOver) return;
  
  const p = state.players[state.current];
  
  if (p.hasFinished) {
    nextTurn();
    return;
  }
  
  renderAll();
  $("rollBtn").disabled = p.isAI; 
  
  if (p.isAI) {
    setMessage(`System Engine is plotting movement for ${p.name}...`);
    setTimeout(rollDice, 1200); 
  } else {
    setMessage(`${p.name}'s Turn (${p.onTrack ? "Solve / Race" : "Roll 6 to Entry"}).`);
  }
}

// ---- Dice Logic ----
$("rollBtn").onclick = rollDice;

function rollDice() {
  if (state.gameOver) return;
  const p = state.players[state.current];
  
  if (p.skipNext) {
    setMessage(`${p.name} skips this turn via Penalty Block!`, "bad");
    p.skipNext = false;
    setTimeout(nextTurn, 1200);
    return;
  }
  
  $("rollBtn").disabled = true;
  const dice = $("dice");
  dice.classList.add("rolling");
  let ticks = 0;
  
  const spin = setInterval(() => {
    dice.textContent = 1 + Math.floor(Math.random() * 6);
    if (++ticks > 10) {
      clearInterval(spin);
      dice.classList.remove("rolling");
      const roll = 1 + Math.floor(Math.random() * 6);
      dice.textContent = roll;
      state.lastRoll = roll;
      onRolled(roll);
    }
  }, 60);
}

function onRolled(roll) {
  const p = state.players[state.current];

  // Sudden Death Rules Matrix Overrides placement validation entirely
  if (gridFull() && p.onTrack) {
    setMessage(`Sudden Death Rule: ${p.name} advances exactly ${roll} steps!`, "good");
    movePlayer(p, roll, () => {
      setTimeout(nextTurn, 1000);
    });
    return;
  }

  if (!p.onTrack) {
    if (roll === 6) {
      p.onTrack = true;
      p.pos = 1; 
      setMessage(`${p.name} rolled a 6 and deployed to Track Space 1!`, "good");
      renderTokens(); renderPlayers();
      beginPlacement(roll);
    } else {
      setMessage(`${p.name} rolled ${roll}. Matrix configuration requires a 6 to deploy.`, "bad");
      setTimeout(nextTurn, 1200);
    }
    return;
  }

  if (!hasAnyLegalSpot(roll)) {
    setMessage(`No legal logic structural tile for number ${roll}. ${p.name} grid-locked.`, "bad");
    setTimeout(nextTurn, 1200);
    return;
  }
  
  beginPlacement(roll);
}

function beginPlacement(roll) {
  state.awaitingPlacement = true;
  renderGrid();
  
  if (state.players[state.current].isAI) {
    stopTimer();
    setTimeout(() => executeAIPlacement(roll), 1000);
  } else {
    setMessage(`Select a legal cell to embed ${roll}. CRITICAL: One mistake terminates turn!`);
    startTimer(15000, () => {
      state.awaitingPlacement = false;
      setMessage(`Time Frame Expired! ${state.players[state.current].name} remains frozen.`, "bad");
      renderGrid();
      setTimeout(nextTurn, 1200);
    });
  }
}

function executeAIPlacement(n) {
  state.awaitingPlacement = false;
  let legalTargets = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if (isLegal(state.grid, r, c, n)) {
        legalTargets.push({ r, c });
      }
    }
  }
  
  if (legalTargets.length > 0) {
    const choice = legalTargets[Math.floor(Math.random() * legalTargets.length)];
    state.grid[choice.r][choice.c] = n;
    const p = state.players[state.current];
    setMessage(`AI [${p.name}] computed valid layout at row ${choice.r + 1}, col ${choice.c + 1}!`, "good");
    
    // Evaluate if this turn triggered the 70% capacity layout refresh
    checkAndManageGridCapacity();

    movePlayer(p, n, () => {
      setTimeout(nextTurn, 1000);
    });
  } else {
    nextTurn();
  }
}

// ---- Striking-Policy Integration ----
function attemptPlace(r, c) {
  if (!state.awaitingPlacement || state.players[state.current].isAI) return;
  
  stopTimer();
  state.awaitingPlacement = false;
  const n = state.lastRoll;
  const p = state.players[state.current];
  
  if (!isLegal(state.grid, r, c, n)) {
    const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (cell) {
      cell.classList.add("invalid");
      setTimeout(() => cell.classList.remove("invalid"), 500);
    }
    // Strict requirement: single configuration error drops turn execution immediately
    setMessage(`Sudoku Rule Infraction! Turn Terminated for ${p.name}.`, "bad");
    renderGrid();
    setTimeout(nextTurn, 1500);
    return;
  }
  
  state.grid[r][c] = n;
  setMessage(`Placement Verified! ${p.name} accelerates forward ${n} tiles.`, "good");
  
  // Evaluate if this turn triggered the 70% capacity layout refresh
  checkAndManageGridCapacity();

  movePlayer(p, n, () => {
    setTimeout(nextTurn, 1000);
  });
}

// ---- Multi-Player Elimination & Progression Engines ----
function movePlayer(p, steps, done) {
  let remaining = steps;
  const step = () => {
    if (remaining <= 0) {
      handleLanding(p, done);
      return;
    }
    if (p.pos < FINISH_IDX) p.pos++;
    remaining--;
    renderTokens(); renderPlayers();
    
    if (p.pos >= FINISH_IDX) { 
      handleLanding(p, done); 
      return; 
    }
    setTimeout(step, 180);
  };
  step();
}

function handleLanding(p, done) {
  if (p.pos >= FINISH_IDX) {
    logPlayerFinish(p);
    done();
    return;
  }
  
  const sp = TRACK[p.pos];
  if (sp.type === "move") {
    setMessage(`Bonus Node Configured! ${p.name} advances 2 extra steps.`, "good");
    setTimeout(() => movePlayer(p, 2, done), 400);
    return;
  }
  if (sp.type === "lose") {
    setMessage(`Trap Tile Triggered! ${p.name} structural lock assigned for next round.`, "bad");
    p.skipNext = true;
  }
  done();
}

function logPlayerFinish(p) {
  if (p.hasFinished) return;
  p.hasFinished = true;
  p.pos = FINISH_IDX;
  state.leaderboard.push(p.name);
  
  const placementRank = state.leaderboard.length;
  let suffix = "th";
  if (placementRank === 1) suffix = "st";
  else if (placementRank === 2) suffix = "nd";
  else if (placementRank === 3) suffix = "rd";
  
  setMessage(`🎉 ${p.name} crosses the FINISH line, locking down ${placementRank}${suffix} Place! 🎉`, "good");
  renderTokens(); renderPlayers();
}

function nextTurn() {
  const activeCount = state.players.filter(pl => !pl.hasFinished).length;
  if (activeCount === 0) {
    concludeEntireGame();
    return;
  }
  
  state.current = (state.current + 1) % state.players.length;
  executeTurnSequence();
}

function concludeEntireGame() {
  state.gameOver = true;
  stopTimer();
  
  let leaderboardSummary = state.leaderboard.map((name, idx) => `${idx + 1}. ${name}`).join(" | ");
  setMessage(`Tournament Complete! Final Standings: ${leaderboardSummary}`, "good");
  $("turnInfo").innerHTML = `<b>Game Complete! Standings Verified.</b>`;
  $("rollBtn").disabled = true;
}

// ---- Pure Matrix Utility Computations ----
function isLegal(grid, r, c, n) {
  if (grid[r][c] !== 0) return false;
  for (let i = 0; i < 6; i++) {
    if (grid[r][i] === n) return false;
    if (grid[i][c] === n) return false;
  }
  const br = Math.floor(r / 2) * 2;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 2; rr++)
    for (let cc = bc; cc < bc + 3; cc++)
      if (grid[rr][cc] === n) return false;
  return true;
}

// ---- Rendering Matrix Modules ----
function hasAnyLegalSpot(n) {
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++)
      if (isLegal(state.grid, r, c, n)) return true;
  return false;
}

function gridFull() {
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++)
      if (state.grid[r][c] === 0) return false;
  return true;
}

function renderAll() {
  renderPlayers();
  renderTokens();
  renderGrid();
  renderTurn();
}

function renderPlayers() {
  const ul = $("playerList");
  ul.innerHTML = "";
  state.players.forEach((p, i) => {
    const li = document.createElement("li");
    if (i === state.current && !state.gameOver && !p.hasFinished) li.classList.add("current");
    
    let displayPosition = "START";
    if (p.hasFinished) {
      const rank = state.leaderboard.indexOf(p.name) + 1;
      displayPosition = `FINISHED (${rank})`;
    } else if (p.onTrack) {
      displayPosition = `Space ${TRACK[p.pos].n}`;
    }
    
    const skip = p.skipNext ? " ⏸" : "";
    const typeLabel = p.isAI ? " [AI]" : "";
    li.innerHTML = `
      <span class="swatch" style="background:${p.color.fill};border-color:${p.color.stroke}"></span>
      <span>${p.name}${typeLabel}</span>
      <span style="margin-left:auto;font-size:12px;color:#555;font-weight:bold;">${displayPosition}${skip}</span>
    `;
    ul.appendChild(li);
  });
}

function renderTokens() {
  const layer = $("tokens");
  layer.innerHTML = "";
  const groups = {};
  
  state.players.forEach((p, i) => {
    const k = p.pos;
    (groups[k] = groups[k] || []).push(i);
  });
  
  Object.entries(groups).forEach(([posIdx, idxs]) => {
    const t = TRACK[+posIdx];
    idxs.forEach((pi, j) => {
      const p = state.players[pi];
      const el = document.createElement("div");
      el.className = "token" + (pi === state.current && !state.gameOver ? " active" : "");
      const off = (j - (idxs.length - 1) / 2) * 18;
      const pos = pct(t.x + off, t.y);
      el.style.left = pos.left;
      el.style.top = pos.top;
      el.innerHTML = cloverSVG(p.color.fill, p.color.stroke);
      el.title = p.name;
      layer.appendChild(el);
    });
  });
}

function cloverSVG(fill, stroke) {
  return `<svg viewBox="-50 -50 100 100">
    <g fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round">
      <circle cx="0" cy="-22" r="20"/>
      <circle cx="-20" cy="12" r="20"/>
      <circle cx="20" cy="12" r="20"/>
    </g>
  </svg>`;
}

function renderGrid() {
  const g = $("sudokuGrid");
  g.innerHTML = "";
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const v = state.grid[r][c];
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      
      if (v !== 0) {
        cell.textContent = v;
        if (state.baseCluesMask[r][c]) cell.classList.add("clue");
        else cell.classList.add("placed");
      } else if (state.awaitingPlacement && !state.players[state.current].isAI) {
        cell.classList.add("placeable");
        cell.onclick = () => attemptPlace(r, c);
      }
      g.appendChild(cell);
    }
  }
}

function renderTurn() {
  if (state.gameOver) return;
  const p = state.players[state.current];
  $("turnInfo").innerHTML = `<b style="color:${p.color.fill}">${p.name}</b> (${p.isAI ? "AI Core" : "User"}) is active.`;
}

// ---- Clock Framework ----
function startTimer(ms, onExpire) {
  stopTimer();
  state.timerEndsAt = Date.now() + ms;
  const tick = () => {
    const remain = state.timerEndsAt - Date.now();
    if (remain <= 0) {
      $("timerFill").style.width = "0%";
      $("timerText").textContent = "0.0s";
      stopTimer();
      onExpire();
      return;
    }
    $("timerFill").style.width = (remain / ms * 100) + "%";
    $("timerText").textContent = (remain / 1000).toFixed(1) + "s";
  };
  tick();
  state.timerId = setInterval(tick, 100);
}

// ---- Messages & Listeners ----
function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
  $("timerFill").style.width = "100%";
  $("timerText").textContent = "15.0s";
}

function setMessage(text, kind) {
  const box = $("messageBox");
  box.textContent = text;
  box.className = "message" + (kind ? " " + kind : "");
}

window.addEventListener("DOMContentLoaded", () => {
  generateDynamicMatrix();
  renderGrid();
  showSetup();
});