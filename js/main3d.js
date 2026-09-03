/* =====================================================================
   BEAST-INVOICE — MAIN 3D ENTRY (lazy loader)
   The ONLY entry point that touches WebGL. Loaded as a module AFTER
   first paint (idle callback), so the invoice app's 60-second core flow
   never waits on Three.js. Three.js itself is imported on first use.

   ONE-WEBGL-CONTEXT RULE: the whole app renders into the single
   #gl-stage canvas. It lives at z-index 0 for ambient work, and during
   the finale it is promoted above the scrim via the .finale class —
   no second canvas, no second context.

   Exposes a tiny global bridge consumed by the legacy inline script:
     window.Beast3D.playFinale({ mode, sourceEl, invoice, accent, onDone })

   Graceful degradation (CINEMATIC_REDESIGN_PLAN §8):
     - no WebGL                → callback fires immediately, no import
     - prefers-reduced-motion  → callback fires immediately, no import
     - ?motion=off URL param   → kills the whole layer for CI/testing
   ===================================================================== */
'use strict';

const params = new URLSearchParams(location.search);
const MOTION_OFF = params.get('motion') === 'off';
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK(){
  try{
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  }catch(_){ return false; }
}

const SUPPORTED = !MOTION_OFF && !REDUCED && webglOK();

/* ---- lazy singleton manager (one WebGL context for the app's life) ---- */
let mgrPromise = null;
function ensureManager(){
  if (!mgrPromise){
    mgrPromise = import('../three/scene-manager.js').then(({ SceneManager }) => {
      const canvas = document.getElementById('gl-stage');
      const mgr = new SceneManager(canvas);
      canvas.classList.add('on');          // CSS fades the stage in
      return mgr;
    });
  }
  return mgrPromise;
}

/* ---- overlay helpers (DOM lives in index.html) ---- */
function overlay(show){
  const scrim = document.getElementById('finale-scrim');
  const skip  = document.getElementById('finale-skip');
  if (scrim) scrim.classList.toggle('on', show);
  if (skip)  skip.classList.toggle('on', show);
}

/**
 * playFinale({ mode:'send'|'open', sourceEl, invoice:{number,total,shopName},
 *              accent:'#ff2d3f', onDone(result) })
 * result: 'sent' | 'opened' | 'skipped' — fires exactly once, always.
 */
function playFinale(opts){
  const mode = opts.mode === 'open' ? 'open' : 'send';
  const fallback = () => opts.onDone && opts.onDone(mode === 'open' ? 'opened' : 'sent');

  if (!SUPPORTED){ fallback(); return; }

  ensureManager().then(mgr => new Promise(resolve => {
    const canvas = mgr.canvas;
    canvas.classList.add('finale');        // promote above the scrim
    overlay(true);

    let done = false;
    let fs = null;
    const finish = (result) => {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', onKey);
      if (opts.sourceEl) opts.sourceEl.style.opacity = '';
      overlay(false);
      canvas.classList.remove('finale');
      mgr.set(null);                       // stops the loop, keeps the context
      resolve(result);
    };

    const onKey = (e) => { if (e.key === 'Escape' && fs) fs.skip(); };
    window.addEventListener('keydown', onKey);

    import('../three/scenes/finale.js').then(({ FinaleScene }) => {
      if (done){ return; }                 // race: user hid the tab mid-load
      fs = new FinaleScene({
        mode,
        sourceEl: opts.sourceEl,
        invoice: opts.invoice,
        accent: opts.accent,
        onDone: finish,
      });
      // Skip button + scrim click both skip (once-only; finish() is idempotent anyway)
      const skipBtn = document.getElementById('finale-skip');
      const scrim = document.getElementById('finale-scrim');
      if (skipBtn) skipBtn.addEventListener('click', () => fs && fs.skip(), { once: true });
      if (scrim)   scrim.addEventListener('click', () => fs && fs.skip(), { once: true });
      mgr.set(fs);
    }).catch(err => {
      console.warn('[Beast3D] finale failed to load:', err);
      finish('skipped');
    });
  })).then(result => opts.onDone && opts.onDone(result));
}

/* ---- public bridge ---- */
window.Beast3D = {
  playFinale,
  get supported(){ return SUPPORTED; },
  get reason(){ return MOTION_OFF ? 'motion=off' : REDUCED ? 'reduced-motion' : webglOK() ? 'ok' : 'no-webgl'; },
};

console.log('[Beast3D] bridge ready —', window.Beast3D.reason);
