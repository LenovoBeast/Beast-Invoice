'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

/** Reception hero prop: low-poly show car on a lift, primitives only
    (blueprint 2.1 "car on the lift", CINEMATIC F1). No GLTF downloads. */
function buildCarGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape()
  s.moveTo(-2.0, 0.3)
  s.lineTo(-2.05, 0.55)
  s.lineTo(-1.85, 0.72)
  s.lineTo(-1.15, 0.78)
  s.lineTo(-0.75, 1.08)
  s.lineTo(0.35, 1.12)
  s.lineTo(0.95, 0.78)
  s.lineTo(1.9, 0.7)
  s.lineTo(2.05, 0.5)
  s.lineTo(2.0, 0.3)
  s.closePath()
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.78, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 })
  geo.center()
  return geo
}

export function ShowCar() {
  const carGeo = useMemo(() => buildCarGeometry(), [])
  return (
    <group position={[0, 0, -2.6]}>
      {/* lift platform + posts */}
      <mesh position={[0, 0.66, 0]}>
        <boxGeometry args={[4.6, 0.08, 1.1]} />
        <meshStandardMaterial color="#242a34" metalness={0.2} roughness={0.7} />
      </mesh>
      <mesh position={[-1.9, 0.31, 0]}>
        <boxGeometry args={[0.14, 0.62, 0.14]} />
        <meshStandardMaterial color="#1b2028" metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[1.9, 0.31, 0]}>
        <boxGeometry args={[0.14, 0.62, 0.14]} />
        <meshStandardMaterial color="#1b2028" metalness={0.2} roughness={0.6} />
      </mesh>
      {/* body: low metalness (no envmap in this slice, metals render black);
          faint emissive keeps the silhouette readable in the dark showroom */}
      <mesh geometry={carGeo} position={[0, 1.12, 0]} rotation-y={Math.PI / 2}>
        <meshStandardMaterial
          color="#435063"
          emissive="#141a26"
          emissiveIntensity={1}
          metalness={0.15}
          roughness={0.45}
        />
      </mesh>
      {/* wheels */}
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 0.86, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.26, 0.26, 0.16, 24]} />
          <meshStandardMaterial color="#11151b" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}
