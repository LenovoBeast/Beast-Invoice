/* =====================================================================
   BEAST-INVOICE — FINALE SCENE ("Seal & Send" / "Open")
   The cinematic invoice-finishing sequence (CINEMATIC_REDESIGN_PLAN §6):
     send: paper folds → slides into envelope → wax seal stamps (sparks,
           haptics, thud) → envelope launches off-screen.
     open: envelope drops in → seal pops → flap opens → paper unfolds.
   Paper art is a stylized CanvasTexture (no html2canvas dependency).
   Timeline driven by js/motion/tween.js. ~2.4s total, skippable.
   ===================================================================== */
import { THREE, matchDomRect } from '../scene-manager.js';
import { tween } from '../../js/motion/tween.js';

/* ---------- stylized invoice paper texture (drawn, not screenshotted) ---------- */
function makeInvoiceTexture({ shopName, number, total, accent }){
  const W = 512, H = 704; // A4-ish ratio
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#f6f6f4'; g.fillRect(0, 0, W, H);
  // header band + shop name
  g.fillStyle = accent; g.fillRect(0, 0, W, 12);
  g.fillStyle = '#16181c'; g.font = '700 40px "Space Grotesk", sans-serif';
  g.fillText('INVOICE', 40, 84);
  g.fillStyle = accent; g.font = '700 24px "JetBrains Mono", monospace';
  g.fillText(number || 'INV-0000', 40, 122);
  g.fillStyle = '#16181c'; g.font = '600 28px "Space Grotesk", sans-serif';
  g.fillText((shopName || 'High Performance Garage').slice(0, 26), W - 40 - g.measureText((shopName || '').slice(0, 26)).width, 84);
  // faux line rows
  g.fillStyle = '#dfe1e4';
  for (let y = 190; y <= 430; y += 48){ g.fillRect(40, y, W - 80, 2); }
  g.fillStyle = '#c9ccd1';
  for (let y = 168; y <= 408; y += 48){ g.fillRect(40, y, 180 + (y % 96), 10); }
  // total block
  g.fillStyle = '#16181c'; g.font = '700 46px "JetBrains Mono", monospace';
  g.fillText(total || '$0.00', W - 40 - g.measureText(total || '$0.00').width, 560);
  g.strokeStyle = accent; g.lineWidth = 3;
  g.beginPath(); g.moveTo(40, 500); g.lineTo(W - 40, 500); g.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { texture: tex, aspect: H / W };
}

/* ---------- one-shot spark burst (points, radial, gravity, fade) ---------- */
function makeSparks(accent){
  const N = 120;
  const pos = new Float32Array(N * 3);
  const vel = [];
  for (let i = 0; i < N; i++){
    const a = Math.random() * Math.PI * 2;
    const s = 1.4 + Math.random() * 2.6;
    vel.push(new THREE.Vector3(Math.cos(a) * s, -Math.abs(Math.sin(a)) * s * .7 - .5, (Math.random() - .5) * s * .5));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(accent), size: .045, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.visible = false;
  return {
    object: pts, vel,
    burst(origin){
      pts.visible = true; pts.position.copy(origin);
      const p = geo.attributes.position.array;
      for (let i = 0; i < N; i++){ p[i*3] = 0; p[i*3+1] = 0; p[i*3+2] = 0; }
      geo.attributes.position.needsUpdate = true;
      tween({ from: 1, to: 0, dur: .8, ease: 'outCubic', onUpdate: v => { mat.opacity = v; }, onComplete: () => { pts.visible = false; } });
      tween({ from: 0, to: 1, dur: .8, ease: 'linear', onUpdate: (_, t, dt) => {
        const arr = geo.attributes.position.array;
        const d = dt || .016;
        for (let i = 0; i < N; i++){
          vel[i].y -= 4.5 * d;
          arr[i*3]   += vel[i].x * d;
          arr[i*3+1] += vel[i].y * d;
          arr[i*3+2] += vel[i].z * d;
        }
        geo.attributes.position.needsUpdate = true;
      }});
    },
    dispose(){ geo.dispose(); mat.dispose(); },
  };
}

/* ---------- deep thud via WebAudio (no audio files) ---------- */
function thud(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + .22);
    gain.gain.setValueAtTime(.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + .32);
    osc.onended = () => ctx.close();
  }catch(_){ /* audio is garnish, never required */ }
}

/* =====================================================================
   FinaleScene
   ===================================================================== */
export class FinaleScene {
  /**
   * @param {object} o
   * @param {'send'|'open'} o.mode       direction of the sequence
   * @param {HTMLElement}  o.sourceEl    DOM element to hand off from/to (invoice preview)
   * @param {object}       o.invoice     { number, total, shopName }
   * @param {string}       o.accent      hex accent color
   * @param {Function}     o.onDone      called with 'sent' | 'opened' | 'skipped'
   */
  constructor(o){
    this.mode = o.mode;
    this.sourceEl = o.sourceEl;
    this.invoice = o.invoice || {};
    this.accent = o.accent || '#ff2d3f';
    this.onDone = o.onDone || (() => {});
    this._handles = [];       // every tween created by this scene (skip/cancel)
    this._disposables = [];   // GPU resources
    this._resolved = false;
  }

  /* Every tween this scene creates goes through here so skip() can kill them. */
  _tw(opts){
    const h = tween(opts);
    this._handles.push(h);
    return h;
  }

  /* Multi-step timeline through the tracked tween wrapper. */
  _sequence(steps){
    let i = 0;
    const stepDone = () => {
      if (this._resolved || i >= steps.length) return;
      const opts = steps[i++];
      opts.onComplete = stepDone;
      this._tw(opts);
    };
    stepDone();
    return { cancel(){ i = steps.length; } }; // kill-all happens in skip()/exit()
  }

  enter(mgr){
    this.mgr = mgr;
    const scene = this.scene = new THREE.Scene();
    const cam = this.camera = new THREE.PerspectiveCamera(40, mgr._aspect(), .1, 100);
    cam.position.set(0, 0, 6);

    scene.add(new THREE.AmbientLight(0xffffff, .5));
    const key = new THREE.PointLight(0xffffff, 30, 0, 2); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.PointLight(new THREE.Color(this.accent), 26, 0, 2); rim.position.set(-4, -2, 3); scene.add(rim);

    const track = (res) => { this._disposables.push(res); return res; };

    /* paper — three horizontal bands (letter fold, folds on X hinges).
       BUGFIX (UV thirds): band i must show texture slice v∈[(2−i)/3,(3−i)/3]
       so the TOP band (i=0, at +h/3) shows the TOP of the invoice. The old
       code mapped (i+uv)/3, which rendered the paper upside-down. */
    const { texture, aspect } = makeInvoiceTexture(this.invoice);
    track(texture);
    this.paperH = 2.1; this.paperW = this.paperH / aspect;   // ≈ 1.5
    const thirdH = this.paperH / 3;
    const paperMat = track(new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true }));
    this.paperThirds = [0, 1, 2].map(i => {
      /* each outer band hangs from a pivot AT its crease (±thirdH/2);
         the middle band is static */
      const pivot = new THREE.Group();
      const geo = track(new THREE.PlaneGeometry(this.paperW, thirdH));
      const uv = geo.attributes.uv;
      const vBase = (2 - i) / 3;                 // slice start in texture space
      for (let k = 0; k < uv.count; k++){
        uv.setY(k, vBase + uv.getY(k) / 3);
      }
      const m = new THREE.Mesh(geo, paperMat);
      const off = i === 0 ? thirdH / 2 : (i === 2 ? -thirdH / 2 : 0);
      m.position.y = off;                        // band offset inside its pivot
      pivot.position.y = off;                    // pivot sits at the crease
      pivot.add(m);
      return pivot;
    });
    this.paper = new THREE.Group();
    this.paperThirds.forEach(t => this.paper.add(t));
    scene.add(this.paper);

    /* envelope — body + hinged flap + wax seal.
       BUGFIX (hinge): the group origin IS the hinge line at the body's TOP
       edge. Body hangs BELOW (y −1.15..0), flap hangs DOWN in front of the
       body (z +.035). Closed flap: pivot.rotation.x = 0. Open flap: π
       (folded up and back). No group flip — play functions can freely
       animate envelope.position / rotation.z without clobbering anything. */
    const envMat = track(new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: .55, metalness: .35 }));
    const flapMat = track(new THREE.MeshStandardMaterial({ color: 0x232830, roughness: .5, metalness: .45, side: THREE.DoubleSide }));
    this.envBody = new THREE.Mesh(track(new THREE.BoxGeometry(1.9, 1.15, .05)), envMat);
    this.envBody.position.y = -.575;             // body hangs below hinge line

    this.flapPivot = new THREE.Group();          // hinge at local origin
    this.flapPivot.position.z = .035;            // flap rides just in front of the body
    this.flap = new THREE.Mesh(track(new THREE.PlaneGeometry(1.9, .68)), flapMat);
    this.flap.position.y = -.34;                 // flap extends downward from hinge
    this.flapPivot.add(this.flap);

    const sealMat = track(new THREE.MeshStandardMaterial({ color: new THREE.Color(this.accent), roughness: .35, metalness: .1, emissive: new THREE.Color(this.accent), emissiveIntensity: .25 }));
    this.seal = new THREE.Mesh(track(new THREE.CylinderGeometry(.16, .18, .05, 24)), sealMat);
    this.seal.rotation.x = Math.PI / 2;
    this.seal.position.set(0, -.18, .075);       // stamped on the closed flap's face

    this.envelope = new THREE.Group();
    this.envelope.add(this.envBody, this.flapPivot, this.seal);
    scene.add(this.envelope);

    /* NOTE: all sequence tweens animate the envelope's position/rotation, so
       the flip above only affects geometry orientation, not the animated path. */

    this.sparks = makeSparks(this.accent);
    scene.add(this.sparks.object);
    this._disposables.push(this.sparks);

    this.mode === 'send' ? this._playSend() : this._playOpen();
  }

  update(){ /* all motion lives in tweens; nothing per-frame here */ }

  /* ---------------- SEND: fold → insert → seal → launch ---------------- */
  _playSend(){
    // start paper where the DOM invoice preview sits, projected to world space
    const m = this.sourceEl ? matchDomRect(this.camera, this.sourceEl, this.mgr.renderer) : null;
    const startX = m ? m.worldX : 0, startY = m ? m.worldY : .4;
    const startScale = m ? Math.min(m.worldHeight / this.paperH, 1.6) : 1;

    this.paper.position.set(startX, startY, .5);
    this.paper.scale.setScalar(startScale);
    this.paper.rotation.set(-.06, .05, 0);
    this.envelope.position.set(0, -1.1, 0);
    this.envelope.rotation.set(0, 0, .08);
    this.flapPivot.rotation.x = Math.PI;         // open: folded up and back
    this.seal.visible = false;

    this._fadeDom(true);

    this._sequence([
      // 0.00–0.35  commit: drift to center stage
      { from: startY, to: .55, dur: .35, ease: 'inOutCubic', onUpdate: v => { this.paper.position.y = v; } },
      // 0.35–0.95  fold top & bottom thirds toward viewer, squash, drop into envelope
      { from: 0, to: 2.5, dur: .5, ease: 'inOutCubic', onUpdate: v => { this.paperThirds[0].rotation.x = v; this.paperThirds[2].rotation.x = -v; } },
      { from: 1, to: .22, dur: .5, ease: 'inOutCubic', onUpdate: v => { this.paper.scale.y = startScale * v; } },
      { from: .55, to: -.9, dur: .45, ease: 'inCubic', onUpdate: v => { this.paper.position.y = v; } },
      { from: 0, to: 0, dur: .05, onUpdate: () => { this.paper.visible = false; } },
      // 0.95–1.35  flap closes (spring: π → 0), seal stamps with squash + impact
      { from: Math.PI, to: 0, dur: .3, ease: 'spring', onUpdate: v => { this.flapPivot.rotation.x = v; } },
      { from: 0, to: 0, dur: .02, onUpdate: () => { this.seal.visible = true; } },
      { from: .9, to: 0, dur: .16, ease: 'inCubic', onUpdate: v => { this.seal.position.y = -.18 + v; }, onComplete: () => {
          this.seal.scale.set(1.25, .55, 1.25);
          this.sealMatFlash();
          this.sparks.burst(new THREE.Vector3(0, -1.28, .12));   // at the seal, on the closed flap
          if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
          thud();
          setTimeout(() => this.seal.scale.set(1, 1, 1), 90);
      } },
      // 1.35–2.05  launch: pull camera, tilt, exit up-right
      { from: 6, to: 7.2, dur: .7, ease: 'outCubic', onUpdate: v => { this.camera.position.z = v; } },
      { from: 0, to: .5, dur: .7, ease: 'inCubic', onUpdate: v => { this.envelope.rotation.z = .08 + v; } },
      { from: 0, to: 5.5, dur: .7, ease: 'inCubic', onUpdate: v => { this.envelope.position.x = v; this.envelope.position.y = -1.1 + v * 1.018; } },
      // 2.05–2.40 resolve
      { from: 0, to: 0, dur: .35, onUpdate: () => {}, onComplete: () => this._resolve('sent') },
    ]);
  }

  /* ---------------- OPEN: drop → seal pops → flap opens → unfold ---------------- */
  _playOpen(){
    this.paper.visible = false;
    this.paper.position.set(0, -.9, .5);
    this.paperThirds[0].rotation.x = 2.5; this.paperThirds[2].rotation.x = -2.5;
    this.paper.scale.setScalar(1); this.paper.scale.y = .22;
    this.envelope.position.set(-5.5, 4.5, 0);
    this.envelope.rotation.set(0, 0, .58);
    this.flapPivot.rotation.x = 0;               // closed flap
    this.seal.visible = true;
    this._fadeDom(false);                        // reveal the DOM preview under the reveal

    this._sequence([
      // envelope flies IN from off-screen (x −5.5→0, y 4.5→−.2) and settles
      { from: -5.5, to: 0, dur: .55, ease: 'outCubic', onUpdate: v => {
          const k = (v + 5.5) / 5.5;             // k: 0 → 1 along the path
          this.envelope.position.set(v, 4.5 - 4.7 * k, 0);
      } },
      { from: .58, to: 0, dur: .4, ease: 'outCubic', onUpdate: v => { this.envelope.rotation.z = v; } },
      // seal pops off, flap swings open
      { from: 0, to: 1, dur: .25, ease: 'inCubic', onUpdate: v => {
          this.seal.position.z = .075 + v * .4; this.seal.rotation.x = Math.PI/2 + v * 2.2;
          this.seal.material.transparent = true; this.seal.material.opacity = 1 - v;
        }, onComplete: () => { this.seal.visible = false; if (navigator.vibrate) navigator.vibrate(15); } },
      { from: 0, to: Math.PI, dur: .35, ease: 'spring', onUpdate: v => { this.flapPivot.rotation.x = v; } },
      // paper rises out and unfolds
      { from: -.9, to: .55, dur: .5, ease: 'outCubic', onUpdate: v => { this.paper.visible = true; this.paper.position.y = v; } },
      { from: .22, to: 1, dur: .45, ease: 'spring', onUpdate: v => { this.paper.scale.y = v; } },
      { from: -2.5, to: 0, dur: .45, ease: 'outCubic', onUpdate: v => { this.paperThirds[0].rotation.x = -v; this.paperThirds[2].rotation.x = v; } },
      { from: 0, to: 0, dur: .3, onUpdate: () => {}, onComplete: () => this._resolve('opened') },
    ]);
  }

  sealMatFlash(){
    const mat = this.seal.material;
    this._tw({ from: 2.2, to: .25, dur: .5, ease: 'outCubic', onUpdate: v => { mat.emissiveIntensity = v; } });
  }

  /** Fade the real DOM preview so the 3D paper visually replaces it (and back). */
  _fadeDom(toHidden){
    if (!this.sourceEl) return null;
    const el = this.sourceEl;
    return this._tw({ from: toHidden ? 1 : 0, to: toHidden ? 0 : 1, dur: .3, ease: 'outCubic',
      onUpdate: v => { el.style.opacity = String(v); } });
  }

  /** Resolve: restore DOM, hand control back. Result: 'sent' | 'opened' | 'skipped'. */
  _resolve(result){
    if (this._resolved) return;
    this._resolved = true;
    this._killTweens();
    if (this.sourceEl) this.sourceEl.style.opacity = '';
    this.onDone(result);
  }

  /** Skip: jump straight to the end state. Wired to Skip button / ESC / scrim click. */
  skip(){
    this._resolve(this.mode === 'open' ? 'opened' : 'sent');
  }

  _killTweens(){
    this._handles.forEach(h => h && h.cancel && h.cancel());
    this._handles.length = 0;
  }

  exit(){
    this._killTweens();
    if (this.sourceEl) this.sourceEl.style.opacity = '';
    this._disposables.forEach(d => d.dispose && d.dispose());
    this._disposables.length = 0;
  }
}
