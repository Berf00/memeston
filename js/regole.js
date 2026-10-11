'use strict';

// =====================================================================
//  REGOLE DEL GIOCO (le stesse di base di Hearthstone + le meccaniche del gruppo)
// =====================================================================
const REGOLE = {
  VITA_EROE: 30,
  MANA_MAX: 10,
  MAX_MANO: 10,
  MAX_CAMPO: 7,
  CARTE_MINIME_MAZZO: 30, // se le carte vere non bastano, si riempie con quelle di esempio
  COPIE_PREDEFINITE: 2,
  MAX_TRAPPOLE: 5,
  MANO_PRIMO: 3,
  MANO_SECONDO: 4,
  MAX_PESCA_LORO: 10
};

// Potere Eroe: costa 2 mana, si usa una volta per turno
const POTERE_EROE = {
  nome: 'Scrollata', emoji: '📱', costo: 2,
  effetto: { tipo: 'pesca', valore: 1 }
};

// Chi gioca per secondo riceve La Moneta
const LA_MONETA = {
  id: 'la-moneta', nome: 'La Moneta', tipo: 'magia', costo: 0, emoji: '🪙',
  effetto: { tipo: 'mana', valore: 1 },
  frase: 'Chi gioca per secondo la riceve.'
};

// I nomi delle abilità sono quelli del nostro gruppo (tra parentesi l'equivalente in Hearthstone)
const ABILITA = {
  provocazione: { nome: 'Viecce', icona: '🛡️', spiega: 'I nemici devono attaccare prima questo personaggio. (Provocazione)' },
  assalto: { nome: 'Te Parto', icona: '🏃', spiega: 'Può attaccare subito, ma solo i personaggi nemici. (Assalto)' },
  carica: { nome: 'Invelenato', icona: '😤', spiega: "Può attaccare subito, anche l'eroe. (Carica)" },
  furtivita: { nome: 'Impizzato', icona: '🥷', spiega: 'Non può essere attaccato né bersagliato finché non attacca lui. (Furtività)' },
  velenoso: { nome: 'Infamata', icona: '🐍', spiega: 'Distrugge qualsiasi personaggio a cui infligge danni. (Velenoso)' },
  scudoDivino: { nome: "'Nme Toccà", icona: '✨', spiega: 'Il primo danno che subisce viene ignorato. (Scudo Divino)' },
  sdrumato: { nome: 'Sdrumato', icona: '🚔', spiega: 'Appena giocato va in galera: salta il tuo prossimo turno e a quello dopo fa il comeback. In galera non può essere toccato da niente. (Dormiente)' },
  furiaDelVento: { nome: 'Furia del Vento', icona: '💨', spiega: 'Può attaccare due volte per turno.' },
  furtoVitale: { nome: 'Furto Vitale', icona: '🩸', spiega: 'I danni che infligge curano il tuo eroe.' }
};

const TRIBU = { famiglia: 'FAMIGLIA', trio: 'TRIO' };

const ALTRE_PAROLE = [
  ['Chiama', 'Quando lo giochi, evoca gratis dalla tua mano un personaggio del tipo indicato.'],
  ['Famiglia / Trio', 'Il "tipo" del personaggio. Alcune carte li aiutano o li richiamano.'],
  ['Fusione del Trio', 'Se in campo hai Squiquirins, Adripush e Sashetto, si fondono in un unico personaggio che somma attacco, vita e abilità.'],
  ['Campo dell\'Oro', "L'espansione delle carte. Alcune magie potenziano solo i personaggi del Campo dell'Oro."],
  ['Stelle ★', 'Il livello del personaggio (0, 1 o 2). Il "Chiama" di Janine prende solo personaggi fino a 1 stella.'],
  ['Terreno', 'Una magia che resta attiva per tutta la partita (finché non ne giochi un altro).'],
  ['Simbolo', 'Carta speciale che si gioca solo se hai in campo o in mano i personaggi richiesti: li sacrifica e ti dà un potere permanente.'],
  ['Grido di Battaglia', "Effetto che si attiva quando giochi il personaggio dalla mano."],
  ['Rantolo di Morte', 'Effetto che si attiva quando il personaggio muore.'],
  ['Congelamento ❄️', 'Il personaggio congelato salta il suo prossimo attacco.'],
  ['Silenzio', 'Toglie al personaggio tutte le abilità e i potenziamenti.'],
  ['Armatura', "Assorbe i danni prima della vita dell'eroe."],
  ['Trappola', "Resta nascosta e si attiva da sola durante il turno dell'avversario, quando succede la cosa scritta sulla carta."],
  ['Potere Eroe', `${POTERE_EROE.nome}: costa ${POTERE_EROE.costo} mana e peschi una carta. Una volta per turno.`],
  ['La Moneta', 'Chi gioca per secondo la riceve: ti dà 1 mana extra per un turno.'],
  ['Fatica', 'Se il mazzo è finito, ogni volta che dovresti pescare subisci danni (1, poi 2, poi 3…).']
];

const ATTIVAZIONI = {
  eroeAttaccato: 'Quando un nemico attacca il tuo eroe:',
  servitoreAttaccato: 'Quando un tuo personaggio viene attaccato:',
  personaggioAttaccato: 'Quando il tuo eroe o un tuo personaggio viene attaccato:',
  servitoreGiocato: "Quando l'avversario gioca un personaggio:",
  magiaLanciata: "Quando l'avversario lancia una magia:",
  magiaOTrappola: "Quando l'avversario lancia una magia o piazza una trappola:",
  servitoreMorto: 'Quando un tuo personaggio muore:'
};

// Quali eventi fanno scattare quale tipo di trappola
const EVENTI_TRAPPOLA = {
  eroeAttaccato: ['eroeAttaccato', 'personaggioAttaccato'],
  servitoreAttaccato: ['servitoreAttaccato', 'personaggioAttaccato'],
  servitoreGiocato: ['servitoreGiocato'],
  magiaLanciata: ['magiaLanciata', 'magiaOTrappola'],
  trappolaPiazzata: ['magiaOTrappola'],
  servitoreMorto: ['servitoreMorto']
};

// Bersagli che il giocatore sceglie toccando lo schermo
const SCELTE = ['qualsiasi', 'nemico', 'amico', 'servitore', 'servitoreNemico', 'servitoreAmico'];

const BERSAGLIO_PREDEFINITO = {
  danno: 'eroeNemico', cura: 'mioEroe', distruggi: 'servitoreNemico', potenzia: 'se',
  congela: 'nemico', silenzia: 'servitoreNemico', dona: 'se', malus: 'servitoriNemici'
};

const EFFETTI_DANNOSI = ['danno', 'distruggi', 'congela', 'silenzia', 'malus'];
const EFFETTI_CON_BERSAGLIO = ['danno', 'cura', 'distruggi', 'potenzia', 'congela', 'silenzia', 'dona', 'malus'];

// ---------- Carte ----------
for (const c of CARTE_ESEMPIO) c.esempio = true;
const CARTE_NOSTRE = ESPANSIONI.flatMap(e => e.carte.map(c => ({ ...c, espansione: e.nome })));
const TUTTE_LE_CARTE = [...CARTE_NOSTRE, ...CARTE_ESEMPIO];

function trovaCarta(id) {
  if (id === LA_MONETA.id) return LA_MONETA;
  return TUTTE_LE_CARTE.find(c => c.id === id) || null;
}

const comeLista = x => (x == null ? [] : Array.isArray(x) ? x : [x]);
const bersaglioDi = e => e.bersaglio || BERSAGLIO_PREDEFINITO[e.tipo];
const diCampoOro = c => c && c.set === 'campoOro';

// ---------- Utilità ----------
let G = null;
let ultimoUid = 0;
const nuovoUid = () => ++ultimoUid;
const casuale = arr => arr[Math.floor(Math.random() * arr.length)];
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ha = (x, a) => !!x.abilita && x.abilita.has(a);
const chi = (i, tu, computer) => (i === 0 ? tu : computer);
// In galera un personaggio non può essere toccato da niente
const attivo = m => !m.galera;

function mescola(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// La grafica si aggancia qui: suCambio() anima gli eventi e restituisce una Promise
const Eventi = { suCambio() { return Promise.resolve(); } };

function log(msg) {
  G.log.unshift(msg);
  if (G.log.length > 40) G.log.length = 40;
}

// Ogni cosa che succede viene registrata: la grafica la anima nello stesso ordine
function anima(ev) { if (G && G.registra) G.anim.push(ev); }

function nomeDi(x) {
  if (x.eroe) return x.lato === 0 ? 'te' : 'il computer';
  return x.carta.nome;
}

function tuttiIPersonaggi() {
  return [G.g[0].eroe, ...G.g[0].campo, G.g[1].eroe, ...G.g[1].campo];
}

function trovaPersonaggio(uid) {
  return tuttiIPersonaggi().find(x => x.uid === uid) || null;
}

// ---------- Creazione partita ----------
function creaMazzo() {
  const mazzo = [];
  for (const c of CARTE_NOSTRE) {
    if (c.token || c.daCompletare) continue;
    for (let k = 0; k < (c.copie || REGOLE.COPIE_PREDEFINITE); k++) mazzo.push(c);
  }
  // Riempie con le carte di esempio solo se le carte vere non bastano
  const esempi = mescola(CARTE_ESEMPIO.filter(c => !c.token));
  for (const c of esempi) {
    if (mazzo.length >= REGOLE.CARTE_MINIME_MAZZO) break;
    mazzo.push(c, c);
  }
  return mescola(mazzo);
}

function creaGiocatore(i, nome, emoji) {
  return {
    lato: i, nome,
    eroe: {
      uid: nuovoUid(), lato: i, eroe: true, nome, emoji,
      vita: REGOLE.VITA_EROE, vitaMax: REGOLE.VITA_EROE, armatura: 0,
      congelato: false
    },
    mana: 0, manaMax: 0, potereUsato: false,
    mazzo: creaMazzo(), mano: [], campo: [], segreti: [], cimitero: [], fatica: 0,
    terreno: null, loro: false, bruno: 0
  };
}

function nuovaPartita() {
  G = {
    g: [creaGiocatore(0, 'Tu', '😎'), creaGiocatore(1, 'Computer', '🤖')],
    fase: 'mulligan', turno: -1, numeroTurno: 0,
    primo: Math.random() < 0.5 ? 0 : 1,
    vincitore: null, log: [], anim: [], registra: false,
    scelta: null // scelta in sospeso del giocatore (es. "Busso": quale carta scartare)
  };
  const primo = G.g[G.primo], secondo = G.g[1 - G.primo];
  for (let k = 0; k < REGOLE.MANO_PRIMO; k++) pesca(primo);
  for (let k = 0; k < REGOLE.MANO_SECONDO; k++) pesca(secondo);
  cambiaCarte(1, IA.scegliMulligan(G.g[1]));
  log(G.primo === 0 ? 'Testa! Inizi tu.' : 'Croce! Inizia il computer.');
}

// Mulligan: le carte scelte tornano nel mazzo e ne peschi altrettante
function cambiaCarte(i, uids) {
  const p = G.g[i];
  const via = p.mano.filter(h => uids.includes(h.uid));
  if (!via.length) return;
  p.mano = p.mano.filter(h => !uids.includes(h.uid));
  for (let k = 0; k < via.length; k++) pesca(p);
  p.mazzo.push(...via.map(h => h.carta));
  mescola(p.mazzo);
}

function iniziaPartita() {
  const secondo = G.g[1 - G.primo];
  secondo.mano.push({ uid: nuovoUid(), carta: LA_MONETA });
  G.fase = 'gioco';
  G.registra = true;
  iniziaTurno(G.primo);
}

// ---------- Turni ----------
function iniziaTurno(i) {
  G.turno = i;
  G.numeroTurno++;
  const p = G.g[i];
  p.manaMax = Math.min(REGOLE.MANA_MAX, p.manaMax + 1);
  p.mana = p.manaMax;
  p.potereUsato = false;
  for (const m of p.campo) { m.dorme = false; m.attacchiFatti = 0; }
  // Finiscono gli indebolimenti lanciati da questo giocatore ("fino al tuo prossimo turno")
  for (const q of G.g) for (const m of q.campo) m.malus = m.malus.filter(x => x.da !== i);
  log(chi(i, '— Il tuo turno —', '— Turno del computer —'));
  anima({ tipo: 'turno', lato: i });

  // Galera: dopo un turno saltato, il personaggio fa il comeback
  for (const m of p.campo) {
    if (!m.galera) continue;
    m.galera--;
    if (!m.galera) {
      log(`${m.carta.nome} esce di galera: COMEBACK!`);
      anima({ tipo: 'comeback', uid: m.uid });
    }
  }

  pesca(p);

  // Simbolo LORO: pesca extra, e ogni personaggio del Campo dell'Oro pescato scende subito in campo
  if (p.loro) {
    for (let k = 0; k < REGOLE.MAX_PESCA_LORO; k++) {
      const h = pesca(p);
      if (!h) break;
      if (h.carta.tipo === 'servitore' && diCampoOro(h.carta) && p.campo.length < REGOLE.MAX_CAMPO) {
        log(`LORO: ${h.carta.nome} scende in campo!`);
        evocaDallaMano(i, h);
      } else break;
    }
  }

  dopoAzione();
  const animato = Eventi.suCambio();
  if (G.fase === 'gioco' && i === 1) IA.giocaTurno(animato);
}

function fineTurno() {
  if (G.fase !== 'gioco' || G.scelta) return;
  const i = G.turno, p = G.g[i];
  for (const m of [...p.campo]) {
    if (m.carta.fineTurno && !m.silenziato && attivo(m) && m.vita > 0) applica(i, m.carta.fineTurno, { fonte: m });
  }
  rimuoviMorti();
  // Chi era congelato da prima di questo turno si scongela
  for (const x of [p.eroe, ...p.campo]) {
    if (x.congelato && x.congelatoNelTurno !== G.numeroTurno) x.congelato = false;
  }
  controllaFine();
  if (G.fase !== 'gioco') { Eventi.suCambio(); return; }
  iniziaTurno(1 - i);
}

// Restituisce la carta pescata (o null se il mazzo è finito o la mano è piena)
function pesca(p) {
  if (!p.mazzo.length) {
    p.fatica++;
    log(`${chi(p.lato, 'Il tuo', 'Il suo')} mazzo è finito: ${p.fatica} danni da Fatica!`);
    infliggi(null, p.eroe, p.fatica);
    return null;
  }
  const carta = p.mazzo.pop();
  if (p.mano.length >= REGOLE.MAX_MANO) {
    log(`Mano piena: "${carta.nome}" è bruciata!`);
    anima({ tipo: 'brucia', lato: p.lato, carta });
    return null;
  }
  const h = { uid: nuovoUid(), carta };
  p.mano.push(h);
  anima({ tipo: 'pesca', lato: p.lato, uid: h.uid });
  return h;
}

// ---------- Giocare le carte ----------
function sceltaEffetti(effetti) {
  const e = comeLista(effetti).find(x => SCELTE.includes(bersaglioDi(x)));
  return e ? bersaglioDi(e) : null;
}

function sceltaRichiesta(c) {
  if (c.tipo === 'servitore') return sceltaEffetti(c.grido);
  if (c.tipo === 'magia') return sceltaEffetti(c.effetto);
  return null;
}

function bersagliScelta(i, chiave, fonte) {
  const me = G.g[i], nem = G.g[1 - i];
  const mieiServ = me.campo.filter(attivo);
  const servNemici = nem.campo.filter(m => attivo(m) && !ha(m, 'furtivita'));
  let lista;
  switch (chiave) {
    case 'qualsiasi': lista = [me.eroe, ...mieiServ, nem.eroe, ...servNemici]; break;
    case 'nemico': lista = [nem.eroe, ...servNemici]; break;
    case 'amico': lista = [me.eroe, ...mieiServ]; break;
    case 'servitore': lista = [...mieiServ, ...servNemici]; break;
    case 'servitoreNemico': lista = servNemici; break;
    case 'servitoreAmico': lista = mieiServ; break;
    default: lista = [];
  }
  return lista.filter(x => x !== fonte);
}

// Simbolo: servono questi personaggi in campo o in mano (uno ciascuno)
function requisitoSoddisfatto(p, c, esclusa) {
  if (!c.requisito) return true;
  return c.requisito.every(id =>
    p.campo.some(m => m.carta.id === id) || p.mano.some(h => h !== esclusa && h.carta.id === id));
}

function puoGiocare(i, h) {
  const p = G.g[i], c = h.carta;
  if (G.fase !== 'gioco' || G.turno !== i || G.scelta) return false;
  if (c.costo > p.mana) return false;
  if (c.tipo === 'servitore' && p.campo.length >= REGOLE.MAX_CAMPO) return false;
  if (c.tipo === 'trappola' &&
      (p.segreti.length >= REGOLE.MAX_TRAPPOLE || p.segreti.some(s => s.id === c.id))) return false;
  if (!requisitoSoddisfatto(p, c, h)) return false;
  if (c.tipo === 'magia') {
    const k = sceltaRichiesta(c);
    if (k && !bersagliScelta(i, k, null).length) return false;
  }
  return true;
}

function creaServitore(c, i) {
  const m = {
    uid: nuovoUid(), lato: i, carta: c,
    atkBase: c.attacco, hpBase: c.vita,
    attacco: c.attacco, vita: c.vita, vitaMax: c.vita,
    abilita: new Set(c.abilita || []),
    dorme: true, attacchiFatti: 0, malus: [],
    congelato: false, silenziato: false, distrutto: false,
    galera: 0
  };
  if (ha(m, 'sdrumato')) m.galera = 2;
  return m;
}

function evoca(i, c) {
  const p = G.g[i];
  if (!c || p.campo.length >= REGOLE.MAX_CAMPO) return null;
  const m = creaServitore(c, i);
  p.campo.push(m);
  anima({ tipo: 'evoca', lato: i, m });
  if (m.galera) anima({ tipo: 'galera', uid: m.uid });
  return m;
}

// Evoca gratis un personaggio dalla mano (senza Grido di Battaglia)
function evocaDallaMano(i, h) {
  const p = G.g[i];
  if (p.campo.length >= REGOLE.MAX_CAMPO || !p.mano.includes(h)) return null;
  p.mano = p.mano.filter(x => x !== h);
  anima({ tipo: 'gioca', lato: i, uidMano: h.uid, carta: h.carta });
  const m = creaServitore(h.carta, i);
  p.campo.push(m);
  anima({ tipo: 'evoca', lato: i, m });
  if (m.galera) anima({ tipo: 'galera', uid: m.uid });
  return m;
}

function giocaCarta(i, uid, uidBersaglio) {
  const p = G.g[i];
  const idx = p.mano.findIndex(h => h.uid === uid);
  if (idx < 0 || !puoGiocare(i, p.mano[idx])) return false;
  const c = p.mano[idx].carta;

  let bersaglio = null;
  const k = sceltaRichiesta(c);
  if (k) {
    const validi = bersagliScelta(i, k, null);
    if (validi.length) {
      bersaglio = validi.find(x => x.uid === uidBersaglio);
      if (!bersaglio) return false;
    }
  }

  p.mano.splice(idx, 1);
  p.mana -= c.costo;
  anima({ tipo: 'gioca', lato: i, uidMano: uid, carta: c });

  if (c.tipo === 'servitore') {
    const m = creaServitore(c, i);
    p.campo.push(m);
    anima({ tipo: 'evoca', lato: i, m });
    if (m.galera) anima({ tipo: 'galera', uid: m.uid });
    log(`${chi(i, 'Giochi', 'Il computer gioca')} ${c.nome}.`);
    if (c.grido) applica(i, c.grido, { fonte: m, bersaglio, carta: c });
    rimuoviMorti();
    if (p.campo.includes(m)) attivaTrappole(1 - i, 'servitoreGiocato', { servitoreGiocato: m });
  } else if (c.tipo === 'magia') {
    log(`${chi(i, 'Lanci', 'Il computer lancia')} ${c.nome}.`);
    const ctx = { bersaglio, magia: true, carta: c };
    attivaTrappole(1 - i, 'magiaLanciata', ctx);
    if (ctx.annullato) log(`${c.nome} è stata annullata!`);
    else applica(i, c.effetto, ctx);
  } else if (c.tipo === 'trappola') {
    const ctx = { carta: c };
    attivaTrappole(1 - i, 'trappolaPiazzata', ctx);
    if (ctx.annullato) {
      log(`La trappola ${chi(i, c.nome, 'del computer')} è stata annullata!`);
    } else {
      p.segreti.push(c);
      log(chi(i, `Piazzi la trappola ${c.nome}.`, 'Il computer piazza una trappola…'));
    }
  }

  dopoAzione();
  return true;
}

function puoUsarePotere(i) {
  const p = G.g[i];
  if (G.fase !== 'gioco' || G.turno !== i || G.scelta || p.potereUsato || p.mana < POTERE_EROE.costo) return false;
  const k = sceltaEffetti(POTERE_EROE.effetto);
  return !k || bersagliScelta(i, k, null).length > 0;
}

function usaPotere(i, uidBersaglio) {
  if (!puoUsarePotere(i)) return false;
  const p = G.g[i];
  let bersaglio = null;
  const k = sceltaEffetti(POTERE_EROE.effetto);
  if (k) {
    bersaglio = bersagliScelta(i, k, null).find(x => x.uid === uidBersaglio);
    if (!bersaglio) return false;
  }
  p.mana -= POTERE_EROE.costo;
  p.potereUsato = true;
  log(`${chi(i, 'Usi', 'Il computer usa')} ${POTERE_EROE.nome}${bersaglio ? ' su ' + nomeDi(bersaglio) : ''}.`);
  anima({ tipo: 'potere', lato: i });
  applica(i, POTERE_EROE.effetto, { bersaglio, carta: POTERE_EROE });
  dopoAzione();
  return true;
}

// Scelta in sospeso del giocatore (es. "Busso": quale carta scartare)
function risolviScelta(i, uid) {
  const s = G.scelta;
  if (!s || s.lato !== i || !s.uids.includes(uid)) return false;
  scarta(i, uid);
  G.scelta = null;
  dopoAzione();
  return true;
}

function scarta(i, uid) {
  const p = G.g[i];
  const h = p.mano.find(x => x.uid === uid);
  if (!h) return;
  p.mano = p.mano.filter(x => x !== h);
  log(`${chi(i, 'Scarti', 'Il computer scarta')} ${h.carta.nome}.`);
  anima({ tipo: 'scarta', lato: i, uid, carta: h.carta });
}

// ---------- Attacchi ----------
function puoAttaccare(m) {
  if (!m || m.eroe || G.fase !== 'gioco' || G.turno !== m.lato || G.scelta) return false;
  if (m.galera || m.congelato || m.attacco <= 0) return false;
  if (m.attacchiFatti >= (ha(m, 'furiaDelVento') ? 2 : 1)) return false;
  if (m.dorme && !ha(m, 'carica') && !ha(m, 'assalto')) return false;
  return true;
}

// Con "Viecce" (Provocazione) si possono attaccare solo quei personaggi
function bersagliAttacco(i, m) {
  const nem = G.g[1 - i];
  const visibili = nem.campo.filter(x => attivo(x) && !ha(x, 'furtivita'));
  const prov = visibili.filter(x => ha(x, 'provocazione'));
  if (prov.length) return prov.map(x => x.uid);
  const lista = visibili.map(x => x.uid);
  if (!(m.dorme && !ha(m, 'carica'))) lista.push(nem.eroe.uid); // "Te Parto": niente eroe nel primo turno
  return lista;
}

function puoAttaccareOra(m) {
  return puoAttaccare(m) && bersagliAttacco(m.lato, m).length > 0;
}

function attacca(i, uidAttaccante, uidBersaglio) {
  const p = G.g[i], nem = G.g[1 - i];
  const a = p.campo.find(m => m.uid === uidAttaccante);
  if (!puoAttaccare(a) || !bersagliAttacco(i, a).includes(uidBersaglio)) return false;
  let b = trovaPersonaggio(uidBersaglio);

  a.attacchiFatti++;
  a.abilita.delete('furtivita');
  log(`${a.carta.nome} attacca ${nomeDi(b)}.`);

  const ctx = { attaccante: a, attaccato: b };
  attivaTrappole(1 - i, b.eroe ? 'eroeAttaccato' : 'servitoreAttaccato', ctx);
  rimuoviMorti();
  ricalcola();
  if (ctx.annullaAttacco) { controllaFine(); dopoAzione(); return true; }
  if (ctx.nuovoBersaglio && nem.campo.includes(ctx.nuovoBersaglio)) b = ctx.nuovoBersaglio;
  const bersaglioVivo = b.eroe ? b.vita > 0 : nem.campo.includes(b);
  if (!p.campo.includes(a) || !bersaglioVivo) { dopoAzione(); return true; }

  const dannoA = a.attacco, dannoB = b.eroe ? 0 : b.attacco;
  anima({ tipo: 'attacco', da: a.uid, a: b.uid, forza: dannoA });
  infliggi(a, b, dannoA);
  if (dannoB > 0) infliggi(b, a, dannoB);
  dopoAzione();
  return true;
}

// ---------- Danni, cure e morti ----------
function infliggi(fonte, b, v) {
  if (!b || v <= 0 || (!b.eroe && b.galera)) return 0;
  if (!b.eroe && ha(b, 'scudoDivino')) {
    b.abilita.delete('scudoDivino');
    anima({ tipo: 'scudo', uid: b.uid });
    return 0;
  }
  if (b.eroe) {
    const assorbito = Math.min(b.armatura, v);
    b.armatura -= assorbito;
    b.vita -= v - assorbito;
  } else {
    b.vita -= v;
  }
  anima({ tipo: 'danno', uid: b.uid, valore: v, vita: b.vita, armatura: b.armatura || 0 });
  if (fonte && !fonte.eroe && !b.eroe && ha(fonte, 'velenoso')) b.distrutto = true;
  if (fonte && !fonte.eroe && ha(fonte, 'furtoVitale')) cura(G.g[fonte.lato].eroe, v);
  return v;
}

function cura(x, v) {
  const prima = x.vita;
  x.vita = Math.min(x.vitaMax, x.vita + v);
  if (x.vita > prima) anima({ tipo: 'cura', uid: x.uid, valore: x.vita - prima, vita: x.vita });
}

function rimuoviMorti() {
  let ancora = true;
  while (ancora) {
    ancora = false;
    ricalcola();
    for (const p of G.g) {
      const morti = p.campo.filter(m => m.vita <= 0 || m.distrutto);
      if (!morti.length) continue;
      ancora = true;
      p.campo = p.campo.filter(m => !morti.includes(m));
      for (const m of morti) {
        log(`${m.carta.nome} è stato FUMATO.`);
        anima({ tipo: 'morte', uid: m.uid });
        mettiAlCimitero(p, m);
        if (m.carta.rantolo && !m.silenziato) applica(p.lato, m.carta.rantolo, { fonte: m });
        attivaTrappole(p.lato, 'servitoreMorto', { servitoreMorto: m });
      }
    }
  }
}

function mettiAlCimitero(p, m) {
  if (m.carta.fusione) p.cimitero.push(...m.carta.fusione);
  else if (!m.carta.token) p.cimitero.push(m.carta);
}

// Dopo ogni azione: morti, fusioni, aure e fine partita
function dopoAzione() {
  rimuoviMorti();
  for (const p of G.g) controllaTrio(p);
  ricalcola();
  controllaFine();
}

// ---------- Aure: statistiche che dipendono da cosa c'è in campo ----------
function ricalcola() {
  for (const p of G.g) {
    for (const m of p.campo) {
      let atk = m.atkBase, hp = m.hpBase;
      if (!m.silenziato && m.carta.aura === 'famiglia') {
        atk += p.campo.filter(x => x !== m && x.carta.tribu === 'famiglia').length;
      }
      if (p.terreno && diCampoOro(m.carta)) {
        atk += p.terreno.attacco;
        hp += p.terreno.vita;
      }
      for (const x of m.malus) atk -= x.v;
      m.attacco = Math.max(0, atk);
      const delta = hp - m.vitaMax;
      m.vitaMax = hp;
      if (delta > 0) m.vita += delta;
      else m.vita = Math.min(m.vita, m.vitaMax);
    }
  }
}

// ---------- Fusione del Trio ----------
const MEMBRI_TRIO = ['squiquirins', 'adripush', 'sashetto'];

function controllaTrio(p) {
  const membri = MEMBRI_TRIO.map(id => p.campo.find(m => m.carta.id === id && attivo(m)));
  if (membri.some(m => !m)) return;
  const idx = Math.min(...membri.map(m => p.campo.indexOf(m)));
  const abilita = new Set();
  for (const m of membri) for (const a of m.abilita) abilita.add(a);
  const c = {
    id: 'il-trio-' + nuovoUid(), nome: 'Il Trio', tipo: 'servitore', tribu: 'trio', set: 'campoOro',
    stelle: 2, emoji: '🧑‍🤝‍🧑', token: true,
    costo: membri.reduce((s, m) => s + m.carta.costo, 0),
    attacco: membri.reduce((s, m) => s + m.atkBase, 0),
    vita: membri.reduce((s, m) => s + m.hpBase, 0),
    abilita: [...abilita],
    fusione: membri.map(m => m.carta),
    frase: 'Squiquirins + Adripush + Sashetto'
  };
  const f = creaServitore(c, p.lato);
  f.vita = membri.reduce((s, m) => s + m.vita, 0);
  f.vitaMax = c.vita;
  f.dorme = membri.some(m => m.dorme);
  f.attacchiFatti = Math.max(...membri.map(m => m.attacchiFatti));
  p.campo = p.campo.filter(m => !membri.includes(m));
  p.campo.splice(Math.min(idx, p.campo.length), 0, f);
  log('Il Trio si è riunito: FUSIONE!');
  anima({ tipo: 'fusione', lato: p.lato, da: membri.map(m => m.uid), m: f });
}

// ---------- Fine partita ----------
function controllaFine() {
  if (G.fase === 'finita') return;
  const [a, b] = G.g;
  if (a.eroe.vita > 0 && b.eroe.vita > 0) return;
  G.fase = 'finita';
  G.scelta = null;
  G.vincitore = a.eroe.vita <= 0 && b.eroe.vita <= 0 ? -1 : a.eroe.vita <= 0 ? 1 : 0;
  anima({ tipo: 'fine', vincitore: G.vincitore });
}

// ---------- Trappole ----------
// Si attivano solo durante il turno dell'avversario
function attivaTrappole(i, evento, ctx) {
  if (G.fase !== 'gioco' || G.turno === i) return;
  const p = G.g[i];
  const tipi = EVENTI_TRAPPOLA[evento] || [evento];
  for (const t of [...p.segreti]) {
    if (!tipi.includes(t.attivazione)) continue;
    if (ctx.annullato || ctx.annullaAttacco) break;
    p.segreti.splice(p.segreti.indexOf(t), 1);
    log(`Trappola! ${t.nome}`);
    anima({ tipo: 'trappola', lato: i, carta: t });
    const cartaPrima = ctx.carta;
    ctx.carta = t;
    applica(i, t.effetto, ctx);
    ctx.carta = cartaPrima;
  }
}

// ---------- Effetti ----------
function dannoMagico(i) {
  return G.g[i].campo.reduce((tot, m) => tot + (m.silenziato ? 0 : m.carta.dannoMagico || 0), 0);
}

function risolviBersagli(i, chiave, ctx) {
  const me = G.g[i], nem = G.g[1 - i];
  const mieiServ = me.campo.filter(attivo), servNem = nem.campo.filter(attivo);
  if (SCELTE.includes(chiave)) return ctx.bersaglio ? [ctx.bersaglio] : [];
  switch (chiave) {
    case 'eroeNemico': return [nem.eroe];
    case 'mioEroe': return [me.eroe];
    case 'se': return ctx.fonte ? [ctx.fonte] : [];
    case 'tuttiNemici': return [...servNem, nem.eroe];
    case 'servitoriNemici': return servNem;
    case 'tuttiServitori': return [...mieiServ, ...servNem];
    case 'altriServitori': return [...mieiServ, ...servNem].filter(m => m !== ctx.fonte);
    case 'altriAmici': return mieiServ.filter(m => m !== ctx.fonte);
    case 'amiciCampoOro': return mieiServ.filter(m => diCampoOro(m.carta));
    case 'tutti': return [me.eroe, ...mieiServ, nem.eroe, ...servNem];
    case 'casualeNemico': return [casuale([...servNem, nem.eroe])];
    case 'casualeServitoreNemico': return servNem.length ? [casuale(servNem)] : [];
    case 'casualeAmico': {
      const amici = mieiServ.filter(m => m !== ctx.fonte);
      return amici.length ? [casuale(amici)] : [];
    }
    case 'attaccante': return ctx.attaccante ? [ctx.attaccante] : [];
    case 'attaccato': return ctx.attaccato && !ctx.attaccato.eroe ? [ctx.attaccato] : [];
    case 'servitoreGiocato': return ctx.servitoreGiocato ? [ctx.servitoreGiocato] : [];
    default: return [];
  }
}

function applica(i, effetti, ctx) {
  const me = G.g[i];
  for (const e of comeLista(effetti)) {
    const v = e.valore || 0;
    const bersagli = risolviBersagli(i, bersaglioDi(e), ctx);

    // Il "colpo" che parte dalla carta (o dall'eroe) verso i bersagli
    const soloSeStesso = bersagli.length === 1 && bersagli[0] === ctx.fonte;
    if (EFFETTI_CON_BERSAGLIO.includes(e.tipo) && bersagli.length && !soloSeStesso) {
      anima({
        tipo: 'proiettile', lato: i, effetto: e.tipo,
        da: ctx.fonte && attivo(ctx.fonte) ? ctx.fonte.uid : me.eroe.uid,
        a: bersagli.map(x => x.uid),
        emoji: ctx.carta?.emoji || ctx.fonte?.carta?.emoji || '✨'
      });
    }

    switch (e.tipo) {
      case 'danno': {
        const totale = v + (ctx.magia ? dannoMagico(i) : 0);
        for (const b of bersagli) infliggi(ctx.fonte || null, b, totale);
        break;
      }
      case 'cura':
        for (const b of bersagli) cura(b, v);
        break;
      case 'distruggi':
        for (const b of bersagli) if (!b.eroe) b.distrutto = true;
        break;
      case 'potenzia':
        potenzia(bersagli, e.attacco || 0, e.vita || 0);
        break;
      case 'malus':
        // Indebolimento temporaneo: dura fino al prossimo turno di chi l'ha lanciato
        for (const b of bersagli) if (!b.eroe) b.malus.push({ v: e.attacco || 0, da: i });
        ricalcola();
        for (const b of bersagli) if (!b.eroe) anima({ tipo: 'indebolisci', uid: b.uid, attacco: b.attacco, testo: `-${e.attacco} ATT` });
        break;
      case 'congela':
        for (const b of bersagli) {
          b.congelato = true;
          b.congelatoNelTurno = G.numeroTurno;
          anima({ tipo: 'congela', uid: b.uid });
        }
        break;
      case 'silenzia':
        for (const b of bersagli) {
          if (b.eroe) continue;
          b.abilita.clear();
          b.silenziato = true;
          b.congelato = false;
          b.malus = [];
          b.atkBase = b.carta.attacco;
          b.hpBase = b.carta.vita;
          ricalcola();
          anima({ tipo: 'silenzia', uid: b.uid });
        }
        break;
      case 'dona':
        for (const b of bersagli) {
          if (b.eroe) continue;
          for (const a of comeLista(e.abilita)) b.abilita.add(a);
          anima({ tipo: 'dona', uid: b.uid, testo: comeLista(e.abilita).map(a => ABILITA[a]?.nome || a).join(' + ').toUpperCase() + '!' });
        }
        break;
      case 'pesca':
        for (let k = 0; k < (v || 1); k++) pesca(me);
        break;
      case 'armatura':
        me.eroe.armatura += v;
        anima({ tipo: 'armatura', uid: me.eroe.uid, valore: v, armatura: me.eroe.armatura });
        break;
      case 'mana':
        me.mana = Math.min(REGOLE.MANA_MAX, me.mana + v);
        break;
      case 'evoca':
        for (let k = 0; k < (e.quantita || 1); k++) evoca(i, trovaCarta(e.carta));
        break;
      case 'annulla':
        ctx.annullato = true;
        break;

      // ----- Meccaniche del Campo dell'Oro -----
      case 'chiama': {
        // Evoca gratis dalla mano il personaggio migliore del tipo richiesto:
        // prima quelli che non sono già in campo (così il Trio si completa), poi il più forte
        const inCampo = new Set(me.campo.map(m => m.carta.id));
        const scelta = me.mano
          .filter(h => h.carta.tipo === 'servitore' && (!e.tribu || h.carta.tribu === e.tribu) &&
                       (e.maxStelle == null || (h.carta.stelle || 0) <= e.maxStelle))
          .sort((a, b) => (inCampo.has(a.carta.id) - inCampo.has(b.carta.id)) || (b.carta.costo - a.carta.costo))[0];
        if (scelta && me.campo.length < REGOLE.MAX_CAMPO) {
          log(`${ctx.fonte?.carta.nome || 'Chiama'} chiama ${scelta.carta.nome}!`);
          evocaDallaMano(i, scelta);
        }
        break;
      }
      case 'pescaPerAbilita': {
        const n = Math.min(e.max || 3, me.campo.filter(m => m !== ctx.fonte && ha(m, e.abilita)).length);
        for (let k = 0; k < n; k++) pesca(me);
        break;
      }
      case 'aSecco': {
        const h = pesca(me);
        if (!h || h.carta.id !== 'lui') {
          const candidati = me.campo.filter(m => attivo(m) && diCampoOro(m.carta) && !ha(m, 'carica'));
          if (candidati.length) {
            const b = candidati.sort((x, y) => y.attacco - x.attacco)[0];
            b.abilita.add('carica');
            anima({ tipo: 'dona', uid: b.uid, testo: 'INVELENATO!' });
          }
        }
        break;
      }
      case 'busso': {
        const pescate = [];
        for (let k = 0; k < 3; k++) { const h = pesca(me); if (h) pescate.push(h.uid); }
        if (pescate.length) {
          if (i === 1) scarta(1, IA.sceltaScarto(pescate));
          else G.scelta = { lato: 0, tipo: 'scarta', uids: pescate };
        }
        break;
      }
      case 'lui': {
        const doppio = me.bruno > 0;
        if (doppio) me.bruno--;
        const k = doppio ? 2 : 1;
        if (doppio) log('MA STAI CO BRUNO?! LUI vale doppio!');
        potenzia(risolviBersagli(i, 'amiciCampoOro', ctx), (e.attacco || 0) * k, (e.vita || 0) * k);
        if (doppio) anima({ tipo: 'statoEroe', lato: i, testo: 'DOPPIO!' });
        break;
      }
      case 'bruno':
        me.bruno++;
        anima({ tipo: 'statoEroe', lato: i, testo: 'IL PROSSIMO LUI VALE DOPPIO!' });
        break;
      case 'terreno':
        me.terreno = { carta: ctx.carta, attacco: e.attacco || 0, vita: e.vita || 0 };
        ricalcola();
        anima({ tipo: 'terreno', lato: i, carta: ctx.carta });
        break;
      case 'nascondi':
        // "A Casa": il personaggio attaccato scappa a casa (Impizzato) e l'attacco va a vuoto
        for (const b of risolviBersagli(i, 'attaccato', ctx)) {
          b.abilita.add('furtivita');
          anima({ tipo: 'dona', uid: b.uid, testo: 'A CASA! IMPIZZATO' });
          ctx.annullaAttacco = true;
        }
        break;
      case 'scudoUmano': {
        // Evoca un personaggio che si prende l'attacco al posto tuo
        const m = evoca(i, trovaCarta(e.carta));
        if (m) ctx.nuovoBersaglio = m;
        break;
      }
      case 'loro': {
        // Sacrifica i membri richiesti: dal campo vanno al cimitero, dalla mano vengono banditi
        for (const id of ctx.carta.requisito || []) {
          const m = me.campo.find(x => x.carta.id === id);
          if (m) {
            me.campo = me.campo.filter(x => x !== m);
            mettiAlCimitero(me, m);
            anima({ tipo: 'sacrificio', uid: m.uid });
            continue;
          }
          const h = me.mano.find(x => x.carta.id === id);
          if (h) {
            me.mano = me.mano.filter(x => x !== h);
            anima({ tipo: 'scarta', lato: i, uid: h.uid, carta: h.carta, bandito: true });
          }
        }
        // Il cimitero torna nel mazzo
        me.mazzo.push(...me.cimitero);
        me.cimitero = [];
        mescola(me.mazzo);
        me.loro = true;
        log(`${chi(i, 'Hai', 'Il computer ha')} attivato il simbolo LORO!`);
        anima({ tipo: 'simbolo', lato: i, carta: ctx.carta });
        break;
      }
    }
  }
}

function potenzia(bersagli, a, v) {
  for (const b of bersagli) {
    if (b.eroe) continue;
    b.atkBase += a;
    b.hpBase += v;
  }
  ricalcola();
  for (const b of bersagli) {
    if (b.eroe) continue;
    anima({ tipo: 'potenzia', uid: b.uid, attacco: b.attacco, vita: b.vita, testo: a ? `+${a}/+${v}` : `+${v} VITA` });
  }
}

// Righe "speciali" del testo di una carta (aure, requisiti) usate sia dal 3D sia dall'HTML
function righeSpeciali(c) {
  const r = [];
  if (c.aura === 'famiglia') r.push(['', 'Ha +1 attacco per ogni altro tuo personaggio Famiglia in campo.']);
  if (c.trio) r.push(['Fusione: ', 'con tutto il Trio in campo si fondono in uno solo, sommando attacco, vita e abilità.']);
  if (c.requisito) r.push(['Richiede ', '(in campo o in mano): ' + c.requisito.map(id => trovaCarta(id)?.nome || id).join(', ') + '.']);
  return r;
}

function etichettaTipo(c) {
  if (c.sottotipo === 'simbolo') return 'SIMBOLO';
  if (c.sottotipo === 'terreno') return 'EVENTO · TERRENO';
  const base = { servitore: 'PERSONAGGIO', magia: 'EVENTO', trappola: 'TRAPPOLA' }[c.tipo] || '';
  return c.tribu ? `${base} · ${TRIBU[c.tribu]}` : base;
}

// ---------- Testi delle carte ----------
const OGGETTO = {
  qualsiasi: 'un personaggio', nemico: 'un nemico', amico: 'un personaggio amico',
  servitore: 'un personaggio', servitoreNemico: 'un personaggio nemico', servitoreAmico: 'un tuo personaggio',
  eroeNemico: "l'eroe nemico", mioEroe: 'il tuo eroe', se: 'questo personaggio',
  tuttiNemici: 'tutti i nemici', servitoriNemici: 'tutti i personaggi nemici',
  tuttiServitori: 'tutti i personaggi', altriServitori: 'tutti gli altri personaggi',
  altriAmici: 'tutti i tuoi personaggi', amiciCampoOro: "tutti i tuoi personaggi del Campo dell'Oro",
  tutti: 'tutti i personaggi',
  casualeNemico: 'un nemico casuale', casualeServitoreNemico: 'un personaggio nemico casuale',
  casualeAmico: 'un altro tuo personaggio casuale', attaccante: "l'attaccante", attaccato: 'il personaggio attaccato',
  servitoreGiocato: 'quel personaggio'
};

function aOggetto(chiave) {
  const o = OGGETTO[chiave] || '';
  if (o.startsWith("l'")) return "all'" + o.slice(2);
  if (o.startsWith('il ')) return 'al ' + o.slice(3);
  if (o.startsWith('gli ')) return 'agli ' + o.slice(4);
  return 'a ' + o;
}

function descriviEffetto(e) {
  const b = bersaglioDi(e), v = e.valore || 0;
  switch (e.tipo) {
    case 'danno': return `Infliggi ${v} ${v === 1 ? 'danno' : 'danni'} ${aOggetto(b)}.`;
    case 'cura': return `Rigenera ${v} Salute ${aOggetto(b)}.`;
    case 'distruggi': return `Distruggi ${OGGETTO[b]}.`;
    case 'potenzia':
      if (!e.attacco) return `Dai +${e.vita} vita ${aOggetto(b)}.`;
      return `Dai +${e.attacco || 0}/+${e.vita || 0} ${aOggetto(b)}.`;
    case 'malus': return `${OGGETTO[b][0].toUpperCase() + OGGETTO[b].slice(1)} hanno -${e.attacco} attacco fino al tuo prossimo turno.`;
    case 'congela': return `Congela ${OGGETTO[b]}.`;
    case 'silenzia': return `Silenzia ${OGGETTO[b]}.`;
    case 'dona': return `Dai ${comeLista(e.abilita).map(a => ABILITA[a]?.nome || a).join(' e ')} ${aOggetto(b)}.`;
    case 'pesca': return (v || 1) === 1 ? 'Pesca una carta.' : `Pesca ${v} carte.`;
    case 'armatura': return `Ottieni ${v} Armatura.`;
    case 'mana': return `Ottieni ${v} mana solo per questo turno.`;
    case 'evoca': {
      const c = trovaCarta(e.carta);
      if (!c) return '';
      const q = e.quantita || 1;
      return `Evoca ${q === 1 ? 'un' : q} ${c.nome} ${c.attacco}/${c.vita}.`;
    }
    case 'annulla': return 'Annullala.';
    case 'chiama': {
      const tipo = e.tribu ? ` ${TRIBU[e.tribu].toLowerCase()}` : '';
      const stelle = e.maxStelle != null ? ` (max ${e.maxStelle}★)` : '';
      return `Chiama: evoca gratis dalla tua mano un personaggio${tipo}${stelle}.`;
    }
    case 'pescaPerAbilita': return `Pesca una carta per ogni tuo personaggio con ${ABILITA[e.abilita]?.nome || e.abilita} (max ${e.max || 3}).`;
    case 'aSecco': return "Pesca una carta. Se non è LUI, dai Invelenato a un tuo personaggio del Campo dell'Oro.";
    case 'busso': return 'Pesca 3 carte, poi scegline 1 da scartare.';
    case 'lui': return `Dai +${e.attacco}/+${e.vita} a tutti i tuoi personaggi del Campo dell'Oro.`;
    case 'bruno': return 'Il prossimo LUI che giochi vale doppio.';
    case 'terreno': return `Terreno: i tuoi personaggi del Campo dell'Oro hanno +${e.attacco}/+${e.vita} per tutta la partita.`;
    case 'nascondi': return 'Il personaggio scappa a casa: diventa Impizzato e l\'attacco va a vuoto.';
    case 'scudoUmano': {
      const c = trovaCarta(e.carta);
      return c ? `Evoca ${c.nome} ${c.attacco}/${c.vita} con Infamata: l'attacco colpisce lui.` : '';
    }
    case 'loro': return "Sacrifica i membri richiesti (dal campo vanno al cimitero, dalla mano vengono banditi) e rimischia il cimitero nel mazzo. Per il resto della partita, a inizio turno peschi una carta in più: se è un personaggio del Campo dell'Oro scende in campo e peschi ancora.";
    default: return '';
  }
}

function descrivi(effetti) {
  return comeLista(effetti).map(descriviEffetto).join(' ');
}
