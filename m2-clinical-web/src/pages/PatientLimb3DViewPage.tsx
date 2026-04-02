import { useCallback, useEffect, useState } from 'react'
import { LimbScene } from '../components/limb/LimbScene'
import { usePatient } from '../context/PatientContext'
import { useI18n } from '../i18n/I18nContext'
import { clinicalApi } from '../services/clinicalApi'
import type { LimbModelState } from '../types/clinical'

export function PatientLimb3DViewPage() {
  const { t } = useI18n()
  const { patientId } = usePatient()
  const [state, setState] = useState<LimbModelState | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setState(await clinicalApi.getLimbOverlay(patientId))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="role-page portal-page patient-portal">
      <header className="page-header">
        <div>
          <h1>{t('patientLimbTitle')}</h1>
          <p className="muted">{t('patientLimbDesc')}</p>
        </div>
        <button type="button" className="btn ghost" onClick={() => void load()}>{t('refreshView')}</button>
      </header>
      {loading ? <section className="card">{t('loading3d')}</section> : null}
      {state ? (
        <section className="card limb-card">
          <div className="limb-meta">
            <p>{state.caption}</p>
            <p className="muted small">{state.dataMixNote}</p>
          </div>
          <div className="limb-canvas-host">
            <LimbScene state={state} />
          </div>
        </section>
      ) : null}
    </div>
  )
}
