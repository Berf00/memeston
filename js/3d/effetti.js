// =====================================================================
//  EFFETTI SPECIALI: particelle, schegge, scritte meme, onde e lampi
// =====================================================================
import * as THREE from 'three';
import { S, scuoti } from './scena.js';
import { tween, ease, casuale, scegli } from './motore.js';
import { texScritta, texSplat } from './texture.js';

const PAROLE_MEME = ['BRUH', 'OOF', 'BONK', 'RIP', 'LOL', 'POW', 'F', 'EZ', 'SKILL ISSUE', 'NOOO', 'GG'];
const EMOJI_FESTA = ['🔥', '✨', '😂', '💯', '😎', '👀'];

// ---------- Particelle (un solo oggetto per migliaia di punti: velocissimo) ----------
const MAX_PARTICELLE = 3000;

class Particelle {
  constructor() {
    const n = MAX_PARTICELLE;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.alfa = new Float32Array(n);
    this.dim = new Float32Array(n);
    this.vel = new Float32Array(n * 3);
    this.vita = new Float32Array(n);
    this.vitaMax = new Float32Array(n);
    this.dim0 = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.attrito = new Float32Array(n);
    this.prossima = 0;
    this.vive = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('colore', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alfa', new THREE.BufferAttribute(this.alfa, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('dimensione', new THREE.BufferAttribute(this.dim, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      uniforms: { scala: S.scalaParticelle },
      vertexShader: `
        attribute float dimensione; attribute float alfa; attribute vec3 colore;
        uniform float scala;
        varying vec3 vCol; varying float vA;
        void main() {
          vCol = colore; vA = alfa;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = dimensione * scala / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vCol; varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          a = a * a * vA;
          gl_FragColor = vec4(vCol * (1.0 + a), a);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.punti = new THREE.Points(geo, mat);
    this.punti.frustumCulled = false;
    this.punti.renderOrder = 800;
    S.scene.add(this.punti);
    this.c = new THREE.Color();
  }

  emetti({ pos, n = 20, velocita = [1, 3], direzione = null, apertura = 1, colori = [0xffffff], vita = [0.4, 0.9], dim = [0.1, 0.25], gravita = -4, attrito = 1.5, raggio = 0, piano = false }) {
    const dir = direzione ? direzione.clone().normalize() : null;
    for (let k = 0; k < n; k++) {
      const i = this.prossima;
      this.prossima = (this.prossima + 1) % MAX_PARTICELLE;
      // Direzione casuale (sfera o cono attorno a "direzione")
      let vx = Math.random() * 2 - 1, vy = Math.random() * 2 - 1, vz = Math.random() * 2 - 1;
      if (piano) vy = Math.random() * 0.25;
      const l = Math.hypot(vx, vy, vz) || 1;
      vx /= l; vy /= l; vz /= l;
      if (dir) {
        vx = dir.x + vx * apertura; vy = dir.y + vy * apertura; vz = dir.z + vz * apertura;
        const l2 = Math.hypot(vx, vy, vz) || 1;
        vx /= l2; vy /= l2; vz /= l2;
      }
      const v = casuale(velocita[0], velocita[1]);
      this.vel[i * 3] = vx * v; this.vel[i * 3 + 1] = vy * v; this.vel[i * 3 + 2] = vz * v;
      this.pos[i * 3] = pos.x + vx * raggio; this.pos[i * 3 + 1] = pos.y + (piano ? 0 : vy * raggio); this.pos[i * 3 + 2] = pos.z + vz * raggio;
      this.c.setHex(scegli(colori));
      this.col[i * 3] = this.c.r; this.col[i * 3 + 1] = this.c.g; this.col[i * 3 + 2] = this.c.b;
      this.vita[i] = this.vitaMax[i] = casuale(vita[0], vita[1]);
      this.dim0[i] = casuale(dim[0], dim[1]);
      this.grav[i] = gravita;
      this.attrito[i] = attrito;
    }
    this.vive = MAX_PARTICELLE;
  }

  tick(dt) {
    if (!this.vive) return;
    let attive = 0;
    for (let i = 0; i < MAX_PARTICELLE; i++) {
      if (this.vita[i] <= 0) { if (this.alfa[i] !== 0) { this.alfa[i] = 0; this.dim[i] = 0; } continue; }
      attive++;
      this.vita[i] -= dt;
      const f = Math.max(0, 1 - this.attrito[i] * dt);
      this.vel[i * 3] *= f; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * f + this.grav[i] * dt; this.vel[i * 3 + 2] *= f;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const r = Math.max(0, this.vita[i] / this.vitaMax[i]);
      this.alfa[i] = Math.pow(r, 0.6);
      this.dim[i] = this.dim0[i] * (0.35 + 0.65 * r);
    }
    if (!attive) this.vive = 0;
    const a = this.geo.attributes;
    a.position.needsUpdate = a.colore.needsUpdate = a.alfa.needsUpdate = a.dimensione.needsUpdate = true;
  }
}

// ---------- Schegge 3D (frantumazione) ----------
const MAX_SCHEGGE = 320;

class Schegge {
  constructor() {
    const geo = new THREE.TetrahedronGeometry(0.09, 0);
    geo.scale(1, 0.45, 1.3);
    const mat = new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.3 });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_SCHEGGE);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    const c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < MAX_SCHEGGE; i++) this.mesh.setColorAt(i, c);
    this.dati = Array.from({ length: MAX_SCHEGGE }, () => ({
      vita: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), vr: new THREE.Vector3(), s: 1
    }));
    this.prossima = 0;
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < MAX_SCHEGGE; i++) this.mesh.setMatrixAt(i, this.zero);
    this.vive = 0;
    S.scene.add(this.mesh);
    this.col = new THREE.Color();
  }

  emetti(pos, n, colori, forza = 1) {
    for (let k = 0; k < n; k++) {
      const i = this.prossima;
      this.prossima = (this.prossima + 1) % MAX_SCHEGGE;
      const d = this.dati[i];
      d.vita = casuale(0.8, 1.5);
      d.p.set(pos.x + casuale(-0.35, 0.35), pos.y + casuale(0, 0.2), pos.z + casuale(-0.4, 0.4));
      const a = Math.random() * Math.PI * 2;
      const v = casuale(1.5, 4.2) * forza;
      d.v.set(Math.cos(a) * v, casuale(2, 5) * forza, Math.sin(a) * v);
      d.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      d.vr.set(casuale(-12, 12), casuale(-12, 12), casuale(-12, 12));
      d.s = casuale(0.6, 1.8) * forza;
      this.mesh.setColorAt(i, this.col.setHex(scegli(colori)));
    }
    this.mesh.instanceColor.needsUpdate = true;
    this.vive = MAX_SCHEGGE;
  }

  tick(dt) {
    if (!this.vive) return;
    let attive = 0;
    for (let i = 0; i < MAX_SCHEGGE; i++) {
      const d = this.dati[i];
      if (d.vita <= 0) continue;
      attive++;
      d.vita -= dt;
      d.v.y -= 11 * dt;
      d.p.addScaledVector(d.v, dt);
      if (d.p.y < 0.02) { d.p.y = 0.02; d.v.y *= -0.35; d.v.x *= 0.7; d.v.z *= 0.7; d.vr.multiplyScalar(0.7); }
      d.r.x += d.vr.x * dt; d.r.y += d.vr.y * dt; d.r.z += d.vr.z * dt;
      const s = d.s * Math.min(1, d.vita * 2.5);
      this.q.setFromEuler(d.r);
      this.m.compose(d.p, this.q, new THREE.Vector3(s, s, s));
      this.mesh.setMatrixAt(i, d.vita > 0 ? this.m : this.zero);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (!attive) this.vive = 0;
  }
}

// ---------- Pulviscolo d'atmosfera che fluttua sul tavolo ----------
function creaPulviscolo() {
  const n = 140;
  const pos = new Float32Array(n * 3);
  const fasi = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = casuale(-6.5, 6.5);
    pos[i * 3 + 1] = casuale(0.3, 3.5);
    pos[i * 3 + 2] = casuale(-6.5, 6.5);
    fasi[i] = Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('fase', new THREE.BufferAttribute(fasi, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { tempo: { value: 0 }, scala: S.scalaParticelle },
    vertexShader: `
      attribute float fase; uniform float tempo; uniform float scala; varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(tempo * 0.3 + fase) * 0.4;
        p.y += sin(tempo * 0.5 + fase * 1.3) * 0.25;
        p.z += cos(tempo * 0.25 + fase) * 0.4;
        vA = 0.25 + 0.25 * sin(tempo * 1.2 + fase * 3.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = 0.06 * scala / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.85, 0.6) * a, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const punti = new THREE.Points(geo, mat);
  punti.frustumCulled = false;
  S.scene.add(punti);
  return mat;
}

// =====================================================================
let particelle, schegge, matPulviscolo;
const geoOnda = new THREE.RingGeometry(0.82, 1, 64).rotateX(-Math.PI / 2);
const geoSfera = new THREE.SphereGeometry(1, 20, 12);
let indiceLuce = 0;

export const FX = {
  init() {
    particelle = new Particelle();
    schegge = new Schegge();
    matPulviscolo = creaPulviscolo();
    S.aggiornatori.add((dt, t) => {
      particelle.tick(dt);
      schegge.tick(dt);
      matPulviscolo.uniforms.tempo.value = t;
    });
  },

  particelle(opz) { particelle.emetti(opz); },

  lampo(pos, colore = 0xffaa55, intensita = 30, durata = 380) {
    const l = S.luciFlash[indiceLuce];
    indiceLuce = (indiceLuce + 1) % S.luciFlash.length;
    l.color.setHex(colore);
    l.position.copy(pos).setY(pos.y + 0.8);
    return tween(durata, e => { l.intensity = intensita * (1 - e); }, ease.out);
  },

  onda(pos, colore = 0xffffff, raggio = 1.8, durata = 520, spessore = 1) {
    const mat = new THREE.MeshBasicMaterial({ color: colore, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(geoOnda, mat);
    m.position.copy(pos).setY(Math.max(0.03, pos.y - 0.15));
    m.renderOrder = 700;
    S.scene.add(m);
    return tween(durata, e => {
      const s = 0.2 + raggio * e;
      m.scale.set(s, 1, s);
      mat.opacity = (1 - e) * 0.9 * spessore;
    }, ease.out).then(() => { m.removeFromParent(); mat.dispose(); });
  },

  scritta(pos, testo, { size = 110, fill = '#fff', stroke = '#1a0f24', fondo = null, emoji = false, altezza = 0.75, sali = 0.9, durata = 1000, ritardo = 0 } = {}) {
    const { tex, aspetto } = texScritta(testo, { size, fill, stroke, fondo, emojiFont: emoji });
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const sp = new THREE.Sprite(mat);
    sp.renderOrder = 999;
    const base = pos.clone();
    base.y += 0.4;
    sp.position.copy(base);
    sp.scale.set(0.001, 0.001, 1);
    S.scene.add(sp);
    const rot = casuale(-0.25, 0.25);
    mat.rotation = rot;
    return tween(durata + ritardo, (e, p) => {
      const q = Math.max(0, (p * (durata + ritardo) - ritardo) / durata);
      const s = q < 0.22 ? ease.back(q / 0.22) : 1;
      sp.scale.set(altezza * aspetto * s, altezza * s, 1);
      sp.position.y = base.y + sali * ease.out(q);
      mat.opacity = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
    }, ease.lineare).then(() => { sp.removeFromParent(); mat.dispose(); tex.dispose(); });
  },

  splat(pos, n, cura = false) {
    const tex = texSplat(n, cura);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const sp = new THREE.Sprite(mat);
    sp.renderOrder = 998;
    sp.position.copy(pos).setY(pos.y + 0.45);
    S.scene.add(sp);
    mat.rotation = casuale(-0.3, 0.3);
    return tween(1100, (e, p) => {
      const s = p < 0.18 ? ease.back(p / 0.18) * 0.85 : 0.85;
      sp.scale.set(s, s, 1);
      mat.opacity = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
    }, ease.lineare).then(() => { sp.removeFromParent(); mat.dispose(); tex.dispose(); });
  },

  // Colpo in pieno: scintille, schegge, onda, lampo e a volte una parola meme
  impatto(pos, { forza = 1, parola = null } = {}) {
    particelle.emetti({ pos, n: Math.round(40 * forza + 20), velocita: [2, 6 * forza + 2], colori: [0xffe08a, 0xff9a3c, 0xffffff, 0xff5a3c], vita: [0.25, 0.6], dim: [0.08, 0.22], gravita: -6, attrito: 3 });
    schegge.emetti(pos, Math.round(4 + forza * 4), [0xffd36b, 0xc98a2a, 0xffffff], 0.6);
    FX.onda(pos, 0xffc46b, 1.3 + forza * 0.6, 420);
    FX.lampo(pos, 0xffb060, 25 + forza * 25, 300);
    scuoti(0.08 + forza * 0.1);
    if (parola) FX.scritta(pos.clone().add(new THREE.Vector3(casuale(-0.4, 0.4), 0.5, 0)), parola, { fondo: 'scoppio', size: 90, fill: '#1a0f24', stroke: '#fff7d0', altezza: 0.85, sali: 0.5, durata: 950 });
  },

  parolaMeme() { return scegli(PAROLE_MEME); },

  // Personaggio "schiaffato" sul tavolo come uno sticker
  atterraggio(pos, pesante = false) {
    particelle.emetti({ pos: pos.clone().setY(0.05), n: pesante ? 70 : 45, velocita: [1.2, pesante ? 4 : 3], colori: [0xd8c8a8, 0xbfa98a, 0xffffff], vita: [0.35, 0.8], dim: [0.12, 0.3], gravita: -1, attrito: 3.5, piano: true, raggio: 0.5 });
    FX.onda(pos, 0xffffff, pesante ? 2.6 : 2, 480, 0.8);
    scuoti(pesante ? 0.22 : 0.1);
    for (let i = 0; i < (pesante ? 3 : 2); i++) {
      FX.scritta(pos.clone().add(new THREE.Vector3(casuale(-0.7, 0.7), 0.1, casuale(-0.3, 0.3))), scegli(EMOJI_FESTA),
        { emoji: true, size: 120, altezza: 0.42, sali: casuale(0.7, 1.2), durata: 800, ritardo: i * 70 });
    }
  },

  // Morte: frantumazione in pezzi + teschio
  morte(pos, colori) {
    schegge.emetti(pos, 34, colori, 1);
    particelle.emetti({ pos, n: 70, velocita: [1.5, 5], colori: [0xff4a3c, 0xffb36b, 0xffffff, ...colori], vita: [0.35, 0.9], dim: [0.08, 0.24], gravita: -5, attrito: 2.5 });
    FX.onda(pos, 0xff6b4a, 2.2, 560);
    FX.lampo(pos, 0xff5a3c, 35, 420);
    scuoti(0.16);
    FX.scritta(pos, '💀', { emoji: true, size: 130, altezza: 0.75, sali: 1.4, durata: 1100 });
    if (Math.random() < 0.35) FX.scritta(pos.clone().add(new THREE.Vector3(0.6, 0.2, 0)), 'RIP', { fondo: 'scoppio', size: 80, fill: '#1a0f24', stroke: '#fff7d0', altezza: 0.6, sali: 0.4, durata: 900, ritardo: 120 });
  },

  esplosioneEroe(pos) {
    schegge.emetti(pos, 110, [0xd8a640, 0xffe08a, 0x8a5a1c, 0xff6b4a], 1.6);
    particelle.emetti({ pos, n: 260, velocita: [2, 9], colori: [0xffe08a, 0xff9a3c, 0xffffff, 0xff4a3c], vita: [0.5, 1.4], dim: [0.12, 0.35], gravita: -3, attrito: 1.6 });
    FX.onda(pos, 0xffc46b, 5, 900);
    FX.onda(pos, 0xffffff, 3, 600);
    FX.lampo(pos, 0xffc070, 120, 900);
    scuoti(0.6);
  },

  cura(pos, n) {
    particelle.emetti({ pos, n: 36, velocita: [0.4, 1.4], direzione: new THREE.Vector3(0, 1, 0), apertura: 0.9, colori: [0x7dff9a, 0xd8ffd8, 0x3fd36a], vita: [0.6, 1.2], dim: [0.1, 0.24], gravita: 1.2, attrito: 1, raggio: 0.4 });
    FX.splat(pos, n, true);
    FX.lampo(pos, 0x6dff8f, 18, 500);
  },

  ghiaccio(pos) {
    particelle.emetti({ pos, n: 50, velocita: [0.8, 3], colori: [0xbfeaff, 0x7fd3ff, 0xffffff], vita: [0.4, 1], dim: [0.08, 0.2], gravita: -1, attrito: 2.2 });
    FX.onda(pos, 0x7fd3ff, 1.6, 500);
    FX.scritta(pos, '❄️', { emoji: true, size: 120, altezza: 0.5, sali: 0.8, durata: 900 });
  },

  scudoRotto(pos) {
    schegge.emetti(pos, 22, [0xffe08a, 0xfff7c0, 0xffd34d], 0.8);
    particelle.emetti({ pos, n: 50, velocita: [1.5, 4], colori: [0xffe08a, 0xffffff], vita: [0.3, 0.7], dim: [0.08, 0.2], gravita: -3, attrito: 2.5 });
    FX.onda(pos, 0xffd86b, 1.8, 450);
    FX.lampo(pos, 0xffd86b, 30, 350);
  },

  dorato(pos, testo) {
    particelle.emetti({ pos, n: 40, velocita: [0.5, 1.6], direzione: new THREE.Vector3(0, 1, 0), apertura: 0.8, colori: [0xffe08a, 0xffd34d, 0xffffff], vita: [0.6, 1.1], dim: [0.08, 0.2], gravita: 1.5, attrito: 1, raggio: 0.4 });
    if (testo) FX.scritta(pos, testo, { size: 90, fill: '#ffe08a', altezza: 0.5, sali: 0.9 });
  },

  silenzio(pos) {
    particelle.emetti({ pos, n: 30, velocita: [0.4, 1.2], colori: [0xbbbbbb, 0xffffff], vita: [0.5, 1], dim: [0.1, 0.22], gravita: 0.5, attrito: 1.5 });
    FX.scritta(pos, '🤫', { emoji: true, size: 120, altezza: 0.55, sali: 0.8 });
  },

  // Sfera magica che vola dalla sorgente al bersaglio lasciando una scia
  async proiettile(da, a, { colore = 0xff8a3c, emoji = null, durata = null } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color: colore, toneMapped: false });
    const sfera = new THREE.Mesh(geoSfera, mat);
    sfera.scale.setScalar(0.15);
    sfera.renderOrder = 850;
    S.scene.add(sfera);
    let sp = null;
    if (emoji) {
      const { tex, aspetto } = texScritta(emoji, { size: 120, emojiFont: true });
      sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
      sp.scale.set(0.5 * aspetto, 0.5, 1);
      sp.renderOrder = 851;
      S.scene.add(sp);
    }
    const luce = S.luciFlash[indiceLuce];
    indiceLuce = (indiceLuce + 1) % S.luciFlash.length;
    luce.color.setHex(colore);
    const ctrl = da.clone().lerp(a, 0.5);
    ctrl.y += Math.min(3.2, da.distanceTo(a) * 0.4) + 0.8;
    const p = new THREE.Vector3();
    const dur = durata || 360 + da.distanceTo(a) * 30;
    await tween(dur, e => {
      const k = 1 - e;
      p.set(
        k * k * da.x + 2 * k * e * ctrl.x + e * e * a.x,
        k * k * da.y + 2 * k * e * ctrl.y + e * e * a.y,
        k * k * da.z + 2 * k * e * ctrl.z + e * e * a.z
      );
      sfera.position.copy(p);
      sfera.scale.setScalar(0.15 + Math.sin(e * Math.PI) * 0.06);
      if (sp) sp.position.copy(p).setY(p.y + 0.05);
      luce.position.copy(p);
      luce.intensity = 22;
      particelle.emetti({ pos: p, n: 4, velocita: [0.1, 0.6], colori: [colore, 0xffffff], vita: [0.25, 0.5], dim: [0.1, 0.26], gravita: 0, attrito: 2 });
    }, ease.inOut);
    luce.intensity = 0;
    sfera.removeFromParent();
    mat.dispose();
    if (sp) { sp.removeFromParent(); sp.material.map.dispose(); sp.material.dispose(); }
    particelle.emetti({ pos: a, n: 45, velocita: [1.5, 4.5], colori: [colore, 0xffffff], vita: [0.3, 0.7], dim: [0.08, 0.24], gravita: -4, attrito: 2.5 });
    FX.onda(a, colore, 1.4, 400);
    FX.lampo(a, colore, 35, 350);
  },

  // Ondata che investe molti bersagli insieme
  async ondata(da, bersagli, colore) {
    FX.onda(da, colore, 7, 700, 1.2);
    FX.lampo(da, colore, 60, 600);
    particelle.emetti({ pos: da, n: 90, velocita: [3, 8], colori: [colore, 0xffffff], vita: [0.4, 0.8], dim: [0.1, 0.26], gravita: -1, attrito: 1.8, piano: true });
    scuoti(0.15);
    await new Promise(r => setTimeout(r, 260));
    for (const b of bersagli) particelle.emetti({ pos: b, n: 25, velocita: [1, 3], colori: [colore, 0xffffff], vita: [0.3, 0.6], dim: [0.08, 0.2], gravita: -3, attrito: 2.5 });
  },

  // Carta-evento che si dissolve in scintille
  dissolvi(pos, colore) {
    particelle.emetti({ pos, n: 120, velocita: [0.8, 3.5], colori: [colore, 0xffffff, 0xffe08a], vita: [0.5, 1.1], dim: [0.08, 0.24], gravita: 0.8, attrito: 1.6, raggio: 0.5 });
    FX.lampo(pos, colore, 40, 500);
  },

  scintillio(pos, colore) {
    particelle.emetti({ pos, n: 30, velocita: [0.6, 2], colori: [colore, 0xffffff], vita: [0.3, 0.7], dim: [0.06, 0.18], gravita: 0, attrito: 2.5 });
  }
};
