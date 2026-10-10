// =====================================================================
//  CARTE DI ESEMPIO
//  Riempiono il mazzo finché le vostre carte vere non bastano (ne servono 15).
//  Mostrano anche tutte le abilità disponibili.
// =====================================================================

const CARTE_ESEMPIO = [
  // ---------- Personaggi ----------
  {
    id: 'es-ritardatario', nome: "Quello dell'Arrivo tra 5 Min", tipo: 'servitore',
    costo: 1, attacco: 1, vita: 3, emoji: '⏰', abilita: ['provocazione'],
    frase: 'Sono sotto casa tua. (È ancora sotto la doccia)'
  },
  {
    id: 'es-gamer', nome: 'Il Gamer Tossico', tipo: 'servitore',
    costo: 2, attacco: 3, vita: 1, emoji: '🎮', abilita: ['carica'],
    frase: 'Non è colpa mia, è il lag.'
  },
  {
    id: 'es-santo', nome: 'Il Santo del Gruppo', tipo: 'servitore',
    costo: 2, attacco: 2, vita: 2, emoji: '😇', abilita: ['scudoDivino'],
    frase: 'Io non ho fatto niente, giuro.'
  },
  {
    id: 'es-lingua', nome: 'La Lingua Lunga', tipo: 'servitore',
    costo: 2, attacco: 1, vita: 2, emoji: '🐍', abilita: ['velenoso'],
    frase: 'Non lo dico per cattiveria, però…'
  },
  {
    id: 'es-nonna', nome: 'Nonna del Buongiorno', tipo: 'servitore',
    costo: 2, attacco: 1, vita: 3, emoji: '🌻',
    grido: { tipo: 'cura', valore: 4, bersaglio: 'mioEroe' },
    frase: 'Buon martedì a tutti 🌹☕'
  },
  {
    id: 'es-ubriaco', nome: "L'Ubriaco della Festa", tipo: 'servitore',
    costo: 2, attacco: 2, vita: 2, emoji: '🍺',
    rantolo: { tipo: 'danno', valore: 2, bersaglio: 'casualeNemico' },
    frase: 'Io sto benissimo. BENISSIMO.'
  },
  {
    id: 'es-scroccone', nome: 'Lo Scroccone', tipo: 'servitore',
    costo: 3, attacco: 2, vita: 3, emoji: '🤑',
    grido: { tipo: 'pesca', valore: 1 },
    frase: 'Ho lasciato il portafoglio in macchina.'
  },
  {
    id: 'es-fotografo', nome: 'Il Fotografo dei Piatti', tipo: 'servitore',
    costo: 3, attacco: 3, vita: 2, emoji: '📸',
    grido: { tipo: 'potenzia', attacco: 1, vita: 1, bersaglio: 'servitoreAmico' },
    frase: 'Aspettate, nessuno mangi!'
  },
  {
    id: 'es-visualizza', nome: 'Quello che Legge e Non Risponde', tipo: 'servitore',
    costo: 3, attacco: 3, vita: 2, emoji: '🥷', abilita: ['furtivita'],
    frase: '✓✓'
  },
  {
    id: 'es-dormiglione', nome: 'Quello che Dorme Fino alle 2', tipo: 'servitore',
    costo: 3, attacco: 2, vita: 4, emoji: '🧛', abilita: ['furtoVitale'],
    frase: 'Buongiorno. Sono le 14:30.'
  },
  {
    id: 'es-secchione', nome: 'Il Secchione', tipo: 'servitore',
    costo: 3, attacco: 2, vita: 3, emoji: '🤓', dannoMagico: 1,
    frase: 'Tecnicamente, si dice…'
  },
  {
    id: 'es-urlatore', nome: 'Quello che Urla in Chiamata', tipo: 'servitore',
    costo: 4, attacco: 3, vita: 3, emoji: '📢',
    grido: { tipo: 'danno', valore: 2, bersaglio: 'qualsiasi' },
    frase: 'MI SENTITE? MI SENTITE??'
  },
  {
    id: 'es-fidanzato', nome: 'Il Fidanzato Geloso', tipo: 'servitore',
    costo: 4, attacco: 3, vita: 6, emoji: '😤', abilita: ['provocazione'],
    frase: 'Chi è questo che ti mette like?'
  },
  {
    id: 'es-tiktoker', nome: 'Il TikToker', tipo: 'servitore',
    costo: 4, attacco: 2, vita: 4, emoji: '🎵', abilita: ['furiaDelVento'],
    frase: 'Rifacciamola, ero venuto male.'
  },
  {
    id: 'es-mamma', nome: 'Mamma che Chiama', tipo: 'servitore',
    costo: 4, attacco: 3, vita: 3, emoji: '📞',
    grido: { tipo: 'evoca', carta: 'es-fratellino', quantita: 2 },
    frase: 'Porta anche tuo fratello!'
  },
  {
    id: 'es-palestrato', nome: 'Il Palestrato', tipo: 'servitore',
    costo: 5, attacco: 5, vita: 4, emoji: '💪', abilita: ['assalto'],
    frase: 'Oggi gambe. Anche domani gambe.'
  },
  {
    id: 'es-cuoco', nome: 'Quello che Cucina per Tutti', tipo: 'servitore',
    costo: 5, attacco: 4, vita: 5, emoji: '👨‍🍳',
    fineTurno: { tipo: 'cura', valore: 2, bersaglio: 'mioEroe' },
    frase: 'Ho fatto la pasta per 3, siamo in 12.'
  },
  {
    id: 'es-boss', nome: 'Il Boss del Gruppo', tipo: 'servitore',
    costo: 7, attacco: 6, vita: 7, emoji: '👑', abilita: ['provocazione'],
    grido: { tipo: 'danno', valore: 1, bersaglio: 'servitoriNemici' },
    frase: 'Ho creato io questo gruppo, ricordatevelo.'
  },
  {
    // Non entra nel mazzo: viene evocato da "Mamma che Chiama"
    id: 'es-fratellino', nome: 'Il Fratellino', tipo: 'servitore', token: true,
    costo: 1, attacco: 1, vita: 1, emoji: '🧒'
  },

  // ---------- Eventi ----------
  {
    id: 'es-spoiler', nome: 'Spoiler del Finale', tipo: 'magia',
    costo: 1, emoji: '🤐',
    effetto: { tipo: 'danno', valore: 2, bersaglio: 'qualsiasi' },
    frase: 'Tanto alla fine muore, no?'
  },
  {
    id: 'es-palestra', nome: 'Iscrizione in Palestra', tipo: 'magia',
    costo: 1, emoji: '🏋️',
    effetto: { tipo: 'potenzia', attacco: 2, vita: 2, bersaglio: 'servitoreAmico' },
    frase: 'Da lunedì inizio. Sul serio stavolta.'
  },
  {
    id: 'es-vocale', nome: 'Vocale da 10 Minuti', tipo: 'magia',
    costo: 2, emoji: '🎤',
    effetto: [{ tipo: 'congela', bersaglio: 'nemico' }, { tipo: 'pesca', valore: 1 }],
    frase: 'Allora niente, ti volevo dire una cosa veloce…'
  },
  {
    id: 'es-colpa', nome: 'Dare la Colpa a un Altro', tipo: 'magia',
    costo: 1, emoji: '🫵',
    effetto: { tipo: 'silenzia', bersaglio: 'servitore' },
    frase: 'È stato lui!'
  },
  {
    id: 'es-pizza', nome: 'Pizza per Tutti', tipo: 'magia',
    costo: 3, emoji: '🍕',
    effetto: { tipo: 'pesca', valore: 2 },
    frase: 'Paga chi ha perso a FIFA.'
  },
  {
    id: 'es-screenshot', nome: 'Screenshot Compromettente', tipo: 'magia',
    costo: 3, emoji: '📱',
    effetto: { tipo: 'danno', valore: 2, bersaglio: 'servitoriNemici' },
    frase: 'Ho tutto salvato. TUTTO.'
  },
  {
    id: 'es-ghosting', nome: 'Ghosting', tipo: 'magia',
    costo: 4, emoji: '👻',
    effetto: { tipo: 'distruggi', bersaglio: 'servitoreNemico' },
    frase: 'Visualizzato alle 21:04.'
  },
  {
    id: 'es-felpa', nome: 'La Felpa Imbottita', tipo: 'magia',
    costo: 2, emoji: '🧥',
    effetto: { tipo: 'armatura', valore: 5 },
    frase: 'Fuori ci sono 22 gradi.'
  },

  // ---------- Trappole ----------
  {
    id: 'es-visualizzato', nome: 'Lasciato su Visualizzato', tipo: 'trappola',
    costo: 3, emoji: '🚫', attivazione: 'magiaLanciata',
    effetto: { tipo: 'annulla' },
    frase: 'Ok.'
  },
  {
    id: 'es-screen', nome: 'Ti Ho Fatto lo Screen', tipo: 'trappola',
    costo: 3, emoji: '🪞', attivazione: 'eroeAttaccato',
    effetto: { tipo: 'distruggi', bersaglio: 'attaccante' },
    frase: 'Ripetilo, dai.'
  },
  {
    id: 'es-aperitivo', nome: "L'Aperitivo Infinito", tipo: 'trappola',
    costo: 2, emoji: '🍹', attivazione: 'servitoreGiocato',
    effetto: { tipo: 'danno', valore: 4, bersaglio: 'servitoreGiocato' },
    frase: 'Uno e poi andiamo.'
  },
  {
    id: 'es-ciabatta', nome: 'Il Lancio della Ciabatta', tipo: 'trappola',
    costo: 2, emoji: '🩴', attivazione: 'servitoreAttaccato',
    effetto: { tipo: 'congela', bersaglio: 'attaccante' },
    frase: 'Mira perfetta dal salotto.'
  }
];
