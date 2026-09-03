/* =====================================================================
   BEAST-INVOICE — MOTION / TWEEN
   ~60-line hand-rolled tween engine (no dependencies). One rAF loop
   shared by all active tweens; delta-time based; zero allocation
   after start. Used by the 3D finale timeline and DOM number tweens.
   ===================================================================== */
'use strict';

const Ease = {
  linear:    t => t,
  outCubic:  t => 1 - Math.pow(1 - t, 3),
  outQuint:  t => 1 - Math.pow(1 - t, 5),
  inCubic:   t => t * t * t,
  inOutCubic:t => (t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2),
  // spring overshoot — standard easeOutBack (matches CSS --ease-spring)
  spring:    t => { const s = 1.70158; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
};

/* One shared rAF loop for every live tween. */
const TweenLoop = (() => {
  const live = new Set();
  let raf = null, last = 0;
  function frame(now){
    const dt = Math.min((now - last) / 1000, .05); // clamp tab-switch spikes
    last = now;
    for (const tw of live){
      tw._elapsed += dt;
      if (tw._elapsed < 0) continue;        // delay phase — hold at `from` (no negative-t easing)
      const t = Math.min(tw._elapsed / tw.dur, 1);
      tw.onUpdate(tw.from + (tw.to - tw.from) * tw.ease(t), t);
      if (t >= 1){ live.delete(tw); tw.onComplete && tw.onComplete(); }
    }
    raf = live.size ? requestAnimationFrame(frame) : null;
  }
  return {
    add(tw){ live.add(tw); if (!raf){ last = performance.now(); raf = requestAnimationFrame(frame); } },
    kill(tw){ live.delete(tw); },
    clearAll(){ live.clear(); },
    get active(){ return live.size; },
  };
})();

/**
 * tween({ from=0, to=1, dur=0.4, ease='outCubic', onUpdate, onComplete, delay=0 })
 * Durations in SECONDS. Returns a handle with .cancel().
 */
function tween(opts){
  const tw = {
    from:    opts.from    ?? 0,
    to:      opts.to      ?? 1,
    dur:     Math.max(opts.dur ?? .4, .001),
    ease:    typeof opts.ease === 'function' ? opts.ease : (Ease[opts.ease || 'outCubic'] || Ease.outCubic),
    onUpdate:opts.onUpdate || (() => {}),
    onComplete: opts.onComplete,
    _elapsed: -(opts.delay || 0),   // negative elapsed = delay phase
    cancel(){ TweenLoop.kill(tw); },
  };
  TweenLoop.add(tw);
  return tw;
}

/** Run tweens one after another: sequence([[opts, opts], ...]) — each entry is one tween's opts. */
function sequence(steps, onDone){
  let i = 0, cancelled = false;
  const handle = { cancel(){ cancelled = true; TweenLoop.clearAll(); } };
  (function next(){
    if (cancelled || i >= steps.length){ onDone && onDone(cancelled); return; }
    const opts = steps[i++];
    const orig = opts.onComplete;
    opts.onComplete = () => { orig && orig(); next(); };
    tween(opts);
  })();
  return handle;
}

export { Ease, tween, sequence, TweenLoop };
