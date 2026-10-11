// =====================================================================
//  SUONI: tutti sintetizzati al volo con Web Audio (nessun file da scaricare)
// =====================================================================

let ctx = null, uscita = null, bufferRumore = null;
const impostazioni = { muto: false, volume: 0.7 };
try {
  const s = JSON.parse(localStorage.getItem('memestone-audio') || 'null');
  if (s) Object.assign(impostazioni, s);
} catch (e) { /* niente */ }

function salva() {
  try { localStorage.setItem('memestone-audio', JSON.stringify(impostazioni)); } catch (e) { /* niente */ }
}

// I browser permettono l'audio solo dopo un tocco o un clic dell'utente
export function sbloccaAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    uscita = ctx.createGain();
    uscita.gain.value = impostazioni.muto ? 0 : impostazioni.volume;
    uscita.connect(comp);
    comp.connect(ctx.destination);
    bufferRumore = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = bufferRumore.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function audio() { return { ...impostazioni }; }
export function impostaMuto(v) { impostazioni.muto = v; aggiornaVolume(); salva(); }
export function impostaVolume(v) { impostazioni.volume = v; aggiornaVolume(); salva(); }
function aggiornaVolume() {
  if (uscita) uscita.gain.setTargetAtTime(impostazioni.muto ? 0 : impostazioni.volume, ctx.currentTime, 0.02);
}

const pronto = () => ctx && ctx.state === 'running' && !impostazioni.muto;

// ---------- Mattoncini ----------
function tono({ f = 440, f2 = null, tipo = 'sine', dur = 0.2, vol = 0.3, att = 0.005, rit = 0, filtro = null }) {
  const t = ctx.currentTime + rit;
  const o = ctx.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let nodo = o;
  if (filtro) {
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = filtro;
    o.connect(fl);
    nodo = fl;
  }
  nodo.connect(g);
  g.connect(uscita);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function soffio({ dur = 0.3, da = 800, a = 3000, q = 1, vol = 0.3, att = 0.01, rit = 0, tipo = 'bandpass' }) {
  const t = ctx.currentTime + rit;
  const s = ctx.createBufferSource();
  s.buffer = bufferRumore;
  s.loop = true;
  const fl = ctx.createBiquadFilter();
  fl.type = tipo;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(da, t);
  fl.frequency.exponentialRampToValueAtTime(Math.max(30, a), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl);
  fl.connect(g);
  g.connect(uscita);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

// Evita che dieci colpi insieme (danni ad area) facciano un muro di rumore
const ultimi = new Map();
function limita(nome, ms = 45) {
  const ora = performance.now();
  if (ora - (ultimi.get(nome) || 0) < ms) return false;
  ultimi.set(nome, ora);
  return true;
}

const nota = n => 440 * Math.pow(2, (n - 69) / 12);

// ---------- Suoni del gioco ----------
const EFFETTI = {
  pesca() {
    soffio({ dur: 0.22, da: 600, a: 4000, q: 0.8, vol: 0.18 });
    tono({ f: 1200, f2: 1800, tipo: 'sine', dur: 0.08, vol: 0.05, rit: 0.12 });
  },
  hover() {
    tono({ f: 1800, tipo: 'sine', dur: 0.04, vol: 0.025 });
  },
  gioca() {
    soffio({ dur: 0.28, da: 2500, a: 500, q: 0.7, vol: 0.2 });
  },
  atterraggio(pesante = false) {
    tono({ f: pesante ? 120 : 160, f2: 40, tipo: 'sine', dur: pesante ? 0.45 : 0.3, vol: pesante ? 0.75 : 0.5 });
    soffio({ dur: 0.25, da: 900, a: 200, q: 0.6, vol: pesante ? 0.35 : 0.22, tipo: 'lowpass' });
    tono({ f: 520, f2: 760, tipo: 'triangle', dur: 0.12, vol: 0.08, rit: 0.05 });
  },
  attacco() {
    soffio({ dur: 0.22, da: 400, a: 2200, q: 1.2, vol: 0.22 });
  },
  impatto(forza = 1) {
    tono({ f: 140, f2: 45, tipo: 'sine', dur: 0.28, vol: 0.5 + forza * 0.15 });
    soffio({ dur: 0.18, da: 3000, a: 300, q: 0.5, vol: 0.3 + forza * 0.1, tipo: 'lowpass' });
    tono({ f: 220, f2: 90, tipo: 'square', dur: 0.08, vol: 0.06, filtro: 1200 });
  },
  danno() {
    tono({ f: 300, f2: 120, tipo: 'triangle', dur: 0.14, vol: 0.18 });
    soffio({ dur: 0.1, da: 2000, a: 600, q: 0.8, vol: 0.12 });
  },
  cura() {
    [76, 80, 83, 88].forEach((n, i) => tono({ f: nota(n), tipo: 'sine', dur: 0.35, vol: 0.09, rit: i * 0.06 }));
  },
  scudo() {
    soffio({ dur: 0.4, da: 6000, a: 2500, q: 2, vol: 0.2 });
    tono({ f: 2600, f2: 1800, tipo: 'sine', dur: 0.3, vol: 0.08 });
    tono({ f: 3300, tipo: 'sine', dur: 0.25, vol: 0.05, rit: 0.04 });
  },
  ghiaccio() {
    [96, 91, 100, 95].forEach((n, i) => tono({ f: nota(n), tipo: 'sine', dur: 0.25, vol: 0.05, rit: i * 0.04 }));
    soffio({ dur: 0.5, da: 7000, a: 4000, q: 3, vol: 0.1 });
  },
  silenzio() {
    soffio({ dur: 0.5, da: 3000, a: 600, q: 0.6, vol: 0.12, tipo: 'lowpass' });
  },
  potenzia() {
    [72, 76, 79, 84].forEach((n, i) => tono({ f: nota(n), tipo: 'triangle', dur: 0.2, vol: 0.08, rit: i * 0.05 }));
  },
  proiettile() {
    soffio({ dur: 0.45, da: 300, a: 2500, q: 2, vol: 0.18 });
    tono({ f: 400, f2: 1100, tipo: 'sawtooth', dur: 0.35, vol: 0.04, filtro: 1800 });
  },
  ondata() {
    soffio({ dur: 0.8, da: 200, a: 1500, q: 0.7, vol: 0.35 });
    tono({ f: 90, f2: 40, tipo: 'sine', dur: 0.6, vol: 0.5 });
  },
  // "Fumato": scricchiolio e una pernacchia che scende
  morte() {
    soffio({ dur: 0.35, da: 4000, a: 300, q: 0.6, vol: 0.32, tipo: 'lowpass' });
    tono({ f: 300, f2: 70, tipo: 'sawtooth', dur: 0.55, vol: 0.12, filtro: 900 });
    tono({ f: 180, f2: 50, tipo: 'sine', dur: 0.4, vol: 0.35 });
  },
  // Sbarre della galera che sbattono
  galera() {
    tono({ f: 520, f2: 480, tipo: 'square', dur: 0.25, vol: 0.07, filtro: 2400 });
    tono({ f: 780, f2: 700, tipo: 'square', dur: 0.2, vol: 0.05, filtro: 3000, rit: 0.02 });
    soffio({ dur: 0.18, da: 5000, a: 1500, q: 2, vol: 0.18 });
    tono({ f: 90, f2: 50, tipo: 'sine', dur: 0.3, vol: 0.4, rit: 0.02 });
  },
  comeback() {
    [[60, 0], [67, 0.08], [72, 0.16], [79, 0.24]].forEach(([n, r]) => tono({ f: nota(n), tipo: 'sawtooth', dur: 0.3, vol: 0.07, rit: r, filtro: 2500 }));
    tono({ f: 140, f2: 45, tipo: 'sine', dur: 0.4, vol: 0.6, rit: 0.3 });
    soffio({ dur: 0.3, da: 3000, a: 300, q: 0.5, vol: 0.3, tipo: 'lowpass', rit: 0.3 });
  },
  fusione() {
    soffio({ dur: 0.7, da: 200, a: 4000, q: 1.5, vol: 0.25 });
    [64, 68, 71, 76].forEach((n, i) => tono({ f: nota(n), tipo: 'triangle', dur: 0.8, vol: 0.07, rit: 0.45 + i * 0.03 }));
  },
  simbolo() {
    [[48, 0], [55, 0], [60, 0.05], [64, 0.1], [67, 0.15], [72, 0.2]].forEach(([n, r]) =>
      tono({ f: nota(n), tipo: 'sawtooth', dur: 1.6, vol: 0.06, rit: r, filtro: 1800 }));
    tono({ f: 70, f2: 35, tipo: 'sine', dur: 1.2, vol: 0.6 });
    soffio({ dur: 1.2, da: 300, a: 6000, q: 0.8, vol: 0.15 });
  },
  esplosione() {
    tono({ f: 90, f2: 25, tipo: 'sine', dur: 1.2, vol: 0.9 });
    soffio({ dur: 1.3, da: 2500, a: 80, q: 0.4, vol: 0.6, tipo: 'lowpass' });
  },
  potere() {
    [84, 88, 91].forEach((n, i) => tono({ f: nota(n), tipo: 'sine', dur: 0.25, vol: 0.08, rit: i * 0.05 }));
    soffio({ dur: 0.3, da: 1500, a: 5000, q: 1.5, vol: 0.08 });
  },
  trappola() {
    tono({ f: nota(74), tipo: 'square', dur: 0.12, vol: 0.08, filtro: 2500 });
    tono({ f: nota(80), tipo: 'square', dur: 0.12, vol: 0.08, filtro: 2500, rit: 0.13 });
    tono({ f: nota(86), tipo: 'square', dur: 0.3, vol: 0.09, filtro: 2500, rit: 0.26 });
    soffio({ dur: 0.4, da: 500, a: 3000, q: 1, vol: 0.15, rit: 0.2 });
  },
  turno() {
    // Piccola fanfara
    [[67, 0], [72, 0.1], [76, 0.2], [79, 0.3]].forEach(([n, r]) => tono({ f: nota(n), tipo: 'triangle', dur: 0.45, vol: 0.1, rit: r }));
    tono({ f: nota(84), tipo: 'sine', dur: 0.7, vol: 0.06, rit: 0.4 });
  },
  turnoNemico() {
    tono({ f: nota(60), tipo: 'triangle', dur: 0.3, vol: 0.07 });
    tono({ f: nota(55), tipo: 'triangle', dur: 0.4, vol: 0.07, rit: 0.15 });
  },
  bottone() {
    tono({ f: 220, f2: 140, tipo: 'square', dur: 0.08, vol: 0.08, filtro: 1500 });
    soffio({ dur: 0.06, da: 3000, a: 1000, q: 1, vol: 0.1 });
  },
  errore() {
    tono({ f: 160, tipo: 'square', dur: 0.12, vol: 0.06, filtro: 800 });
  },
  vittoria() {
    [[60, 0], [64, 0.12], [67, 0.24], [72, 0.36], [76, 0.5], [79, 0.62]].forEach(([n, r]) =>
      tono({ f: nota(n), tipo: 'triangle', dur: 0.5, vol: 0.12, rit: r }));
    [72, 76, 79, 84].forEach(n => tono({ f: nota(n), tipo: 'sine', dur: 1.4, vol: 0.06, rit: 0.78 }));
  },
  // La classica "trombetta triste"
  sconfitta() {
    [[67, 0, 0.35], [66, 0.4, 0.35], [65, 0.8, 0.35], [64, 1.2, 1.1]].forEach(([n, r, d]) =>
      tono({ f: nota(n - 12), f2: r > 1 ? nota(n - 13) : null, tipo: 'sawtooth', dur: d, vol: 0.12, rit: r, filtro: 1100 }));
  }
};

export function suona(nome, ...arg) {
  if (!pronto() || !EFFETTI[nome]) return;
  if (!limita(nome)) return;
  try { EFFETTI[nome](...arg); } catch (e) { /* l'audio non deve mai bloccare il gioco */ }
}
