import { useEffect, useState } from 'react'
import { adminApiService } from '../../services/adminApiService'
import type { ApiPatient, ApiUserRole, ApiUserStatus } from '../../types/api'
import { useI18n } from '../../i18n/I18nContext'

type Props = {
  open: boolean
  user: ApiPatient | null
  onClose: () => void
  onSaved: () => void
}

const ROLES: ApiUserRole[] = ['patient', 'clinician', 'admin']
const STATUSES: ApiUserStatus[] = ['active', 'pending', 'rejected', 'disabled']
const UNASSIGNED_DOCTOR = '0'

export function UserEditModal({ open, user, onClose, onSaved }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [role, setRole] = useState<ApiUserRole>('patient')
  const [status, setStatus] = useState<ApiUserStatus>('active')
  const [doctorId, setDoctorId] = useState(UNASSIGNED_DOCTOR)
  const [clinicians, setClinicians] = useState<ApiPatient[]>([])
  const [cliniciansLoading, setCliniciansLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !user) return
    setName(user.name)
    setAge(user.age == null ? '' : String(user.age))
    setRole(user.role)
    setStatus(user.status)
    setDoctorId(String(user.doctor_id && user.doctor_id > 0 ? user.doctor_id : UNASSIGNED_DOCTOR))
    setError(null)

    setCliniciansLoading(true)
    adminApiService
      .listActiveClinicians()
      .then(setClinicians)
      .catch(() => setClinicians([]))
      .finally(() => setCliniciansLoading(false))
  }, [open, user])

  if (!open || !user) return null

  const resetAndClose = () => {
    setError(null)
    onClose()
  }

  const submit = async () => {
    const nameText = name.trim()
    if (!nameText) {
      setError(t('adminUserNameRequired'))
      return
    }
    let ageValue: number | null = null
    if (age.trim() !== '') {
      const n = Number(age)
      if (!Number.isFinite(n) || n < 0) {
        setError(t('adminUserAgeInvalid'))
        return
      }
      ageValue = Math.floor(n)
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload: Parameters<typeof adminApiService.updateUser>[1] = {
        name: nameText,
        age: ageValue,
        role,
        status,
      }
      if (role === 'patient') {
        payload.doctorId = Number(doctorId) || 0
      }
      await adminApiService.updateUser(user.id, payload)
      onSaved()
      resetAndClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('adminUserUpdateErr'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="entry-modal-mask" role="dialog" aria-modal="true" onClick={resetAndClose}>
      <div className="entry-modal feedback-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: '#0f2a4e' }}>{t('adminEditUserTitle')}</h3>
        <p className="muted small" style={{ marginTop: 6 }}>
          #{user.id} · {user.email}
        </p>
        <label className="muted small" htmlFor="user-edit-name" style={{ display: 'block', marginTop: 12 }}>
          {t('adminUserNameLabel')}
        </label>
        <input
          id="user-edit-name"
          className="patient-select"
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
        <label className="muted small" htmlFor="user-edit-age" style={{ display: 'block', marginTop: 10 }}>
          {t('adminUserAgeLabel')}
        </label>
        <input
          id="user-edit-age"
          type="number"
          min={0}
          className="patient-select"
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={age}
          placeholder={t('adminUserAgePlaceholder')}
          onChange={(e) => setAge(e.target.value)}
          disabled={submitting}
        />
        <label className="muted small" htmlFor="user-edit-role" style={{ display: 'block', marginTop: 10 }}>
          {t('adminUserRoleLabel')}
        </label>
        <select
          id="user-edit-role"
          className="patient-select"
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={role}
          onChange={(e) => setRole(e.target.value as ApiUserRole)}
          disabled={submitting}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r === 'patient'
                ? t('adminRolePatient')
                : r === 'clinician'
                  ? t('adminRoleDoctor')
                  : t('adminRoleAdminLabel')}
            </option>
          ))}
        </select>
        {role === 'patient' ? (
          <>
            <label className="muted small" htmlFor="user-edit-doctor" style={{ display: 'block', marginTop: 10 }}>
              {t('adminUserDoctorLabel')}
            </label>
            <select
              id="user-edit-doctor"
              className="patient-select"
              style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={submitting || cliniciansLoading}
            >
              <option value={UNASSIGNED_DOCTOR}>{t('adminUserDoctorUnassigned')}</option>
              {clinicians.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} (#{c.id})
                </option>
              ))}
            </select>
            {cliniciansLoading ? (
              <p className="muted small" style={{ marginTop: 4 }}>{t('adminUserDoctorLoading')}</p>
            ) : null}
          </>
        ) : null}
        <label className="muted small" htmlFor="user-edit-status" style={{ display: 'block', marginTop: 10 }}>
          {t('adminUserStatusLabel')}
        </label>
        <select
          id="user-edit-status"
          className="patient-select"
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={status}
          onChange={(e) => setStatus(e.target.value as ApiUserStatus)}
          disabled={submitting}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'active'
                ? t('adminStatusActive')
                : s === 'pending'
                  ? t('adminStatusPending')
                  : s === 'rejected'
                    ? t('adminStatusRejected')
                    : t('adminStatusDisabled')}
            </option>
          ))}
        </select>
        {error ? (
          <p className="muted small" style={{ color: '#c53030', marginTop: 8 }}>{error}</p>
        ) : null}
        <div className="role-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn ghost" onClick={resetAndClose} disabled={submitting}>
            {t('cancel')}
          </button>
          <button type="button" className="btn primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? t('loading') : t('adminUserSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
