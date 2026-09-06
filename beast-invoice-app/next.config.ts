import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Offline-safe build: the 3D layer ships bundled, no CDN in the critical path.
  productionBrowserSourceMaps: false,
  // This app lives inside the Beast-Invoice monorepo folder; pin tracing root.
  outputFileTracingRoot: path.resolve(),
}

export default nextConfig
