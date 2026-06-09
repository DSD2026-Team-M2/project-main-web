import { useCallback, useEffect, useState } from 'react'
import { usePatient } from '../../context/PatientContext'
import { useI18n } from '../../i18n/I18nContext'
import { patientApiService } from '../../services/patientApiService'
import type {
  ApiExerciseCatalogItem,
  ApiScheduleDetail,
  ApiScheduleItem,
} from '../../types/api'
import { painLevelMeta } from '../../utils/painLevel'
import { LoadingBlock } from '../common/LoadingBlock'
import { ExercisePickerModal } from './ExercisePickerModal'
import { PrescriptionFormModal } from './PrescriptionFormModal'

export function PatientPrescriptionPanel() {
  const { patientId } = usePatient()
  const { t } = useI18n()
  const uid = Number(patientId)
  const isApiPatient = !isNaN(uid) && uid > 0

  const [plans, setPlans] = useState<ApiScheduleItem[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [planDetail, setPlanDetail] = useState<ApiScheduleDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [planName, setPlanName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState('30')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickedExercise, setPickedExercise] = useState<ApiExerciseCatalogItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const loadPlans = useCallback(async () => {
    if (!isApiPatient) {
      setPlans([])
      return
    }
    setLoadingPlans(true)
    try {
      const sched = await patientApiService.listSchedule(uid)
      setPlans(sched)
    } catch {
      setPlans([])
    } finally {
      setLoadingPlans(false)
    }
  }, [isApiPatient, uid])

  const loadPlanDetail = useCallback(async (scheduleId: number) => {
    setLoadingDetail(true)
    setDetailError(null)
    try {
      const detail = await patientApiService.getScheduleDetail(scheduleId)
      setPlanDetail(detail)
    } catch (e) {
      setPlanDetail(null)
      setDetailError(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setLoadingDetail(false)
    }
  }, [t])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  useEffect(() => {
    if (selectedPlanId == null) {
      setPlanDetail(null)
      setDetailError(null)
      return
    }
    void loadPlanDetail(selectedPlanId)
  }, [loadPlanDetail, selectedPlanId])

  function statusLabel(s: ApiScheduleItem['status']) {
    if (s === 'pending') return t('statusPending')
    if (s === 'completed') return t('statusCompleted')
    if (s === 'skipped') return t('statusSkipped')
    return s
  }

  function statusClass(s: ApiScheduleItem['status']) {
    if (s === 'completed') return 'pass'
    if (s === 'skipped') return 'fail'
    return 'idle'
  }

  async function submitPlan(e: React.FormEvent) {
    e.preventDefault()
    if (!isApiPatient) return
    if (!planName.trim()) {
      setCreateMsg({ text: t('rehabPlanNameRequired'), ok: false })
      return
    }
    setCreating(true)
    setCreateMsg(null)
    try {
      const created = await patientApiService.createScheduleItem({
        userId: uid,
        exercise: planName.trim(),
        date,
        duration: Number(duration) || 30,
        notes,
        status: 'pending',
      })
      await loadPlans()
      setPlanName('')
      setNotes('')
      setShowCreate(false)
      setSelectedPlanId(created.id)
      setCreateMsg({ text: t('rehabPlanCreated'), ok: true })
    } catch (err) {
      setCreateMsg({ text: err instanceof Error ? err.message : t('loadFailed'), ok: false })
    } finally {
      setCreating(false)
    }
  }

  function openPicker() {
    setPickerOpen(true)
  }

  function handleExerciseSelect(exercise: ApiExerciseCatalogItem) {
    setPickedExercise(exercise)
    setPickerOpen(false)
    setFormOpen(true)
  }

  async function assignExercise(payload: Parameters<
    typeof patientApiService.addScheduleExercise
  >[1]) {
    if (selectedPlanId == null) return
    const added = await patientApiService.addScheduleExercise(selectedPlanId, payload)
    setPlanDetail((prev) =>
      prev
        ? { ...prev, exercises: [...prev.exercises, added] }
        : prev,
    )
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null

  if (!isApiPatient) {
    return (
      <section className="card prescription-card">
        <h3 className="card-title">{t('patientDashboardPrescription')}</h3>
        <p className="muted small">{t('sessionsInvalidId')}</p>
      </section>
    )
  }

  return (
    <section className="card prescription-card">
      <div className="prescription-card-header">
        <h3 className="card-title">{t('rehabPlansTitle')}</h3>
        <button
          type="button"
          className="btn primary small"
          onClick={() => {
            setShowCreate((v) => !v)
            setCreateMsg(null)
          }}
        >
          {showCreate ? t('rehabPlanCancelCreate') : t('rehabPlanCreate')}
        </button>
      </div>

      {showCreate ? (
        <form className="prescription-form" onSubmit={(e) => void submitPlan(e)}>
          <div className="prescription-field prescription-field--full">
            <label className="muted small">
              {t('rehabPlanName')} *
              <input
                className="patient-select"
                placeholder={t('rehabPlanNamePh')}
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="prescription-field">
            <label className="muted small">
              {t('sessionDate')}
              <input
                type="date"
                className="patient-select"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>

          <div className="prescription-field">
            <label className="muted small">
              {t('sessionDuration')}
              <input
                type="number"
                className="patient-select"
                value={duration}
                min="1"
                onChange={(e) => setDuration(e.target.value)}
              />
            </label>
          </div>

          <div className="prescription-field prescription-field--full">
            <label className="muted small">
              {t('rehabPlanNotes')}
              <textarea
                className="patient-select"
                placeholder={t('rehabPlanNotesPh')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </label>
          </div>

          <div className="prescription-actions prescription-field--full">
            <button type="submit" className="btn primary" disabled={creating}>
              {creating ? t('sessionSaving') : t('rehabPlanSave')}
            </button>
            {createMsg ? (
              <span className="small" style={{ color: createMsg.ok ? '#22c55e' : '#ef4444' }}>
                {createMsg.text}
              </span>
            ) : null}
          </div>
        </form>
      ) : null}

      {loadingPlans ? <LoadingBlock label={t('loading')} /> : null}

      {!loadingPlans && plans.length === 0 ? (
        <p className="muted small">{t('rehabPlansEmpty')}</p>
      ) : null}

      {!loadingPlans && plans.length > 0 ? (
        <div className="rehab-plan-workspace">
          <section className="rehab-plans-section" aria-label={t('rehabPlanListTitle')}>
            <p className="rehab-section-label">{t('rehabPlanListTitle')}</p>
            <div className="rehab-plan-list">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id
                return (
                  <button
                    key={plan.id}
                    type="button"
                    className={`rehab-plan-card${isSelected ? ' rehab-plan-card--active' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedPlanId((current) => (current === plan.id ? null : plan.id))
                    }
                  >
                    {isSelected ? (
                      <span className="rehab-plan-selected-mark" aria-hidden="true">
                        ✓ {t('rehabPlanSelected')}
                      </span>
                    ) : null}
                    <div className="rehab-plan-card-body">
                      <div className="rehab-plan-main">
                        <p className="rehab-plan-title">{plan.exercise}</p>
                        <p className="muted small">
                          {plan.date.slice(0, 10)} · {plan.duration} min
                          {plan.doctor_name ? ` · ${plan.doctor_name}` : ''}
                        </p>
                        {plan.notes ? (
                          <p className="muted small rehab-plan-notes">{plan.notes}</p>
                        ) : null}
                      </div>
                      <span className={`check-state ${statusClass(plan.status)}`}>
                        {statusLabel(plan.status)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {selectedPlanId != null ? (
            <section
              className="rehab-plan-detail"
              aria-label={t('rehabPlanExercises')}
            >
              <div className="rehab-plan-detail-divider" role="separator" aria-hidden="true">
                <span className="rehab-plan-detail-divider-label">{t('rehabPlanDetailDivider')}</span>
              </div>

              <div className="rehab-plan-detail-header">
                <div className="rehab-plan-detail-heading">
                  <p className="rehab-section-label">{t('rehabPlanExercises')}</p>
                  {selectedPlan ? (
                    <p className="rehab-plan-detail-subtitle">{selectedPlan.exercise}</p>
                  ) : null}
                </div>
                <button type="button" className="btn primary small" onClick={openPicker}>
                  {t('rehabPlanAddExercise')}
                </button>
              </div>

          {loadingDetail ? <LoadingBlock label={t('loading')} /> : null}
          {detailError ? <p className="small" style={{ color: '#ef4444' }}>{detailError}</p> : null}

          {!loadingDetail && planDetail && planDetail.exercises.length === 0 ? (
            <p className="muted small">{t('rehabPlanExercisesEmpty')}</p>
          ) : null}

          {!loadingDetail && planDetail && planDetail.exercises.length > 0 ? (
            <ul className="rehab-exercise-list">
              {planDetail.exercises.map((ex) => {
                const holdPart = ex.holdSeconds > 0 ? ` · ${ex.holdSeconds}s` : ''
                const pain =
                  ex.lastPainLevel != null ? painLevelMeta(ex.lastPainLevel) : null
                return (
                  <li key={ex.id} className="rehab-exercise-row">
                    <div className="rehab-exercise-main">
                      <p className="rehab-exercise-name">
                        {ex.name}
                        <span className="rehab-phase-tag">{ex.phase}</span>
                      </p>
                      <p className="muted small">
                        {ex.sets} × {ex.reps}
                        {holdPart}
                      </p>
                      {ex.notes ? <p className="muted small rehab-exercise-notes">{ex.notes}</p> : null}
                    </div>
                    <div className="rehab-exercise-meta">
                      <span className={`check-state ${ex.completed ? 'pass' : 'idle'}`}>
                        {ex.completed ? t('rehabExerciseCompleted') : t('statusPending')}
                      </span>
                      {pain ? (
                        <span
                          className="rehab-pain-chip"
                          style={{ color: pain.color, borderColor: pain.color }}
                        >
                          {t('rehabExercisePain')}: {pain.level}
                        </span>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
            </section>
          ) : (
            <p className="muted small rehab-plan-select-hint">{t('rehabPlanSelectHint')}</p>
          )}
        </div>
      ) : null}

      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleExerciseSelect}
      />
      <PrescriptionFormModal
        open={formOpen}
        exercise={pickedExercise}
        onClose={() => {
          setFormOpen(false)
          setPickedExercise(null)
        }}
        onSubmit={assignExercise}
      />
    </section>
  )
}
