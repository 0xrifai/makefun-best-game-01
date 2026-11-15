// audio.js — tiny WebAudio synth: every sound is an oscillator envelope,
// no audio files, nothing fetched. Created lazily on the first user gesture
// so browsers allow it; muted with M.
export function createAudio() {
  return {
    ctx: null,
    muted: false,
    master: null,
  };
}

function ensureContext(audio) {
  if (audio.ctx) return audio.ctx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.16;
    audio.master.connect(audio.ctx.destination);
  } catch (err) {
    audio.ctx = null;
  }
  return audio.ctx;
}

export function unlockAudio(audio) {
  const ctx = ensureContext(audio);
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function blip(audio, freqStart, freqEnd, duration, type, volume) {
  if (audio.muted) return;
  const ctx = ensureContext(audio);
  if (!ctx || !audio.master) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(now);
  osc.stop(now + duration);
}

export function playCollect(audio, combo) {
  const base = 520 + Math.min(combo, 12) * 45;
  blip(audio, base, base * 1.6, 0.14, 'sine', 0.9);
  blip(audio, base * 2, base * 2.4, 0.1, 'triangle', 0.35);
}

export function playHit(audio) {
  blip(audio, 180, 50, 0.35, 'sawtooth', 0.9);
  blip(audio, 90, 40, 0.3, 'square', 0.4);
}

export function playLevelUp(audio) {
  blip(audio, 440, 660, 0.12, 'triangle', 0.7);
  setTimeout(() => blip(audio, 660, 880, 0.16, 'triangle', 0.7), 110);
  setTimeout(() => blip(audio, 880, 1320, 0.2, 'triangle', 0.7), 220);
}

export function playWin(audio) {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => blip(audio, freq, freq * 1.02, 0.3, 'triangle', 0.7), i * 140);
  });
}

export function playDash(audio) {
  blip(audio, 300, 900, 0.18, 'sine', 0.5);
}

export function playLaunch(audio) {
  blip(audio, 220, 520, 0.25, 'triangle', 0.7);
  setTimeout(() => blip(audio, 520, 780, 0.2, 'triangle', 0.5), 120);
}
