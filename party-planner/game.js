// ---- Canvas ----
const canvas = document.getElementById('party-canvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

// ---- State ----
const choices = {};
let phaseIndex = -1;
let tick = 0;

// Player walk-in
let playerX = null;
let playerTargetX = null;

// Guests
let guests = [];
let confetti = [];

// ---- Question definitions ----
const QUESTIONS = [
  {
    key: 'venue', label: 'The Venue', question: 'Where are you throwing this party?',
    options: [
      { value: 'backyard', label: '🏡 Backyard' },
      { value: 'club',     label: '🏙️ Club'     },
      { value: 'beach',    label: '🏖️ Beach'    },
    ],
  },
  {
    key: 'theme', label: 'The Vibe', question: "What's the theme?",
    options: [
      { value: 'tropical', label: '🌴 Tropical' },
      { value: 'retro',    label: '🕹️ Retro'   },
      { value: 'neon',     label: '💫 Neon'     },
    ],
  },
  {
    key: 'food', label: 'The Food', question: "What's on the table?",
    options: [
      { value: 'pizza', label: '🍕 Pizza' },
      { value: 'tacos', label: '🌮 Tacos' },
      { value: 'fancy', label: '🥂 Fancy' },
    ],
  },
  {
    key: 'music', label: 'The Music', question: "What's the sound?",
    options: [
      { value: 'pop',    label: '🎵 Pop'    },
      { value: 'hiphop', label: '🎤 Hip-Hop' },
      { value: 'jazz',   label: '🎷 Jazz'   },
    ],
  },
  {
    key: 'style', label: 'Your Outfit', question: "What's your style?",
    options: [
      { value: 'casual', label: '👕 Casual' },
      { value: 'dressy', label: '✨ Dressy' },
      { value: 'themed', label: '🎭 Themed' },
    ],
  },
  {
    key: 'color', label: 'Your Outfit', question: 'What color are you wearing?',
    options: [
      { value: 'red',   label: '🔴 Red'   },
      { value: 'blue',  label: '🔵 Blue'  },
      { value: 'gold',  label: '🟡 Gold'  },
      { value: 'black', label: '⚫ Black' },
    ],
  },
  {
    key: 'accessory', label: 'Your Outfit', question: 'Any accessories?',
    options: [
      { value: 'hat',        label: '🎩 Hat'    },
      { value: 'sunglasses', label: '🕶️ Shades' },
      { value: 'jewelry',    label: '💎 Jewelry' },
      { value: 'none',       label: '— None'    },
    ],
  },
];

const OUTFIT_PHASE = 4; // index where outfit questions begin

// ---- Game start ----
function startGame() {
  document.getElementById('welcome').style.display = 'none';
  phaseIndex = 0;
  showQuestion(0);
}

function showQuestion(index) {
  const q = QUESTIONS[index];
  const panel = document.getElementById('choice-panel');
  panel.classList.add('visible');
  document.getElementById('panel-label').textContent = q.label;
  document.getElementById('panel-question').textContent = q.question;
  const opts = document.getElementById('panel-options');
  opts.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => onChoose(opt.value, btn));
    opts.appendChild(btn);
  });
}

function onChoose(value, btn) {
  document.querySelectorAll('.option-btn').forEach(b => b.style.pointerEvents = 'none');
  btn.classList.add('selected');
  choices[QUESTIONS[phaseIndex].key] = value;

  if (phaseIndex === QUESTIONS.length - 1) {
    setTimeout(() => {
      document.getElementById('choice-panel').classList.remove('visible');
      beginGuestEntrance();
    }, 700);
    return;
  }

  // Slightly longer pause before transitioning to outfit phase
  const delay = phaseIndex === OUTFIT_PHASE - 1 ? 900 : 650;
  setTimeout(() => {
    phaseIndex++;
    if (phaseIndex === OUTFIT_PHASE) triggerPlayerEntrance();
    showQuestion(phaseIndex);
  }, delay);
}

// ---- Player entrance animation ----
function triggerPlayerEntrance() {
  playerX = W + 80;
  playerTargetX = W * 0.50;
}

// ---- Guest entrance ----
const GUEST_X_FRACS = [0.08, 0.20, 0.33, 0.61, 0.70, 0.78];
const GUEST_COLORS  = ['#c0392b', '#8e44ad', '#2980b9', '#16a085', '#d35400', '#27ae60'];
const SKIN_TONES    = ['#f5cba7', '#e0ac69', '#c68642', '#8d5524', '#f5cba7', '#e0ac69'];
const GUEST_ACTIONS = ['dance', 'dance', 'talk', 'eat', 'dance', 'talk'];

function beginGuestEntrance() {
  const gy = getGroundY();
  guests = GUEST_X_FRACS.map((xf, i) => {
    const tx = W * xf;
    return {
      x: tx < W * 0.5 ? -80 : W + 80,
      targetX: tx,
      y: gy - 15,
      color: GUEST_COLORS[i],
      skin: SKIN_TONES[i],
      phase: (i / 6) * Math.PI * 2,
      speed: 0.045 + (i % 3) * 0.015,
      action: GUEST_ACTIONS[i],
      walkSpeed: 4 + (i % 3),
      arrived: false,
      isPlayer: false,
    };
  });

  const pal = getPalette();
  confetti = Array.from({ length: 40 }, (_, i) => ({
    x: Math.random() * W,
    y: -20 - Math.random() * 120,
    dx: (Math.random() - 0.5) * 1.4,
    dy: 0.8 + Math.random() * 1.2,
    size: 5 + Math.random() * 5,
    color: [pal.primary, pal.secondary, pal.accent][i % 3],
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.09,
  }));
}

// ---- Helpers ----
const VENUE_GROUND = { backyard: 0.62, club: 0.65, beach: 0.63 };
function getGroundY() {
  return H * (choices.venue ? VENUE_GROUND[choices.venue] : 0.63);
}

const PALETTES = {
  tropical: { primary: '#ff6b35', secondary: '#ffd166', accent: '#06d6a0', banner: '#ff9f1c' },
  retro:    { primary: '#9b5de5', secondary: '#f15bb5', accent: '#00bbf9', banner: '#fee440' },
  neon:     { primary: '#00f5d4', secondary: '#f72585', accent: '#7209b7', banner: '#4cc9f0' },
};
const OUTFIT_COLORS = { red: '#e74c3c', blue: '#3498db', gold: '#f1c40f', black: '#3d3d3d' };

function getPalette() { return PALETTES[choices.theme] || PALETTES.neon; }

function hexRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

// ---- Main loop ----
(function loop() {
  tick++;
  draw();
  requestAnimationFrame(loop);
})();

// ---- Draw ----
function draw() {
  ctx.clearRect(0, 0, W, H);
  const gy = getGroundY();
  const pal = getPalette();

  choices.venue ? drawBackground(gy) : drawPreBackground();

  if (choices.venue)  drawVenueDetails(gy, pal);
  if (choices.theme)  { drawBunting(gy, pal); drawThemeDecorations(gy, pal); }
  if (choices.food)   drawFoodTable(gy, pal);

  guests.forEach(g => {
    if (!g.arrived) {
      const diff = g.targetX - g.x;
      if (Math.abs(diff) < g.walkSpeed) { g.x = g.targetX; g.arrived = true; }
      else g.x += Math.sign(diff) * g.walkSpeed;
    }
    drawCharacter(g, gy);
  });

  if (confetti.length) drawConfetti();

  if (playerX !== null) {
    if (Math.abs(playerX - playerTargetX) > 1.5) playerX += (playerTargetX - playerX) * 0.1;
    else playerX = playerTargetX;
    drawCharacter({
      x: playerX, y: gy - 15,
      color: choices.color ? OUTFIT_COLORS[choices.color] : '#888',
      skin: '#f5cba7',
      phase: 0, speed: 0.07,
      action: 'dance', isPlayer: true,
    }, gy);
  }

  if (choices.music) drawMusicViz(pal);
}

// ---- Pre-venue background ----
function drawPreBackground() {
  ctx.fillStyle = '#08081a';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) {
    const x = (i * 211 + 40) % W;
    const y = (i * 97 + 15) % (H * 0.85);
    const a = 0.2 + Math.abs(Math.sin(tick * 0.008 + i * 0.4)) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
  }
}

// ---- Venue background ----
function drawBackground(gy) {
  const SKY = {
    backyard: ['#1a3a5c', '#4a7fa0'],
    club:     ['#050510', '#12082a'],
    beach:    ['#4ba3d4', '#fce38a'],
  }[choices.venue];
  const GROUND = { backyard: '#3d6e35', club: '#111118', beach: '#d4b85a' }[choices.venue];

  const grad = ctx.createLinearGradient(0, 0, 0, gy);
  grad.addColorStop(0, SKY[0]); grad.addColorStop(1, SKY[1]);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, gy);
  ctx.fillStyle = GROUND; ctx.fillRect(0, gy, W, H - gy);
}

// ---- Venue-specific elements ----
function drawVenueDetails(gy, pal) {
  if (choices.venue === 'backyard') {
    // Stars + moon
    for (let i = 0; i < 35; i++) {
      const x = (i * 213 + 40) % W, y = (i * 71 + 8) % (gy * 0.55);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 3) * 0.2})`;
      ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fffde7';
    ctx.beginPath(); ctx.arc(W * 0.84, gy * 0.14, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a3a5c';
    ctx.beginPath(); ctx.arc(W * 0.84 + 12, gy * 0.14 - 5, 22, 0, Math.PI * 2); ctx.fill();
    // Trees
    drawTree(W * 0.04, gy); drawTree(W * 0.96, gy);
    // Fence
    const postW = Math.max(8, W * 0.009);
    const postGap = Math.max(22, W * 0.024);
    ctx.fillStyle = '#c8a96e';
    for (let x = 0; x < W; x += postGap) ctx.fillRect(x + 2, gy - 40, postW, 40);
    ctx.fillRect(0, gy - 44, W, 5);
    ctx.fillRect(0, gy - 22, W, 5);

  } else if (choices.venue === 'club') {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, 22);
    // Spotlights
    [{ x: 0.15, c: pal.primary }, { x: 0.50, c: pal.secondary }, { x: 0.85, c: pal.accent }].forEach(s => {
      const sx = W * s.x, [r, g, b] = hexRgb(s.c);
      const gr = ctx.createLinearGradient(sx, 22, sx, gy);
      gr.addColorStop(0, `rgba(${r},${g},${b},0.38)`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(sx - 8, 22); ctx.lineTo(sx + 8, 22);
      ctx.lineTo(sx + W * 0.13, gy); ctx.lineTo(sx - W * 0.13, gy);
      ctx.closePath(); ctx.fill();
    });
    // DJ booth
    const bx = W * 0.5, bw = 210, bh = 68;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx - bw / 2, gy - bh, bw, bh);
    ctx.fillStyle = '#252525'; ctx.fillRect(bx - bw / 2 + 8, gy - bh + 8, bw - 16, bh - 14);
    for (let i = 0; i < 8; i++) {
      const h = 5 + Math.abs(Math.sin(tick * 0.11 + i * 0.65)) * 26;
      ctx.fillStyle = pal.primary;
      ctx.fillRect(bx - bw / 2 + 14 + i * 23, gy - 16 - h, 17, h);
    }
    // Speakers
    ctx.fillStyle = '#111';
    ctx.fillRect(bx - bw / 2 - 52, gy - 115, 46, 115);
    ctx.fillRect(bx + bw / 2 + 6, gy - 115, 46, 115);
    ctx.fillStyle = '#2a2a2a';
    [[bx - bw / 2 - 29, gy - 72], [bx + bw / 2 + 29, gy - 72]].forEach(([cx, cy]) => {
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
    });

  } else if (choices.venue === 'beach') {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(W * 0.83, gy * 0.17, 48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,215,0,0.18)';
    ctx.beginPath(); ctx.arc(W * 0.83, gy * 0.17, 68, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a86c8'; ctx.fillRect(0, gy - 38, W, 44);
    ctx.beginPath(); ctx.moveTo(0, gy - 24);
    for (let x = 0; x <= W; x += 5)
      ctx.lineTo(x, gy - 24 + Math.sin(x * 0.013 + tick * 0.04) * 10);
    ctx.lineTo(W, gy); ctx.lineTo(0, gy); ctx.closePath();
    ctx.fillStyle = '#5ba3e0'; ctx.fill();
    drawPalm(W * 0.07, gy); drawPalm(W * 0.16, gy);
  }
}

function drawTree(x, gy) {
  ctx.fillStyle = '#5a3e1b'; ctx.fillRect(x - 7, gy - 92, 14, 92);
  ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(x, gy - 102, 38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#388e3c'; ctx.beginPath(); ctx.arc(x, gy - 120, 28, 0, Math.PI * 2); ctx.fill();
}

function drawPalm(x, gy) {
  ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x + 16, gy - 60, x - 10, gy - 125); ctx.stroke();
  [[-42,-8],[36,-18],[-16,30],[42,14],[-36,22]].forEach(([dx, dy]) => {
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 10, gy - 125);
    ctx.quadraticCurveTo(x - 10 + dx * 0.5, gy - 125 + dy * 0.5, x - 10 + dx, gy - 125 + dy);
    ctx.stroke();
  });
}

// ---- Bunting ----
function drawBunting(gy, pal) {
  const y0 = gy * 0.11;
  ctx.strokeStyle = 'rgba(160,160,160,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W * 0.04, y0); ctx.lineTo(W * 0.96, y0); ctx.stroke();
  const n = 18;
  for (let i = 0; i < n; i++) {
    const x = W * 0.04 + i * (W * 0.92 / (n - 1));
    const sag = Math.sin((i / (n - 1)) * Math.PI) * gy * 0.07;
    ctx.fillStyle = i % 2 === 0 ? pal.primary : pal.secondary;
    ctx.beginPath();
    ctx.moveTo(x - 10, y0 + sag); ctx.lineTo(x + 10, y0 + sag); ctx.lineTo(x, y0 + sag + 18);
    ctx.closePath(); ctx.fill();
  }
}

// ---- Theme decorations ----
function drawThemeDecorations(gy, pal) {
  if (choices.theme === 'tropical') {
    [[W * 0.12, gy - 12], [W * 0.88, gy - 12]].forEach(([fx, fy]) => {
      [[0,-14],[12,-7],[12,7],[0,14],[-12,7],[-12,-7]].forEach(([dx, dy], i) => {
        ctx.fillStyle = [pal.primary, pal.secondary, pal.accent][i % 3];
        ctx.beginPath(); ctx.arc(fx + dx, fy + dy, 8, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI * 2); ctx.fill();
    });
  } else if (choices.theme === 'retro') {
    ctx.fillStyle = pal.accent;
    [[W*0.08,gy*0.08],[W*0.25,gy*0.05],[W*0.75,gy*0.07],[W*0.92,gy*0.09]].forEach(([sx, sy]) => {
      ctx.fillRect(sx-8, sy-2, 16, 4); ctx.fillRect(sx-2, sy-8, 4, 16); ctx.fillRect(sx-5, sy-5, 10, 10);
    });
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let y = gy; y < H; y += 5) ctx.fillRect(0, y, W, 2);
  } else if (choices.theme === 'neon') {
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = pal.primary;
    ctx.strokeStyle = pal.primary; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, gy + i * ((H - gy) / 5)); ctx.lineTo(W, gy + i * ((H - gy) / 5)); ctx.stroke();
    }
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(W / 2, gy); ctx.lineTo(i * W / 10, H); ctx.stroke();
    }
    ctx.restore();
  }
}

// ---- Food table ----
function drawFoodTable(gy, pal) {
  const tx = W * 0.83, tw = W * 0.14, ty = gy;
  ctx.fillStyle = '#7b5e3a';
  ctx.fillRect(tx + tw * 0.06, ty - 58, tw * 0.08, 58);
  ctx.fillRect(tx + tw * 0.86, ty - 58, tw * 0.08, 58);
  ctx.fillStyle = '#a0785a'; ctx.fillRect(tx, ty - 58, tw, 12);
  ctx.fillStyle = pal.secondary; ctx.fillRect(tx - 4, ty - 63, tw + 8, 9);

  const sy = ty - 58;

  if (choices.food === 'pizza') {
    const pcx = tx + tw * 0.35, pcy = sy - 20;
    ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(pcx, pcy, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(pcx, pcy, 16, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.lineTo(pcx + Math.cos(a)*16, pcy + Math.sin(a)*16); ctx.stroke();
    }
    [[0,-8],[8,3],[-6,6]].forEach(([dx, dy]) => {
      ctx.fillStyle = '#7b241c'; ctx.beginPath(); ctx.arc(pcx+dx, pcy+dy, 3.5, 0, Math.PI*2); ctx.fill();
    });
    [tx + tw*0.62, tx + tw*0.78].forEach(cx => {
      ctx.fillStyle = '#3498db'; ctx.fillRect(cx, sy - 22, 12, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(cx + 3, sy - 19, 3, 14);
    });

  } else if (choices.food === 'tacos') {
    for (let i = 0; i < 3; i++) {
      const bx = tx + tw * (0.18 + i * 0.26);
      ctx.fillStyle = '#f9ca24'; ctx.beginPath(); ctx.ellipse(bx, sy-16, 14, 11, -0.2, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#6ab04c'; ctx.fillRect(bx-9, sy-23, 18, 9);
      ctx.fillStyle = '#e55039'; ctx.fillRect(bx-6, sy-27, 12, 6);
    }
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(tx + tw*0.88, sy-14, 14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HOT', tx + tw*0.88, sy - 10); ctx.textAlign = 'left';

  } else if (choices.food === 'fancy') {
    for (let i = 0; i < 3; i++) {
      const gx = tx + tw * (0.14 + i * 0.27);
      ctx.strokeStyle = '#f9ca24'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx, sy-2); ctx.lineTo(gx, sy-30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx-9, sy-2); ctx.lineTo(gx+9, sy-2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx-7, sy-30); ctx.lineTo(gx-3, sy-46); ctx.lineTo(gx+3, sy-46); ctx.lineTo(gx+7, sy-30);
      ctx.closePath(); ctx.fillStyle = 'rgba(249,202,36,0.22)'; ctx.fill();
      ctx.strokeStyle = '#f9ca24'; ctx.stroke();
      ctx.fillStyle = '#f9ca24';
      for (let b = 0; b < 3; b++) {
        const by = sy - 32 - ((tick * 0.5 + b * 7 + i * 5) % 14);
        ctx.beginPath(); ctx.arc(gx - 1 + b, by, 1, 0, Math.PI * 2); ctx.fill();
      }
    }
    const cx = tx + tw * 0.86;
    ctx.fillStyle = '#ecf0f1'; ctx.fillRect(cx-5, sy-40, 10, 30);
    const fl = 4 + Math.sin(tick * 0.12) * 1.8;
    ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(cx, sy-40, fl, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff5cc'; ctx.beginPath(); ctx.arc(cx, sy-40, 2, 0, Math.PI*2); ctx.fill();
  }
}

// ---- Character ----
function drawCharacter(c, gy) {
  const bob   = Math.sin(tick * c.speed + c.phase) * 6;
  const swing = Math.sin(tick * c.speed + c.phase);
  const cx = c.x, cy = c.y + bob;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath(); ctx.ellipse(cx, c.y + 7, 18, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Body
  ctx.fillStyle = c.color; ctx.fillRect(cx - 12, cy - 44, 24, 34);
  if (c.isPlayer && choices.style === 'dressy') {
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 4, cy - 44, 8, 20);
  }
  if (c.isPlayer && choices.style === 'themed') {
    const pal = getPalette();
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy - 30, 5, 0, Math.PI * 2); ctx.fill();
  }

  // Head
  ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(cx, cy - 57, 15, 0, Math.PI * 2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath(); ctx.arc(cx-5, cy-59, 2, 0, Math.PI*2); ctx.arc(cx+5, cy-59, 2, 0, Math.PI*2); ctx.fill();
  // Smile
  ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy - 54, 5, 0.15, Math.PI - 0.15); ctx.stroke();

  // Arms
  ctx.strokeStyle = c.color; ctx.lineWidth = 7; ctx.lineCap = 'round';
  if (c.action === 'dance') {
    ctx.beginPath(); ctx.moveTo(cx-12, cy-38); ctx.lineTo(cx-27, cy-26 + swing*14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+12, cy-38); ctx.lineTo(cx+27, cy-26 - swing*14); ctx.stroke();
  } else if (c.action === 'eat') {
    ctx.beginPath(); ctx.moveTo(cx-12, cy-38); ctx.lineTo(cx-20, cy-50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+12, cy-38); ctx.lineTo(cx-2,  cy-55); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx-12, cy-38); ctx.lineTo(cx-24, cy-30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+12, cy-38); ctx.lineTo(cx+24, cy-30); ctx.stroke();
  }

  // Legs
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(cx-5, cy-10); ctx.lineTo(cx - 9 + swing*5, cy+15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+5, cy-10); ctx.lineTo(cx + 9 - swing*5, cy+15); ctx.stroke();

  // Player extras
  if (c.isPlayer) {
    ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy - 57, 18, 0, Math.PI * 2); ctx.stroke();

    const acc = choices.accessory;
    if (acc === 'hat') {
      ctx.fillStyle = '#222';
      ctx.fillRect(cx-18, cy-74, 36, 6);
      ctx.fillRect(cx-12, cy-90, 24, 18);
    } else if (acc === 'sunglasses') {
      ctx.fillStyle = '#111';
      ctx.fillRect(cx-15, cy-62, 11, 6);
      ctx.fillRect(cx+4,  cy-62, 11, 6);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx-4, cy-59); ctx.lineTo(cx+4, cy-59); ctx.stroke();
    } else if (acc === 'jewelry') {
      ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy-44, 8, Math.PI*0.1, Math.PI*0.9); ctx.stroke();
      ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(cx, cy-44+4, 3.5, 0, Math.PI*2); ctx.fill();
    }

    if (choices.style === 'dressy') {
      const bc = { red:'#7b241c', blue:'#1a5276', gold:'#9a7d0a', black:'#555' }[choices.color] || '#555';
      ctx.fillStyle = bc;
      ctx.beginPath(); ctx.moveTo(cx-7, cy-45); ctx.lineTo(cx, cy-41); ctx.lineTo(cx-7, cy-37); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx+7, cy-45); ctx.lineTo(cx, cy-41); ctx.lineTo(cx+7, cy-37); ctx.closePath(); ctx.fill();
      ctx.fillStyle = bc; ctx.beginPath(); ctx.arc(cx, cy-41, 3, 0, Math.PI*2); ctx.fill();
    }
  }

  // Talk bubble
  if (c.action === 'talk' && Math.sin(tick * 0.022 + c.phase) > 0.45) {
    ctx.fillStyle = 'rgba(255,255,255,0.93)';
    ctx.beginPath(); ctx.roundRect(cx - 28, cy - 98, 56, 23, 5); ctx.fill();
    ctx.fillStyle = '#333'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(['ha!','omg!','so fun!','yesss!'][Math.floor((tick*0.01 + c.phase*2) % 4)], cx, cy - 82);
    ctx.textAlign = 'left';
  }
}

// ---- Music visualizer ----
function drawMusicViz(pal) {
  const bars = 26, bw = Math.max(10, W * 0.011), gap = Math.max(3, W * 0.003);
  const startX = (W - bars * (bw + gap)) / 2;
  const speed = { jazz: 0.024, hiphop: 0.1, pop: 0.055 }[choices.music] || 0.055;
  for (let i = 0; i < bars; i++) {
    const h = 8 + Math.abs(Math.sin(tick * speed + i * 0.46)) * 34;
    ctx.fillStyle = pal.primary; ctx.globalAlpha = 0.5;
    ctx.fillRect(startX + i * (bw + gap), H - 6 - h, bw, h);
  }
  ctx.globalAlpha = 1;
}

// ---- Confetti ----
function drawConfetti() {
  confetti.forEach(p => {
    p.x += p.dx; p.y += p.dy; p.rot += p.rotSpeed;
    if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color; ctx.globalAlpha = 0.8;
    ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.55);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}
