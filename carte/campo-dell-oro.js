// =====================================================================
//  ESPANSIONE 1: CAMPO DELL'ORO  (mazzo di Gabbi)
//  36 carte: 20 personaggi, 8 eventi, 7 trappole + il simbolo LORO
// =====================================================================
ESPANSIONI.push({
  id: 'campo-dell-oro',
  nome: "Campo dell'Oro",
  autore: 'Gabbi',
  carte: [
    // ---------------- PERSONAGGI ----------------
    {
      id: 'janine', nome: 'Janine', tipo: 'servitore', set: 'campoOro', tribu: 'famiglia', stelle: 0, copie: 2,
      costo: 4, attacco: 1, vita: 3, emoji: '👩‍🦰',
      abilita: ['provocazione'],
      grido: { tipo: 'chiama', tribu: 'famiglia', maxStelle: 1 }
    },
    {
      id: 'antondick', nome: 'Antondick', tipo: 'servitore', set: 'campoOro', tribu: 'famiglia', stelle: 0, copie: 2,
      costo: 1, attacco: 1, vita: 2, emoji: '🧔',
      aura: 'famiglia'
    },
    {
      id: 'squiquirins', nome: 'Squiquirins', tipo: 'servitore', set: 'campoOro', tribu: 'trio', stelle: 0, copie: 2,
      costo: 2, attacco: 2, vita: 3, emoji: '🐿️',
      abilita: ['provocazione'], trio: true
    },
    {
      id: 'adripush', nome: 'Adripush', tipo: 'servitore', set: 'campoOro', tribu: 'trio', stelle: 0, copie: 2,
      costo: 3, attacco: 2, vita: 2, emoji: '💪',
      grido: { tipo: 'chiama', tribu: 'trio' }, trio: true
    },
    {
      id: 'sashetto', nome: 'Sashetto', tipo: 'servitore', set: 'campoOro', tribu: 'trio', stelle: 0, copie: 2,
      costo: 2, attacco: 3, vita: 1, emoji: '😏',
      abilita: ['furtivita'], trio: true
    },
    {
      id: 'valentina', nome: 'Valentina', tipo: 'servitore', set: 'campoOro', tribu: 'famiglia', stelle: 0, copie: 2,
      costo: 2, attacco: 1, vita: 1, emoji: '💘',
      grido: { tipo: 'pescaPerAbilita', abilita: 'provocazione', max: 3 }
    },
    {
      id: 'giannone', nome: 'Giannone', tipo: 'servitore', set: 'campoOro', tribu: 'famiglia', stelle: 1, copie: 2,
      costo: 6, attacco: 5, vita: 5, emoji: '🦍',
      abilita: ['assalto']
    },
    {
      id: 'er-sini', nome: 'Er Sini', tipo: 'servitore', set: 'campoOro', stelle: 1, copie: 2,
      costo: 3, attacco: 1, vita: 4, emoji: '🕵️',
      abilita: ['furtivita', 'velenoso']
    },
    {
      id: 'lanza', nome: 'Lanza', tipo: 'servitore', set: 'campoOro', stelle: 1, copie: 2,
      costo: 4, attacco: 2, vita: 7, emoji: '🗿',
      abilita: ['provocazione']
    },
    {
      id: 'zaccagna', nome: 'Zaccagna', tipo: 'servitore', set: 'campoOro', tribu: 'famiglia', stelle: 2, copie: 1,
      costo: 4, attacco: 6, vita: 5, emoji: '😈',
      abilita: ['assalto', 'sdrumato']
    },
    {
      id: 'manolo', nome: 'Manolo', tipo: 'servitore', set: 'campoOro', tribu: 'famiglia', stelle: 2, copie: 1,
      costo: 8, attacco: 7, vita: 4, emoji: '🐂',
      abilita: ['carica']
    },

    // ---------------- EVENTI (magie) ----------------
    {
      id: 'rotonda', nome: 'Rotonda', tipo: 'magia', sottotipo: 'terreno', set: 'campoOro', copie: 1,
      costo: 3, emoji: '🔄',
      effetto: { tipo: 'terreno', attacco: 1, vita: 1 }
    },
    {
      id: 'lui', nome: 'LUI', tipo: 'magia', set: 'campoOro', copie: 2,
      costo: 4, emoji: '👉',
      effetto: { tipo: 'lui', attacco: 2, vita: 1 }
    },
    {
      id: 'anfame', nome: 'Anfame', tipo: 'magia', set: 'campoOro', copie: 1,
      costo: 2, emoji: '🤬',
      effetto: { tipo: 'malus', attacco: 2, bersaglio: 'servitoriNemici' }
    },
    {
      id: 'a-secco', nome: 'A Secco', tipo: 'magia', set: 'campoOro', copie: 1,
      costo: 1, emoji: '🥃',
      effetto: { tipo: 'aSecco' }
    },
    {
      id: 'busso', nome: 'Busso', tipo: 'magia', set: 'campoOro', copie: 2,
      costo: 3, emoji: '🚪',
      effetto: { tipo: 'busso' }
    },
    {
      id: 'ma-stai-co-bruno', nome: "Ma Stai co' Bruno?", tipo: 'magia', set: 'campoOro', copie: 1,
      costo: 1, emoji: '🤨',
      effetto: { tipo: 'bruno' }
    },

    // ---------------- TRAPPOLE ----------------
    {
      id: 'a-casa', nome: 'A Casa', tipo: 'trappola', set: 'campoOro', copie: 2,
      costo: 2, emoji: '🏠', attivazione: 'servitoreAttaccato',
      effetto: { tipo: 'nascondi' }
    },
    {
      id: 'pantegana', nome: 'Pantegana', tipo: 'trappola', set: 'campoOro', copie: 1,
      costo: 3, emoji: '🐀', attivazione: 'servitoreGiocato',
      effetto: { tipo: 'danno', valore: 2, bersaglio: 'tuttiNemici' }
    },
    {
      id: 'piove', nome: 'Piove', tipo: 'trappola', set: 'campoOro', copie: 1,
      costo: 2, emoji: '🌧️', attivazione: 'servitoreAttaccato',
      effetto: { tipo: 'potenzia', attacco: 0, vita: 2, bersaglio: 'altriAmici' }
    },
    {
      id: 'becchi-0', nome: 'Becchi 0', tipo: 'trappola', set: 'campoOro', copie: 2,
      costo: 3, emoji: '🙅', attivazione: 'magiaOTrappola',
      effetto: { tipo: 'annulla' }
    },
    {
      id: 'american-bully', nome: 'American Bully', tipo: 'trappola', set: 'campoOro', copie: 1,
      costo: 3, emoji: '🐕', attivazione: 'personaggioAttaccato',
      effetto: { tipo: 'scudoUmano', carta: 'il-bully' }
    },
    {
      // Non entra nel mazzo: lo evoca la trappola American Bully
      id: 'il-bully', nome: 'Il Bully', tipo: 'servitore', set: 'campoOro', stelle: 0, token: true,
      costo: 2, attacco: 2, vita: 3, emoji: '🐕',
      abilita: ['velenoso']
    },

    // ---------------- SIMBOLO ----------------
    {
      id: 'loro', nome: 'LORO', tipo: 'magia', sottotipo: 'simbolo', set: 'campoOro', copie: 1,
      costo: 4, emoji: '⚜️',
      requisito: ['janine', 'valentina', 'giannone', 'manolo', 'zaccagna'],
      effetto: { tipo: 'loro' }
    }
  ]
});
