'use strict';

// =====================================================================
//  REGOLE DEL GIOCO (le stesse di base di Hearthstone)
// =====================================================================
const REGOLE = {
  VITA_EROE: 30,
  MANA_MAX: 10,
  MAX_MANO: 10,
  MAX_CAMPO: 7,
  CARTE_DIVERSE_NEL_MAZZO: 15, // 15 carte x 2 copie = mazzo da 30
  COPIE_PER_CARTA: 2,
  MAX_TRAPPOLE: 5,
  MANO_PRIMO: 3,
  MANO_SECONDO: 4
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
  scudoDivino: { nome: "'Nme Toccà", icona: '✨', spiega: 'Il primo danno che subisce viene ignorato. (Scudo Divino)' },
  furiaDelVento: { nome: 'Furia del Vento', icona: '💨', spiega: 'Può attaccare due volte per turno.' },
  furtivita: { nome: 'Furtività', icona: '🥷', spiega: 'Non può essere attaccato né bersagliato finché non attacca.' },
  velenoso: { nome: 'Zaccagnata', icona: '🧪', spiega: 'Distrugge qualsiasi personaggio a cui infligge danni. (Velenoso)' },
  furtoVitale: { nome: 'Furto Vitale', icona: '🩸', spiega: 'I danni che infligge curano il tuo eroe.' }
};

const ALTRE_PAROLE = [
  ['Grido di Battaglia', "Effetto che si attiva quando giochi il servitore dalla mano."],
  ['Rantolo di Morte', 'Effetto che si attiva quando il servitore muore.'],
  ['Alla fine del tuo turno', 'Effetto che si attiva ogni volta che finisci il turno.'],
  ['Danni Magici +X', 'Le tue magie che infliggono danni ne fanno X in più.'],
  ['Congelamento ❄️', 'Il personaggio congelato salta il suo prossimo attacco.'],
  ['Silenzio', 'Toglie al servitore tutte le abilità e i potenziamenti.'],
  ['Armatura', "Assorbe i danni prima della vita dell'eroe."],
  ['Trappola', "Resta nascosta e si attiva da sola durante il turno dell'avversario, quando succede la cosa scritta sulla carta."],
  ['Potere Eroe', `${POTERE_EROE.nome}: costa ${POTERE_EROE.costo} mana, una volta per turno.`],
  ['La Moneta', 'Chi gioca per secondo la riceve: ti dà 1 mana extra per un turno.'],
  ['Fatica', 'Se il mazzo è finito, ogni volta che dovresti pescare subisci danni (1, poi 2, poi 3…).']
];

const ATTIVAZIONI = {
  eroeAttaccato: 'Quando un nemico attacca il tuo eroe:',
  servitoreAttaccato: 'Quando un tuo servitore viene attaccato:',
  servitoreGiocato: "Quando l'avversario gioca un servitore:",
  magiaLanciata: "Quando l'avversario lancia una magia:",
  servitoreMorto: 'Quando un tuo servitore muore:'
};

// Bersagli che il giocatore sceglie toccando lo schermo
const SCELTE = ['qualsiasi', 'nemico', 'amico', 'servitore', 'servitoreNemico', 'servitoreAmico'];

const BERSAGLIO_PREDEFINITO = {
  danno: 'eroeNemico', cura: 'mioEroe', distruggi: 'servitoreNemico', potenzia: 'se',
  congela: 'nemico', silenzia: 'servitoreNemico', dona: 'se'
};

const EFFETTI_DANNOSI = ['danno', 'distruggi', 'congela', 'silenzia'];
const EFFETTI_CON_BERSAGLIO = ['danno', 'cura', 'distruggi', 'potenzia', 'congela', 'silenzia', 'dona'];

// ---------- Carte ----------
for (const c of CARTE_ESEMPIO) c.esempio = true;
const CARTE_NOSTRE = [...PERSONAGGI, ...EVENTI, ...TRAPPOLE];
const TUTTE_LE_CARTE = [...CARTE_NOSTRE, ...CARTE_ESEMPIO];

function trovaCarta(id) {
  if (id === LA_MONETA.id) return LA_MONETA;
  return TUTTE_LE_CARTE.find(c => c.id === id) || null;
}

const comeLista = x => (x == null ? [] : Array.isArray(x) ? x : [x]);
const bersaglioDi = e => e.bersaglio || BERSAGLIO_PREDEFINITO[e.tipo];

// ---------- Utilità ----------
let G = null;
let ultimoUid = 0;
const nuovoUid = () => ++ultimoUid;
const casuale = arr => arr[Math.floor(Math.random() * arr.length)];
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ha = (x, a) => !!x.abilita && x.abilita.has(a);
const chi = (i, tu, computer) => (i === 0 ? tu : computer);

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
  // Prima le nostre carte, poi riempie con quelle di esempio finché non sono abbastanza
  const nostre = mescola(CARTE_NOSTRE.filter(c => !c.token && !c.daCompletare));
  const esempi = mescola(CARTE_ESEMPIO.filter(c => !c.token));
  const scelte = nostre.concat(esempi).slice(0, REGOLE.CARTE_DIVERSE_NEL_MAZZO);
  const mazzo = [];
  for (const c of scelte) for (let k = 0; k < REGOLE.COPIE_PER_CARTA; k++) mazzo.push(c);
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
    mazzo: creaMazzo(), mano: [], campo: [], segreti: [], fatica: 0
  };
}

function nuovaPartita() {
  G = {
    g: [creaGiocatore(0, 'Tu', '😎'), creaGiocatore(1, 'Computer', '🤖')],
    fase: 'mulligan', turno: -1, numeroTurno: 0,
    primo: Math.random() < 0.5 ? 0 : 1,
    vincitore: null, log: [], anim: [], registra: false
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
  log(chi(i, '— Il tuo turno —', '— Turno del computer —'));
  anima({ tipo: 'turno', lato: i });
  pesca(p);
  controllaFine();
  const animato = Eventi.suCambio();
  if (G.fase === 'gioco' && i === 1) IA.giocaTurno(animato);
}

function fineTurno() {
  if (G.fase !== 'gioco') return;
  const i = G.turno, p = G.g[i];
  for (const m of [...p.campo]) {
    if (m.carta.fineTurno && !m.silenziato && m.vita > 0) applica(i, m.carta.fineTurno, { fonte: m });
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

function pesca(p) {
  if (!p.mazzo.length) {
    p.fatica++;
    log(`${chi(p.lato, 'Il tuo', 'Il suo')} mazzo è finito: ${p.fatica} danni da Fatica!`);
    infliggi(null, p.eroe, p.fatica);
    return;
  }
  const carta = p.mazzo.pop();
  if (p.mano.length >= REGOLE.MAX_MANO) {
    log(`Mano piena: "${carta.nome}" è bruciata!`);
    anima({ tipo: 'brucia', lato: p.lato, carta });
    return;
  }
  const h = { uid: nuovoUid(), carta };
  p.mano.push(h);
  anima({ tipo: 'pesca', lato: p.lato, uid: h.uid });
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
  const servNemici = nem.campo.filter(m => !ha(m, 'furtivita'));
  let lista;
  switch (chiave) {
    case 'qualsiasi': lista = [me.eroe, ...me.campo, nem.eroe, ...servNemici]; break;
    case 'nemico': lista = [nem.eroe, ...servNemici]; break;
    case 'amico': lista = [me.eroe, ...me.campo]; break;
    case 'servitore': lista = [...me.campo, ...servNemici]; break;
    case 'servitoreNemico': lista = servNemici; break;
    case 'servitoreAmico': lista = [...me.campo]; break;
    default: lista = [];
  }
  return lista.filter(x => x !== fonte);
}

function puoGiocare(i, h) {
  const p = G.g[i], c = h.carta;
  if (G.fase !== 'gioco' || G.turno !== i) return false;
  if (c.costo > p.mana) return false;
  if (c.tipo === 'servitore' && p.campo.length >= REGOLE.MAX_CAMPO) return false;
  if (c.tipo === 'trappola' &&
      (p.segreti.length >= REGOLE.MAX_TRAPPOLE || p.segreti.some(s => s.id === c.id))) return false;
  if (c.tipo === 'magia') {
    const k = sceltaRichiesta(c);
    if (k && !bersagliScelta(i, k, null).length) return false;
  }
  return true;
}

function creaServitore(c, i) {
  return {
    uid: nuovoUid(), lato: i, carta: c,
    attacco: c.attacco, vita: c.vita, vitaMax: c.vita,
    abilita: new Set(c.abilita || []),
    dorme: true, attacchiFatti: 0,
    congelato: false, silenziato: false, distrutto: false
  };
}

function evoca(i, c) {
  const p = G.g[i];
  if (!c || p.campo.length >= REGOLE.MAX_CAMPO) return null;
  const m = creaServitore(c, i);
  p.campo.push(m);
  anima({ tipo: 'evoca', lato: i, m });
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
    log(`${chi(i, 'Giochi', 'Il computer gioca')} ${c.nome}.`);
    if (c.grido) applica(i, c.grido, { fonte: m, bersaglio });
    rimuoviMorti();
    if (p.campo.includes(m)) attivaTrappole(1 - i, 'servitoreGiocato', { servitoreGiocato: m });
  } else if (c.tipo === 'magia') {
    log(`${chi(i, 'Lanci', 'Il computer lancia')} ${c.nome}.`);
    const ctx = { bersaglio, magia: true, carta: c };
    attivaTrappole(1 - i, 'magiaLanciata', ctx);
    if (ctx.annullato) log(`${c.nome} è stata annullata!`);
    else applica(i, c.effetto, ctx);
  } else if (c.tipo === 'trappola') {
    p.segreti.push(c);
    log(chi(i, `Piazzi la trappola ${c.nome}.`, 'Il computer piazza una trappola…'));
  }

  rimuoviMorti();
  controllaFine();
  return true;
}

function puoUsarePotere(i) {
  const p = G.g[i];
  if (G.fase !== 'gioco' || G.turno !== i || p.potereUsato || p.mana < POTERE_EROE.costo) return false;
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
  rimuoviMorti();
  controllaFine();
  return true;
}

// ---------- Attacchi ----------
function puoAttaccare(m) {
  if (!m || m.eroe || G.fase !== 'gioco' || G.turno !== m.lato) return false;
  if (m.congelato || m.attacco <= 0) return false;
  if (m.attacchiFatti >= (ha(m, 'furiaDelVento') ? 2 : 1)) return false;
  if (m.dorme && !ha(m, 'assalto')) return false;
  return true;
}

// Con la Provocazione si possono attaccare solo quei servitori
function bersagliAttacco(i, m) {
  const nem = G.g[1 - i];
  const visibili = nem.campo.filter(x => !ha(x, 'furtivita'));
  const prov = visibili.filter(x => ha(x, 'provocazione'));
  if (prov.length) return prov.map(x => x.uid);
  const lista = visibili.map(x => x.uid);
  if (!m.dorme) lista.push(nem.eroe.uid); // "Te Parto": niente eroe nel primo turno
  return lista;
}

function puoAttaccareOra(m) {
  return puoAttaccare(m) && bersagliAttacco(m.lato, m).length > 0;
}

function attacca(i, uidAttaccante, uidBersaglio) {
  const p = G.g[i], nem = G.g[1 - i];
  const a = p.campo.find(m => m.uid === uidAttaccante);
  if (!puoAttaccare(a) || !bersagliAttacco(i, a).includes(uidBersaglio)) return false;
  const b = trovaPersonaggio(uidBersaglio);

  a.attacchiFatti++;
  a.abilita.delete('furtivita');
  log(`${a.carta.nome} attacca ${nomeDi(b)}.`);

  attivaTrappole(1 - i, b.eroe ? 'eroeAttaccato' : 'servitoreAttaccato', { attaccante: a, attaccato: b });
  rimuoviMorti();
  const bersaglioVivo = b.eroe ? b.vita > 0 : nem.campo.includes(b);
  if (!p.campo.includes(a) || !bersaglioVivo) { controllaFine(); return true; }

  const dannoA = a.attacco, dannoB = b.eroe ? 0 : b.attacco;
  anima({ tipo: 'attacco', da: a.uid, a: b.uid, forza: dannoA });
  infliggi(a, b, dannoA);
  if (dannoB > 0) infliggi(b, a, dannoB);
  rimuoviMorti();
  controllaFine();
  return true;
}

// ---------- Danni, cure e morti ----------
function infliggi(fonte, b, v) {
  if (!b || v <= 0) return 0;
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
    for (const p of G.g) {
      const morti = p.campo.filter(m => m.vita <= 0 || m.distrutto);
      if (!morti.length) continue;
      ancora = true;
      p.campo = p.campo.filter(m => !morti.includes(m));
      for (const m of morti) {
        log(`${m.carta.nome} è stato eliminato.`);
        anima({ tipo: 'morte', uid: m.uid });
        if (m.carta.rantolo && !m.silenziato) applica(p.lato, m.carta.rantolo, { fonte: m });
        attivaTrappole(p.lato, 'servitoreMorto', { servitoreMorto: m });
      }
    }
  }
}

function controllaFine() {
  if (G.fase === 'finita') return;
  const [a, b] = G.g;
  if (a.eroe.vita > 0 && b.eroe.vita > 0) return;
  G.fase = 'finita';
  G.vincitore = a.eroe.vita <= 0 && b.eroe.vita <= 0 ? -1 : a.eroe.vita <= 0 ? 1 : 0;
  anima({ tipo: 'fine', vincitore: G.vincitore });
}

// ---------- Trappole ----------
// Si attivano solo durante il turno dell'avversario
function attivaTrappole(i, evento, ctx) {
  if (G.fase !== 'gioco' || G.turno === i) return;
  const p = G.g[i];
  for (const t of [...p.segreti]) {
    if (t.attivazione !== evento) continue;
    p.segreti = p.segreti.filter(s => s !== t);
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
  if (SCELTE.includes(chiave)) return ctx.bersaglio ? [ctx.bersaglio] : [];
  switch (chiave) {
    case 'eroeNemico': return [nem.eroe];
    case 'mioEroe': return [me.eroe];
    case 'se': return ctx.fonte ? [ctx.fonte] : [];
    case 'tuttiNemici': return [...nem.campo, nem.eroe];
    case 'servitoriNemici': return [...nem.campo];
    case 'tuttiServitori': return [...me.campo, ...nem.campo];
    case 'altriServitori': return [...me.campo, ...nem.campo].filter(m => m !== ctx.fonte);
    case 'altriAmici': return me.campo.filter(m => m !== ctx.fonte);
    case 'tutti': return [me.eroe, ...me.campo, nem.eroe, ...nem.campo];
    case 'casualeNemico': return [casuale([...nem.campo, nem.eroe])];
    case 'casualeServitoreNemico': return nem.campo.length ? [casuale(nem.campo)] : [];
    case 'casualeAmico': {
      const amici = me.campo.filter(m => m !== ctx.fonte);
      return amici.length ? [casuale(amici)] : [];
    }
    case 'attaccante': return ctx.attaccante ? [ctx.attaccante] : [];
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
        da: ctx.fonte ? ctx.fonte.uid : me.eroe.uid,
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
        for (const b of bersagli) {
          if (b.eroe) continue;
          b.attacco += e.attacco || 0;
          b.vita += e.vita || 0;
          b.vitaMax += e.vita || 0;
          anima({ tipo: 'potenzia', uid: b.uid, attacco: b.attacco, vita: b.vita, testo: `+${e.attacco || 0}/+${e.vita || 0}` });
        }
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
          b.attacco = b.carta.attacco;
          b.vitaMax = b.carta.vita;
          b.vita = Math.min(b.vita, b.vitaMax);
          anima({ tipo: 'silenzia', uid: b.uid });
        }
        break;
      case 'dona':
        for (const b of bersagli) if (!b.eroe) for (const a of comeLista(e.abilita)) b.abilita.add(a);
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
    }
  }
}

// ---------- Testi delle carte ----------
const OGGETTO = {
  qualsiasi: 'un personaggio', nemico: 'un nemico', amico: 'un personaggio amico',
  servitore: 'un servitore', servitoreNemico: 'un servitore nemico', servitoreAmico: 'un servitore amico',
  eroeNemico: "l'eroe nemico", mioEroe: 'il tuo eroe', se: 'questo servitore',
  tuttiNemici: 'tutti i nemici', servitoriNemici: 'tutti i servitori nemici',
  tuttiServitori: 'tutti i servitori', altriServitori: 'tutti gli altri servitori',
  altriAmici: 'gli altri tuoi servitori', tutti: 'tutti i personaggi',
  casualeNemico: 'un nemico casuale', casualeServitoreNemico: 'un servitore nemico casuale',
  casualeAmico: 'un altro tuo servitore casuale', attaccante: "l'attaccante", servitoreGiocato: 'quel servitore'
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
    case 'potenzia': return `Dai +${e.attacco || 0}/+${e.vita || 0} ${aOggetto(b)}.`;
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
    default: return '';
  }
}

function descrivi(effetti) {
  return comeLista(effetti).map(descriviEffetto).join(' ');
}
