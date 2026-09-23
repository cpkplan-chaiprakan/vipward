import { ClipboardList, Package } from 'lucide-react'
import { useState } from 'react'
import type { HealthcheckCounts } from '../../healthcheck/types'
import { AdminHealthcheckPackages } from './AdminHealthcheckPackages'
import { AdminHealthcheckRequests } from './AdminHealthcheckRequests'
import '../../healthcheck/healthcheck.css'
import './admin-healthcheck.css'

export function AdminHealthcheck({ onCounts }: { onCounts: (counts: HealthcheckCounts) => void }) {
  const [view, setView] = useState<'requests' | 'packages'>('requests')

  return (
    <>
      <div className="hc-admin-subtabs" role="tablist" aria-label="เมนูตรวจสุขภาพ">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'requests'}
          className={view === 'requests' ? 'is-active' : undefined}
          onClick={() => setView('requests')}
        >
          <ClipboardList size={16} /> คำขอนัดตรวจ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'packages'}
          className={view === 'packages' ? 'is-active' : undefined}
          onClick={() => setView('packages')}
        >
          <Package size={16} /> จัดการแพ็กเกจ
        </button>
      </div>

      {view === 'requests' ? <AdminHealthcheckRequests onCounts={onCounts} /> : <AdminHealthcheckPackages />}
    </>
  )
}
