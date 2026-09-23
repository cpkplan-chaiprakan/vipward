import type {
  HealthcheckAdminAction,
  HealthcheckAdminRequest,
  HealthcheckCounts,
  HealthcheckPackage,
  HealthcheckPeriod,
  HealthcheckPublicStatus,
  HealthcheckRequestPayload,
  HealthcheckSubmitResult,
} from './types'

function apiUrl(file: string): string {
  const configured = import.meta.env.VITE_API_BASE
  if (configured) {
    return `${configured.replace(/\/$/, '')}/api/healthcheck/${file}`
  }
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/api/healthcheck/${file}`
}

async function jsonFetch<T>(file: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(file), {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new Error('เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')
  }

  let data: (T & { message?: string }) | null = null
  try {
    data = (await response.json()) as T & { message?: string }
  } catch {
    data = null
  }
  if (!response.ok || !data) {
    throw new Error(data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
  }
  return data
}

function postJson<T>(file: string, body: unknown): Promise<T> {
  return jsonFetch<T>(file, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function fetchHealthcheckPackages(): Promise<HealthcheckPackage[]> {
  const data = await jsonFetch<{ packages: HealthcheckPackage[] }>('packages.php')
  return data.packages
}

export function submitHealthcheckRequest(payload: HealthcheckRequestPayload): Promise<HealthcheckSubmitResult> {
  return postJson('request.php', payload)
}

export async function lookupHealthcheckRequest(ref: string, phone: string): Promise<HealthcheckPublicStatus> {
  const query = new URLSearchParams({ ref: ref.trim().toUpperCase(), phone: phone.replace(/\D/g, '') })
  const data = await jsonFetch<{ request: HealthcheckPublicStatus }>(`request.php?${query}`)
  return data.request
}

export type AdminRequestsResponse = {
  requests: HealthcheckAdminRequest[]
  counts: HealthcheckCounts
}

export function fetchAdminHealthcheckRequests(status: string): Promise<AdminRequestsResponse> {
  return jsonFetch(`admin-requests.php?status=${encodeURIComponent(status)}`)
}

export function updateAdminHealthcheckRequest(payload: {
  id: number
  action: HealthcheckAdminAction
  date?: string
  period?: HealthcheckPeriod
  note?: string
}): Promise<{ request: HealthcheckAdminRequest; counts: HealthcheckCounts }> {
  return postJson('admin-requests.php', payload)
}

export async function fetchAdminHealthcheckPackages(): Promise<HealthcheckPackage[]> {
  const data = await jsonFetch<{ packages: HealthcheckPackage[] }>('admin-packages.php')
  return data.packages
}

export async function saveAdminHealthcheckPackage(
  payload: Partial<HealthcheckPackage> & { action: 'save' | 'toggle' | 'delete' },
): Promise<HealthcheckPackage[]> {
  const data = await postJson<{ packages: HealthcheckPackage[] }>('admin-packages.php', payload)
  return data.packages
}
