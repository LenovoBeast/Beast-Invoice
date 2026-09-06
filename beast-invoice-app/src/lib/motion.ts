'use client'

import gsap from 'gsap'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Accent re-tint (contract A7): tween a proxy mix and let the caller write the
    CSS vars each frame; shader uniforms subscribe through the same callback. */
export function shiftAccent(from: string, to: string, apply: (hex: string) => void): void {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  const proxy = { t: 0 }
  gsap.to(proxy, {
    t: 1,
    duration: 0.4,
    ease: 'power2.out',
    onUpdate: () => {
      apply(rgbToHex(
        a.r + (b.r - a.r) * proxy.t,
        a.g + (b.g - a.g) * proxy.t,
        a.b + (b.b - a.b) * proxy.t,
      ))
    },
    onComplete: () => apply(to),
  })
}
