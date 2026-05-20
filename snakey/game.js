const WIDTH = 800;
const HEIGHT = 600;
const CELL = 20;
const COLS = WIDTH / CELL;   // 40
const ROWS = HEIGHT / CELL;  // 30
const TICK = 120; // ms per move

const FOOD_SIZES  = [1, 4, 9];
const FOOD_SCORES = { 1: 1, 4: 3, 9: 6 };
const FOOD_COLORS = { 1: 0xff4455, 4: 0xff8800, 9: 0xffcc00 };

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.snake = [
      { x: 22, y: 15 },
      { x: 21, y: 15 },
      { x: 20, y: 15 },
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.score = 0;
    this.dead = false;
    this.elapsed = 0;
    this.hazards = [];

    // Graphics layers
    this.gfx = this.add.graphics();
    this.foodGfx = this.add.graphics();

    // Score text
    this.scoreTxt = this.add.text(10, 8, 'Score: 0', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    // Game over overlay (hidden)
    this.overlay = this.add.graphics();
    this.gameOverTxt = this.add.text(WIDTH / 2, HEIGHT / 2 - 20, '', {
      fontSize: '40px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);
    this.restartTxt = this.add.text(WIDTH / 2, HEIGHT / 2 + 36, '', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-R', () => { if (this.dead) this.scene.restart(); });
    this.input.keyboard.on('keydown-SPACE', () => { if (this.dead) this.scene.restart(); });

    this.spawnFood();
  }

  isFree(x, y) {
    if (this.snake.some(s => s.x === x && s.y === y)) return false;
    if (this.hazards.some(h => {
      const dim = Math.sqrt(h.size);
      return x >= h.x && x < h.x + dim && y >= h.y && y < h.y + dim;
    })) return false;
    if (this.food) {
      const dim = Math.sqrt(this.food.size);
      if (x >= this.food.x && x < this.food.x + dim && y >= this.food.y && y < this.food.y + dim) return false;
    }
    return true;
  }

  isBlockFree(x, y, dim) {
    for (let dy = 0; dy < dim; dy++) {
      for (let dx = 0; dx < dim; dx++) {
        if (!this.isFree(x + dx, y + dy)) return false;
      }
    }
    return true;
  }

  randomFreeBlock(size) {
    const dim = Math.sqrt(size);
    let x, y, tries = 0;
    do {
      x = Phaser.Math.Between(0, COLS - dim);
      y = Phaser.Math.Between(0, ROWS - dim);
      tries++;
    } while (tries < 2000 && !this.isBlockFree(x, y, dim));
    return { x, y };
  }

  spawnFood() {
    this.food = null; // clear first so old cells don't block new spawn
    const size = FOOD_SIZES[Phaser.Math.Between(0, 2)];
    this.food = { ...this.randomFreeBlock(size), size };
  }

  spawnHazard(size) {
    this.hazards.push({ ...this.randomFreeBlock(size), size });
  }

  readInput() {
    const up    = this.cursors.up.isDown    || this.wasd.W.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.S.isDown;
    const left  = this.cursors.left.isDown  || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;

    if (up    && this.dir.y !== 1)  this.nextDir = { x: 0, y: -1 };
    if (down  && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
    if (left  && this.dir.x !== 1)  this.nextDir = { x: -1, y: 0 };
    if (right && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
  }

  tick() {
    this.dir = this.nextDir;

    const head = {
      x: this.snake[0].x + this.dir.x,
      y: this.snake[0].y + this.dir.y,
    };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      this.die();
      return;
    }

    // Self collision
    if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.die();
      return;
    }

    // Hazard collision
    if (this.hazards.some(h => {
      const dim = Math.sqrt(h.size);
      return head.x >= h.x && head.x < h.x + dim && head.y >= h.y && head.y < h.y + dim;
    })) {
      this.die();
      return;
    }

    this.snake.unshift(head);

    const foodDim = Math.sqrt(this.food.size);
    const ateFood = head.x >= this.food.x && head.x < this.food.x + foodDim &&
                    head.y >= this.food.y && head.y < this.food.y + foodDim;

    if (ateFood) {
      const eatenSize = this.food.size;
      this.score += FOOD_SCORES[eatenSize];
      this.scoreTxt.setText('Score: ' + this.score);
      this.spawnFood();
      this.spawnHazard(eatenSize);
    } else {
      this.snake.pop();
    }
  }

  die() {
    this.dead = true;
    this.overlay.fillStyle(0x000000, 0.55);
    this.overlay.fillRect(0, 0, WIDTH, HEIGHT);
    this.gameOverTxt.setText('GAME OVER').setVisible(true);
    this.restartTxt.setText('Score: ' + this.score + '   |   Press R or Space to restart').setVisible(true);
  }

  draw() {
    this.gfx.clear();

    // Grid lines (subtle)
    this.gfx.lineStyle(1, 0x222233, 1);
    for (let x = 0; x <= COLS; x++) this.gfx.lineBetween(x * CELL, 0, x * CELL, HEIGHT);
    for (let y = 0; y <= ROWS; y++) this.gfx.lineBetween(0, y * CELL, WIDTH, y * CELL);

    // Snake body
    this.snake.forEach((seg, i) => {
      const green = i === 0 ? 0x44ff88 : 0x22cc66;
      this.gfx.fillStyle(green, 1);
      this.gfx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });

    // Eyes on head
    const h = this.snake[0];
    this.gfx.fillStyle(0x000000, 1);
    const eyeOffsets = this.eyePositions();
    eyeOffsets.forEach(e => this.gfx.fillCircle(h.x * CELL + e.x, h.y * CELL + e.y, 2.5));

    // Hazards
    this.hazards.forEach(h => {
      const dim = Math.sqrt(h.size);
      const sz = dim * CELL;
      this.gfx.fillStyle(0xffffff, 1);
      this.gfx.fillRect(h.x * CELL + 1, h.y * CELL + 1, sz - 2, sz - 2);
    });

    // Food
    this.foodGfx.clear();
    const foodDim = Math.sqrt(this.food.size);
    const fw = foodDim * CELL;
    const cx = this.food.x * CELL + fw / 2;
    const cy = this.food.y * CELL + fw / 2;
    const r = fw / 2 - 3;
    this.foodGfx.fillStyle(FOOD_COLORS[this.food.size], 1);
    this.foodGfx.fillCircle(cx, cy, r);
    // shine
    this.foodGfx.fillStyle(0xffffff, 0.5);
    this.foodGfx.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.25);
  }

  eyePositions() {
    const d = this.dir;
    const c = CELL;
    if (d.x === 1)  return [{ x: c - 5, y: 4 },     { x: c - 5, y: c - 6 }];
    if (d.x === -1) return [{ x: 4,     y: 4 },     { x: 4,     y: c - 6 }];
    if (d.y === -1) return [{ x: 4,     y: 4 },     { x: c - 6, y: 4 }];
    if (d.y === 1)  return [{ x: 4,     y: c - 5 }, { x: c - 6, y: c - 5 }];
    return [];
  }

  update(_, delta) {
    if (this.dead) return;

    this.readInput();

    this.elapsed += delta;
    if (this.elapsed >= TICK) {
      this.elapsed -= TICK;
      this.tick();
    }

    this.draw();
  }
}

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#0d0d1a',
  scene: [GameScene],
};

new Phaser.Game(config);
