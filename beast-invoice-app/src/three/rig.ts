import * as THREE from 'three'

/** Module-level mutable targets: continuous values live here, never in React
    state (BEAST_3D_BLUEPRINT.md 7). Smoothed toward in useFrame each frame. */
export const pointer = { x: 0, y: 0 }

export function bindPointer(): () => void {
  if (typeof window === 'undefined') return () => {}
  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  return () => window.removeEventListener('pointermove', onMove)
}

export const tmpTarget = new THREE.Vector3()
export const tmpLook = new THREE.Vector3()
