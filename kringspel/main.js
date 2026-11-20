import {createMatch, setPlan, startRun, commandPartner, pulse, stepMatch, triangleDiscs} from './model.js';
import {drawMatch} from './render.js';
import {Soundscape} from '../proeven/sound.js';

const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d'), keys = new Set(), touchKeys = new Map();
const assets = {}, audio = new Soundscape(), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchDevice = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch-device', touchDevice);
if (touchDevice) $('controls-reminder').textContent = 'Pijlen = jij · tik een paal = Argos';
let match = createMatch(), draft = [...match.teams[0].plan], suggestion = [...draft];
let ready = false, paused = false, hoverPin = null, lastTime = 0, animationTime = 0, lastEvent = 0, lastPhase = 'planning', lastRun = 1, lastRound = '', stopped = false;
let seed = 1, hudSignature = '', planningSignature = '';
ctx.imageSmoothingEnabled = false;
const pinNumber = id => id ? String(Number(id.slice(1)) + 1) : '–';
const imageLoad = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(Error('Een pixelvel kon niet laden.')); image.src = src; });

function actor(c, id, x, y, {pose = 'idle', dir = 'down', scale = 1.25, flip = false, alpha = 1} = {}) {
  const dog = id === 'argos' || id === 'dog', sheet = assets[dog ? 'argos' : 'cast'];
  if (!sheet) return;
  const name = id === 'player' ? 'hero' : id === 'guard' ? 'philo' : id;
  let frame = dog ? `${dir}-${pose}` : `${name}/${dir}-${pose}`;
  if (pose.startsWith('walk')) { const n = pose === 'walk' ? Math.floor(animationTime * 8) % 4 : pose.match(/\d/)?.[0] || 0; frame = dog ? `${dir}-walk-${n}` : `${name}/${dir}-walk${n}`; }
  const f = (sheet.frames[frame] || sheet.frames[dog ? `${dir}-idle` : `${name}/${dir}-idle`] || sheet.frames[dog ? 'down-idle' : 'hero/down-idle'])?.frame;
  if (!f) return;
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(y));
  if (flip) c.scale(-1, 1);
  c.drawImage(sheet.image, f.x, f.y, f.w, f.h, Math.round(-f.w * scale / 2), Math.round((-f.h + (dog ? 3 : 4)) * scale), Math.round(f.w * scale), Math.round(f.h * scale)); c.restore();
}

function clearInput() {
  keys.clear(); touchKeys.clear();
  for (const button of document.querySelectorAll('[data-dir]')) button.classList.remove('held');
}
function focusField() { $('playfield').focus({preventScroll: true}); }
function wakeAudio() { audio.setPaused(paused || !ready); audio.unlock(); }
function syncSound() { $('sound').textContent = audio.enabled ? '♪ Geluid aan' : '♩ Geluid uit'; $('sound').setAttribute('aria-pressed', String(audio.enabled)); }

function preview() {
  if (match.phase !== 'planning') return match;
  return {...match, teams: [{...match.teams[0], plan: draft}, match.teams[1]]};
}
function syncPlanner() {
  const value = triangleDiscs(match, draft).length;
  const sig = `${match.run}:${draft.join(',')}:${value}:${ready}`;
  if (sig === planningSignature) return;
  planningSignature = sig;
  $('chosen-pins').replaceChildren();
  for (let index = 0; index < 3; index++) {
    const id = draft[index];
    const item = document.createElement(id ? 'button' : 'span');
    item.textContent = id ? pinNumber(id) : '·';
    if (id) { item.type = 'button'; item.setAttribute('aria-label', `Paal ${pinNumber(id)} uit de kring halen`); item.addEventListener('click', () => selectPin(id)); }
    else { item.className = 'empty'; item.setAttribute('aria-hidden', 'true'); }
    $('chosen-pins').append(item);
  }
  $('plan-value').textContent = value ? `${value} ${value === 1 ? 'schijf' : 'schijven'} binnen jouw kring` : draft.length < 3 ? `Kies nog ${3 - draft.length} ${draft.length === 2 ? 'paal' : 'palen'}.` : 'Hier ligt geen schijf binnen. Kies een andere kring.';
  $('plan-value').classList.toggle('invalid', !value);
  $('start').disabled = !ready || !value || paused;
  if (value) {
    setPlan(match, draft);
    const target = match.teams[0].partnerTarget;
    const own = draft.filter(id => id !== target).sort((a, b) => {
      const hero = match.teams[0].actors[0], pa = match.pins.find(p => p.id === a), pb = match.pins.find(p => p.id === b);
      return Math.hypot(pa.x - hero.x, pa.y - hero.y) - Math.hypot(pb.x - hero.x, pb.y - hero.y);
    });
    $('route-hint').textContent = `Argos gaat naar ${pinNumber(target)}. Jij kunt via ${own.map(pinNumber).join(' → ')}. Je mag onderweg zijn doel veranderen.`;
  } else $('route-hint').textContent = 'Kies een driehoek rond minstens één bronzen schijf.';
}
function selectPin(id) {
  if (!ready || paused) return;
  wakeAudio();
  if (match.phase === 'planning') {
    draft = draft.includes(id) ? draft.filter(pin => pin !== id) : draft.length < 3 ? [...draft, id] : [id];
    audio.play('wood'); syncPlanner();
  } else if (match.phase === 'playing' && commandPartner(match, id)) { audio.play('dog'); }
  focusField();
}
function start() {
  if (!ready || paused || !triangleDiscs(match, draft).length) return;
  if (!setPlan(match, draft) || !startRun(match)) return;
  clearInput(); wakeAudio(); audio.play('choose'); focusField(); syncHUD();
  if (touchDevice) $('playfield').scrollIntoView({block: 'start', behavior: 'instant'});
}
function push() { if (!ready || paused) return; wakeAudio(); if (pulse(match)) audio.play('cloth'); }
function reset() {
  clearInput(); seed++;
  match = createMatch({seed, opponent: $('opponent').value});
  draft = [...match.teams[0].plan]; suggestion = [...draft];
  paused = false; hoverPin = null; lastEvent = 0; lastPhase = 'planning'; lastRun = 1; lastRound = ''; animationTime = 0;
  planningSignature = ''; hudSignature = ''; $('overlay').hidden = true;
  wakeAudio(); syncPlanner(); syncHUD(); focusField();
}
function setPaused(value) {
  if (!ready || stopped || match.phase === 'finished') return;
  paused = value; clearInput(); hoverPin = null; audio.setPaused(paused);
  $('overlay').hidden = !paused;
  $('pause').textContent = paused ? 'Verder' : 'Pauze';
  if (paused) {
    $('overlay-kicker').textContent = 'EVEN UITBLAZEN'; $('overlay-title').textContent = 'Argos wacht wel.';
    $('overlay-detail').textContent = 'Het plein staat stil tot jij verder speelt.'; $('continue').textContent = 'Verder spelen';
    $('continue').focus({preventScroll: true});
  } else { wakeAudio(); focusField(); }
  planningSignature = ''; syncPlanner(); syncHUD();
}
function finishedOverlay() {
  clearInput();
  const winner = match.result.winner;
  $('overlay').hidden = false; $('overlay-kicker').textContent = 'EINDE VAN HET POTJE';
  $('overlay-title').textContent = winner === 0 ? 'Die kring is van ons!' : winner === 'draw' ? 'Niemand geeft een duimbreed.' : 'Dit plein is nog niet van jou.';
  $('overlay-detail').textContent = `${match.teams[0].score} – ${match.teams[1].score} na ${match.run} rondes. ${winner === 0 ? 'Argos eist zijn deel van de roem.' : winner === 'draw' ? 'Een nieuw potje beslist het.' : 'Argos wil onmiddellijk revanche.'}`;
  $('continue').textContent = 'Nog een potje →'; $('continue').focus({preventScroll: true});
  audio.play(winner === 0 ? 'victory' : 'defeat');
}
function processEvents() {
  for (const event of match.events) if (event.id > lastEvent) {
    if (event.type === 'claim') audio.play(event.team === 0 ? 'wood' : 'pot');
    else if (event.type === 'pulse') audio.play('cloth');
    else if (event.type === 'score') audio.play('connect');
    else if (event.type === 'timeout') audio.play('page');
    lastEvent = event.id;
  }
}
function syncHUD() {
  const phase = match.phase, our = match.teams[0], their = match.teams[1];
  const sig = `${phase}:${match.run}:${our.score}:${their.score}:${paused}:${ready}`;
  if (sig !== hudSignature) {
    hudSignature = sig;
    $('our-score').textContent = our.score; $('their-score').textContent = their.score; $('their-name').textContent = their.name.toUpperCase();
    for (const [node, score] of [[$('our-pips'), our.score], [$('their-pips'), their.score]]) { node.replaceChildren(); for (let i = 0; i < 5; i++) { const dot = document.createElement('i'); dot.classList.toggle('filled', i < score); node.append(dot); } }
    $('round').textContent = `RONDE ${match.run}`;
    $('enemy-legend').textContent = phase === 'planning' ? 'Hun planhint' : 'Hun knopen';
    $('planner').hidden = phase !== 'planning'; $('live-controls').hidden = phase !== 'playing'; $('round-result').hidden = phase !== 'resolve'; $('match-result').hidden = phase !== 'finished';
    $('pause').disabled = !ready || phase === 'finished'; $('pause').textContent = paused ? 'Verder' : 'Pauze';
    $('phase-kicker').textContent = phase === 'planning' ? '01 · HET PLAN' : phase === 'playing' ? '02 · HET PLEIN' : phase === 'resolve' ? match.resolution.timeout ? 'DE TIJD IS OM' : 'DE KRING IS GESLOTEN' : 'EINDE VAN HET POTJE';
    $('phase-title').textContent = phase === 'planning' ? 'Drie palen. Jouw kring.' : phase === 'playing' ? 'Knoop. Loop. Dwarsboom.' : phase === 'resolve' ? match.resolution.timeout ? 'Net te laat.' : match.resolution.winners.length > 1 ? 'Tegelijk!' : match.resolution.winners[0] === 0 ? 'Jullie kring staat!' : 'Zij zijn je voor!' : match.result.winner === 0 ? 'Gewonnen!' : match.result.winner === 'draw' ? 'Gelijkspel.' : 'Revanche?';
    $('instruction').textContent = phase === 'planning' ? 'Sluit een driehoek rond de bronzen schijven. Elke schijf is één punt.' : phase === 'playing' ? `${touchDevice ? 'Pijlen: loop zelf. Tik' : 'WASD: loop zelf. Klik'} een paal voor Argos. Blijf kort staan om een knoop te leggen — óók op hun palen.` : phase === 'resolve' ? match.resolution.timeout ? 'Deze ronde bleef elke kring open. Probeer een andere route.' : 'De schijven binnen de gesloten kring leveren punten op.' : 'Hetzelfde spel, nieuwe schijven. Een andere route kan het verschil maken.';
    if (phase === 'resolve') {
      const {deltas, shared, timeout} = match.resolution;
      $('result-score').textContent = timeout ? 'Geen punten' : `Jij +${deltas[0]} · zij +${deltas[1]}`;
      $('result-detail').textContent = shared.length ? 'Een tegelijk omsloten schijf gaat naar niemand.' : 'Straks liggen de schijven anders. Kies opnieuw.';
    }
    $('last-round').textContent = lastRound; $('last-round').hidden = !lastRound || !['planning', 'playing'].includes(phase);
  }
  $('timer').textContent = phase === 'playing' ? `${Math.ceil(match.remaining)} seconden` : phase === 'planning' ? 'Kies je kring' : phase === 'resolve' ? 'Punten tellen' : 'Uitgespeeld';
  const remaining = our.pulseCooldown;
  const pulseLabel = remaining > 0 ? `Nog ${remaining.toFixed(1)} s` : 'Maak ruimte!';
  if ($('pulse-label').textContent !== pulseLabel) $('pulse-label').textContent = pulseLabel;
  $('touch-pulse').textContent = phase === 'playing' && remaining > 0 ? `Nog ${remaining.toFixed(1)} s` : 'Maak ruimte!';
  $('pulse').disabled = $('touch-pulse').disabled = !ready || paused || phase !== 'playing' || remaining > 0;
  for (const b of document.querySelectorAll('[data-dir]')) b.disabled = !ready || paused || phase !== 'playing';
  if (phase === 'playing') {
    $('capture-status').textContent = `${our.plan.filter(id => match.pins.find(p => p.id === id).owner === 0).length} / 3 palen vast`;
    $('argos-target').textContent = `Argos → paal ${pinNumber(our.partnerTarget)}. Klik een andere paal om hem te sturen.`;
    $('our-close').value = our.closeProgress || 0; $('their-close').value = their.closeProgress || 0;
    $('closing-hint').textContent = their.closeProgress > 0 ? 'Ze sluiten! Neem één van hun palen over.' : our.closeProgress > 0 ? 'Hou je drie knopen vast tot de kring sluit!' : 'Alle drie vast? Houd ze 2 seconden in bezit.';
    $('closing-hint').classList.toggle('warning', their.closeProgress > 0);
  }
}
function transitions() {
  if (match.phase === 'resolve' && lastPhase !== 'resolve') {
    const r = match.resolution;
    lastRound = r.timeout ? `Ronde ${match.run}: de tijd was om. Niemand scoorde.` : `Ronde ${match.run}: jij +${r.deltas[0]}, zij +${r.deltas[1]}. ${r.shared.length ? 'Gedeelde schijven telden niet mee.' : ''}`;
    clearInput();
  }
  if (match.run !== lastRun) {
    draft = [...match.teams[0].plan]; suggestion = [...draft]; planningSignature = ''; syncPlanner(); clearInput();
  }
  if (match.phase === 'finished' && lastPhase !== 'finished') finishedOverlay();
  lastPhase = match.phase; lastRun = match.run;
}

$('start').addEventListener('click', start);
$('clear').addEventListener('click', () => { if (paused) return; draft = []; syncPlanner(); focusField(); });
$('suggest').addEventListener('click', () => { if (paused) return; draft = [...suggestion]; syncPlanner(); focusField(); });
$('pulse').addEventListener('click', () => { push(); focusField(); });
$('touch-pulse').addEventListener('click', push);
$('pause').addEventListener('click', () => setPaused(!paused));
$('continue').addEventListener('click', () => match.phase === 'finished' ? reset() : setPaused(false));
$('rematch').addEventListener('click', reset); $('new-match').addEventListener('click', reset);
$('sound').addEventListener('click', () => { audio.toggle(); syncSound(); });

function point(event) { const rect = canvas.getBoundingClientRect(); return {x: (event.clientX - rect.left) * 640 / rect.width, y: (event.clientY - rect.top) * 400 / rect.height}; }
function nearestPin(event) {
  const p = point(event), radius = Math.max(34, 22 * 640 / canvas.getBoundingClientRect().width);
  return match.pins.find(pin => Math.hypot(pin.x - p.x, pin.y - p.y) < radius ||
    (p.x >= pin.x + 8 && p.x <= pin.x + 40 && p.y >= pin.y - 33 && p.y <= pin.y - 2))?.id ?? null;
}
canvas.addEventListener('pointerdown', event => { if (event.button > 0 || paused) return; event.preventDefault(); const pin = nearestPin(event); if (pin) selectPin(pin); else focusField(); });
canvas.addEventListener('pointermove', event => { hoverPin = paused ? null : nearestPin(event); canvas.style.cursor = hoverPin ? 'pointer' : 'default'; });
canvas.addEventListener('pointerleave', () => { hoverPin = null; });
canvas.addEventListener('pointercancel', () => { hoverPin = null; });
for (const button of document.querySelectorAll('[data-dir]')) {
  button.addEventListener('pointerdown', event => {
    if (!ready || paused || match.phase !== 'playing' || event.button > 0) return;
    event.preventDefault(); wakeAudio(); button.setPointerCapture(event.pointerId); touchKeys.set(event.pointerId, button.dataset.dir); button.classList.add('held');
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => { touchKeys.delete(event.pointerId); button.classList.remove('held'); });
}
window.addEventListener('keydown', event => {
  if (!ready || stopped) return;
  if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) setPaused(!paused); return; }
  if (!$('overlay').hidden) {
    if (event.code === 'Tab') { event.preventDefault(); $('continue').focus(); }
    return;
  }
  if (event.target.closest?.('button,a,input,select,textarea')) return;
  if (event.code.match(/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Space|Digit[1-9]|Enter)$/)) {
    event.preventDefault(); if (paused) return;
    if (!event.repeat && event.code.startsWith('Digit')) selectPin(`p${Number(event.code.slice(5)) - 1}`);
    else if (event.code === 'Enter' && !event.repeat && match.phase === 'planning') start();
    else if (event.code === 'Space' && !event.repeat) push();
    else keys.add(event.code);
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { clearInput(); if (['playing', 'resolve'].includes(match.phase)) setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (['playing', 'resolve'].includes(match.phase)) setPaused(true); } });
function input() {
  const touch = new Set(touchKeys.values());
  return {x: Number(keys.has('KeyD') || keys.has('ArrowRight') || touch.has('right')) - Number(keys.has('KeyA') || keys.has('ArrowLeft') || touch.has('left')), y: Number(keys.has('KeyS') || keys.has('ArrowDown') || touch.has('down')) - Number(keys.has('KeyW') || keys.has('ArrowUp') || touch.has('up'))};
}
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
  if (ready && !stopped) {
    try {
      if (!paused) { if (match.phase === 'playing') animationTime += dt; stepMatch(match, dt, input()); processEvents(); transitions(); audio.update(now / 1000); }
      syncHUD(); drawMatch(ctx, preview(), {actor, time: animationTime, hoverPin, reducedMotion});
    } catch (error) { showError(error); }
  }
  requestAnimationFrame(frame);
}
function showError(error) { stopped = true; clearInput(); audio.setPaused(true); $('error').hidden = false; $('error').textContent = 'Het plein kon niet verder: ' + error.message; $('loading').hidden = true; console.error(error); }
async function load() {
  await Promise.all(['cast', 'argos'].map(async name => {
    const [image, data] = await Promise.all([imageLoad(`../assets/${name}.png`), fetch(`../assets/${name}.json`).then(response => { if (!response.ok) throw Error('Een pixelvel ontbreekt.'); return response.json(); })]);
    assets[name] = {image, frames: data.frames};
  }));
  ready = true; $('loading').hidden = true; syncPlanner(); syncHUD(); syncSound(); requestAnimationFrame(frame);
}
window.__kringspel = Object.freeze({get ready() {return ready;}, get paused() {return paused;}, snapshot() {return structuredClone(match);}, get draft() {return [...draft];}});
load().catch(showError);
