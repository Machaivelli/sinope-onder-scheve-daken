const STORAGE_KEY = 'sinope-sound';
const MAX_VOICES = 28;
const MAX_STRING_BUFFERS = 16;
const OUTPUT_LEVEL = 0.38;
const TAU = Math.PI * 2;

const PLACES = Object.freeze({
  courtyard: { sea: 0.019, wind: 0.032, fire: 0, birds: 0.85, music: 1, gap: 1 },
  market: { sea: 0.012, wind: 0.020, fire: 0, birds: 0.30, music: 0.85, gap: 1.15 },
  harbor: { sea: 0.108, wind: 0.040, fire: 0, birds: 0.75, music: 0.85, gap: 1.2 },
  workshop: { sea: 0.004, wind: 0.008, fire: 0.026, birds: 0, music: 0.72, gap: 1.2 },
  mint: { sea: 0.003, wind: 0.009, fire: 0, birds: 0, music: 0.65, gap: 1.45 },
  gate: { sea: 0.030, wind: 0.062, fire: 0, birds: 0.40, music: 0.9, gap: 1.3 },
});
const COOLDOWNS = Object.freeze({
  step: 0.10, cloth: 0.12, talk: 0.16, choose: 0.14, discover: 0.6,
  connect: 0.6, coin: 0.16, scale: 0.25, wood: 0.16, door: 0.4,
  page: 0.2, dog: 0.65, water: 0.2, fire: 0.2, settle: 0.8, pot: 0.2,
  'battle-start': 0.8, strike: 0.18, trick: 0.25, guard: 0.25, duo: 0.8,
  hurt: 0.2, victory: 1.8, defeat: 1.8, 'bread-catch': 0.08,
  'bread-hit': 0.25, 'dog-dash': 0.4,
  'mint-good': 0.10, 'mint-perfect': 0.16, 'mint-miss': 0.16, departure: 2.4,
});
const between = (min, max) => min + Math.random() * (max - min);
const pick = values => values[Math.floor(Math.random() * values.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Quiet, entirely synthesized audio. No network requests or audio files. */
export class Soundscape {
  constructor() {
    this.enabled = true;
    try {
      const preference = globalThis.localStorage?.getItem(STORAGE_KEY)
        ?? globalThis.localStorage?.getItem('sun-proof-sound');
      this.enabled = preference !== 'off';
    } catch { /* Private browsing can make preferences unavailable. */ }
    this.ctx = null;
    this.master = null;
    this.paused = true;
    this.nextBird = 7;
    this.place = 'courtyard';
    this.mood = 'day';
    this._farewellPhraseIndex = 0;
    this._phraseHoldUntil = 0;
    this.activity = null;
    this._activityBeatIndex = 0;
    this._nextActivityBeat = 0;
    this._voices = new Set();
    this._loops = new Map();
    this._strings = new Map();
    this._cooldowns = new Map();
    this._graph = [];
    this._noiseBuffers = null;
    this._lastWorldTime = null;
    this._needsSchedule = true;
    this._active = false;
    this._activated = false;
    this._destroyed = false;
    this._stateRevision = 0;
    this._appliedRevision = 0;
    this._stateTask = null;
    this._lastNote = -1;
    this._stepSide = 1;
    // Fallback for browsers without navigator.userActivation. A real gesture
    // permits audio; the game's start action still decides when to unlock it.
    this._gestureTarget = globalThis.document ?? null;
    this._gestureEvents = ['pointerdown', 'touchend', 'keydown', 'click'];
    this._onGesture = event => {
      if (event.isTrusted) {
        this._activated = true;
        this._removeGestureListeners();
      }
    };
    for (const event of this._gestureEvents) {
      this._gestureTarget?.addEventListener(event, this._onGesture, { capture: true, passive: true });
    }
  }

  _removeGestureListeners() {
    for (const event of this._gestureEvents) this._gestureTarget?.removeEventListener(event, this._onGesture, true);
    this._gestureTarget = null;
  }

  _hasGesture() {
    if (globalThis.navigator?.userActivation?.hasBeenActive || globalThis.navigator?.userActivation?.isActive) {
      this._activated = true;
      this._removeGestureListeners();
    }
    return this._activated;
  }

  _wantsAudio() { return !this._destroyed && this._activated && this.enabled && !this.paused; }
  _ready() { return this._wantsAudio() && this.ctx?.state === 'running' && this.master; }

  async unlock() {
    if (this._destroyed || !this._hasGesture() || !this.enabled || this.paused) return false;
    if (this.ctx?.state === 'closed') this._forgetContext();
    if (!this.ctx && !this._createContext()) return false;
    return this._queueState();
  }

  _createContext() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext
      || globalThis.window?.AudioContext || globalThis.window?.webkitAudioContext;
    if (!Context) return false;
    let context;
    try {
      context = new Context({ latencyHint: 'interactive' });
      this.ctx = context;
      this.master = context.createGain();
      this.master.gain.value = 0;
      this.master.connect(context.destination);
      this._graph.push(this.master);
      for (const name of ['_effects', '_music', '_ambience']) {
        this[name] = context.createGain();
        this[name].connect(this.master);
        this._graph.push(this[name]);
      }
      const length = Math.ceil(context.sampleRate * 6);
      const white = context.createBuffer(1, length, context.sampleRate);
      const brown = context.createBuffer(1, length, context.sampleRate);
      const whiteData = white.getChannelData(0), brownData = brown.getChannelData(0);
      let low = 0;
      for (let i = 0; i < length; i++) {
        const sample = Math.random() * 2 - 1;
        low = (low + sample * 0.018) / 1.018;
        whiteData[i] = sample;
        brownData[i] = low * 3.1;
      }
      // Overlap the last 25 ms with the beginning; loops resume after the overlap.
      const seam = Math.floor(context.sampleRate * 0.025);
      this._noiseLoopStart = seam / context.sampleRate;
      for (let i = 0; i < seam; i++) {
        const mix = i / seam;
        brownData[length - seam + i] = brownData[length - seam + i] * (1 - mix) + brownData[i] * mix;
        whiteData[length - seam + i] = whiteData[length - seam + i] * (1 - mix) + whiteData[i] * mix;
      }
      this._noiseBuffers = { white, brown };
      context.onstatechange = () => {
        if (context !== this.ctx) return;
        if (context.state === 'running' && this._wantsAudio()) this._startAudio();
        else this._stopAudio();
      };
      return true;
    } catch {
      this._forgetContext();
      try { Promise.resolve(context?.close()).catch(() => {}); } catch { /* Optional audio. */ }
      return false;
    }
  }

  // Serialize resume/suspend: a pause made during a pending resume always wins.
  _queueState() {
    this._stateRevision++;
    if (!this.ctx) return Promise.resolve(false);
    if (!this._stateTask) {
      this._stateTask = this._syncState().finally(() => {
        this._stateTask = null;
        // A running context can finish synchronously before finally runs.
        // Also honor state changes made inside that intervening microtask.
        if (this.ctx && this._appliedRevision !== this._stateRevision) return this._queueState();
      });
    }
    return this._stateTask;
  }

  async _syncState() {
    let revision;
    do {
      revision = this._stateRevision;
      const context = this.ctx;
      this._appliedRevision = revision;
      if (!context || context.state === 'closed') return false;
      try {
        if (this._wantsAudio()) {
          if (context.state !== 'running') await context.resume();
          if (context !== this.ctx) continue;
          if (this._wantsAudio() && context.state === 'running') this._startAudio();
          else {
            this._stopAudio();
            if (context.state === 'running') await context.suspend();
          }
        } else {
          this._stopAudio();
          if (context.state !== 'suspended') await context.suspend();
        }
      } catch {
        if (context === this.ctx) this._stopAudio();
        return false;
      }
    } while (revision !== this._stateRevision);
    return Boolean(this._ready());
  }

  apply() {
    if (!this._wantsAudio()) this._stopAudio();
    if (this.ctx) void this._queueState();
  }

  setPaused(value) { this.paused = Boolean(value); this.apply(); }

  toggle() {
    this.enabled = !this.enabled;
    try { globalThis.localStorage?.setItem(STORAGE_KEY, this.enabled ? 'on' : 'off'); } catch { /* Optional preference. */ }
    if (this.enabled) void this.unlock();
    this.apply();
    return this.enabled;
  }

  setPlace(mapId) {
    if (!Object.hasOwn(PLACES, mapId) || this.place === mapId) return;
    this.place = mapId;
    this._needsSchedule = true;
    if (this._ready()) this._syncLoops();
  }

  setMood(mood) {
    if (!['day', 'farewell'].includes(mood) || this.mood === mood) return;
    this.mood = mood;
    this._farewellPhraseIndex = 0;
    this._phraseHoldUntil = 0;
    this._needsSchedule = true;
    if (!this.activity) {
      for (const voice of [...this._voices]) {
        if (voice.group === 'music') this._releaseVoice(voice, true);
      }
    }
    if (this._ready()) this._shapeAmbience();
  }

  setActivity(kind = null) {
    if (![null, 'battle', 'bread', 'mint'].includes(kind) || this.activity === kind) return;
    this.activity = kind;
    this._activityBeatIndex = 0;
    this._nextActivityBeat = 0;
    this._needsSchedule = true;
    for (const voice of [...this._voices]) {
      if (voice.group === 'music') this._releaseVoice(voice, true);
    }
    if (this._ready()) this._shapeAmbience();
  }

  _startAudio() {
    if (!this._ready()) return;
    if (!this._active) {
      this._active = true;
      this._needsSchedule = true;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(0);
      this.master.gain.setValueAtTime(0, t);
      this.master.gain.setTargetAtTime(OUTPUT_LEVEL, t, 0.11);
    }
    this._syncLoops();
  }

  _stopAudio() {
    this._active = false;
    this._needsSchedule = true;
    if (this.master && this.ctx?.state !== 'closed') {
      try {
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(0);
        this.master.gain.setValueAtTime(0, t);
      } catch { /* The browser may have closed the context. */ }
    }
    for (const voice of [...this._voices]) this._releaseVoice(voice, true);
    for (const kind of [...this._loops.keys()]) this._stopLoop(kind);
    this._cooldowns.clear();
  }

  _forgetContext() {
    this._stopAudio();
    if (this.ctx) this.ctx.onstatechange = null;
    for (const node of this._graph) { try { node.disconnect(); } catch { /* Already disconnected. */ } }
    this._graph = [];
    this._strings.clear();
    this._noiseBuffers = null;
    this.master = this._effects = this._music = this._ambience = null;
    this.ctx = null;
  }

  destroy() {
    this._destroyed = true;
    this._removeGestureListeners();
    const context = this.ctx;
    this._forgetContext();
    try { Promise.resolve(context?.close()).catch(() => {}); } catch { /* Already closed. */ }
  }

  _bus(group) { return group === 'music' ? this._music : group === 'ambient' ? this._ambience : this._effects; }

  _makeRoom(group) {
    if (!this._ready()) return false;
    if (this._voices.size < MAX_VOICES) return true;
    if (group === 'effect') {
      const expendable = [...this._voices].find(voice => voice.group !== 'effect');
      if (expendable) { this._releaseVoice(expendable, true); return true; }
    }
    return false;
  }

  _trackVoice(source, nodes, end, group) {
    const voice = { source, nodes, end, group, ended: false };
    this._voices.add(voice);
    source.onended = () => this._releaseVoice(voice);
    return voice;
  }

  _releaseVoice(voice, stop = false) {
    if (voice.ended) return;
    voice.ended = true;
    voice.source.onended = null;
    if (stop) { try { voice.source.stop(); } catch { /* Already stopped. */ } }
    for (const node of voice.nodes) { try { node.disconnect(); } catch { /* Already disconnected. */ } }
    this._voices.delete(voice);
  }

  _pan(node, pan, nodes, group) {
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = clamp(pan, -0.7, 0.7);
      node.connect(panner);
      panner.connect(this._bus(group));
      nodes.push(panner);
    } else node.connect(this._bus(group));
  }

  _envelope(gain, t, duration, volume, attack = 0.007) {
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), t + Math.min(attack, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    gain.gain.linearRampToValueAtTime(0, t + duration + 0.015);
  }

  // Public compatibility with the first courtyard; the same source cap applies.
  tone(frequency, end, duration, volume, delay = 0, type = 'sine') {
    if (![frequency, end, duration, volume, delay].every(Number.isFinite)) return;
    this._tone({ frequency, end, duration, volume, delay, type });
  }

  _tone({ frequency, end = frequency, duration = 0.15, volume = 0.03, delay = 0, type = 'sine', pan = 0, group = 'effect' }) {
    if (!this._makeRoom(group)) return;
    duration = clamp(duration, 0.02, 2.8);
    delay = clamp(delay, 0, 2);
    const t = this.ctx.currentTime + delay;
    const source = this.ctx.createOscillator(), gain = this.ctx.createGain();
    const nodes = [source, gain];
    source.type = ['sine', 'triangle'].includes(type) ? type : 'sine';
    source.frequency.setValueAtTime(clamp(frequency, 40, 4500), t);
    source.frequency.exponentialRampToValueAtTime(clamp(end, 40, 4500), t + duration);
    this._envelope(gain, t, duration, clamp(volume, 0, 0.15));
    source.connect(gain);
    this._pan(gain, pan, nodes, group);
    const voice = this._trackVoice(source, nodes, t + duration + 0.025, group);
    try { source.start(t); source.stop(voice.end); } catch { this._releaseVoice(voice, true); }
  }

  _noise({ duration = 0.1, volume = 0.025, frequency = 800, filter = 'lowpass', brown = false, delay = 0, pan = 0, group = 'effect' }) {
    if (!this._makeRoom(group)) return;
    const t = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource(), color = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    const nodes = [source, color, gain];
    source.buffer = this._noiseBuffers[brown ? 'brown' : 'white'];
    color.type = filter;
    color.frequency.value = frequency;
    color.Q.value = 0.5;
    this._envelope(gain, t, duration, volume, 0.01);
    source.connect(color).connect(gain);
    this._pan(gain, pan, nodes, group);
    const voice = this._trackVoice(source, nodes, t + duration + 0.025, group);
    try { source.start(t, between(0.05, 4.5)); source.stop(voice.end); } catch { this._releaseVoice(voice, true); }
  }

  _stringBuffer(frequency) {
    const key = frequency.toFixed(3);
    if (this._strings.has(key)) return this._strings.get(key);
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.ceil(rate * 2.5), rate);
    const data = buffer.getChannelData(0);
    const period = Math.max(8, Math.round(rate / frequency - 0.5));
    const ring = new Float32Array(period);
    let mean = 0;
    for (let i = 0; i < period; i++) {
      ring[i] = ((Math.random() * 2 - 1) * 0.52 + Math.sin(TAU * i / period) * 0.22) * Math.sin(Math.PI * i / period);
      mean += ring[i] / period;
    }
    for (let i = 0; i < period; i++) ring[i] -= mean;
    // Karplus–Strong: an excited string loses bright overtones as it rings.
    for (let i = 0; i < data.length; i++) {
      const index = i % period, next = (index + 1) % period;
      data[i] = ring[index];
      ring[index] = (ring[index] + ring[next]) * 0.497;
    }
    if (this._strings.size >= MAX_STRING_BUFFERS) this._strings.delete(this._strings.keys().next().value);
    this._strings.set(key, buffer);
    return buffer;
  }

  _pluck(frequency, volume = 0.08, delay = 0, pan = 0, duration = 1.8, group = 'music') {
    if (!this._makeRoom(group)) return;
    const t = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
    const nodes = [source, gain];
    source.buffer = this._stringBuffer(frequency);
    this._envelope(gain, t, duration, volume, 0.004);
    source.connect(gain);
    this._pan(gain, pan, nodes, group);
    const voice = this._trackVoice(source, nodes, t + duration + 0.025, group);
    try { source.start(t); source.stop(voice.end); } catch { this._releaseVoice(voice, true); }
  }

  _syncLoops() {
    if (!this._ready()) return;
    const profile = PLACES[this.place];
    for (const kind of ['sea', 'wind', 'fire']) {
      if (!profile[kind]) { this._stopLoop(kind); continue; }
      if (this._loops.has(kind)) continue;
      const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
      const nodes = [source, filter, gain];
      source.buffer = this._noiseBuffers[kind === 'fire' ? 'white' : 'brown'];
      source.loop = true;
      source.loopStart = this._noiseLoopStart;
      source.loopEnd = source.buffer.duration;
      source.playbackRate.value = kind === 'sea' ? 0.81 : kind === 'wind' ? 0.68 : 0.93;
      filter.type = kind === 'wind' ? 'bandpass' : 'lowpass';
      filter.frequency.value = kind === 'fire' ? 750 : kind === 'sea' ? 540 : 410;
      filter.Q.value = 0.45;
      gain.gain.value = 0;
      source.connect(filter).connect(gain);
      this._pan(gain, kind === 'sea' ? -0.2 : kind === 'fire' ? 0.25 : 0.1, nodes, 'ambient');
      const loop = { source, filter, gain, nodes };
      this._loops.set(kind, loop);
      source.onended = () => { if (this._loops.get(kind) === loop) this._stopLoop(kind); };
      try { source.start(this.ctx.currentTime, between(0, 4)); } catch { this._stopLoop(kind); }
    }
    this._shapeAmbience();
  }

  _stopLoop(kind) {
    const loop = this._loops.get(kind);
    if (!loop) return;
    this._loops.delete(kind);
    loop.source.onended = null;
    try { loop.source.stop(); } catch { /* Already stopped. */ }
    for (const node of loop.nodes) { try { node.disconnect(); } catch { /* Already disconnected. */ } }
  }

  _shapeAmbience() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime, profile = PLACES[this.place];
    for (const [kind, loop] of this._loops) {
      const wave = kind === 'sea'
        ? 0.70 + Math.sin(t * 0.34) * 0.20 + Math.sin(t * 0.117 + 1) * 0.10
        : kind === 'wind' ? 0.60 + Math.sin(t * 0.15 + 2) * 0.25 : between(0.65, 0.95);
      const shade = (this.mood === 'farewell' && kind !== 'sea' ? 0.8 : 1) * (this.activity ? 0.35 : 1);
      this._glide(loop.gain.gain, profile[kind] * wave * shade, t, kind === 'fire' ? 0.4 : 1.8);
      this._glide(loop.filter.frequency, kind === 'sea' ? 440 + wave * 240 : kind === 'wind' ? 300 + wave * 330 : 550 + wave * 400, t, 2);
    }
  }

  _glide(parameter, target, time, speed) {
    const current = parameter.value;
    // Keep long sessions bounded, including browsers retaining old automation.
    parameter.cancelScheduledValues(0);
    parameter.setValueAtTime(current, time);
    parameter.setTargetAtTime(target, time, speed);
  }

  play(name) {
    if (!this._ready() || !Object.hasOwn(COOLDOWNS, name)) return;
    const t = this.ctx.currentTime;
    if (t < (this._cooldowns.get(name) ?? -1)) return;
    this._cooldowns.set(name, t + COOLDOWNS[name]);
    const pan = between(-0.12, 0.12);
    const tone = (frequency, end, duration, volume, delay = 0, type = 'sine') => this._tone({ frequency, end, duration, volume, delay, type, pan });
    const noise = options => this._noise({ pan, ...options });
    const pluck = (frequency, volume, delay = 0, duration = 1.2) => this._pluck(frequency, volume, delay, pan, duration, 'effect');
    switch (name) {
      case 'step':
        this._stepSide *= -1;
        noise({ duration: between(0.05, 0.075), frequency: between(430, 680), volume: 0.052, pan: this._stepSide * 0.07 });
        tone(between(88, 105), 51, 0.065, 0.046, 0, 'triangle');
        break;
      case 'cloth': noise({ duration: 0.12, frequency: 780, filter: 'bandpass', volume: 0.035 }); break;
      case 'talk':
        tone(between(145, 175), 128, 0.07, 0.019);
        noise({ duration: 0.065, frequency: 430, volume: 0.015 });
        break;
      case 'choose': pluck(294, 0.075, 0, 0.4); break;
      case 'discover': pluck(294, 0.13); pluck(392, 0.11, 0.18); pluck(490, 0.075, 0.43); break;
      case 'connect':
        pluck(196, 0.14, 0, 1.7); pluck(294, 0.10, 0.09, 1.7); pluck(392, 0.07, 0.36, 1.7);
        break;
      case 'coin': tone(980, 956, 0.14, 0.027); tone(1468, 1450, 0.075, 0.008, 0.01); break;
      case 'scale':
        tone(245, 241, 0.32, 0.039); tone(367, 362, 0.23, 0.017, 0.03);
        noise({ duration: 0.045, frequency: 1100, volume: 0.024 });
        break;
      case 'wood':
        noise({ duration: 0.075, frequency: 490, volume: 0.08 });
        tone(142, 91, 0.095, 0.024, 0, 'triangle');
        break;
      case 'door':
        noise({ duration: 0.36, frequency: 280, volume: 0.04, brown: true });
        tone(94, 77, 0.25, 0.035, 0, 'triangle');
        noise({ duration: 0.065, frequency: 530, volume: 0.045, delay: 0.26 });
        break;
      case 'page':
        noise({ duration: 0.14, frequency: 1500, filter: 'bandpass', volume: 0.035 });
        noise({ duration: 0.07, frequency: 1100, filter: 'bandpass', volume: 0.022, delay: 0.12 });
        break;
      case 'dog':
        tone(163, 110, 0.11, 0.045, 0, 'triangle');
        tone(142, 97, 0.09, 0.029, 0.145, 'triangle');
        noise({ duration: 0.075, frequency: 570, volume: 0.028, delay: 0.01 });
        break;
      case 'water':
        noise({ duration: 0.24, frequency: 870, volume: 0.031, brown: true });
        tone(560, 365, 0.15, 0.025); tone(725, 500, 0.12, 0.016, 0.14);
        break;
      case 'fire':
        noise({ duration: 0.16, frequency: 1000, volume: 0.019 });
        noise({ duration: 0.035, frequency: 1750, volume: 0.026, delay: 0.025 });
        break;
      case 'pot': tone(400, 376, 0.17, 0.038); tone(610, 590, 0.095, 0.013); break;
      case 'settle':
        pluck(196, 0.13, 0, 1.8); pluck(294, 0.09, 0.29, 1.8); pluck(392, 0.055, 0.7, 1.6);
        noise({ duration: 0.2, frequency: 650, volume: 0.024 });
        break;
      case 'battle-start':
        pluck(196, 0.11, 0, 0.6); pluck(294, 0.10, 0.09, 0.6); pluck(392, 0.10, 0.18, 0.7);
        tone(98, 73.5, 0.20, 0.05, 0.22, 'triangle');
        noise({ duration: 0.12, frequency: 950, volume: 0.04, delay: 0.22 });
        break;
      case 'strike':
        noise({ duration: 0.09, frequency: 1500, filter: 'bandpass', volume: 0.045 });
        noise({ duration: 0.09, frequency: 490, volume: 0.095, delay: 0.06 });
        tone(185, 76, 0.13, 0.075, 0.05, 'triangle');
        break;
      case 'trick':
        tone(180, 117, 0.10, 0.045, 0, 'triangle');
        noise({ duration: 0.055, frequency: 570, volume: 0.034, delay: 0.01 });
        pluck(392, 0.09, 0.13, 0.3); pluck(494, 0.075, 0.23, 0.4);
        break;
      case 'guard':
        tone(392, 382, 0.16, 0.048); tone(588, 574, 0.11, 0.022, 0.01);
        noise({ duration: 0.06, frequency: 1400, volume: 0.05 });
        pluck(196, 0.07, 0.12, 0.45);
        break;
      case 'duo':
        pluck(294, 0.11, 0, 0.45); pluck(392, 0.11, 0.08, 0.45); pluck(588, 0.09, 0.16, 0.7);
        noise({ duration: 0.22, frequency: 1200, filter: 'bandpass', volume: 0.08, delay: 0.10 });
        tone(196, 65, 0.24, 0.11, 0.24, 'triangle');
        noise({ duration: 0.15, frequency: 610, volume: 0.11, delay: 0.24 });
        tone(784, 588, 0.17, 0.025, 0.32);
        break;
      case 'hurt':
        tone(147, 83, 0.19, 0.065, 0, 'triangle');
        noise({ duration: 0.12, frequency: 540, volume: 0.065 });
        break;
      case 'victory':
        for (const [i, note] of [294, 392, 494, 588].entries()) pluck(note, 0.12, i * 0.13, 1.3);
        pluck(196, 0.10, 0.40, 1.6); pluck(392, 0.075, 0.56, 1.5);
        tone(784, 784, 0.35, 0.022, 0.57);
        break;
      case 'defeat':
        pluck(294, 0.09, 0, 0.9); pluck(246.94, 0.085, 0.24, 1.0); pluck(196, 0.08, 0.48, 1.3);
        break;
      case 'bread-catch':
        tone(588, 784, 0.095, 0.044);
        pluck(392, 0.08, 0.015, 0.24);
        noise({ duration: 0.04, frequency: 700, volume: 0.025 });
        break;
      case 'bread-hit':
        tone(196, 98, 0.16, 0.058, 0, 'triangle');
        noise({ duration: 0.13, frequency: 1000, volume: 0.07 });
        break;
      case 'dog-dash':
        tone(174, 116, 0.095, 0.05, 0, 'triangle');
        noise({ duration: 0.20, frequency: 1200, filter: 'bandpass', volume: 0.05, delay: 0.06 });
        pluck(392, 0.07, 0.15, 0.25); pluck(588, 0.07, 0.23, 0.3);
        break;
      case 'mint-good':
        noise({ duration: 0.035, frequency: 1450, volume: 0.05 });
        tone(784, 776, 0.24, 0.043); tone(2164, 2138, 0.075, 0.009);
        break;
      case 'mint-perfect':
        noise({ duration: 0.035, frequency: 1500, volume: 0.055 });
        tone(784, 784, 0.32, 0.044); tone(2164, 2164, 0.09, 0.009);
        tone(988, 988, 0.22, 0.025, 0.07); tone(1176, 1176, 0.28, 0.018, 0.15);
        break;
      case 'mint-miss':
        noise({ duration: 0.09, frequency: 570, volume: 0.058 });
        tone(220, 184, 0.11, 0.041, 0, 'triangle');
        tone(510, 476, 0.055, 0.013);
        break;
      case 'departure':
        pluck(196, 0.10, 0, 1.5); pluck(246.94, 0.09, 0.26, 1.5);
        pluck(294, 0.085, 0.57, 1.6); pluck(392, 0.07, 1.03, 1.6);
        pluck(294, 0.058, 1.55, 1.8); pluck(147, 0.048, 1.55, 1.8);
        // Leave the sea audible after the final two notes.
        this._phraseHoldUntil = this.ctx.currentTime + 8;
        break;
    }
  }

  _bird() {
    if (this.place === 'harbor' && Math.random() < 0.45) {
      const frequency = between(740, 880), pan = between(-0.5, 0.5);
      this._tone({ frequency, end: frequency * 1.24, duration: 0.28, volume: 0.012, pan, group: 'ambient' });
      this._tone({ frequency: frequency * 1.18, end: frequency * 0.85, duration: 0.37, volume: 0.010, delay: 0.27, pan, group: 'ambient' });
    } else {
      const frequency = between(1250, 1720), pan = between(-0.6, 0.6);
      this._tone({ frequency, end: frequency * between(1.12, 1.30), duration: between(0.10, 0.15), volume: 0.017, pan, group: 'ambient' });
      this._tone({ frequency: frequency * 1.2, end: frequency * 0.94, duration: between(0.12, 0.19), volume: 0.012, delay: between(0.20, 0.27), pan, group: 'ambient' });
    }
  }

  _phrase() {
    const farewell = this.mood === 'farewell';
    if (farewell) {
      const phrases = [[196, 246.94, 294, 246.94], [196, 220, 294, 392]];
      const notes = phrases[this._farewellPhraseIndex++ % phrases.length];
      const delays = [0, 0.50, 1.06, 1.72];
      for (const [i, note] of notes.entries()) {
        this._pluck(note, (0.095 - i * 0.012) * PLACES[this.place].music, delays[i], i % 2 ? 0.12 : -0.12, 1.8);
      }
      return;
    }
    const notes = [196, 220.5, 245, 294, 330.75, 392];
    const count = pick([2, 3, 3, 4]);
    const strength = PLACES[this.place].music;
    let index = Math.floor(Math.random() * (notes.length - 1));
    if (index === this._lastNote) index = (index + 2) % notes.length;
    let delay = 0;
    for (let i = 0; i < count; i++) {
      this._pluck(notes[index], between(0.11, 0.15) * strength * (i === 0 ? 1 : 0.82), delay, between(-0.26, 0.26), 1.8);
      this._lastNote = index;
      index = pick([-2, -1, 1, 2].map(step => index + step).filter(next => next >= 0 && next < notes.length));
      delay += between(0.30, 0.48);
    }
    if (Math.random() < 0.28) this._pluck(147, 0.085 * strength, 0.04, -0.16, 2.2);
  }

  _ambientDetail() {
    if (this.place === 'workshop') {
      this._noise({ duration: between(0.025, 0.07), volume: 0.025, frequency: between(850, 1600), pan: 0.25, group: 'ambient' });
    } else if (this.place === 'harbor') {
      this._noise({ duration: 0.48, volume: 0.033, frequency: 290, brown: true, pan: -0.25, group: 'ambient' });
      this._tone({ frequency: between(97, 118), end: 84, duration: 0.38, volume: 0.009, type: 'triangle', pan: -0.25, group: 'ambient' });
    } else if (this.place === 'market') {
      this._noise({ duration: 0.19, volume: 0.024, frequency: 1050, filter: 'bandpass', pan: between(-0.5, 0.5), group: 'ambient' });
    }
  }

  _activityBeat() {
    const bread = this.activity === 'bread';
    const index = this._activityBeatIndex++ % 16;
    if (this.activity === 'mint') {
      const notes = [294, 0, 392, 0, 440, 392, 0, 294, 330, 0, 440, 0, 392, 0, 294, 0];
      const frequency = notes[index];
      if (frequency) {
        this._tone({ frequency, duration: 0.21, volume: 0.023, pan: index % 4 < 2 ? -0.1 : 0.1, group: 'music' });
        this._tone({ frequency: frequency * 2.76, duration: 0.065, volume: 0.005, group: 'music' });
      }
      if (index % 4 === 0) this._noise({ duration: 0.035, volume: 0.014, frequency: 480, group: 'music' });
      return;
    }
    const melody = bread
      ? [392, 0, 494, 588, 494, 0, 440, 392, 330, 0, 392, 440, 294, 0, 330, 0]
      : [196, 0, 294, 0, 245, 294, 0, 330, 196, 0, 294, 392, 330, 0, 294, 0];
    if (melody[index]) this._pluck(melody[index], bread ? 0.056 : 0.052, 0, index % 2 ? 0.12 : -0.12, 0.40, 'music');
    if (index % 4 === 0) {
      this._tone({ frequency: bread ? 147 : 98, end: bread ? 132 : 73.5, duration: 0.13, volume: 0.023, type: 'triangle', group: 'music' });
    }
    if (index % 2 === 1) this._noise({ duration: 0.04, volume: 0.021, frequency: bread ? 1050 : 680, group: 'music' });
  }

  _scheduleFrom(time) {
    this.nextBird = time + between(8, 17);
    this._nextPhrase = time + (this.mood === 'farewell' ? 1.2 : between(6, 11));
    this._nextAmbience = time;
    this._nextDetail = time + between(3, 7);
    this._needsSchedule = false;
  }

  update(worldTime) {
    if (!Number.isFinite(worldTime)) { this._needsSchedule = true; return; }
    const reset = this._lastWorldTime !== null
      && (worldTime < this._lastWorldTime - 0.01 || worldTime - this._lastWorldTime > 3);
    this._lastWorldTime = worldTime;
    if (!this._ready()) { this._needsSchedule = true; return; }
    // Missed or delayed onended callbacks cannot accumulate sources.
    for (const voice of [...this._voices]) {
      if (voice.end <= this.ctx.currentTime) this._releaseVoice(voice, true);
      else if (reset && voice.group !== 'effect') this._releaseVoice(voice, true);
    }
    if (this._needsSchedule || reset) this._scheduleFrom(worldTime);
    if (!Number.isFinite(this.nextBird)) this.nextBird = worldTime + between(8, 17);
    if (worldTime >= this._nextAmbience) { this._nextAmbience = worldTime + 1.2; this._shapeAmbience(); }
    if (this.activity) {
      // Activities stop the city clock. AudioContext time keeps their rhythm
      // steady without advancing residents, and suspend freezes it on pause.
      if (this.ctx.currentTime >= this._nextActivityBeat) {
        this._nextActivityBeat = this.ctx.currentTime + (this.activity === 'bread' ? 0.27 : this.activity === 'mint' ? 0.4 : 0.34);
        this._activityBeat();
      }
      return;
    }
    if (worldTime >= this.nextBird) {
      this.nextBird = worldTime + between(15, 29);
      if (Math.random() < PLACES[this.place].birds * (this.mood === 'farewell' ? 0.55 : 1)) this._bird();
    }
    if (worldTime >= this._nextPhrase && this.ctx.currentTime >= this._phraseHoldUntil) {
      this._nextPhrase = worldTime + between(15, 26) * PLACES[this.place].gap * (this.mood === 'farewell' ? 1.3 : 1);
      this._phrase();
    }
    if (worldTime >= this._nextDetail) {
      this._nextDetail = worldTime + (this.place === 'workshop' ? between(2.5, 6) : between(9, 18));
      this._ambientDetail();
    }
  }
}
