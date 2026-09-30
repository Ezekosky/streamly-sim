/* =========================================================================
   STREAMLY SIM — BACKGROUND MUSIC
   A small generative lo-fi loop, synthesized live with Web Audio: soft
   electric-piano chords, a round bass, a dusty kick/snare/hat kit, a
   wandering pentatonic melody and a little vinyl crackle. Nothing to
   download, never exactly the same twice, and it can't fail to load.

   Music.attach(ctx)   give it the shared AudioContext (after a user gesture)
   Music.start() / Music.stop() / Music.setMood('calm'|'hype')
   Music.duck(on)      drop the volume (used while an ad is playing)
   ========================================================================= */
(function(){
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  // Two progressions. 'calm' is the default bedroom-studio loop; 'hype' is
  // brighter and plays for a while after something goes viral.
  const PROGRESSIONS = {
    calm: [
      { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
      { root: 40, notes: [52, 55, 59, 62] }, // Em7
      { root: 38, notes: [50, 53, 57, 60] }, // Dm7
      { root: 36, notes: [48, 52, 55, 59] }, // Cmaj7
    ],
    hype: [
      { root: 45, notes: [57, 60, 64, 67] }, // Am7
      { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
      { root: 43, notes: [55, 59, 62, 65] }, // G7
      { root: 36, notes: [52, 55, 60, 64] }, // C/E
    ],
  };
  const PENTA = [72, 74, 76, 79, 81, 84, 86];

  const Music = {
    ctx: null, out: null, filter: null, noiseBuf: null,
    playing: false, timer: null, step: 0, nextTime: 0,
    bpm: 76, mood: 'calm', level: 0.16, ducked: false, lastNote: 76,

    attach(ctx){
      if (this.ctx || !ctx) return;
      this.ctx = ctx;
      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 2400;
      this.filter.Q.value = 0.4;
      this.out = ctx.createGain();
      this.out.gain.value = 0;
      this.filter.connect(this.out).connect(ctx.destination);
      // one second of white noise, reused for drums and crackle
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    },

    start(){
      if (!this.ctx || this.playing) return;
      this.playing = true;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.fadeTo(this.ducked ? this.level * 0.15 : this.level, 1.5);
      this.timer = setInterval(() => this.schedule(), 30);
    },
    stop(){
      if (!this.playing) return;
      this.playing = false;
      clearInterval(this.timer);
      this.fadeTo(0, 0.4);
    },
    fadeTo(v, sec){
      if (!this.out) return;
      const t = this.ctx.currentTime;
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(this.out.gain.value, t);
      this.out.gain.linearRampToValueAtTime(v, t + sec);
    },
    duck(on){
      this.ducked = !!on;
      if (this.playing) this.fadeTo(on ? this.level * 0.15 : this.level, 0.5);
    },
    setMood(m){
      if (!PROGRESSIONS[m] || m === this.mood) return;
      this.mood = m;
      this.bpm = m === 'hype' ? 92 : 76;
      if (this.filter) this.filter.frequency.setTargetAtTime(m === 'hype' ? 4200 : 2400, this.ctx.currentTime, 1.5);
    },

    schedule(){
      if (!this.playing || this.ctx.state !== 'running') return;
      const stepDur = 60 / this.bpm / 2; // eighth notes
      while (this.nextTime < this.ctx.currentTime + 0.15){
        const swing = (this.step % 2) ? stepDur * 0.16 : 0;
        this.playStep(this.step, this.nextTime + swing, stepDur);
        this.nextTime += stepDur;
        this.step = (this.step + 1) % 64; // 4 chords x 2 bars x 8 eighths
      }
    },

    playStep(step, t, stepDur){
      const prog = PROGRESSIONS[this.mood];
      const chord = prog[Math.floor(step / 16) % prog.length];
      const inBar = step % 8;
      const hype = this.mood === 'hype';

      if (step % 16 === 0) this.chord(chord.notes, t, stepDur * 16);
      if (step % 16 === 10) this.chord(chord.notes.slice(1), t, stepDur * 5, 0.5);

      if (inBar === 0 || inBar === 5 || (hype && inBar === 3)) this.bass(chord.root, t, stepDur * 2.5);

      if (inBar === 0 || inBar === 3 || (hype && inBar === 6)) this.kick(t);
      if (inBar === 2 || inBar === 6) this.snare(t);
      if (step % 2 === 1 || hype) this.hat(t, step % 2 ? 0.05 : 0.025);

      const chance = hype ? 0.42 : 0.26;
      if (step % 2 === 0 && Math.random() < chance) this.melody(t, stepDur * (Math.random() < 0.3 ? 3 : 1.6));
      if (Math.random() < 0.18) this.crackle(t + Math.random() * stepDur);
    },

    voice(freq, t, dur, type, vol, attack){
      const c = this.ctx;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + (attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g).connect(this.filter);
      o.start(t); o.stop(t + dur + 0.05);
      return o;
    },
    chord(notes, t, dur, scale){
      const v = 0.05 * (scale || 1);
      notes.forEach((n, i) => {
        const o = this.voice(midi(n), t + i * 0.012, dur, 'triangle', v, 0.04);
        o.detune.value = (Math.random() - 0.5) * 12; // a touch of tape wobble
        this.voice(midi(n + 12), t + i * 0.012, dur * 0.35, 'sine', v * 0.35, 0.005); // e-piano "tine"
      });
    },
    bass(root, t, dur){ this.voice(midi(root), t, dur, 'sine', 0.22, 0.01); },
    melody(t, dur){
      let idx = PENTA.indexOf(this.lastNote);
      if (idx < 0) idx = 2;
      idx = Math.max(0, Math.min(PENTA.length - 1, idx + Math.round((Math.random() - 0.5) * 3)));
      this.lastNote = PENTA[idx];
      this.voice(midi(this.lastNote), t, dur, 'sine', 0.06, 0.008);
    },
    kick(t){
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.connect(g).connect(this.filter);
      o.start(t); o.stop(t + 0.3);
    },
    noise(t, dur, vol, type, freq){
      const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noiseBuf;
      f.type = type; f.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(this.filter);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    },
    snare(t){ this.noise(t, 0.16, 0.13, 'bandpass', 1800); },
    hat(t, vol){ this.noise(t, 0.035, vol, 'highpass', 7000); },
    crackle(t){ this.noise(t, 0.012, 0.03 + Math.random() * 0.04, 'highpass', 3000); },
  };

  window.Music = Music;
})();
