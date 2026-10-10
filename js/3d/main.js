// =====================================================================
//  AVVIO DEL GIOCO 3D
// =====================================================================
import { creaScena } from './scena.js';
import { avviaTavolo } from './tavolo.js';
import { caricaFont, texRetro } from './texture.js';
import { caricamentoFinito, erroreWebGL } from '../interfaccia.js';

function webglDisponibile() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

async function avvia() {
  if (!webglDisponibile()) { erroreWebGL(); return; }
  await caricaFont();
  creaScena(document.getElementById('scena'));
  texRetro();
  avviaTavolo();
  // Lascia al browser un attimo per preparare gli shader prima di mostrare il tavolo
  setTimeout(caricamentoFinito, 150);
}

avvia().catch(err => {
  console.error(err);
  erroreWebGL();
});
