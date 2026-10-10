// =====================================================================
//  TAVOLO: collega le regole al 3D, anima gli eventi e gestisce i comandi
// =====================================================================
import * as THREE from 'three';
import { S, Z, suRidimensiona } from './scena.js';
import { tween, ease, attendi, chiudiTween, VEL } from './motore.js';
import { Carta3D, Token, Eroe3D, BottoneTurno, Freccia } from './oggetti.js';
import { FX } from './effetti.js';
import * as UI from '../interfaccia.js';

const PI = Math.PI;

const T = {
  token: new Map(),        // uid personaggio → Token
  ordine: [[], []],        // personaggi mostrati sul campo, per lato
  carte: new Map(),        // uid carta in mano → Carta3D
  mano: [],                // le mie carte in mano, in ordine
  retri: new Map(),        // carte in mano al computer (coperte)
  retriOrdine: [],
  vive: new Set(),         // tutte le carte 3D da animare
  eroi: [],
  bottone: null,
  freccia: null,
  animando: false,
  hover: null,             // carta sotto il mouse
  sollevata: null,         // carta ingrandita col tocco
  trascinata: null,        // carta che segue il dito/mouse
  trascina: null,          // { tipo: 'carta' | 'mira' | 'attacco', uid }
  giu: null,               // pressione in corso
  selezionato: null,       // mio personaggio pronto ad attaccare (modalità tocco)
  inAttesa: null,          // carta o potere che aspetta un bersaglio
  puntatore: new THREE.Vector2(-9, -9),
  tipoPuntatore: 'mouse',
  puntatoreSchermo: { x: 0, y: 0 }
};

const COLORE_EFFETTO = {
  danno: 0xff7a2a, cura: 0x5bff86, distruggi: 0xb04bff, potenzia: 0xffd34d,
  congela: 0x7fd3ff, silenzia: 0xcfcfcf, dona: 0xffd34d
};
const COLORI_TIPO = { servitore: 0xffc46b, magia: 0x6fa8ff, trappola: 0xff6fae };

// ---------- Avvio ----------
export function avviaTavolo() {
  T.eroi = [new Eroe3D(0), new Eroe3D(1)];
  T.bottone = new BottoneTurno();
  T.bottone.posiziona();
  T.freccia = new Freccia();
  FX.init();

  S.aggiornatori.add((dt, t) => {
    for (const tok of T.token.values()) tok.tick(dt, t);
    for (const c of T.vive) c.tick(dt, t);
    for (const e of T.eroi) e.tick(dt, t);
    T.bottone.tick(dt, t);
    T.freccia.tick(dt, t);
  });

  suRidimensiona(() => {
    T.bottone.posiziona();
    if (G) { layoutCampo(0); layoutCampo(1); layoutMano(); layoutRetri(); }
  });

  Eventi.suCambio = aggiorna;
  UI.init({ suNuova: nuovaPartita3D });
  collegaComandi();
  nuovaPartita3D();
}

function nuovaPartita3D() {
  chiudiTween();
  T.animando = false;
  catena = Promise.resolve();
  for (const tok of T.token.values()) { S.interattivi.delete(tok.gruppo); tok.distruggi(); }
  T.token.clear();
  T.ordine = [[], []];
  for (const c of T.vive) { S.interattivi.delete(c.gruppo); c.distruggi(); }
  T.vive.clear();
  T.carte.clear();
  T.mano = [];
  T.retri.clear();
  T.retriOrdine = [];
  annulla();
  T.hover = T.sollevata = T.trascinata = null;

  nuovaPartita();
  sincronizza();
  UI.mostraMulligan(G.primo, G.g[0].mano, uids => {
    const partita = G;
    cambiaCarte(0, uids);
    sincronizza();
    setTimeout(() => { if (G === partita) iniziaPartita(); }, 450);
  });
}

// ---------- Riproduzione degli eventi ----------
let catena = Promise.resolve();

export function aggiorna() {
  catena = catena.then(riproduci).catch(err => {
    console.error(err);
    T.animando = false;
    sincronizza();
  });
  return catena;
}

const GRUPPI = { danno: 'colpi', cura: 'colpi', scudo: 'colpi', congela: 'colpi', silenzia: 'colpi', potenzia: 'colpi', armatura: 'colpi', morte: 'morti' };

async function riproduci() {
  const partita = G;
  if (!partita) return;
  if (partita.anim.length) { T.animando = true; evidenzia(); }
  while (G === partita && partita.anim.length) {
    const ev = partita.anim.shift();
    const gruppo = GRUPPI[ev.tipo];
    if (gruppo) {
      // Gli eventi dello stesso tipo uno dopo l'altro partono insieme (es. danni ad area)
      const lista = [ev];
      while (partita.anim.length && GRUPPI[partita.anim[0].tipo] === gruppo) lista.push(partita.anim.shift());
      await Promise.all(lista.map(esegui));
    } else {
      await esegui(ev);
    }
  }
  if (G !== partita) return;
  T.animando = false;
  sincronizza();
}

function esegui(ev) {
  const f = ANIMAZIONI[ev.tipo];
  return f ? f(ev) : Promise.resolve();
}

// ---------- Helper ----------
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const manoH = uid => G.g[0].mano.find(h => h.uid === uid);
const quat = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

function oggettoPer(uid) {
  return T.token.get(uid) || T.eroi.find(e => e.uid === uid) || null;
}

function tweenTrasforma(obj, { pos, quat: q, scala }, durata, easing = ease.inOut) {
  const p0 = obj.position.clone(), q0 = obj.quaternion.clone(), s0 = obj.scale.x;
  return tween(durata, e => {
    if (pos) obj.position.lerpVectors(p0, pos, e);
    if (q) obj.quaternion.slerpQuaternions(q0, q, e);
    if (scala != null) obj.scale.setScalar(s0 + (scala - s0) * e);
  }, easing);
}

function coloriToken(tok) {
  const lato = tok.lato === 0 ? 0x6fa8ff : 0xff7a6b;
  return [0xd8a640, 0xffe08a, 0x8a5a1c, lato];
}

// ---------- Disposizione ----------
function scalaToken() { return Math.min(1, (2 * S.mezzaL - 0.6) / (7 * 1.22)); }
function spaziatura() { return 1.22 * scalaToken(); }

function slotCampo(lato, i, n) {
  return v3((i - (n - 1) / 2) * spaziatura(), 0, Z.campo[lato]);
}

function layoutCampo(lato) {
  const lista = T.ordine[lato];
  lista.forEach((tok, i) => {
    tok.target.copy(slotCampo(lato, i, lista.length));
    tok.scalaTarget = scalaToken();
  });
}

function layoutMano() {
  const n = T.mano.length;
  const hw = S.manoHW, hh = S.manoHH;
  const larghezza = Math.min(hw * 2 * 0.8, hh * 2.6);
  const s = Math.min(0.6, hh * 0.3, n > 1 ? larghezza / (1 + 0.62 * (n - 1)) : 0.6);
  const passo = n > 1 ? Math.min(s * 0.82, (larghezza - s) / (n - 1)) : 0;
  const zoom = Math.min(s * 2, (hh * 1.25) / 1.4, hw * 0.9);
  T.mano.forEach((c, i) => {
    if (c === T.trascinata) return;
    const off = i - (n - 1) / 2;
    let x = off * passo, y = -hh + s * 0.3 - off * off * 0.014 * s, z = i * 0.012, rz = -off * 0.06, sc = s;
    const evidenziata = (c === T.hover || c === T.sollevata) && !T.trascina;
    if (evidenziata) {
      sc = zoom;
      y = -hh + zoom * 0.7 + 0.06;
      x = Math.max(-hw + zoom * 0.52, Math.min(hw - zoom * 0.52, x));
      z = 0.6;
      rz = 0;
    } else if (T.inAttesa?.uid === c.uid) {
      y = -hh + s * 0.95;
      z = 0.4;
      rz = 0;
      sc = s * 1.12;
    }
    c.imposta(v3(x, y, z), new THREE.Euler(0, 0, rz), sc);
  });
}

function layoutRetri() {
  const n = T.retriOrdine.length;
  const passo = Math.min(0.42, (2 * S.mezzaL * 0.55) / Math.max(n, 1));
  T.retriOrdine.forEach((c, i) => {
    const off = i - (n - 1) / 2;
    c.imposta(v3(off * passo, 1.1 + i * 0.01, Z.manoNemico + Math.abs(off) * 0.05), new THREE.Euler(PI / 2 + 0.55, 0, off * 0.08), 0.55);
  });
}

// ---------- Creazione oggetti ----------
function creaToken(m) {
  const tok = new Token(m);
  tok.gruppo.userData = { tipo: 'servitore', uid: m.uid, lato: m.lato };
  S.scene.add(tok.gruppo);
  S.interattivi.add(tok.gruppo);
  T.token.set(m.uid, tok);
  return tok;
}

function rimuoviToken(tok) {
  S.interattivi.delete(tok.gruppo);
  T.token.delete(tok.uid);
  tok.distruggi();
}

function creaCartaMano(h) {
  const c = new Carta3D(h.carta);
  c.uid = h.uid;
  c.gruppo.userData = { tipo: 'carta', uid: h.uid };
  // Parte dal mazzo, coperta, e vola in mano
  c.gruppo.position.copy(T.eroi[0].posizioneMazzo());
  c.gruppo.quaternion.copy(quat(PI / 2, 0, 0));
  c.gruppo.scale.setScalar(0.72);
  S.scene.add(c.gruppo);
  S.mano.attach(c.gruppo);
  T.carte.set(h.uid, c);
  T.vive.add(c);
  S.interattivi.add(c.gruppo);
  return c;
}

function creaRetro(uid) {
  const c = new Carta3D(null);
  c.uid = uid;
  c.gruppo.position.copy(T.eroi[1].posizioneMazzo());
  c.gruppo.quaternion.copy(quat(PI / 2, 0, 0));
  c.gruppo.scale.setScalar(0.5);
  S.scene.add(c.gruppo);
  T.retri.set(uid, c);
  T.vive.add(c);
  return c;
}

function rimuoviCarta(c) {
  T.vive.delete(c);
  S.interattivi.delete(c.gruppo);
  c.distruggi();
}

// ---------- Sincronizzazione con lo stato del gioco ----------
function sincronizza() {
  if (!G) return;
  for (const lato of [0, 1]) {
    const campo = G.g[lato].campo;
    const vivi = new Set(campo.map(m => m.uid));
    for (const tok of [...T.token.values()]) if (tok.lato === lato && !vivi.has(tok.uid)) rimuoviToken(tok);
    T.ordine[lato] = campo.map((m, i) => {
      let tok = T.token.get(m.uid);
      if (!tok) {
        tok = creaToken(m);
        tok.gruppo.position.copy(slotCampo(lato, i, campo.length)).setY(1.2);
        tok.gruppo.scale.setScalar(scalaToken());
      }
      tok.aggiorna(m);
      return tok;
    });
    layoutCampo(lato);
    T.eroi[lato].aggiorna(G.g[lato]);
  }

  const mano = G.g[0].mano;
  const uids = new Set(mano.map(h => h.uid));
  for (const [uid, c] of [...T.carte]) if (!uids.has(uid)) { T.carte.delete(uid); rimuoviCarta(c); }
  T.mano = mano.map(h => T.carte.get(h.uid) || creaCartaMano(h));
  if (T.sollevata && !T.mano.includes(T.sollevata)) T.sollevata = null;
  layoutMano();

  const manoNem = G.g[1].mano;
  const uidsNem = new Set(manoNem.map(h => h.uid));
  for (const [uid, c] of [...T.retri]) if (!uidsNem.has(uid)) { T.retri.delete(uid); rimuoviCarta(c); }
  T.retriOrdine = manoNem.map(h => T.retri.get(h.uid) || creaRetro(h.uid));
  layoutRetri();

  evidenzia();
}

// ---------- Evidenziazioni ----------
function mioTurno() { return G && G.fase === 'gioco' && G.turno === 0 && !T.animando; }

function bersagliCorrenti() {
  if (!G || G.fase !== 'gioco') return [];
  if (T.inAttesa) return bersagliScelta(0, T.inAttesa.chiave, null).map(x => x.uid);
  if (T.selezionato) {
    const tok = T.token.get(T.selezionato);
    return tok ? bersagliAttacco(0, tok.m) : [];
  }
  return [];
}

function statoBottone() {
  if (!G || G.fase !== 'gioco' || G.turno !== 0) return 'nemico';
  const io = G.g[0];
  const qualcosaDaFare = io.mano.some(h => puoGiocare(0, h)) || io.campo.some(puoAttaccareOra) || puoUsarePotere(0);
  return qualcosaDaFare ? 'fine' : 'pronto';
}

function evidenzia() {
  if (!G) return;
  const turno = mioTurno();
  const bersagli = new Set(bersagliCorrenti());
  for (const tok of T.token.values()) {
    let a = null;
    if (bersagli.has(tok.uid)) a = 'bersaglio';
    else if (tok.lato === 0 && turno) {
      if (T.selezionato === tok.uid) a = 'selezionato';
      else if (!T.inAttesa && puoAttaccareOra(tok.m)) a = 'pronto';
    }
    tok.setAnello(a);
  }
  for (const e of T.eroi) e.setBersaglio(bersagli.has(e.uid));
  for (const c of T.mano) {
    const h = manoH(c.uid);
    const giocabile = turno && h && puoGiocare(0, h);
    c.colAlone = giocabile ? (T.inAttesa?.uid === c.uid ? 0xffd34d : 0x46ff7e) : null;
  }
  T.eroi[0].setPotereAttivo(turno && !T.inAttesa && puoUsarePotere(0));
  if (!T.animando) T.bottone.setStato(statoBottone());

  let testo = '';
  if (G.fase === 'gioco') {
    if (G.turno !== 0) testo = '🤖 Il computer sta pensando…';
    else if (T.inAttesa) testo = '🎯 Scegli il bersaglio';
    else if (T.selezionato) testo = '⚔️ Scegli chi attaccare';
    else testo = 'Trascina le carte sul tavolo · trascina i tuoi personaggi per attaccare';
  }
  UI.stato(testo);
}

function annulla() {
  T.selezionato = null;
  T.inAttesa = null;
  T.trascina = null;
  T.freccia?.nascondi();
}

// =====================================================================
//  ANIMAZIONI DEGLI EVENTI
// =====================================================================
const ANIMAZIONI = {
  async turno(ev) {
    UI.banner(ev.lato);
    T.bottone.setStato(ev.lato === 0 ? 'fine' : 'nemico');
    if (ev.lato === 0) {
      const e = T.eroi[0];
      FX.scintillio(e.posizione(), 0x6fa8ff);
    }
    await attendi(ev.lato === 0 ? 1100 : 650);
  },

  async pesca(ev) {
    if (ev.lato === 0) {
      const h = manoH(ev.uid);
      if (!h || T.carte.has(ev.uid)) return;
      const c = creaCartaMano(h);
      T.mano.push(c);
      layoutMano();
      T.eroi[0].aggiornaMazzo(G.g[0].mazzo.length);
      await attendi(420);
    } else {
      if (T.retri.has(ev.uid)) return;
      const c = creaRetro(ev.uid);
      T.retriOrdine.push(c);
      layoutRetri();
      await attendi(320);
    }
  },

  async brucia(ev) {
    const c = new Carta3D(ev.carta);
    T.vive.add(c);
    c.molla = false;
    c.gruppo.position.copy(T.eroi[ev.lato].posizioneMazzo());
    c.gruppo.quaternion.copy(S.camera.quaternion);
    c.gruppo.scale.setScalar(0.5);
    S.scene.add(c.gruppo);
    const su = c.gruppo.position.clone().add(v3(0, 2, 0.5));
    await tweenTrasforma(c.gruppo, { pos: su, scala: 1 }, 380, ease.out);
    FX.dissolvi(su, 0xff6a2a);
    UI.stato('🔥 Mano piena: carta bruciata!');
    await tween(450, e => { c.impostaOpacita(1 - e); c.gruppo.scale.setScalar(1 + e * 0.3); });
    T.vive.delete(c);
    c.distruggi();
  },

  async gioca(ev) {
    if (ev.lato === 0) {
      let c = T.carte.get(ev.uidMano);
      if (c) {
        T.carte.delete(ev.uidMano);
        T.mano = T.mano.filter(x => x !== c);
        S.interattivi.delete(c.gruppo);
        if (T.sollevata === c) T.sollevata = null;
        if (T.trascinata === c) T.trascinata = null;
        layoutMano();
        S.scene.attach(c.gruppo);
      } else {
        c = new Carta3D(ev.carta);
        T.vive.add(c);
        c.gruppo.position.copy(T.eroi[0].posizione());
        S.scene.add(c.gruppo);
      }
      c.molla = false;
      c.colAlone = null;
      await volaVia(c, ev.carta, 0);
      return;
    }

    // Carta del computer: esce dalla sua mano e si mostra in grande
    const r = T.retri.get(ev.uidMano);
    const partenza = r ? r.gruppo : null;
    if (r) { T.retri.delete(ev.uidMano); T.retriOrdine = T.retriOrdine.filter(x => x !== r); layoutRetri(); }
    if (ev.carta.tipo === 'trappola') {
      if (r) {
        r.molla = false;
        await tweenTrasforma(r.gruppo, { pos: T.eroi[1].posizioneTrappole(), scala: 0.12 }, 450, ease.inOut);
        FX.scintillio(T.eroi[1].posizioneTrappole(), 0xff6fae);
        rimuoviCarta(r);
      }
      return;
    }
    const c = new Carta3D(ev.carta);
    T.vive.add(c);
    c.molla = false;
    if (partenza) {
      c.gruppo.position.copy(partenza.position);
      c.gruppo.quaternion.copy(partenza.quaternion);
      c.gruppo.scale.copy(partenza.scale);
      rimuoviCarta(r);
    } else {
      c.gruppo.position.set(0, 1, Z.manoNemico);
    }
    S.scene.add(c.gruppo);
    S.primoPiano.attach(c.gruppo);
    // In orizzontale la carta del computer si mostra a sinistra, come in Hearthstone
    const dx = S.camera.aspect > 1 ? S.primoHH * S.camera.aspect * 0.55 : 0;
    await tweenTrasforma(c.gruppo, { pos: v3(-dx, S.primoHH * 0.15, 0), quat: new THREE.Quaternion(), scala: Math.min(1.25, S.primoHH * 0.7) }, 520, ease.out);
    FX.scintillio(posizioneMondo(c.gruppo), COLORI_TIPO[ev.carta.tipo]);
    await attendi(900);
    S.scene.attach(c.gruppo);
    await volaVia(c, ev.carta, 1);
  },

  async evoca(ev) {
    const m = ev.m;
    if (T.token.has(m.uid)) return;
    const tok = creaToken(m);
    // Lo inserisce nella posizione giusta rispetto agli altri
    const campo = G.g[ev.lato].campo;
    const lista = T.ordine[ev.lato];
    let idx = lista.length;
    const pos = campo.indexOf(m);
    if (pos >= 0) idx = lista.filter(x => { const j = campo.indexOf(x.m); return j >= 0 && j < pos; }).length;
    lista.splice(idx, 0, tok);
    layoutCampo(ev.lato);
    const fine = tok.target.clone();
    const inizio = fine.clone().add(v3(0, 2.4, ev.lato === 0 ? 0.6 : -0.6));
    tok.molla = false;
    tok.gruppo.position.copy(inizio);
    const s = tok.scalaTarget;
    tok.gruppo.scale.setScalar(s * 1.4);
    await tween(250, e => {
      tok.gruppo.position.lerpVectors(inizio, fine, e);
      tok.gruppo.scale.setScalar(s * (1.4 - 0.45 * e));
    }, ease.in);
    FX.atterraggio(fine, ha(m, 'provocazione') || m.carta.costo >= 6);
    await tween(200, e => tok.gruppo.scale.setScalar(s * (0.95 + Math.sin(e * PI) * 0.12 + e * 0.05)), ease.lineare);
    tok.molla = true;
  },

  async attacco(ev) {
    const a = T.token.get(ev.da), b = oggettoPer(ev.a);
    if (!a || !b) return;
    const g = a.gruppo;
    const inizio = a.target.clone();
    const dest = b.posizione();
    const dir = dest.clone().sub(g.position).setY(0);
    const dist = dir.length();
    dir.normalize();
    const stop = dest.clone().sub(dir.multiplyScalar(Math.min(0.7, dist * 0.35)));
    stop.y = 0.35;
    a.molla = false;
    const s = a.scalaTarget;
    await tween(160, e => { g.position.y = 0.85 * e; g.scale.setScalar(s * (1 + 0.14 * e)); }, ease.out);
    const da = g.position.clone();
    await tween(170, e => g.position.lerpVectors(da, stop, e), ease.in);
    const forza = Math.min(2, (ev.forza || 1) / 4 + 0.4);
    FX.impatto(dest, { forza, parola: Math.random() < (ev.forza >= 5 ? 0.8 : 0.4) ? FX.parolaMeme() : null });
    const ritorno = g.position.clone();
    tween(340, e => {
      g.position.lerpVectors(ritorno, inizio, e);
      g.scale.setScalar(s * (1.14 - 0.14 * e));
    }, ease.out).then(() => { a.molla = true; });
    await attendi(80);
  },

  async danno(ev) {
    const o = oggettoPer(ev.uid);
    if (!o) return;
    o.mostraVita(ev.vita, 'giu');
    if (o instanceof Eroe3D) o.mostraArmatura(ev.armatura);
    o.scuoti();
    const p = o.posizione();
    FX.splat(p, ev.valore);
    FX.particelle({ pos: p, n: 18 + ev.valore * 4, velocita: [1, 3], colori: [0xff4a3c, 0xffb36b], vita: [0.3, 0.6], dim: [0.08, 0.2], gravita: -6, attrito: 2.5 });
    await attendi(450);
  },

  async cura(ev) {
    const o = oggettoPer(ev.uid);
    if (!o) return;
    const max = o instanceof Eroe3D ? REGOLE.VITA_EROE : o.m.vitaMax;
    o.mostraVita(ev.vita, ev.vita < max ? 'giu' : '');
    FX.cura(o.posizione(), ev.valore);
    await attendi(450);
  },

  async scudo(ev) {
    const o = T.token.get(ev.uid);
    if (!o) return;
    o.setScudoDivino(false);
    FX.scudoRotto(o.posizione());
    await attendi(350);
  },

  async congela(ev) {
    const o = oggettoPer(ev.uid);
    if (!o) return;
    o.setCongelato(true);
    FX.ghiaccio(o.posizione());
    await attendi(380);
  },

  async silenzia(ev) {
    const o = T.token.get(ev.uid);
    if (!o) return;
    o.setSilenziato(true);
    FX.silenzio(o.posizione());
    await attendi(380);
  },

  async potenzia(ev) {
    const o = T.token.get(ev.uid);
    if (!o) return;
    o.mostraAttacco(ev.attacco, 'su');
    o.mostraVita(ev.vita, 'su');
    FX.dorato(o.posizione(), ev.testo);
    await attendi(420);
  },

  async armatura(ev) {
    const o = oggettoPer(ev.uid);
    if (!o) return;
    o.mostraArmatura(ev.armatura);
    FX.dorato(o.posizione(), `+${ev.valore} 🛡️`);
    await attendi(420);
  },

  async morte(ev) {
    const tok = T.token.get(ev.uid);
    if (!tok) return;
    T.token.delete(ev.uid);
    S.interattivi.delete(tok.gruppo);
    T.ordine[tok.lato] = T.ordine[tok.lato].filter(x => x !== tok);
    if (T.selezionato === tok.uid) T.selezionato = null;
    tok.molla = false;
    await tween(240, e => tok.friggi(e), ease.in);
    const p = tok.posizione();
    FX.morte(p, coloriToken(tok));
    tok.distruggi();
    layoutCampo(tok.lato);
    await attendi(420);
  },

  async proiettile(ev) {
    const sorgente = oggettoPer(ev.da) || T.eroi[ev.lato];
    const bersagli = ev.a.map(oggettoPer).filter(Boolean);
    if (!bersagli.length) return;
    const colore = COLORE_EFFETTO[ev.effetto] || 0xffffff;
    const da = sorgente.posizione();
    if (bersagli.length >= 3) {
      await FX.ondata(da, bersagli.map(b => b.posizione()), colore);
    } else {
      await Promise.all(bersagli.map(b => FX.proiettile(da, b.posizione(), { colore, emoji: ev.emoji })));
    }
  },

  async potere(ev) {
    const e = T.eroi[ev.lato];
    e.giraPotere();
    const p = new THREE.Vector3();
    e.potere.getWorldPosition(p);
    FX.scintillio(p, 0xb78cff);
    FX.onda(p, 0xb78cff, 1.2, 400);
    await attendi(320);
  },

  async trappola(ev) {
    UI.bannerTrappola();
    const e = T.eroi[ev.lato];
    const c = new Carta3D(ev.carta);
    T.vive.add(c);
    c.molla = false;
    c.gruppo.position.copy(e.posizioneTrappole());
    c.gruppo.quaternion.copy(quat(PI / 2, 0, 0));
    c.gruppo.scale.setScalar(0.15);
    S.scene.add(c.gruppo);
    S.primoPiano.attach(c.gruppo);
    // Si gira dal retro al fronte mentre arriva in primo piano
    await tweenTrasforma(c.gruppo, { pos: v3(0, S.primoHH * 0.12, 0), quat: quat(0, 0, 0), scala: Math.min(1.3, S.primoHH * 0.72) }, 600, ease.out);
    const p = posizioneMondo(c.gruppo);
    FX.dissolvi(p, 0xff6fae);
    FX.lampo(p, 0xff6fae, 50, 600);
    // La gemma della trappola sparisce
    const segreti = G.g[ev.lato].segreti;
    e.aggiornaTrappole(segreti);
    await attendi(1000);
    await tween(300, k => { c.impostaOpacita(1 - k); c.gruppo.scale.multiplyScalar(1.01); });
    rimuoviCarta(c);
  },

  async fine(ev) {
    await attendi(350);
    const perdenti = ev.vincitore === -1 ? [0, 1] : [1 - ev.vincitore];
    for (const l of perdenti) {
      const e = T.eroi[l];
      FX.esplosioneEroe(e.posizione());
      e.ritratto.visible = false;
    }
    await attendi(1500);
    UI.mostraFine(ev.vincitore);
  }
};

function posizioneMondo(obj) {
  const p = new THREE.Vector3();
  obj.getWorldPosition(p);
  return p;
}

// Carta giocata: va sul tavolo (personaggio), esplode in scintille (evento) o si nasconde (trappola)
async function volaVia(c, carta, lato) {
  const g = c.gruppo;
  if (carta.tipo === 'servitore') {
    const n = T.ordine[lato].length + 1;
    const dest = slotCampo(lato, n - 1, n).setY(1.3);
    await tweenTrasforma(g, { pos: dest, quat: quat(-PI / 2, 0, 0), scala: 0.85 }, 300, ease.inOut);
    await tween(110, e => { c.impostaOpacita(1 - e); g.scale.setScalar(0.85 - e * 0.3); });
  } else if (carta.tipo === 'magia') {
    const centro = v3(0, 2.6, (Z.campo[0] + Z.campo[1]) / 2 + 0.6);
    const q = S.camera.quaternion.clone();
    if (lato === 0) await tweenTrasforma(g, { pos: centro, quat: q, scala: 1.25 }, 380, ease.out);
    FX.dissolvi(g.position.clone(), COLORI_TIPO.magia);
    await tween(380, e => { c.impostaOpacita(1 - e); g.scale.setScalar(1.25 + e * 0.35); }, ease.out);
  } else {
    const dest = T.eroi[lato].posizioneTrappole();
    await tweenTrasforma(g, { pos: dest, quat: quat(-PI / 2, 0, 0), scala: 0.12 }, 450, ease.inOut);
    FX.scintillio(dest, COLORI_TIPO.trappola);
    FX.onda(dest, COLORI_TIPO.trappola, 1, 350);
  }
  rimuoviCarta(c);
}

// =====================================================================
//  COMANDI: trascinamento, freccia, tocchi
// =====================================================================
const ray = new THREE.Raycaster();

function aggiornaPuntatore(e) {
  T.puntatoreSchermo.x = e.clientX;
  T.puntatoreSchermo.y = e.clientY;
  T.puntatore.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
}

function scegliOggetto() {
  ray.setFromCamera(T.puntatore, S.camera);
  const colpi = ray.intersectObjects([...S.interattivi], true);
  for (const c of colpi) {
    let o = c.object;
    while (o && !o.userData.tipo) o = o.parent;
    if (o && o.visible) return o.userData;
  }
  return null;
}

function puntoSulTavolo() {
  ray.setFromCamera(T.puntatore, S.camera);
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(S.pianoTavolo, p) ? p : null;
}

function puoInteragire() {
  return mioTurno() && !UI.finestraAperta();
}

function sorgenteFreccia() {
  if (T.selezionato) return T.token.get(T.selezionato)?.posizione() || null;
  if (T.inAttesa) return T.eroi[0].posizione();
  return null;
}

function aggiornaFreccia() {
  const da = sorgenteFreccia();
  const attiva = da && (T.trascina || T.tipoPuntatore === 'mouse');
  if (!attiva) { T.freccia.nascondi(); return; }
  const info = scegliOggetto();
  const bersagli = bersagliCorrenti();
  if (info && bersagli.includes(info.uid)) {
    T.freccia.mostra(da, oggettoPer(info.uid).posizione(), true);
  } else {
    const p = puntoSulTavolo();
    if (p) T.freccia.mostra(da, p.setY(0.3), false);
  }
}

function aggiornaHover() {
  if (T.tipoPuntatore !== 'mouse' || T.trascina || T.giu?.mosso) return;
  const info = scegliOggetto();
  const carta = info?.tipo === 'carta' ? T.carte.get(info.uid) : null;
  if (carta !== T.hover) { T.hover = carta; layoutMano(); }
  if (info?.tipo === 'servitore') {
    const tok = T.token.get(info.uid);
    if (tok) UI.anteprima(tok.m, T.puntatoreSchermo.x);
  } else UI.nascondiAnteprima();
  document.body.style.cursor = info && (info.tipo !== 'eroe' || bersagliCorrenti().includes(info.uid)) ? 'pointer' : '';
}

function giocaConBersaglio(uidBersaglio) {
  const attesa = T.inAttesa;
  annulla();
  if (!attesa) return;
  const ok = attesa.tipo === 'carta' ? giocaCarta(0, attesa.uid, uidBersaglio) : usaPotere(0, uidBersaglio);
  if (ok) aggiorna();
}

function azione(fn) {
  T.sollevata = null;
  T.hover = null;
  annulla();
  if (fn()) aggiorna();
  else evidenzia();
}

function toccoCarta(uid) {
  const c = T.carte.get(uid), h = manoH(uid);
  if (!c || !h) return;
  // Col dito: il primo tocco ingrandisce la carta, il secondo la gioca
  if (T.tipoPuntatore !== 'mouse' && T.sollevata !== c) { T.sollevata = c; return; }
  T.sollevata = null;
  if (!puoInteragire() || !puoGiocare(0, h)) { c.vibra(); return; }
  const k = sceltaRichiesta(h.carta);
  if (k && bersagliScelta(0, k, null).length) T.inAttesa = { tipo: 'carta', uid, chiave: k };
  else azione(() => giocaCarta(0, uid, null));
}

function toccoPotere() {
  if (!puoInteragire() || !puoUsarePotere(0)) return;
  const k = sceltaEffetti(POTERE_EROE.effetto);
  if (k) { T.selezionato = null; T.inAttesa = { tipo: 'potere', chiave: k }; }
  else azione(() => usaPotere(0, null));
}

function premiFine() {
  if (!puoInteragire()) return;
  T.bottone.premi();
  annulla();
  T.sollevata = T.hover = null;
  fineTurno();
}

function collegaComandi() {
  const tela = S.renderer.domElement;
  tela.style.touchAction = 'none';

  tela.addEventListener('pointerdown', e => {
    T.tipoPuntatore = e.pointerType;
    aggiornaPuntatore(e);
    UI.nascondiAnteprima();
    const info = scegliOggetto();
    T.giu = { x: e.clientX, y: e.clientY, info, mosso: false };
    if (!puoInteragire() || T.inAttesa || T.selezionato) return;
    if (info?.tipo === 'carta') {
      T.trascina = { tipo: 'carta', uid: info.uid };
    } else if (info?.tipo === 'servitore' && info.lato === 0) {
      const tok = T.token.get(info.uid);
      if (tok && puoAttaccareOra(tok.m)) T.trascina = { tipo: 'attacco', uid: info.uid };
    }
  });

  addEventListener('pointermove', e => {
    T.tipoPuntatore = e.pointerType;
    aggiornaPuntatore(e);
    const g = T.giu;
    if (g && !g.mosso && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 10) g.mosso = true;
    const tr = T.trascina;

    if (tr && g?.mosso && puoInteragire()) {
      if (tr.tipo === 'carta') {
        const c = T.carte.get(tr.uid), h = manoH(tr.uid);
        if (!c || !h || !puoGiocare(0, h)) { if (c) c.vibra(); T.trascina = null; }
        else {
          T.sollevata = null;
          T.hover = null;
          const k = sceltaRichiesta(h.carta);
          if (k && bersagliScelta(0, k, null).length && T.puntatore.y > -0.3) {
            // Carta con bersaglio: torna in mano e parte la freccia dall'eroe
            T.inAttesa = { tipo: 'carta', uid: tr.uid, chiave: k };
            tr.tipo = 'mira';
            T.trascinata = null;
            c.rapida = false;
            layoutMano();
            evidenzia();
          } else {
            T.trascinata = c;
            c.rapida = true;
            const s = Math.min(0.9, S.manoHH * 0.5);
            c.imposta(v3(T.puntatore.x * S.manoHW, T.puntatore.y * S.manoHH, 0.8), new THREE.Euler(0, 0, 0), s);
            c.colAlone = T.puntatore.y > -0.35 ? 0xffd34d : 0x46ff7e;
            layoutMano();
          }
        }
      } else if (tr.tipo === 'attacco' && !T.selezionato) {
        T.selezionato = tr.uid;
        evidenzia();
      }
    }
    aggiornaFreccia();
    aggiornaHover();
  });

  addEventListener('pointerup', e => {
    aggiornaPuntatore(e);
    const g = T.giu, tr = T.trascina;
    T.giu = null;
    T.trascina = null;
    if (!g) return;
    const info = scegliOggetto();

    // Fine di un trascinamento
    if (tr && g.mosso) {
      if (tr.tipo === 'carta') {
        const c = T.trascinata;
        T.trascinata = null;
        if (c) c.rapida = false;
        if (puoInteragire() && T.puntatore.y > -0.35) azione(() => giocaCarta(0, tr.uid, null));
        else { layoutMano(); evidenzia(); }
      } else if (tr.tipo === 'mira') {
        if (info && bersagliCorrenti().includes(info.uid)) giocaConBersaglio(info.uid);
        else { annulla(); layoutMano(); evidenzia(); }
      } else if (tr.tipo === 'attacco') {
        const att = T.selezionato;
        if (info && bersagliCorrenti().includes(info.uid)) azione(() => attacca(0, att, info.uid));
        else { annulla(); evidenzia(); }
      }
      aggiornaFreccia();
      return;
    }
    if (g.mosso) return;

    // Tocco semplice
    if (T.inAttesa || T.selezionato) {
      if (info && bersagliCorrenti().includes(info.uid)) {
        if (T.inAttesa) giocaConBersaglio(info.uid);
        else { const att = T.selezionato; azione(() => attacca(0, att, info.uid)); }
      } else if (info?.tipo === 'servitore' && info.lato === 0 && info.uid !== T.selezionato &&
                 puoAttaccareOra(T.token.get(info.uid)?.m)) {
        T.inAttesa = null;
        T.selezionato = info.uid;
      } else {
        annulla();
      }
    } else if (!info) {
      T.sollevata = null;
    } else {
      switch (info.tipo) {
        case 'carta': toccoCarta(info.uid); break;
        case 'servitore': {
          const tok = T.token.get(info.uid);
          if (tok && tok.lato === 0 && puoInteragire() && puoAttaccareOra(tok.m)) T.selezionato = info.uid;
          else if (tok) UI.ispeziona(tok.m);
          break;
        }
        case 'potere': toccoPotere(); break;
        case 'fine': premiFine(); break;
      }
    }
    layoutMano();
    evidenzia();
    aggiornaFreccia();
  });

  addEventListener('pointercancel', () => {
    T.giu = null;
    T.trascina = null;
    if (T.trascinata) { T.trascinata.rapida = false; T.trascinata = null; }
    annulla();
    layoutMano();
    evidenzia();
  });

  tela.addEventListener('contextmenu', e => { e.preventDefault(); annulla(); T.sollevata = null; layoutMano(); evidenzia(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { annulla(); T.sollevata = null; layoutMano(); evidenzia(); } });
}
