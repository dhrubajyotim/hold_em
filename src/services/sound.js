// Soothing Casino Audio Synthesizer using Web Audio API
// Soft sine-based tones, gentle envelopes, warm low-pass master bus and a subtle room reverb.
// Avoids harsh triangle/square waves and fast downward pitch sweeps (which sound like croaks/chirps).
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null; // dry + wet bus input
    this.reverbSend = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this._buildMasterBus();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // ---------- Master bus: gain -> warm lowpass -> gentle compressor -> out, plus reverb send ----------
  _buildMasterBus() {
    const ctx = this.ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 24;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);

    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 4800;
    warmth.Q.value = 0.5;
    warmth.connect(compressor);

    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(warmth);

    // Soft room reverb from a generated decaying-noise impulse
    const convolver = ctx.createConvolver();
    convolver.buffer = this._makeImpulse(1.8, 3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    convolver.connect(wet);
    wet.connect(warmth);

    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 1;
    this.reverbSend.connect(convolver);
  }

  _makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  _out(node, reverbAmount = 0.5) {
    node.connect(this.master);
    if (reverbAmount > 0) {
      const send = this.ctx.createGain();
      send.gain.value = reverbAmount;
      node.connect(send);
      send.connect(this.reverbSend);
    }
  }

  // ---------- Primitives ----------
  // Soft sine tone with smooth attack and exponential release
  _tone(freq, time, { dur = 0.4, vol = 0.1, attack = 0.012, type = 'sine', reverb = 0.5 } = {}) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(gain);
    this._out(gain, reverb);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  // Filtered noise burst with soft attack (for felt / card textures)
  _noise(time, { dur = 0.1, vol = 0.1, attack = 0.006, filter = 'bandpass', freq = 1200, freqEnd = null, Q = 0.8, reverb = 0.3 } = {}) {
    const size = Math.floor(this.ctx.sampleRate * (dur + 0.02));
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, time);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, time + dur);
    f.Q.value = Q;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(f);
    f.connect(gain);
    this._out(gain, reverb);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  // Gentle, rounded chip "tink" — soft ceramic touch rather than a sharp clack
  _chipTouch(time, variance = 0, vol = 0.1) {
    const base = 1900 + variance * 160;
    this._tone(base, time, { dur: 0.09, vol: vol * 0.55, attack: 0.003, reverb: 0.35 });
    this._tone(base * 1.5, time, { dur: 0.06, vol: vol * 0.25, attack: 0.003, reverb: 0.35 });
    this._noise(time, { dur: 0.03, vol: vol * 0.35, attack: 0.002, filter: 'lowpass', freq: 3200, Q: 0.5, reverb: 0.15 });
  }

  _ready() {
    if (this.muted) return false;
    this.init();
    return !!this.ctx;
  }

  // ---------- Game sounds ----------

  // Call / Bet: two soft chip touches
  playChip() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const rnd = Math.random() - 0.5;
    this._chipTouch(now, rnd, 0.14);
    this._chipTouch(now + 0.045, rnd + 0.25, 0.09);
  }

  // Raise: a short, gentle chip stack ripple
  playRaise() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    [0, 0.05, 0.1, 0.16].forEach((d, i) => {
      this._chipTouch(now + d, (Math.random() - 0.5) * 0.8, 0.13 - i * 0.02);
    });
  }

  // Check: soft, muted double tap on felt (fixed pitch — no croaky sweep)
  playCheck() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const tap = (t, vol) => {
      this._tone(170, t, { dur: 0.09, vol, attack: 0.004, reverb: 0.15 });
      this._noise(t, { dur: 0.05, vol: vol * 0.6, attack: 0.003, filter: 'lowpass', freq: 700, Q: 0.4, reverb: 0.1 });
    };
    tap(now, 0.16);
    tap(now + 0.13, 0.11);
  }

  // Fold: airy, slow card slide
  playFold() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    this._noise(now, { dur: 0.22, vol: 0.09, attack: 0.03, filter: 'bandpass', freq: 1100, freqEnd: 500, Q: 0.7, reverb: 0.3 });
  }

  // Card deal: soft swish
  playCard() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    this._noise(now, { dur: 0.09, vol: 0.08, attack: 0.008, filter: 'bandpass', freq: 3200, freqEnd: 2200, Q: 0.6, reverb: 0.2 });
  }

  // Card reveal: swish + a faint, warm chime
  playCardReveal() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    this._noise(now, { dur: 0.12, vol: 0.08, attack: 0.01, filter: 'bandpass', freq: 2600, freqEnd: 1500, Q: 0.6, reverb: 0.25 });
    this._tone(880, now + 0.03, { dur: 0.5, vol: 0.045, attack: 0.015, reverb: 0.7 });
    this._tone(1318.5, now + 0.03, { dur: 0.4, vol: 0.02, attack: 0.015, reverb: 0.7 });
  }

  // Pot win: chips gathering + a soft, dreamy major-9 arpeggio
  playWinPot() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;

    [0, 0.06, 0.12, 0.19, 0.27].forEach((d) => {
      this._chipTouch(now + d, (Math.random() - 0.5) * 1.0, 0.09);
    });

    // Cmaj9: C5 E5 G5 B5 D6
    [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((freq, i) => {
      const t = now + 0.12 + i * 0.11;
      this._tone(freq, t, { dur: 1.1, vol: 0.07, attack: 0.02, reverb: 0.8 });
    });
  }

  // All-in: chips push + a warm low swell
  playAllIn() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 5; i++) {
      this._chipTouch(now + i * 0.045, (Math.random() - 0.5) * 0.8, 0.11);
    }

    // Warm A2 + E3 swell (slow attack, no pitch drop)
    this._tone(110, now, { dur: 0.9, vol: 0.12, attack: 0.12, reverb: 0.5 });
    this._tone(164.81, now, { dur: 0.9, vol: 0.07, attack: 0.15, reverb: 0.5 });
    this._noise(now, { dur: 0.35, vol: 0.05, attack: 0.08, filter: 'lowpass', freq: 600, Q: 0.4, reverb: 0.3 });
  }

  // Tournament victory: gentle, lush chord progression
  playTournamentWin() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;

    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [261.63, 392.0, 523.25, 659.25, 783.99], // C major (open, final)
    ];

    chords.forEach((chord, ci) => {
      const t = now + ci * 0.45;
      const last = ci === chords.length - 1;
      chord.forEach((freq, ni) => {
        this._tone(freq, t + ni * 0.03, {
          dur: last ? 2.4 : 0.9,
          vol: 0.05,
          attack: 0.06,
          reverb: 0.9,
        });
      });
    });

    // Light shimmer of chip touches
    for (let i = 0; i < 6; i++) {
      this._chipTouch(now + 1.35 + i * 0.09, (Math.random() - 0.5) * 1.2, 0.06);
    }
  }

  playWin() {
    this.playWinPot();
  }
}

export const soundManager = new SoundManager();
