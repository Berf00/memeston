// =====================================================================
//  INTERFACCIA HTML sopra il 3D: menu, finestre, banner e anteprime
// =====================================================================
import { LIVELLI, S, impostaQualita, salvaQualita } from './3d/scena.js';
import { audio, impostaMuto, impostaVolume, sbloccaAudio, suona } from './3d/suoni.js';

const $ = sel => document.querySelector(sel);

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Carte in HTML (collezione, anteprime, mulligan) ----------
export function testoCarta(c) {
  if (c.testo) return esc(c.testo);
  const righe = [];
  const ab = (c.abilita || []).map(a => `<b>${esc(ABILITA[a]?.nome || a)}</b>`);
  if (ab.length) righe.push(ab.join(', '));
  if (c.dannoMagico) righe.push(`<b>Danni Magici +${c.dannoMagico}</b>`);
  for (const [grassetto, normale] of righeSpeciali(c)) righe.push(`<b>${esc(grassetto)}</b>${esc(normale)}`);
  if (c.grido) righe.push(`<b>Grido di Battaglia:</b> ${esc(descrivi(c.grido))}`);
  if (c.rantolo) righe.push(`<b>Rantolo di Morte:</b> ${esc(descrivi(c.rantolo))}`);
  if (c.fineTurno) righe.push(`<b>Alla fine del tuo turno:</b> ${esc(descrivi(c.fineTurno))}`);
  if (c.tipo === 'trappola') righe.push(`<b>Trappola:</b> ${esc(ATTIVAZIONI[c.attivazione] || '')} ${esc(descrivi(c.effetto))}`);
  else if (c.effetto) righe.push(esc(descrivi(c.effetto)));
  return righe.join('<br>');
}


export function cartaHTML(c, { uid, classi = '', conFrase = false, azione = '' } = {}) {
  const arte = c.immagine
    ? `<img src="${esc(c.immagine)}" alt="">`
    : `<span class="emoji">${esc(c.emoji || '❓')}</span>`;
  return `
    <div class="carta tipo-${c.tipo} ${classi}" ${azione ? `data-azione="${azione}"` : ''} ${uid ? `data-uid="${uid}"` : ''}>
      <div class="costo">${c.costo}</div>
      ${c.stelle ? `<div class="stelle">${'★'.repeat(c.stelle)}</div>` : ''}
      ${c.esempio ? '<div class="nastro-esempio">ESEMPIO</div>' : ''}
      <div class="arte">${arte}</div>
      <div class="nome">${esc(c.nome)}</div>
      ${c.sottotitolo ? `<div class="sottotitolo">${esc(c.sottotitolo)}</div>` : ''}
      <div class="testo">${testoCarta(c)}</div>
      ${conFrase && c.frase ? `<div class="frase">“${esc(c.frase)}”</div>` : ''}
      <div class="etichetta">${esc(etichettaTipo(c))}</div>
      ${c.tipo === 'servitore' ? `<div class="stat"><span class="atk">${c.attacco}</span><span class="hp">${c.vita}</span></div>` : ''}
    </div>`;
}

// ---------- Finestre ----------
function apri(sel) { $(sel).hidden = false; }
export function chiudiFinestre() { document.querySelectorAll('.finestra:not(.obbligatoria)').forEach(f => (f.hidden = true)); }
export function finestraAperta() { return [...document.querySelectorAll('.finestra')].some(f => !f.hidden); }

let callbackMulligan = null, callbackNuova = null, callbackScelta = null;

// Scelta di una carta tra alcune (es. "Busso": quale scartare)
export function mostraScelta(titolo, carte, suScelta) {
  callbackScelta = suScelta;
  $('#scelta-titolo').textContent = titolo;
  $('#scelta-carte').innerHTML = carte.map(h => cartaHTML(h.carta, { uid: h.uid, azione: 'scelta-carta', classi: 'tenuta' })).join('');
  apri('#finestra-scelta');
}
export function sceltaAperta() { return !$('#finestra-scelta').hidden; }
const daCambiare = new Set();

export function init({ suNuova }) {
  callbackNuova = suNuova;
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-azione]');
    if (!el) return;
    const azione = el.dataset.azione;
    switch (azione) {
      case 'nuova': chiudiTutto(); callbackNuova(); break;
      case 'collezione': mostraCollezione(); break;
      case 'regole': mostraRegole(); break;
      case 'cronologia': mostraCronologia(); break;
      case 'impostazioni': mostraImpostazioni(); break;
      case 'chiudi': chiudiFinestre(); break;
      case 'mulligan-carta': {
        const uid = Number(el.dataset.uid);
        if (daCambiare.has(uid)) daCambiare.delete(uid); else daCambiare.add(uid);
        disegnaMulligan();
        break;
      }
      case 'scelta-carta': {
        const uid = Number(el.dataset.uid);
        $('#finestra-scelta').hidden = true;
        const cb = callbackScelta;
        callbackScelta = null;
        if (cb) cb(uid);
        break;
      }
      case 'conferma-mulligan': {
        $('#finestra-mulligan').hidden = true;
        const cb = callbackMulligan;
        callbackMulligan = null;
        if (cb) cb([...daCambiare]);
        break;
      }
      case 'audio':
        sbloccaAudio();
        impostaMuto(!audio().muto);
        aggiornaAudio();
        suona('bottone');
        break;
      case 'qualita': {
        const v = el.dataset.valore;
        if (v === 'auto') impostaQualita(S.qualita, false);
        else impostaQualita(v, true);
        salvaQualita(v);
        mostraImpostazioni();
        break;
      }
    }
  });
  document.querySelectorAll('.finestra:not(.obbligatoria)').forEach(f =>
    f.addEventListener('click', e => { if (e.target === f) f.hidden = true; }));
  addEventListener('keydown', e => { if (e.key === 'Escape') chiudiFinestre(); });
  const vol = $('#volume');
  vol.value = Math.round(audio().volume * 100);
  vol.addEventListener('input', () => { impostaVolume(vol.value / 100); if (audio().muto) { impostaMuto(false); aggiornaAudio(); } });
  vol.addEventListener('change', () => suona('pesca'));
  aggiornaAudio();
  S.suFps = fps => { const el = $('#fps'); if (el) el.textContent = `${Math.round(fps)} FPS · qualità ${LIVELLI[S.qualita].nome}${S.auto ? ' (auto)' : ''}`; };
}

function aggiornaAudio() {
  const muto = audio().muto;
  $('#bottone-audio').textContent = muto ? '🔇' : '🔊';
  $('#bottone-audio-2').textContent = muto ? '🔇 Suoni spenti (tocca per accendere)' : '🔊 Suoni accesi (tocca per spegnere)';
}

function chiudiTutto() {
  document.querySelectorAll('.finestra').forEach(f => (f.hidden = true));
}

export function mostraMulligan(primo, carte, suConferma) {
  callbackMulligan = suConferma;
  daCambiare.clear();
  $('#mulligan-titolo').textContent = primo === 0
    ? '🪙 Testa! Inizi tu'
    : '🪙 Croce! Inizia il computer (tu riceverai La Moneta)';
  $('#mulligan-carte').dataset.carte = JSON.stringify(carte.map(h => h.uid));
  ultimeCarteMulligan = carte;
  disegnaMulligan();
  apri('#finestra-mulligan');
}

let ultimeCarteMulligan = [];
function disegnaMulligan() {
  $('#mulligan-carte').innerHTML = ultimeCarteMulligan.map(h =>
    cartaHTML(h.carta, { uid: h.uid, azione: 'mulligan-carta', classi: daCambiare.has(h.uid) ? 'scartata' : 'tenuta' })).join('');
}

export function mostraFine(vincitore) {
  const titoli = { 0: '🏆 VITTORIA!', 1: '💀 SCONFITTA', '-1': '🤝 PAREGGIO' };
  const testi = {
    0: 'Il computer non regge i tuoi meme.',
    1: 'Il computer ti ha memato. Rivincita?',
    '-1': 'Vi siete eliminati a vicenda.'
  };
  $('#fine-titolo').textContent = titoli[vincitore];
  $('#fine-titolo').className = vincitore === 0 ? 'vittoria' : vincitore === 1 ? 'sconfitta' : '';
  $('#fine-testo').textContent = testi[vincitore];
  apri('#finestra-fine');
}

export function mostraCollezione() {
  const gruppi = [['🧑 Personaggi', 'servitore'], ['📅 Eventi', 'magia'], ['🪤 Trappole', 'trappola']];
  const esempi = TUTTE_LE_CARTE.filter(c => c.esempio && !c.token);
  const sezione = (titolo, carte) => carte.length
    ? `<h3>${titolo}</h3><div class="griglia">${carte.map(c => cartaHTML(c, { conFrase: true })).join('')}</div>` : '';
  let html = '';
  for (const esp of ESPANSIONI) {
    const carte = CARTE_NOSTRE.filter(c => c.espansione === esp.nome && !c.token);
    const totale = carte.reduce((s, c) => s + (c.copie || REGOLE.COPIE_PREDEFINITE), 0);
    html += `<h2 class="espansione">✨ ${esc(esp.nome)}</h2><p class="nota">Mazzo di ${esc(esp.autore)} · ${totale} carte</p>`;
    for (const [titolo, tipo] of gruppi) html += sezione(titolo, carte.filter(c => c.tipo === tipo));
  }
  if (!ESPANSIONI.length) html += '<p class="nota">Le vostre carte non ci sono ancora: arriveranno presto! 😄</p>';
  html += '<h2 class="separatore">Carte di esempio</h2><p class="nota">Non sono nel mazzo: servono solo a riempirlo quando le vostre carte non bastano.</p>';
  for (const [titolo, tipo] of gruppi) html += sezione(titolo, esempi.filter(c => c.tipo === tipo));
  $('#griglia-collezione').innerHTML = html;
  apri('#finestra-collezione');
}

export function mostraRegole() {
  $('#glossario').innerHTML =
    Object.values(ABILITA).map(a => `<li><b>${a.icona} ${esc(a.nome)}</b>: ${esc(a.spiega)}</li>`).join('') +
    ALTRE_PAROLE.map(([n, s]) => `<li><b>${esc(n)}</b>: ${esc(s)}</li>`).join('');
  apri('#finestra-regole');
}

export function mostraCronologia() {
  $('#cronologia').innerHTML = G && G.log.length
    ? G.log.map(r => `<li>${esc(r)}</li>`).join('')
    : '<li>Ancora niente.</li>';
  apri('#finestra-cronologia');
}

export function mostraImpostazioni() {
  const attuale = S.auto ? 'auto' : S.qualita;
  const opzioni = [['auto', 'Automatica (consigliata)'], ...Object.entries(LIVELLI).map(([k, v]) => [k, v.nome])];
  $('#opzioni-qualita').innerHTML = opzioni.map(([k, nome]) =>
    `<button class="opzione ${k === attuale ? 'attiva' : ''}" data-azione="qualita" data-valore="${k}">${esc(nome)}</button>`).join('');
  S.suFps?.(S.fps);
  apri('#finestra-impostazioni');
}

export function ispeziona(m) {
  const extra = [];
  if (m.congelato) extra.push('❄️ Congelato');
  if (m.silenziato) extra.push('🔇 Silenziato');
  if (m.dorme) extra.push('💤 Appena arrivato');
  $('#dettaglio').innerHTML = cartaHTML(m.carta, { conFrase: true }) +
    `<p class="stato-attuale">Ora: ⚔️ ${m.attacco} · ❤️ ${m.vita}/${m.vitaMax}${extra.length ? '<br>' + esc(extra.join(' · ')) : ''}</p>`;
  apri('#finestra-dettaglio');
}

// ---------- Anteprima al passaggio del mouse ----------
let timerAnteprima = null, anteprimaUid = null;
export function anteprima(m, x) {
  if (anteprimaUid === m.uid) return;
  anteprimaUid = m.uid;
  clearTimeout(timerAnteprima);
  timerAnteprima = setTimeout(() => {
    const box = $('#anteprima');
    box.innerHTML = cartaHTML(m.carta, { conFrase: true }) +
      `<div class="anteprima-stato">⚔️ ${m.attacco} · ❤️ ${m.vita}/${m.vitaMax}</div>`;
    box.classList.toggle('a-destra', x < innerWidth / 2);
    box.hidden = false;
  }, 280);
}
export function nascondiAnteprima() {
  anteprimaUid = null;
  clearTimeout(timerAnteprima);
  $('#anteprima').hidden = true;
}

// ---------- Banner e stato ----------
export function banner(lato) {
  const b = $('#banner');
  b.className = 'banner ' + (lato === 0 ? 'mio' : 'nemico');
  b.innerHTML = lato === 0
    ? '<div class="banner-testo">IL TUO TURNO</div><div class="banner-sotto">😎 fai vedere chi comanda</div>'
    : '<div class="banner-testo">TURNO DEL COMPUTER</div>';
  b.hidden = false;
  b.style.animation = 'none';
  void b.offsetWidth; // riavvia l'animazione CSS
  b.style.animation = '';
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.hidden = true; }, lato === 0 ? 1500 : 1000);
}

export function bannerTrappola() { bannerSpeciale('TRAPPOLA!', 'trappola'); }

export function bannerSpeciale(testo, classe) {
  const b = $('#banner');
  b.className = 'banner ' + classe;
  b.innerHTML = `<div class="banner-testo">${esc(testo)}</div>`;
  b.hidden = false;
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.hidden = true; }, 1300);
}

let ultimoStato = '';
export function stato(testo) {
  if (testo === ultimoStato) return;
  ultimoStato = testo;
  $('#stato').textContent = testo;
}

export function caricamentoFinito() {
  const c = $('#caricamento');
  c.classList.add('via');
  setTimeout(() => c.remove(), 600);
}

export function erroreWebGL() {
  $('#caricamento').innerHTML = '<div class="errore">😢 Il tuo browser non supporta la grafica 3D (WebGL).<br>Prova ad aggiornarlo o a usare Chrome.</div>';
}
