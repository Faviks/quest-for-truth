// ============================================================
// QUEST FOR THE TRUTH — a tiny top-down RPG made with Phaser 3
// ============================================================
// This whole game is ONE file. Read the comments — each block
// tells you what it does and where to tweak it.

const config = {
  type: Phaser.AUTO,
  width: 680,
  height: 460,
  parent: 'game-container',
  backgroundColor: '#74c273', // grass green
  pixelArt: true, // keeps pixel-art sprites crisp instead of blurry when scaled
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ---- game state ----
let player;
let cursors;
let keysWASD;
let slimes;
let items;
let boss;
let bossHealthBar;
let bossActive = false;
let bossHP = 3;
let lastBossHitTime = 0;
const BOSS_HIT_COOLDOWN = 800; // milliseconds player is safe after getting hit

let playerHealth = 100;
let playerEnergy = 100;
let tokens = 0;
let itemsCollected = 0;
const TOTAL_ITEMS = 4;

let hudTexts = {};
let messageText;

// =========================================================
// PRELOAD: draw simple colored-square "sprites" so you don't
// need any external image files to get started. Swap these
// for real pixel-art PNGs later (see README).
// =========================================================
function preload() {
  // Your uploaded character image
  this.load.image('player', 'assets/player.png');

  const g = this.add.graphics();

  // Slime (purple square)
  g.fillStyle(0x8e44ad, 1);
  g.fillRect(0, 0, 28, 28);
  g.generateTexture('slime', 28, 28);
  g.clear();

  // Item (gold square)
  g.fillStyle(0xf2c94c, 1);
  g.fillRect(0, 0, 20, 20);
  g.generateTexture('item', 20, 20);
  g.clear();

  // Boss (big red square)
  g.fillStyle(0xE24B4A, 1);
  g.fillRect(0, 0, 56, 56);
  g.generateTexture('boss', 56, 56);
  g.clear();

  g.destroy();
}

// =========================================================
// CREATE: runs once at the start. Sets up the world.
// =========================================================
function create() {
  // --- player ---
  player = this.physics.add.sprite(340, 380, 'player');
  player.setCollideWorldBounds(true);

  // --- controls ---
  cursors = this.input.keyboard.createCursorKeys();
  keysWASD = this.input.keyboard.addKeys('W,A,S,D,SPACE');

  // --- items to collect (the "features": shield, scroll, crystal, key) ---
  items = this.physics.add.group();
  const itemSpots = [
    { x: 90, y: 90 },
    { x: 590, y: 90 },
    { x: 90, y: 370 },
    { x: 590, y: 370 }
  ];
  itemSpots.forEach(spot => {
    const it = items.create(spot.x, spot.y, 'item');
    it.setImmovable(true);
  });

  // --- slime enemies that wander around ---
  slimes = this.physics.add.group();
  [
    { x: 200, y: 200 },
    { x: 480, y: 150 },
    { x: 350, y: 260 }
  ].forEach(spot => {
    const s = slimes.create(spot.x, spot.y, 'slime');
    s.setCollideWorldBounds(true);
    s.setBounce(1, 1);
    s.setVelocity(
      Phaser.Math.Between(-60, 60),
      Phaser.Math.Between(-60, 60)
    );
  });

  // --- collisions ---
  this.physics.add.overlap(player, items, collectItem, null, this);
  this.physics.add.overlap(player, slimes, hitSlime, null, this);

  // --- HUD (drawn as fixed text on top of the game world) ---
  const style = { fontSize: '16px', fill: '#ffffff' };
  hudTexts.health = this.add.text(16, 12, '', style).setScrollFactor(0);
  hudTexts.energy = this.add.text(160, 12, '', style).setScrollFactor(0);
  hudTexts.tokens = this.add.text(300, 12, '', style).setScrollFactor(0);
  hudTexts.xp = this.add.text(440, 12, '', style).setScrollFactor(0);

  messageText = this.add.text(340, 40, '', {
    fontSize: '15px',
    fill: '#ffffff',
    backgroundColor: '#000000aa',
    padding: { x: 8, y: 4 }
  }).setOrigin(0.5, 0).setScrollFactor(0);

  updateHUD();
}

// =========================================================
// UPDATE: runs every frame. Handles movement + boss fight.
// =========================================================
function update() {
  const speed = 160;
  player.setVelocity(0);

  if (cursors.left.isDown || keysWASD.A.isDown) player.setVelocityX(-speed);
  else if (cursors.right.isDown || keysWASD.D.isDown) player.setVelocityX(speed);

  if (cursors.up.isDown || keysWASD.W.isDown) player.setVelocityY(-speed);
  else if (cursors.down.isDown || keysWASD.S.isDown) player.setVelocityY(speed);

  // slowly regen energy, drain it a little while moving
  const isMoving = player.body.velocity.x !== 0 || player.body.velocity.y !== 0;
  playerEnergy = Phaser.Math.Clamp(
    playerEnergy + (isMoving ? -0.05 : 0.05),
    0,
    100
  );
  updateHUD();

  // once all items are collected, spawn the final boss
  if (itemsCollected >= TOTAL_ITEMS && !bossActive) {
    spawnBoss(this);
  }

  // press SPACE near the boss to "attack" it
  if (bossActive && Phaser.Input.Keyboard.JustDown(keysWASD.SPACE)) {
    const dist = Phaser.Math.Distance.Between(player.x, player.y, boss.x, boss.y);
    if (dist < 90) {
      bossHP -= 1;
      bossHealthBar.width = Math.max(bossHP, 0) * 20;
      if (bossHP <= 0) {
        winGame(this);
      }
    }
  }
}

// =========================================================
// HELPER FUNCTIONS
// =========================================================
function collectItem(player, item) {
  item.destroy();
  itemsCollected += 1;
  tokens += 25;
  showMessage('Collected an item! (' + itemsCollected + '/' + TOTAL_ITEMS + ')');
}

function hitSlime(player, slime) {
  playerHealth = Phaser.Math.Clamp(playerHealth - 10, 0, 100);
  showMessage('A slime spread misinformation! -10 health');

  // knock the player back away from the slime
  const angle = Phaser.Math.Angle.Between(slime.x, slime.y, player.x, player.y);
  player.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);

  if (playerHealth <= 0) {
    loseGame(this);
  }
}

function spawnBoss(scene) {
  bossActive = true;
  bossHP = 3;
  boss = scene.physics.add.sprite(340, 100, 'boss');
  boss.setCollideWorldBounds(true);
  boss.setBounce(1, 1);
  boss.setVelocity(80, 80);

  scene.physics.add.overlap(player, boss, () => {
    const now = scene.time.now;
    if (now - lastBossHitTime < BOSS_HIT_COOLDOWN) return; // still safe from last hit
    lastBossHitTime = now;

    playerHealth = Phaser.Math.Clamp(playerHealth - 15, 0, 100);
    updateHUD();

    // push the player away so they're not stuck taking repeat damage
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, player.x, player.y);
    player.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);

    if (playerHealth <= 0) loseGame(scene);
  });

  bossHealthBar = scene.add.rectangle(340, 60, 60, 10, 0xE24B4A).setScrollFactor(0);
  scene.add.text(280, 44, 'Hallucination King', { fontSize: '13px', fill: '#ffffff' });
  showMessage('The Hallucination King appears! Get close and press SPACE to attack.');
}

function winGame(scene) {
  scene.physics.pause();
  showMessage('You defeated the Hallucination King! The truth prevails. 🎉', true);
}

function loseGame(scene) {
  scene.physics.pause();
  showMessage('Overwhelmed by hallucinations... refresh to try again.', true);
}

function showMessage(text, permanent) {
  messageText.setText(text);
  if (!permanent) {
    messageText.setAlpha(1);
    game.scene.scenes[0].time.delayedCall(2000, () => messageText.setText(''));
  }
}

function updateHUD() {
  hudTexts.health.setText('Health: ' + Math.round(playerHealth));
  hudTexts.energy.setText('Energy: ' + Math.round(playerEnergy));
  hudTexts.tokens.setText('Tokens: ' + tokens);
  hudTexts.xp.setText('Items: ' + itemsCollected + '/' + TOTAL_ITEMS);
}
