import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { alertError, confirmAction, toastError, toastSuccess } from '../../../lib/swal'
import { fetchAdminHealthcheckPackages, saveAdminHealthcheckPackage } from '../../healthcheck/api'
import type { HealthcheckPackage } from '../../healthcheck/types'

type Draft = {
  id?: number
  name: string
  description: string
  itemsText: string
  price: string
  priceNote: string
  tag: string
  sortOrder: number
  isActive: boolean
}

function toDraft(item: HealthcheckPackage | null, nextOrder: number): Draft {
  if (!item) {
    return {
      name: '',
      description: '',
      itemsText: '',
      price: 'สอบถามราคา',
      priceNote: '',
      tag: '',
      sortOrder: nextOrder,
      isActive: true,
    }
  }
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    itemsText: item.items.join('\n'),
    price: item.price,
    priceNote: item.priceNote,
    tag: item.tag ?? '',
    sortOrder: item.sortOrder,
    isActive: item.isActive,
  }
}

function PackageEditor({
  draft: initial,
  onClose,
  onSaved,
}: {
  draft: Draft
  onClose: () => void
  onSaved: (packages: HealthcheckPackage[]) => void
}) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim()) {
      void toastError('กรุณาตั้งชื่อแพ็กเกจ')
      return
    }
    setSaving(true)
    try {
      const packages = await saveAdminHealthcheckPackage({
        action: 'save',
        id: draft.id,
        name: draft.name,
        description: draft.description,
        items: draft.itemsText.split('\n').map((line) => line.trim()).filter(Boolean),
        price: draft.price,
        priceNote: draft.priceNote,
        tag: draft.tag,
        sortOrder: draft.sortOrder,
        isActive: draft.isActive,
      })
      void toastSuccess(draft.id ? 'บันทึกแพ็กเกจแล้ว' : 'เพิ่มแพ็กเกจแล้ว')
      onSaved(packages)
    } catch (err) {
      void alertError('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-editor-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="admin-editor hc-admin-editor" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="admin-editor__visual hc-admin-editor__visual">
          <span>แพ็กเกจตรวจสุขภาพ</span>
          <h2>{draft.id ? 'แก้ไขแพ็กเกจ' : 'เพิ่มแพ็กเกจใหม่'}</h2>
          <small>ข้อมูลนี้แสดงบนหน้าเว็บตรวจสุขภาพทันทีที่บันทึก</small>
        </div>
        <div className="admin-editor__body">
          <label className="admin-field">
            <span>ชื่อแพ็กเกจ *</span>
            <input value={draft.name} maxLength={191} onChange={(event) => set('name', event.target.value)} required />
          </label>
          <label className="admin-field">
            <span>คำอธิบายสั้น</span>
            <textarea rows={2} maxLength={1000} value={draft.description} onChange={(event) => set('description', event.target.value)} />
          </label>
          <label className="admin-field">
            <span>รายการตรวจ (บรรทัดละ 1 รายการ)</span>
            <textarea
              rows={6}
              value={draft.itemsText}
              onChange={(event) => set('itemsText', event.target.value)}
              placeholder={'ความสมบูรณ์ของเลือด (CBC)\nน้ำตาลในเลือด (FBS)'}
            />
          </label>
          <div className="hc-admin-grid">
            <label className="admin-field">
              <span>ราคา</span>
              <input value={draft.price} maxLength={100} onChange={(event) => set('price', event.target.value)} placeholder="เช่น 1,200 บาท" />
            </label>
            <label className="admin-field">
              <span>หน่วย/หมายเหตุราคา</span>
              <input value={draft.priceNote} maxLength={50} onChange={(event) => set('priceNote', event.target.value)} placeholder="เช่น / ท่าน" />
            </label>
            <label className="admin-field">
              <span>ป้ายเด่น (ไม่บังคับ)</span>
              <input value={draft.tag} maxLength={50} onChange={(event) => set('tag', event.target.value)} placeholder="เช่น แนะนำ" />
            </label>
            <label className="admin-field">
              <span>ลำดับการแสดง</span>
              <input
                type="number"
                min={0}
                max={999}
                value={draft.sortOrder}
                onChange={(event) => set('sortOrder', Number(event.target.value) || 0)}
              />
            </label>
          </div>
          <label className="hc-admin-switch">
            <input type="checkbox" checked={draft.isActive} onChange={(event) => set('isActive', event.target.checked)} />
            <span>เปิดให้คนไข้เลือกแพ็กเกจนี้</span>
          </label>
          <div className="admin-editor__actions">
            <span className="admin-editor__spacer" />
            <button type="button" className="btn admin-btn--ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
            <button className="btn btn--primary" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกแพ็กเกจ'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

export function AdminHealthcheckPackages() {
  const [packages, setPackages] = useState<HealthcheckPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPackages(await fetchAdminHealthcheckPackages())
    } catch (err) {
      void toastError(err instanceof Error ? err.message : 'โหลดแพ็กเกจไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const nextOrder = packages.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1

  async function toggle(item: HealthcheckPackage) {
    try {
      setPackages(await saveAdminHealthcheckPackage({ action: 'toggle', id: item.id }))
      void toastSuccess(item.isActive ? `ซ่อน “${item.name}” แล้ว` : `เปิด “${item.name}” แล้ว`)
    } catch (err) {
      void alertError('เปลี่ยนสถานะไม่สำเร็จ', err instanceof Error ? err.message : undefined)
    }
  }

  async function remove(item: HealthcheckPackage) {
    const used = item.requestCount ?? 0
    const answer = await confirmAction({
      title: `ลบ “${item.name}”?`,
      text:
        used > 0
          ? `มีคำขอเดิม ${used} รายการ คำขอเหล่านั้นยังอยู่และยังเห็นชื่อแพ็กเกจเดิม ถ้าแค่ไม่อยากให้เลือก แนะนำกด “ซ่อน” แทน`
          : 'ลบแล้วกู้คืนไม่ได้',
      confirmText: 'ลบแพ็กเกจ',
      danger: true,
    })
    if (!answer.isConfirmed) return
    try {
      setPackages(await saveAdminHealthcheckPackage({ action: 'delete', id: item.id }))
      void toastSuccess('ลบแพ็กเกจแล้ว')
    } catch (err) {
      void alertError('ลบไม่สำเร็จ', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <section className="admin-board">
      <div className="admin-board__heading hc-admin-heading">
        <div>
          <h2>แพ็กเกจตรวจสุขภาพ</h2>
          <p>แก้ชื่อ รายการตรวจ และราคาได้เอง · แพ็กเกจที่ซ่อนจะไม่แสดงบนหน้าเว็บ</p>
        </div>
        <button type="button" className="btn btn--primary hc-admin-add" onClick={() => setDraft(toDraft(null, nextOrder))}>
          <Plus size={16} /> เพิ่มแพ็กเกจ
        </button>
      </div>

      <div className={`hc-admin-packages${loading ? ' is-loading' : ''}`}>
        {packages.map((item) => (
          <article className={`hc-admin-package${item.isActive ? '' : ' is-hidden'}`} key={item.id}>
            <header>
              <span className="hc-admin-package__order">#{item.sortOrder}</span>
              {item.tag ? <span className="hc-badge hc-badge--rescheduled">{item.tag}</span> : null}
              {!item.isActive ? <span className="hc-badge hc-badge--cancelled">ซ่อนอยู่</span> : null}
            </header>
            <h3>{item.name}</h3>
            <p className="hc-admin-package__price">
              {item.price} {item.priceNote ? <small>{item.priceNote}</small> : null}
            </p>
            <p className="hc-admin-package__meta">
              {item.items.length} รายการตรวจ · คำขอทั้งหมด {item.requestCount ?? 0}
            </p>
            <footer>
              <button type="button" onClick={() => setDraft(toDraft(item, nextOrder))}>
                <Pencil size={15} /> แก้ไข
              </button>
              <button type="button" onClick={() => void toggle(item)}>
                {item.isActive ? <EyeOff size={15} /> : <Eye size={15} />} {item.isActive ? 'ซ่อน' : 'เปิด'}
              </button>
              <button type="button" className="is-danger" onClick={() => void remove(item)}>
                <Trash2 size={15} /> ลบ
              </button>
            </footer>
          </article>
        ))}
        {!loading && packages.length === 0 ? <p className="hc-admin-empty">ยังไม่มีแพ็กเกจ กด “เพิ่มแพ็กเกจ” เพื่อเริ่ม</p> : null}
      </div>

      {draft ? (
        <PackageEditor
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={(list) => {
            setPackages(list)
            setDraft(null)
          }}
        />
      ) : null}
    </section>
  )
}
