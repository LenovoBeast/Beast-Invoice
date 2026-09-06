'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { makeEmberMaterial } from '../../three/materials'

/** Global ember particles (blueprint 6.2): ONE draw call, zero per-frame
    allocation, positions animated entirely in the vertex shader from uTime. */
export function EmberField({ count, accentHex }: { count: number; accentHex: string }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const mat = useMemo(() => makeEmberMaterial(), [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16
      pos[i * 3 + 1] = Math.random() * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * 9
      seeds[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return g
  }, [count])

  useEffect(() => () => {
    geo.dispose()
    mat.dispose()
  }, [geo, mat])
  useEffect(() => {
    mat.uniforms.uAccent.value.set(accentHex)
  }, [accentHex, mat])
  useEffect(() => {
    mat.uniforms.uPixelRatio.value = dpr
  }, [dpr, mat])
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt
  })

  return <points geometry={geo} material={mat} position={[0, 1.2, -1]} />
}
