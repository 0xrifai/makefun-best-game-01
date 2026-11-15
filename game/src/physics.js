// physics.js — one fixed-step update of the run: orbit steering, dash,
// spawning, collisions, particles, and the win/lose transitions.
import {
  WORLD,
  spawnOrb,
  spawnAsteroid,
  collectOrb,
  hitAsteroid,
  burstParticles,
  polarToXY,
  shipPosition,
} from './state.js';

const TWO_PI = Math.PI * 2;

function angleDifference(from, to) {
  let d = (to - from) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

function nearestOrbAngle(game) {
  const ship = game.ship;
  let best = null;
  let bestScore = Infinity;
  for (const orb of game.orbs) {
    const dAngle = Math.abs(angleDifference(ship.angle, orb.angle));
    const dRadius = Math.abs(ship.radius - orb.radius);
    const score = dAngle * 220 + dRadius;
    if (score < bestScore) {
      bestScore = score;
      best = orb;
    }
  }
  return best;
}

// Steer the ship toward an orb. Used by the autopilot; the same numbers
// drive the feel of manual play when the player holds a direction.
export function steerTowardOrb(game, orb, dt) {
  const ship = game.ship;
  const dAngle = angleDifference(ship.angle, orb.angle);
  const dRadius = orb.radius - ship.radius;
  ship.targetSpeed = 0.55 + Math.min(0.5, Math.abs(dAngle) * 0.9);
  if (dAngle > 0.03) ship.targetSpeed = Math.abs(ship.targetSpeed);
  else if (dAngle < -0.03) ship.targetSpeed = -Math.abs(ship.targetSpeed);
  else ship.targetSpeed = ship.targetSpeed * 0.4;
  ship.targetRadius += Math.max(-90, Math.min(90, dRadius * 2.2)) * dt;
}

export function updateGame(game, input, dt) {
  game.time += dt;
  const ship = game.ship;

  // Starfield drift (background only).
  for (const star of game.stars) {
    star.twinkle += dt * 2;
    star.x -= star.speed * dt * 4;
    if (star.x < 0) star.x += WORLD.width;
  }

  if (game.messageTime > 0) game.messageTime -= dt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 40);

  if (game.mode === 'title') {
    // A slow demo orbit behind the title screen.
    ship.angle += dt * 0.25;
    ship.radius = 230 + Math.sin(game.time * 0.5) * 30;
    return;
  }
  if (game.mode === 'won' || game.mode === 'over') {
    updateParticles(game, dt);
    return;
  }

  // --- steering -----------------------------------------------------------
  const baseSpeed = 0.55 + (game.level - 1) * 0.03;
  if (input.left) ship.targetSpeed = -(baseSpeed + 0.55);
  else if (input.right) ship.targetSpeed = baseSpeed + 0.55;
  else if (input.autopilot) {
    const orb = nearestOrbAngle(game);
    if (orb) steerTowardOrb(game, orb, dt);
  } else {
    // Ease back toward the cruise speed when no key is held.
    ship.targetSpeed += (baseSpeed - ship.targetSpeed) * Math.min(1, dt * 2);
  }
  if (input.up) ship.targetRadius -= 130 * dt;
  else if (input.down) ship.targetRadius += 130 * dt;
  else if (input.autopilot) {
    const orb = nearestOrbAngle(game);
    if (orb) ship.targetRadius += Math.max(-90, Math.min(90, (orb.radius - ship.radius) * 2.2)) * dt;
  }
  // Mouse: hold the button to pull the orbit toward the pointer's radius.
  if (input.mouseDown && input.mouseActive) {
    const dx = input.mouseX - WORLD.centerX;
    const dy = input.mouseY - WORLD.centerY;
    const pointerRadius = Math.hypot(dx, dy);
    const pointerAngle = Math.atan2(dy, dx);
    ship.targetRadius += Math.max(-160, Math.min(160, (pointerRadius - ship.radius) * 3)) * dt;
    const dAngle = angleDifference(ship.angle, pointerAngle);
    ship.targetSpeed = Math.max(-1.4, Math.min(1.4, dAngle * 2.2));
  }
  ship.targetRadius = Math.max(WORLD.minOrbit, Math.min(WORLD.maxOrbit, ship.targetRadius));

  // Dash: a short burst of orbit speed on a cooldown.
  if (ship.dashCooldown > 0) ship.dashCooldown -= dt;
  if ((input.pressedDash || input.dash) && ship.dashCooldown <= 0 && ship.dash <= 0) {
    ship.dash = 0.45;
    ship.dashCooldown = 2.2;
  }
  const dashBoost = ship.dash > 0 ? 2.1 : 1;
  if (ship.dash > 0) ship.dash -= dt;

  ship.speed += (ship.targetSpeed - ship.speed) * Math.min(1, dt * 6);
  ship.radius += (ship.targetRadius - ship.radius) * Math.min(1, dt * 5);
  ship.angle = (ship.angle + ship.speed * dashBoost * dt) % TWO_PI;
  if (ship.invulnerable > 0) ship.invulnerable -= dt;

  // Ship trail for the motion feel.
  const pos = shipPosition(game);
  ship.trail.push({ x: pos.x, y: pos.y, life: 0.35 });
  if (ship.trail.length > 26) ship.trail.shift();
  for (const t of ship.trail) t.life -= dt;
  ship.trail = ship.trail.filter((t) => t.life > 0);

  // --- orbs ----------------------------------------------------------------
  for (const orb of game.orbs) {
    orb.pulse += dt * 4;
    orb.angle = (orb.angle + orb.drift * dt) % TWO_PI;
  }
  const targetOrbs = 5 + game.level;
  while (game.orbs.length < targetOrbs) spawnOrb(game);

  // --- asteroids ------------------------------------------------------------
  const targetRocks = Math.min(2 + game.level, 8);
  while (game.asteroids.length < targetRocks) spawnAsteroid(game);
  for (const rock of game.asteroids) {
    rock.x += rock.vx * dt;
    rock.y += rock.vy * dt;
    rock.rotation += rock.spin * dt;
  }
  game.asteroids = game.asteroids.filter(
    (rock) => rock.x > -80 && rock.x < WORLD.width + 80 && rock.y > -80 && rock.y < WORLD.height + 80,
  );

  updateParticles(game, dt);

  // --- collisions ------------------------------------------------------------
  const shipPos = shipPosition(game);
  for (let i = game.orbs.length - 1; i >= 0; i--) {
    const orb = game.orbs[i];
    const op = polarToXY(orb.angle, orb.radius);
    const d = Math.hypot(op.x - shipPos.x, op.y - shipPos.y);
    if (d < orb.size + 18) {
      game.orbs.splice(i, 1);
      collectOrb(game, orb);
      if (game.mode !== 'playing') return;
    }
  }
  if (ship.invulnerable <= 0) {
    for (const rock of game.asteroids) {
      const d = Math.hypot(rock.x - shipPos.x, rock.y - shipPos.y);
      if (d < rock.radius + 14) {
        hitAsteroid(game);
        break;
      }
      // Near miss: threading a rock closer than 26px past its edge pays +5.
      if (d < rock.radius + 40 && !rock.nearMissed) {
        rock.nearMissed = true;
        game.score += 5;
        burstParticles(game, shipPos.x, shipPos.y, '#8ecae6', 6, 90);
      }
    }
  }
}

function updateParticles(game, dt) {
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - dt * 1.5;
    p.vy *= 1 - dt * 1.5;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}
