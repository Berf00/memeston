// =====================================================================
//  OGGETTI 3D: carte, personaggi, eroi, bottone e freccia
// =====================================================================
import * as THREE from 'three';
import { S, Z, MAT_ORO, rettangoloArrotondato, rimappaUV } from './scena.js';
import { smorza, lerp } from './motore.js';
import {
  texFronte, texRetro, texRitratto, texEroe, texPotere, texEmoji, texBottone, TexNumero, texScritta
} from './texture.js';

const PI = Math.PI;

// ---------- Materiali condivisi ----------
const MAT = {
  invisibile: new THREE.MeshBasicMaterial({ visible: false }),
  bordoCarta: new THREE.MeshStandardMaterial({ color: 0x24140a, roughness: 0.6 }),
  pietra: new THREE.MeshStandardMaterial({ color: 0x8a8ea2, roughness: 0.82, metalness: 0.05 }),
  attacco: new THREE.MeshStandardMaterial({ color: 0xf0b030, metalness: 0.6, roughness: 0.3 }),
  vita: new THREE.MeshStandardMaterial({ color: 0xd4302a, metalness: 0.35, roughness: 0.35 }),
  armatura: new THREE.MeshStandardMaterial({ color: 0xaab3c8, metalness: 0.85, roughness: 0.3 }),
  manaPieno: new THREE.MeshStandardMaterial({ color: 0x5aa8ff, emissive: 0x2a74ff, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.15 }),
  manaVuoto: new THREE.MeshStandardMaterial({ color: 0x2a3350, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.7 }),
  trappola: new THREE.MeshStandardMaterial({ color: 0xe0508a, emissive: 0xa0205a, emissiveIntensity: 1.1, metalness: 0.3, roughness: 0.25 }),
  carta: new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 0.9 })
};

function matRetro() {
  return new THREE.MeshStandardMaterial({ map: texRetro(), roughness: 0.5, metalness: 0.1, emissive: 0xffffff, emissiveMap: texRetro(), emissiveIntensity: 0.14 });
}
const MAT_RETRO = matRetro();

function matNumero(tex) {
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
}

function matAlone(colore = 0x5bff86) {
  return new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}

const COLORI_ANELLO = { pronto: 0x46ff7e, selezionato: 0xffd34d, bersaglio: 0xff3b3b };

// ---------- Forme ----------
function ellisse(rx, ry) {
  const s = new THREE.Shape();
  s.absellipse(0, 0, rx, ry, 0, PI * 2, false, 0);
  return s;
}

function scudo(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, h * 0.5);
  s.lineTo(w / 2, h * 0.5);
  s.lineTo(w / 2, 0);
  s.quadraticCurveTo(w / 2, -h * 0.35, 0, -h * 0.5);
  s.quadraticCurveTo(-w / 2, -h * 0.35, -w / 2, 0);
  s.closePath();
  return s;
}

function arco(w, h) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, -h / 2);
  s.lineTo(r, -h / 2);
  s.lineTo(r, h / 2 - r);
  s.absarc(0, h / 2 - r, r, 0, PI, false);
  s.lineTo(-r, -h / 2);
  return s;
}

// Geometria a "cupola" estrusa: il tappo superiore guarda in alto (+y) e la sua forma è verticale sullo schermo
function estrusoPiatto(forma, w, h, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(forma, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 40
  });
  rimappaUV(g, w, h);
  g.rotateX(-PI / 2);
  return g;
}

// ---------- Shader dello Scudo Divino (bordo luminoso tipo fresnel) ----------
function matScudoDivino() {
  return new THREE.ShaderMaterial({
    uniforms: { tempo: { value: 0 }, colore: { value: new THREE.Color(0xffd86b) }, forza: { value: 1 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float tempo; uniform vec3 colore; uniform float forza;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(vN, vV)), 2.0);
        float p = 0.7 + 0.3 * sin(tempo * 3.0 + vN.x * 4.0);
        float a = clamp(f * p * forza, 0.0, 1.0);
        gl_FragColor = vec4(colore * a * 1.6, a);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
}

// =====================================================================
//  CARTA
// =====================================================================
const CW = 1, CH = 1.4;
const geoFaccia = (() => { const g = new THREE.ShapeGeometry(rettangoloArrotondato(CW, CH, 0.075), 8); rimappaUV(g, CW, CH); return g; })();
const geoBordoCarta = (() => {
  const g = new THREE.ExtrudeGeometry(rettangoloArrotondato(CW, CH, 0.075), { depth: 0.016, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -0.008);
  return g;
})();
const geoAloneCarta = new THREE.ShapeGeometry(rettangoloArrotondato(CW + 0.16, CH + 0.16, 0.14), 8);

export class Carta3D {
  constructor(carta) {
    this.carta = carta;
    this.uid = null;
    const g = this.gruppo = new THREE.Group();
    if (carta) {
      const tex = texFronte(carta);
      this.matFronte = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.05, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.07 });
    } else {
      this.matFronte = null;
    }
    this.fronte = new THREE.Mesh(geoFaccia, this.matFronte || MAT_RETRO);
    this.fronte.position.z = 0.0085;
    const retro = new THREE.Mesh(geoFaccia, MAT_RETRO);
    retro.rotation.y = PI;
    retro.position.z = -0.0085;
    const bordo = new THREE.Mesh(geoBordoCarta, [MAT.invisibile, MAT.bordoCarta]);
    this.alone = new THREE.Mesh(geoAloneCarta, matAlone());
    this.alone.position.z = -0.014;
    g.add(this.alone, this.fronte, retro, bordo);
    g.userData.ref = this;

    this.target = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scala: 1 };
    this.molla = true;
    this.rapida = false;
    this.colAlone = null;
    this.fase = Math.random() * 10;
    this.vibrazione = 0;
  }

  imposta(pos, euler, scala) {
    this.target.pos.copy(pos);
    this.target.quat.setFromEuler(euler);
    this.target.scala = scala;
  }

  vibra() { this.vibrazione = 0.35; }

  tick(dt, t) {
    if (this.molla) {
      const k = smorza(dt, this.rapida ? 26 : 13);
      this.gruppo.position.lerp(this.target.pos, k);
      this.gruppo.quaternion.slerp(this.target.quat, k);
      this.gruppo.scale.setScalar(lerp(this.gruppo.scale.x, this.target.scala, k));
    }
    if (this.vibrazione > 0) {
      this.vibrazione -= dt;
      this.gruppo.position.x += Math.sin(t * 70) * 0.012;
    }
    const m = this.alone.material;
    const op = this.colAlone !== null ? 0.6 + 0.25 * Math.sin(t * 4 + this.fase) : 0;
    m.opacity += (op - m.opacity) * smorza(dt, 10);
    if (this.colAlone !== null) m.color.setHex(this.colAlone);
  }

  // Dissolvenza: sfuma solo il fronte (i materiali del retro sono condivisi tra tutte le carte)
  impostaOpacita(o) {
    if (this.matFronte) {
      this.matFronte.transparent = o < 1;
      this.matFronte.opacity = o;
    }
    for (const mesh of this.gruppo.children) {
      if (mesh !== this.fronte && mesh !== this.alone) mesh.visible = o >= 0.98;
    }
  }

  distruggi() {
    this.gruppo.removeFromParent();
    this.matFronte?.dispose();
    this.alone.material.dispose();
  }
}

// =====================================================================
//  PERSONAGGIO SUL CAMPO (token)
// =====================================================================
const RX = 0.5, RY = 0.62;
const geoBase = estrusoPiatto(ellisse(RX, RY), RX * 2, RY * 2, 0.1, 0.04);
const geoScudo = estrusoPiatto(scudo(1.32, 1.66), 1.32, 1.66, 0.07, 0.03);
const geoDisco = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 32);
const geoNumero = new THREE.PlaneGeometry(0.36, 0.36).rotateX(-PI / 2);
const geoAnello = new THREE.RingGeometry(0.6, 0.8, 64).rotateX(-PI / 2);
const geoBolla = new THREE.SphereGeometry(1, 32, 16);
const geoGhiaccio = new THREE.ShapeGeometry(ellisse(RX + 0.03, RY + 0.03), 40).rotateX(-PI / 2);

export class Token {
  constructor(m) {
    this.m = m;
    this.uid = m.uid;
    this.lato = m.lato;
    const g = this.gruppo = new THREE.Group();
    const c = this.corpo = new THREE.Group();
    g.add(c);

    this.matRitratto = new THREE.MeshStandardMaterial({ map: texRitratto(m.carta), roughness: 0.48, metalness: 0, emissive: 0x000000 });
    const base = new THREE.Mesh(geoBase, [this.matRitratto, MAT_ORO]);
    base.position.y = 0.04;
    base.castShadow = true;
    base.receiveShadow = true;
    c.add(base);

    this.scudo = new THREE.Mesh(geoScudo, MAT.pietra);
    this.scudo.position.set(0, 0.0, -0.04);
    this.scudo.castShadow = true;
    this.scudo.receiveShadow = true;
    c.add(this.scudo);

    this.numAtk = new TexNumero();
    this.numHp = new TexNumero();
    const discoAtk = new THREE.Mesh(geoDisco, MAT.attacco);
    discoAtk.position.set(-0.43, 0.16, 0.45);
    discoAtk.castShadow = true;
    const discoHp = new THREE.Mesh(geoDisco, MAT.vita);
    discoHp.position.set(0.43, 0.16, 0.45);
    discoHp.castShadow = true;
    const nAtk = new THREE.Mesh(geoNumero, matNumero(this.numAtk.tex));
    nAtk.position.set(-0.43, 0.205, 0.45);
    const nHp = new THREE.Mesh(geoNumero, matNumero(this.numHp.tex));
    nHp.position.set(0.43, 0.205, 0.45);
    c.add(discoAtk, discoHp, nAtk, nHp);

    this.anello = new THREE.Mesh(geoAnello, matAlone());
    this.anello.scale.set(1, 1, 1.24);
    this.anello.position.y = 0.012;
    c.add(this.anello);

    this.bolla = new THREE.Mesh(geoBolla, matScudoDivino());
    this.bolla.scale.set(0.76, 0.38, 0.92);
    this.bolla.position.y = 0.12;
    c.add(this.bolla);

    this.ghiaccio = new THREE.Mesh(geoGhiaccio, new THREE.MeshStandardMaterial({
      color: 0xbfeaff, emissive: 0x3aa0e0, emissiveIntensity: 0.5, transparent: true, opacity: 0.6, roughness: 0.08, metalness: 0.2
    }));
    this.ghiaccio.position.y = 0.19;
    c.add(this.ghiaccio);

    this.zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEmoji('💤'), transparent: true, depthWrite: false }));
    this.zzz.scale.setScalar(0.38);
    this.zzz.position.set(0.42, 0.55, -0.45);
    c.add(this.zzz);

    this.icone = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    this.icone.position.set(0, 0.32, 0.66);
    this.icone.visible = false;
    this.iconeTesto = '';
    c.add(this.icone);

    this.target = new THREE.Vector3();
    this.scalaTarget = 1;
    this.molla = true;
    this.statoAnello = null;
    this.scossa = 0;
    this.fase = Math.random() * 10;
    this.furtivo = false;
    this.aggiorna(m);
  }

  aggiorna(m) {
    this.m = m;
    const c = m.carta;
    this.mostraAttacco(m.attacco, m.attacco > c.attacco ? 'su' : m.attacco < c.attacco ? 'giu' : '');
    this.mostraVita(m.vita, m.vita < m.vitaMax ? 'giu' : m.vitaMax > c.vita ? 'su' : '');
    this.scudo.visible = ha(m, 'provocazione');
    this.bolla.visible = ha(m, 'scudoDivino');
    this.ghiaccio.visible = !!m.congelato;
    this.furtivo = ha(m, 'furtivita');
    this.zzz.visible = m.dorme && !ha(m, 'assalto');
    this.setSilenziato(m.silenziato);
    const icone = [];
    for (const a of m.abilita) if (!['provocazione', 'scudoDivino', 'furtivita'].includes(a)) icone.push(ABILITA[a]?.icona || '');
    if (!m.silenziato) {
      if (c.rantolo) icone.push('💀');
      if (c.fineTurno) icone.push('⏳');
      if (c.dannoMagico) icone.push('🔮');
    }
    this.impostaIcone(icone.join(''));
  }

  impostaIcone(testo) {
    if (testo === this.iconeTesto) return;
    this.iconeTesto = testo;
    if (this.icone.material.map) this.icone.material.map.dispose();
    if (!testo) { this.icone.visible = false; this.icone.material.map = null; return; }
    const { tex, aspetto } = texScritta(testo, { size: 80, emojiFont: true });
    this.icone.material.map = tex;
    this.icone.material.needsUpdate = true;
    this.icone.scale.set(0.24 * aspetto, 0.24, 1);
    this.icone.visible = true;
  }

  mostraAttacco(n, stato) { this.numAtk.set(n, stato); }
  mostraVita(n, stato) { this.numHp.set(Math.max(0, n), stato); }
  setScudoDivino(v) { this.bolla.visible = v; }
  setCongelato(v) { this.ghiaccio.visible = v; }
  setSilenziato(v) { this.matRitratto.color.setHex(v ? 0x8a8a8a : 0xffffff); if (v) { this.bolla.visible = false; this.scudo.visible = false; this.impostaIcone(''); } }
  setAnello(stato) { this.statoAnello = stato; }
  scuoti() { this.scossa = 0.32; }

  posizione() {
    const p = new THREE.Vector3();
    this.gruppo.getWorldPosition(p);
    p.y += 0.2;
    return p;
  }

  // Effetto "meme fritto" prima di morire
  friggi(e) {
    this.matRitratto.emissive.setRGB(e * 1.1, e * 0.3, e * 0.05);
    this.corpo.scale.setScalar(1 + e * 0.14);
    this.corpo.position.x = (Math.random() - 0.5) * 0.09 * e;
    this.corpo.position.z = (Math.random() - 0.5) * 0.09 * e;
  }

  tick(dt, t) {
    if (this.molla) {
      const k = smorza(dt, 12);
      this.gruppo.position.lerp(this.target, k);
      this.gruppo.scale.setScalar(lerp(this.gruppo.scale.x, this.scalaTarget, k));
    }
    if (this.scossa > 0) {
      this.scossa -= dt;
      this.corpo.position.x = Math.sin(t * 80) * 0.07 * (this.scossa / 0.32);
    } else if (this.corpo.position.x !== 0 && this.corpo.scale.x === 1) {
      this.corpo.position.x = 0;
    }
    // Anello di stato (pronto / selezionato / bersaglio)
    const am = this.anello.material;
    const target = this.statoAnello ? 0.75 + 0.25 * Math.sin(t * 5 + this.fase) : 0;
    am.opacity += (target - am.opacity) * smorza(dt, 12);
    if (this.statoAnello) am.color.setHex(COLORI_ANELLO[this.statoAnello]);
    this.anello.visible = am.opacity > 0.01;
    // Scudo divino che pulsa
    if (this.bolla.visible) this.bolla.material.uniforms.tempo.value = t;
    // Furtività: luccichio semitrasparente
    const op = this.furtivo ? 0.55 + 0.15 * Math.sin(t * 6 + this.fase) : 1;
    if (this.matRitratto.opacity !== op) {
      this.matRitratto.transparent = op < 1;
      this.matRitratto.opacity = op;
    }
    if (this.zzz.visible) {
      this.zzz.position.y = 0.6 + Math.sin(t * 2 + this.fase) * 0.07;
      this.zzz.material.opacity = 0.7 + 0.3 * Math.sin(t * 2 + this.fase);
    }
    if (this.ghiaccio.visible) this.ghiaccio.material.emissiveIntensity = 0.45 + 0.2 * Math.sin(t * 3 + this.fase);
  }

  distruggi() {
    this.gruppo.removeFromParent();
    this.matRitratto.dispose();
    this.numAtk.dispose();
    this.numHp.dispose();
    this.anello.material.dispose();
    this.bolla.material.dispose();
    this.ghiaccio.material.dispose();
    this.zzz.material.dispose();
    this.icone.material.map?.dispose();
    this.icone.material.dispose();
  }
}

// =====================================================================
//  EROE (con Potere Eroe, mana, mazzo e trappole)
// =====================================================================
const geoRitrattoEroe = estrusoPiatto(arco(1.36, 1.56), 1.36, 1.56, 0.12, 0.05);
const geoCorniceEroe = (() => {
  const esterno = arco(1.6, 1.8);
  esterno.holes.push(arco(1.36, 1.56));
  const g = new THREE.ExtrudeGeometry(esterno, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4, curveSegments: 40 });
  g.rotateX(-PI / 2);
  return g;
})();
const geoMoneta = new THREE.CylinderGeometry(0.4, 0.4, 0.09, 48);
const geoGemmaMana = new THREE.OctahedronGeometry(0.13, 0);
const geoTrappola = new THREE.CylinderGeometry(0.17, 0.17, 0.09, 6);
const geoMazzo = new THREE.BoxGeometry(0.74, 1, 1.02).translate(0, 0.5, 0);
const geoAnelloEroe = new THREE.RingGeometry(0.95, 1.18, 64).rotateX(-PI / 2);

const COLORI_EROE = [['#8fd0ff', '#3a64c8', '#141a4a'], ['#ff9f8a', '#b8344a', '#3a0c1e']];

export class Eroe3D {
  constructor(lato) {
    this.lato = lato;
    this.uid = null;
    const g = this.gruppo = new THREE.Group();
    g.position.set(0, 0, Z.eroe[lato]);
    S.scene.add(g);

    // Ritratto
    this.ritratto = new THREE.Group();
    this.ritratto.position.y = 0.14;
    g.add(this.ritratto);
    this.corpo = new THREE.Group();
    this.ritratto.add(this.corpo);
    this.matRitratto = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0 });
    const r = new THREE.Mesh(geoRitrattoEroe, [this.matRitratto, MAT_ORO]);
    r.castShadow = true;
    const cornice = new THREE.Mesh(geoCorniceEroe, MAT_ORO);
    cornice.castShadow = true;
    this.corpo.add(r, cornice);
    this.ghiaccio = new THREE.Mesh(estrusoPiatto(arco(1.4, 1.6), 1.4, 1.6, 0.02, 0.01), new THREE.MeshStandardMaterial({
      color: 0xbfeaff, emissive: 0x3aa0e0, emissiveIntensity: 0.5, transparent: true, opacity: 0.55, roughness: 0.08
    }));
    this.ghiaccio.position.y = 0.2;
    this.ghiaccio.visible = false;
    this.corpo.add(this.ghiaccio);

    // Vita e armatura
    this.numHp = new TexNumero();
    this.numArm = new TexNumero();
    const discoHp = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 40), MAT.vita);
    discoHp.position.set(0.66, 0.24, 0.62);
    discoHp.castShadow = true;
    const nHp = new THREE.Mesh(geoNumero, matNumero(this.numHp.tex));
    nHp.scale.setScalar(1.35);
    nHp.position.set(0.66, 0.295, 0.62);
    this.armatura = new THREE.Group();
    const discoArm = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 6), MAT.armatura);
    const nArm = new THREE.Mesh(geoNumero, matNumero(this.numArm.tex));
    nArm.scale.setScalar(1.15);
    nArm.position.y = 0.055;
    this.armatura.add(discoArm, nArm);
    this.armatura.position.set(0.66, 0.24, 0.05);
    this.armatura.visible = false;
    this.corpo.add(discoHp, nHp, this.armatura);

    this.anello = new THREE.Mesh(geoAnelloEroe, matAlone(0xff3b3b));
    this.anello.scale.set(1, 1, 1.15);
    this.anello.position.y = 0.02;
    this.ritratto.add(this.anello);
    this.ritratto.userData = { tipo: 'eroe', uid: null, lato };
    S.interattivi.add(this.ritratto);

    // Potere Eroe: una moneta che si gira quando viene usata
    this.potere = new THREE.Group();
    this.potere.position.set(1.62, 0.16, 0.2);
    g.add(this.potere);
    this.moneta = new THREE.Mesh(geoMoneta, [
      MAT_ORO,
      new THREE.MeshStandardMaterial({ map: texPotere(POTERE_EROE.emoji, false), roughness: 0.4, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ map: texPotere(POTERE_EROE.emoji, true), roughness: 0.5, metalness: 0.2 })
    ]);
    this.moneta.castShadow = true;
    this.potere.add(this.moneta);
    this.numCostoPotere = new TexNumero(96);
    this.numCostoPotere.set(POTERE_EROE.costo);
    const gemmaCosto = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 6), MAT.manaPieno);
    gemmaCosto.position.set(0, 0.06, -0.42);
    const nCosto = new THREE.Mesh(geoNumero, matNumero(this.numCostoPotere.tex));
    nCosto.scale.setScalar(0.7);
    nCosto.position.set(0, 0.1, -0.42);
    this.potere.add(gemmaCosto, nCosto);
    this.alonePotere = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.58, 48).rotateX(-PI / 2), matAlone());
    this.alonePotere.position.y = -0.1;
    this.potere.add(this.alonePotere);
    this.potere.userData = { tipo: 'potere', lato };
    if (lato === 0) S.interattivi.add(this.potere);
    this.potereGirato = 0;
    this.potereTarget = 0;
    this.potereAttivo = false;

    // Mazzo
    this.mazzo = new THREE.Mesh(geoMazzo, [MAT.carta, MAT.carta, matRetro(), MAT.carta, MAT.carta, MAT.carta]);
    this.mazzo.position.set(-1.85, 0.02, 0.15);
    this.mazzo.castShadow = true;
    this.mazzo.receiveShadow = true;
    g.add(this.mazzo);
    this.etichettaMazzo = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    this.etichettaMazzo.position.set(-1.85, 0.75, 0.75);
    g.add(this.etichettaMazzo);
    this.testoMazzo = null;

    // Cristalli di mana (griglia 5x2)
    this.mana = new THREE.Group();
    this.mana.position.set(2.45, 0.2, -0.25);
    g.add(this.mana);
    this.gemme = [];
    for (let i = 0; i < 10; i++) {
      const gm = new THREE.Mesh(geoGemmaMana, MAT.manaVuoto);
      gm.position.set((i % 5) * 0.3, 0, Math.floor(i / 5) * 0.34);
      gm.castShadow = true;
      gm.visible = false;
      gm.userData.pop = 0;
      this.mana.add(gm);
      this.gemme.push(gm);
    }
    this.etichettaMana = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    this.etichettaMana.position.set(0.6, 0.15, 0.85);
    this.mana.add(this.etichettaMana);
    this.testoMana = null;
    this.manaVisto = 0;

    // Trappole attive
    this.trappole = new THREE.Group();
    this.trappole.position.set(0, 0.34, -1.02);
    this.ritratto.add(this.trappole);
    this.numTrappole = -1;

    this.scossa = 0;
    this.statoAnello = false;
  }

  impostaEroe(eroe) {
    this.uid = eroe.uid;
    this.ritratto.userData.uid = eroe.uid;
    this.matRitratto.map?.dispose();
    this.matRitratto.map = texEroe(eroe.emoji, COLORI_EROE[this.lato]);
    this.matRitratto.needsUpdate = true;
    this.ritratto.visible = true;
    this.ritratto.scale.setScalar(1);
  }

  aggiorna(p) {
    if (this.uid !== p.eroe.uid) this.impostaEroe(p.eroe);
    this.mostraVita(p.eroe.vita, p.eroe.vita < p.eroe.vitaMax ? 'giu' : '');
    this.mostraArmatura(p.eroe.armatura);
    this.setCongelato(p.eroe.congelato);
    this.potereTarget = p.potereUsato ? PI : 0;
    this.aggiornaMazzo(p.mazzo.length);
    this.aggiornaMana(p.mana, p.manaMax);
    this.aggiornaTrappole(p.segreti);
  }

  mostraVita(n, stato) { this.numHp.set(Math.max(0, n), stato); }
  mostraArmatura(n) { this.armatura.visible = n > 0; if (n > 0) this.numArm.set(n); }
  setCongelato(v) { this.ghiaccio.visible = !!v; }
  setBersaglio(v) { this.statoAnello = v; }
  setPotereAttivo(v) { this.potereAttivo = v; }
  scuoti() { this.scossa = 0.35; }
  giraPotere() { this.potereTarget = PI; }

  posizione() {
    const p = new THREE.Vector3();
    this.ritratto.getWorldPosition(p);
    p.y += 0.25;
    return p;
  }

  posizioneMazzo() {
    const p = new THREE.Vector3();
    this.mazzo.getWorldPosition(p);
    p.y += this.mazzo.scale.y + 0.05;
    return p;
  }

  posizioneTrappole() {
    const p = new THREE.Vector3();
    this.trappole.getWorldPosition(p);
    return p;
  }

  aggiornaMazzo(n) {
    this.mazzo.visible = n > 0;
    this.mazzo.scale.y = Math.max(0.01, n * 0.016);
    const testo = String(n);
    if (testo !== this.testoMazzo) {
      this.testoMazzo = testo;
      this.etichettaMazzo.material.map?.dispose();
      const { tex, aspetto } = texScritta(`🂠 ${n}`, { size: 64 });
      this.etichettaMazzo.material.map = tex;
      this.etichettaMazzo.material.needsUpdate = true;
      this.etichettaMazzo.scale.set(0.34 * aspetto, 0.34, 1);
    }
  }

  aggiornaMana(mana, max) {
    this.gemme.forEach((g, i) => {
      g.visible = i < max;
      const piena = i < mana;
      if (piena && g.material !== MAT.manaPieno && i >= this.manaVisto) g.userData.pop = 1;
      g.material = piena ? MAT.manaPieno : MAT.manaVuoto;
    });
    this.manaVisto = mana;
    const testo = `${mana}/${max}`;
    if (testo !== this.testoMana) {
      this.testoMana = testo;
      this.etichettaMana.material.map?.dispose();
      const { tex, aspetto } = texScritta(testo, { size: 72, fill: '#bfe2ff', stroke: '#0a1a3a' });
      this.etichettaMana.material.map = tex;
      this.etichettaMana.material.needsUpdate = true;
      this.etichettaMana.scale.set(0.36 * aspetto, 0.36, 1);
    }
  }

  aggiornaTrappole(segreti) {
    if (segreti.length === this.numTrappole && this.trappole.userData.firma === segreti.map(s => s.id).join()) return;
    this.numTrappole = segreti.length;
    this.trappole.userData.firma = segreti.map(s => s.id).join();
    for (const c of [...this.trappole.children]) { c.removeFromParent(); c.children.forEach(s => s.material?.dispose?.()); }
    segreti.forEach((s, i) => {
      const gem = new THREE.Mesh(geoTrappola, MAT.trappola);
      gem.position.x = (i - (segreti.length - 1) / 2) * 0.42;
      gem.castShadow = true;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEmoji(this.lato === 0 ? (s.emoji || '❓') : '❓'), transparent: true, depthWrite: false }));
      sp.scale.setScalar(0.24);
      sp.position.y = 0.2;
      gem.add(sp);
      this.trappole.add(gem);
    });
  }

  tick(dt, t) {
    const k = smorza(dt, 10);
    // Moneta del potere: si gira quando usata
    this.potereGirato += (this.potereTarget - this.potereGirato) * k;
    this.moneta.rotation.z = this.potereGirato;
    this.potere.position.y = 0.16 + Math.sin(this.potereGirato) * 0.35;
    const ap = this.alonePotere.material;
    const opP = this.potereAttivo ? 0.7 + 0.3 * Math.sin(t * 4) : 0;
    ap.opacity += (opP - ap.opacity) * k;
    // Anello bersaglio
    const am = this.anello.material;
    const opA = this.statoAnello ? 0.75 + 0.25 * Math.sin(t * 5) : 0;
    am.opacity += (opA - am.opacity) * k;
    this.anello.visible = am.opacity > 0.01;
    // Scossa quando colpito
    if (this.scossa > 0) {
      this.scossa -= dt;
      this.corpo.position.x = Math.sin(t * 80) * 0.08 * (this.scossa / 0.35);
    } else this.corpo.position.x = 0;
    // Cristalli che ruotano e "scoppiano" quando si riempiono
    this.gemme.forEach((g, i) => {
      g.rotation.y = t * 0.9 + i * 0.6;
      if (g.userData.pop > 0) g.userData.pop = Math.max(0, g.userData.pop - dt * 2.5);
      g.scale.setScalar(1 + Math.sin(g.userData.pop * PI) * 0.6);
    });
    this.trappole.children.forEach((gem, i) => {
      gem.rotation.y = t * 1.2 + i;
      gem.position.y = Math.sin(t * 2 + i) * 0.04;
    });
  }
}

// =====================================================================
//  BOTTONE "FINE TURNO"
// =====================================================================
export class BottoneTurno {
  constructor() {
    const g = this.gruppo = new THREE.Group();
    S.scene.add(g);
    this.perno = new THREE.Group();
    g.add(this.perno);
    const forma = rettangoloArrotondato(1.7, 0.62, 0.3);
    this.matFaccia = new THREE.MeshStandardMaterial({ map: texBottone('fine'), roughness: 0.35, metalness: 0.2, emissive: 0xffffff, emissiveMap: texBottone('fine'), emissiveIntensity: 0.25 });
    const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 24 });
    rimappaUV(geo, 1.7, 0.62);
    geo.rotateX(-PI / 2);
    const mesh = new THREE.Mesh(geo, [this.matFaccia, MAT_ORO]);
    mesh.castShadow = true;
    this.perno.add(mesh);
    this.alone = new THREE.Mesh(new THREE.ShapeGeometry(rettangoloArrotondato(2.1, 1.0, 0.5), 16).rotateX(-PI / 2), matAlone(0x46ff7e));
    this.alone.position.y = 0.01;
    g.add(this.alone);
    g.userData = { tipo: 'fine' };
    S.interattivi.add(g);
    this.stato = 'fine';
    this.giro = 0;
    this.premuto = 0;
  }

  posiziona() { this.gruppo.position.set(Math.min(S.mezzaL - 1.0, 5.6), 0.12, Z.linea); }

  setStato(stato) {
    if (stato === this.stato) return;
    this.stato = stato;
    this.giro = 1; // fa partire il giro: a metà cambia la scritta
    this.statoNuovo = stato;
  }

  premi() { this.premuto = 1; }

  tick(dt, t) {
    if (this.giro > 0) {
      this.giro = Math.max(0, this.giro - dt * 3.2);
      const angolo = Math.sin((1 - this.giro) * PI) * (PI / 2);
      this.perno.rotation.x = angolo;
      if (this.giro < 0.5 && this.statoNuovo) {
        const tex = texBottone(this.statoNuovo);
        this.matFaccia.map = tex;
        this.matFaccia.emissiveMap = tex;
        this.statoNuovo = null;
      }
    }
    if (this.premuto > 0) this.premuto = Math.max(0, this.premuto - dt * 5);
    this.perno.position.y = -Math.sin(this.premuto * PI) * 0.08;
    const am = this.alone.material;
    const op = this.stato === 'pronto' ? 0.55 + 0.35 * Math.sin(t * 4) : 0;
    am.opacity += (op - am.opacity) * smorza(dt, 8);
  }
}

// =====================================================================
//  FRECCIA PER MIRARE (a "frecce" luminose che scorrono, come in Hearthstone)
// =====================================================================
const N_PEZZI = 15;
export class Freccia {
  constructor() {
    const g = this.gruppo = new THREE.Group();
    g.visible = false;
    S.scene.add(g);
    const dardo = new THREE.Shape();
    dardo.moveTo(0, 0.13);
    dardo.lineTo(0.16, -0.09);
    dardo.lineTo(0, -0.02);
    dardo.lineTo(-0.16, -0.09);
    dardo.closePath();
    const geo = new THREE.ShapeGeometry(dardo);
    geo.rotateX(-PI / 2);
    geo.rotateY(PI);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide });
    this.pezzi = [];
    for (let i = 0; i < N_PEZZI; i++) {
      const m = new THREE.Mesh(geo, this.mat);
      m.renderOrder = 900;
      g.add(m);
      this.pezzi.push(m);
    }
    this.punta = new THREE.Mesh(geo, this.mat);
    this.punta.scale.setScalar(2.6);
    this.punta.renderOrder = 901;
    g.add(this.punta);
    this.mirino = new THREE.Group();
    const matMirino = new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide });
    const r1 = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 48).rotateX(-PI / 2), matMirino);
    const r2 = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 32, 1, 0, PI * 1.6).rotateX(-PI / 2), matMirino);
    this.mirino.add(r1, r2);
    this.mirino.renderOrder = 902;
    r1.renderOrder = r2.renderOrder = 902;
    g.add(this.mirino);
    this.da = new THREE.Vector3();
    this.a = new THREE.Vector3();
    this.valido = false;
  }

  mostra(da, a, valido) {
    this.da.copy(da);
    this.a.copy(a);
    this.valido = valido;
    this.gruppo.visible = true;
  }

  nascondi() { this.gruppo.visible = false; }

  tick(dt, t) {
    if (!this.gruppo.visible) return;
    const da = this.da, a = this.a;
    const ctrl = da.clone().lerp(a, 0.5);
    ctrl.y += Math.min(3, da.distanceTo(a) * 0.45) + 0.6;
    const punto = (u, out) => {
      const k = 1 - u;
      return out.set(
        k * k * da.x + 2 * k * u * ctrl.x + u * u * a.x,
        k * k * da.y + 2 * k * u * ctrl.y + u * u * a.y,
        k * k * da.z + 2 * k * u * ctrl.z + u * u * a.z
      );
    };
    const p = new THREE.Vector3(), q = new THREE.Vector3();
    const flusso = (t * 1.4) % 1;
    this.pezzi.forEach((m, i) => {
      const u = ((i + flusso) / N_PEZZI) * 0.9;
      punto(u, p);
      punto(Math.min(1, u + 0.02), q);
      m.position.copy(p);
      m.lookAt(q);
      m.scale.setScalar(0.7 + u * 0.8);
    });
    punto(0.93, p);
    punto(1, q);
    this.punta.position.copy(q);
    this.punta.lookAt(q.clone().add(q.clone().sub(p)));
    this.mat.color.setHex(this.valido ? 0xff4a3b : 0xffd34d);
    this.mirino.visible = this.valido;
    this.mirino.position.set(a.x, a.y - 0.1, a.z);
    this.mirino.rotation.y = t * 2;
    this.mirino.scale.setScalar(1 + Math.sin(t * 8) * 0.05);
  }
}
