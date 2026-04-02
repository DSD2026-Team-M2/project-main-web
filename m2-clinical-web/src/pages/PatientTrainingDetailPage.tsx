import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePatientPortal } from '../context/PatientPortalContext'
import { useI18n } from '../i18n/I18nContext'

export function PatientTrainingDetailPage() {
  const { t } = useI18n()
  const { taskId = '' } = useParams<{ taskId: string }>()
  const { tasks, completeTask } = usePatientPortal()
  const task = useMemo(() => tasks.find((x) => x.id === taskId), [tasks, taskId])
  const [seconds, setSeconds] = useState(0)

  if (!task) {
    return (
      <div className="role-page portal-page patient-portal">
        <section className="card">
          <h1>{t('taskNotFound')}</h1>
          <Link className="btn ghost" to="/patient/training">{t('backToTrainingPlan')}</Link>
        </section>
      </div>
    )
  }

  return (
    <div className="role-page portal-page patient-portal">
      <header className="page-header">
        <div>
          <h1>{task.title}</h1>
          <p className="muted">{task.week} · {task.target}</p>
        </div>
        <Link className="btn ghost" to="/patient/training">{t('backToTrainingPlan')}</Link>
      </header>

      <section className="card">
        <h2 className="card-title">{t('movementVideo')}</h2>
        <div className="video-wrap">
          <iframe
            title={t('taskVideoTitle').replace('{title}', task.title)}
            src={task.videoUrl}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">{t('trainingRecord')}</h2>
        <p className="muted">{t('trainingDuration')}：{seconds} {t('seconds')}</p>
        <div className="role-actions">
          <button type="button" className="btn ghost" onClick={() => setSeconds((x) => x + 60)}>
            {t('addMinute')}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              completeTask(task.id)
              setSeconds(0)
            }}
          >
            {t('finishTraining')}
          </button>
        </div>
      </section>
    </div>
  )
}
