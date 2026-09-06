import type { ZoneKey } from '@/lib/types'

export interface ZoneAnchor {
  pos: [number, number, number]
  look: [number, number, number]
}

/** Camera anchors per zone (BEAST_3D_BLUEPRINT.md 2.1). y is standing eye height. */
export const ZONE_ANCHORS: Record<ZoneKey, ZoneAnchor> = {
  reception: { pos: [0, 1.6, 7.2], look: [0, 1.2, 0] },
  workbench: { pos: [0.4, 1.7, 5.6], look: [0, 1.3, 0] },
  archive: { pos: [-2.8, 1.8, 6.0], look: [-2.4, 1.4, 0] },
  bays: { pos: [2.8, 1.8, 6.2], look: [2.4, 1.4, 0] },
  catalog: { pos: [1.6, 1.7, 5.9], look: [1.2, 1.3, 0] },
  office: { pos: [0, 2.0, 8.2], look: [0, 1.6, -1] },
}

export function zoneForPath(path: string): ZoneKey {
  if (path.startsWith('/invoice')) return 'workbench'
  if (path.startsWith('/invoices')) return 'archive'
  if (path.startsWith('/clients')) return 'bays'
  if (path.startsWith('/catalog')) return 'catalog'
  if (path.startsWith('/settings')) return 'office'
  return 'reception'
}
