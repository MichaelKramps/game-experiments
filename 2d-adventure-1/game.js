const WIDTH = 800;
const HEIGHT = 600;
const WORLD_W = 2400;
const WORLD_H = 1800;
const PLAYER_RADIUS = 10; // slightly smaller than the 11px sprite so it doesn't visually clip walls

// ── Spaceship layout (rooms + corridors) ────────────────────────────────────
// All coords are in world space.
const ROOMS = [
  { x: 200,  y: 200,  w: 500, h: 400, label: 'Bridge' },
  { x: 900,  y: 130,  w: 400, h: 300, label: 'Armory' },
  { x: 900,  y: 600,  w: 400, h: 350, label: 'Med Bay' },
  { x: 1500, y: 200,  w: 500, h: 500, label: 'Engine Room' },
  { x: 200,  y: 900,  w: 350, h: 400, label: 'Quarters' },
  { x: 700,  y: 1100, w: 450, h: 350, label: 'Cargo Hold' },
  { x: 1400, y: 900,  w: 400, h: 400, label: 'Reactor' },
  { x: 1900, y: 750,  w: 350, h: 600, label: 'Hangar' },
];

// Corridors are thin rectangular passages connecting rooms.
const CORRIDORS = [
  { x: 700,  y: 310,  w: 200, h: 80 },   // Bridge → Armory
  { x: 1300, y: 300,  w: 200, h: 80 },   // Armory → Engine Room
  { x: 1300, y: 600,  w: 200, h: 80 },   // Med Bay → Engine Room
  { x: 870,  y: 1150, w: 230, h: 80 },   // Quarters → Cargo Hold (horizontal... sort of)
  { x: 550,  y: 1100, w: 150, h: 80 },   // Quarters → Cargo Hold
  { x: 1150, y: 1150, w: 250, h: 80 },   // Cargo Hold → Reactor
  { x: 1900, y: 700,  w: 100, h: 280 },  // Engine Room → Hangar (vertical)
  { x: 1800, y: 1000, w: 280, h: 100 },  // Reactor → Hangar (horizontal)
  { x: 960,  y: 430,  w: 80,  h: 240 },  // Armory → Med Bay (vertical)
];

// Accent light strips (thin colored rects along walls for atmosphere)
const LIGHTS = [
  { x: 210,  y: 210,  w: 480, h: 6,  color: 0x0077ff },
  { x: 210,  y: 588,  w: 480, h: 6,  color: 0x0077ff },
  { x: 910,  y: 140,  w: 380, h: 5,  color: 0x00ffcc },
  { x: 910,  y: 418,  w: 380, h: 5,  color: 0x00ffcc },
  { x: 910,  y: 610,  w: 380, h: 5,  color: 0xff4444 },
  { x: 910,  y: 938,  w: 380, h: 5,  color: 0xff4444 },
  { x: 1510, y: 210,  w: 480, h: 5,  color: 0xff8800 },
  { x: 1510, y: 688,  w: 480, h: 5,  color: 0xff8800 },
  { x: 210,  y: 910,  w: 330, h: 5,  color: 0xaaaaff },
  { x: 210,  y: 1288, w: 330, h: 5,  color: 0xaaaaff },
  { x: 1410, y: 910,  w: 380, h: 5,  color: 0x00ff88 },
  { x: 1910, y: 760,  w: 330, h: 5,  color: 0xff00cc },
];

// Walkable space is the union of all room and corridor rectangles.
function pointInRect(px, py, rect) {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  );
}

function isPointWalkable(px, py) {
  for (const r of ROOMS) {
    if (pointInRect(px, py, r)) return true;
  }
  for (const c of CORRIDORS) {
    if (pointInRect(px, py, c)) return true;
  }
  return false;
}

// ── Doors ────────────────────────────────────────────────────────────────────
// A door sits wherever a corridor crosses a room's wall, and starts closed (impassable).
// Doors are derived from ROOMS/CORRIDORS rather than hand-placed, so editing the layout
// above automatically keeps doors lined up with the doorways.
const DOOR_THICKNESS = 16;

function rectOverlap(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 < x1 || y2 < y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function buildDoors() {
  const doors = [];
  CORRIDORS.forEach((corridor, corridorIndex) => {
    // The corridor's long axis tells us which pair of room walls it should cross.
    const vertical = corridor.h > corridor.w;
    for (const room of ROOMS) {
      const o = rectOverlap(corridor, room);
      if (!o) continue;

      let edgeX = null, edgeY = null, spanFrom, spanTo;
      if (o.w === 0) {
        // Corridor and room only touch along a vertical line — that line is the doorway.
        edgeX = o.x;
        spanFrom = o.y; spanTo = o.y + o.h;
      } else if (o.h === 0) {
        // Touch along a horizontal line.
        edgeY = o.y;
        spanFrom = o.x; spanTo = o.x + o.w;
      } else if (vertical) {
        // Corridor dips into the room's interior — the doorway is wherever it crosses
        // the room's top or bottom wall, not the corridor's own far end.
        if (corridor.y < room.y) edgeY = room.y;
        else if (corridor.y + corridor.h > room.y + room.h) edgeY = room.y + room.h;
        else continue; // corridor is fully inside the room; not a real doorway
        spanFrom = o.x; spanTo = o.x + o.w;
      } else {
        if (corridor.x < room.x) edgeX = room.x;
        else if (corridor.x + corridor.w > room.x + room.w) edgeX = room.x + room.w;
        else continue;
        spanFrom = o.y; spanTo = o.y + o.h;
      }

      doors.push(edgeX !== null
        ? { x: edgeX - DOOR_THICKNESS / 2, y: spanFrom, w: DOOR_THICKNESS, h: spanTo - spanFrom, open: false, corridorIndex, room: room.label }
        : { x: spanFrom, y: edgeY - DOOR_THICKNESS / 2, w: spanTo - spanFrom, h: DOOR_THICKNESS, open: false, corridorIndex, room: room.label });
    }
  });

  // The player's card opens every door except the ones on the corridor leading to the
  // Bridge — both ends of that corridor are off-limits, not just the door touching Bridge.
  const bridgeCorridors = new Set(doors.filter(d => d.room === 'Bridge').map(d => d.corridorIndex));
  for (const d of doors) {
    d.cardAccess = !bridgeCorridors.has(d.corridorIndex);
  }

  return doors;
}

const DOORS = buildDoors();

function isBlockedByClosedDoor(px, py) {
  for (const d of DOORS) {
    if (!d.open && pointInRect(px, py, d)) return true;
  }
  return false;
}

// Approximate the player's collision circle with its center plus 4 edge points, so a move
// is only allowed if the whole circle stays inside the union — insetting each room/corridor
// rect individually instead would leave a dead gap at every doorway where two shapes touch.
function isWalkable(px, py, radius) {
  const samples = [
    [px, py], [px + radius, py], [px - radius, py], [px, py + radius], [px, py - radius],
  ];
  for (const [sx, sy] of samples) {
    if (!isPointWalkable(sx, sy) || isBlockedByClosedDoor(sx, sy)) return false;
  }
  return true;
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {}

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.swipeKey = this.input.keyboard.addKey('E');

    // ── World & physics bounds ───────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // ── Draw ship background ─────────────────────────────────────────────────
    const g = this.add.graphics();

    // Void (space black outside the ship)
    g.fillStyle(0x05050f, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    // Draw corridors first (below rooms)
    g.fillStyle(0x1a1a2a, 1);
    for (const c of CORRIDORS) {
      g.fillRect(c.x, c.y, c.w, c.h);
    }
    // Corridor edge lines
    g.lineStyle(2, 0x333355, 1);
    for (const c of CORRIDORS) {
      g.strokeRect(c.x, c.y, c.w, c.h);
    }

    // Draw rooms
    for (const r of ROOMS) {
      // Floor
      g.fillStyle(0x1e1e30, 1);
      g.fillRect(r.x, r.y, r.w, r.h);

      // Floor tile grid
      g.lineStyle(1, 0x252538, 1);
      const tileSize = 40;
      for (let tx = r.x; tx < r.x + r.w; tx += tileSize) {
        g.lineBetween(tx, r.y, tx, r.y + r.h);
      }
      for (let ty = r.y; ty < r.y + r.h; ty += tileSize) {
        g.lineBetween(r.x, ty, r.x + r.w, ty);
      }

      // Wall border (outer)
      g.lineStyle(6, 0x2a2a44, 1);
      g.strokeRect(r.x, r.y, r.w, r.h);

      // Inner wall inset
      g.lineStyle(2, 0x3a3a5a, 1);
      g.strokeRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20);
    }

    // Corner bolts on rooms
    g.fillStyle(0x3a3a5a, 1);
    for (const r of ROOMS) {
      const bolts = [
        [r.x + 14, r.y + 14], [r.x + r.w - 14, r.y + 14],
        [r.x + 14, r.y + r.h - 14], [r.x + r.w - 14, r.y + r.h - 14],
      ];
      for (const [bx, by] of bolts) g.fillCircle(bx, by, 4);
    }

    // Accent light strips
    for (const l of LIGHTS) {
      g.fillStyle(l.color, 0.85);
      g.fillRect(l.x, l.y, l.w, l.h);
      // Glow layer
      g.fillStyle(l.color, 0.15);
      g.fillRect(l.x, l.y - 3, l.w, l.h + 6);
    }

    // Room labels
    const labelStyle = { fontSize: '13px', color: '#4a4a7a', fontFamily: 'monospace' };
    for (const r of ROOMS) {
      this.add.text(r.x + r.w / 2, r.y + 22, r.label, labelStyle).setOrigin(0.5);
    }

    // ── Doors ────────────────────────────────────────────────────────────────
    // Closed by default. Each door keeps its own gfx reference so a future "open"
    // mechanism can recolor/hide it without touching the static ship background.
    for (const door of DOORS) {
      door.gfx = this.add
        .rectangle(door.x + door.w / 2, door.y + door.h / 2, door.w, door.h, 0xff5533, 1)
        .setStrokeStyle(2, 0x331100, 1)
        .setDepth(5);
    }

    // ── Player ───────────────────────────────────────────────────────────────
    const pg = this.add.graphics();
    pg.fillStyle(0x111122, 1);
    pg.fillCircle(11, 11, 11);
    pg.fillStyle(0xddeeff, 1);
    pg.fillCircle(11, 11, 8);
    pg.fillStyle(0x334466, 1);
    pg.fillCircle(11, 9, 3);
    pg.generateTexture('player', 22, 22);
    pg.destroy();

    // Start in the Quarters
    const start = ROOMS.find(r => r.label === 'Quarters');
    this.player = this.physics.add.sprite(
      start.x + start.w / 2,
      start.y + start.h / 2,
      'player'
    );
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Last known-good position, used to resolve wall collisions in update().
    this.prevX = this.player.x;
    this.prevY = this.player.y;

    // ── Camera ───────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ── HUD (fixed to camera) ────────────────────────────────────────────────
    this.add.text(WIDTH / 2, HEIGHT - 20, 'Arrow keys to move', {
      fontSize: '13px',
      color: '#445566',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

    this.promptText = this.add.text(WIDTH / 2, HEIGHT - 40, '', {
      fontSize: '13px',
      color: '#ffcc66',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
  }

  // Returns the nearest closed door within card-swipe range of the player, or null.
  findNearbyDoor() {
    const range = 36;
    for (const door of DOORS) {
      if (door.open) continue;
      const zone = {
        x: door.x - range, y: door.y - range,
        w: door.w + range * 2, h: door.h + range * 2,
      };
      if (pointInRect(this.player.x, this.player.y, zone)) return door;
    }
    return null;
  }

  // Swiping at either end of a corridor opens both of its doors at once, so a single
  // swipe makes the whole corridor passable. A door that the card can't open (the
  // Bridge door) stays shut even if its twin on the other end is opened.
  openDoor(door) {
    for (const d of DOORS) {
      if (d.corridorIndex !== door.corridorIndex || d.open || !d.cardAccess) continue;
      d.open = true;
      d.gfx.setFillStyle(0x33ff88, 0.18);
      d.gfx.setStrokeStyle(2, 0x33ff88, 0.5);
    }
  }

  // Briefly flashes a door to signal a denied swipe, without changing its state.
  flashDoorDenied(door) {
    this.tweens.add({
      targets: door.gfx,
      fillAlpha: 0.15,
      duration: 70,
      yoyo: true,
      repeat: 2,
    });
  }

  update() {
    // Physics already moved the player this frame; pull it back out of any wall it
    // crossed into, sliding along whichever axis is still clear.
    const { x, y } = this.player;
    if (isWalkable(x, y, PLAYER_RADIUS)) {
      this.prevX = x;
      this.prevY = y;
    } else if (isWalkable(x, this.prevY, PLAYER_RADIUS)) {
      this.player.setPosition(x, this.prevY);
      this.prevX = x;
    } else if (isWalkable(this.prevX, y, PLAYER_RADIUS)) {
      this.player.setPosition(this.prevX, y);
      this.prevY = y;
    } else {
      this.player.setPosition(this.prevX, this.prevY);
    }

    const speed = 200;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown)  this.player.setVelocityX(-speed);
    else if (this.cursors.right.isDown) this.player.setVelocityX(speed);

    if (this.cursors.up.isDown)    this.player.setVelocityY(-speed);
    else if (this.cursors.down.isDown)  this.player.setVelocityY(speed);

    // ── Door interaction ─────────────────────────────────────────────────────
    const nearbyDoor = this.findNearbyDoor();
    this.promptText.setText(
      nearbyDoor ? (nearbyDoor.cardAccess ? 'Press E to swipe card' : 'ACCESS DENIED — no clearance') : ''
    );

    if (nearbyDoor && Phaser.Input.Keyboard.JustDown(this.swipeKey)) {
      if (nearbyDoor.cardAccess) this.openDoor(nearbyDoor);
      else this.flashDoorDenied(nearbyDoor);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#05050f',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [GameScene],
};

new Phaser.Game(config);
