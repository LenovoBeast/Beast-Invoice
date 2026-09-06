'use client'

import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '@/lib/store/app'
import { useSpatial } from '@/lib/store/spatial'
import { CameraRig } from './CameraRig'
import { EmberField } from './EmberField'
import { FloorGrid } from './FloorGrid'
import { NeonStrips } from './NeonStrips'
import { ShowCar } from './ShowCar'

function AccentLights({ accentHex }: { accentHex: string }) {
  return (
    <>
      <pointLight position={[-3.2, 2.6, 2.5]} intensity={80} distance={16} decay={2} color={accentHex} />
      <pointLight position={[3.2, 2.6, 2.5]} intensity={80} distance={16} decay={2} color={accentHex} />
    </>
  )
}

/** One persistent canvas for the whole app (contract A5). The camera travels
    between zones; DOM panels live above (z10), never inside WebGL. */
export default function SceneRoot() {
  const tier = useSpatial((s) => s.tier)
  const setCanvasReady = useSpatial((s) => s.setCanvasReady)
  const accentHex = useAppStore((s) => s.settings.accentHex)

  return (
    <Canvas
      dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, tier === 'High' ? 1.75 : 1.5) : 1}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 42, near: 0.1, far: 100, position: [0, 1.6, 7.2] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.1
        setCanvasReady(true)
      }}
    >
      {/* physical units (three r155+): punctual lights fall off as I/d2.
          Directional key is unitless and unambiguous: 3.0 = clearly lit. */}
      <hemisphereLight args={['#4a566b', '#07080a', 3]} />
      <directionalLight position={[0, 6, 4]} intensity={3} />
      <spotLight position={[0, 6, 4]} angle={0.5} penumbra={1} intensity={600} distance={24} decay={2} />
      {/* dim white front fill so silhouettes read without stealing the neon's job */}
      <pointLight position={[0, 2.2, 6.5]} intensity={50} distance={18} decay={2} color="#dfe6f0" />
      <AccentLights accentHex={accentHex} />
      <FloorGrid accentHex={accentHex} aa={tier === 'High'} />
      <NeonStrips accentHex={accentHex} />
      <ShowCar />
      <EmberField count={tier === 'High' ? 400 : 220} accentHex={accentHex} />
      <CameraRig />
    </Canvas>
  )
}
