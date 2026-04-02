import { useCallback, useEffect, useState } from 'react'
import { LimbScene } from '../components/limb/LimbScene'
import { usePatient } from '../context/PatientContext'
import { clinicalApi } from '../services/clinicalApi'
import type { LimbModelState } from '../types/clinical'

export function PatientLimb3DViewPage() {
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
          <h1>3D 肢体视图</h1>
          <p className="muted">支持旋转、缩放，查看术后部位恢复热力和关节角度。</p>
        </div>
        <button type="button" className="btn ghost" onClick={() => void load()}>刷新视图</button>
      </header>
      {loading ? <section className="card">正在加载 3D 模型...</section> : null}
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
