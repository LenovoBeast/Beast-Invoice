/* =====================================================================
   BEAST-INVOICE — SCENE MANAGER (Three.js)
   One WebGL context for the whole app. Scenes register via set(scene)
   and must implement: { scene, camera, enter(mgr), exit(mgr), update(dt) }.
   Performance contract (CINEMATIC_REDESIGN_PLAN.md §8):
   - DPR clamped to 1.75; antialias off; transparent clear.
   - Loop pauses when tab hidden or document is printing.
   - Scenes dispose their GPU resources on exit.
   ===================================================================== */
import * as THREE from '../vendor/three.module.js';

const DPR_CAP = 1.75;

export class SceneManager {
  constructor(canvas){
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: false, powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);           // CSS backdrop shows through
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.clock = new THREE.Clock();
    this.active = null;
    this._raf = null;
    this._lastW = 0; this._lastH = 0;

    this._onVis = () => { document.hidden ? this._stop() : this._start(); };
    this._onResize = () => this.resize();
    document.addEventListener('visibilitychange', this._onVis);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('beforeprint', () => this._stop());  // never fight the print dialog
    window.addEventListener('afterprint',  () => this._start());
    this.resize();
  }

  /** Swap the active scene. Old scene's exit() disposes its GPU resources. */
  set(scene){
    if (this.active && this.active.exit) this.active.exit(this);
    this.active = scene || null;
    if (scene){
      scene.scene = scene.scene || new THREE.Scene();
      scene.camera = scene.camera || new THREE.PerspectiveCamera(40, this._aspect(), .1, 100);
      if (scene.enter) scene.enter(this);
      this.resize();       // scenes size themselves to current viewport
      this._start();
    } else {
      this._stop();
    }
  }

  _aspect(){ return Math.max(this.canvas.clientWidth / Math.max(this.canvas.clientHeight, 1), .0001); }

  _start(){
    if (this._raf || document.hidden || !this.active) return;
    this.clock.getDelta(); // swallow the pause gap
    this._raf = requestAnimationFrame(this._loop);
  }
  _stop(){ if (this._raf){ cancelAnimationFrame(this._raf); this._raf = null; } }

  _loop = () => {
    this._raf = requestAnimationFrame(this._loop);
    if (document.hidden) return;
    const dt = Math.min(this.clock.getDelta(), .05);
    if (this.active && this.active.update) this.active.update(dt);
    if (this.active) this.renderer.render(this.active.scene, this.active.camera);
  };

  resize(){
    if (!this.active) return;
    const w = this.canvas.clientWidth  || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (w === this._lastW && h === this._lastH) return;
    this._lastW = w; this._lastH = h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    this.renderer.setSize(w, h, false);
    if (this.active.camera){
      this.active.camera.aspect = w / h;
      this.active.camera.updateProjectionMatrix();
    }
    if (this.active.onResize) this.active.onResize(w, h);
  }

  destroy(){
    this._stop();
    if (this.active && this.active.exit) this.active.exit(this);
    document.removeEventListener('visibilitychange', this._onVis);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}

/** Match a DOM element's on-screen rect to world-space height at a given camera z. */
export function matchDomRect(camera, domEl, renderer, scene, worldPlaneZ = 0){
  const r = domEl.getBoundingClientRect();
  const dist = camera.position.z - worldPlaneZ;
  const worldH = 2 * dist * Math.tan((camera.fov * Math.PI / 180) / 2);
  const worldW = worldH * camera.aspect;
  const pxToWorld = worldW / renderer.domElement.clientWidth;
  return {
    worldWidth:  r.width  * pxToWorld,
    worldHeight: r.height * pxToWorld,
    ndcX: ((r.left + r.width  / 2) / window.innerWidth)  * 2 - 1,
    ndcY: -(((r.top + r.height / 2) / window.innerHeight) * 2 - 1),
    worldX: (((r.left + r.width  / 2) / window.innerWidth)  * 2 - 1) * (worldW / 2),
    worldY: -(((r.top + r.height / 2) / window.innerHeight) * 2 - 1) * (worldH / 2),
  };
}

export { THREE };
