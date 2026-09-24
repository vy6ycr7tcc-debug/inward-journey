// Generative water ambience + narration, all unlocked by the first gesture.
export function buildAudio() {
  let ctx = null, master = null, waterGain = null, started = false, muted = false;
  let narrationEl = null;

  function makeWaterBed() {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        // pinkish noise: heavily lowpassed white noise
        const w = Math.random() * 2 - 1;
        last = last * 0.985 + w * 0.015;
        d[i] = last * 3.2;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    // slow swell LFO on the bed
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.35;
    const base = ctx.createGain(); base.gain.value = 0.5;
    lfo.connect(lfoGain); lfoGain.connect(base.gain);
    waterGain = ctx.createGain(); waterGain.gain.value = 0.0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    src.connect(lp); lp.connect(base); base.connect(waterGain); waterGain.connect(master);
    src.start(); lfo.start();
    // fade in over 6s
    waterGain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 6);
  }

  function chime() {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    [523.25, 784.0, 1046.5].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0 + i * 0.22);
      g.gain.linearRampToValueAtTime(0.11, t0 + i * 0.22 + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.22 + 2.6);
      o.connect(g); g.connect(master);
      o.start(t0 + i * 0.22); o.stop(t0 + i * 0.22 + 2.8);
    });
  }

  return {
    start() {
      if (started) return; started = true;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 1;
      master.connect(ctx.destination);
      makeWaterBed();
      // narration drifts in the background, unhurried
      narrationEl = new Audio('../../audio/star-within-narration.m4a');
      narrationEl.volume = 0.85;
      narrationEl.play().catch(() => {
        narrationEl.src = '../../audio/star-within-narration.mp3';
        narrationEl.play().catch(() => {});
      });
      const btn = document.getElementById('sound-toggle');
      btn.classList.remove('hidden');
      btn.addEventListener('click', () => this.toggle());
    },
    toggle() {
      if (!ctx) return;
      muted = !muted;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.linearRampToValueAtTime(muted ? 0 : 1, t + 0.8);
      if (narrationEl) { muted ? narrationEl.pause() : narrationEl.play().catch(() => {}); }
      document.getElementById('sound-toggle').classList.toggle('muted', muted);
    },
    chime,
  };
}
