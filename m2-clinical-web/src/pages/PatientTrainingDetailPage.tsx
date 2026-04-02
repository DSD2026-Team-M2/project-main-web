import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePatientPortal } from '../context/PatientPortalContext'

export function PatientTrainingDetailPage() {
  const { taskId = '' } = useParams<{ taskId: string }>()
  const { tasks, completeTask } = usePatientPortal()
  const task = useMemo(() => tasks.find((x) => x.id === taskId), [tasks, taskId])
  const [seconds, setSeconds] = useState(0)

  if (!task) {
    return (
      <div className="role-page portal-page patient-portal">
        <section className="card">
          <h1>训练项不存在</h1>
          <Link className="btn ghost" to="/patient/training">返回训练计划</Link>
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
        <Link className="btn ghost" to="/patient/training">返回训练计划</Link>
      </header>

      <section className="card">
        <h2 className="card-title">动作视频</h2>
        <div className="video-wrap">
          <iframe
            title={`${task.title} 视频教程`}
            src={task.videoUrl}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">训练记录</h2>
        <p className="muted">训练时长：{seconds} 秒</p>
        <div className="role-actions">
          <button type="button" className="btn ghost" onClick={() => setSeconds((x) => x + 60)}>
            记录 +1 分钟
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              completeTask(task.id)
              setSeconds(0)
            }}
          >
            完成本次训练
          </button>
        </div>
      </section>
    </div>
  )
}
