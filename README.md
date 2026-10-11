# Memestone

Un gioco di carte in stile Hearthstone con carte meme tra amici, in 3D, giocabile dal browser contro il computer.

## Espansioni
- **Campo dell'Oro** (mazzo di Gabbi) — 36 carte: 20 personaggi, 8 eventi, 7 trappole + il simbolo LORO

## Abilità del gruppo
| Nome | In Hearthstone |
|---|---|
| Viecce | Provocazione |
| Te Parto | Assalto |
| Invelenato | Carica |
| Impizzato | Furtività |
| Infamata | Velenoso |
| 'Nme Toccà | Scudo Divino |
| Sdrumato | Dormiente (va in galera un turno, poi COMEBACK) |
| Chiama | Grido di Battaglia: evoca gratis un personaggio dalla mano |

## Cartelle
- `carte/espansioni.js` — l'elenco delle espansioni (con la spiegazione di tutti i campi di una carta)
- `carte/campo-dell-oro.js` — le carte del Campo dell'Oro
- `carte/esempio.js` — carte di esempio (riempiono il mazzo solo se le carte vere non bastano)
- `img/` — le foto delle carte
- `js/regole.js` — le regole del gioco
- `js/computer.js` — l'intelligenza del computer
- `js/3d/` — la grafica 3D (Three.js), gli effetti e i suoni
- `js/interfaccia.js` — menu e finestre

## Aggiungere un'espansione
Crea un file in `carte/` (copia `campo-dell-oro.js` come modello) e aggiungilo in `index.html` dopo `campo-dell-oro.js`.
