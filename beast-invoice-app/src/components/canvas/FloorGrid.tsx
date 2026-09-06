'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { makeFloorMaterial } from '../../three/materials'

/** The showroom floor: distance-fading grid + accent "stage pool" (blueprint 6.3).
    uAA off on Mid tier (no fwidth derivatives, cheaper). */
export function FloorGrid({ accentHex, aa }: { accentHex: string; aa: boolean }) {
  const mat = useMemo(() => makeFloorMaterial(aa), [aa])
  useEffect(() => () => mat.dispose(), [mat])
  useEffect(() => {
    mat.uniforms.uAccent.value.set(accentHex)
  }, [accentHex, mat])
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt
  })
  return (
    <mesh rotation-x={-Math.PI / 2} material={mat}>
      <planeGeometry args={[90, 90]} />
    </mesh>
  )
}
