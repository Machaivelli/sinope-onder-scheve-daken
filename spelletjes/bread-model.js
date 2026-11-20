// Brood & spelen: rules run without a renderer or wall-clock timers.
export const BREAD_RULES = Object.freeze({
  version: 2,
  duration: 24,
  target: 10,
  silver: 14,
  gold: 18,
  totalLoaves: 19,
  lives: 4,
  catchProgress: .9,
  dogProgress: .6,
  dogDuration: .7,
  dogCooldown: 4,
});

// Three safe throws teach movement. Every lane then receives four visible coal
// throws: Argos helps with bread, but cannot replace steering the basket.
// Paired loaves reward a saved dog dive; every throw has a safe catching lane.
export const BREAD_WAVES = Object.freeze([
  [.5, [1], []],
  [1.8, [0], []],
  [3.1, [2], []],
  [4.4, [0], [1]],
  [5.7, [1], [2]],
  [7, [2], [0]],
  [8.3, [0], [1]],
  [9.6, [0, 2], []],
  [10.9, [1], [2]],
  [12.2, [2], [0]],
  [13.5, [0], [1]],
  [14.8, [1], [2]],
  [16.1, [0, 2], []],
  [17.4, [2], [0]],
  [18.7, [0], [1]],
  [20, [1], [2]],
  [21.3, [2], [0]],
].map(([at, bread, coal], index) => Object.freeze({
  at,
  bread: Object.freeze(bread),
  coal: Object.freeze(coal),
  flight: index < 3 ? 3 : 2.7,
})));

const EPSILON = 1e-8;
const near = (a, b) => a <= b + EPSILON;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const playing = state => state?.kind === 'bread' && state.phase === 'playing';

export function createBreadGame() {
  return {
    kind: 'bread',
    rulesVersion: BREAD_RULES.version,
    phase: 'intro',
    time: 0,
    duration: BREAD_RULES.duration,
    lane: 1,
    objects: [],
    caught: 0,
    target: BREAD_RULES.target,
    misses: 0,
    hits: 0,
    lives: BREAD_RULES.lives,
    dogCooldown: 0,
    dogActive: 0,
    dogUses: 0,
    dogCatches: 0,
    combo: 0,
    bestCombo: 0,
    score: 0,
    tier: 'none',
    medalLabel: 'Nog geen medaille',
    tierTarget: BREAD_RULES.target,
    goalLabel: 'Brons · 10 broden',
    clearedAt: null,
    log: ['Vang 10 broden en houd je mand heel tot de bel.'],
    lastEvent: null,
    spawnIndex: 0,
    serial: 0,
  };
}

export function beginBreadGame(state) {
  if (state?.kind !== 'bread' || state.phase !== 'intro') return state;
  state.phase = 'playing';
  state.log = ['Vang 10 broden én houd je mand heel tot de bel. Argos helpt!'];
  return state;
}

export function moveBasket(state, lane) {
  if (!playing(state) || !Number.isInteger(lane) || lane < 0 || lane > 2) return state;
  state.lane = lane;
  return state;
}

function event(state, type, label, lane = state.lane, via) {
  state.lastEvent = { id: ++state.serial, type, label, lane, time: state.time };
  if (via) state.lastEvent.via = via;
  state.log = [...state.log, label].slice(-4);
}

function catchBread(state, object, via) {
  state.caught++;
  state.combo++;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const points = 100 + Math.min(state.combo - 1, 8) * 10 + (via === 'dog' ? 25 : 0);
  state.score += points;
  if (via === 'dog') state.dogCatches++;
  const oldTier = state.tier;
  updateMedal(state);
  const catchLabel = via === 'dog' ? `Argos! +${points}` : state.combo > 1 ? `${state.combo} op rij! +${points}` : `Gevangen! +${points}`;
  event(state, 'catch', state.tier !== oldTier ? `${state.medalLabel} op koers! ${state.goalLabel}. Houd je mand heel.` : catchLabel, object.lane, via);
}

function updateMedal(state) {
  if (state.caught >= BREAD_RULES.gold) {
    state.tier = 'gold'; state.medalLabel = 'Goud'; state.tierTarget = BREAD_RULES.totalLoaves; state.goalLabel = 'Alle 19 broden';
  } else if (state.caught >= BREAD_RULES.silver) {
    state.tier = 'silver'; state.medalLabel = 'Zilver'; state.tierTarget = BREAD_RULES.gold; state.goalLabel = 'Op naar goud · 18 broden';
  } else if (state.caught >= state.target) {
    state.tier = 'bronze'; state.medalLabel = 'Brons'; state.tierTarget = BREAD_RULES.silver; state.goalLabel = 'Op naar zilver · 14 broden';
  }
  if (state.clearedAt === null && state.caught >= state.target) state.clearedAt = state.time;
}

function dogSweep(state) {
  if (state.dogActive <= EPSILON) return;
  state.objects = state.objects.filter(object => {
    if (object.kind !== 'bread' || object.progress + EPSILON < BREAD_RULES.dogProgress) return true;
    catchBread(state, object, 'dog');
    return false;
  });
}

export function breadAction(state, action) {
  if (!playing(state)) return state;
  if (action === 'left') moveBasket(state, Math.max(0, state.lane - 1));
  else if (action === 'right') moveBasket(state, Math.min(2, state.lane + 1));
  else if (action === 'dog' && state.dogCooldown <= EPSILON) {
    state.dogActive = BREAD_RULES.dogDuration;
    state.dogCooldown = BREAD_RULES.dogCooldown;
    state.dogUses++;
    event(state, 'dog', 'Argos duikt naar de lage broden!');
    dogSweep(state);
  }
  return state;
}

function finish(state, won) {
  state.phase = won ? 'won' : 'lost';
  state.dogActive = 0;
  if (!won) { state.tier = 'none'; state.medalLabel = 'Nog geen medaille'; }
  event(state, won ? 'won' : 'lost', won
    ? `${state.medalLabel}! ${state.caught} broden gered, ${state.score} punten. Bion zet jullie naam op zijn luifel.`
    : state.lives === 0
      ? 'Te veel kolen! Bion veegt het roet eraf. Nog een ronde?'
      : `${state.caught} van ${state.target} broden. De volgende lading lukt vast!`);
}

function updateProgress(state) {
  for (const object of state.objects) object.progress = clamp((state.time - object.born) / object.flight, 0, 1);
}

function spawnDue(state) {
  while (state.spawnIndex < BREAD_WAVES.length && near(BREAD_WAVES[state.spawnIndex].at, state.time)) {
    const wave = BREAD_WAVES[state.spawnIndex++];
    for (const kind of ['bread', 'coal']) {
      for (const lane of wave[kind]) {
        state.objects.push({ id: ++state.serial, lane, kind, born: wave.at, flight: wave.flight, progress: 0 });
      }
    }
  }
}

function resolveCrossings(state) {
  dogSweep(state);
  const remaining = [];
  for (const object of state.objects) {
    if (object.progress + EPSILON < BREAD_RULES.catchProgress) {
      remaining.push(object);
      continue;
    }
    if (object.kind === 'bread') {
      if (object.lane === state.lane) catchBread(state, object, 'basket');
      else {
        state.misses++;
        state.combo = 0;
        event(state, 'miss', 'Net gemist. Op naar de volgende!', object.lane);
      }
    } else if (object.lane === state.lane) {
      state.hits++;
      state.lives = Math.max(0, state.lives - 1);
      state.combo = 0;
      event(state, 'hit', 'Oei, een kool! Kies een andere baan.', object.lane);
    }
  }
  state.objects = remaining;
  if (state.lives === 0) finish(state, false);
}

// Advance between exact spawn/catch/sweep boundaries. A long frame must not
// skip a loaf or prolong Argos's active window.
export function stepBreadGame(state, dt) {
  if (!playing(state) || !Number.isFinite(dt) || dt <= 0) return state;
  const end = Math.min(state.duration, state.time + dt);
  while (playing(state) && state.time < end - EPSILON) {
    let next = end;
    const wave = BREAD_WAVES[state.spawnIndex];
    if (wave) next = Math.min(next, wave.at);
    if (state.dogActive > EPSILON) next = Math.min(next, state.time + state.dogActive);
    for (const object of state.objects) {
      next = Math.min(next, object.born + object.flight * BREAD_RULES.catchProgress);
      if (state.dogActive > EPSILON && object.kind === 'bread') next = Math.min(next, object.born + object.flight * BREAD_RULES.dogProgress);
    }
    next = Math.max(state.time, next);
    const elapsed = next - state.time;
    state.time = next;
    state.dogCooldown = Math.max(0, state.dogCooldown - elapsed);
    state.dogActive = Math.max(0, state.dogActive - elapsed);
    spawnDue(state);
    updateProgress(state);
    resolveCrossings(state);
  }
  if (playing(state) && state.time >= state.duration - EPSILON) {
    state.time = state.duration;
    finish(state, state.caught >= state.target);
  }
  return state;
}
