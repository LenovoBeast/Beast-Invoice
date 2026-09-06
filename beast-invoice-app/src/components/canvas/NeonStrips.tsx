'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { makeGlowTexture } from '../../three/materials'

/** Ceiling neon strips: emissive boxes + additive glow sprites (fake glow until
    PostFX bloom lands in the S1 full build). Re-tints with the settings accent. */
export function NeonStrips({ accentHex }: { accentHex: string }) {
  const glow = useMemo(() => makeGlowTexture(), [])
  useEffect(() => () => glow.dispose(), [glow])
  return (
    <group position={[0, 3.4, -0.6]}>
      {[-2.2, 2.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh>
            <boxGeometry args={[1.6, 0.05, 0.12]} />
            <meshStandardMaterial
              color="#0c0e12"
              emissive={accentHex}
              emissiveIntensity={2.4}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, -0.1, 0.005]}>
            <planeGeometry args={[2.8, 1.0]} />
            <meshBasicMaterial
              map={glow}
              color={accentHex}
              transparent
              opacity={0.32}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
