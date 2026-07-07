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
const COLOR_ARROW = 0x44ff88;
const ARROW_INSET = CELL * 0.22;
const ARROWHEAD_LEN = 10;
const FALL_MS_PER_ROW = 90;

const RECT_DEPTH = 0;
const TEXT_DEPTH = 2;
// A glowing tile's edge-bleeding effect needs to render above neighboring
// tiles, so it's elevated past every normal depth above; its own glyphs are
// bumped further still so they stay on top of their own background.
const GLOW_RECT_DEPTH = 3;
const GLOW_TEXT_DEPTH = 4;
// Above everything, including glow-elevated tiles — the line's endpoints
// already stop short of each tile's center (ARROW_INSET), so it never
// actually overlaps a letter glyph regardless of z-order.
const ARROW_DEPTH = 5;
const BLAST_DEPTH = 6;

// When a scored word qualifies for a refill bonus, each of its tiles fires a
// streak straight up its column to the top of the grid, where the
// powered-up replacement tile is about to fall in from.
const COLOR_BLAST = 0xff2fd6;
const BLAST_WIDTH = 10;
const BLAST_MS_PER_ROW = 40;
const EXPLOSION_DURATION = 200;

const LETTER_FONT_SIZE = 28;
const VALUE_FONT_SIZE = 10;
const VALUE_INSET = 8;
const COLOR_VALUE_TEXT = '#555555';
const COLOR_LETTER_TEXT = '#44ff88';
const COLOR_VALUE_POWERED = '#e085ff';

// Every newly-created tile independently rolls each of these; if more than
// one hits, the tile is powered up by the highest bonus that landed.
const POWER_UP_ROLLS = [
  { chance: 0.05, bonus: 1 },
  { chance: 0.03, bonus: 3 },
  { chance: 0.01, bonus: 5 },
];

function rollPowerUpBonus() {
  let bonus = 0;
  for (const roll of POWER_UP_ROLLS) {
    if (Math.random() < roll.chance) bonus = Math.max(bonus, roll.bonus);
  }
  return bonus;
}

// Scoring a word this long or longer guarantees the tiles that drop in to
// replace it are powered up by at least this much (still takes the highest
// against the random roll above, rather than stacking with it).
const LONG_WORD_LENGTH = 5;
const LONG_WORD_BONUS = 2;

// Words worth this much or more also power up their replacement tiles, by
// the word's total score divided down (floored) — a 12-point word gives +2,
// a 20-point word gives +4, and so on. This stacks additively with the long
// word bonus above (a 5-letter, 15-point word gives +2 +3 = +5), but the
// combined guaranteed bonus and the random roll don't stack — highest wins.
const HIGH_SCORE_THRESHOLD = 12;
const HIGH_SCORE_DIVISOR = 5;

function computeRefillBonus(wordLength, points) {
  const lengthBonus = wordLength >= LONG_WORD_LENGTH ? LONG_WORD_BONUS : 0;
  const scoreBonus = points >= HIGH_SCORE_THRESHOLD ? Math.floor(points / HIGH_SCORE_DIVISOR) : 0;
  return lengthBonus + scoreBonus;
}

// While the currently-selected letters form a valid word that qualifies for
// a refill bonus (long enough or high-scoring enough), every tile in that
// selection glows around its outer edge, previewing that this word will
// cash in a bonus.
const GLOW_PULSE_DURATION = 600;

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
    this.gameScore = 0;

    this.glowingCells = new Set();
    this.startGlowClock();

    this.selectedText = this.add.text(WIDTH / 2, TOP_PADDING + HEADER_HEIGHT / 2, '', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(10, 8, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: COLOR_TEXT_DEFAULT,
    });

    this.movesText = this.add.text(10, 28, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: COLOR_TEXT_DEFAULT,
    });

    this.levelText = this.add.text(WIDTH - 10, 8, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: COLOR_TEXT_DEFAULT,
    }).setOrigin(1, 0);

    this.gameScoreText = this.add.text(WIDTH - 10, 28, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: COLOR_TEXT_DEFAULT,
    }).setOrigin(1, 0);

    for (let row = 0; row < GRID_SIZE; row++) {
      const rowCells = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = SIDE_PADDING + col * CELL;
        const y = GRID_TOP + row * CELL;

        const rect = this.add.rectangle(x + CELL / 2, y + CELL / 2, CELL - 2, CELL - 2, COLOR_CELL)
          .setStrokeStyle(1, COLOR_BORDER)
          .setDepth(RECT_DEPTH);

        const text = this.add.text(x + CELL / 2, y + CELL / 2, '', {
          fontSize: `${LETTER_FONT_SIZE}px`,
          fontFamily: 'monospace',
          color: COLOR_LETTER_TEXT,
        }).setOrigin(0.5).setDepth(TEXT_DEPTH);

        const valueText = this.add.text(x + CELL - VALUE_INSET, y + VALUE_INSET, '', {
          fontSize: `${VALUE_FONT_SIZE}px`,
          fontFamily: 'monospace',
          color: COLOR_VALUE_TEXT,
        }).setOrigin(1, 0).setDepth(TEXT_DEPTH);

        rowCells.push({ letter: null, bonus: 0, pending: false, text, valueText, rect });
      }
      this.grid.push(rowCells);
    }

    // Sits above the tile backgrounds but below the letters, so arrows don't
    // obscure the glyph at either end.
    this.arrowGfx = this.add.graphics().setDepth(ARROW_DEPTH);

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
      // Stop any active glows before the board content underneath potentially
      // changes, so a stray tween never keeps animating a tile that's since
      // become something else.
      for (const { row, col } of this.selected) {
        this.stopPowerGlow(this.grid[row][col]);
      }
      if (this.isValidWord) {
        const points = this.awardScore();
        const refillBonus = computeRefillBonus(this.selected.length, points);
        this.removeAndCollapse(this.selected, refillBonus);
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
        // A tile mid-fall (or mid-blast-wait, still hidden as `pending`) from
        // the word that just finished the level could still be tweening;
        // kill it and snap back to a normal, visible state before handing
        // the slot a fresh letter.
        this.tweens.killTweensOf([cell.rect, cell.text, cell.valueText]);
        cell.pending = false;
        cell.rect.setAlpha(1);
        cell.text.setAlpha(1);
        cell.valueText.setAlpha(1);
        const y = GRID_TOP + row * CELL;
        cell.rect.y = y + CELL / 2;
        cell.text.y = y + CELL / 2;
        cell.valueText.y = y + VALUE_INSET;
        this.setCellLetter(cell, randomLetter(), rollPowerUpBonus());
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

    // Reward for finishing under budget: leftover moves cash out at this
    // difficulty's points-per-word rate and roll into the persistent total.
    const efficiencyBonus = this.movesRemaining * this.pointsPerWord;
    this.gameScore += completedScore + efficiencyBonus;
    this.updateHud();

    const summary = this.showOverlayMessage(
      `LEVEL ${completedLevel} COMPLETE!\n\n` +
        `Level Score: ${completedScore} / ${completedTarget}\n` +
        `Bonus: +${efficiencyBonus} (${this.movesRemaining} moves left x ${this.pointsPerWord})\n\n` +
        `Game Score: ${this.gameScore}`,
      COLOR_TEXT_DEFAULT
    );

    const buttonY = HEIGHT / 2 + summary.height / 2 + 30;
    const button = this.add.text(WIDTH / 2, buttonY, 'PROCEED', {
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
      `GAME OVER\nReached Level ${this.level}\nGame Score: ${this.gameScore}\n\nClick or press R to restart`,
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
    this.scoreText.setText(`Level Score: ${this.score} / ${this.targetScore}`);
    this.movesText.setText(`Moves: ${this.movesRemaining}`);
    this.gameScoreText.setText(`Game Score: ${this.gameScore}`);
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
    if (cell.pending) return; // awaiting its refill blast/impact — not there yet

    const key = `${row},${col}`;
    if (this.selectedKeys.has(key)) return;

    if (this.selected.length > 0) {
      const last = this.selected[this.selected.length - 1];
      const touching = Math.abs(row - last.row) <= 1 && Math.abs(col - last.col) <= 1;
      if (!touching) return;
    }

    cell.rect.setFillStyle(COLOR_CELL_SELECTED);

    this.selected.push({ row, col, letter: cell.letter, bonus: cell.bonus });
    this.selectedKeys.add(key);
    this.updateSelectedText();
    this.updateBonusGlow();

    if (this.selected.length > 1) {
      this.drawArrow(this.selected[this.selected.length - 2], this.selected[this.selected.length - 1]);
    }
  }

  startGlowClock() {
    // A single perpetual tween driving one shared value, applied to every
    // currently-glowing tile's outerStrength each frame. Tiles read off this
    // common clock rather than running their own tween so a tile that joins
    // the selection mid-pulse still breathes in sync with the rest.
    this.glowPulse = { value: 0 };
    this.tweens.add({
      targets: this.glowPulse,
      value: 3,
      duration: GLOW_PULSE_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        for (const cell of this.glowingCells) cell.glowFx.outerStrength = this.glowPulse.value;
      },
    });
  }

  updateBonusGlow() {
    const points = this.wordPoints(this.selected);
    const qualifies = this.isValidWord && computeRefillBonus(this.selected.length, points) > 0;
    for (const { row, col } of this.selected) {
      const cell = this.grid[row][col];
      if (qualifies) {
        this.startPowerGlow(cell);
      } else {
        this.stopPowerGlow(cell);
      }
    }
  }

  clearSelection() {
    for (const { row, col } of this.selected) {
      const cell = this.grid[row][col];
      this.stopPowerGlow(cell);
      this.resetCellVisual(cell);
    }
    this.selected = [];
    this.selectedKeys.clear();
    this.updateSelectedText();
    this.arrowGfx.clear();
  }

  startPowerGlow(cell) {
    if (cell.glowFx) return;

    // Bleeds past the tile's own edges, so it needs to render above
    // neighboring tiles (depth 0) instead of getting clipped underneath
    // them; bump this tile's own glyphs above that so they still show
    // on top of their own (now-elevated) background.
    cell.rect.setDepth(GLOW_RECT_DEPTH);
    cell.text.setDepth(GLOW_TEXT_DEPTH);
    cell.valueText.setDepth(GLOW_TEXT_DEPTH);

    // A soft green glow around the tile's outer edge, pulsating like a
    // box-shadow whose spread breathes in and out. Every glowing tile reads
    // off the same shared pulse clock (see startGlowClock) instead of
    // running its own tween, so a tile added mid-selection still breathes
    // in lockstep with tiles that started glowing earlier.
    cell.glowFx = cell.rect.postFX.addGlow(0x44ff88, 0, 0, false, 0.1, 12);
    cell.glowFx.outerStrength = this.glowPulse.value;
    this.glowingCells.add(cell);
  }

  stopPowerGlow(cell) {
    if (!cell.glowFx) return;
    this.glowingCells.delete(cell);
    cell.rect.postFX.remove(cell.glowFx);
    cell.glowFx = null;

    cell.rect.setDepth(RECT_DEPTH);
    cell.text.setDepth(TEXT_DEPTH);
    cell.valueText.setDepth(TEXT_DEPTH);
  }

  resetCellVisual(cell) {
    cell.rect.setFillStyle(COLOR_CELL);
    cell.rect.setStrokeStyle(1, COLOR_BORDER);
  }

  setCellLetter(cell, letter, bonus = 0) {
    cell.letter = letter;
    cell.bonus = bonus;
    cell.text.setText(letter);
    cell.valueText.setText(String((SCRABBLE_SCORES[letter] || 0) + bonus));
    cell.valueText.setColor(bonus > 0 ? COLOR_VALUE_POWERED : COLOR_VALUE_TEXT);
    this.resetCellVisual(cell);
  }

  removeAndCollapse(selectedCells, refillBonus = 0) {
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
        survivors.push({ letter: source.letter, bonus: source.bonus, fromRow: row });
      }

      const emptyCount = GRID_SIZE - survivors.length;

      // Survivors fall right away regardless of any bonus.
      for (let row = emptyCount; row < GRID_SIZE; row++) {
        const cell = this.grid[row][col];
        const survivor = survivors[row - emptyCount];
        this.setCellLetter(cell, survivor.letter, survivor.bonus);
        if (survivor.fromRow !== row) this.animateFall(cell, survivor.fromRow, row);
      }

      const spawnNewTiles = () => {
        for (let row = 0; row < emptyCount; row++) {
          const cell = this.grid[row][col];
          // New tile queued above the board; the higher up the empty slot,
          // the further it has to drop, so refills cascade one after another.
          const bonus = Math.max(rollPowerUpBonus(), refillBonus);
          this.setCellLetter(cell, randomLetter(), bonus);
          this.animateFall(cell, row - emptyCount, row);
        }
      };

      if (refillBonus > 0 && emptyCount > 0) {
        // Hide the slots awaiting a refill so the column reads as cleared
        // while the blast travels, instead of showing stale leftover tiles;
        // `pending` keeps them unselectable in the meantime.
        for (let row = 0; row < emptyCount; row++) {
          const cell = this.grid[row][col];
          cell.pending = true;
          cell.rect.setAlpha(0);
          cell.text.setAlpha(0);
          cell.valueText.setAlpha(0);
        }

        // Fire a blast for every removed tile in this column, then wait for
        // the last one to land, play the impact, and only then spawn the
        // replacement tiles.
        const deepestRow = Math.max(...removedRows);
        const travelTime = (deepestRow + 1) * BLAST_MS_PER_ROW;
        for (const row of removedRows) this.spawnBlast(row, col);
        this.time.delayedCall(travelTime, () => {
          this.spawnBlastImpact(col);
          this.time.delayedCall(EXPLOSION_DURATION, () => {
            for (let row = 0; row < emptyCount; row++) {
              const cell = this.grid[row][col];
              cell.pending = false;
              cell.rect.setAlpha(1);
              cell.text.setAlpha(1);
              cell.valueText.setAlpha(1);
            }
            spawnNewTiles();
          });
        });
      } else {
        spawnNewTiles();
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

  spawnBlast(row, col) {
    const { x, y } = this.cellCenter({ row, col });
    const topY = GRID_TOP - CELL / 2;
    const blast = this.add.rectangle(x, y, BLAST_WIDTH, CELL * 0.8, COLOR_BLAST, 0.9)
      .setDepth(BLAST_DEPTH);

    this.tweens.add({
      targets: blast,
      y: topY,
      alpha: 0,
      duration: (row + 1) * BLAST_MS_PER_ROW,
      ease: 'Quad.easeIn',
      onComplete: () => blast.destroy(),
    });
  }

  spawnBlastImpact(col) {
    const x = SIDE_PADDING + col * CELL + CELL / 2;
    const y = GRID_TOP - CELL / 2;
    const impact = this.add.circle(x, y, 4, COLOR_BLAST, 1).setDepth(BLAST_DEPTH);

    this.tweens.add({
      targets: impact,
      radius: CELL * 0.6,
      alpha: 0,
      duration: EXPLOSION_DURATION,
      ease: 'Quad.easeOut',
      onComplete: () => impact.destroy(),
    });
  }

  updateSelectedText() {
    const word = this.selected.map((s) => s.letter).join('');
    this.isValidWord = word.length > 1 && this.wordSet.has(word);
    this.selectedText.setText(word);
    this.selectedText.setColor(this.isValidWord ? COLOR_TEXT_VALID : COLOR_TEXT_DEFAULT);
  }

  wordPoints(selected) {
    return selected.reduce((sum, s) => sum + (SCRABBLE_SCORES[s.letter] || 0) + (s.bonus || 0), 0);
  }

  awardScore() {
    const points = this.wordPoints(this.selected);
    this.score += points;
    return points;
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
