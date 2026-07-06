const GRID_SIZE = 8;
const CELL = 64;
const GRID_PIXELS = GRID_SIZE * CELL;
const SIDE_PADDING = 40;
const TOP_PADDING = 40;
const HEADER_HEIGHT = 40;
const HEADER_GAP = 20;
const BOTTOM_PADDING = 40;
const GRID_TOP = TOP_PADDING + HEADER_HEIGHT + HEADER_GAP;

const WIDTH = GRID_PIXELS + SIDE_PADDING * 2;
const HEIGHT = GRID_TOP + GRID_PIXELS + BOTTOM_PADDING;

const COLOR_CELL = 0x1a1a2e;
const COLOR_CELL_SELECTED = 0x2a5a3a;
const COLOR_BORDER = 0x2a2a4a;
const COLOR_BORDER_SELECTED = 0x44ff88;
const COLOR_ARROW = 0x44ff88;
const ARROW_INSET = CELL * 0.22;
const ARROWHEAD_LEN = 10;
const FALL_MS_PER_ROW = 90;

const LETTER_FONT_SIZE = 28;
const VALUE_FONT_SIZE = 10;
const VALUE_INSET = 8;
const COLOR_VALUE_TEXT = '#555555';
const COLOR_LETTER_TEXT = '#44ff88';

// Rough English letter frequency so boards feel more word-friendly than pure A-Z.
const LETTER_BAG = 'EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNNRRRRRRRTTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';

const DICTIONARY_URL = 'words_alpha.txt';
const COLOR_TEXT_DEFAULT = '#ffffff';
const COLOR_TEXT_VALID = '#44ff88';

const SCRABBLE_SCORES = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

// Difficulty ticks up every 5 levels. Each difficulty tier defines how many
// points a word is expected to score, and a 10-value range for how many
// words a level demands; the 5 levels in a tier draw unique word counts from
// that range so the same count never repeats within a tier.
const LEVELS_PER_DIFFICULTY = 5;
const BASE_POINTS_PER_WORD = 4;
const BASE_WORD_COUNT_MIN = 3;
const BASE_WORD_COUNT_MAX = 12;
const WORD_COUNT_RANGE_SHIFT = 2;
const FIRST_LEVEL_WORD_COUNT = 3;

function difficultyForLevel(level) {
  return Math.floor((level - 1) / LEVELS_PER_DIFFICULTY);
}

function pointsPerWordForDifficulty(difficulty) {
  return BASE_POINTS_PER_WORD + difficulty;
}

function wordCountRangeForDifficulty(difficulty) {
  return {
    min: BASE_WORD_COUNT_MIN + difficulty * WORD_COUNT_RANGE_SHIFT,
    max: BASE_WORD_COUNT_MAX + difficulty * WORD_COUNT_RANGE_SHIFT,
  };
}

function shuffled(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomLetter() {
  return LETTER_BAG[Math.floor(Math.random() * LETTER_BAG.length)];
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    const loadingText = this.add.text(WIDTH / 2, HEIGHT / 2, 'Loading dictionary...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      loadingText.setText(`Loading dictionary... ${Math.round(value * 100)}%`);
    });
    this.load.on('complete', () => loadingText.destroy());

    this.load.text('dictionary', DICTIONARY_URL);
  }

  create() {
    const dictionaryText = this.cache.text.get('dictionary') || '';
    this.wordSet = new Set(
      dictionaryText.split('\n').map((w) => w.trim().toUpperCase()).filter(Boolean)
    );

    this.grid = [];
    this.selected = [];
    this.selectedKeys = new Set();
    this.dragging = false;
    this.gameOver = false;
    this.levelComplete = false;
    this.difficulty = -1;
    this.wordCountPool = [];

    this.selectedText = this.add.text(WIDTH / 2, TOP_PADDING + HEADER_HEIGHT / 2, '', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.levelText = this.add.text(10, 8, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: COLOR_TEXT_DEFAULT,
    });

    this.scoreText = this.add.text(10, 28, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: COLOR_TEXT_DEFAULT,
    });

    this.movesText = this.add.text(10, 48, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: COLOR_TEXT_DEFAULT,
    });

    for (let row = 0; row < GRID_SIZE; row++) {
      const rowCells = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = SIDE_PADDING + col * CELL;
        const y = GRID_TOP + row * CELL;

        const rect = this.add.rectangle(x + CELL / 2, y + CELL / 2, CELL - 2, CELL - 2, COLOR_CELL)
          .setStrokeStyle(1, COLOR_BORDER);

        const text = this.add.text(x + CELL / 2, y + CELL / 2, '', {
          fontSize: `${LETTER_FONT_SIZE}px`,
          fontFamily: 'monospace',
          color: COLOR_LETTER_TEXT,
        }).setOrigin(0.5).setDepth(2);

        const valueText = this.add.text(x + CELL - VALUE_INSET, y + VALUE_INSET, '', {
          fontSize: `${VALUE_FONT_SIZE}px`,
          fontFamily: 'monospace',
          color: COLOR_VALUE_TEXT,
        }).setOrigin(1, 0).setDepth(2);

        rowCells.push({ letter: null, text, valueText, rect });
      }
      this.grid.push(rowCells);
    }

    // Sits above the tile backgrounds but below the letters, so arrows don't
    // obscure the glyph at either end.
    this.arrowGfx = this.add.graphics().setDepth(1);

    this.startLevel(1);

    this.input.on('pointerdown', (pointer) => {
      if (this.gameOver) {
        this.scene.restart();
        return;
      }
      if (this.levelComplete) return;
      const cell = this.cellAt(pointer.x, pointer.y);
      if (!cell) return;
      this.dragging = true;
      this.trySelect(cell.row, cell.col);
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.dragging) return;
      const cell = this.cellAt(pointer.x, pointer.y);
      if (!cell) return;
      this.trySelect(cell.row, cell.col);
    });

    this.input.on('pointerup', () => {
      this.dragging = false;
      if (this.isValidWord) {
        this.awardScore();
        this.removeAndCollapse(this.selected);
        this.registerMove();
      }
      this.clearSelection();
    });

    this.input.keyboard.on('keydown-R', () => {
      if (this.gameOver) this.scene.restart();
    });
  }

  startLevel(level) {
    this.level = level;
    const difficulty = difficultyForLevel(level);

    if (difficulty !== this.difficulty) {
      this.difficulty = difficulty;
      const { min, max } = wordCountRangeForDifficulty(difficulty);
      const range = [];
      for (let n = min; n <= max; n++) range.push(n);

      if (level === 1) {
        // Level 1 always eases players in with a fixed word count; the rest
        // of this tier draws unique counts from what's left of the range.
        const rest = range.filter((n) => n !== FIRST_LEVEL_WORD_COUNT);
        this.wordCountPool = shuffled(rest).slice(0, LEVELS_PER_DIFFICULTY - 1);
      } else {
        this.wordCountPool = shuffled(range).slice(0, LEVELS_PER_DIFFICULTY);
      }
    }

    const wordCount = level === 1 ? FIRST_LEVEL_WORD_COUNT : this.wordCountPool.pop();
    this.pointsPerWord = pointsPerWordForDifficulty(difficulty);
    this.movesRemaining = wordCount;
    this.targetScore = this.pointsPerWord * wordCount;
    this.score = 0;
    this.resetBoard();
    this.updateHud();

    if (level > 1) {
      this.levelText.setColor(COLOR_TEXT_VALID);
      this.time.delayedCall(400, () => this.levelText.setColor(COLOR_TEXT_DEFAULT));
    }
  }

  resetBoard() {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.grid[row][col];
        // A tile mid-fall from the word that just finished the level could
        // still be tweening; kill it and snap back to its home position
        // before handing the slot a fresh letter.
        this.tweens.killTweensOf([cell.rect, cell.text, cell.valueText]);
        const y = GRID_TOP + row * CELL;
        cell.rect.y = y + CELL / 2;
        cell.text.y = y + CELL / 2;
        cell.valueText.y = y + VALUE_INSET;
        this.setCellLetter(cell, randomLetter());
      }
    }
  }

  registerMove() {
    this.movesRemaining -= 1;
    if (this.score >= this.targetScore) {
      this.levelUp();
    } else if (this.movesRemaining <= 0) {
      this.triggerGameOver();
    } else {
      this.updateHud();
    }
  }

  levelUp() {
    this.levelComplete = true;
    const completedLevel = this.level;
    const completedScore = this.score;
    const completedTarget = this.targetScore;

    const summary = this.showOverlayMessage(
      `LEVEL ${completedLevel} COMPLETE!\n\nScore: ${completedScore} / ${completedTarget}`,
      COLOR_TEXT_VALID
    );

    const button = this.add.text(WIDTH / 2, HEIGHT / 2 + 70, 'PROCEED', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#2f6fed',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      summary.destroy();
      button.destroy();
      this.startLevel(completedLevel + 1);
      // Clear the flag next tick so this same click can't also fall through
      // to the scene's pointerdown handler and start selecting a tile.
      this.time.delayedCall(0, () => {
        this.levelComplete = false;
      });
    });
  }

  triggerGameOver() {
    this.gameOver = true;
    this.updateHud();
    this.showOverlayMessage(
      `GAME OVER\nReached Level ${this.level}\n\nClick or press R to restart`,
      '#ffffff'
    );
  }

  showOverlayMessage(message, color) {
    return this.add.text(WIDTH / 2, HEIGHT / 2, message, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color,
      align: 'center',
      backgroundColor: '#0d0d1acc',
      padding: { x: 20, y: 16 },
    }).setOrigin(0.5).setDepth(10);
  }

  updateHud() {
    this.levelText.setText(`Level ${this.level}`);
    this.scoreText.setText(`Score: ${this.score} / ${this.targetScore}`);
    this.movesText.setText(`Moves: ${this.movesRemaining}`);
  }

  cellAt(x, y) {
    const gridX = x - SIDE_PADDING;
    const gridY = y - GRID_TOP;
    if (gridX < 0 || gridY < 0) return null;

    const col = Math.floor(gridX / CELL);
    const row = Math.floor(gridY / CELL);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;

    // Ignore the outer 20% margin of each cell so diagonal drags don't
    // clip a corner and select the wrong tile.
    const margin = CELL * 0.2;
    const localX = gridX - col * CELL;
    const localY = gridY - row * CELL;
    if (localX < margin || localX > CELL - margin || localY < margin || localY > CELL - margin) return null;

    return { row, col };
  }

  trySelect(row, col) {
    const cell = this.grid[row][col];
    if (!cell.letter) return; // holes left behind by a cleared word can't be selected

    const key = `${row},${col}`;
    if (this.selectedKeys.has(key)) return;

    if (this.selected.length > 0) {
      const last = this.selected[this.selected.length - 1];
      const touching = Math.abs(row - last.row) <= 1 && Math.abs(col - last.col) <= 1;
      if (!touching) return;
    }

    cell.rect.setFillStyle(COLOR_CELL_SELECTED);
    cell.rect.setStrokeStyle(2, COLOR_BORDER_SELECTED);

    this.selected.push({ row, col, letter: cell.letter });
    this.selectedKeys.add(key);
    this.updateSelectedText();

    if (this.selected.length > 1) {
      this.drawArrow(this.selected[this.selected.length - 2], this.selected[this.selected.length - 1]);
    }
  }

  clearSelection() {
    for (const { row, col } of this.selected) {
      this.resetCellVisual(this.grid[row][col]);
    }
    this.selected = [];
    this.selectedKeys.clear();
    this.updateSelectedText();
    this.arrowGfx.clear();
  }

  resetCellVisual(cell) {
    const alpha = cell.letter ? 1 : 0.25;
    cell.rect.setFillStyle(COLOR_CELL, alpha);
    cell.rect.setStrokeStyle(1, COLOR_BORDER, alpha);
  }

  setCellLetter(cell, letter) {
    cell.letter = letter;
    cell.text.setText(letter);
    cell.valueText.setText(String(SCRABBLE_SCORES[letter] || ''));
    this.resetCellVisual(cell);
  }

  setCellEmpty(cell) {
    cell.letter = null;
    cell.text.setText('');
    cell.valueText.setText('');
    this.resetCellVisual(cell);
  }

  removeAndCollapse(selectedCells) {
    const removedByCol = new Map();
    for (const { row, col } of selectedCells) {
      if (!removedByCol.has(col)) removedByCol.set(col, new Set());
      removedByCol.get(col).add(row);
    }

    for (const [col, removedRows] of removedByCol) {
      const survivors = [];
      for (let row = 0; row < GRID_SIZE; row++) {
        if (removedRows.has(row)) continue;
        const source = this.grid[row][col];
        if (!source.letter) continue; // already a hole; don't drag it along as a "survivor"
        survivors.push({ letter: source.letter, fromRow: row });
      }

      const emptyCount = GRID_SIZE - survivors.length;
      for (let row = 0; row < GRID_SIZE; row++) {
        const cell = this.grid[row][col];
        if (row < emptyCount) {
          this.setCellEmpty(cell);
        } else {
          const survivor = survivors[row - emptyCount];
          this.setCellLetter(cell, survivor.letter);
          if (survivor.fromRow !== row) this.animateFall(cell, survivor.fromRow, row);
        }
      }
    }
  }

  animateFall(cell, fromRow, toRow) {
    // Drop the tile (background + glyph + value label together) in from
    // where it used to be and let it settle into its new slot, easing in
    // like it's accelerating under gravity. Each object keeps its own
    // permanent y (rect/glyph are center-anchored, the value label is
    // top-anchored), so shift by a relative delta rather than an absolute y.
    const rowsFallen = toRow - fromRow;
    const deltaY = rowsFallen * CELL;
    const targets = [cell.rect, cell.text, cell.valueText];

    for (const target of targets) target.y -= deltaY;

    this.tweens.add({
      targets,
      y: `+=${deltaY}`,
      duration: rowsFallen * FALL_MS_PER_ROW,
      ease: 'Quad.easeIn',
    });
  }

  updateSelectedText() {
    const word = this.selected.map((s) => s.letter).join('');
    this.isValidWord = word.length > 0 && this.wordSet.has(word);
    this.selectedText.setText(word);
    this.selectedText.setColor(this.isValidWord ? COLOR_TEXT_VALID : COLOR_TEXT_DEFAULT);
  }

  awardScore() {
    const points = this.selected.reduce((sum, s) => sum + (SCRABBLE_SCORES[s.letter] || 0), 0);
    this.score += points;
  }

  cellCenter({ row, col }) {
    return {
      x: SIDE_PADDING + col * CELL + CELL / 2,
      y: GRID_TOP + row * CELL + CELL / 2,
    };
  }

  drawArrow(from, to) {
    const start = this.cellCenter(from);
    const end = this.cellCenter(to);

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    const ux = dx / dist;
    const uy = dy / dist;
    // Keep the line clear of the letter glyph at both ends.
    const sx = start.x + ux * ARROW_INSET;
    const sy = start.y + uy * ARROW_INSET;
    const ex = end.x - ux * ARROW_INSET;
    const ey = end.y - uy * ARROW_INSET;

    this.arrowGfx.lineStyle(3, COLOR_ARROW, 1);
    this.arrowGfx.lineBetween(sx, sy, ex, ey);

    const angle = Math.atan2(ey - sy, ex - sx);
    const a1 = angle + Math.PI * 0.8;
    const a2 = angle - Math.PI * 0.8;

    this.arrowGfx.fillStyle(COLOR_ARROW, 1);
    this.arrowGfx.beginPath();
    this.arrowGfx.moveTo(ex, ey);
    this.arrowGfx.lineTo(ex + Math.cos(a1) * ARROWHEAD_LEN, ey + Math.sin(a1) * ARROWHEAD_LEN);
    this.arrowGfx.lineTo(ex + Math.cos(a2) * ARROWHEAD_LEN, ey + Math.sin(a2) * ARROWHEAD_LEN);
    this.arrowGfx.closePath();
    this.arrowGfx.fillPath();
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
