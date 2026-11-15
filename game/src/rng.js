// rng.js — small seeded random number generator so screenshot shots are
// deterministic. mulberry32: fast, tiny, and good enough for spawn placement.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick a value in [min, max) from a rng function.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Pick an integer in [min, max] inclusive from a rng function.
export function rangeInt(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

// Pick one element of an array using a rng function.
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// Shuffle an array in place using a rng function (Fisher-Yates).
export function shuffle(rng, items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
