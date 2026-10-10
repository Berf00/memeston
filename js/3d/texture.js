// =====================================================================
//  TEXTURE: disegna carte, ritratti, numeri e scritte su canvas
// =====================================================================
import * as THREE from 'three';

export const FONT_TITOLI = '"Lilita One", "Arial Black", Impact, sans-serif';
export const FONT_TESTO = '"Nunito", "Segoe UI", Arial, sans-serif';
export const FONT_EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

// k = risoluzione delle texture (1 = piena, più basso sui telefoni)
export const TEX = { k: 1, anisotropia: 8 };

export async function caricaFont() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('64px "Lilita One"'),
        document.fonts.load('800 30px "Nunito"'),
        document.fonts.load('600 30px "Nunito"')
      ]),
      new Promise(r => setTimeout(r, 3000))
    ]);
  } catch (e) { /* si usano i font di riserva */ }
}

function tela(w, h, k = TEX.k) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const x = c.getContext('2d');
  x.scale(k, k);
  return [c, x];
}

function texDa(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = TEX.anisotropia;
  return t;
}

function rr(x, l, t, w, h, r) {
  x.beginPath();
  x.moveTo(l + r, t);
  x.arcTo(l + w, t, l + w, t + h, r);
  x.arcTo(l + w, t + h, l, t + h, r);
  x.arcTo(l, t + h, l, t, r);
  x.arcTo(l, t, l + w, t, r);
  x.closePath();
}

function testoContorno(x, testo, cx, cy, size, { fill = '#fff', stroke = '#1a0f24', font = FONT_TITOLI, peso = '', spessore = 0.18 } = {}) {
  x.font = `${peso} ${size}px ${font}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  x.lineWidth = size * spessore;
  x.strokeStyle = stroke;
  x.strokeText(testo, cx, cy);
  x.fillStyle = fill;
  x.fillText(testo, cx, cy);
}

function emoji(x, e, cx, cy, size) {
  x.font = `${size}px ${FONT_EMOJI}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = '#000';
  x.fillText(e, cx, cy + size * 0.04);
}

// ---------- Immagini (foto degli amici) ----------
const immagini = new Map();
function caricaImmagine(src, quandoPronta) {
  let rec = immagini.get(src);
  if (!rec) {
    rec = { img: new Image(), pronta: false, attese: [] };
    rec.img.onload = () => { rec.pronta = true; rec.attese.forEach(f => f()); rec.attese = []; };
    rec.img.src = src;
    immagini.set(src, rec);
  }
  if (rec.pronta) return rec.img;
  if (quandoPronta) rec.attese.push(quandoPronta);
  return null;
}

// ---------- Colori per tipo ----------
const COLORI = {
  servitore: ['#f3cd74', '#a06d22', '#4c300a'],
  magia: ['#86b6ff', '#2f5bb5', '#132559'],
  trappola: ['#ff8cbe', '#b43471', '#561030']
};
const ETICHETTE = { servitore: 'PERSONAGGIO', magia: 'EVENTO', trappola: 'TRAPPOLA' };

function sfumaturaOro(x, y0, y1) {
  const g = x.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff1b8');
  g.addColorStop(0.35, '#e6b54a');
  g.addColorStop(0.7, '#a8701c');
  g.addColorStop(1, '#f5d27a');
  return g;
}

function disegnaArte(x, c, l, t, w, h, ridisegna, scalaEmoji = 0.6) {
  const [chiaro, medio] = COLORI[c.tipo] || COLORI.servitore;
  const g = x.createRadialGradient(l + w / 2, t + h * 0.38, w * 0.05, l + w / 2, t + h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, '#fff7e0');
  g.addColorStop(0.5, chiaro);
  g.addColorStop(1, medio);
  x.fillStyle = g;
  x.fillRect(l, t, w, h);
  const img = c.immagine ? caricaImmagine(c.immagine, ridisegna) : null;
  if (img) {
    const s = Math.max(w / img.width, h / img.height);
    const iw = img.width * s, ih = img.height * s;
    x.drawImage(img, l + (w - iw) / 2, t + (h - ih) / 2, iw, ih);
  } else {
    // Ombra morbida sotto l'emoji per dare profondità
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.35)';
    x.shadowBlur = 24;
    x.shadowOffsetY = 10;
    emoji(x, c.emoji || '❓', l + w / 2, t + h * 0.52, Math.min(w, h) * scalaEmoji);
    x.restore();
  }
}

function vignetta(x, cx, cy, r0, r1, forza = 0.5) {
  const v = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${forza})`);
  x.fillStyle = v;
  x.fill();
}

// ---------- Testo delle carte ----------
export function paragrafiCarta(c) {
  if (c.testo) return [[{ t: c.testo, b: false }]];
  const P = [];
  const ab = (c.abilita || []).map(a => ABILITA[a]?.nome || a);
  if (ab.length) P.push([{ t: ab.join(', '), b: true }]);
  if (c.dannoMagico) P.push([{ t: `Danni Magici +${c.dannoMagico}`, b: true }]);
  if (c.grido) P.push([{ t: 'Grido di Battaglia: ', b: true }, { t: descrivi(c.grido), b: false }]);
  if (c.rantolo) P.push([{ t: 'Rantolo di Morte: ', b: true }, { t: descrivi(c.rantolo), b: false }]);
  if (c.fineTurno) P.push([{ t: 'Alla fine del tuo turno: ', b: true }, { t: descrivi(c.fineTurno), b: false }]);
  if (c.tipo === 'trappola') {
    P.push([{ t: 'Trappola: ', b: true }, { t: `${ATTIVAZIONI[c.attivazione] || ''} ${descrivi(c.effetto)}`, b: false }]);
  } else if (c.effetto) {
    P.push([{ t: descrivi(c.effetto), b: false }]);
  }
  return P;
}

function avvolgi(x, paragrafi, maxW, size) {
  const righe = [];
  for (const par of paragrafi) {
    let riga = [], larg = 0;
    const chiudi = () => {
      while (riga.length && riga[riga.length - 1].t === ' ') larg -= riga.pop().w;
      if (riga.length) righe.push({ pezzi: riga, larg });
      riga = []; larg = 0;
    };
    for (const run of par) {
      x.font = `${run.b ? 800 : 600} ${size}px ${FONT_TESTO}`;
      for (const p of run.t.split(/(\s+)/).filter(s => s.length)) {
        const spazio = /^\s+$/.test(p);
        const w = x.measureText(spazio ? ' ' : p).width;
        if (spazio) { if (riga.length) { riga.push({ t: ' ', b: run.b, w }); larg += w; } continue; }
        if (larg + w > maxW && riga.length) chiudi();
        riga.push({ t: p, b: run.b, w });
        larg += w;
      }
    }
    chiudi();
  }
  return righe;
}

function scriviTesto(x, paragrafi, cx, top, maxW, maxH) {
  let size = 30, righe = [];
  for (; size >= 15; size--) {
    righe = avvolgi(x, paragrafi, maxW, size);
    if (righe.length * size * 1.18 <= maxH) break;
  }
  const lh = size * 1.18;
  let y = top + (maxH - righe.length * lh) / 2 + lh / 2;
  x.textBaseline = 'middle';
  x.textAlign = 'left';
  x.fillStyle = '#2b1d10';
  for (const r of righe) {
    let px = cx - r.larg / 2;
    for (const p of r.pezzi) {
      x.font = `${p.b ? 800 : 600} ${size}px ${FONT_TESTO}`;
      x.fillText(p.t, px, y);
      px += p.w;
    }
    y += lh;
  }
}

// ---------- Pezzi grafici ----------
function formaRitratto(x, tipo) {
  x.beginPath();
  if (tipo === 'magia') {
    rr(x, 78, 52, 356, 380, 38);
  } else if (tipo === 'trappola') {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i;
      x.lineTo(256 + 208 * Math.cos(a), 245 + 192 * Math.sin(a));
    }
    x.closePath();
  } else {
    x.ellipse(256, 245, 172, 205, 0, 0, Math.PI * 2);
  }
}

function nastro(x, cx, cy, w, h) {
  const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2;
  // Code del nastro dietro
  x.fillStyle = '#1b0e33';
  for (const s of [-1, 1]) {
    const e = s < 0 ? l : r;
    x.beginPath();
    x.moveTo(e - s * 6, t + 14);
    x.lineTo(e + s * 38, t + 14);
    x.lineTo(e + s * 38, b + 12);
    x.lineTo(e - s * 6, b + 12);
    x.lineTo(e + s * 12, cy + 13);
    x.closePath();
    x.fill();
  }
  x.beginPath();
  x.moveTo(l + 24, t);
  x.quadraticCurveTo(cx, t - 16, r - 24, t);
  x.lineTo(r, cy);
  x.lineTo(r - 24, b);
  x.quadraticCurveTo(cx, b - 16, l + 24, b);
  x.lineTo(l, cy);
  x.closePath();
  const g = x.createLinearGradient(0, t, 0, b);
  g.addColorStop(0, '#6a46ad');
  g.addColorStop(0.5, '#3d2373');
  g.addColorStop(1, '#22113f');
  x.fillStyle = g;
  x.fill();
  x.lineWidth = 5;
  x.strokeStyle = sfumaturaOro(x, t, b);
  x.stroke();
}

function gemma(x, cx, cy, r) {
  x.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i - Math.PI / 2;
    x.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  x.closePath();
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
  g.addColorStop(0, '#d6eeff');
  g.addColorStop(0.4, '#3f93f5');
  g.addColorStop(1, '#0f3584');
  x.fillStyle = g;
  x.fill();
  x.lineWidth = 7;
  x.strokeStyle = sfumaturaOro(x, cy - r, cy + r);
  x.stroke();
}

function cerchioAttacco(x, cx, cy, r) {
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#fff0a8');
  g.addColorStop(0.45, '#eba524');
  g.addColorStop(1, '#7a4506');
  x.fillStyle = g;
  x.fill();
  x.lineWidth = 6;
  x.strokeStyle = '#2e1a04';
  x.stroke();
}

function goccia(x, cx, cy, r) {
  const yc = cy + r * 0.15;
  x.beginPath();
  x.moveTo(cx, cy - r * 1.3);
  x.lineTo(cx + r * 0.707, yc - r * 0.707);
  x.arc(cx, yc, r, -Math.PI / 4, Math.PI * 5 / 4, false);
  x.closePath();
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, yc, r * 1.1);
  g.addColorStop(0, '#ffb3a6');
  g.addColorStop(0.45, '#de3a2e');
  g.addColorStop(1, '#6e0c0c');
  x.fillStyle = g;
  x.fill();
  x.lineWidth = 6;
  x.strokeStyle = '#2e0606';
  x.stroke();
}

// ---------- Fronte della carta ----------
function disegnaFronte(x, c, ridisegna) {
  const W = 512, H = 716;
  const [chiaro, medio, scuro] = COLORI[c.tipo] || COLORI.servitore;
  x.clearRect(0, 0, W, H);

  // Cornice con riflesso diagonale
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, chiaro);
  g.addColorStop(0.45, medio);
  g.addColorStop(1, scuro);
  rr(x, 0, 0, W, H, 44);
  x.fillStyle = g;
  x.fill();
  x.save();
  rr(x, 0, 0, W, H, 44);
  x.clip();
  x.globalAlpha = 0.07;
  x.strokeStyle = '#fff';
  x.lineWidth = 2;
  for (let i = -H; i < W; i += 20) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke(); }
  x.restore();
  rr(x, 12, 12, W - 24, H - 24, 34);
  x.lineWidth = 5;
  x.strokeStyle = 'rgba(255,236,190,0.6)';
  x.stroke();

  // Ritratto
  x.save();
  formaRitratto(x, c.tipo);
  x.clip();
  disegnaArte(x, c, 50, 36, 412, 430, ridisegna);
  formaRitratto(x, c.tipo);
  vignetta(x, 256, 245, 120, 270, 0.4);
  x.restore();
  formaRitratto(x, c.tipo);
  x.lineWidth = 15;
  x.strokeStyle = sfumaturaOro(x, 40, 460);
  x.stroke();
  x.lineWidth = 3;
  x.strokeStyle = 'rgba(50,25,0,0.85)';
  x.stroke();

  // Nome sul nastro
  nastro(x, 256, 464, 472, 78);
  let s = 46;
  x.font = `${s}px ${FONT_TITOLI}`;
  while (x.measureText(c.nome).width > 380 && s > 20) { s -= 2; x.font = `${s}px ${FONT_TITOLI}`; }
  testoContorno(x, c.nome, 256, 466, s);

  // Riquadro del testo
  let yBox = 516;
  if (c.sottotitolo) {
    testoContorno(x, c.sottotitolo, 256, 518, 24, { font: FONT_TESTO, peso: 800, fill: '#fff3d0', stroke: 'rgba(0,0,0,0.75)' });
    yBox = 538;
  }
  const bh = 662 - yBox;
  rr(x, 46, yBox, 420, bh, 24);
  const pg = x.createLinearGradient(0, yBox, 0, yBox + bh);
  pg.addColorStop(0, '#f4e8c9');
  pg.addColorStop(1, '#d9c597');
  x.fillStyle = pg;
  x.fill();
  x.lineWidth = 4;
  x.strokeStyle = 'rgba(80,50,10,0.55)';
  x.stroke();
  scriviTesto(x, paragrafiCarta(c), 256, yBox + 8, 372, bh - 16);

  // Etichetta del tipo
  x.font = `800 17px ${FONT_TESTO}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = 'rgba(255,240,210,0.9)';
  x.fillText(ETICHETTE[c.tipo] || '', 256, 690);

  // Costo, attacco e vita
  gemma(x, 68, 72, 56);
  testoContorno(x, String(c.costo), 68, 76, 68);
  if (c.tipo === 'servitore') {
    cerchioAttacco(x, 74, 644, 50);
    testoContorno(x, String(c.attacco), 74, 648, 64);
    goccia(x, 438, 646, 44);
    testoContorno(x, String(c.vita), 438, 656, 62);
  }
  if (c.esempio) {
    rr(x, 372, 28, 112, 30, 10);
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fill();
    x.font = `800 16px ${FONT_TESTO}`;
    x.fillStyle = '#fff';
    x.fillText('ESEMPIO', 428, 44);
  }
}

const cacheFronte = new Map();
export function texFronte(c) {
  const chiave = c.id || c.nome;
  if (cacheFronte.has(chiave)) return cacheFronte.get(chiave);
  const [cv, x] = tela(512, 716);
  const tex = texDa(cv);
  const disegna = () => { disegnaFronte(x, c, disegna); tex.needsUpdate = true; };
  disegna();
  cacheFronte.set(chiave, tex);
  return tex;
}

// ---------- Retro della carta ----------
let cacheRetro = null;
export function texRetro() {
  if (cacheRetro) return cacheRetro;
  const [cv, x] = tela(512, 716);
  const W = 512, H = 716;
  rr(x, 0, 0, W, H, 44);
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#6a38b8');
  g.addColorStop(0.5, '#3a1b78');
  g.addColorStop(1, '#170838');
  x.fillStyle = g;
  x.fill();
  x.save();
  rr(x, 0, 0, W, H, 44);
  x.clip();
  x.strokeStyle = 'rgba(255,210,120,0.13)';
  x.lineWidth = 3;
  for (let i = -H; i < W + H; i += 46) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i - H, H); x.stroke();
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke();
  }
  x.restore();
  rr(x, 14, 14, W - 28, H - 28, 34);
  x.lineWidth = 10;
  x.strokeStyle = sfumaturaOro(x, 0, H);
  x.stroke();
  rr(x, 32, 32, W - 64, H - 64, 26);
  x.lineWidth = 3;
  x.stroke();
  // Medaglione centrale
  x.beginPath();
  x.arc(256, 358, 160, 0, Math.PI * 2);
  x.fillStyle = sfumaturaOro(x, 198, 518);
  x.fill();
  x.beginPath();
  x.arc(256, 358, 132, 0, Math.PI * 2);
  const gm = x.createRadialGradient(256, 330, 10, 256, 358, 132);
  gm.addColorStop(0, '#5a2fa0');
  gm.addColorStop(1, '#1a0a3a');
  x.fillStyle = gm;
  x.fill();
  testoContorno(x, 'M', 256, 366, 170, { fill: '#f5cd5a', stroke: '#2a1206', spessore: 0.12 });
  const giro = ['😂', '💀', '🔥', '😎', '🤡', '👀', '💯', '🗿'];
  giro.forEach((e, i) => {
    const a = (i / giro.length) * Math.PI * 2 - Math.PI / 2;
    emoji(x, e, 256 + Math.cos(a) * 214, 358 + Math.sin(a) * 214, 44);
  });
  testoContorno(x, 'MEMESTONE', 256, 650, 40, { fill: '#f5cd5a', stroke: '#1a0a3a' });
  cacheRetro = texDa(cv);
  return cacheRetro;
}

// ---------- Ritratti ----------
const cacheRitratti = new Map();
export function texRitratto(c) {
  const chiave = c.id || c.nome;
  if (cacheRitratti.has(chiave)) return cacheRitratti.get(chiave);
  const [cv, x] = tela(512, 640);
  const tex = texDa(cv);
  const disegna = () => {
    x.clearRect(0, 0, 512, 640);
    disegnaArte(x, c, 0, 0, 512, 640, disegna, 0.56);
    x.beginPath();
    x.rect(0, 0, 512, 640);
    vignetta(x, 256, 320, 150, 330, 0.55);
    tex.needsUpdate = true;
  };
  disegna();
  cacheRitratti.set(chiave, tex);
  return tex;
}

export function texEroe(emojiEroe, colore) {
  const [cv, x] = tela(512, 590);
  const g = x.createRadialGradient(256, 240, 30, 256, 300, 420);
  g.addColorStop(0, colore[0]);
  g.addColorStop(0.6, colore[1]);
  g.addColorStop(1, colore[2]);
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 590);
  x.globalAlpha = 0.12;
  for (let i = 0; i < 14; i++) {
    x.beginPath();
    x.arc(256, 330, 40 + i * 26, 0, Math.PI * 2);
    x.strokeStyle = '#fff';
    x.lineWidth = 2;
    x.stroke();
  }
  x.globalAlpha = 1;
  x.save();
  x.shadowColor = 'rgba(0,0,0,0.45)';
  x.shadowBlur = 30;
  x.shadowOffsetY = 14;
  emoji(x, emojiEroe, 256, 320, 300);
  x.restore();
  x.beginPath();
  x.rect(0, 0, 512, 590);
  vignetta(x, 256, 300, 160, 360, 0.5);
  return texDa(cv);
}

export function texPotere(e, usato) {
  const [cv, x] = tela(256, 256);
  x.beginPath();
  x.arc(128, 128, 126, 0, Math.PI * 2);
  const g = x.createRadialGradient(110, 100, 10, 128, 128, 130);
  if (usato) { g.addColorStop(0, '#77738a'); g.addColorStop(1, '#2c2838'); }
  else { g.addColorStop(0, '#b78cff'); g.addColorStop(0.6, '#5a2fb0'); g.addColorStop(1, '#220c4d'); }
  x.fillStyle = g;
  x.fill();
  x.globalAlpha = usato ? 0.3 : 1;
  emoji(x, e, 128, 128, 140);
  return texDa(cv);
}

const cacheEmoji = new Map();
export function texEmoji(e) {
  if (cacheEmoji.has(e)) return cacheEmoji.get(e);
  const [cv, x] = tela(256, 256, 1);
  emoji(x, e, 128, 128, 200);
  const t = texDa(cv);
  cacheEmoji.set(e, t);
  return t;
}

// ---------- Bottone di fine turno ----------
const cacheBottone = new Map();
export function texBottone(stato) {
  if (cacheBottone.has(stato)) return cacheBottone.get(stato);
  const [cv, x] = tela(512, 190, 1);
  const colori = {
    fine: ['#ffe28a', '#f0b52e', '#9a6408'],
    pronto: ['#b6ffc8', '#3fd36a', '#14702f'],
    nemico: ['#a39cb8', '#6b6480', '#2e2840']
  }[stato];
  const g = x.createLinearGradient(0, 0, 0, 190);
  g.addColorStop(0, colori[0]);
  g.addColorStop(0.5, colori[1]);
  g.addColorStop(1, colori[2]);
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 190);
  x.fillStyle = 'rgba(255,255,255,0.25)';
  x.fillRect(0, 0, 512, 60);
  testoContorno(x, stato === 'nemico' ? 'TURNO NEMICO' : 'FINE TURNO', 256, 100, stato === 'nemico' ? 62 : 74,
    { stroke: '#2a1a06', spessore: 0.16 });
  const t = texDa(cv);
  cacheBottone.set(stato, t);
  return t;
}

// ---------- Numeri (attacco, vita, mana) ----------
export class TexNumero {
  constructor(size = 128) {
    [this.cv, this.x] = tela(size, size, 1);
    this.size = size;
    this.tex = texDa(this.cv);
    this.val = null;
    this.stato = null;
  }
  set(n, stato = '') {
    if (n === this.val && stato === this.stato) return;
    this.val = n;
    this.stato = stato;
    const x = this.x, s = this.size;
    x.clearRect(0, 0, s, s);
    const fill = stato === 'giu' ? '#ff7a6b' : stato === 'su' ? '#86ffa2' : '#ffffff';
    const testo = String(n);
    testoContorno(x, testo, s / 2, s / 2 + s * 0.03, s * (testo.length > 2 ? 0.52 : 0.72), { fill, spessore: 0.2 });
    this.tex.needsUpdate = true;
  }
  dispose() { this.tex.dispose(); }
}

// ---------- Scritte volanti (danni, parole meme) ----------
function stella(x, cx, cy, rx, ry, punte, interno) {
  x.beginPath();
  for (let i = 0; i < punte * 2; i++) {
    const a = (i / (punte * 2)) * Math.PI * 2 - Math.PI / 2;
    const k = i % 2 === 0 ? 1 : interno;
    const j = i % 2 === 0 ? 0.9 + Math.random() * 0.2 : 1;
    x.lineTo(cx + Math.cos(a) * rx * k * j, cy + Math.sin(a) * ry * k * j);
  }
  x.closePath();
}

export function texScritta(testo, { size = 110, fill = '#fff', stroke = '#1a0f24', fondo = null, emojiFont = false } = {}) {
  const font = `${size}px ${emojiFont ? FONT_EMOJI : FONT_TITOLI}`;
  const misura = document.createElement('canvas').getContext('2d');
  misura.font = font;
  const w = misura.measureText(testo).width;
  let W = Math.ceil(w + size * 0.6), H = Math.ceil(size * 1.45);
  if (fondo) { W = Math.ceil(w + size * 1.6); H = Math.ceil(size * 2.3); }
  const [cv, x] = tela(W, H, 1);
  if (fondo === 'scoppio') {
    stella(x, W / 2, H / 2, W * 0.49, H * 0.47, 13, 0.72);
    const g = x.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W / 2);
    g.addColorStop(0, '#fff7a0');
    g.addColorStop(0.6, '#ffd21f');
    g.addColorStop(1, '#ff8a00');
    x.fillStyle = g;
    x.fill();
    x.lineWidth = 8;
    x.strokeStyle = '#1a0f24';
    x.stroke();
  }
  if (emojiFont) emoji(x, testo, W / 2, H / 2, size);
  else testoContorno(x, testo, W / 2, H / 2 + size * 0.05, size, { fill, stroke });
  return { tex: texDa(cv), aspetto: W / H };
}

export function texSplat(n, cura = false) {
  const [cv, x] = tela(256, 256, 1);
  stella(x, 128, 128, 122, 118, 11, 0.68);
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
  if (cura) { g.addColorStop(0, '#d8ffd8'); g.addColorStop(0.6, '#3fd36a'); g.addColorStop(1, '#127a34'); }
  else { g.addColorStop(0, '#ffd27a'); g.addColorStop(0.55, '#e8392c'); g.addColorStop(1, '#7a0c0c'); }
  x.fillStyle = g;
  x.fill();
  x.lineWidth = 7;
  x.strokeStyle = '#1a0606';
  x.stroke();
  testoContorno(x, (cura ? '+' : '-') + n, 128, 134, String(n).length > 1 ? 92 : 110, { spessore: 0.16 });
  return texDa(cv);
}

// ---------- Tavolo e pavimento ----------
export function texTavolo() {
  const [cv, x] = tela(1024, 1024, 1);
  const g = x.createRadialGradient(512, 512, 60, 512, 512, 740);
  g.addColorStop(0, '#5a3d8e');
  g.addColorStop(0.55, '#3a2468');
  g.addColorStop(1, '#170c30');
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 1024);
  // Grana del feltro
  for (let i = 0; i < 16000; i++) {
    x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    x.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }
  // Motivo di emoji in filigrana: il tocco "meme" del tavolo
  const fondo = ['😂', '💀', '🔥', '🗿', '👀', '💯', '🤡', '😎'];
  x.globalAlpha = 0.06;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      x.save();
      x.translate(c * 120 + (r % 2) * 60 + 30, r * 120 + 40);
      x.rotate((Math.random() - 0.5) * 0.6);
      emoji(x, fondo[(r * 3 + c) % fondo.length], 0, 0, 52);
      x.restore();
    }
  }
  x.globalAlpha = 1;
  // Anelli decorativi al centro
  x.strokeStyle = 'rgba(255,214,140,0.16)';
  x.lineWidth = 5;
  x.beginPath(); x.ellipse(512, 512, 430, 380, 0, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2;
  x.beginPath(); x.ellipse(512, 512, 400, 350, 0, 0, Math.PI * 2); x.stroke();
  return texDa(cv);
}

export function texPavimento() {
  const [cv, x] = tela(512, 512, 1);
  const g = x.createRadialGradient(256, 256, 20, 256, 256, 256);
  g.addColorStop(0, '#2a1a48');
  g.addColorStop(0.6, '#140b28');
  g.addColorStop(1, '#07040f');
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  return texDa(cv);
}
