// =====================================================================
//  MOTORE DELLE ANIMAZIONI: tween sincronizzati con i fotogrammi
// =====================================================================

// Chi ha chiesto "meno movimento" nelle impostazioni del sistema vede animazioni più brevi
export const VEL = {
  fattore: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.4 : 1
};

export const ease = {
  lineare: t => t,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastico: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1)
};

const attivi = new Set();
let adesso = performance.now();

// tween(durata, aggiorna(e, p), easing) → Promise che si risolve alla fine
export function tween(durata, aggiorna, easing = ease.out) {
  return new Promise(resolve => {
    attivi.add({ inizio: adesso, durata: Math.max(1, durata * VEL.fattore), aggiorna, easing, resolve });
  });
}

export function tickTween(ora) {
  adesso = ora;
  for (const t of attivi) {
    const p = Math.min(1, Math.max(0, (ora - t.inizio) / t.durata));
    t.aggiorna(t.easing(p), p);
    if (p >= 1) { attivi.delete(t); t.resolve(); }
  }
}

// Chiude subito tutti i tween (nuova partita): le Promise si risolvono, niente resta appeso
export function chiudiTween() {
  for (const t of attivi) { t.aggiorna(t.easing(1), 1); t.resolve(); }
  attivi.clear();
}

export const attendi = ms => new Promise(r => setTimeout(r, ms * VEL.fattore));
export const lerp = (a, b, t) => a + (b - a) * t;
// Fattore di inseguimento indipendente dagli FPS
export const smorza = (dt, k) => 1 - Math.exp(-dt * k);
export const casuale = (a, b) => a + Math.random() * (b - a);
export const scegli = arr => arr[Math.floor(Math.random() * arr.length)];
