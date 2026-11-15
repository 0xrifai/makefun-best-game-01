// input.js — keyboard + mouse + touch state. The game reads this each frame;
// the autopilot (shots.js) writes the same shape, so scripted play and human
// play go through one path.
export function createInput() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    dash: false,
    restart: false,
    start: false,
    mute: false,
    // Mouse: position in canvas CSS pixels, and whether the button is held.
    mouseX: 640,
    mouseY: 400,
    mouseDown: false,
    mouseActive: false,
    // Edge-triggered actions, consumed by the loop once per press.
    pressedStart: false,
    pressedRestart: false,
    pressedDash: false,
    pressedMute: false,
    // The screenshot autopilot drives the same fields a player does.
    autopilot: false,
  };
}

const KEY_MAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'dash',
  Enter: 'start',
  KeyR: 'restart',
  KeyM: 'mute',
};

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    const field = KEY_MAP[event.code];
    if (!field) return;
    event.preventDefault();
    if (event.repeat) return;
    input[field] = true;
    if (field === 'start') input.pressedStart = true;
    if (field === 'restart') input.pressedRestart = true;
    if (field === 'dash') input.pressedDash = true;
    if (field === 'mute') input.pressedMute = true;
  });
  window.addEventListener('keyup', (event) => {
    const field = KEY_MAP[event.code];
    if (!field) return;
    input[field] = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
    input.mouseActive = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
    input.mouseDown = true;
    input.mouseActive = true;
  });
  window.addEventListener('pointerup', () => {
    input.mouseDown = false;
  });
}

// Clear the one-shot presses after the loop has consumed them.
export function clearPresses(input) {
  input.pressedStart = false;
  input.pressedRestart = false;
  input.pressedDash = false;
  input.pressedMute = false;
}
