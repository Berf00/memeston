// =====================================================================
//  SCENA 3D: renderer, luci, ombre, telecamera, tavolo e post-processing
// =====================================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { tickTween } from './motore.js';
import { texTavolo, texPavimento, TEX } from './texture.js';

// Posizioni sul tavolo (z positivo = verso il giocatore)
export const Z = { eroe: [4.25, -4.45], campo: [1.4, -1.6], manoNemico: -6.4, linea: -0.1 };

export const LIVELLI = {
  ultra: { nome: 'Ultra', pr: 2, ombre: 2048, bloom: true },
  alta: { nome: 'Alta', pr: 1.5, ombre: 2048, bloom: true },
  media: { nome: 'Media', pr: 1.25, ombre: 1024, bloom: false },
  bassa: { nome: 'Bassa', pr: 1, ombre: 0, bloom: false }
};
const ORDINE_LIVELLI = ['ultra', 'alta', 'media', 'bassa'];

const FOV = 40;
const TILT = THREE.MathUtils.degToRad(22);
const MANO_Z = 5;
const PRIMO_PIANO_Z = 4.2;

export const S = {
  renderer: null, scene: null, camera: null, composer: null, bloom: null, sole: null,
  mano: null,        // gruppo agganciato alla telecamera: le carte in mano guardano sempre il giocatore
  primoPiano: null,  // gruppo davanti alla telecamera per le carte "rivelate"
  luciFlash: [],
  interattivi: new Set(),
  aggiornatori: new Set(),
  mezzaL: 5, manoHH: 2, manoHW: 3,
  scossa: 0, camBase: new THREE.Vector3(),
  pianoTavolo: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  qualita: 'alta', auto: true, bloomAttivo: true, pr: 1,
  fps: 60, suFps: null, scalaParticelle: { value: 300 }
};

const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;

export function creaScena(contenitore) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  contenitore.appendChild(renderer.domElement);
  S.renderer = renderer;
  TEX.anisotropia = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (MOBILE) TEX.k = 0.75;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0716);
  scene.fog = new THREE.Fog(0x0b0716, 26, 60);
  S.scene = scene;

  // Riflessi realistici per i metalli (cornice d'oro, gemme)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 120);
  scene.add(camera);
  S.camera = camera;

  S.mano = new THREE.Group();
  S.mano.position.z = -MANO_Z;
  camera.add(S.mano);
  S.primoPiano = new THREE.Group();
  S.primoPiano.position.z = -PRIMO_PIANO_Z;
  camera.add(S.primoPiano);

  creaLuci(scene);
  creaTavolo(scene);

  // Post-processing con antialiasing multicampione + bagliore
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  S.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.4, 0.9);
  composer.addPass(S.bloom);
  composer.addPass(new OutputPass());
  S.composer = composer;

  let salvata = null;
  try { salvata = localStorage.getItem('memestone-qualita'); } catch (e) { /* niente */ }
  if (salvata && (salvata === 'auto' || LIVELLI[salvata])) {
    impostaQualita(salvata === 'auto' ? (MOBILE ? 'media' : 'alta') : salvata, salvata !== 'auto');
  } else {
    impostaQualita(MOBILE ? 'media' : 'alta', false);
  }

  addEventListener('resize', ridimensiona);
  ridimensiona();
  requestAnimationFrame(ciclo);
}

function creaLuci(scene) {
  scene.add(new THREE.HemisphereLight(0xfff0dd, 0x22163a, 0.5));
  const sole = new THREE.DirectionalLight(0xffe4c0, 2.6);
  sole.position.set(4, 13, 7);
  sole.castShadow = true;
  const sc = sole.shadow.camera;
  sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 2; sc.far = 32;
  sole.shadow.bias = -0.0004;
  sole.shadow.normalBias = 0.025;
  sole.shadow.radius = 5;
  scene.add(sole, sole.target);
  S.sole = sole;

  // Luci colorate d'atmosfera ai lati del tavolo
  const viola = new THREE.PointLight(0xa66bff, 40, 18, 1.6);
  viola.position.set(-7, 3.5, -4);
  const ciano = new THREE.PointLight(0x4fd7ff, 28, 18, 1.6);
  ciano.position.set(7, 3.5, 3);
  scene.add(viola, ciano);

  // Luci per i lampi degli effetti: sempre presenti (intensità 0) così gli shader non si ricompilano
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(0xffaa55, 0, 7, 2);
    l.position.set(0, -10, 0);
    scene.add(l);
    S.luciFlash.push(l);
  }
}

export function rettangoloArrotondato(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function rimappaUV(geo, w, h) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  uv.needsUpdate = true;
}

export const MAT_ORO = new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.92, roughness: 0.28 });

function creaTavolo(scene) {
  const W = 11.8, D = 12.8, R = 1;

  const pavimento = new THREE.Mesh(
    new THREE.CircleGeometry(45, 64),
    new THREE.MeshStandardMaterial({ map: texPavimento(), roughness: 1 })
  );
  pavimento.rotation.x = -Math.PI / 2;
  pavimento.position.y = -1.1;
  pavimento.receiveShadow = true;
  scene.add(pavimento);

  // Base in legno scuro
  const base = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rettangoloArrotondato(W + 1.5, D + 1.5, R + 0.7),
      { depth: 0.6, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 4, curveSegments: 24 }),
    new THREE.MeshStandardMaterial({ color: 0x2a160c, roughness: 0.55, metalness: 0.1 })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -1;
  base.receiveShadow = true;
  scene.add(base);

  // Feltro con il motivo meme
  const geoFeltro = new THREE.ShapeGeometry(rettangoloArrotondato(W, D, R), 24);
  rimappaUV(geoFeltro, W, D);
  geoFeltro.rotateX(-Math.PI / 2);
  const feltro = new THREE.Mesh(geoFeltro, new THREE.MeshStandardMaterial({ map: texTavolo(), roughness: 0.93, metalness: 0 }));
  feltro.position.y = -0.01;
  feltro.receiveShadow = true;
  scene.add(feltro);

  // Cornice d'oro
  const esterno = rettangoloArrotondato(W + 1, D + 1, R + 0.5);
  esterno.holes.push(rettangoloArrotondato(W, D, R));
  const cornice = new THREE.Mesh(
    new THREE.ExtrudeGeometry(esterno, { depth: 0.32, bevelEnabled: true, bevelSize: 0.09, bevelThickness: 0.09, bevelSegments: 4, curveSegments: 28 }),
    MAT_ORO
  );
  cornice.rotation.x = -Math.PI / 2;
  cornice.position.y = -0.3;
  cornice.castShadow = true;
  cornice.receiveShadow = true;
  scene.add(cornice);

  // Linea luminosa al centro
  const linea = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 1.6, 0.045),
    new THREE.MeshBasicMaterial({ color: 0xd9a6ff, transparent: true, opacity: 0.75, toneMapped: false })
  );
  linea.rotation.x = -Math.PI / 2;
  linea.position.set(0, 0.005, Z.linea);
  scene.add(linea);

  // Piattaforme di pietra per gli eroi
  const pietra = new THREE.MeshStandardMaterial({ color: 0x4a4560, roughness: 0.8, metalness: 0.1 });
  for (const z of Z.eroe) {
    const piatt = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.14, 64), pietra);
    piatt.position.set(0, 0.06, z);
    piatt.receiveShadow = true;
    piatt.castShadow = true;
    scene.add(piatt);
    const anello = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.05, 12, 72), MAT_ORO);
    anello.rotation.x = -Math.PI / 2;
    anello.position.set(0, 0.135, z);
    scene.add(anello);
  }

  // Gemme luminose agli angoli che fluttuano
  const matGemma = new THREE.MeshStandardMaterial({ color: 0xc58bff, emissive: 0xa45cff, emissiveIntensity: 2.2, roughness: 0.2, metalness: 0.3 });
  const gemme = [];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), matGemma);
    g.position.set(x * (W / 2 + 0.5), 0.45, z * (D / 2 + 0.5));
    g.castShadow = true;
    scene.add(g);
    gemme.push(g);
  }
  S.aggiornatori.add((dt, t) => {
    gemme.forEach((g, i) => {
      g.rotation.y = t * 0.8 + i;
      g.position.y = 0.45 + Math.sin(t * 1.6 + i * 1.7) * 0.07;
    });
  });
}

export function ridimensiona() {
  const w = innerWidth, h = innerHeight, aspetto = w / h;
  const { renderer, camera, composer } = S;
  renderer.setPixelRatio(S.pr);
  renderer.setSize(w, h);
  composer.setPixelRatio(S.pr);
  composer.setSize(w, h);
  S.bloom.setSize(w * S.pr, h * S.pr);

  camera.aspect = aspetto;
  const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  // Inquadra l'area di gioco sia in larghezza sia in profondità
  // (la profondità include lo spazio in basso per la mano, che copre il bordo del tavolo)
  const area = { w: aspetto < 1 ? 8.4 : 10.6, d: 15.6 };
  const dProf = (area.d * Math.cos(TILT)) / (2 * t);
  const dLarg = area.w / (2 * t * aspetto);
  const d = Math.max(dProf, dLarg);
  const centro = new THREE.Vector3(0, 0, 0.75);
  S.camBase.set(0, d * Math.cos(TILT), centro.z + d * Math.sin(TILT));
  camera.position.copy(S.camBase);
  camera.lookAt(centro);
  camera.updateProjectionMatrix();

  S.mezzaL = Math.min(d * t * aspetto * 0.94, 6.6);
  S.manoHH = MANO_Z * t;
  S.manoHW = S.manoHH * aspetto;
  S.primoHH = PRIMO_PIANO_Z * t;
  S.scalaParticelle.value = (h * S.pr) / (2 * t);
  for (const f of ridimensionatori) f();
}

const ridimensionatori = new Set();
export function suRidimensiona(f) { ridimensionatori.add(f); }

export function impostaQualita(nome, manuale = false) {
  const q = LIVELLI[nome];
  if (!q) return;
  S.qualita = nome;
  S.auto = !manuale;
  S.pr = Math.min(devicePixelRatio || 1, q.pr);
  S.bloomAttivo = q.bloom;
  const conOmbre = q.ombre > 0;
  if (S.renderer.shadowMap.enabled !== conOmbre) {
    S.renderer.shadowMap.enabled = conOmbre;
    S.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
  }
  S.sole.castShadow = conOmbre;
  if (conOmbre && S.sole.shadow.mapSize.x !== q.ombre) {
    S.sole.shadow.mapSize.set(q.ombre, q.ombre);
    if (S.sole.shadow.map) { S.sole.shadow.map.dispose(); S.sole.shadow.map = null; }
  }
  if (S.composer) ridimensiona();
}

export function salvaQualita(valore) {
  try { localStorage.setItem('memestone-qualita', valore); } catch (e) { /* niente */ }
}

export function scuoti(forza) { S.scossa = Math.max(S.scossa, forza); }

// ---------- Ciclo dei fotogrammi ----------
let ultimo = performance.now();
let contaFotogrammi = 0, inizioFinestra = performance.now(), ultimoCambio = performance.now();

function ciclo(ora) {
  requestAnimationFrame(ciclo);
  const dt = Math.min(0.05, (ora - ultimo) / 1000);
  ultimo = ora;

  tickTween(ora);
  const t = ora / 1000;
  for (const f of S.aggiornatori) f(dt, t);

  // Scossone della telecamera
  const cam = S.camera;
  if (S.scossa > 0.001) {
    cam.position.set(
      S.camBase.x + (Math.random() - 0.5) * S.scossa,
      S.camBase.y + (Math.random() - 0.5) * S.scossa * 0.6,
      S.camBase.z + (Math.random() - 0.5) * S.scossa
    );
    S.scossa *= Math.exp(-dt * 9);
  } else if (S.scossa !== 0) {
    S.scossa = 0;
    cam.position.copy(S.camBase);
  }

  if (S.bloomAttivo) S.composer.render(dt);
  else S.renderer.render(S.scene, cam);

  // Misura gli FPS e abbassa la qualità se il dispositivo fatica
  contaFotogrammi++;
  if (ora - inizioFinestra > 2000) {
    S.fps = (contaFotogrammi * 1000) / (ora - inizioFinestra);
    contaFotogrammi = 0;
    inizioFinestra = ora;
    if (S.suFps) S.suFps(S.fps);
    if (S.auto && !document.hidden && S.fps < 48 && ora - ultimoCambio > 4000) {
      const i = ORDINE_LIVELLI.indexOf(S.qualita);
      if (i < ORDINE_LIVELLI.length - 1) {
        impostaQualita(ORDINE_LIVELLI[i + 1], false);
        ultimoCambio = ora;
      }
    }
  }
}

document.addEventListener('visibilitychange', () => {
  // Al ritorno sulla pagina non contiamo il tempo passato in background
  ultimo = performance.now();
  inizioFinestra = ultimo;
  contaFotogrammi = 0;
});
