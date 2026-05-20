const WIDTH = 800;
const HEIGHT = 600;

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load assets here:
    // this.load.image('key', 'assets/image.png');
    // this.load.audio('key', 'assets/sound.mp3');
  }

  create() {
    // Called once when scene starts. Set up game objects here.
    this.add.text(WIDTH / 2, HEIGHT / 2, 'Hello, Phaser!', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Keyboard input example:
    this.cursors = this.input.keyboard.createCursorKeys();
    // WASD:
    // this.keys = this.input.keyboard.addKeys('W,A,S,D');
  }

  update() {
    // Called every frame. Game logic goes here.
    // if (this.cursors.left.isDown) { ... }
  }
}

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [GameScene],
};

new Phaser.Game(config);
