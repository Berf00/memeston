// =====================================================================
//  ELENCO DELLE ESPANSIONI
//  Ogni espansione ha il suo file in questa cartella e si aggiunge qui con
//  ESPANSIONI.push({ id, nome, autore, carte: [...] }).
//
//  Campi di una carta:
//    id          nome breve senza spazi (es. "janine")
//    nome        il nome sulla carta
//    tipo        "servitore" (personaggio), "magia" (evento) o "trappola"
//    costo       mana per giocarla
//    copie       quante copie nel mazzo (di solito 2, le più forti 1)
//    stelle      livello del personaggio: 0, 1 o 2
//    tribu       "famiglia" o "trio" (facoltativo)
//    set         "campoOro" per le carte del Campo dell'Oro
//    attacco, vita            solo per i personaggi
//    abilita     ["provocazione" (Viecce), "assalto" (Te Parto), "carica" (Invelenato),
//                 "furtivita" (Impizzato), "velenoso" (Infamata), "scudoDivino" ('Nme Toccà),
//                 "sdrumato"]
//    grido       effetto quando lo giochi; effetto: cosa fa la magia/trappola
//    attivazione (trappole) quando scatta
//    immagine    foto, es. "img/personaggi/janine.jpg" (se manca si usa l'emoji)
//    frase       citazione meme (facoltativa)
// =====================================================================
const ESPANSIONI = [];
