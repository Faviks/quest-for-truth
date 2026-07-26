# Quest for the Truth

A tiny top-down RPG built with [Phaser 3](https://phaser.io). Walk around,
collect the four items, dodge the hallucination slimes, then beat the
Hallucination King. Built for a meme contest — customize freely.

## 1. Try it on your computer first

You don't need to install anything except a way to preview the page.

- Easiest option: install the **Live Server** extension in VS Code, open this
  folder, right-click `index.html`, and choose "Open with Live Server".
- Or, if you have Python installed, open a terminal in this folder and run:
  ```
  python3 -m http.server 8000
  ```
  then open `http://localhost:8000` in your browser.

You should see the game. Move with arrow keys or WASD.

## 2. Put it on GitHub

1. Go to [github.com/new](https://github.com/new) and create a new repository
   (e.g. `quest-for-the-truth`). Don't add a README there — you already have one.
2. On your computer, open a terminal in this folder and run:
   ```
   git init
   git add .
   git commit -m "First version of Quest for the Truth"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/quest-for-the-truth.git
   git push -u origin main
   ```
   (Replace `YOUR-USERNAME` with your GitHub username. GitHub will show you
   this exact command on the empty repo page too.)

## 3. Turn it into a shareable link (GitHub Pages)

1. On your repo's GitHub page, click **Settings**.
2. In the left sidebar, click **Pages**.
3. Under "Build and deployment" → "Branch", choose `main` and folder `/ (root)`.
4. Click **Save**.
5. Wait about a minute, then refresh — GitHub will show you a link like:
   `https://YOUR-USERNAME.github.io/quest-for-the-truth/`

That link is now live and playable by anyone, no download needed.

## 4. Make it yours

Everything is in two files:

- **`index.html`** — just loads Phaser and your game file. You rarely need
  to touch this.
- **`game.js`** — all the actual game logic, split into labeled sections:
  - `preload()` — currently draws colored squares as placeholder sprites.
    Swap these for real pixel-art images (see below).
  - `create()` — sets up the player, items, slimes, and HUD text.
  - `update()` — runs every frame; handles movement and the boss fight.

### Swapping in real pixel-art images
1. Make (or find/generate) small PNG sprites — 32x32 for the player, etc.
2. Put them in a new `assets/` folder in this project.
3. In `preload()`, replace the `graphics.generateTexture(...)` blocks with:
   ```js
   this.load.image('player', 'assets/player.png');
   this.load.image('slime', 'assets/slime.png');
   this.load.image('item', 'assets/item.png');
   this.load.image('boss', 'assets/boss.png');
   ```
4. Commit and push the new files, same as step 2 above.

### Easy tweaks to try
- Change colors: search for hex codes like `0x378ADD` in `game.js`.
- Change speed: the `speed` variable near the top of `update()`.
- Add more items/slimes: add more `{ x, y }` entries in the arrays inside
  `create()`.
- Change HUD text or labels: search for the text inside `hudTexts` in
  `create()` and `updateHUD()`.

## Credits / notes
Built as a Phaser 3 starter for a meme/game contest entry. Free to modify,
rebrand, and ship.
