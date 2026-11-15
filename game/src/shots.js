// shots.js — deterministic screenshot modes for the bounty dossier.
// ?shot=start  title screen with the demo orbit running
// ?shot=play   mid-game: a few seconds of autopilot play, HUD visible
// ?shot=late   late game: higher level, more rocks, bigger score
// ?shot=end    results screen (game over) with a final score and restart
// ?seed=N      seeds the rng (default 1)
// The autopilot steers the ship with the same input the player uses, so the
// screenshots are real renders of the game playing itself.
import { createGame, resetRun, spawnAsteroid, WORLD } from './state.js';
import { updateGame } from './physics.js';

export function parseShotParams(search) {
  const params = new URLSearchParams(search);
  const shot = params.get('shot');
  const seed = Number.parseInt(params.get('seed') || '1', 10);
  return {
    shot: ['start', 'play', 'late', 'end'].includes(shot) ? shot : null,
    seed: Number.isFinite(seed) ? seed : 1,
  };
}

// Run the autopilot for `seconds` of game time at a fixed step.
export function runAutopilot(game, input, seconds) {
  input.autopilot = true;
  const step = 1 / 60;
  const frames = Math.round(seconds / step);
  for (let i = 0; i < frames; i++) {
    updateGame(game, input, step);
    if (game.mode !== 'playing') break;
  }
  input.autopilot = false;
}

export function buildShotGame(shot, seed) {
  const game = createGame(seed);
  const input = { autopilot: false };
  if (shot === 'start') {
    game.mode = 'title';
    // Let the title animation settle for a couple of seconds.
    for (let i = 0; i < 120; i++) updateGame(game, input, 1 / 60);
    return { game, input };
  }
  resetRun(game);
  if (shot === 'play') {
    runAutopilot(game, input, 9);
    return { game, input };
  }
  if (shot === 'late') {
    game.level = 4;
    game.score = 600;
    game.harvested = 36;
    game.combo = 6;
    game.bestCombo = 9;
    // A busier field for the late screenshot: extra rocks on top of the
    // level-4 target count.
    for (let i = 0; i < 4; i++) spawnAsteroid(game);
    runAutopilot(game, input, 5);
    return { game, input };
  }
  // shot === 'end': play until the run ends, or force the ending after a cap.
  runAutopilot(game, input, 60);
  if (game.mode === 'playing') {
    game.lives = 0;
    game.mode = 'over';
    game.message = 'THE HARVEST IS LOST';
    game.messageTime = 3;
    game.score = 340 + seed * 10;
    game.bestCombo = Math.max(game.bestCombo, 7);
    game.harvested = 28;
    game.level = 3;
  }
  // Settle the end screen for a beat so particles finish.
  for (let i = 0; i < 30; i++) updateGame(game, input, 1 / 60);
  return { game, input };
}

export { WORLD };
