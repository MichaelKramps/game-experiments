const WIDTH = 800;
const HEIGHT = 600;
const CELL = 20;
const COLS = WIDTH / CELL;   // 40
const ROWS = HEIGHT / CELL;  // 30
const TICK = 120; // ms per move

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

  isFree(pos) {
    if (this.snake.some(s => s.x === pos.x && s.y === pos.y)) return false;
    if (this.hazards.some(h => h.x === pos.x && h.y === pos.y)) return false;
    if (this.food && this.food.x === pos.x && this.food.y === pos.y) return false;
    return true;
  }

  randomFreeCell() {
    let pos;
    do {
      pos = {
        x: Phaser.Math.Between(0, COLS - 1),
        y: Phaser.Math.Between(0, ROWS - 1),
      };
    } while (!this.isFree(pos));
    return pos;
  }

  spawnFood() {
    this.food = this.randomFreeCell();
  }

  spawnHazard() {
    this.hazards.push(this.randomFreeCell());
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
    if (this.hazards.some(h => h.x === head.x && h.y === head.y)) {
      this.die();
      return;
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      this.scoreTxt.setText('Score: ' + this.score);
      this.spawnFood();
      this.spawnHazard();
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
      this.gfx.fillStyle(0xffffff, 1);
      this.gfx.fillRect(h.x * CELL + 1, h.y * CELL + 1, CELL - 2, CELL - 2);
    });

    // Food
    this.foodGfx.clear();
    this.foodGfx.fillStyle(0xff4455, 1);
    const fx = this.food.x * CELL + CELL / 2;
    const fy = this.food.y * CELL + CELL / 2;
    this.foodGfx.fillCircle(fx, fy, CELL / 2 - 2);
    // shine
    this.foodGfx.fillStyle(0xffffff, 0.5);
    this.foodGfx.fillCircle(fx - 3, fy - 3, 3);
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
