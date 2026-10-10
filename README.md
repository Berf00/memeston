# Memestone

Un gioco di carte in stile Hearthstone con carte meme tra amici, in 3D, giocabile dal browser contro il computer.

## Cartelle
- `carte/` — le carte: `personaggi.js`, `eventi.js`, `trappole.js` (più quelle di esempio in `esempio.js`)
- `img/` — le foto delle carte (`img/personaggi`, `img/eventi`, `img/trappole`)
- `js/regole.js` — le regole del gioco
- `js/computer.js` — l'intelligenza del computer
- `js/3d/` — la grafica 3D (Three.js): scena, oggetti, effetti, animazioni
- `js/interfaccia.js` — menu e finestre

## Aggiungere una carta
Apri il file giusto in `carte/`: in cima trovi le istruzioni e un esempio da copiare.
Per usare una foto invece dell'emoji, mettila nella cartella `img` e scrivi `immagine: "img/personaggi/nomefoto.jpg"`.

## Grafica
Dal pulsante ⚙️ si sceglie la qualità (Automatica, Ultra, Alta, Media, Bassa).
In automatico il gioco abbassa la qualità da solo se il dispositivo rallenta.
