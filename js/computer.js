'use strict';

// =====================================================================
//  INTELLIGENZA DEL COMPUTER
// =====================================================================
const IA = {
  PAUSA: 650, // millisecondi di "riflessione" tra una mossa e l'altra

  // Cambia le carte che costano più di 3 mana
  scegliMulligan(p) {
    return p.mano.filter(h => h.carta.costo > 3).map(h => h.uid);
  },

  // "animato" si risolve quando la grafica ha finito di mostrare l'inizio del turno
  async giocaTurno(animato) {
    const partita = G;
    const vivo = () => G === partita && G.fase === 'gioco' && G.turno === 1;
    const p = G.g[1];

    await animato;
    await pausa(IA.PAUSA);

    for (let giri = 0; giri < 20 && vivo(); giri++) {
      const mossa = IA.miglioreCarta();
      if (!mossa || !giocaCarta(1, mossa.uid, mossa.bersaglio)) break;
      await Eventi.suCambio();
      await pausa(IA.PAUSA);
    }

    // Potere Eroe (pesca una carta): lo usa col mana avanzato, se la mano non è quasi piena
    if (vivo() && puoUsarePotere(1) && p.mano.length < REGOLE.MAX_MANO - 1) {
      const k = sceltaEffetti(POTERE_EROE.effetto);
      const b = k ? IA.bersaglioPotere() : null;
      if ((!k || b) && usaPotere(1, b ? b.uid : null)) {
        await Eventi.suCambio();
        await pausa(IA.PAUSA);
        // Se la carta pescata si può giocare subito, la gioca
        const mossa = IA.miglioreCarta();
        if (vivo() && mossa && giocaCarta(1, mossa.uid, mossa.bersaglio)) {
          await Eventi.suCambio();
          await pausa(IA.PAUSA);
        }
      }
    }

    for (let giri = 0; giri < 30 && vivo(); giri++) {
      const m = p.campo.find(puoAttaccareOra);
      if (!m || !attacca(1, m.uid, IA.bersaglioAttacco(m))) break;
      await Eventi.suCambio();
      await pausa(IA.PAUSA * 0.6);
    }

    if (vivo()) fineTurno();
  },

  miglioreCarta() {
    const p = G.g[1];
    const opzioni = p.mano
      .filter(h => puoGiocare(1, h))
      .sort((a, b) => b.carta.costo - a.carta.costo);

    for (const h of opzioni) {
      const c = h.carta;
      if (c.id === LA_MONETA.id) {
        // La Moneta solo se permette di giocare una carta in più
        const serve = p.mano.some(x => x !== h && x.carta.costo === p.mana + 1);
        if (serve) return { uid: h.uid };
        continue;
      }
      const k = sceltaRichiesta(c);
      if (!k) {
        if (c.tipo === 'magia' && !IA.utileSenzaBersaglio(c)) continue;
        return { uid: h.uid };
      }
      const b = IA.scegliBersaglio(c, k);
      if (!b && c.tipo === 'magia') continue;
      return { uid: h.uid, bersaglio: b ? b.uid : null };
    }
    return null;
  },

  utileSenzaBersaglio(c) {
    const nem = G.g[0], me = G.g[1];
    const mieiOro = me.campo.filter(m => attivo(m) && diCampoOro(m.carta)).length;
    for (const e of comeLista(c.effetto)) {
      const b = bersaglioDi(e);
      const soloServitoriNemici = ['servitoriNemici', 'casualeServitoreNemico'].includes(b);
      if (EFFETTI_DANNOSI.includes(e.tipo) && soloServitoriNemici && !nem.campo.some(m => attivo(m) && m.attacco > 0)) return false;
      if (e.tipo === 'cura' && b === 'mioEroe' && me.eroe.vita >= me.eroe.vitaMax) return false;
      // LUI vale la pena solo con almeno 2 personaggi da potenziare
      if (e.tipo === 'lui' && mieiOro < 2) return false;
      if (e.tipo === 'terreno' && me.terreno?.carta.id === c.id) return false;
      if (e.tipo === 'bruno' && (me.bruno > 0 || !me.mano.some(h => h.carta.id === 'lui'))) return false;
      if (e.tipo === 'busso' && me.mano.length > REGOLE.MAX_MANO - 4) return false;
    }
    return true;
  },

  // "Busso": scarta la carta meno utile tra quelle pescate (la più costosa se è fuori portata, se no la più debole)
  sceltaScarto(uids) {
    const me = G.g[1];
    const carte = me.mano.filter(h => uids.includes(h.uid));
    const lontane = carte.filter(h => h.carta.costo > me.manaMax + 3).sort((a, b) => b.carta.costo - a.carta.costo);
    if (lontane.length) return lontane[0].uid;
    return carte.sort((a, b) => a.carta.costo - b.carta.costo)[0].uid;
  },

  scegliBersaglio(c, k) {
    const effetti = comeLista(c.tipo === 'servitore' ? c.grido : c.effetto);
    const e = effetti.find(x => SCELTE.includes(bersaglioDi(x)));
    const validi = bersagliScelta(1, k, null);
    if (!validi.length) return null;
    const me = G.g[1];
    const nemici = validi.filter(x => x.lato === 0);
    const amici = validi.filter(x => x.lato === 1);
    const obbligato = c.tipo === 'servitore' ? validi[0] : null;
    const perAttacco = (a, b) => b.attacco - a.attacco;

    if (EFFETTI_DANNOSI.includes(e.tipo)) {
      if (e.tipo === 'danno') {
        const v = (e.valore || 0) + (c.tipo === 'magia' ? dannoMagico(1) : 0);
        const uccidibili = nemici.filter(x => !x.eroe && x.vita <= v && !ha(x, 'scudoDivino')).sort(perAttacco);
        if (uccidibili.length) return uccidibili[0];
        const eroe = nemici.find(x => x.eroe);
        if (eroe) return eroe;
      }
      const servNemici = nemici.filter(x => !x.eroe).sort(perAttacco);
      if (servNemici.length) return servNemici[0];
      return nemici[0] || obbligato;
    }

    if (e.tipo === 'cura' && amici.includes(me.eroe) && me.eroe.vita < me.eroe.vitaMax) return me.eroe;
    const servAmici = amici.filter(x => !x.eroe).sort(perAttacco);
    if (servAmici.length) return servAmici[0];
    return amici[0] || obbligato;
  },

  bersaglioPotere() {
    const nem = G.g[0];
    const validi = bersagliScelta(1, 'nemico', null);
    const fragile = validi
      .filter(x => !x.eroe && x.vita <= 1 && !ha(x, 'scudoDivino'))
      .sort((a, b) => b.attacco - a.attacco)[0];
    return fragile || nem.eroe;
  },

  bersaglioAttacco(m) {
    const nem = G.g[0];
    const validi = bersagliAttacco(1, m);
    const serv = nem.campo.filter(x => validi.includes(x.uid));
    const eroeOk = validi.includes(nem.eroe.uid);
    const uccide = x => !ha(x, 'scudoDivino') && (m.attacco >= x.vita || ha(m, 'velenoso'));
    const sopravvive = x => ha(m, 'scudoDivino') || m.vita > x.attacco;
    const perAttacco = (a, b) => b.attacco - a.attacco;

    // Colpo finale
    if (eroeOk && m.attacco >= nem.eroe.vita + nem.eroe.armatura) return nem.eroe.uid;

    // Scambio vantaggioso: uccide e sopravvive
    const buoni = serv.filter(x => uccide(x) && sopravvive(x)).sort(perAttacco);
    if (buoni.length) return buoni[0].uid;

    if (!eroeOk) {
      const uccidibili = serv.filter(uccide).sort(perAttacco);
      return (uccidibili[0] || serv.sort((a, b) => a.vita - b.vita)[0]).uid;
    }

    // Elimina i servitori nemici pericolosi anche a costo di morire
    const pericolosi = serv.filter(x => uccide(x) && x.attacco >= m.attacco + 2).sort(perAttacco);
    if (pericolosi.length) return pericolosi[0].uid;

    return nem.eroe.uid;
  }
};
