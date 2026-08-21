// Процедурные звуки через WebAudio (без аудиофайлов).
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._noiseCache = new Map();
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _noise(dur) {
    // Кэшируем шумовые буферы — не аллоцируем новый буфер на каждый выстрел.
    const key = Math.round(dur * 1000);
    if (this._noiseCache.has(key)) return this._noiseCache.get(key);
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noiseCache.set(key, buf);
    return buf;
  }

  _env(g, t, attack, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  shot(type) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dur = type === 'rifle' ? 0.24 : type === 'deagle' ? 0.34 : 0.17;
    const cut = type === 'rifle' ? 2200 : type === 'deagle' ? 900 : 1500;
    const thump = type === 'rifle' ? 130 : type === 'deagle' ? 90 : 170;

    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(dur);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.value = cut;
    const g = this.ctx.createGain();
    this._env(g, t, 0.004, 1.0, dur);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(thump, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + dur);
    const og = this.ctx.createGain();
    this._env(og, t, 0.004, 0.9, dur);
    osc.connect(og); og.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  _click(t, freq, dur, gain) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(dur);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 1.5;
    const g = this.ctx.createGain();
    this._env(g, t, 0.002, gain, dur);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  reload() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._click(t, 1400, 0.05, 0.5);
    this._click(t + 0.18, 900, 0.05, 0.5);
  }

  dry() {
    if (!this.ctx) return;
    this._click(this.ctx.currentTime, 2200, 0.04, 0.35);
  }

  switchSound() {
    if (!this.ctx) return;
    this._click(this.ctx.currentTime, 1200, 0.04, 0.3);
  }

  swing() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dur = 0.22;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(dur);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + dur);
    bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    this._env(g, t, 0.03, 0.7, dur);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  impact() {
    if (!this.ctx) return;
    this._click(this.ctx.currentTime, 600, 0.06, 0.5);
  }
}
