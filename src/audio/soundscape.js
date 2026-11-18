export class SenbonAudio {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.master = null;
    this.buffers = new Array(8).fill(null);
    this.loading = new Array(8).fill(false);
    this.currentSource = null;
    this.currentGain = null;
    this.activeCueToken = 0;
  }

  toggle() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);

      // Subtle low wind bed underneath the anime voice clips
      const bufSize = this.ctx.sampleRate * 3;
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 2.2;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 260;
      bandpass.Q.value = 1.4;

      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.08;
      noise.connect(bandpass);
      bandpass.connect(windGain);
      windGain.connect(this.master);
      noise.start();

      // Preload all 8 extracted Bankai clips silently in background
      for (let i = 0; i < 8; i++) this.preloadClip(i);
    }

    if (this.ctx.state === "suspended") this.ctx.resume();
    this.enabled = !this.enabled;
    this.master.gain.setTargetAtTime(
      this.enabled ? 0.85 : 0,
      this.ctx.currentTime,
      0.08,
    );

    if (!this.enabled) {
      this.stopCurrentVoice();
    }
    return this.enabled;
  }

  async preloadClip(idx) {
    if (!this.ctx || this.buffers[idx] || this.loading[idx]) return null;
    this.loading[idx] = true;
    try {
      const res = await fetch(`/audio/act${idx}.mp3`);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arr);
      this.buffers[idx] = decoded;
      return decoded;
    } catch {
      return null;
    } finally {
      this.loading[idx] = false;
    }
  }

  stopCurrentVoice() {
    if (!this.ctx || !this.currentSource || !this.currentGain) return;
    const now = this.ctx.currentTime;
    const prevSrc = this.currentSource;
    const prevGain = this.currentGain;
    prevGain.gain.cancelScheduledValues(now);
    prevGain.gain.setTargetAtTime(0.0001, now, 0.06);
    setTimeout(() => {
      try {
        prevSrc.stop();
      } catch {}
    }, 220);
    this.currentSource = null;
    this.currentGain = null;
  }

  async playActCue(actIdx) {
    if (!this.enabled || !this.ctx) return;
    const token = ++this.activeCueToken;
    this.stopCurrentVoice();

    let buffer = this.buffers[actIdx];
    if (!buffer) {
      buffer = await this.preloadClip(actIdx);
    }

    // Abort if user muted or already scrolled into a newer act while fetching
    if (!this.enabled || token !== this.activeCueToken) return;

    if (buffer) {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(1.0, now + 0.08);

      src.connect(gain);
      gain.connect(this.master);
      src.start(now);

      this.currentSource = src;
      this.currentGain = gain;
      src.onended = () => {
        if (this.currentSource === src) {
          this.currentSource = null;
          this.currentGain = null;
        }
      };
      return;
    }

    // Fallback harmonic chime if /audio/act*.mp3 hasn't been extracted yet
    this.playFallbackChime(actIdx);
  }

  playFallbackChime(actIdx) {
    const now = this.ctx.currentTime;
    const freqs = [440, 523.25, 587.33, 659.25, 783.99, 1046.5, 880, 1174.66];
    const f = freqs[actIdx] || 659.25;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.0);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 1.1);
  }
}
