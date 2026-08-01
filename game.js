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
let shiftKey;
let slimes;
let items;
let projectiles;
let boss;
let bossHealthBar;
let bossLabel;
let bossActive = false;
let bossHP = 3;
let lastBossHitTime = 0;
const BOSS_HIT_COOLDOWN = 800; // milliseconds player is safe after getting hit from boss contact

let facing = { x: 0, y: -1 }; // which way the player is currently facing (starts facing up)
let lastShotTime = 0;
const SHOT_COOLDOWN = 350; // milliseconds between shots
const PROJECTILE_SPEED = 320;

let wave = 1;

let playerHealth = 100;
let playerEnergy = 100;
let tokens = 0;
let itemsCollected = 0;
const TOTAL_ITEMS = 4;

let hudTexts = {};
let messageText;
let debugText;
let bossDebugText;
let startTime = 0;
let collectLog = [];
let defeatLog = [];

// =========================================================
// PRELOAD: load your uploaded images + draw simple colored
// squares for anything you haven't replaced yet.
// =========================================================
function preload() {
  // Your uploaded images
  this.load.image('player', 'player.png');
  this.load.image('item', 'item.png');

  // if any file fails to load, show it directly on screen instead of hiding it
  this.load.on('loaderror', (file) => {
    this.add.text(16, 80, 'LOAD ERROR: ' + file.key + ' (' + file.src + ')', {
      fontSize: '13px',
      fill: '#ff0000',
      backgroundColor: '#000000'
    }).setScrollFactor(0);
  });

  const g = this.add.graphics();

  // Slime (purple square)
  g.fillStyle(0x8e44ad, 1);
  g.fillRect(0, 0, 28, 28);
  g.generateTexture('slime', 28, 28);
  g.clear();

  // Boss (big red square)
  g.fillStyle(0xE24B4A, 1);
  g.fillRect(0, 0, 56, 56);
  g.generateTexture('boss', 56, 56);
  g.clear();

  // Projectile (small gold dash)
  g.fillStyle(0xFFD966, 1);
  g.fillRect(0, 0, 14, 4);
  g.lineStyle(1, 0xb9861f, 1);
  g.strokeRect(0, 0, 14, 4);
  g.generateTexture('projectile', 14, 4);
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
  keysWASD = this.input.keyboard.addKeys('W,A,S,D');
  shiftKey = this.input.keyboard.addKey('SHIFT');

  // --- groups ---
  items = this.physics.add.group();
  slimes = this.physics.add.group();
  projectiles = this.physics.add.group();

  spawnItems(this);
  spawnSlimes(this, 3);

  // --- collisions ---
  this.physics.add.overlap(player, items, collectItem, null, this);
  this.physics.add.overlap(player, slimes, hitSlime, null, this);

  // --- HUD (drawn as fixed text on top of the game world) ---
  const style = { fontSize: '16px', fill: '#ffffff' };
  hudTexts.health = this.add.text(16, 12, '', style).setScrollFactor(0);
  hudTexts.energy = this.add.text(160, 12, '', style).setScrollFactor(0);
  hudTexts.tokens = this.add.text(300, 12, '', style).setScrollFactor(0);
  hudTexts.xp = this.add.text(440, 12, '', style).setScrollFactor(0);

  messageText = this.add.text(340, 400, '', {
    fontSize: '15px',
    fill: '#ffffff',
    backgroundColor: '#000000aa',
    padding: { x: 8, y: 4 }
  }).setOrigin(0.5, 0).setScrollFactor(0);

  updateHUD();
  showMessage('WASD/arrows to move. Hold SHIFT to shoot!');

  startTime = this.time.now;
  debugText = this.add.text(16, 435, 'DEBUG: t=0.0s | collected: (none yet)', {
    fontSize: '12px',
    fill: '#ffff00'
  }).setScrollFactor(0);

  bossDebugText = this.add.text(16, 415, 'BOSS DEBUG: no boss active | defeats: (none yet)', {
    fontSize: '12px',
    fill: '#00ffff'
  }).setScrollFactor(0);
}

// =========================================================
// UPDATE: runs every frame. Handles movement, shooting, and
// keeps track of which way the player is facing.
// =========================================================
function update() {
  const speed = 160;
  let vx = 0;
  let vy = 0;

  if (cursors.left.isDown || keysWASD.A.isDown) vx = -1;
  else if (cursors.right.isDown || keysWASD.D.isDown) vx = 1;

  if (cursors.up.isDown || keysWASD.W.isDown) vy = -1;
  else if (cursors.down.isDown || keysWASD.S.isDown) vy = 1;

  player.setVelocity(vx * speed, vy * speed);

  // remember the last direction we actually moved in, so shooting
  // knows which way to fire even if we stop moving
  if (vx !== 0 || vy !== 0) {
    facing = { x: vx, y: vy };
  }

  // slowly regen energy, drain it a little while moving
  const isMoving = vx !== 0 || vy !== 0;
  playerEnergy = Phaser.Math.Clamp(
    playerEnergy + (isMoving ? -0.05 : 0.05),
    0,
    100
  );
  updateHUD();

  const elapsed = ((this.time.now - startTime) / 1000).toFixed(1);
  debugText.setText('DEBUG: t=' + elapsed + 's | collected: ' + (collectLog.length ? collectLog.join(', ') : '(none yet)'));

  bossDebugText.setText(
    'BOSS DEBUG: ' + (bossActive ? ('ACTIVE, HP=' + bossHP + '/3') : 'no boss active') +
    ' | defeats: ' + (defeatLog.length ? defeatLog.join(', ') : '(none yet)')
  );

  if (Phaser.Input.Keyboard.JustDown(shiftKey)) {
    const now = this.time.now;
    if (now - lastShotTime > SHOT_COOLDOWN) {
      lastShotTime = now;
      shootProjectile(this);
    }
  }

  // once all items are collected, spawn the final boss
  if (itemsCollected >= TOTAL_ITEMS && !bossActive) {
    spawnBoss(this);
  }
}

// =========================================================
// HELPER FUNCTIONS
// =========================================================
function spawnItems(scene) {
  const itemSpots = [
    { x: 90, y: 90 },
    { x: 590, y: 90 },
    { x: 90, y: 370 },
    { x: 590, y: 370 }
  ];
  itemSpots.forEach(spot => {
    const it = items.create(spot.x, spot.y, 'item');
    it.setImmovable(true);
    it.setDisplaySize(36, 36); // always render clearly visible, no matter the source image's real size
    it.body.setSize(24, 24);   // force a sane, fixed hitbox no matter what
  });
}

function spawnSlimes(scene, count) {
  for (let i = 0; i < count; i++) {
    const x = Phaser.Math.Between(60, 620);
    const y = Phaser.Math.Between(70, 430);
    const s = slimes.create(x, y, 'slime');
    s.setCollideWorldBounds(true);
    s.setBounce(1, 1);
    s.setVelocity(
      Phaser.Math.Between(-60, 60),
      Phaser.Math.Between(-60, 60)
    );
  }
}

function shootProjectile(scene) {
  const p = projectiles.create(player.x, player.y, 'projectile');
  p.body.allowGravity = false;
  p.setVelocity(facing.x * PROJECTILE_SPEED, facing.y * PROJECTILE_SPEED);
  p.rotation = Math.atan2(facing.y, facing.x);

  // clean the projectile up after a bit so they don't pile up forever
  scene.time.delayedCall(1500, () => {
    if (p.active) p.destroy();
  });
}

function collectItem(player, item) {
  item.destroy();
  itemsCollected += 1;
  tokens += 25;
  const t = ((game.scene.scenes[0].time.now - startTime) / 1000).toFixed(1);
  collectLog.push(t + 's');
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
  // safety: clean up any leftover boss visuals from before, just in case
  if (boss) boss.destroy();
  if (bossHealthBar) bossHealthBar.destroy();
  if (bossLabel) bossLabel.destroy();

  bossActive = true;
  bossHP = 3;
  boss = scene.physics.add.sprite(340, 100, 'boss');
  boss.setCollideWorldBounds(true);
  boss.setBounce(1, 1);
  boss.setVelocity(80, 80);

  // touching the boss kills the player instantly
  scene.physics.add.overlap(player, boss, () => {
    playerHealth = 0;
    updateHUD();
    showMessage('The Hallucination King overwhelms you!');
    loseGame(scene);
  });

  // shooting the boss with a projectile is the ONLY way to damage/defeat it
  scene.physics.add.overlap(projectiles, boss, (proj, bossSprite) => {
    proj.destroy();
    bossHP -= 1;
    bossHealthBar.width = Math.max(bossHP, 0) * 20;
    scene.tweens.add({ targets: bossSprite, alpha: 0.2, duration: 90, yoyo: true });

    if (bossHP > 0) {
      showMessage('Hit! Hallucination King HP: ' + bossHP + '/3');
    } else {
      winGame(scene);
    }
  });

  bossHealthBar = scene.add.rectangle(340, 60, 60, 10, 0xE24B4A).setScrollFactor(0);
  bossLabel = scene.add.text(280, 44, 'Hallucination King', { fontSize: '13px', fill: '#ffffff' });
  showMessage('The Hallucination King appears! Hold SHIFT to shoot it.');
}

function winGame(scene) {
  // Boss defeated — reward the player and keep the game going,
  // instead of ending it.
  const t = ((scene.time.now - startTime) / 1000).toFixed(1);
  defeatLog.push(t + 's');

  tokens += 100;
  wave += 1;

  boss.destroy();
  bossHealthBar.destroy();
  bossLabel.destroy();
  boss = null;
  bossHealthBar = null;
  bossLabel = null;
  bossActive = false;

  itemsCollected = 0;
  spawnItems(scene);
  spawnSlimes(scene, wave);

  updateHUD();
  showMessage('The Hallucination King falls! +100 tokens. More hallucinations emerge... (Wave ' + wave + ')', true);
}

function loseGame(scene) {
  scene.physics.pause();
  showMessage('Overwhelmed by hallucinations... refresh to try again.', true);
}

function showMessage(text, permanent) {
  messageText.setText(text);
  if (!permanent) {
    messageText.setAlpha(1);
    game.scene.scenes[0].time.delayedCall(2200, () => messageText.setText(''));
  }
}

function updateHUD() {
  hudTexts.health.setText('Health: ' + Math.round(playerHealth));
  hudTexts.energy.setText('Energy: ' + Math.round(playerEnergy));
  hudTexts.tokens.setText('Tokens: ' + tokens);
  hudTexts.xp.setText('Items: ' + itemsCollected + '/' + TOTAL_ITEMS);
}
