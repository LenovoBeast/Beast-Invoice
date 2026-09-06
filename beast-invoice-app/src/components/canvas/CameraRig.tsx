'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useSpatial } from '@/lib/store/spatial'
import { bindPointer, pointer, tmpLook } from '@/three/rig'
import { ZONE_ANCHORS } from '@/three/zones'

/** Camera dolly between zones + lissajous drift + pointer parallax.
    Continuous values stay in module refs; React never re-renders from motion. */
export function CameraRig() {
  const zone = useSpatial((s) => s.zone)
  const look = useMemo(() => new THREE.Vector3(0, 1.2, 0), [])

  useEffect(() => bindPointer(), [])

  useFrame((state, dt) => {
    const a = ZONE_ANCHORS[zone]
    const t = state.clock.elapsedTime
    const k = Math.min(dt * 2.2, 1) // frame-rate independent smoothing
    const cam = state.camera
    const targetX = a.pos[0] + Math.sin(t * 0.13) * 0.3 + pointer.x * 0.25
    const targetY = a.pos[1] + Math.sin(t * 0.09) * 0.1 + pointer.y * 0.12
    cam.position.x += (targetX - cam.position.x) * k
    cam.position.y += (targetY - cam.position.y) * k
    cam.position.z += (a.pos[2] - cam.position.z) * k
    tmpLook.set(a.look[0], a.look[1], a.look[2])
    look.lerp(tmpLook, k)
    cam.lookAt(look)
  })

  return null
}
