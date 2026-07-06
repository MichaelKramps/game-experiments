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
    this.score = 0;

    this.selectedText = this.add.text(WIDTH / 2, TOP_PADDING + HEADER_HEIGHT / 2, '', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(10, 8, 'Score: 0', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });

    for (let row = 0; row < GRID_SIZE; row++) {
      const rowCells = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = SIDE_PADDING + col * CELL;
        const y = GRID_TOP + row * CELL;

        const rect = this.add.rectangle(x + CELL / 2, y + CELL / 2, CELL - 2, CELL - 2, COLOR_CELL)
          .setStrokeStyle(1, COLOR_BORDER);

        const text = this.add.text(x + CELL / 2, y + CELL / 2, '', {
          fontSize: '28px',
          fontFamily: 'monospace',
          color: '#44ff88',
        }).setOrigin(0.5).setDepth(2);

        const cell = { letter: null, text, rect };
        this.setCellLetter(cell, randomLetter());
        rowCells.push(cell);
      }
      this.grid.push(rowCells);
    }

    // Sits above the tile backgrounds but below the letters, so arrows don't
    // obscure the glyph at either end.
    this.arrowGfx = this.add.graphics().setDepth(1);

    this.input.on('pointerdown', (pointer) => {
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
      }
      this.clearSelection();
    });
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
    this.resetCellVisual(cell);
  }

  setCellEmpty(cell) {
    cell.letter = null;
    cell.text.setText('');
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
        if (!removedRows.has(row)) survivors.push({ letter: this.grid[row][col].letter, fromRow: row });
      }

      const emptyCount = GRID_SIZE - survivors.length;
      for (let row = 0; row < GRID_SIZE; row++) {
        const cell = this.grid[row][col];
        if (row < emptyCount) {
          this.setCellEmpty(cell);
        } else {
          const survivor = survivors[row - emptyCount];
          this.setCellLetter(cell, survivor.letter);
          if (survivor.fromRow !== row) this.animateFall(cell, survivor.fromRow, row, col);
        }
      }
    }
  }

  animateFall(cell, fromRow, toRow, col) {
    // Drop the tile (background + glyph together) in from where it used to
    // be and let it settle into its new slot, easing in like it's
    // accelerating under gravity.
    const fromY = this.cellCenter({ row: fromRow, col }).y;
    const toY = this.cellCenter({ row: toRow, col }).y;
    cell.rect.y = fromY;
    cell.text.y = fromY;
    this.tweens.add({
      targets: [cell.rect, cell.text],
      y: toY,
      duration: (toRow - fromRow) * FALL_MS_PER_ROW,
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
    this.scoreText.setText(`Score: ${this.score}`);
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
