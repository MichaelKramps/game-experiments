const WIDTH = 800;
const HEIGHT = 600;

const LANE_LM = 200;   // left | middle divider x
const LANE_MR = 600;   // middle | right divider x

const PLAYER_Y = HEIGHT;
const PLAYER_SPEED = 300;  // px/sec horizontal
const PLAYER_MIN_X = 30;
const PLAYER_MAX_X = WIDTH - 30;

const ZOMBIE_SPEED = 90;   // px/sec downward (basic)

const ZOMBIE_TYPES = [
  { type: 'basic',   health: 1,  speed: 90,  scale: 1.0,  weight: 60, legColor: 0x1a3320, bodyColor: 0x226633, headColor: 0x44aa55, eyeColor: 0xff2200 },
  { type: 'fast',    health: 1,  speed: 200, scale: 0.85, weight: 20, legColor: 0x882211, bodyColor: 0xaa4422, headColor: 0xcc6644, eyeColor: 0xffff00 },
  { type: 'tank',    health: 8,  speed: 55,  scale: 1.25, weight: 15, legColor: 0x112244, bodyColor: 0x224488, headColor: 0x4466aa, eyeColor: 0xff2200 },
  { type: 'bruiser', health: 20, speed: 35,  scale: 1.6,  weight: 5,  legColor: 0x331144, bodyColor: 0x553366, headColor: 0x7755aa, eyeColor: 0xff6600 },
];

function pickZombieType() {
  const total = ZOMBIE_TYPES.reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * total;
  for (const t of ZOMBIE_TYPES) { r -= t.weight; if (r <= 0) return t; }
  return ZOMBIE_TYPES[0];
}
const BULLET_SPEED = 520;  // px/sec upward
const SHOOTER_SPREAD = 20; // px between adjacent shooters
const SHOOTER_SCALE  = 0.65;
const ROW_SPACING    = 55; // px between rows (front row nearest top)
const MAX_PER_ROW    = Math.floor((LANE_MR - LANE_LM) / SHOOTER_SPREAD);
const GUN_TIP_Y      = Math.round(76 * SHOOTER_SCALE); // px above feet to gun tip
const FIRE_DELAY_MIN = 60;

// Target positions (center of each side lane)
const LEFT_TARGET_X  = LANE_LM / 2;
const RIGHT_TARGET_X = LANE_MR + (WIDTH - LANE_MR) / 2;
const TARGET_Y = 200;
const TARGET_R = 30;

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.playerX  = WIDTH / 2;
    this.zombies  = [];
    this.bullets  = [];
    this.lives    = 10;
    this.score    = 0;
    this.dead     = false;
    this.fireDelay       = 1000;
    this.spawnDelay      = 2000;
    this.survivalPhase   = false;
    this.waitingForClear = false;
    this.gunType         = 'standard';
    this.explosiveSkip   = 0;
    this.shooters        = [];   // { gfx, offset }
    this.soldierUpgrades  = [];   // { x, y, count, gfx, text }
    this.fireRateUpgrades = [];   // { x, y, levels, gfx, text }

    // Static road
    this.drawRoad(this.add.graphics().setDepth(0));

    // Targets
    this.targets = this.createTargets();

    // Muzzle flash layer (drawn at absolute coords, cleared after each volley)
    this.muzzleGfx = this.add.graphics().setDepth(60);

    // First shooter
    this.addShooter();

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Timers
    this.fireTimer = this.time.addEvent({
      delay: this.fireDelay,
      callback: this.fire,
      callbackScope: this,
      loop: true,
    });

    this.spawnTimer = this.time.addEvent({
      delay: this.spawnDelay,
      callback: this.spawnZombie,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 3000,
      callback: this.escalate,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 3000,
      callback: this.spawnSoldierUpgrade,
      callbackScope: this,
      loop: true,
    });
    this.spawnSoldierUpgrade();

    this.time.addEvent({
      delay: 3000,
      callback: this.spawnFireRateUpgrade,
      callbackScope: this,
      loop: true,
    });
    this.spawnFireRateUpgrade();

    // UI
    this.ui = this.add.text(12, 12, '', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
      lineSpacing: 5,
      shadow: { x: 1, y: 1, color: '#000', blur: 2, fill: true },
    }).setDepth(200);
    this.updateUI();
  }

  // ─── Road ────────────────────────────────────────────────────────────────

  drawRoad(g) {
    g.fillStyle(0x3a3a3a);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    // Side lanes slightly darker
    g.fillStyle(0x000000, 0.12);
    g.fillRect(0, 0, LANE_LM, HEIGHT);
    g.fillRect(LANE_MR, 0, WIDTH - LANE_MR, HEIGHT);

    // Lane divider dashes (yellow)
    const dashH = 40, gapH = 28;
    g.lineStyle(3, 0xddcc00, 0.65);
    for (let y = 0; y <= HEIGHT; y += dashH + gapH) {
      g.lineBetween(LANE_LM, y, LANE_LM, y + dashH);
      g.lineBetween(LANE_MR, y, LANE_MR, y + dashH);
    }

    // Road edges
    g.lineStyle(5, 0xdddddd, 0.85);
    g.lineBetween(1, 0, 1, HEIGHT);
    g.lineBetween(WIDTH - 1, 0, WIDTH - 1, HEIGHT);
  }

  // ─── Targets ─────────────────────────────────────────────────────────────

  createTargets() {
    const makeTarget = (x, type, label, color) => {
      const gfx  = this.add.graphics().setDepth(10);
      const text = this.add.text(x, TARGET_Y + 2, label, {
        fontSize: '9px', color: '#ffffff', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5).setDepth(11);
      const t = { x, y: TARGET_Y, type, color, active: true, gfx, text };
      this.renderTarget(t);
      return t;
    };

    return [];
  }

  renderTarget(t) {
    t.gfx.clear();
    const color = t.active ? t.color : 0x555555;
    const fill  = t.active ? 0.2 : 0.08;
    const stroke = t.active ? 0.9 : 0.35;
    t.gfx.lineStyle(2, color, stroke);
    t.gfx.fillStyle(color, fill);
    t.gfx.strokeCircle(t.x, t.y, TARGET_R);
    t.gfx.fillCircle(t.x, t.y, TARGET_R);
    t.text.setAlpha(t.active ? 1 : 0.35);
  }

  triggerTarget(t) {
    if (!t.active) return;
    t.active = false;
    this.renderTarget(t);

    if (t.type === 'soldiers') {
      this.addShooter();
    } else {
      this.applyFireRateLevel();
    }

    this.cameras.main.flash(200, 80, 80, 180);
    this.updateUI();

    // Cooldown: reactivate after 6 seconds
    this.time.addEvent({
      delay: 6000,
      callback: () => { t.active = true; this.renderTarget(t); },
    });
  }

  // ─── Shooters ─────────────────────────────────────────────────────────────

  addShooter() {
    const gfx = this.add.graphics().setDepth(55);
    this.drawPlayer(gfx);
    gfx.setScale(SHOOTER_SCALE);
    this.shooters.push({ gfx, rowOffset: 0, rowY: 0 });
    this.spreadShooters();
  }

  spreadShooters() {
    const n = this.shooters.length;
    this.shooters.forEach((s, i) => {
      const row       = Math.floor(i / MAX_PER_ROW);
      const posInRow  = i % MAX_PER_ROW;
      const rowSize   = Math.min(MAX_PER_ROW, n - row * MAX_PER_ROW);
      s.rowOffset = (posInRow - (rowSize - 1) / 2) * SHOOTER_SPREAD;
      s.rowY      = row * ROW_SPACING;
    });
  }

  drawPlayer(g) {
    // Compact back-view character (~50px body, ~76px to gun tip), drawn at origin (0, 0).
    const px = 0, py = 0;

    g.fillStyle(0x111111);
    g.fillRect(px - 9, py - 5,  8, 5);
    g.fillRect(px + 1, py - 5,  8, 5);

    g.fillStyle(0x1a2a44);
    g.fillRect(px - 8, py - 20, 7, 15);
    g.fillRect(px + 1, py - 20, 7, 15);

    g.fillStyle(0x5a3a18);
    g.fillRect(px - 10, py - 22, 20, 3);

    g.fillStyle(0x282828);
    g.fillRect(px - 11, py - 38, 22, 17);

    g.fillStyle(0x1e1e1e);
    g.fillPoints([
      { x: px - 11, y: py - 35 },
      { x: px + 11, y: py - 35 },
      { x: px + 15, y: py - 40 },
      { x: px - 15, y: py - 40 },
    ], true);

    g.fillStyle(0x282828);
    g.fillRect(px - 18, py - 40, 7, 22);
    g.fillRect(px + 11, py - 40, 7, 22);

    g.fillStyle(0xcc8855);
    g.fillCircle(px - 14, py - 20, 4);
    g.fillCircle(px + 14, py - 20, 4);

    g.fillStyle(0xcc8855);
    g.fillCircle(px, py - 48, 9);

    g.fillStyle(0x221100);
    g.fillRect(px - 8, py - 57, 16, 7);
    g.fillCircle(px - 8, py - 53, 4);
    g.fillCircle(px + 8, py - 53, 4);

    g.fillStyle(0x111111);
    g.fillRect(px - 3, py - 31, 6, 11);
    g.fillRect(px - 2, py - 74, 4, 45);
    g.fillRect(px - 3, py - 76, 6, 4);

    g.lineStyle(1, 0x444444);
    g.strokeRect(px - 3, py - 28, 6, 6);
  }

  // ─── Soldier upgrades ────────────────────────────────────────────────────

  spawnSoldierUpgrade() {
    if (this.dead) return;
    const roll = Math.random();
    const count = roll < 0.60 ? 1 : roll < 0.85 ? 2 : 3;
    const x = Phaser.Math.Between(30, LANE_LM - 30);
    const gfx  = this.add.graphics().setDepth(10);
    const text = this.add.text(x, -50, `+${count}`, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(11);
    const upgrade = { x, y: -50, count, gfx, text };
    this.renderSoldierUpgrade(upgrade);
    this.soldierUpgrades.push(upgrade);
  }

  renderSoldierUpgrade(u) {
    u.gfx.clear();
    u.gfx.lineStyle(2, 0x44cc66, 0.9);
    u.gfx.fillStyle(0x44cc66, 0.2);
    u.gfx.strokeCircle(u.x, u.y, TARGET_R);
    u.gfx.fillCircle(u.x, u.y, TARGET_R);
    u.text.setPosition(u.x, u.y + 2);
  }

  // ─── Fire rate upgrades ───────────────────────────────────────────────────

  spawnFireRateUpgrade() {
    if (this.dead) return;
    const levels = Math.random() < 0.70 ? 1 : 2;
    const x = Phaser.Math.Between(LANE_MR + 30, WIDTH - 30);
    const gfx  = this.add.graphics().setDepth(10);
    const text = this.add.text(x, -50, `+${levels}`, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(11);
    const upgrade = { x, y: -50, levels, gfx, text };
    this.renderFireRateUpgrade(upgrade);
    this.fireRateUpgrades.push(upgrade);
  }

  renderFireRateUpgrade(u) {
    u.gfx.clear();
    u.gfx.lineStyle(2, 0x44aaff, 0.9);
    u.gfx.fillStyle(0x44aaff, 0.2);
    u.gfx.strokeCircle(u.x, u.y, TARGET_R);
    u.gfx.fillCircle(u.x, u.y, TARGET_R);
    u.text.setPosition(u.x, u.y + 2);
  }

  applyFireRateLevel() {
    this.fireDelay = Math.max(FIRE_DELAY_MIN, Math.floor(this.fireDelay * 0.9));
    this.fireTimer.reset({
      delay: this.fireDelay,
      callback: this.fire,
      callbackScope: this,
      loop: true,
    });
  }

  // ─── Zombies ──────────────────────────────────────────────────────────────

  escalate() {
    if (this.dead || this.survivalPhase) return;
    const prev = this.spawnDelay;
    this.spawnDelay = Math.max(10, Math.floor(this.spawnDelay * 0.8));
    this.spawnTimer.reset({
      delay: this.spawnDelay,
      callback: this.spawnZombie,
      callbackScope: this,
      loop: true,
    });
    if (this.spawnDelay === 10 && prev > 10) {
      this.startSurvivalPhase();
    }
  }

  startSurvivalPhase() {
    this.survivalPhase = true;
    this.survivalSecondsLeft = 10;

    this.survivalLabel = this.add.text(WIDTH / 2, 55, 'SURVIVE!', {
      fontSize: '22px', color: '#ff4444', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(100);

    this.survivalCountdown = this.add.text(WIDTH / 2, 85, '10', {
      fontSize: '38px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(100);

    this.time.addEvent({
      delay: 1000,
      callback: this.survivalTick,
      callbackScope: this,
      repeat: 9,
    });
  }

  survivalTick() {
    if (this.dead) return;
    this.survivalSecondsLeft--;
    if (this.survivalSecondsLeft <= 0) {
      this.spawnTimer.remove(false);
      this.waitingForClear = true;
      this.survivalLabel.setText('FINISH THEM!');
      this.survivalCountdown.setVisible(false);
    } else {
      this.survivalCountdown.setText(String(this.survivalSecondsLeft));
    }
  }

  levelComplete() {
    this.dead = true;

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.75).setDepth(300);
    this.add.text(WIDTH / 2, HEIGHT / 2 - 50, 'YOU SURVIVED', {
      fontSize: '48px', color: '#44ff88', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 20, `zombies killed: ${this.score}`, {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 66, 'click to play again', {
      fontSize: '13px', color: '#777777', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301);

    this.input.once('pointerdown', () => this.scene.restart());
  }

  spawnZombie() {
    if (this.dead) return;
    const tmpl = pickZombieType();
    const x = Phaser.Math.Between(LANE_LM + 30, LANE_MR - 30);
    const gfx = this.add.graphics().setDepth(20);
    const z = {
      x, y: -50,
      health: tmpl.health, maxHealth: tmpl.health,
      speed: tmpl.speed, scale: tmpl.scale,
      legColor: tmpl.legColor, bodyColor: tmpl.bodyColor,
      headColor: tmpl.headColor, eyeColor: tmpl.eyeColor,
      gfx,
    };
    this.renderZombie(z);
    this.zombies.push(z);
  }

  renderZombie(z) {
    const g = z.gfx;
    const { x, y } = z;
    const s = z.scale;
    g.clear();

    g.fillStyle(z.legColor);
    g.fillRect(x - 8*s, y - 14*s, 7*s, 14*s);
    g.fillRect(x + 1*s, y - 14*s, 7*s, 14*s);

    g.fillStyle(z.bodyColor);
    g.fillRect(x - 9*s,  y - 28*s, 18*s, 15*s);
    g.fillRect(x - 17*s, y - 25*s, 8*s,  5*s);
    g.fillRect(x + 9*s,  y - 25*s, 8*s,  5*s);

    g.fillStyle(z.headColor);
    g.fillCircle(x, y - 38*s, 10*s);

    g.fillStyle(z.eyeColor);
    g.fillCircle(x - 3*s, y - 39*s, 2*s);
    g.fillCircle(x + 3*s, y - 39*s, 2*s);

    // Health bar
    const barW = 22*s, barH = 3, barX = x - barW / 2, barY = y - 52*s - 6;
    g.fillStyle(0x440000);
    g.fillRect(barX, barY, barW, barH);
    g.fillStyle(0xff4444);
    g.fillRect(barX, barY, Math.ceil(barW * (z.health / z.maxHealth)), barH);
  }

  // ─── Firing ───────────────────────────────────────────────────────────────

  fire() {
    if (this.dead) return;

    if (this.gunType === 'explosive') {
      this.explosiveSkip++;
      if (this.explosiveSkip < 5) return;
      this.explosiveSkip = 0;
    }

    this.muzzleGfx.clear();

    this.shooters.forEach(s => {
      const bx = this.playerX + s.rowOffset;
      const by = PLAYER_Y - s.rowY - GUN_TIP_Y;

      if (this.gunType === 'spread') {
        this.muzzleGfx.fillStyle(0xffcc44, 0.9);
        this.muzzleGfx.fillCircle(bx, by, 8);
        [-15, 0, 15].forEach(deg => {
          const rad = Phaser.Math.DegToRad(deg);
          const gfx = this.add.graphics().setDepth(40);
          const bullet = { x: bx, y: by, vx: Math.sin(rad) * BULLET_SPEED, vy: -Math.cos(rad) * BULLET_SPEED, damage: 1, type: 'spread', gfx };
          this.bullets.push(bullet);
          this.renderBullet(bullet);
        });
      } else if (this.gunType === 'explosive') {
        this.muzzleGfx.fillStyle(0xff6600, 0.9);
        this.muzzleGfx.fillCircle(bx, by, 12);
        const gfx = this.add.graphics().setDepth(40);
        const bullet = { x: bx, y: by, vx: 0, vy: -BULLET_SPEED * 0.6, damage: 1, type: 'explosive', aoeRadius: 105, aoeDamage: 12, gfx };
        this.bullets.push(bullet);
        this.renderBullet(bullet);
      } else {
        this.muzzleGfx.fillStyle(0xffff88, 0.9);
        this.muzzleGfx.fillCircle(bx, by, 6);
        this.muzzleGfx.fillStyle(0xffffff, 0.7);
        this.muzzleGfx.fillCircle(bx, by, 3);
        const gfx = this.add.graphics().setDepth(40);
        const bullet = { x: bx, y: by, vx: 0, vy: -BULLET_SPEED, damage: 1, type: 'standard', gfx };
        this.bullets.push(bullet);
        this.renderBullet(bullet);
      }
    });

    this.time.addEvent({ delay: 80, callback: () => this.muzzleGfx.clear() });
  }

  renderBullet(b) {
    b.gfx.clear();
    if (b.type === 'explosive') {
      b.gfx.fillStyle(0xff6600);
      b.gfx.fillCircle(b.x, b.y, 7);
      b.gfx.fillStyle(0xffcc00, 0.7);
      b.gfx.fillCircle(b.x, b.y, 4);
    } else if (b.type === 'spread') {
      b.gfx.fillStyle(0xffcc44);
      b.gfx.fillRect(b.x - 2, b.y - 8, 4, 14);
    } else {
      b.gfx.fillStyle(0xffee44);
      b.gfx.fillRect(b.x - 3, b.y - 10, 6, 20);
      b.gfx.fillStyle(0xffffff, 0.6);
      b.gfx.fillRect(b.x - 1, b.y - 8, 2, 16);
    }
  }

  // ─── Main loop ────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.dead) return;
    const dt = delta / 1000;

    // Gun type cycling
    const GUN_TYPES = ['standard', 'spread', 'explosive'];
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      const dir = Phaser.Input.Keyboard.JustDown(this.cursors.up) ? 1 : -1;
      const idx = GUN_TYPES.indexOf(this.gunType);
      this.gunType = GUN_TYPES[(idx + dir + GUN_TYPES.length) % GUN_TYPES.length];
      this.explosiveSkip = 0;
      this.updateUI();
    }

    // Player movement
    if (this.cursors.left.isDown) {
      this.playerX = Math.max(PLAYER_MIN_X, this.playerX - PLAYER_SPEED * dt);
    } else if (this.cursors.right.isDown) {
      this.playerX = Math.min(PLAYER_MAX_X, this.playerX + PLAYER_SPEED * dt);
    }
    this.shooters.forEach(s => {
      s.gfx.x = this.playerX + s.rowOffset;
      s.gfx.y = PLAYER_Y - s.rowY;
    });

    // Soldier upgrades move down
    for (let i = this.soldierUpgrades.length - 1; i >= 0; i--) {
      const u = this.soldierUpgrades[i];
      u.y += dt * ZOMBIE_SPEED;
      if (u.y > HEIGHT + 50) {
        u.gfx.destroy();
        u.text.destroy();
        this.soldierUpgrades.splice(i, 1);
        continue;
      }
      this.renderSoldierUpgrade(u);
    }

    // Fire rate upgrades move down
    for (let i = this.fireRateUpgrades.length - 1; i >= 0; i--) {
      const u = this.fireRateUpgrades[i];
      u.y += dt * ZOMBIE_SPEED;
      if (u.y > HEIGHT + 50) {
        u.gfx.destroy();
        u.text.destroy();
        this.fireRateUpgrades.splice(i, 1);
        continue;
      }
      this.renderFireRateUpgrade(u);
    }

    // Zombies move down
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      z.y += dt * z.speed;
      // Zombie vs soldier collision
      let killedSoldier = false;
      for (let k = this.shooters.length - 1; k >= 0; k--) {
        const s = this.shooters[k];
        const sx = this.playerX + s.rowOffset;
        const sy = PLAYER_Y - s.rowY;
        if (Math.abs(z.x - sx) < 20 && Math.abs(z.y - sy) < 40) {
          s.gfx.destroy();
          this.shooters.splice(k, 1);
          this.spreadShooters();
          this.updateUI();
          killedSoldier = true;
          break;
        }
      }
      if (killedSoldier) { this.renderZombie(z); continue; }

      if (z.y > PLAYER_Y - 25) {
        z.gfx.destroy();
        this.zombies.splice(i, 1);
        this.lives = Math.max(0, this.lives - 1);
        this.cameras.main.shake(180, 0.006);
        this.updateUI();
        if (this.lives <= 0) { this.gameOver(); return; }
        continue;
      }
      this.renderZombie(z);
    }

    // Bullets move up
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += dt * b.vx;
      b.y += dt * b.vy;

      if (b.y < -20 || b.x < -50 || b.x > WIDTH + 50) {
        b.gfx.destroy();
        this.bullets.splice(i, 1);
        continue;
      }

      // Target collision
      let used = false;
      for (const t of this.targets) {
        if (t.active && Math.abs(b.x - t.x) < TARGET_R && Math.abs(b.y - t.y) < TARGET_R) {
          b.gfx.destroy();
          this.bullets.splice(i, 1);
          this.triggerTarget(t);
          used = true;
          break;
        }
      }
      if (used) continue;

      // Soldier upgrade collision
      let upgraded = false;
      for (let k = this.soldierUpgrades.length - 1; k >= 0; k--) {
        const u = this.soldierUpgrades[k];
        if (Math.abs(b.x - u.x) < TARGET_R && Math.abs(b.y - u.y) < TARGET_R) {
          for (let n = 0; n < u.count; n++) this.addShooter();
          u.gfx.destroy();
          u.text.destroy();
          this.soldierUpgrades.splice(k, 1);
          b.gfx.destroy();
          this.bullets.splice(i, 1);
          this.cameras.main.flash(200, 80, 80, 180);
          this.updateUI();
          upgraded = true;
          break;
        }
      }
      if (upgraded) continue;

      // Fire rate upgrade collision
      let sped = false;
      for (let k = this.fireRateUpgrades.length - 1; k >= 0; k--) {
        const u = this.fireRateUpgrades[k];
        if (Math.abs(b.x - u.x) < TARGET_R && Math.abs(b.y - u.y) < TARGET_R) {
          for (let n = 0; n < u.levels; n++) this.applyFireRateLevel();
          u.gfx.destroy();
          u.text.destroy();
          this.fireRateUpgrades.splice(k, 1);
          b.gfx.destroy();
          this.bullets.splice(i, 1);
          this.cameras.main.flash(200, 80, 80, 180);
          this.updateUI();
          sped = true;
          break;
        }
      }
      if (sped) continue;

      // Zombie collision
      let hit = false;
      for (let j = this.zombies.length - 1; j >= 0; j--) {
        const z = this.zombies[j];
        if (Math.abs(b.x - z.x) < 14 * z.scale && Math.abs(b.y - (z.y - 25 * z.scale)) < 30 * z.scale) {
          if (b.type === 'explosive') {
            this.explode(b.x, b.y, b.aoeRadius, b.aoeDamage);
          } else {
            z.health -= b.damage;
            if (z.health <= 0) {
              z.gfx.destroy();
              this.zombies.splice(j, 1);
              this.score++;
              this.updateUI();
            }
          }
          hit = true;
          break;
        }
      }

      if (hit) {
        b.gfx.destroy();
        this.bullets.splice(i, 1);
      } else {
        this.renderBullet(b);
      }
    }

    // Level complete once spawning has stopped and all zombies are cleared
    if (this.waitingForClear && this.zombies.length === 0) {
      this.levelComplete();
    }
  }

  // ─── Explosion ───────────────────────────────────────────────────────────

  explode(x, y, radius, damage) {
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0xff6600, 0.55);
    g.fillCircle(x, y, radius);
    g.fillStyle(0xffcc00, 0.4);
    g.fillCircle(x, y, radius * 0.5);
    this.time.addEvent({ delay: 220, callback: () => g.destroy() });

    for (let j = this.zombies.length - 1; j >= 0; j--) {
      const z = this.zombies[j];
      if (Phaser.Math.Distance.Between(x, y, z.x, z.y - 25 * z.scale) < radius) {
        z.health -= damage;
        if (z.health <= 0) {
          z.gfx.destroy();
          this.zombies.splice(j, 1);
          this.score++;
        }
      }
    }
    this.updateUI();
  }

  // ─── UI / end ─────────────────────────────────────────────────────────────



  updateUI() {
    this.ui.setText([
      `lives:    ${this.lives}`,
      `killed:   ${this.score}`,
      `soldiers: ${this.shooters.length}`,
      `gun:      ${this.gunType}`,
    ]);
  }

  gameOver() {
    if (this.dead) return;
    this.dead = true;

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.75).setDepth(300);
    this.add.text(WIDTH / 2, HEIGHT / 2 - 44, 'OVERRUN', {
      fontSize: '58px', color: '#ff3333', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 24, `zombies killed: ${this.score}`, {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 68, 'click to play again', {
      fontSize: '13px', color: '#777777', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(301);

    this.input.once('pointerdown', () => this.scene.restart());
  }
}

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#3a3a3a',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [GameScene],
};

new Phaser.Game(config);
