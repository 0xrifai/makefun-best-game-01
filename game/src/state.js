// state.js — the whole game state: one plain object, created fresh for a
// new game, mutated only through the helpers in this file. Nothing here
// touches the canvas or the network.
import { makeRng, range, rangeInt } from './rng.js';

export const WORLD = {
  width: 1280,
  height: 800,
  centerX: 640,
  centerY: 400,
  planetRadius: 92,
  minOrbit: 150,
  maxOrbit: 330,
  winScore: 1000,
  orbsPerLevel: 10,
};

export const COLOURS = {
  orb: ['#ffd166', '#7bf1a8', '#8ecae6', '#f78fb3'],
};

export function createGame(seed) {
  const rng = makeRng(seed);
  const game = {
    seed,
    rng,
    mode: 'title', // title | playing | won | over
    time: 0,
    score: 0,
    bestCombo: 0,
    combo: 0,
    lives: 3,
    level: 1,
    harvested: 0,
    ship: {
      angle: -Math.PI / 2,
      radius: 220,
      speed: 0.55, // radians per second, base orbit speed
      targetRadius: 220,
      targetSpeed: 0.55,
      dash: 0, // dash time remaining
      dashCooldown: 0,
      invulnerable: 0,
      trail: [],
    },
    orbs: [],
    asteroids: [],
    particles: [],
    stars: [],
    shake: 0,
    message: '',
    messageTime: 0,
  };
  for (let i = 0; i < 140; i++) {
    game.stars.push({
      x: rng() * WORLD.width,
      y: rng() * WORLD.height,
      size: range(rng, 0.6, 2.2),
      twinkle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 0.2, 0.9),
    });
  }
  return game;
}

export function resetRun(game) {
  const keepStars = game.stars;
  const fresh = createGame(game.seed);
  fresh.stars = keepStars;
  Object.assign(game, fresh);
  game.mode = 'playing';
  for (let i = 0; i < 5; i++) spawnOrb(game);
  for (let i = 0; i < 2; i++) spawnAsteroid(game);
}

export function spawnOrb(game) {
  const rng = game.rng;
  game.orbs.push({
    angle: rng() * Math.PI * 2,
    radius: range(rng, WORLD.minOrbit + 10, WORLD.maxOrbit - 10),
    size: range(rng, 9, 14),
    colour: COLOURS.orb[rangeInt(rng, 0, COLOURS.orb.length - 1)],
    pulse: rng() * Math.PI * 2,
    drift: range(rng, -0.05, 0.05),
    value: 10,
  });
}

export function spawnAsteroid(game) {
  const rng = game.rng;
  const edge = rangeInt(rng, 0, 3);
  const margin = 40;
  let x, y;
  if (edge === 0) { x = rng() * WORLD.width; y = -margin; }
  else if (edge === 1) { x = WORLD.width + margin; y = rng() * WORLD.height; }
  else if (edge === 2) { x = rng() * WORLD.width; y = WORLD.height + margin; }
  else { x = -margin; y = rng() * WORLD.height; }
  const tx = WORLD.centerX + range(rng, -120, 120);
  const ty = WORLD.centerY + range(rng, -120, 120);
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = range(rng, 55, 95) + game.level * 7;
  game.asteroids.push({
    x, y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    radius: range(rng, 14, 30),
    spin: range(rng, -1.2, 1.2),
    rotation: rng() * Math.PI * 2,
    bumps: rangeInt(rng, 5, 8),
    bumpSeed: rng() * 100,
  });
}

export function burstParticles(game, x, y, colour, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = game.rng() * Math.PI * 2;
    const s = range(game.rng, speed * 0.3, speed);
    game.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: range(game.rng, 0.4, 0.9),
      maxLife: 0.9,
      size: range(game.rng, 2, 5),
      colour,
    });
  }
}

export function collectOrb(game, orb) {
  game.combo += 1;
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  // Gentle ramp: a flat 10 plus 2 per combo step, so a win at 1,000 takes
  // a real run (~35 seeds) instead of one lucky streak.
  const gained = orb.value + 2 * (game.combo - 1);
  game.score += gained;
  game.harvested += 1;
  const pos = polarToXY(orb.angle, orb.radius);
  burstParticles(game, pos.x, pos.y, orb.colour, 14, 160);
  if (game.harvested % WORLD.orbsPerLevel === 0) {
    levelUp(game);
  }
  if (game.score >= WORLD.winScore) {
    game.mode = 'won';
    game.message = 'BOUNTIFUL HARVEST!';
    game.messageTime = 3;
  }
  return gained;
}

export function levelUp(game) {
  game.level += 1;
  game.message = 'LEVEL ' + game.level + ' — THE FIELD GROWS WILD';
  game.messageTime = 2.2;
  for (let i = 0; i < 2; i++) spawnAsteroid(game);
}

export function hitAsteroid(game) {
  if (game.ship.invulnerable > 0) return false;
  game.lives -= 1;
  game.combo = 0;
  game.ship.invulnerable = 2.5;
  game.shake = 14;
  const pos = shipPosition(game);
  burstParticles(game, pos.x, pos.y, '#ff5d5d', 26, 260);
  if (game.lives <= 0) {
    game.mode = 'over';
    game.message = 'THE HARVEST IS LOST';
    game.messageTime = 3;
  } else {
    game.message = 'HULL HIT! ' + game.lives + (game.lives === 1 ? ' LIFE' : ' LIVES') + ' LEFT';
    game.messageTime = 1.8;
  }
  return true;
}

export function polarToXY(angle, radius) {
  return {
    x: WORLD.centerX + Math.cos(angle) * radius,
    y: WORLD.centerY + Math.sin(angle) * radius,
  };
}

// Points still needed before the harvest is complete.
export function remainingToWin(game) {
  return Math.max(0, WORLD.winScore - game.score);
}

export function shipPosition(game) {
  return polarToXY(game.ship.angle, game.ship.radius);
}
