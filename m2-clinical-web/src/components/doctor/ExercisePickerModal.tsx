import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { patientApiService } from '../../services/patientApiService'
import type { ApiExerciseCatalogItem } from '../../types/api'
import { LoadingBlock } from '../common/LoadingBlock'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (exercise: ApiExerciseCatalogItem) => void
}

export function ExercisePickerModal({ open, onClose, onSelect }: Props) {
  const { t } = useI18n()
  const [exercises, setExercises] = useState<ApiExerciseCatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void patientApiService
      .listExercises()
      .then((list) => {
        if (!cancelled) setExercises(list)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('loadFailed'))
          setExercises([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.category.toLowerCase().includes(q) ||
        ex.description.toLowerCase().includes(q),
    )
  }, [exercises, query])

  if (!open) return null

  return (
    <div className="entry-modal-mask" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="entry-modal exercise-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="exercise-picker-header">
          <h3 style={{ margin: 0, color: '#0f2a4e' }}>{t('exercisePickerTitle')}</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>

        <input
          className="patient-select exercise-picker-search"
          placeholder={t('exercisePickerSearch')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {loading ? <LoadingBlock label={t('loading')} /> : null}
        {error ? <p className="small" style={{ color: '#c53030' }}>{error}</p> : null}

        {!loading && !error && filtered.length === 0 ? (
          <p className="muted small">{t('exercisePickerEmpty')}</p>
        ) : null}

        <ul className="exercise-picker-list">
          {filtered.map((ex) => (
            <li key={ex.id} className="exercise-picker-row">
              <div className="exercise-picker-main">
                <p className="exercise-picker-name">{ex.name}</p>
                <span className="exercise-picker-category">{ex.category}</span>
                <p className="muted small exercise-picker-desc">
                  {ex.description.length > 160 ? `${ex.description.slice(0, 157)}…` : ex.description}
                </p>
              </div>
              <button type="button" className="btn primary small" onClick={() => onSelect(ex)}>
                {t('exercisePickerSelect')}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
