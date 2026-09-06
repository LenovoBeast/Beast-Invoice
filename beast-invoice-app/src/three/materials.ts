import * as THREE from 'three'

/* Shader sources per BEAST_3D_BLUEPRINT.md 6. Mobile reductions are uniform
   switches (uAA, uWind), not separate shaders. WebGL2 assumed (three r180). */

const FLOOR_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const FLOOR_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform vec3 uAccent;
uniform float uTime;
uniform float uAA;
float gridLine(vec2 uv, float scale) {
  vec2 g = abs(fract(uv * scale - 0.5) - 0.5);
  if (uAA > 0.5) {
    vec2 w = fwidth(uv * scale);
    return 1.0 - min(min(g.x / max(w.x, 1e-4), g.y / max(w.y, 1e-4)), 1.0);
  }
  return 1.0 - step(0.02, min(g.x, g.y));
}
void main() {
  vec2 uv = vWorld.xz;
  float fade = smoothstep(14.0, 2.0, length(uv));
  vec3 col = vec3(0.047, 0.055, 0.07)
    + uAccent * (gridLine(uv, 1.0) * 0.12 + gridLine(uv, 4.0) * 0.06) * fade
    + uAccent * 0.06 * smoothstep(0.35, 0.0, abs(length(uv) - 2.4)) * (0.6 + 0.4 * sin(uTime * 0.8));
  // alpha fades with distance so the plane blends into the CSS backdrop (no seam)
  gl_FragColor = vec4(col, fade);
}
`

const EMBER_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
uniform float uWind;
varying float vFade;
varying float vSeed;
void main() {
  vSeed = aSeed;
  vec3 p = position;
  float t = uTime * (0.15 + aSeed * 0.12);
  p.y = mod(p.y + t, 6.0) - 3.0;
  p.x += sin(t * 2.0 + aSeed * 40.0) * 0.18 + uWind * aSeed;
  vFade = smoothstep(3.0, 2.2, abs(p.y));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min((20.0 + aSeed * 40.0) * uPixelRatio / max(-mv.z, 0.5), 26.0 * uPixelRatio);
}
`

const EMBER_FRAG = /* glsl */ `
precision mediump float;
varying float vFade;
varying float vSeed;
uniform vec3 uAccent;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d) * vFade * 0.8;
  vec3 c = mix(uAccent, vec3(1.0, 0.54, 0.24), vSeed * 0.7);
  gl_FragColor = vec4(c, a);
}
`

export function makeFloorMaterial(aa: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAccent: { value: new THREE.Color('#ff2d3f') },
      uAA: { value: aa ? 1 : 0 },
    },
    vertexShader: FLOOR_VERT,
    fragmentShader: FLOOR_FRAG,
    transparent: true,
    depthWrite: false,
  })
}

export function makeEmberMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uWind: { value: 0 },
      uAccent: { value: new THREE.Color('#ff2d3f') },
    },
    vertexShader: EMBER_VERT,
    fragmentShader: EMBER_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

/** Soft radial sprite used as fake glow (CINEMATIC F2 approach: no postprocessing
    in this slice). Generated once, one 128px canvas, no downloads. */
export function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.28)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
