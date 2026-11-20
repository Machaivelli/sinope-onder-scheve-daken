// Pure simulation. Every actor uses the same movement, capture and pulse rules.
export const RULES = Object.freeze({
  width: 640, height: 400, speed: 136, captureRadius: 22, captureTime: .75,
  runDuration: 12, closeDuration: 2, resolveDuration: 1.3, scoreLimit: 5,
  pulseWindup: .25, pulseRadius: 54, pulsePush: 40, pulseStun: .45,
  pulseCooldown: 4.2, tick: 1 / 120,
  minX: 36, maxX: 604, minY: 68, maxY: 378,
});

const EPS = 1e-8;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const teamById = (state, id) => state.teams.find(team => team.id === id);
const pinById = (state, id) => state.pins.find(pin => pin.id === id);
const PROFILES = {
  bion: {name: 'Bion & Melia', casts: ['bion', 'melia']},
  nera: {name: 'Nera & Ione', casts: ['nera', 'ione']},
  philo: {name: 'Philo & Myron', casts: ['philo', 'myron']},
};

function random(state) {
  state.rng = (state.rng + 0x6D2B79F5) >>> 0;
  let n = state.rng;
  n = Math.imul(n ^ (n >>> 15), n | 1);
  n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}

function emit(state, type, team, text, extra = {}) {
  state.events.push({id: ++state.eventSerial, type, team, text, clock: state.clock, ...extra});
  if (state.events.length > 30) state.events.splice(0, state.events.length - 30);
}

function pinsFor(state, pinIds) {
  if (!Array.isArray(pinIds) || pinIds.length !== 3 || new Set(pinIds).size !== 3) return null;
  const pins = pinIds.map(id => pinById(state, id));
  if (pins.some(pin => !pin) || Math.abs(cross(...pins)) < EPS) return null;
  return pins;
}

// An edge counts as enclosed. Degenerate triangles never do.
export function triangleDiscs(state, pinIds) {
  const pins = pinsFor(state, pinIds);
  if (!pins) return [];
  const [a, b, c] = pins;
  return state.discs.filter(disc => {
    const signs = [cross(a, b, disc), cross(b, c, disc), cross(c, a, disc)];
    return signs.every(n => n >= -EPS) || signs.every(n => n <= EPS);
  });
}

export function validPlans(state) {
  const result = [];
  for (let i = 0; i < state.pins.length - 2; i++) {
    for (let j = i + 1; j < state.pins.length - 1; j++) {
      for (let k = j + 1; k < state.pins.length; k++) {
        const ids = [state.pins[i].id, state.pins[j].id, state.pins[k].id];
        if (triangleDiscs(state, ids).length) result.push(ids);
      }
    }
  }
  return result;
}

function actorsFor(id) {
  const positions = id === 0 ? [[85, 335], [112, 348]] : [[555, 125], [528, 112]];
  return positions.map(([x, y], index) => ({
    id: `${id}:${index}`, x, y, dir: id ? 'left' : 'right',
    walking: false, stun: 0, target: null,
  }));
}

function makeTeam(id, name, casts) {
  return {
    id, name, casts, score: 0, actors: actorsFor(id), plan: [],
    partnerTarget: null, pulseCooldown: 0, pulseWindup: 0,
    aiTarget: null, aiEnabled: id === 1, closeProgress: 0,
    intercept: null, interceptUsed: false,
  };
}

// Best possible two-actor route length is a planning estimate, never a movement shortcut.
function routeLength(state, team, plan) {
  const points = plan.map(id => pinById(state, id));
  let best = Infinity;
  for (let solo = 0; solo < 3; solo++) {
    const pair = points.filter((_, index) => index !== solo);
    for (let soloActor = 0; soloActor < 2; soloActor++) {
      const soloTime = distance(team.actors[soloActor], points[solo]) / RULES.speed + RULES.captureTime;
      const pairTime = (Math.min(distance(team.actors[1 - soloActor], pair[0]),
        distance(team.actors[1 - soloActor], pair[1])) + distance(pair[0], pair[1])) /
        RULES.speed + RULES.captureTime * 2;
      best = Math.min(best, Math.max(soloTime, pairTime));
    }
  }
  return best;
}

function choosePlan(state, team, profile) {
  const plans = validPlans(state);
  const rated = plans.map(plan => {
    const value = triangleDiscs(state, plan).reduce((sum, disc) => sum + disc.value, 0);
    const time = routeLength(state, team, plan);
    const familiar = plan.filter(id => state.previousPlayerPlan.includes(id)).length;
    const score = profile === 'bion' ? value * 3.3 - time :
      profile === 'philo' ? value * 1.25 + familiar * .9 - time :
      profile === 'nera' ? -time - (value - 1) * 1.3 : -time + value * .3;
    return {plan, score: score + random(state) * .18};
  });
  rated.sort((a, b) => b.score - a.score);
  return [...rated[0].plan];
}

function refillDiscs(state) {
  const cells = [0, 1, 2, 3];
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  state.discs = cells.slice(0, 3).map((cell, index) => ({
    id: `d${state.run}-${index}`, value: 1,
    x: Math.round(148 + (cell % 2) * 172 + 45 + random(state) * 82),
    y: Math.round(118 + Math.floor(cell / 2) * 112 + 27 + random(state) * 58),
  }));
}

function prepareRun(state) {
  state.phase = 'planning';
  state.remaining = RULES.runDuration;
  state.resolution = null;
  for (const pin of state.pins) Object.assign(pin, {owner: null, progress: 0, challenger: null, contested: false});
  for (const team of state.teams) {
    team.actors = actorsFor(team.id);
    team.pulseCooldown = 0;
    team.pulseWindup = 0;
    team.aiTarget = null;
    team.partnerTarget = null;
    team.closeProgress = 0;
    team.intercept = null;
    team.interceptUsed = false;
  }
  refillDiscs(state);
  // Commit before the player receives their suggested plan or changes it.
  const opponent = teamById(state, 1);
  opponent.plan = choosePlan(state, opponent, state.opponent);
  teamById(state, 0).plan = choosePlan(state, teamById(state, 0), 'starter');
  for (const team of state.teams) selectPartnerTarget(state, team);
}

function selectPartnerTarget(state, team) {
  const farthest = [...team.plan].sort((a, b) =>
    distance(team.actors[0], pinById(state, b)) - distance(team.actors[0], pinById(state, a)))[0];
  team.partnerTarget = farthest;
  team.actors[1].target = farthest;
}

export function createMatch({seed = 1, opponent = 'bion'} = {}) {
  const initialSeed = Number.isFinite(seed) ? seed >>> 0 : 1;
  const profile = Object.hasOwn(PROFILES, opponent) ? opponent : 'bion';
  const state = {
    phase: 'planning', seed: initialSeed, rng: initialSeed, opponent: profile,
    run: 1, remaining: RULES.runDuration, clock: 0, scoreLimit: RULES.scoreLimit,
    pins: Array.from({length: 9}, (_, index) => ({
      id: `p${index}`, x: 148 + (index % 3) * 172, y: 118 + Math.floor(index / 3) * 112,
      owner: null, progress: 0, challenger: null, contested: false,
    })),
    discs: [], teams: [makeTeam(0, 'Diogenes & Argos', ['hero', 'argos']),
      makeTeam(1, PROFILES[profile].name, PROFILES[profile].casts)],
    previousPlayerPlan: [], resolution: null, result: null, events: [], eventSerial: 0,
  };
  prepareRun(state);
  return state;
}

export function setPlan(state, pinIds) {
  if (state.phase !== 'planning' || !triangleDiscs(state, pinIds).length) return false;
  const team = teamById(state, 0);
  team.plan = [...pinIds];
  selectPartnerTarget(state, team);
  return true;
}

export function startRun(state) {
  if (state.phase !== 'planning' || state.teams.some(team => !triangleDiscs(state, team.plan).length)) return false;
  state.phase = 'playing';
  state.remaining = RULES.runDuration;
  state.previousPlayerPlan = [...teamById(state, 0).plan];
  return true;
}

export function commandPartner(state, pinId) {
  if (!['planning', 'playing'].includes(state.phase) || !pinById(state, pinId)) return false;
  const team = teamById(state, 0);
  team.partnerTarget = pinId;
  team.actors[1].target = pinId;
  return true;
}

// The optional team id is also the AI's entry point; there is no privileged AI pulse.
export function pulse(state, teamId = 0) {
  const team = teamById(state, teamId);
  if (state.phase !== 'playing' || !team || team.pulseCooldown > EPS ||
    team.pulseWindup > EPS || team.actors.every(actor => actor.stun > EPS)) return false;
  team.pulseCooldown = RULES.pulseCooldown;
  team.pulseWindup = RULES.pulseWindup;
  return true;
}

function moveActor(actor, dt, dx, dy, stopAtTarget = false) {
  actor.walking = false;
  if (actor.stun > EPS) return;
  const length = Math.hypot(dx, dy);
  if (length < EPS) return;
  const amount = stopAtTarget ? Math.min(length, RULES.speed * dt) : RULES.speed * dt * Math.min(1, length);
  const beforeX = actor.x, beforeY = actor.y;
  actor.x = clamp(actor.x + dx / length * amount, RULES.minX, RULES.maxX);
  actor.y = clamp(actor.y + dy / length * amount, RULES.minY, RULES.maxY);
  actor.walking = Math.hypot(actor.x - beforeX, actor.y - beforeY) > EPS;
  actor.dir = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
}

function moveToPin(state, actor, dt) {
  const target = pinById(state, actor.target);
  if (!target) { actor.walking = false; return; }
  moveActor(actor, dt, target.x - actor.x, target.y - actor.y, true);
}

function updateAI(state, team) {
  if (!team.aiEnabled) return;
  const goals = team.plan.map(id => pinById(state, id)).filter(pin => pin.owner !== team.id);
  const reserved = new Set();
  // Keep uncompleted destinations to avoid jittery target swapping halfway there.
  for (const actor of team.actors) {
    if (goals.some(pin => pin.id === actor.target) && !reserved.has(actor.target)) reserved.add(actor.target);
    else actor.target = null;
  }
  for (const actor of team.actors) {
    if (actor.target) continue;
    const free = goals.filter(pin => !reserved.has(pin.id));
    const options = free.length ? free : goals;
    options.sort((a, b) => distance(actor, a) - distance(actor, b));
    actor.target = options[0]?.id ?? null;
    if (actor.target) reserved.add(actor.target);
  }
  const enemy = state.teams.find(other => other.id !== team.id);
  if (team.intercept && (pinById(state, team.intercept.pinId).owner === team.id ||
    state.clock >= team.intercept.until)) team.intercept = null;
  const reactionTime = state.opponent === 'bion' ? .65 : state.opponent === 'philo' ? .3 : .45;
  if (!team.intercept && !team.interceptUsed && enemy.closeProgress > reactionTime / RULES.closeDuration &&
    enemy.closeProgress > team.closeProgress + EPS) {
    // One announced opportunity per round. Prefer an unguarded knot and only run
    // for it if there is enough time to physically arrive AND untie it.
    const options = team.actors.flatMap((actor, index) => enemy.plan.map(pinId => {
      const pin = pinById(state, pinId);
      const guarded = enemy.actors.some(other => other.stun <= EPS && distance(other, pin) <= RULES.captureRadius);
      const travel = Math.max(0, distance(actor, pin) - RULES.captureRadius) / RULES.speed + actor.stun;
      return {actor: index, pinId, travel, cost: travel + RULES.captureTime + (guarded ? .8 : 0)};
    })).sort((a, b) => a.cost - b.cost);
    const target = options[0];
    if (target.cost < (1 - enemy.closeProgress) * RULES.closeDuration) {
      team.intercept = {actor: target.actor, pinId: target.pinId, until: state.clock + target.travel + 1.2};
      team.interceptUsed = true;
    }
  }
  if (team.intercept) team.actors[team.intercept.actor].target = team.intercept.pinId;
  team.aiTarget = team.actors[0].target;
  team.partnerTarget = team.actors[1].target;
  const enemies = state.teams.filter(other => other.id !== team.id).flatMap(other => other.actors);
  const canBudge = team.actors.some(actor => actor.stun <= EPS && enemies.some(enemy =>
    enemy.stun <= EPS && distance(actor, enemy) < RULES.pulseRadius - 3 &&
    state.pins.some(pin => distance(enemy, pin) < RULES.captureRadius + 7)));
  if (canBudge) pulse(state, team.id);
}

function resolvePulses(state, firingTeams) {
  // All hit snapshots precede any push or stun: simultaneous pulses both fire.
  const impacts = [];
  for (const team of firingTeams) {
    const emitters = team.actors.filter(actor => actor.stun <= EPS);
    const centres = emitters.map(actor => ({x: actor.x, y: actor.y}));
    emit(state, 'pulse', team.id, 'Ruimte!', {centres});
    for (const other of state.teams.filter(other => other.id !== team.id)) {
      for (const actor of other.actors) {
        const sources = emitters.filter(source => distance(source, actor) <= RULES.pulseRadius + EPS);
        sources.sort((a, b) => distance(a, actor) - distance(b, actor) || a.id.localeCompare(b.id));
        if (!sources.length) continue;
        const source = sources[0];
        let dx = actor.x - source.x, dy = actor.y - source.y;
        if (Math.hypot(dx, dy) < EPS) { dx = team.id === 0 ? 1 : -1; dy = 0; }
        const length = Math.hypot(dx, dy);
        impacts.push({actor, dx: dx / length * RULES.pulsePush, dy: dy / length * RULES.pulsePush});
      }
    }
  }
  for (const {actor, dx, dy} of impacts) {
    actor.x = clamp(actor.x + dx, RULES.minX, RULES.maxX);
    actor.y = clamp(actor.y + dy, RULES.minY, RULES.maxY);
    actor.stun = RULES.pulseStun;
    actor.walking = false;
  }
}

function capturePins(state, dt) {
  for (const pin of state.pins) {
    const present = state.teams.filter(team => team.actors.some(actor =>
      actor.stun <= EPS && distance(actor, pin) <= RULES.captureRadius + EPS));
    pin.contested = present.length > 1;
    if (pin.contested) continue;
    if (!present.length) {
      pin.progress = Math.max(0, pin.progress - dt / RULES.captureTime);
      if (pin.progress <= EPS) { pin.progress = 0; pin.challenger = null; }
      continue;
    }
    const owner = present[0].id;
    if (pin.owner === owner) { pin.progress = 0; pin.challenger = null; continue; }
    if (pin.challenger !== owner) { pin.progress = 0; pin.challenger = owner; }
    pin.progress = Math.min(1, pin.progress + dt / RULES.captureTime);
    if (pin.progress >= 1 - EPS) {
      pin.owner = owner;
      pin.progress = 0;
      pin.challenger = null;
      emit(state, 'claim', owner, 'Pin vast!', {pinId: pin.id});
    }
  }
}

function finishRun(state, completed) {
  const claims = completed.map(team => ({team, discs: triangleDiscs(state, team.plan)}));
  const deltas = [0, 0];
  const shared = [];
  // Shared discs belong to neither team when two different loops close in one tick.
  for (const disc of state.discs) {
    const claimants = claims.filter(claim => claim.discs.some(item => item.id === disc.id));
    if (claimants.length === 1) deltas[claimants[0].team.id] += disc.value;
    if (claimants.length > 1) shared.push(disc.id);
  }
  for (const team of state.teams) team.score += deltas[team.id];
  const winners = completed.map(team => team.id).sort();
  const label = completed.length === 0 ? 'Tijd! Nieuwe ronde.' : completed.length > 1 ?
    'Twee kringen tegelijk!' : `${completed[0].name} sluiten de kring!`;
  state.phase = 'resolve';
  state.resolution = {label, deltas, winners, shared, remaining: RULES.resolveDuration,
    timeout: completed.length === 0, run: state.run};
  for (const team of state.teams) for (const actor of team.actors) actor.walking = false;
  if (!completed.length) emit(state, 'timeout', null, label);
  for (const team of completed) emit(state, 'score', team.id, `+${deltas[team.id]}`, {delta: deltas[team.id]});
  if (state.teams.some(team => team.score >= state.scoreLimit)) {
    const a = teamById(state, 0).score, b = teamById(state, 1).score;
    state.result = {winner: a === b ? 'draw' : a > b ? 0 : 1, scores: [a, b], runs: state.run};
  }
}

function tick(state, dt, input) {
  state.clock += dt;
  if (state.phase === 'resolve') {
    state.resolution.remaining = Math.max(0, state.resolution.remaining - dt);
    if (state.resolution.remaining <= EPS) {
      if (state.result) state.phase = 'finished';
      else { state.run++; prepareRun(state); }
    }
    return;
  }
  const firingTeams = [];
  for (const team of state.teams) {
    team.pulseCooldown = Math.max(0, team.pulseCooldown - dt);
    for (const actor of team.actors) actor.stun = Math.max(0, actor.stun - dt);
    if (team.pulseWindup > 0) {
      team.pulseWindup = Math.max(0, team.pulseWindup - dt);
      if (team.pulseWindup <= EPS) { team.pulseWindup = 0; firingTeams.push(team); }
    }
  }
  for (const team of state.teams) if (team.id !== 0) updateAI(state, team);
  const player = teamById(state, 0);
  moveActor(player.actors[0], dt, input.x, input.y);
  moveToPin(state, player.actors[1], dt);
  for (const team of state.teams) if (team.id !== 0) {
    for (const actor of team.actors) {
      if (team.aiEnabled) moveToPin(state, actor, dt);
      else actor.walking = false;
    }
  }
  resolvePulses(state, firingTeams);
  const ownedBefore = new Set(state.teams.filter(team =>
    team.plan.every(id => pinById(state, id)?.owner === team.id)).map(team => team.id));
  capturePins(state, dt);
  state.remaining = Math.max(0, state.remaining - dt);
  for (const team of state.teams) {
    const allOwned = team.plan.every(id => pinById(state, id)?.owner === team.id);
    // A rival has to finish untying a knot. Presence alone cannot stall a loop forever.
    team.closeProgress = allOwned && ownedBefore.has(team.id) ?
      Math.min(1, team.closeProgress + dt / RULES.closeDuration) : 0;
  }
  const completed = state.teams.filter(team => team.closeProgress >= 1 - EPS);
  // A loop closed at the deadline counts before timeout is considered.
  if (completed.length || state.remaining <= EPS) finishRun(state, completed);
}

export function stepMatch(state, dt, input = {}) {
  if (!Number.isFinite(dt) || dt <= 0 || !['playing', 'resolve'].includes(state.phase)) return state;
  // Ignore invalid vectors as a whole; normalize diagonals to the same actor speed.
  const rawX = input?.x ?? 0, rawY = input?.y ?? 0;
  const vector = Number.isFinite(rawX) && Number.isFinite(rawY) ? {x: rawX, y: rawY} : {x: 0, y: 0};
  const length = Math.hypot(vector.x, vector.y);
  if (length > 1) { vector.x /= length; vector.y /= length; }
  let left = Math.min(dt, 60);
  while (left > EPS && ['playing', 'resolve'].includes(state.phase)) {
    const slice = Math.min(left, RULES.tick, state.phase === 'playing' ? state.remaining : state.resolution.remaining);
    tick(state, slice, vector);
    left -= slice;
  }
  return state;
}
