import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { usePatient } from '../context/PatientContext'
import { usePatientPortal } from '../context/PatientPortalContext'

function AnimatedNumber({
  value,
  duration = 900,
  suffix = '',
}: {
  value: number
  duration?: number
  suffix?: string
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const from = display

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - p) * (1 - p)
      const next = from + (value - from) * eased
      setDisplay(next)
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // We only want to animate when target value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  const rounded = Number.isInteger(value) ? Math.round(display) : Number(display.toFixed(1))
  return <>{rounded}{suffix}</>
}

export function PatientPortalPage() {
  const navigate = useNavigate()
  const { patientId, currentPatient } = usePatient()
  const {
    tasks: weeklyTasks,
    painScore,
    followUps,
    doctorMessage,
    doctorOrder,
    doctorDecision,
    todayCheckInDone,
    completeTask,
    toggleTodayCheckIn,
    updatePainScore,
  } = usePatientPortal()
  const adherence = Math.round(
    (weeklyTasks.reduce((acc, x) => acc + x.done, 0) /
      weeklyTasks.reduce((acc, x) => acc + x.total, 0)) *
      100,
  )
  const nextReview = followUps.find((x) => x.status === 'upcoming')?.dateTime ?? '待预约'
  const [knowledgeIdx, setKnowledgeIdx] = useState(0)
  const [riskExpanded, setRiskExpanded] = useState(false)
  const [painModalOpen, setPainModalOpen] = useState(false)
  const [pendingPainScore, setPendingPainScore] = useState(painScore)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setKnowledgeIdx((i) => (i + 1) % 3)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [])

  const tips = [
    '训练后 15 分钟内完成疼痛评分记录，方便医生判断负荷是否合适。',
    '若出现持续肿胀或夜间疼痛加重，请减少强度并及时联系医生。',
    '本周建议在家属陪同下完成一次完整训练流程。',
  ]
  const milestones = [
    { id: 'm1', label: '步态对称性', value: '89%', trend: '+4%' },
    { id: 'm2', label: '膝关节活动度', value: '118°', trend: '+6°' },
    { id: 'm3', label: '肌力恢复等级', value: '4/5', trend: '+1 级' },
  ]
  const knowledgeCards = useMemo(
    () => [
      'ACL 术后第 6-10 周重点是恢复控制力，训练过程重质量而非数量。',
      '若训练后 24 小时疼痛持续升高，建议下调训练强度并记录异常。',
      '步态训练时注意骨盆稳定，避免代偿性躯干晃动。',
    ],
    [],
  )
  const highRisk = painScore > 5 || doctorOrder?.riskLevel === 'Red' || doctorOrder?.riskLevel === 'Orange'

  return (
    <div className="role-page portal-page patient-portal">
      <header className="portal-hero patient-hero">
        <div className="hero-main">
          <p className="hero-kicker">Patient Care Workspace</p>
          <h1>患者端恢复中心</h1>
          <p className="hero-desc">面向患者与家属的可视化恢复看板，统一管理训练执行、风险控制与随访安排。</p>
          <div className="hero-chips">
            <span className="hero-chip">恢复期第 8 周</span>
            <span className="hero-chip">居家训练计划</span>
            <span className="hero-chip">远程复测已开启</span>
          </div>
        </div>
        <div className="hero-side">
          <p className="muted small">当前账户</p>
          <p className="hero-id">{patientId}</p>
          {currentPatient ? (
            <p className="muted">
              {currentPatient.displayName} · {currentPatient.diagnosisShort}
            </p>
          ) : null}
          <div className="role-actions">
            <Link className="btn ghost role-link" to="/roles" aria-label="返回多端入口">
              返回多端入口
            </Link>
          </div>
        </div>
      </header>

      <section className="card checkin-card">
        <div>
          <h2 className="card-title">今日训练打卡</h2>
          <p className="muted">今日待完成：{weeklyTasks.filter((x) => x.done < x.total).length} 项</p>
        </div>
        <div className="role-actions">
          <button type="button" className={`btn ${todayCheckInDone ? 'ghost' : 'primary'}`} onClick={toggleTodayCheckIn}>
            {todayCheckInDone ? '今日已打卡' : '一键打卡'}
          </button>
          {todayCheckInDone ? <span className="trend-up">做得很好，继续保持！</span> : null}
        </div>
      </section>

      <section className="portal-kpi-grid premium-grid">
        <article className="card portal-stat kpi-card">
          <div className="kpi-head">
            <span className="kpi-icon" aria-hidden>
              ◎
            </span>
            <p className="stat-label">本周训练达成率</p>
          </div>
          <p className="stat-value">
            <AnimatedNumber value={adherence} suffix="%" />
          </p>
          <p className="stat-foot trend-up">↑ 较上周 +6%</p>
        </article>
        <article className="card portal-stat kpi-card">
          <div className="kpi-head">
            <span className="kpi-icon" aria-hidden>
              ♡
            </span>
            <p className="stat-label">最近疼痛评分</p>
          </div>
          <p className="stat-value">
            <AnimatedNumber value={painScore} />/10
          </p>
          <p className="stat-foot muted">疼痛等级偏低，建议维持当前负荷</p>
          <button type="button" className="btn-text" onClick={() => setPainModalOpen(true)}>
            记录疼痛评分
          </button>
        </article>
        <article className="card portal-stat kpi-card">
          <div className="kpi-head">
            <span className="kpi-icon" aria-hidden>
              ◷
            </span>
            <p className="stat-label">下次复诊时间</p>
          </div>
          <p className="stat-value stat-time">{nextReview}</p>
          <p className="stat-foot trend-warn">⏳ 请提前 30 分钟完成训练记录</p>
        </article>
      </section>

      <section className="portal-two-col premium-grid">
        <article className="card">
          <h2 className="card-title">当前账户</h2>
          <p>
            患者编号：<strong>{patientId}</strong>
          </p>
          {currentPatient ? (
            <p className="muted">
              {currentPatient.displayName} · {currentPatient.diagnosisShort}
            </p>
          ) : null}
          <div className="status-pills">
            <span className="tag tag-blue">{doctorDecision ? `医生分期 ${doctorDecision.phase}` : '恢复期第 8 周'}</span>
            <span className="tag tag-gray">居家训练计划</span>
          </div>
        </article>

        <article className="card">
          <h2 className="card-title">风险提醒</h2>
          <ul
            className={`simple-list risk-list${highRisk ? ' risk-high' : ''}`}
            onClick={() => setRiskExpanded((x) => !x)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setRiskExpanded((x) => !x)
            }}
            aria-label="展开风险详情"
          >
            <li><strong>连续两天疼痛评分 {`>`} 5</strong>，请暂停大强度训练并联系医生。</li>
            {doctorOrder ? (
              <li>
                <strong>医生下发医嘱：</strong>
                {doctorOrder.advice}
              </li>
            ) : null}
            {doctorOrder?.scarOrder ? (
              <li>
                <strong>瘢痕管理：</strong>
                {doctorOrder.scarOrder}
              </li>
            ) : null}
            <li>若关节肿胀明显，请先冰敷并减少负重练习。</li>
            <li>本周仍建议避免跳跃和急停转向动作。</li>
            {riskExpanded ? <li><strong>详情：</strong>建议记录疼痛发生时段、动作类型和持续时长，复诊时同步给医生。</li> : null}
          </ul>
        </article>
      </section>

      <section className="card">
        <div className="section-head">
          <h2 className="card-title">本周任务进度</h2>
          <span className="muted small">已完成 19 / 24 项</span>
        </div>
        <div className="task-list">
          {weeklyTasks.map((task) => {
            const pct = Math.round((task.done / task.total) * 100)
            const done = task.done >= task.total
            return (
              <article key={task.id} className={`task-row task-row-upgraded${done ? ' is-done' : ''}`}>
                <div className="task-main">
                  <p className="task-title">
                    <span className={`task-state-icon${done ? ' done' : ''}`} aria-hidden>
                      {done ? '●' : '○'}
                    </span>
                    {task.title}
                  </p>
                  <p className="muted small">{task.target}</p>
                </div>
                <div className="task-progress">
                  <div className={`progress-track${done ? ' is-done' : ''}`}>
                    <div className="progress-fill progress-fill-animated" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="small muted">{task.done}/{task.total}</span>
                </div>
                <button type="button" className={`btn ${done ? 'ghost' : 'primary'} task-cta`}>
                  {done ? '已完成' : '开始训练'}
                </button>
                <button
                  type="button"
                  className="btn ghost task-cta"
                  onClick={() => {
                    completeTask(task.id)
                    navigate(`/patient/training/${task.id}`)
                  }}
                >
                  进入详情
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="portal-two-col premium-grid">
        <section className="card">
          <h2 className="card-title">恢复里程碑</h2>
          <div className="milestone-grid">
            {milestones.map((item) => (
              <article key={item.id} className="milestone-item">
                <p className="muted small">{item.label}</p>
                <p className="milestone-value">{item.value}</p>
                <div className="milestone-track">
                  <div className="milestone-fill" />
                </div>
                <p className="milestone-trend trend-up">↑ {item.trend}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">康复建议</h2>
          <ul className="simple-list tips-list">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </section>

      <section className="portal-two-col premium-grid">
        <section className="card">
          <h2 className="card-title">康复小知识</h2>
          <article className="knowledge-card">
            <p className="muted small">每周推送 #{knowledgeIdx + 1}</p>
            <p>{knowledgeCards[knowledgeIdx]}</p>
          </article>
        </section>
        <section className="card">
          <h2 className="card-title">医生寄语</h2>
          <p>{doctorMessage}</p>
          <p className="muted small">—— 王医生（运动医学与膝关节康复）</p>
        </section>
      </section>

      <section className="card">
        <h2 className="card-title">快速入口</h2>
        <div className="role-actions">
          <Link className="btn ghost" to="/patient/recovery">
            查看恢复趋势
          </Link>
          <Link className="btn ghost" to="/patient/recovery">
            查看历史记录
          </Link>
          <Link className="btn primary" to="/patient/limb-3d">
            打开 3D 肢体视图
          </Link>
          <Link className="btn ghost" to="/patient/training">
            前往训练计划
          </Link>
          <Link className="btn ghost" to="/patient/follow-up">
            复诊与随访
          </Link>
        </div>
      </section>

      {painModalOpen ? (
        <div className="pain-modal-mask" role="dialog" aria-modal="true" aria-label="疼痛评分弹窗">
          <div className="pain-modal">
            <h3>疼痛评分更新</h3>
            <p className="muted small">0 为无痛，10 为不可忍受。</p>
            <input
              type="range"
              min={0}
              max={10}
              value={pendingPainScore}
              onChange={(e) => setPendingPainScore(Number(e.target.value))}
            />
            <p>当前选择：<strong>{pendingPainScore}</strong>/10</p>
            <div className="role-actions">
              <button type="button" className="btn ghost" onClick={() => setPainModalOpen(false)}>
                取消
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  updatePainScore(pendingPainScore)
                  setPainModalOpen(false)
                }}
              >
                提交评分
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
