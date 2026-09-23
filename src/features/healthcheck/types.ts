export type HealthcheckPeriod = 'morning' | 'afternoon'

export type HealthcheckStatus =
  | 'pending'
  | 'confirmed'
  | 'rescheduled'
  | 'rejected'
  | 'completed'
  | 'cancelled'

export type HealthcheckPackage = {
  id: number
  name: string
  description: string
  items: string[]
  price: string
  priceNote: string
  tag: string | null
  sortOrder: number
  isActive: boolean
  requestCount?: number
}

export type HealthcheckRequestPayload = {
  packageId: number
  fullName: string
  phone: string
  birthDate: string
  preferredDate: string
  preferredPeriod: HealthcheckPeriod
  note: string
  website: string
}

export type HealthcheckSubmitResult = {
  ok: boolean
  message?: string
  refCode: string
  preferredDate: string
  preferredPeriod: HealthcheckPeriod
  packageName: string
}

export type HealthcheckPublicStatus = {
  refCode: string
  packageName: string
  firstName: string
  preferredDate: string
  preferredPeriod: HealthcheckPeriod
  confirmedDate: string | null
  confirmedPeriod: HealthcheckPeriod | null
  status: HealthcheckStatus
  staffNote: string | null
  createdAt: string
  updatedAt: string
}

export type HealthcheckAdminRequest = {
  id: number
  refCode: string
  packageId: number | null
  packageName: string
  fullName: string
  phone: string
  birthDate: string | null
  note: string | null
  preferredDate: string
  preferredPeriod: HealthcheckPeriod
  confirmedDate: string | null
  confirmedPeriod: HealthcheckPeriod | null
  status: HealthcheckStatus
  staffNote: string | null
  handledBy: string | null
  createdAt: string
  updatedAt: string
}

export type HealthcheckCounts = Record<HealthcheckStatus | 'today', number>

export type HealthcheckAdminAction = 'confirm' | 'reject' | 'complete' | 'cancel' | 'reopen' | 'note'
