import {games, gameById} from './registry.js';
import {Soundscape} from '../proeven/sound.js';
import {drawKnotScores} from './knot-lesson.js';

const $ = id => document.getElementById(id), canvas = $('scene'), ctx = canvas.getContext('2d');
const query = new URLSearchParams(location.search), embedded = query.get('embed') === '1' && parent !== window;
const region = query.get('region') === 'athens' ? 'athens' : 'sinope', regionName = region === 'athens' ? 'Athene' : 'Sinope';
const shoreCircle=embedded&&region==='sinope'&&query.get('game')==='kringspel'&&query.get('shore')==='1';
const shoreSpring=embedded&&region==='sinope'&&query.get('game')==='waterweg'&&query.get('shore')==='1',shoreGame=shoreCircle||shoreSpring;
let lessonDone=false;
const session = query.get('session') || '', keys = new Set(), actionPointers = new Map(), assets = {};
const levelNames = ['Eerst eens proberen', 'De buurt heeft opgelet', 'De stad kijkt mee'];
const regionalGame = game => game && (region === 'athens'||shoreSpring) && game.id === 'waterweg' ? {...game, title: 'Water voor iedereen', subtitle: 'Een vrije weg naar de openbare kom', instruction: shoreSpring?'Draai de goten en laat het water lopen tot de kom vol is.':'Draai de buizen met een klik. Leid water van de bron links naar de openbare kom rechts. Test zo vaak je wilt.'} : game;
const keyLabel = value => String(value || '').replace(/Key([A-Z])/g, '$1').replace(/Digit([0-9])/g, '$1').replace(/ArrowLeft/g, '←').replace(/ArrowRight/g, '→').replace(/ArrowUp/g, '↑').replace(/ArrowDown/g, '↓').replace(/Space/g, 'spatie').replace(/Enter/g, 'enter');
const level = Math.max(1, Math.min(3, Number.parseInt(query.get('level'), 10) || 1));
const parsedSeed = Number.parseInt(query.get('seed'), 10);
const initialSeed = (Number.isFinite(parsedSeed) ? parsedSeed : 1) >>> 0;
const audio = new Soundscape(), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let ready = false, current = null, instance = null, started = false, finished = false, result = null;
let userPaused = false, externalPaused = false, mode = 'intro', attempt = 0, serial = 0;
let animationTime = 0, lastTime = 0, currentLevel = level, seed = initialSeed, lastStatus = '', controlSignature = '';
let canvasPointer = null, stopped = false, galleryLevel = level;
const paused = () => userPaused || externalPaused;
const active = () => ready && current && started && !paused() && !finished && !stopped;
const imageLoad = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(Error('Een pixelvel ontbreekt.')); image.src = src; });
document.body.classList.toggle('embedded', embedded);
document.body.classList.toggle('shore-circle',shoreGame);
document.body.classList.toggle('shore-pictures',shoreGame&&query.get('pictures')==='1');
document.body.dataset.region = region;
document.title = `${regionName} · Overal valt iets te spelen`;
$('brand').querySelector('b').textContent = regionName.toUpperCase();
$('brand').setAttribute('aria-label', `Terug naar ${regionName}`);
if (embedded) { $('home-link').hidden = true; $('brand').removeAttribute('href'); $('back').textContent = `Terug naar ${regionName}`; }
for (const option of $('gallery-level').options) option.textContent = `${option.value} · ${levelNames[Number(option.value) - 1]}`;
$('gallery-level').value = String(galleryLevel);

function actor(c, id, x, y, options = {}) {
  const {pose = 'idle', dir = 'down', scale = 1.4, flip = false, alpha = 1} = options;
  const dog = id === 'argos' || id === 'dog', sheet = assets[dog ? 'argos' : region === 'athens' ? 'athens-cast' : shoreCircle&&['hero','player','nera'].includes(id)?'first-light':'cast'];
  if (!sheet) return;
  const name = region === 'athens' && ['player', 'hero', 'diogenes'].includes(id) ? 'diogenes' : id === 'player' ? 'hero' : id === 'guard' ? 'philo' : id;
  let frame = dog ? `${dir}-${pose}` : `${name}/${dir}-${pose}`;
  if (pose.startsWith('walk')) { const n = pose === 'walk' ? Math.floor(animationTime * 8) % 4 : pose.match(/\d/)?.[0] || 0; frame = dog ? `${dir}-walk-${n}` : `${name}/${dir}-walk${n}`; }
  const f = (sheet.frames[frame] || sheet.frames[dog ? `${dir}-idle` : `${name}/${dir}-idle`] || sheet.frames[dog ? 'down-idle' : region === 'athens' ? 'diogenes/down-idle' : 'hero/down-idle'])?.frame;
  if (!f) return;
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(y)); if (flip) c.scale(-1, 1);
  c.drawImage(sheet.image, f.x, f.y, f.w, f.h, Math.round(-f.w * scale / 2), Math.round((-f.h + (dog ? 3 : 4)) * scale), Math.round(f.w * scale), Math.round(f.h * scale)); c.restore();
}
function sign(context,id,x,y,width){const sheet=assets['first-light'],frame=sheet?.frames['sign/'+id]?.frame;if(frame){context.imageSmoothingEnabled=false;context.drawImage(sheet.image,frame.x,frame.y,frame.w,frame.h,Math.round(x),Math.round(y),width,Math.round(width*frame.h/frame.w));}}
function springWall(context){const sheet=assets['first-light'],frame=sheet?.frames['yard/spring']?.frame;if(!frame)return false;context.drawImage(sheet.image,frame.x,frame.y,frame.w,frame.h,0,0,640,400);return true;}
function yard(context,match=false){
  const sheet=assets['first-light'],frame=sheet?.frames['yard/square']?.frame;if(!frame)return false;
  if(match){context.drawImage(sheet.image,frame.x,frame.y,frame.w,140,0,0,640,83);context.drawImage(sheet.image,frame.x,frame.y+140,frame.w,frame.h-140,0,83,640,317);}
  else context.drawImage(sheet.image,frame.x,frame.y,frame.w,frame.h,0,0,640,400);return true;
}
function post(type, extra = {}) { if (embedded) parent.postMessage({type, session, gameId: current?.id, level: currentLevel, attempt, ...extra}, location.origin); }
function syncAudio() { audio.setPaused(!started || paused() || stopped); }
function unlockAudio() { syncAudio(); audio.unlock(); }
function focusField() { $('playfield').focus({preventScroll: true}); }
function clearInput() {
  keys.clear(); actionPointers.clear();
  if (canvasPointer !== null && canvas.hasPointerCapture(canvasPointer)) canvas.releasePointerCapture(canvasPointer);
  canvasPointer = null;
  instance?.pointerUp?.({x: 0, y: 0, cancelled: true});
  document.querySelectorAll('.held').forEach(node => node.classList.remove('held'));
}
function setStatus(title, detail = '') {
  const signature = String(title) + '|' + String(detail);
  if (signature === lastStatus) return;
  lastStatus = signature; $('status-title').textContent = title; $('status-detail').textContent = detail;
}
function syncSound() { $('sound').textContent = audio.enabled ? '♪ Geluid aan' : '♩ Geluid uit'; $('sound').setAttribute('aria-pressed', String(audio.enabled)); }
function showOverlay(next) {
  mode = next; $('overlay').hidden = false;$('overlay').dataset.view=next;
  const scorecard=$('shore-result');scorecard.hidden=!shoreGame||next!=='result';
  if(!scorecard.hidden){const pen=scorecard.getContext('2d');pen.clearRect(0,0,scorecard.width,scorecard.height);if(shoreCircle){const match=instance.snapshot();drawKnotScores(pen,match,{sign},3,3,250,match.scoreLimit,1);scorecard.setAttribute('aria-label',`${match.teams[0].score} – ${match.teams[1].score}. ${result.title}`);}else{for(const [idx,id] of ['dry','next','drink'].entries())sign(pen,id,65+idx*46,0,38);scorecard.setAttribute('aria-label','De droge kom is weer vol.');}}
  const share=$('shore-share');share.hidden=!shoreCircle||next!=='result'||result.won;if(!share.hidden&&!share.firstElementChild){const icon=document.createElement('canvas');icon.width=32;icon.height=28;icon.setAttribute('aria-hidden','true');sign(icon.getContext('2d'),'loaf',0,0,32);share.prepend(icon);}
  $('return').textContent = embedded ? `Terug naar ${regionName}` : 'Andere spelletjes';
  $('overlay-kicker').textContent = next === 'intro' ? `NIVEAU ${currentLevel} · ${levelNames[currentLevel - 1]}` : next === 'pause' ? 'EVEN UITBLAZEN' : result?.won ? 'GOED GESPEELD' : 'NOG EEN POGING?';
  $('overlay-title').textContent = next === 'intro' ? current.title : next === 'pause' ? 'Argos wacht wel.' : result?.title || 'De ronde is voorbij.';
  $('overlay-copy').textContent = next === 'intro' ? current.instruction : next === 'pause' ? externalPaused ? `${regionName} is gepauzeerd. Ga verder in het hoofdspel om ook hier door te spelen.` : 'Het spel staat stil. Je gaat straks op dezelfde plek verder.' : result?.detail || '';
  $('overlay-tip').textContent = next === 'intro' ? 'Gebruik de knoppen of toetsen bij het speelveld. Klik en sleep waar het spel dat vraagt.' : next === 'pause' ? 'Je poging blijft bewaard zolang dit spel open is.' : result?.won ? `${result.score} punten · ${embedded ? 'Je resultaat gaat mee terug naar de stad.' : 'Probeer nog een ronde, of ontdek een ander spel.'}` : 'Je kunt meteen opnieuw proberen.';
  $('begin').textContent = next === 'intro' ? 'Spelen →' : next === 'pause' ? 'Verder spelen' : 'Nog eens proberen';
  $('begin').disabled = next === 'pause' && externalPaused;
  renderControls(); syncAudio(); queueMicrotask(() => $(shoreGame&&next==='result'&&result.won?'return':'begin').focus({preventScroll: true}));
}
function finish(raw) {
  if (finished || !current || !started) return;
  finished = true; clearInput();
  result = {won: Boolean(raw?.won), score: Number.isFinite(raw?.score) ? Math.max(0, Math.round(raw.score)) : 0, title: String(raw?.title || 'Ronde gespeeld'), detail: String(raw?.detail || '')};
  post('sinope:game-result', {result: {...result}});
  audio.play(result.won ? 'victory' : 'defeat'); showOverlay('result');
}
function createAttempt() {
  clearInput(); serial++; attempt++; const token = serial;
  started = false; finished = false; result = null; userPaused = false; stopped = false; animationTime = 0; lastStatus = ''; controlSignature = '';
  instance = current.create({level: currentLevel, seed, region, actor, sign,yard,springWall,reducedMotion,shoreSpring,shoreCircle,shoreLesson:shoreCircle&&!lessonDone,lessonDone:()=>{lessonDone=true;},setStatus(title, detail) { if (token === serial) setStatus(title, detail); }, sound(name) { if (token === serial && active()) audio.play(name); }, finish(value) { if (token === serial) finish(value); }});
  canvas.width = 640; canvas.height = current.height || 400; ctx.imageSmoothingEnabled = false;
  $('game-instruction').textContent = current.instruction; $('playfield').setAttribute('aria-label', current.title + '. ' + current.instruction);
  if (!lastStatus) setStatus(current.subtitle || current.title, 'Klaar voor een eerste poging.');
  $('attempt-note').textContent = embedded ? `Je resultaat wordt bij terugkeer in ${regionName} bewaard. Opnieuw proberen mag altijd.` : `Niveau ${currentLevel} · Poging ${attempt}. Elk nieuw potje geeft je ruimte om iets anders te proberen.`;
  instance.draw(ctx); renderControls(); if(shoreGame){started=true;mode='playing';$('overlay').hidden=true;syncAudio();renderControls();focusField();}else showOverlay('intro');
}
function selectGame(id, chosenLevel = currentLevel) {
  const game = regionalGame(gameById(id)); if (!game) return false;
  clearInput(); current = game; currentLevel = Math.max(1, Math.min(3, chosenLevel)); seed = initialSeed; attempt = 0;
  $('gallery').hidden = true; $('workshop').hidden = false; $('back').hidden = false; $('game-title').textContent = game.title;
  $('game-kicker').textContent = `NIVEAU ${currentLevel} · ${game.subtitle || levelNames[currentLevel - 1]}`;
  createAttempt(); if (!embedded) { const url = new URL(location.href); url.searchParams.set('game', id); url.searchParams.set('level', String(currentLevel)); history.replaceState(null, '', url); }
  window.scrollTo({top: 0, behavior: 'instant'}); return true;
}
function startOrResume() {
  if (!current || stopped || externalPaused) return;
  if (finished) { seed++; createAttempt(); return; }
  started = true; userPaused = false; clearInput(); $('overlay').hidden = true; mode = 'playing';
  unlockAudio(); audio.play('choose'); renderControls(); focusField();
  if (innerWidth < 760) $('playfield').scrollIntoView({block: 'start', behavior: 'instant'});
}
function setUserPaused(value) {
  if (!current || !started || finished || stopped) return;
  userPaused = value; clearInput(); syncAudio();
  if (paused()) showOverlay('pause'); else { $('overlay').hidden = true; mode = 'playing'; unlockAudio(); renderControls(); focusField(); }
}
function retry() { if (!current) return; seed++; createAttempt(); }
function back() {
  clearInput(); if (embedded) { post('sinope:game-exit'); userPaused = true; syncAudio(); return; }
  serial++; current = null; instance = null; started = false; finished = false; userPaused = false; result = null;
  $('overlay').hidden = true; $('workshop').hidden = true; $('gallery').hidden = false; $('back').hidden = true;
  syncAudio(); const url = new URL(location.href); url.searchParams.delete('game'); url.searchParams.delete('seed'); history.replaceState(null, '', url);
  drawGallery(); window.scrollTo({top: 0, behavior: 'instant'}); $('gallery-level').focus({preventScroll: true});
}
function doAction(id) { if (!active()) return; unlockAudio(); instance.action?.(id); renderControls(); }
function renderControls() {
  if (!current || !instance) return;
  const controls = instance.controls || current.controls || [];
  const signature = controls.map(control => control.id).join('|');
  if (signature !== controlSignature) {
    actionPointers.clear(); controlSignature = signature; $('actions').replaceChildren();
    for (const control of controls) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.action = control.id;
      const key = document.createElement('kbd'), label = document.createElement('span'); button.append(key, label);
      if(shoreGame){const icon=document.createElement('canvas');icon.width=32;icon.height=28;icon.setAttribute('aria-hidden','true');sign(icon.getContext('2d'),({seek:'paw',skip:'next',start:'next',clear:'back',suggest:'circle',pulse:'hand',turn:'turn',flow:'basin'})[control.id]||'next',0,0,32);button.prepend(icon);}
      button.addEventListener('click', event => { if (button.dataset.suppress === 'true' && event.detail !== 0) { button.dataset.suppress = 'false'; return; } doAction(control.id); focusField(); });
      const hold = control.hold || ['left','right','up','down','hero-left','hero-right','hero-up','hero-down'].includes(control.id);
      if (hold) {
        button.addEventListener('pointerdown', event => { if (!active() || button.disabled || event.button > 0) return; event.preventDefault(); button.dataset.suppress = 'true'; button.setPointerCapture(event.pointerId); actionPointers.set(event.pointerId, {id: control.id, button, next: performance.now() + 140}); button.classList.add('held'); doAction(control.id); });
        for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, event => { actionPointers.delete(event.pointerId); button.classList.remove('held'); });
      }
      $('actions').append(button);
    }
  }
  controls.forEach((control, index) => {
    const button = $('actions').children[index]; if (!button) return;
    button.querySelector('kbd').textContent = keyLabel(control.key); button.querySelector('kbd').hidden = !control.key;
    button.querySelector('span').textContent = control.label;
    button.disabled = !active() || Boolean(control.disabled);
  });
  $('pause').disabled = !started || finished || stopped; $('pause').textContent = paused() ? 'Verder' : 'Pauze';
}
function drawGallery() {
  if (!ready) return;
  $('cards').replaceChildren();
  for (const [index, source] of games.entries()) {
    const game = regionalGame(source);
    const card = document.createElement('article'); card.className = 'card'; card.dataset.game = game.id;
    const preview = document.createElement('div'); preview.className = 'card-preview'; const thumb = document.createElement('canvas'); thumb.width = 640; thumb.height = game.height || 400; thumb.setAttribute('aria-hidden', 'true'); preview.append(thumb);
    const number = document.createElement('span'); number.className = 'card-number'; number.textContent = String(index + 1).padStart(2, '0'); preview.append(number);
    const copy = document.createElement('div'); copy.className = 'card-copy'; const title = document.createElement('h2'); title.textContent = game.title;
    const description = document.createElement('p'); description.textContent = game.subtitle || game.instruction;
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Spelen →'; button.setAttribute('aria-label', game.title + ' spelen'); button.addEventListener('click', () => selectGame(game.id, galleryLevel));
    copy.append(title, description, button); card.append(preview, copy); $('cards').append(card);
    const small = game.create({level: galleryLevel, seed: initialSeed, region, actor, setStatus() {}, sound() {}, finish() {}});
    const painter = thumb.getContext('2d'); painter.imageSmoothingEnabled = false; small.draw(painter);
  }
}
function point(event) { const rect = canvas.getBoundingClientRect(); return {x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height}; }
canvas.addEventListener('pointerdown', event => { if (!active() || canvasPointer !== null || event.button > 0) return; event.preventDefault(); canvasPointer = event.pointerId; canvas.setPointerCapture(event.pointerId); unlockAudio(); focusField(); instance.pointerDown?.(point(event)); });
canvas.addEventListener('pointermove', event => { if (active() && (canvasPointer === null || event.pointerId === canvasPointer)) instance.pointerMove?.(point(event)); });
function releasePointer(event) { if (event.pointerId !== canvasPointer) return; instance?.pointerUp?.({...point(event), cancelled: event.type === 'pointercancel' || event.type === 'lostpointercapture'}); canvasPointer = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); }
canvas.addEventListener('pointerup', releasePointer); canvas.addEventListener('pointercancel', releasePointer); canvas.addEventListener('lostpointercapture', releasePointer);
window.addEventListener('keydown', event => {
  if (!ready || !current || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!$('overlay').hidden) {
    if (event.code === 'Tab') { const buttons = [...$('overlay').querySelectorAll('button')].filter(b => !b.disabled && !b.hidden); const index = buttons.indexOf(document.activeElement); event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus(); }
    if (event.code === 'Escape' && mode === 'pause') { event.preventDefault(); setUserPaused(false); }
    return;
  }
  if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) setUserPaused(!userPaused); return; }
  if (event.target.closest?.('button,a,select,input,textarea')) return;
  if (!active()) return;
  if (/^(Arrow|Space|Enter|Key|Digit)/.test(event.code)) { event.preventDefault(); keys.add(event.code); if (!event.repeat) instance.keyDown?.(event.code); }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { clearInput(); if (active()) setUserPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (active()) setUserPaused(true); } });
window.addEventListener('message', event => {
  if (!embedded || event.origin !== location.origin || event.source !== parent || event.data?.session !== session || event.data?.type !== 'sinope:game-pause') return;
  externalPaused = event.data.paused === true; clearInput(); syncAudio();
  if (started && !finished) { if (paused()) showOverlay('pause'); else { $('overlay').hidden = true; mode = 'playing'; unlockAudio(); renderControls(); focusField(); } }
});
$('begin').addEventListener('click', startOrResume); $('return').addEventListener('click', back); $('back').addEventListener('click', back); $('back-small').addEventListener('click', back);
$('shore-share').addEventListener('click',()=>{if(shoreCircle&&finished&&result&&!result.won){clearInput();post('sinope:game-exit',{intent:'bread'});userPaused=true;syncAudio();}});
$('retry-top').addEventListener('click', retry); $('pause').addEventListener('click', () => setUserPaused(!userPaused));
$('sound').addEventListener('click', () => { audio.toggle(); syncSound(); });
$('gallery-level').addEventListener('change', () => { galleryLevel = Number($('gallery-level').value); drawGallery(); });

function showError(error) { stopped = true; clearInput(); syncAudio(); $('error').hidden = false; $('error').textContent = 'Dit spel kon niet verder: ' + error.message; $('loading').hidden = true; $('overlay').hidden = true; console.error(error); }
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
  if (ready && current && instance && !stopped) {
    try {
      if (active()) {
        animationTime += reducedMotion ? 0 : dt;
        for (const [pointer, hold] of actionPointers) if (now >= hold.next) { if (!hold.button.disabled) doAction(hold.id); hold.next = now + 140; if (!hold.button.isConnected) actionPointers.delete(pointer); }
        instance.update?.(dt, keys);
      }
      if (started && !paused()) audio.update(now / 1000);
      renderControls(); ctx.imageSmoothingEnabled = false; instance.draw(ctx);
    } catch (error) { showError(error); }
  }
  requestAnimationFrame(frame);
}
async function load() {
  await Promise.all([region === 'athens' ? 'athens-cast' : 'cast', 'argos',...(shoreGame?['first-light']:[])].map(async name => { const [image, data] = await Promise.all([imageLoad(`../assets/${name}.png`), fetch(`../assets/${name}.json`).then(response => { if (!response.ok) throw Error('Een pixelvel ontbreekt.'); return response.json(); })]); assets[name] = {image, frames: data.frames}; }));
  ready = true; $('loading').hidden = true; syncSound();
  const id = query.get('game');
  if (id && !gameById(id)) throw Error('Dit spel staat niet op het plein.');
  if (id) selectGame(id, level); else { $('gallery').hidden = false; drawGallery(); }
  requestAnimationFrame(frame);
}
window.__sinopeArcade = Object.freeze({get region() {return region;}, get ready() {return ready;}, get paused() {return paused();}, get started() {return started;}, get gameId() {return current?.id || null;}, get result() {return result ? {...result} : null;}, get level() {return currentLevel;}, get attempt() {return attempt;}, snapshot() {return instance ? structuredClone(instance.snapshot?.() || {}) : null;}});
load().catch(showError);
