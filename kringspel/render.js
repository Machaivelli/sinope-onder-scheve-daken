const P = Object.freeze({
  ink: '#263747', paper: '#f1dca9', light: '#fff0c9', gold: '#e8b64e',
  teal: '#4c9b95', foam: '#8ecac0', plum: '#785677', roof: '#c96c52',
  sand: '#c99b62', floor: '#e8cb94', stone: '#b9b299', bronze: '#ae713f',
});
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = n => Number.isFinite(n);
const point = p => p && finite(p.x) && finite(p.y);
const teamColor = id => id === 0 ? P.teal : P.plum;
const pinId = value => value && typeof value === 'object' ? value.id : value;

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function polygon(ctx, points, color) {
  if (points.length < 3) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(Math.round(p.x), Math.round(p.y)) : ctx.moveTo(Math.round(p.x), Math.round(p.y)));
  ctx.closePath();
  ctx.fill();
}

// Stepped lines keep thin ropes legible at the native pixel resolution.
function line(ctx, a, b, color, width = 2, dash = 0) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const count = Math.max(1, Math.ceil(length / 2));
  for (let i = 0; i <= count; i++) {
    if (dash && Math.floor(i * 2 / dash) % 2) continue;
    const t = i / count;
    rect(ctx, a.x + dx * t - width / 2, a.y + dy * t - width / 2, width, width, color);
  }
}

function ring(ctx, x, y, radius, color, width = 2, segments = 28, fraction = 1) {
  const end = Math.round(segments * clamp(fraction, 0, 1));
  for (let i = 0; i < end; i++) {
    const angle = -Math.PI / 2 + i / segments * TAU;
    rect(ctx, x + Math.cos(angle) * radius - width / 2, y + Math.sin(angle) * radius - width / 2, width, width, color);
  }
}

function text(ctx, value, x, y, size = 10, color = P.ink) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), Math.round(x), Math.round(y));
}

function diamond(ctx, x, y, size, color) {
  polygon(ctx, [{x, y: y - size}, {x: x + size, y}, {x, y: y + size}, {x: x - size, y}], color);
}

function teamMark(ctx, id, x, y, size = 5) {
  if (id === 0) {
    rect(ctx, x - size, y - size, size * 2 + 1, size * 2 + 1, P.ink);
    rect(ctx, x - size + 1, y - size + 1, size * 2 - 1, size * 2 - 1, P.teal);
    rect(ctx, x - 1, y - size + 2, 3, size * 2 - 3, P.gold);
  } else {
    diamond(ctx, x, y, size + 1, P.ink);
    diamond(ctx, x, y, size, P.plum);
    rect(ctx, x - 1, y - 1, 3, 3, P.light);
  }
}

function paw(ctx, x, y, color = P.teal) {
  rect(ctx, x - 3, y, 7, 5, color);
  rect(ctx, x - 5, y - 4, 3, 3, color);
  rect(ctx, x - 1, y - 6, 3, 3, color);
  rect(ctx, x + 3, y - 4, 3, 3, color);
}

function amphora(ctx, x, y) {
  rect(ctx, x - 6, y - 15, 12, 13, P.ink);
  rect(ctx, x - 8, y - 12, 16, 9, P.ink);
  rect(ctx, x - 6, y - 13, 12, 11, P.roof);
  rect(ctx, x - 3, y - 20, 6, 7, P.roof);
  rect(ctx, x - 5, y - 21, 10, 3, P.ink);
  rect(ctx, x - 3, y - 11, 3, 6, P.gold);
  rect(ctx, x - 11, y - 15, 4, 7, P.ink);
  rect(ctx, x + 7, y - 15, 4, 7, P.ink);
}

function background(ctx, region) {
  rect(ctx, 0, 0, 640, 400, P.floor);
  // The lane is kept quiet; decoration lives outside the usable sand court.
  if (region === 'athens') {
    rect(ctx, 0, 0, 640, 58, '#bcc3a1');
    polygon(ctx, [{x: 0, y: 47}, {x: 100, y: 23}, {x: 230, y: 41}, {x: 364, y: 13}, {x: 493, y: 35}, {x: 640, y: 20}, {x: 640, y: 58}, {x: 0, y: 58}], '#8e9670');
    for (const [x, y, w] of [[14,34,37], [68,25,52], [151,37,40], [207,21,34], [393,31,53], [466,19,46], [539,33,54]]) {
      rect(ctx, x, y, w, 53-y, P.paper);
      rect(ctx, x-2, y-4, w+4, 4, P.sand);
      rect(ctx, x+8, y+7, 7, 12, P.ink);
    }
    rect(ctx, 268, 3, 98, 5, P.light);
    for (const x of [277,310,343]) rect(ctx, x, 9, 12, 41, P.paper);
    rect(ctx, 258, 47, 120, 9, P.stone);
    rect(ctx, 0, 56, 640, 7, P.stone);
    rect(ctx, 0, 62, 640, 4, P.light);
  } else {
  rect(ctx, 0, 0, 640, 58, '#d9bd89');
  rect(ctx, 0, 56, 640, 6, '#b89563');
  rect(ctx, 0, 62, 640, 4, P.paper);
  rect(ctx, 0, 0, 213, 49, P.paper);
  rect(ctx, 17, 18, 175, 37, '#dfbd82');
  rect(ctx, 30, 9, 66, 36, P.ink);
  rect(ctx, 33, 13, 60, 31, P.plum);
  rect(ctx, 116, 16, 48, 29, P.ink);
  rect(ctx, 120, 18, 40, 26, '#7e705f');
  rect(ctx, 119, 33, 43, 4, P.sand);
  rect(ctx, 119, 43, 43, 4, P.sand);
  for (const [x, y] of [[126,29], [143,29], [129,39], [148,39]]) {
    rect(ctx, x - 6, y - 4, 12, 6, P.gold);
    rect(ctx, x - 3, y - 5, 7, 2, P.light);
    rect(ctx, x, y - 4, 2, 3, P.roof);
  }
  rect(ctx, 13, 0, 184, 14, P.roof);
  for (let x = 18; x < 195; x += 23) rect(ctx, x, 9, 17, 3, '#a75247');
  rect(ctx, 24, 45, 151, 6, P.roof);
  rect(ctx, 25, 50, 4, 9, P.ink);
  rect(ctx, 170, 50, 4, 9, P.ink);
  text(ctx, 'BIONS BROOD', 64, 27, 8, P.light);
  amphora(ctx, 190, 57);

  rect(ctx, 270, 0, 100, 31, '#e5cd9f');
  rect(ctx, 284, 0, 20, 20, P.ink);
  rect(ctx, 287, 0, 14, 17, P.teal);
  rect(ctx, 290, 5, 9, 2, P.foam);
  rect(ctx, 325, 4, 27, 19, P.sand);
  rect(ctx, 328, 7, 21, 13, P.paper);
  line(ctx, {x: 230, y: 10}, {x: 402, y: 30}, P.ink, 2);
  for (const [x, y, color] of [[245, 12, P.roof], [278, 16, P.foam], [316, 20, P.gold], [354, 24, P.plum], [386, 28, P.roof]]) {
    polygon(ctx, [{x, y}, {x: x + 12, y: y + 1}, {x: x + 6, y: y + 12}], color);
  }
  // A low quay and a cropped boat place the game in a working harbour.
  rect(ctx, 425, 0, 215, 46, P.teal);
  rect(ctx, 425, 5, 215, 5, P.foam);
  for (const [x, y, w] of [[432,25,27], [469,16,38], [562,31,43], [604,16,29]]) rect(ctx, x, y, w, 2, P.foam);
  polygon(ctx, [{x: 497, y: 17}, {x: 580, y: 17}, {x: 566, y: 32}, {x: 507, y: 32}], P.ink);
  polygon(ctx, [{x: 502, y: 18}, {x: 575, y: 18}, {x: 564, y: 26}, {x: 509, y: 26}], P.roof);
  rect(ctx, 536, 0, 3, 21, P.ink);
  polygon(ctx, [{x: 541, y: 0}, {x: 564, y: 12}, {x: 541, y: 12}], P.light);
  rect(ctx, 417, 44, 223, 12, P.stone);
  rect(ctx, 417, 44, 223, 3, P.light);
  for (let x = 421; x < 640; x += 35) rect(ctx, x, 48, 2, 7, '#8e9587');
  for (const x of [442, 606]) {
    rect(ctx, x, 32, 9, 24, P.ink);
    rect(ctx, x + 2, 33, 5, 21, P.sand);
    rect(ctx, x - 3, 34, 15, 3, P.paper);
  }
  }

  rect(ctx, 0, 66, 25, 317, '#cfb682');
  rect(ctx, 617, 66, 23, 317, '#cfb682');
  for (let y = 77; y < 380; y += 31) {
    rect(ctx, 0, y, 25, 2, '#b59b72');
    rect(ctx, 618, y + 11, 22, 2, '#b59b72');
    rect(ctx, (y % 2 ? 9 : 18), y + 2, 2, 28, '#b59b72');
  }
  rect(ctx, 31, 71, 3, 307, P.paper);
  rect(ctx, 607, 71, 3, 307, P.paper);
  rect(ctx, 32, 71, 577, 3, P.paper);
  rect(ctx, 32, 380, 577, 3, P.paper);
  for (const [x, y, w] of [[63,92,17], [230,83,15], [412,97,19], [574,190,15], [80,248,13], [230,280,14], [408,363,17], [530,304,16], [327,187,10], [63,360,13]]) {
    rect(ctx, x, y, w, 2, '#dab982');
    rect(ctx, x + 4, y - 2, w - 5, 1, P.paper);
  }
  rect(ctx, 0, 386, 640, 7, P.stone);
  rect(ctx, 0, 386, 640, 2, P.light);
  for (let x = 6; x < 640; x += 37) rect(ctx, x, 388, 2, 5, '#8e9587');
  rect(ctx, 0, 394, 640, 6, region === 'athens' ? '#73794e' : P.teal);
  rect(ctx, 16, 396, 70, 2, region === 'athens' ? '#a9ab74' : P.foam);
  rect(ctx, 404, 397, 53, 2, region === 'athens' ? '#a9ab74' : P.foam);
}

function planPoints(team, pins) {
  if (!Array.isArray(team?.plan)) return [];
  return team.plan.map(id => pins.find(pin => pin.id === id)).filter(Boolean);
}

function contains(points, disc) {
  if (points.length !== 3) return false;
  const cross = (a, b, p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (Math.abs(cross(points[0], points[1], points[2])) < 1e-8) return false;
  const signs = points.map((p, i) => cross(p, points[(i + 1) % 3], disc));
  return signs.every(n => n >= -1e-8) || signs.every(n => n <= 1e-8);
}

function drawPlan(ctx, team, points, planning, won, closing = 0) {
  if (points.length < 2) return;
  const color = teamColor(team.id);
  if (points.length === 3) {
    ctx.save();
    ctx.globalAlpha = won ? .2 : closing > 0 ? .15 + clamp(closing, 0, 1) * .08 : planning ? .12 : .06;
    polygon(ctx, points, color);
    ctx.restore();
  }
  const sides = points.length === 3 ? 3 : points.length - 1;
  for (let i = 0; i < sides; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const secured = !planning && a.owner === team.id && b.owner === team.id;
    if (secured) {
      line(ctx, {x: a.x, y: a.y + 2}, {x: b.x, y: b.y + 2}, '#b59b72', 4);
      line(ctx, a, b, P.ink, 4);
      line(ctx, a, b, color, 3);
      line(ctx, a, b, team.id === 0 ? P.gold : '#c79aa8', 1, 6);
    } else {
      ctx.save();
      ctx.globalAlpha = planning ? .78 : .55;
      line(ctx, a, b, color, 2, team.id === 0 ? 7 : 4);
      ctx.restore();
    }
  }
}

function drawClosingMeters(ctx, plans, pins, discs) {
  const placed = [];
  // Layout depends only on the fixed round geometry, so moving actors cannot make a meter jump.
  for (const {team, points} of [...plans].sort((a, b) => a.team.id - b.team.id)) {
    if (points.length !== 3) continue;
    const centre = {x: points.reduce((sum, p) => sum + p.x, 0) / 3, y: points.reduce((sum, p) => sum + p.y, 0) / 3};
    const offsets = [[0, 0], [0, -32], [0, 32], [-58, 0], [58, 0], [0, -64], [0, 64], [-58, -32], [58, 32]];
    const candidates = offsets.map(([dx, dy], order) => {
      const x = Math.round(clamp(centre.x + dx, 87, 553));
      const y = Math.round(clamp(centre.y + dy, 96, 360));
      const hitsPins = pins.filter(pin => Math.abs(pin.x + 19 - x) < 80 && pin.y - 29 < y + 15 && pin.y + 10 > y - 16).length;
      const hitsMeters = placed.filter(other => Math.abs(other.x - x) < 108 && Math.abs(other.y - y) < 36).length;
      const hitsDiscs = discs.filter(disc => Math.abs(disc.x - x) < 63 && Math.abs(disc.y - y) < 27).length;
      return {x, y, cost: hitsPins * 1000 + hitsMeters * 2000 + hitsDiscs * 60 + order};
    });
    candidates.sort((a, b) => a.cost - b.cost);
    const spot = candidates[0];
    placed.push(spot);
    if (!finite(team.closeProgress) || team.closeProgress <= 0) continue;
    const progress = clamp(team.closeProgress, 0, 1);
    const {x, y} = spot;
    const color = teamColor(team.id);
    const name = team.id === 0 ? 'JIJ' : (team.name?.split('&')[0]?.trim() || 'RIVAAL').slice(0, 8).toUpperCase();
    rect(ctx, x - 51, y - 17, 102, 32, P.ink);
    rect(ctx, x - 49, y - 15, 98, 28, P.light);
    rect(ctx, x - 49, y - 15, 98, 2, color);
    teamMark(ctx, team.id, x - 40, y - 6, 3);
    text(ctx, `${name} · SLUIT!`, x + 5, y - 6, 9, color);
    line(ctx, {x: x - 35, y: y + 6}, {x: x + 35, y: y + 6}, P.ink, 7);
    line(ctx, {x: x - 35, y: y + 6}, {x: x + 35, y: y + 6}, P.sand, 5);
    line(ctx, {x: x - 35, y: y + 6}, {x: x - 35 + 70 * progress, y: y + 6}, color, 5);
    line(ctx, {x: x - 35, y: y + 6}, {x: x - 35 + 70 * progress, y: y + 6}, team.id === 0 ? P.gold : '#c79aa8', 1, 5);
    for (const dx of [-39, 39]) {
      diamond(ctx, x + dx, y + 6, 5, P.ink);
      diamond(ctx, x + dx, y + 6, 3, color);
      rect(ctx, x + dx - 1, y + 5, 2, 2, team.id === 0 ? P.gold : P.light);
    }
  }
}

function drawDisc(ctx, disc, state, plans) {
  const planning = state.phase === 'planning';
  const inPlans = plans.filter(plan => contains(plan.points, disc));
  const resolution = state.resolution;
  const shared = Array.isArray(resolution?.shared) && resolution.shared.includes(disc.id);
  const scoring = resolution && inPlans.find(plan => resolution.winners?.includes(plan.team.id));
  if (scoring && !shared) {
    ring(ctx, disc.x, disc.y, 16, teamColor(scoring.team.id), 3, 20);
  } else if (planning && inPlans.some(plan => plan.team.id === 0)) {
    // Open corners are a possible reward, never a claim of current ownership.
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      rect(ctx, disc.x + sx * 15 - 1, disc.y + sy * 11 - 1, 3, 5, P.teal);
      rect(ctx, disc.x + sx * 13 - 2, disc.y + sy * 13 - 1, 5, 2, P.teal);
    }
  }
  rect(ctx, disc.x - 8, disc.y + 5, 18, 5, '#bb985f');
  polygon(ctx, [{x: disc.x - 6, y: disc.y - 8}, {x: disc.x + 6, y: disc.y - 8}, {x: disc.x + 10, y: disc.y - 3}, {x: disc.x + 10, y: disc.y + 4}, {x: disc.x + 5, y: disc.y + 8}, {x: disc.x - 6, y: disc.y + 8}, {x: disc.x - 10, y: disc.y + 3}, {x: disc.x - 10, y: disc.y - 3}], P.ink);
  rect(ctx, disc.x - 6, disc.y - 6, 12, 13, P.bronze);
  rect(ctx, disc.x - 8, disc.y - 3, 16, 7, P.bronze);
  rect(ctx, disc.x - 6, disc.y - 6, 11, 2, P.gold);
  rect(ctx, disc.x - 7, disc.y - 3, 2, 5, P.gold);
  // A stamped fish, the court's bronze counters, instead of a generic pickup.
  diamond(ctx, disc.x, disc.y, 4, P.gold);
  polygon(ctx, [{x: disc.x + 2, y: disc.y}, {x: disc.x + 6, y: disc.y - 3}, {x: disc.x + 6, y: disc.y + 3}], P.gold);
  rect(ctx, disc.x - 2, disc.y - 1, 1, 1, P.ink);
  if (shared) {
    line(ctx, {x: disc.x - 7, y: disc.y - 6}, {x: disc.x + 7, y: disc.y + 6}, P.paper, 2);
    line(ctx, {x: disc.x + 7, y: disc.y - 6}, {x: disc.x - 7, y: disc.y + 6}, P.paper, 2);
  }
}

function drawPinGround(ctx, pin, hover, selected, planned) {
  rect(ctx, pin.x - 12, pin.y + 2, 26, 5, '#bda071');
  if (planned) ring(ctx, pin.x, pin.y, 22, '#d0b17b', 2, 16);
  if (hover || selected) ring(ctx, pin.x, pin.y, 27, selected ? P.gold : P.light, 3, 24);
  if (finite(pin.progress) && pin.progress > 0 && (pin.challenger === 0 || pin.challenger === 1)) {
    ring(ctx, pin.x, pin.y, 23, teamColor(pin.challenger), 4, 24, pin.progress);
  }
  // The physical post stays behind an actor standing on its capture point.
  line(ctx, {x: pin.x + 3, y: pin.y - 6}, {x: pin.x + 15, y: pin.y - 15}, P.ink, 3);
  line(ctx, {x: pin.x + 3, y: pin.y - 7}, {x: pin.x + 15, y: pin.y - 16}, P.sand, 1);
  rect(ctx, pin.x - 5, pin.y - 11, 10, 15, P.ink);
  rect(ctx, pin.x - 3, pin.y - 10, 6, 12, P.sand);
  rect(ctx, pin.x - 2, pin.y - 10, 2, 9, P.light);
  if (pin.owner === 0 || pin.owner === 1) {
    rect(ctx, pin.x - 6, pin.y - 5, 12, 4, teamColor(pin.owner));
    rect(ctx, pin.x - 3, pin.y - 4, 6, 1, pin.owner === 0 ? P.gold : P.light);
  }
}

function drawPinFront(ctx, pin, index, playerPlan, enemyHint, partnerTarget, hover, selected) {
  const owned = pin.owner === 0 || pin.owner === 1;
  // A fixed side badge leaves even Argos' narrow up/down sprite unobscured at the pole.
  const badgeX = pin.x + 24;
  rect(ctx, badgeX - 10, pin.y - 27, 20, 19, P.ink);
  rect(ctx, badgeX - 8, pin.y - 25, 16, 15, selected ? P.gold : hover ? P.light : playerPlan ? P.paper : '#dec18f');
  rect(ctx, badgeX - 7, pin.y - 25, 14, 2, playerPlan ? P.teal : P.light);
  text(ctx, index + 1, badgeX, pin.y - 17, 12);
  if (owned) teamMark(ctx, pin.owner, badgeX + 15, pin.y - 16, 4);
  else if (enemyHint) {
    diamond(ctx, badgeX + 15, pin.y - 17, 5, P.plum);
    rect(ctx, badgeX + 14, pin.y - 18, 2, 2, P.paper);
  }
  if (pin.contested) {
    rect(ctx, badgeX + 10, pin.y - 2, 5, 5, P.teal);
    diamond(ctx, badgeX + 20, pin.y, 4, P.plum);
    rect(ctx, badgeX + 16, pin.y - 4, 1, 8, P.ink);
  }
  if (partnerTarget) {
    rect(ctx, badgeX - 6, pin.y - 6, 13, 15, P.light);
    paw(ctx, badgeX, pin.y + 1);
  }
}

function drawPulse(ctx, state, teams, now, reducedMotion) {
  for (const team of teams) {
    if (!finite(team.pulseWindup) || team.pulseWindup <= 0) continue;
    const progress = clamp(1 - team.pulseWindup / .25, 0, 1);
    for (const a of team.actors || []) if (point(a) && !(a.stun > 0)) {
      ring(ctx, a.x, a.y, reducedMotion ? 40 : 23 + progress * 22, teamColor(team.id), 3, 24);
      ring(ctx, a.x, a.y, 54, P.light, 2, 16);
    }
  }
  for (const event of state.events || []) {
    if (event.type !== 'pulse' || !finite(event.clock)) continue;
    const age = now - event.clock;
    if (age < 0 || age > .32) continue;
    const progress = clamp(age / .32, 0, 1);
    ctx.save();
    ctx.globalAlpha = reducedMotion ? .65 : 1 - progress;
    for (const p of event.centres || []) if (point(p)) {
      ring(ctx, p.x, p.y, reducedMotion ? 54 : 32 + progress * 26, teamColor(event.team), 4, 24);
      if (!reducedMotion) for (let i = 0; i < 8; i++) {
        const angle = i / 8 * TAU;
        rect(ctx, p.x + Math.cos(angle) * (34 + progress * 24), p.y + Math.sin(angle) * (34 + progress * 24), 4, 3, P.paper);
      }
    }
    ctx.restore();
  }
}

function drawActors(ctx, teams, actor, phase, time, reducedMotion, sign) {
  const entries = teams.flatMap(team => (team.actors || []).map((a, index) => ({a, index, team}))).filter(({a}) => point(a));
  entries.sort((a, b) => a.a.y - b.a.y || a.team.id - b.team.id);
  for (const {a, index, team} of entries) {
    const cast = team.casts?.[index] || (team.id === 0 ? index === 0 ? 'hero' : 'argos' : 'bion');
    const dog = cast === 'argos' || cast === 'dog';
    rect(ctx, a.x - 12, a.y + 2, 24, 4, '#bb9d6f');
    rect(ctx, a.x - 9, a.y + 5, 18, 2, teamColor(team.id));
    if (team.id === 0) rect(ctx, a.x - 3, a.y + 5, 6, 2, P.gold);
    else diamond(ctx, a.x, a.y + 6, 3, P.plum);
    if (typeof actor === 'function') {
      const pose = a.walking && !reducedMotion ? `walk${Math.floor(time * 8) % 4}` : 'idle';
      actor(ctx, cast, Math.round(a.x), Math.round(a.y), {
        pose, dir: ['up', 'down', 'left', 'right'].includes(a.dir) ? a.dir : 'down',
        scale: dog ? 1.35 : 1.25, alpha: a.stun > 0 ? .82 : 1,
      });
    } else {
      rect(ctx, a.x - 6, a.y - 20, 12, 19, teamColor(team.id));
      rect(ctx, a.x - 4, a.y - 27, 8, 8, P.paper);
    }
    if (a.stun > 0) {
      const offset = reducedMotion ? 0 : Math.floor(time * 12) % 2 * 2;
      for (const [dx, dy] of [[-9, -35], [0, -40], [9, -36]]) diamond(ctx, a.x + dx, a.y + dy - offset, 2, P.gold);
    }
    if (phase === 'planning') {
      if (sign) { const top = a.y - (dog ? 45 : 62); rect(ctx, a.x - 11, top, 23, 20, P.ink); sign(ctx, team.id === 1 ? 'loaf' : dog ? 'paw' : 'hand', a.x - 10, top, 21); continue; }
      const label = cast === 'hero' ? 'JIJ' : cast === 'guard' ? 'WACHTER' : cast.toUpperCase();
      const y = a.y - (dog ? 32 : 48);
      rect(ctx, a.x - label.length * 3 - 3, y - 6, label.length * 6 + 6, 12, P.paper);
      text(ctx, label, a.x, y, 9, teamColor(team.id));
    }
  }
}

/** Draw the 640 × 400 court; score, clock, instructions and controls live in the DOM. */
export function drawMatch(ctx, state = {}, {actor, time = 0, hoverPin = null, selectedPin = null, reducedMotion = false, region = 'sinope', backdrop, sign} = {}) {
  if (!ctx) return;
  const pins = Array.isArray(state.pins) ? state.pins.filter(point) : [];
  const teams = Array.isArray(state.teams) ? state.teams.filter(team => team && (team.id === 0 || team.id === 1)) : [];
  const planning = state.phase === 'planning';
  const animationTime = finite(time) ? time : 0;
  const eventTime = finite(state.clock) ? state.clock : animationTime;
  const player = teams.find(team => team.id === 0);
  const enemy = teams.find(team => team.id === 1);
  const plans = teams.filter(team => !planning || team.id === 0).map(team => ({team, points: planPoints(team, pins)}));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.setLineDash?.([]);
  if (!backdrop?.(ctx, true)) background(ctx, region);
  for (const plan of plans) drawPlan(ctx, plan.team, plan.points, planning, state.resolution?.winners?.includes(plan.team.id), state.phase === 'playing' ? plan.team.closeProgress : 0);
  for (const disc of state.discs || []) if (point(disc)) drawDisc(ctx, disc, state, plans);

  for (const pin of pins) drawPinGround(ctx, pin, pin.id === pinId(hoverPin), pin.id === pinId(selectedPin), plans.some(plan => plan.points.includes(pin)));
  const partner = player?.actors?.[1];
  const destination = pins.find(pin => pin.id === player?.partnerTarget);
  if (point(partner) && destination && (planning || Math.hypot(partner.x - destination.x, partner.y - destination.y) > 25)) {
    ctx.save();
    ctx.globalAlpha = planning ? .6 : .4;
    line(ctx, partner, destination, P.teal, 2, 4);
    ctx.restore();
  }
  drawPulse(ctx, state, teams, eventTime, reducedMotion);
  drawActors(ctx, teams, actor, state.phase, animationTime, reducedMotion, sign);
  if (state.phase === 'playing') drawClosingMeters(ctx, plans, pins, (state.discs || []).filter(point));
  // Markers come last so actor sprites never conceal a number or a change of owner.
  pins.forEach((pin, index) => drawPinFront(ctx, pin, index,
    player?.plan?.includes(pin.id), planning && enemy?.plan?.[0] === pin.id,
    destination?.id === pin.id, pin.id === pinId(hoverPin), pin.id === pinId(selectedPin)));
  ctx.restore();
}
