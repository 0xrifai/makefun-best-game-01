// render.js — every pixel the game draws: starfield, planet, orbit rings,
// ship, orbs, asteroids, particles, HUD, and the title / win / game-over
// screens. Pure drawing from the state; no game logic lives here.
import { WORLD, polarToXY, shipPosition } from './state.js';

const TWO_PI = Math.PI * 2;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStarfield(ctx, game) {
  ctx.fillStyle = '#070b1d';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const nebula = ctx.createRadialGradient(980, 140, 40, 980, 140, 420);
  nebula.addColorStop(0, 'rgba(88, 60, 180, 0.28)');
  nebula.addColorStop(1, 'rgba(88, 60, 180, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const nebula2 = ctx.createRadialGradient(180, 640, 30, 180, 640, 380);
  nebula2.addColorStop(0, 'rgba(20, 120, 140, 0.22)');
  nebula2.addColorStop(1, 'rgba(20, 120, 140, 0)');
  ctx.fillStyle = nebula2;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  for (const star of game.stars) {
    const alpha = 0.35 + 0.65 * Math.abs(Math.sin(star.twinkle));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#dfe9ff';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawOrbitRings(ctx, game) {
  ctx.strokeStyle = 'rgba(160, 190, 255, 0.14)';
  ctx.lineWidth = 1;
  for (const r of [WORLD.minOrbit, 190, 230, 270, WORLD.maxOrbit]) {
    ctx.beginPath();
    ctx.arc(WORLD.centerX, WORLD.centerY, r, 0, TWO_PI);
    ctx.stroke();
  }
  // Dashed guide for the ship's current orbit.
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.35)';
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.arc(WORLD.centerX, WORLD.centerY, game.ship.radius, 0, TWO_PI);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlanet(ctx, game) {
  const { centerX, centerY, planetRadius } = WORLD;
  const glow = ctx.createRadialGradient(centerX, centerY, planetRadius * 0.4, centerX, centerY, planetRadius * 2.1);
  glow.addColorStop(0, 'rgba(94, 234, 160, 0.30)');
  glow.addColorStop(1, 'rgba(94, 234, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(centerX - 260, centerY - 260, 520, 520);

  const body = ctx.createRadialGradient(centerX - 28, centerY - 34, 12, centerX, centerY, planetRadius);
  body.addColorStop(0, '#b8f5d3');
  body.addColorStop(0.45, '#4ecb8d');
  body.addColorStop(1, '#14532f');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(centerX, centerY, planetRadius, 0, TWO_PI);
  ctx.fill();

  // Continents: soft blobs that drift slowly with time.
  ctx.fillStyle = 'rgba(20, 90, 55, 0.55)';
  for (let i = 0; i < 5; i++) {
    const a = game.time * 0.05 + (i * TWO_PI) / 5;
    const bx = centerX + Math.cos(a) * 42;
    const by = centerY + Math.sin(a * 1.3) * 34;
    ctx.beginPath();
    ctx.ellipse(bx, by, 26 - i * 2, 15 + i, a, 0, TWO_PI);
    ctx.fill();
  }
  // Cloud swirls.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  for (let i = 0; i < 3; i++) {
    const a = -game.time * 0.08 + (i * TWO_PI) / 3;
    ctx.beginPath();
    ctx.ellipse(centerX + Math.cos(a) * 52, centerY + Math.sin(a) * 40, 30, 7, a, 0, TWO_PI);
    ctx.fill();
  }
  // Ring around the planet.
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.75)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, planetRadius + 26, 16, -0.35, 0, TWO_PI);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.25)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, planetRadius + 26, 16, -0.35, 0, TWO_PI);
  ctx.stroke();
}

function drawOrbs(ctx, game) {
  for (const orb of game.orbs) {
    const pos = polarToXY(orb.angle, orb.radius);
    const pulse = 1 + Math.sin(orb.pulse) * 0.18;
    const r = orb.size * pulse;
    const glow = ctx.createRadialGradient(pos.x, pos.y, 1, pos.x, pos.y, r * 2.6);
    glow.addColorStop(0, orb.colour);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r * 2.6, 0, TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Four-point star seed.
    ctx.fillStyle = orb.colour;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - r);
    ctx.quadraticCurveTo(pos.x, pos.y, pos.x + r, pos.y);
    ctx.quadraticCurveTo(pos.x, pos.y, pos.x, pos.y + r);
    ctx.quadraticCurveTo(pos.x, pos.y, pos.x - r, pos.y);
    ctx.quadraticCurveTo(pos.x, pos.y, pos.x, pos.y - r);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r * 0.28, 0, TWO_PI);
    ctx.fill();
  }
}

function drawAsteroids(ctx, game) {
  for (const rock of game.asteroids) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rotation);
    const shade = ctx.createRadialGradient(-rock.radius * 0.3, -rock.radius * 0.3, 2, 0, 0, rock.radius * 1.2);
    shade.addColorStop(0, '#8d7d6b');
    shade.addColorStop(1, '#3d3229');
    ctx.fillStyle = shade;
    ctx.beginPath();
    for (let i = 0; i <= rock.bumps; i++) {
      const a = (i / rock.bumps) * TWO_PI;
      const wobble = 1 + 0.22 * Math.sin(rock.bumpSeed + i * 2.7);
      const rr = rock.radius * wobble;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 120, 90, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Crater dots.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(-rock.radius * 0.3, rock.radius * 0.2, rock.radius * 0.22, 0, TWO_PI);
    ctx.arc(rock.radius * 0.35, -rock.radius * 0.25, rock.radius * 0.16, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}

function drawShip(ctx, game) {
  const ship = game.ship;
  const pos = shipPosition(game);
  // Trail.
  for (const t of ship.trail) {
    ctx.globalAlpha = (t.life / 0.35) * 0.5;
    ctx.fillStyle = '#7bf1a8';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 5, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const blink = ship.invulnerable > 0 && Math.floor(game.time * 12) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  // The ship points along its orbit direction.
  ctx.rotate(ship.angle + Math.PI / 2 + (ship.speed >= 0 ? 0 : Math.PI));
  // Engine flame.
  const flame = ship.dash > 0 ? 26 : 12 + Math.sin(game.time * 30) * 4;
  const flameGrad = ctx.createLinearGradient(0, 10, 0, 10 + flame);
  flameGrad.addColorStop(0, '#ffd166');
  flameGrad.addColorStop(1, 'rgba(255, 93, 93, 0)');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(0, 10 + flame);
  ctx.lineTo(6, 10);
  ctx.closePath();
  ctx.fill();
  // Hull: a little harvester dart.
  const hull = ctx.createLinearGradient(0, -16, 0, 12);
  hull.addColorStop(0, '#eaf6ff');
  hull.addColorStop(0.6, '#8ecae6');
  hull.addColorStop(1, '#2a6f97');
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(11, 10);
  ctx.lineTo(4, 7);
  ctx.lineTo(-4, 7);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0b2233';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Cockpit + cargo pod.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, -5, 4, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = '#7bf1a8';
  ctx.fillRect(-3, 2, 6, 5);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHearts(ctx, x, y, lives) {
  for (let i = 0; i < 3; i++) {
    const hx = x + i * 30;
    ctx.fillStyle = i < lives ? '#ff5d7a' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(hx, y + 8);
    ctx.bezierCurveTo(hx - 9, y - 2, hx - 5, y - 10, hx, y - 4);
    ctx.bezierCurveTo(hx + 5, y - 10, hx + 9, y - 2, hx, y + 8);
    ctx.fill();
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = 'rgba(4, 8, 24, 0.55)';
  roundRect(ctx, 16, 14, 300, 96, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 32, 40);
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText(String(game.score), 32, 72);
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText('LEVEL ' + game.level, 32, 96);
  ctx.fillStyle = '#7bf1a8';
  ctx.fillText('COMBO x' + Math.max(1, game.combo), 140, 96);

  ctx.fillStyle = 'rgba(4, 8, 24, 0.55)';
  roundRect(ctx, 964, 14, 300, 96, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText('HULL', 984, 40);
  drawHearts(ctx, 984, 48, game.lives);
  // Progress to the win.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 984, 82, 260, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#7bf1a8';
  const progress = Math.min(1, game.score / WORLD.winScore);
  roundRect(ctx, 984, 82, 260 * progress, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('HARVEST ' + WORLD.winScore + ' TO WIN', 984, 72);

  // Dash cooldown, bottom centre.
  const ship = game.ship;
  const dashReady = ship.dashCooldown <= 0;
  ctx.fillStyle = 'rgba(4, 8, 24, 0.55)';
  roundRect(ctx, 540, 748, 200, 34, 10);
  ctx.fill();
  ctx.fillStyle = dashReady ? '#ffd166' : 'rgba(255,255,255,0.35)';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(dashReady ? 'DASH READY  [SPACE]' : 'DASH RECHARGING…', 640, 770);
  ctx.textAlign = 'left';

  if (game.messageTime > 0 && game.message) {
    ctx.globalAlpha = Math.min(1, game.messageTime);
    ctx.fillStyle = '#ffd166';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.message, WORLD.centerX, 150);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(4, 10, 30, 0.78)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(139, 233, 180, 0.45)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, game) {
  drawPanel(ctx, 340, 150, 600, 430);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7bf1a8';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText('A TINY ORBITAL ARCADE', 640, 205);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px system-ui, sans-serif';
  ctx.fillText('ORBIT', 640, 275);
  ctx.fillStyle = '#ffd166';
  ctx.fillText('HARVEST', 640, 340);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '400 18px system-ui, sans-serif';
  ctx.fillText('Ride the rings. Catch the star-seeds.', 640, 385);
  ctx.fillText('Dodge the rocks. Fill the hold to 1,000.', 640, 412);
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('← →  steer orbit      ↑ ↓  change ring', 640, 460);
  ctx.fillText('SPACE  dash      MOUSE  hold to steer      M  mute', 640, 486);
  const pulse = 0.6 + 0.4 * Math.sin(game.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd166';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO LAUNCH', 640, 540);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawEndScreen(ctx, game, won) {
  drawPanel(ctx, 340, 170, 600, 400);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#7bf1a8' : '#ff5d7a';
  ctx.font = '900 46px system-ui, sans-serif';
  ctx.fillText(won ? 'BOUNTIFUL HARVEST!' : 'THE HARVEST IS LOST', 640, 245);
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 19px system-ui, sans-serif';
  ctx.fillText(
    won
      ? 'The hold is full — the planet sings your name.'
      : 'Your hull gave out among the rocks. The seeds remain.',
    640, 285,
  );
  ctx.fillStyle = '#ffd166';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText('FINAL SCORE  ' + game.score, 640, 345);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText('LEVEL REACHED  ' + game.level + '     BEST COMBO  x' + Math.max(1, game.bestCombo), 640, 380);
  ctx.fillText('STAR-SEEDS GATHERED  ' + game.harvested, 640, 410);
  const pulse = 0.6 + 0.4 * Math.sin(game.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#7bf1a8';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', 640, 480);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export function drawGame(ctx, game) {
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  drawStarfield(ctx, game);
  drawOrbitRings(ctx, game);
  drawPlanet(ctx, game);
  drawOrbs(ctx, game);
  drawAsteroids(ctx, game);
  drawParticles(ctx, game);
  drawShip(ctx, game);
  if (game.mode === 'playing') drawHud(ctx, game);
  if (game.mode === 'title') drawTitle(ctx, game);
  if (game.mode === 'won') drawEndScreen(ctx, game, true);
  if (game.mode === 'over') drawEndScreen(ctx, game, false);
  // Soft vignette so the scene reads at a glance when shrunk.
  const vignette = ctx.createRadialGradient(640, 400, 320, 640, 400, 720);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();
}
