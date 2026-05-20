// ── Dungeon Crawler Music Engine ──────────────────────────────────────────────
// Procedural sequencer using Web Audio API. Two layers per step: bass + melody.
// Call Music.play('phase') on phase transitions, Music.toggle() to mute.

const Music = (() => {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let schedulerTimer = null;
  let nextNoteTime = 0;
  let seqIdx = 0;
  let currentSteps = [];
  let currentBeatDur = 0;
  let currentPhase = null;
  let muted = false;

  // ── Frequency table ────────────────────────────────────────────────────────
  const N = {
    D2: 73.42,  E2: 82.41,  F2: 87.31,  Gb2: 92.50, G2: 98.00,
    Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
    C3: 130.81,  Db3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81,
    F3: 174.61,  G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
    C4: 261.63,  D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
    G4: 392.00,  Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
    C5: 523.25,  D5: 587.33, E5: 659.25, G5: 783.99,
  };

  // ── Tracks ─────────────────────────────────────────────────────────────────
  // Each step: { b: bassNote|null, m: melNote|null, dur: beats }
  // dur in beats, converted to seconds using bpm.

  const TRACKS = {

    // Title screen — A minor, slow and foreboding
    title: {
      bpm: 48,
      steps: [
        { b: 'A2',  m: 'E4',  dur: 2 },
        { b: null,  m: 'C4',  dur: 1 },
        { b: null,  m: 'D4',  dur: 1 },
        { b: 'G2',  m: 'B3',  dur: 2 },
        { b: null,  m: 'A3',  dur: 2 },
        { b: 'F2',  m: 'C4',  dur: 2 },
        { b: null,  m: 'D4',  dur: 1 },
        { b: null,  m: 'E4',  dur: 1 },
        { b: 'E2',  m: 'B3',  dur: 2 },
        { b: null,  m: 'A3',  dur: 1 },
        { b: null,  m: 'G3',  dur: 1 },
        { b: 'A2',  m: 'A3',  dur: 4 },
      ],
    },

    // Room screen — D minor, tense walking bass
    room: {
      bpm: 76,
      steps: [
        { b: 'D2',  m: 'A3',  dur: 1 },
        { b: 'F2',  m: 'F3',  dur: 1 },
        { b: 'A2',  m: 'D4',  dur: 1 },
        { b: 'C3',  m: 'C4',  dur: 1 },
        { b: 'Bb2', m: 'Bb3', dur: 1 },
        { b: 'A2',  m: 'A3',  dur: 1 },
        { b: 'G2',  m: 'G3',  dur: 1 },
        { b: 'A2',  m: 'F3',  dur: 1 },
        { b: 'D2',  m: 'A3',  dur: 1 },
        { b: 'F2',  m: 'D4',  dur: 1 },
        { b: 'G2',  m: 'C4',  dur: 1 },
        { b: 'A2',  m: 'Bb3', dur: 1 },
        { b: 'Bb2', m: 'G3',  dur: 1 },
        { b: 'A2',  m: 'F3',  dur: 1 },
        { b: 'G2',  m: 'Eb3', dur: 1 },
        { b: 'A2',  m: 'D3',  dur: 1 },
      ],
    },

    // Battle — E Phrygian, fast and driving
    battle: {
      bpm: 128,
      steps: [
        { b: 'E2',  m: 'B3',  dur: 1 },
        { b: 'E2',  m: null,  dur: 1 },
        { b: 'G2',  m: 'A3',  dur: 1 },
        { b: 'E2',  m: null,  dur: 1 },
        { b: 'F2',  m: 'G3',  dur: 1 },
        { b: 'F2',  m: null,  dur: 1 },
        { b: 'E2',  m: 'F3',  dur: 1 },
        { b: 'D2',  m: null,  dur: 1 },
        { b: 'E2',  m: 'E3',  dur: 1 },
        { b: 'E2',  m: null,  dur: 1 },
        { b: 'G2',  m: 'F3',  dur: 1 },
        { b: 'A2',  m: null,  dur: 1 },
        { b: 'Bb2', m: 'G3',  dur: 1 },
        { b: 'A2',  m: null,  dur: 1 },
        { b: 'G2',  m: 'A3',  dur: 1 },
        { b: 'E2',  m: 'B3',  dur: 1 },
      ],
    },

    // Treasure screen — C major, triumphant
    treasure: {
      bpm: 100,
      steps: [
        { b: 'C3',  m: 'E4',  dur: 1 },
        { b: 'G2',  m: 'G4',  dur: 1 },
        { b: 'A2',  m: 'A4',  dur: 1 },
        { b: 'F2',  m: 'F4',  dur: 1 },
        { b: 'G2',  m: 'G4',  dur: 1 },
        { b: 'G2',  m: 'E4',  dur: 1 },
        { b: 'C3',  m: 'C5',  dur: 1 },
        { b: 'C3',  m: 'G4',  dur: 1 },
      ],
    },

    // Win screen — G major, celebratory
    win: {
      bpm: 88,
      steps: [
        { b: 'G2',  m: 'B4',  dur: 1 },
        { b: 'G2',  m: 'D5',  dur: 1 },
        { b: 'C3',  m: 'E5',  dur: 1 },
        { b: 'C3',  m: 'G5',  dur: 1 },
        { b: 'D3',  m: 'D5',  dur: 1 },
        { b: 'D3',  m: 'B4',  dur: 1 },
        { b: 'G2',  m: 'G4',  dur: 2 },
        { b: 'F2',  m: 'A4',  dur: 1 },
        { b: 'G2',  m: 'B4',  dur: 1 },
        { b: 'C3',  m: 'C5',  dur: 2 },
        { b: 'D3',  m: 'B4',  dur: 1 },
        { b: 'G2',  m: 'D5',  dur: 1 },
        { b: 'G2',  m: 'G4',  dur: 4 },
      ],
    },

    // Game over — A minor, descending and mournful
    gameover: {
      bpm: 50,
      steps: [
        { b: 'A2',  m: 'E4',  dur: 2 },
        { b: 'G2',  m: 'D4',  dur: 2 },
        { b: 'F2',  m: 'C4',  dur: 2 },
        { b: 'E2',  m: 'B3',  dur: 2 },
        { b: 'F2',  m: 'Ab3', dur: 2 },
        { b: 'E2',  m: 'G3',  dur: 2 },
        { b: 'A2',  m: 'A3',  dur: 6 },
      ],
    },
  };

  // ── Audio setup ────────────────────────────────────────────────────────────

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.45;

    // Low-pass for warmth
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3600;

    // Simple reverb: two cross-coupled feedback delays
    const d1 = ctx.createDelay(1); d1.delayTime.value = 0.21;
    const d2 = ctx.createDelay(1); d2.delayTime.value = 0.16;
    const fb1 = ctx.createGain(); fb1.gain.value = 0.28;
    const fb2 = ctx.createGain(); fb2.gain.value = 0.22;
    const dry = ctx.createGain(); dry.gain.value = 0.68;
    const wet = ctx.createGain(); wet.gain.value = 0.32;

    masterGain.connect(lp);
    lp.connect(dry);
    lp.connect(d1);
    lp.connect(d2);
    d1.connect(fb1); fb1.connect(d2);
    d2.connect(fb2); fb2.connect(d1);
    d1.connect(wet);
    d2.connect(wet);
    dry.connect(ctx.destination);
    wet.connect(ctx.destination);
  }

  // ── Note synthesis ─────────────────────────────────────────────────────────

  function tone(freq, when, dur, vol, wave) {
    if (!freq || !masterGain) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 5; // tiny organic variance

    const att = Math.min(0.03, dur * 0.08);
    const rel = Math.min(0.10, dur * 0.18);
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(vol, when + att);
    env.gain.setValueAtTime(vol, when + dur - rel);
    env.gain.linearRampToValueAtTime(0, when + dur);

    osc.connect(env);
    env.connect(masterGain);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  // ── Scheduler ──────────────────────────────────────────────────────────────

  const LOOKAHEAD    = 0.12; // seconds ahead to schedule
  const SCHED_TICK   = 30;   // ms between scheduler checks

  function scheduleStep(when) {
    const step = currentSteps[seqIdx % currentSteps.length];
    const dur  = step.dur * currentBeatDur;
    if (step.b) tone(N[step.b], when, dur,        0.26, 'triangle');
    if (step.m) tone(N[step.m], when, dur * 0.80, 0.13, 'square');
    nextNoteTime = when + dur;
    seqIdx = (seqIdx + 1) % currentSteps.length;
  }

  function runScheduler() {
    while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(nextNoteTime);
    }
    schedulerTimer = setTimeout(runScheduler, SCHED_TICK);
  }

  function stopScheduler() {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }

  function startTrack(phase) {
    const track = TRACKS[phase];
    if (!track) return;
    currentPhase  = phase;
    currentSteps  = track.steps;
    currentBeatDur = 60 / track.bpm;
    seqIdx = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    runScheduler();
  }

  // ── SFX ────────────────────────────────────────────────────────────────────

  function sfxTone(freq, when, dur, vol, type = 'triangle') {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const att = Math.min(0.01, dur * 0.05);
    const rel = Math.min(0.08, dur * 0.25);
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(vol, when + att);
    env.gain.setValueAtTime(vol, when + dur - rel);
    env.gain.linearRampToValueAtTime(0, when + dur);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.01);
  }

  function sfxSweep(f0, f1, when, dur, vol, type = 'sine') {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, when);
    osc.frequency.exponentialRampToValueAtTime(f1, when + dur);
    env.gain.setValueAtTime(vol, when);
    env.gain.linearRampToValueAtTime(0, when + dur);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.01);
  }

  const sfx = {
    hit(dmg) {
      if (!ctx) { ensureCtx(); }
      if (!ctx) return;
      const now = ctx.currentTime;
      const freq = Math.max(38, 110 - dmg * 7);
      sfxTone(freq,       now,        0.18, 0.60, 'triangle');
      sfxTone(freq * 3.5, now,        0.04, 0.40, 'square');
      sfxSweep(freq * 6, freq * 1.5, now + 0.01, 0.10, 0.22, 'sawtooth');
    },
    nullified() {
      if (!ctx) { ensureCtx(); }
      if (!ctx) return;
      const now = ctx.currentTime;
      sfxSweep(360, 120, now, 0.22, 0.24, 'sine');
      sfxTone(120, now + 0.14, 0.08, 0.12, 'sine');
    },
    victory() {
      if (!ctx) { ensureCtx(); }
      if (!ctx) return;
      const now = ctx.currentTime;
      [261.63, 329.63, 392.00, 523.25].forEach((f, i) =>
        sfxTone(f, now + i * 0.13, 0.20, 0.32, 'triangle')
      );
    },
    defeat() {
      if (!ctx) { ensureCtx(); }
      if (!ctx) return;
      const now = ctx.currentTime;
      [329.63, 293.66, 261.63, 220.00].forEach((f, i) =>
        sfxTone(f, now + i * 0.18, 0.25, 0.28, 'triangle')
      );
    },
  };

  // ── Public API ─────────────────────────────────────────────────────────────

  function play(phase) {
    if (phase === currentPhase) return;
    if (!TRACKS[phase]) return;

    ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();

    if (muted) {
      currentPhase = phase;
      return;
    }

    stopScheduler();

    // Fade out, switch track, fade back in
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.3);

    setTimeout(() => {
      startTrack(phase);
      const n = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(n);
      masterGain.gain.setValueAtTime(0, n);
      masterGain.gain.linearRampToValueAtTime(0.45, n + 0.4);
    }, 340);
  }

  function toggle() {
    muted = !muted;
    if (!ctx) return !muted;

    const now = ctx.currentTime;
    if (muted) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.3);
      stopScheduler();
    } else {
      if (ctx.state === 'suspended') ctx.resume();
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.45, now + 0.3);
      if (currentPhase) {
        seqIdx = 0;
        nextNoteTime = ctx.currentTime + 0.05;
        runScheduler();
      }
    }
    return !muted;
  }

  return { play, toggle, sfx, get muted() { return muted; } };
})();
