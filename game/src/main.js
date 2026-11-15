// main.js — bootstrap and the frame loop. Wires the canvas to the state,
// physics, renderer, input and audio, and handles the title / playing /
// end transitions and the screenshot shot modes.
import { createGame, resetRun, WORLD } from './state.js';
import { updateGame } from './physics.js';
import { drawGame } from './render.js';
import { createInput, attachInput, clearPresses } from './input.js';
import { createAudio, unlockAudio, playCollect, playHit, playLevelUp, playWin, playDash, playLaunch } from './audio.js';
import { parseShotParams, buildShotGame } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  // Render in the game's 1280x800 logical space, scaled to fit.
  const scale = Math.min(canvas.width / WORLD.width, canvas.height / WORLD.height);
  ctx.setTransform(scale, 0, 0, scale, (canvas.width - WORLD.width * scale) / 2, (canvas.height - WORLD.height * scale) / 2);
}

window.addEventListener('resize', fitCanvas);
fitCanvas();

const input = createInput();
attachInput(input, canvas);
const audio = createAudio();

const shotParams = parseShotParams(window.location.search);
let game;
let shotMode = false;
if (shotParams.shot) {
  const built = buildShotGame(shotParams.shot, shotParams.seed);
  game = built.game;
  shotMode = true;
} else {
  game = createGame((Math.random() * 2147483647) | 0);
}

// Sound triggers watch these counters so a sound fires exactly once per event.
let lastHarvested = game.harvested;
let lastLevel = game.level;
let lastLives = game.lives;
let lastDash = 0;

function announceStatus() {
  if (game.mode === 'title') statusEl.textContent = 'Orbit Harvest. Press Enter to launch.';
  else if (game.mode === 'playing') statusEl.textContent = 'Score ' + game.score + ', level ' + game.level + ', ' + game.lives + ' lives left.';
  else if (game.mode === 'won') statusEl.textContent = 'Bountiful harvest! Final score ' + game.score + '. Press R to fly again.';
  else statusEl.textContent = 'Game over. Final score ' + game.score + '. Press R to fly again.';
}

function startRun() {
  unlockAudio(audio);
  playLaunch(audio);
  resetRun(game);
  lastHarvested = 0;
  lastLevel = 1;
  lastLives = 3;
  announceStatus();
}

canvas.addEventListener('pointerdown', () => {
  unlockAudio(audio);
  if (game.mode === 'title') startRun();
  else if (game.mode === 'won' || game.mode === 'over') startRun();
});

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!shotMode) {
    if (input.pressedStart && game.mode === 'title') startRun();
    if (input.pressedRestart && (game.mode === 'won' || game.mode === 'over')) startRun();
    if (input.pressedMute) {
      audio.muted = !audio.muted;
    }
    if (game.mode === 'playing') {
      const beforeDash = game.ship.dashCooldown;
      updateGame(game, input, dt);
      if (game.harvested > lastHarvested) {
        playCollect(audio, game.combo);
        lastHarvested = game.harvested;
      }
      if (game.level > lastLevel) {
        playLevelUp(audio);
        lastLevel = game.level;
      }
      if (game.lives < lastLives) {
        playHit(audio);
        lastLives = game.lives;
      }
      if (game.ship.dash > 0 && beforeDash <= 0 && lastDash <= 0) {
        playDash(audio);
        lastDash = 0.5;
      }
      if (lastDash > 0) lastDash -= dt;
      if (game.mode === 'won') playWin(audio);
      if (game.mode === 'over') playHit(audio);
    } else {
      updateGame(game, input, dt);
    }
    announceStatus();
  }
  clearPresses(input);
  drawGame(ctx, game);
  requestAnimationFrame(frame);
}

announceStatus();
requestAnimationFrame(frame);
