'use strict';

// =====================================================================
//  SCHERMO: disegna il tavolo e gestisce i tocchi del giocatore
// =====================================================================
const UI = {
  selezionato: null, // uid del mio servitore che sta per attaccare
  inAttesa: null,    // carta o Potere Eroe in attesa di un bersaglio
  daCambiare: new Set(),
  codaAnnunci: [],
  annuncioInCorso: false
};

const $ = sel => document.querySelector(sel);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Carte ----------
function testoCarta(c) {
  if (c.testo) return esc(c.testo);
  const righe = [];
  const ab = (c.abilita || []).map(a => `<b>${esc(ABILITA[a]?.nome || a)}</b>`);
  if (ab.length) righe.push(ab.join(', '));
  if (c.dannoMagico) righe.push(`<b>Danni Magici +${c.dannoMagico}</b>`);
  if (c.grido) righe.push(`<b>Grido di Battaglia:</b> ${esc(descrivi(c.grido))}`);
  if (c.rantolo) righe.push(`<b>Rantolo di Morte:</b> ${esc(descrivi(c.rantolo))}`);
  if (c.fineTurno) righe.push(`<b>Alla fine del tuo turno:</b> ${esc(descrivi(c.fineTurno))}`);
  if (c.tipo === 'trappola') {
    righe.push(`<b>Trappola:</b> ${esc(ATTIVAZIONI[c.attivazione] || '')} ${esc(descrivi(c.effetto))}`);
  } else if (c.effetto) {
    righe.push(esc(descrivi(c.effetto)));
  }
  return righe.join('<br>');
}

function arteHTML(c) {
  return c.immagine
    ? `<img src="${esc(c.immagine)}" alt="">`
    : `<span class="emoji">${esc(c.emoji || '❓')}</span>`;
}

const ETICHETTE = { servitore: 'PERSONAGGIO', magia: 'EVENTO', trappola: 'TRAPPOLA' };

function cartaHTML(c, { uid, classi = '', conFrase = false } = {}) {
  const azione = uid ? `data-azione="carta" data-uid="${uid}"` : '';
  return `
    <div class="carta tipo-${c.tipo} ${classi}" ${azione}>
      <div class="costo">${c.costo}</div>
      ${c.esempio ? '<div class="nastro">ESEMPIO</div>' : ''}
      <div class="arte">${arteHTML(c)}</div>
      <div class="nome">${esc(c.nome)}</div>
      ${c.sottotitolo ? `<div class="sottotitolo">${esc(c.sottotitolo)}</div>` : ''}
      <div class="testo">${testoCarta(c)}</div>
      ${conFrase && c.frase ? `<div class="frase">“${esc(c.frase)}”</div>` : ''}
      <div class="etichetta">${ETICHETTE[c.tipo] || ''}</div>
      ${c.tipo === 'servitore'
        ? `<div class="stat"><span class="atk">${c.attacco}</span><span class="hp">${c.vita}</span></div>`
        : ''}
    </div>`;
}

// ---------- Personaggi sul tavolo ----------
function iconeServitore(m) {
  const icone = [];
  for (const a of m.abilita) if (a !== 'provocazione' && a !== 'scudoDivino') icone.push(ABILITA[a]?.icona || '');
  if (!m.silenziato) {
    if (m.carta.rantolo) icone.push('💀');
    if (m.carta.fineTurno) icone.push('⏳');
    if (m.carta.dannoMagico) icone.push('🔮');
  }
  return icone.join('');
}

function servitoreHTML(m, evidenziati) {
  const classi = ['servitore'];
  if (ha(m, 'provocazione')) classi.push('provocazione');
  if (ha(m, 'scudoDivino')) classi.push('scudo');
  if (ha(m, 'furtivita')) classi.push('furtivo');
  if (m.congelato) classi.push('congelato');
  if (m.silenziato) classi.push('silenziato');
  if (m.lato === 0) {
    if (UI.selezionato === m.uid) classi.push('selezionato');
    else if (!UI.inAttesa && puoAttaccareOra(m)) classi.push('pronto');
  }
  if (evidenziati.includes(m.uid)) classi.push('bersaglio');
  const icone = iconeServitore(m);
  const atkClasse = m.attacco > m.carta.attacco ? 'su' : m.attacco < m.carta.attacco ? 'giu' : '';
  const hpClasse = m.vita < m.vitaMax ? 'giu' : m.vitaMax > m.carta.vita ? 'su' : '';
  return `
    <div class="${classi.join(' ')}" data-azione="personaggio" data-uid="${m.uid}">
      <div class="arte">${arteHTML(m.carta)}</div>
      <div class="nome">${esc(m.carta.nome)}</div>
      ${icone ? `<div class="icone">${icone}</div>` : ''}
      <span class="atk ${atkClasse}">${m.attacco}</span>
      <span class="hp ${hpClasse}">${m.vita}</span>
      ${m.dorme && m.lato === G.turno && !ha(m, 'carica') ? '<span class="zzz">💤</span>' : ''}
    </div>`;
}

function eroeHTML(p, evidenziati) {
  const e = p.eroe;
  const classi = ['eroe'];
  if (evidenziati.includes(e.uid)) classi.push('bersaglio');
  if (e.congelato) classi.push('congelato');
  return `
    <div class="${classi.join(' ')}" data-azione="personaggio" data-uid="${e.uid}">
      <span class="emoji">${e.emoji}</span>
      ${e.armatura > 0 ? `<span class="armatura">${e.armatura}</span>` : ''}
      <span class="hp ${e.vita < e.vitaMax ? 'giu' : ''}">${Math.max(0, e.vita)}</span>
    </div>`;
}

function potereHTML(p) {
  const mio = p.lato === 0;
  const attivo = mio && !UI.inAttesa && puoUsarePotere(0);
  const scelto = UI.inAttesa?.tipo === 'potere';
  const classi = ['potere', attivo ? 'attivo' : '', p.potereUsato ? 'usato' : '', scelto ? 'selezionato' : ''];
  return `
    <button class="${classi.join(' ')}" ${mio ? 'data-azione="potere"' : 'disabled'}
            title="Potere Eroe: ${esc(POTERE_EROE.nome)} — ${esc(descrivi(POTERE_EROE.effetto))}">
      <span class="emoji">${POTERE_EROE.emoji}</span>
      <span class="costo-potere">${POTERE_EROE.costo}</span>
    </button>`;
}

function trappoleHTML(p) {
  if (!p.segreti.length) return '';
  const icone = p.segreti.map(t => p.lato === 0
    ? `<span class="trappola-attiva" title="${esc(t.nome)}">${esc(t.emoji || '❓')}</span>`
    : '<span class="trappola-attiva nascosta" title="Trappola nascosta">❓</span>').join('');
  return `<div class="trappole">${icone}</div>`;
}

function manaHTML(p) {
  let gemme = '';
  for (let k = 0; k < Math.max(p.manaMax, p.mana); k++) gemme += `<i class="${k < p.mana ? 'piena' : ''}"></i>`;
  return `<div class="mana"><b>${p.mana}/${p.manaMax}</b><span class="gemme">${gemme}</span></div>`;
}

function infoHTML(p, evidenziati) {
  const nemico = p.lato === 1;
  return `
    <div class="info">
      <div class="eroe-e-potere">
        ${eroeHTML(p, evidenziati)}
        ${potereHTML(p)}
      </div>
      <div class="dettagli">
        <div class="nome-giocatore">${esc(p.nome)} ${trappoleHTML(p)}</div>
        ${manaHTML(p)}
        <div class="contatori">🂠 Mazzo: ${p.mazzo.length}${nemico ? ` · ✋ Mano: ${p.mano.length}` : ''}</div>
      </div>
    </div>`;
}

// ---------- Disegno del tavolo ----------
function bersagliEvidenziati() {
  if (G.fase !== 'gioco') return [];
  if (UI.inAttesa) return bersagliScelta(0, UI.inAttesa.chiave, null).map(x => x.uid);
  if (UI.selezionato) {
    const m = G.g[0].campo.find(x => x.uid === UI.selezionato);
    return m ? bersagliAttacco(0, m) : [];
  }
  return [];
}

function render() {
  const [io, cpu] = G.g;
  const mioTurno = G.fase === 'gioco' && G.turno === 0;
  if (!mioTurno) { UI.selezionato = null; UI.inAttesa = null; }
  const ev = bersagliEvidenziati();

  $('#info-nemico').innerHTML = infoHTML(cpu, ev);
  $('#info-mio').innerHTML = infoHTML(io, ev);
  $('#campo-nemico').innerHTML = cpu.campo.map(m => servitoreHTML(m, ev)).join('')
    || '<div class="vuoto">Campo vuoto</div>';
  $('#campo-mio').innerHTML = io.campo.map(m => servitoreHTML(m, ev)).join('')
    || '<div class="vuoto">Gioca un personaggio dalla tua mano</div>';

  $('#mano').innerHTML = io.mano.map(h => {
    const classi = [];
    if (mioTurno && puoGiocare(0, h)) classi.push('giocabile');
    if (UI.inAttesa?.uid === h.uid) classi.push('in-attesa');
    return cartaHTML(h.carta, { uid: h.uid, classi: classi.join(' ') });
  }).join('');

  const nienteDaFare = mioTurno && !UI.inAttesa && !UI.selezionato
    && !io.mano.some(h => puoGiocare(0, h))
    && !io.campo.some(puoAttaccareOra)
    && !puoUsarePotere(0);
  const bottone = $('#fine-turno');
  bottone.disabled = !mioTurno;
  bottone.classList.toggle('lampeggia', nienteDaFare);
  bottone.textContent = mioTurno ? 'Fine turno' : 'Turno nemico…';

  let stato;
  if (G.fase === 'finita') stato = 'Partita finita';
  else if (!mioTurno) stato = '🤖 Il computer sta pensando…';
  else if (UI.inAttesa) stato = '🎯 Scegli il bersaglio';
  else if (UI.selezionato) stato = '⚔️ Scegli chi attaccare';
  else stato = 'Il tuo turno: gioca carte e attacca con i personaggi che brillano';
  $('#stato').textContent = stato;
  $('#annulla').hidden = !(UI.inAttesa || UI.selezionato);

  $('#log').innerHTML = G.log.map(r => `<div>${esc(r)}</div>`).join('');

  mostraSegni();
}

// Numeri che volano sopra i personaggi colpiti o curati
function mostraSegni() {
  for (const s of G.segni) {
    const el = document.querySelector(`[data-azione="personaggio"][data-uid="${s.uid}"]`);
    if (!el) continue;
    if (s.tipo === 'danno') el.classList.add('colpito');
    const n = document.createElement('span');
    n.className = 'segno segno-' + s.tipo;
    n.textContent = s.testo;
    el.appendChild(n);
  }
  G.segni = [];
}

// ---------- Annunci (carte del computer e trappole) ----------
function annuncia(carta, titolo) {
  UI.codaAnnunci.push({ carta, titolo });
  if (!UI.annuncioInCorso) prossimoAnnuncio();
}

function prossimoAnnuncio() {
  const a = UI.codaAnnunci.shift();
  const box = $('#annuncio');
  if (!a) { UI.annuncioInCorso = false; box.hidden = true; return; }
  UI.annuncioInCorso = true;
  box.innerHTML = `<div class="annuncio-titolo">${esc(a.titolo)}</div>
    ${a.carta ? cartaHTML(a.carta) : '<div class="carta-retro">❓</div>'}`;
  box.hidden = false;
  setTimeout(prossimoAnnuncio, 1300);
}

// ---------- Finestre ----------
function apriFinestra(sel) { $(sel).hidden = false; }
function chiudiFinestre() { document.querySelectorAll('.finestra').forEach(f => (f.hidden = true)); }

function mostraMulligan() {
  UI.daCambiare.clear();
  $('#mulligan-titolo').textContent = G.primo === 0
    ? '🪙 Testa! Inizi tu'
    : '🪙 Croce! Inizia il computer (tu riceverai La Moneta)';
  disegnaMulligan();
  apriFinestra('#finestra-mulligan');
}

function disegnaMulligan() {
  $('#mulligan-carte').innerHTML = G.g[0].mano.map(h =>
    cartaHTML(h.carta, { uid: h.uid, classi: UI.daCambiare.has(h.uid) ? 'scartata' : 'tenuta' })).join('');
}

function mostraCollezione() {
  const gruppi = [
    ['🧑 Personaggi', 'servitore'],
    ['📅 Eventi', 'magia'],
    ['🪤 Trappole', 'trappola']
  ];
  const nostre = TUTTE_LE_CARTE.filter(c => !c.esempio);
  const esempi = TUTTE_LE_CARTE.filter(c => c.esempio);
  const sezione = (titolo, carte) => {
    if (!carte.length) return '';
    return `<h3>${titolo}</h3><div class="griglia">${carte.map(c => cartaHTML(c, { conFrase: true })).join('')}</div>`;
  };
  let html = '';
  for (const [titolo, tipo] of gruppi) html += sezione(titolo, nostre.filter(c => c.tipo === tipo));
  if (!nostre.length) html += '<p class="nota">Le vostre carte non ci sono ancora: arriveranno presto! 😄</p>';
  html += '<h2 class="separatore">Carte di esempio</h2><p class="nota">Servono a riempire il mazzo finché le vostre carte non bastano.</p>';
  for (const [titolo, tipo] of gruppi) html += sezione(titolo, esempi.filter(c => c.tipo === tipo));
  $('#griglia-collezione').innerHTML = html;
  apriFinestra('#finestra-collezione');
}

function mostraRegole() {
  $('#glossario').innerHTML =
    Object.values(ABILITA).map(a => `<li><b>${a.icona} ${esc(a.nome)}</b>: ${esc(a.spiega)}</li>`).join('') +
    ALTRE_PAROLE.map(([n, s]) => `<li><b>${esc(n)}</b>: ${esc(s)}</li>`).join('');
  apriFinestra('#finestra-regole');
}

function ispeziona(m) {
  const extra = [];
  if (m.congelato) extra.push('❄️ Congelato');
  if (m.silenziato) extra.push('🔇 Silenziato');
  const abilitaAttive = [...m.abilita].map(a => ABILITA[a]?.nome || a);
  if (abilitaAttive.length) extra.push('Abilità attive: ' + abilitaAttive.join(', '));
  $('#dettaglio').innerHTML = cartaHTML(m.carta, { conFrase: true }) +
    `<p class="stato-attuale">Ora: ⚔️ ${m.attacco} · ❤️ ${m.vita}/${m.vitaMax}${extra.length ? '<br>' + esc(extra.join(' · ')) : ''}</p>`;
  apriFinestra('#finestra-dettaglio');
}

function ispezionaCarta(c) {
  $('#dettaglio').innerHTML = cartaHTML(c, { conFrase: true });
  apriFinestra('#finestra-dettaglio');
}

function mostraFine() {
  const titoli = { 0: '🏆 Hai vinto!', 1: '💀 Hai perso!', '-1': '🤝 Pareggio!' };
  const testi = {
    0: 'Il computer non regge i tuoi meme.',
    1: 'Il computer ti ha memato. Rivincita?',
    '-1': 'Vi siete eliminati a vicenda.'
  };
  $('#fine-titolo').textContent = titoli[G.vincitore];
  $('#fine-testo').textContent = testi[G.vincitore];
  setTimeout(() => apriFinestra('#finestra-fine'), 900);
}

function avvia() {
  UI.selezionato = null;
  UI.inAttesa = null;
  UI.codaAnnunci = [];
  chiudiFinestre();
  nuovaPartita();
  render();
  mostraMulligan();
}

// ---------- Tocchi ----------
function annullaScelta() { UI.selezionato = null; UI.inAttesa = null; }

function toccoCarta(uid) {
  const h = G.g[0].mano.find(x => x.uid === uid);
  if (!h) return;
  if (UI.inAttesa?.uid === uid) { annullaScelta(); return; }
  annullaScelta();
  if (G.turno !== 0 || !puoGiocare(0, h)) { ispezionaCarta(h.carta); return; }
  const k = sceltaRichiesta(h.carta);
  if (k && bersagliScelta(0, k, null).length) UI.inAttesa = { tipo: 'carta', uid, chiave: k };
  else giocaCarta(0, uid, null);
}

function toccoPotere() {
  if (UI.inAttesa?.tipo === 'potere') { annullaScelta(); return; }
  annullaScelta();
  if (!puoUsarePotere(0)) return;
  const k = sceltaEffetti(POTERE_EROE.effetto);
  if (k) UI.inAttesa = { tipo: 'potere', chiave: k };
  else usaPotere(0, null);
}

function toccoPersonaggio(uid) {
  const x = trovaPersonaggio(uid);
  const validi = bersagliEvidenziati();

  if (UI.inAttesa) {
    if (validi.includes(uid)) {
      if (UI.inAttesa.tipo === 'carta') giocaCarta(0, UI.inAttesa.uid, uid);
      else usaPotere(0, uid);
    }
    annullaScelta();
    return;
  }

  if (UI.selezionato) {
    if (validi.includes(uid)) {
      attacca(0, UI.selezionato, uid);
      annullaScelta();
      return;
    }
    annullaScelta();
    if (uid !== UI.selezionato && x && x.lato === 0 && puoAttaccareOra(x)) UI.selezionato = uid;
    return;
  }

  if (!x || x.eroe) return;
  if (x.lato === 0 && G.turno === 0 && puoAttaccareOra(x)) UI.selezionato = uid;
  else ispeziona(x);
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-azione]');
  if (!el) return;
  const azione = el.dataset.azione;
  const uid = Number(el.dataset.uid);

  switch (azione) {
    case 'nuova': avvia(); return;
    case 'collezione': mostraCollezione(); return;
    case 'regole': mostraRegole(); return;
    case 'chiudi': chiudiFinestre(); return;
    case 'conferma-mulligan':
      cambiaCarte(0, [...UI.daCambiare]);
      chiudiFinestre();
      iniziaPartita();
      return;
  }

  if (G.fase === 'mulligan') {
    if (azione === 'carta') {
      if (UI.daCambiare.has(uid)) UI.daCambiare.delete(uid); else UI.daCambiare.add(uid);
      disegnaMulligan();
    }
    return;
  }
  if (G.fase !== 'gioco') return;

  switch (azione) {
    case 'carta': toccoCarta(uid); break;
    case 'potere': if (G.turno === 0) toccoPotere(); break;
    case 'personaggio': toccoPersonaggio(uid); break;
    case 'annulla': annullaScelta(); break;
    case 'fine':
      if (G.turno !== 0) return;
      annullaScelta();
      fineTurno();
      return;
  }
  render();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { annullaScelta(); chiudiFinestre(); if (G.fase === 'mulligan') apriFinestra('#finestra-mulligan'); render(); }
});

// Clic fuori dal riquadro: chiude la finestra (non quelle obbligatorie)
document.querySelectorAll('.finestra.chiudibile').forEach(f =>
  f.addEventListener('click', e => { if (e.target === f) f.hidden = true; }));

Eventi.suCambio = render;
Eventi.suAnnuncio = annuncia;
Eventi.suFine = mostraFine;

avvia();
