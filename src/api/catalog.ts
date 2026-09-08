import { site as fallbackSite } from '../data/site'
import type { SiteContent } from '../types'

export type CatalogResponse = {
  ok: boolean
  source?: 'mysql' | 'fallback'
  hospital?: SiteContent['hospital'] | null
  rooms?: SiteContent['rooms']
  roomsAlt?: SiteContent['roomsAlt']
  packages?: SiteContent['packages']
  amenities?: SiteContent['amenities']
  steps?: SiteContent['steps']
  perks?: SiteContent['perks']
  rights?: SiteContent['rights']
}

function catalogUrl(): string {
  if (import.meta.env.VITE_API_BASE) {
    return `${import.meta.env.VITE_API_BASE.replace(/\/$/, '')}/api/catalog.php`
  }

  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/api/catalog.php`
}

export async function fetchCatalog(): Promise<{ site: SiteContent; source: 'mysql' | 'fallback' }> {
  const fallback = { site: fallbackSite, source: 'fallback' as const }

  try {
    const res = await fetch(catalogUrl(), { headers: { Accept: 'application/json' } })
    if (!res.ok) return fallback

    const data = (await res.json()) as CatalogResponse
    if (!data.ok) return fallback

    return {
      source: data.source === 'mysql' ? 'mysql' : 'fallback',
      site: {
        ...fallbackSite,
        hospital: { ...fallbackSite.hospital, ...(data.hospital ?? {}) },
        rooms: data.rooms?.length ? data.rooms : fallbackSite.rooms,
        roomsAlt: data.roomsAlt?.length ? data.roomsAlt : fallbackSite.roomsAlt,
        packages: data.packages?.length ? data.packages : fallbackSite.packages,
        amenities: data.amenities?.length ? data.amenities : fallbackSite.amenities,
        steps: data.steps?.length ? data.steps : fallbackSite.steps,
        perks: data.perks?.length ? data.perks : fallbackSite.perks,
        rights: data.rights?.length ? data.rights : fallbackSite.rights,
      },
    }
  } catch {
    return fallback
  }
}
