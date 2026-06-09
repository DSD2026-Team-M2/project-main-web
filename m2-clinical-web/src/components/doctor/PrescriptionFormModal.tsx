import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import type { ApiExerciseCatalogItem, ExercisePhase } from '../../types/api'
import { EXERCISE_PHASES } from '../../types/api'

type Props = {
  open: boolean
  exercise: ApiExerciseCatalogItem | null
  onClose: () => void
  onSubmit: (payload: {
    name: string
    phase: ExercisePhase
    sets: number
    reps: number
    hold_seconds: number
    notes: string
    gif_url: string | null
    description: string
  }) => Promise<void>
}

export function PrescriptionFormModal({ open, exercise, onClose, onSubmit }: Props) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<ExercisePhase>('Strength')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [holdSeconds, setHoldSeconds] = useState('0')
  const [notes, setNotes] = useState('')
  const [gifUrl, setGifUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !exercise) return
    setPhase('Strength')
    setSets('3')
    setReps('10')
    setHoldSeconds('0')
    setNotes('')
    setGifUrl(exercise.gif_url ?? '')
    setError(null)
    setSubmitting(false)
  }, [exercise, open])

  if (!open || !exercise) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const setsN = Number(sets)
    const repsN = Number(reps)
    const holdN = Number(holdSeconds)
    if (!Number.isFinite(setsN) || setsN < 1 || !Number.isFinite(repsN) || repsN < 1) {
      setError(t('prescriptionFormInvalidSetsReps'))
      return
    }
    if (!Number.isFinite(holdN) || holdN < 0) {
      setError(t('prescriptionFormInvalidHold'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: exercise.name,
        phase,
        sets: setsN,
        reps: repsN,
        hold_seconds: holdN,
        notes: notes.trim(),
        gif_url: gifUrl.trim() || null,
        description: exercise.description,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="entry-modal-mask" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="entry-modal prescription-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, color: '#0f2a4e' }}>
          {t('prescriptionFormTitle', { name: exercise.name })}
        </h3>
        <p className="muted small" style={{ marginTop: 6 }}>
          {exercise.description}
        </p>

        <form className="prescription-modal-form" onSubmit={(e) => void submit(e)}>
          <label className="muted small">
            {t('prescriptionFormPhase')}
            <select
              className="patient-select"
              value={phase}
              onChange={(e) => setPhase(e.target.value as ExercisePhase)}
            >
              {EXERCISE_PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <div className="prescription-modal-grid">
            <label className="muted small">
              {t('prescriptionFormSets')}
              <input
                type="number"
                min={1}
                className="patient-select"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
              />
            </label>
            <label className="muted small">
              {t('prescriptionFormReps')}
              <input
                type="number"
                min={1}
                className="patient-select"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </label>
            <label className="muted small">
              {t('prescriptionFormHold')}
              <input
                type="number"
                min={0}
                className="patient-select"
                value={holdSeconds}
                onChange={(e) => setHoldSeconds(e.target.value)}
              />
            </label>
          </div>

          <label className="muted small">
            {t('prescriptionFormNotes')}
            <textarea
              className="patient-select"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('prescriptionFormNotesPh')}
            />
          </label>

          <label className="muted small">
            {t('prescriptionFormGifUrl')}
            <input
              className="patient-select"
              value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
              placeholder="https://"
            />
          </label>

          {error ? <p className="small" style={{ color: '#c53030' }}>{error}</p> : null}

          <div className="prescription-modal-actions">
            <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? t('sessionSaving') : t('prescriptionFormAssign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
