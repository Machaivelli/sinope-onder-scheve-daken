// Legal practice coins only. Story choices and the real mint affair belong to
// the chapter model, never to a mistimed strike in this minigame.
export const MINT_RULES = Object.freeze({
  target: 5,
  maxAttempts: 8,
  strikePause: .5,
});

// Full zone widths. Eight readable patterns; no hidden randomness or timer.
const PATTERNS = Object.freeze([
  { center: .50, width: .34, perfectWidth: .10, speed: .52, start: .08, direction: 1 },
  { center: .68, width: .32, perfectWidth: .10, speed: .57, start: .10, direction: 1 },
  { center: .31, width: .32, perfectWidth: .09, speed: .54, start: .90, direction: -1 },
  { center: .60, width: .30, perfectWidth: .09, speed: .62, start: .07, direction: 1 },
  { center: .37, width: .28, perfectWidth: .08, speed: .58, start: .92, direction: -1 },
  { center: .70, width: .30, perfectWidth: .09, speed: .64, start: .10, direction: 1 },
  { center: .27, width: .28, perfectWidth: .08, speed: .60, start: .89, direction: -1 },
  { center: .52, width: .32, perfectWidth: .10, speed: .56, start: .06, direction: 1 },
].map(pattern => Object.freeze(pattern)));

const EPSILON = 1e-9;
const playing = state => state?.kind === 'mint' && state.phase === 'playing';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const patternFor = state => PATTERNS[Math.min(state.round - 1, PATTERNS.length - 1)];

function prepareRound(state) {
  state.round = state.attempts + 1;
  state.phaseTime = 0;
  state.cooldown = 0;
  const pattern = patternFor(state);
  state.zone = { center: pattern.center, width: pattern.width, perfectWidth: pattern.perfectWidth };
  state.cursor = pattern.start;
  state.direction = pattern.direction;
}

export function createMintGame() {
  const state = {
    kind: 'mint', title: 'Muntslag', phase: 'intro', time: 0, phaseTime: 0,
    round: 1, attempts: 0, maxAttempts: MINT_RULES.maxAttempts,
    good: 0, target: MINT_RULES.target, score: 0, perfect: 0,
    cursor: 0, direction: 1, zone: null, cooldown: 0,
    collected: [], lastEvent: null, serial: 0,
    log: ['Vijf goede oefenmunten. Acht slagen. Neem de tijd.'],
  };
  prepareRound(state);
  return state;
}

export function beginMintGame(state) {
  if (state?.kind !== 'mint' || state.phase !== 'intro') return state;
  state.phase = 'playing';
  state.log = ['Sla in de groene zone. In het goud sla je perfect!'];
  return state;
}

function record(state, grade, points, accuracy) {
  const won = state.good >= state.target;
  const lost = !won && state.attempts >= state.maxAttempts;
  const strikeLabel = grade === 'perfect' ? `Zuiver geslagen! +${points}`
    : grade === 'good' ? `Goede munt! +${points}`
      : 'Naast de stempel. Wacht op de groene zone.';
  state.phase = won ? 'won' : lost ? 'lost' : 'playing';
  const label = won ? 'Vijf goede oefenmunten. Damas knikt goedkeurend.'
    : lost ? 'Damas smelt de proefmunten om. Nog een poging?'
      : strikeLabel;
  state.lastEvent = {
    id: ++state.serial, type: won ? 'won' : lost ? 'lost' : grade,
    grade, label, strikeLabel, points, accuracy,
    cursor: state.cursor, round: state.round, time: state.time,
  };
  state.log = [...state.log, strikeLabel, ...(won || lost ? [label] : [])].slice(-4);
}

export function strikeMint(state) {
  if (!playing(state) || state.cooldown > EPSILON) return state;
  const distance = Math.abs(state.cursor - state.zone.center);
  const accuracy = clamp(1 - distance / (state.zone.width / 2), 0, 1);
  const grade = distance <= state.zone.perfectWidth / 2 + EPSILON ? 'perfect'
    : distance <= state.zone.width / 2 + EPSILON ? 'good' : 'miss';
  const points = grade === 'perfect' ? 200 + Math.round(50 * accuracy)
    : grade === 'good' ? 100 + Math.round(50 * accuracy) : 0;
  state.attempts++;
  state.collected.push(grade);
  if (grade !== 'miss') state.good++;
  if (grade === 'perfect') state.perfect++;
  state.score += points;
  state.cooldown = MINT_RULES.strikePause;
  record(state, grade, points, accuracy);
  return state;
}

export function stepMintGame(state, dt) {
  if (!playing(state) || !Number.isFinite(dt) || dt <= 0) return state;
  state.time += dt;
  let remaining = dt;
  if (state.cooldown > 0) {
    const paused = Math.min(remaining, state.cooldown);
    state.cooldown = Math.max(0, state.cooldown - paused);
    remaining -= paused;
    if (state.cooldown > EPSILON) return state;
    prepareRound(state);
  }
  state.phaseTime += remaining;
  const pattern = patternFor(state);
  // Absolute phase avoids accumulated bounce/clamping errors across framerates.
  const travel = pattern.start + pattern.direction * state.phaseTime * pattern.speed;
  const cycle = ((travel % 2) + 2) % 2;
  state.cursor = cycle <= 1 ? cycle : 2 - cycle;
  state.direction = pattern.direction * (cycle < 1 ? 1 : -1);
  return state;
}
