import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { usePatient } from '../context/PatientContext'
import { usePatientPortal } from '../context/PatientPortalContext'
import { useI18n } from '../i18n/I18nContext'

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
  const { locale } = useI18n()
  const tr = (zh: string, en: string, pt: string) =>
    locale === 'en' ? en : locale === 'pt-BR' ? pt : zh
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
  const nextReview = followUps.find((x) => x.status === 'upcoming')?.dateTime ?? tr('待预约', 'Pending scheduling', 'Aguardando agendamento')
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
    tr('训练后 15 分钟内完成疼痛评分记录，方便医生判断负荷是否合适。', 'Record pain score within 15 minutes after training so your doctor can assess load suitability.', 'Registre a dor em ate 15 minutos apos o treino para o medico avaliar a carga.'),
    tr('若出现持续肿胀或夜间疼痛加重，请减少强度并及时联系医生。', 'If swelling persists or night pain worsens, reduce intensity and contact your doctor promptly.', 'Se houver inchaco persistente ou piora da dor noturna, reduza a intensidade e contate o medico.'),
    tr('本周建议在家属陪同下完成一次完整训练流程。', 'This week, complete one full training flow with family supervision.', 'Nesta semana, conclua um treino completo com acompanhamento familiar.'),
  ]
  const milestones = [
    { id: 'm1', label: tr('步态对称性', 'Gait symmetry', 'Simetria da marcha'), value: '89%', trend: '+4%' },
    { id: 'm2', label: tr('膝关节活动度', 'Knee ROM', 'Amplitude de movimento do joelho'), value: '118°', trend: '+6°' },
    { id: 'm3', label: tr('肌力恢复等级', 'Muscle strength level', 'Nivel de recuperacao de forca muscular'), value: '4/5', trend: tr('+1 级', '+1 grade', '+1 nivel') },
  ]
  const knowledgeCards = [
    tr('ACL 术后第 6-10 周重点是恢复控制力，训练过程重质量而非数量。', 'The key from weeks 6-10 after ACL surgery is restoring control, prioritizing quality over quantity.', 'Entre as semanas 6-10 apos cirurgia de LCA, o foco e recuperar controle, priorizando qualidade sobre quantidade.'),
    tr('若训练后 24 小时疼痛持续升高，建议下调训练强度并记录异常。', 'If pain keeps rising 24 hours after training, reduce intensity and log abnormalities.', 'Se a dor continuar aumentando 24 horas apos o treino, reduza a intensidade e registre anomalias.'),
    tr('步态训练时注意骨盆稳定，避免代偿性躯干晃动。', 'Keep pelvic stability during gait training and avoid compensatory trunk sway.', 'Mantenha a pelve estavel no treino de marcha e evite compensacao do tronco.'),
  ]
  const highRisk = painScore > 5 || doctorOrder?.riskLevel === 'Red' || doctorOrder?.riskLevel === 'Orange'

  return (
    <div className="role-page portal-page patient-portal">
      <header className="portal-hero patient-hero">
        <div className="hero-main">
          <p className="hero-kicker">{tr('患者关怀工作台', 'Patient Care Workspace', 'Espaco de Cuidado ao Paciente')}</p>
          <h1>{tr('患者端恢复中心', 'Patient Recovery Center', 'Centro de Recuperacao do Paciente')}</h1>
          <p className="hero-desc">{tr('面向患者与家属的可视化恢复看板，统一管理训练执行、风险控制与随访安排。', 'Visual recovery dashboard for patients and families, unifying training execution, risk control, and follow-up planning.', 'Painel visual de recuperacao para pacientes e familiares, unificando execucao de treino, controle de risco e acompanhamento.')}</p>
          <div className="hero-chips">
            <span className="hero-chip">{tr('恢复期第 8 周', 'Recovery week 8', 'Semana 8 de recuperacao')}</span>
            <span className="hero-chip">{tr('居家训练计划', 'Home training plan', 'Plano de treino em casa')}</span>
            <span className="hero-chip">{tr('远程复测已开启', 'Remote reassessment enabled', 'Reavaliacao remota ativada')}</span>
          </div>
        </div>
        <div className="hero-side">
          <p className="muted small">{tr('当前账户', 'Current account', 'Conta atual')}</p>
          <p className="hero-id">{patientId}</p>
          {currentPatient ? (
            <p className="muted">
              {currentPatient.displayName} · {currentPatient.diagnosisShort}
            </p>
          ) : null}
          <div className="role-actions">
            <Link className="btn ghost role-link" to="/roles" aria-label={tr('返回多端入口', 'Back to role entry', 'Voltar para entrada de papeis')}>
              {tr('返回多端入口', 'Back to role entry', 'Voltar para entrada de papeis')}
            </Link>
          </div>
        </div>
      </header>

      <section className="card checkin-card">
        <div>
          <h2 className="card-title">{tr('今日训练打卡', 'Today training check-in', 'Check-in de treino de hoje')}</h2>
          <p className="muted">{tr('今日待完成', 'Pending today', 'Pendentes hoje')}: {weeklyTasks.filter((x) => x.done < x.total).length} {tr('项', 'items', 'itens')}</p>
        </div>
        <div className="role-actions">
          <button type="button" className={`btn ${todayCheckInDone ? 'ghost' : 'primary'}`} onClick={toggleTodayCheckIn}>
            {todayCheckInDone ? tr('今日已打卡', 'Checked in today', 'Check-in concluido hoje') : tr('一键打卡', 'One-tap check-in', 'Check-in com um clique')}
          </button>
          {todayCheckInDone ? <span className="trend-up">{tr('做得很好，继续保持！', 'Great job, keep it up!', 'Excelente, continue assim!')}</span> : null}
        </div>
      </section>

      <section className="portal-kpi-grid premium-grid">
        <article className="card portal-stat kpi-card">
          <div className="kpi-head">
            <span className="kpi-icon" aria-hidden>
              ◎
            </span>
            <p className="stat-label">{tr('本周训练达成率', 'Weekly training completion', 'Taxa semanal de conclusao do treino')}</p>
          </div>
          <p className="stat-value">
            <AnimatedNumber value={adherence} suffix="%" />
          </p>
          <p className="stat-foot trend-up">↑ {tr('较上周 +6%', 'vs last week +6%', 'vs semana passada +6%')}</p>
        </article>
        <article className="card portal-stat kpi-card">
          <div className="kpi-head">
            <span className="kpi-icon" aria-hidden>
              ♡
            </span>
            <p className="stat-label">{tr('最近疼痛评分', 'Latest pain score', 'Pontuacao de dor mais recente')}</p>
          </div>
          <p className="stat-value">
            <AnimatedNumber value={painScore} />/10
          </p>
          <p className="stat-foot muted">{tr('疼痛等级偏低，建议维持当前负荷', 'Pain level is relatively low, keep current load.', 'Nivel de dor relativamente baixo, mantenha a carga atual.')}</p>
          <button type="button" className="btn-text" onClick={() => setPainModalOpen(true)}>
            {tr('记录疼痛评分', 'Record pain score', 'Registrar pontuacao de dor')}
          </button>
        </article>
        <article className="card portal-stat kpi-card">
          <div className="kpi-head">
            <span className="kpi-icon" aria-hidden>
              ◷
            </span>
            <p className="stat-label">{tr('下次复诊时间', 'Next follow-up time', 'Proximo horario de acompanhamento')}</p>
          </div>
          <p className="stat-value stat-time">{nextReview}</p>
          <p className="stat-foot trend-warn">⏳ {tr('请提前 30 分钟完成训练记录', 'Please complete training records 30 minutes in advance.', 'Conclua os registros de treino 30 minutos antes.')}</p>
        </article>
      </section>

      <section className="portal-two-col premium-grid">
        <article className="card">
          <h2 className="card-title">{tr('当前账户', 'Current account', 'Conta atual')}</h2>
          <p>
            {tr('患者编号', 'Patient ID', 'ID do paciente')}: <strong>{patientId}</strong>
          </p>
          {currentPatient ? (
            <p className="muted">
              {currentPatient.displayName} · {currentPatient.diagnosisShort}
            </p>
          ) : null}
          <div className="status-pills">
            <span className="tag tag-blue">{doctorDecision ? `${tr('医生分期', 'Doctor phase', 'Fase medica')} ${doctorDecision.phase}` : tr('恢复期第 8 周', 'Recovery week 8', 'Semana 8 de recuperacao')}</span>
            <span className="tag tag-gray">{tr('居家训练计划', 'Home training plan', 'Plano de treino em casa')}</span>
          </div>
        </article>

        <article className="card">
          <h2 className="card-title">{tr('风险提醒', 'Risk alerts', 'Alertas de risco')}</h2>
          <ul
            className={`simple-list risk-list${highRisk ? ' risk-high' : ''}`}
            onClick={() => setRiskExpanded((x) => !x)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setRiskExpanded((x) => !x)
            }}
            aria-label={tr('展开风险详情', 'Expand risk details', 'Expandir detalhes de risco')}
          >
            <li><strong>{tr('连续两天疼痛评分', 'Pain score for two consecutive days', 'Pontuacao de dor por dois dias consecutivos')} {`>`} 5</strong>{tr('，请暂停大强度训练并联系医生。', ', please pause high-intensity training and contact your doctor.', ', pause o treino de alta intensidade e contate seu medico.')}</li>
            {doctorOrder ? (
              <li>
                <strong>{tr('医生下发医嘱', 'Doctor order', 'Prescricao medica')}:</strong>
                {doctorOrder.advice}
              </li>
            ) : null}
            {doctorOrder?.scarOrder ? (
              <li>
                <strong>{tr('瘢痕管理', 'Scar management', 'Manejo de cicatriz')}:</strong>
                {doctorOrder.scarOrder}
              </li>
            ) : null}
            <li>{tr('若关节肿胀明显，请先冰敷并减少负重练习。', 'If joint swelling is obvious, apply ice first and reduce weight-bearing drills.', 'Se houver inchaco articular evidente, aplique gelo e reduza exercicios com carga.')}</li>
            <li>{tr('本周仍建议避免跳跃和急停转向动作。', 'This week, continue avoiding jumping and sudden stop-and-turn movements.', 'Nesta semana, continue evitando saltos e mudancas bruscas de direcao.')}</li>
            {riskExpanded ? <li><strong>{tr('详情', 'Details', 'Detalhes')}:</strong>{tr('建议记录疼痛发生时段、动作类型和持续时长，复诊时同步给医生。', 'Log onset time, movement type, and duration of pain to share during follow-up.', 'Registre horario de inicio, tipo de movimento e duracao da dor para compartilhar no acompanhamento.')}</li> : null}
          </ul>
        </article>
      </section>

      <section className="card">
        <div className="section-head">
          <h2 className="card-title">{tr('本周任务进度', 'Weekly task progress', 'Progresso semanal de tarefas')}</h2>
          <span className="muted small">{tr('已完成', 'Completed', 'Concluido')} 19 / 24 {tr('项', 'items', 'itens')}</span>
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
                  {done ? tr('已完成', 'Completed', 'Concluido') : tr('开始训练', 'Start training', 'Iniciar treino')}
                </button>
                <button
                  type="button"
                  className="btn ghost task-cta"
                  onClick={() => {
                    completeTask(task.id)
                    navigate(`/patient/training/${task.id}`)
                  }}
                >
                  {tr('进入详情', 'Open details', 'Abrir detalhes')}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="portal-two-col premium-grid">
        <section className="card">
          <h2 className="card-title">{tr('恢复里程碑', 'Recovery milestones', 'Marcos de recuperacao')}</h2>
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
          <h2 className="card-title">{tr('康复建议', 'Rehab suggestions', 'Sugestoes de reabilitacao')}</h2>
          <ul className="simple-list tips-list">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </section>

      <section className="portal-two-col premium-grid">
        <section className="card">
          <h2 className="card-title">{tr('康复小知识', 'Rehab tips', 'Dicas de reabilitacao')}</h2>
          <article className="knowledge-card">
            <p className="muted small">{tr('每周推送', 'Weekly push', 'Atualizacao semanal')} #{knowledgeIdx + 1}</p>
            <p>{knowledgeCards[knowledgeIdx]}</p>
          </article>
        </section>
        <section className="card">
          <h2 className="card-title">{tr('医生寄语', 'Doctor message', 'Mensagem do medico')}</h2>
          <p>{doctorMessage}</p>
          <p className="muted small">—— {tr('王医生（运动医学与膝关节康复）', 'Dr. Wang (Sports Medicine & Knee Rehabilitation)', 'Dr. Wang (Medicina Esportiva e Reabilitacao do Joelho)')}</p>
        </section>
      </section>

      <section className="card">
        <h2 className="card-title">{tr('快速入口', 'Quick access', 'Acesso rapido')}</h2>
        <div className="role-actions">
          <Link className="btn ghost" to="/patient/recovery">
            {tr('查看恢复趋势', 'View recovery trends', 'Ver tendencias de recuperacao')}
          </Link>
          <Link className="btn ghost" to="/patient/recovery">
            {tr('查看历史记录', 'View history records', 'Ver historico')}
          </Link>
          <Link className="btn primary" to="/patient/limb-3d">
            {tr('打开 3D 肢体视图', 'Open 3D limb view', 'Abrir visualizacao 3D do membro')}
          </Link>
          <Link className="btn ghost" to="/patient/training">
            {tr('前往训练计划', 'Go to training plan', 'Ir para plano de treino')}
          </Link>
          <Link className="btn ghost" to="/patient/follow-up">
            {tr('复诊与随访', 'Follow-up and revisit', 'Acompanhamento e retorno')}
          </Link>
        </div>
      </section>

      {painModalOpen ? (
        <div className="pain-modal-mask" role="dialog" aria-modal="true" aria-label={tr('疼痛评分弹窗', 'Pain score dialog', 'Dialogo de pontuacao de dor')}>
          <div className="pain-modal">
            <h3>{tr('疼痛评分更新', 'Update pain score', 'Atualizar pontuacao de dor')}</h3>
            <p className="muted small">{tr('0 为无痛，10 为不可忍受。', '0 means no pain, 10 means unbearable pain.', '0 significa sem dor, 10 significa dor insuportavel.')}</p>
            <input
              type="range"
              min={0}
              max={10}
              value={pendingPainScore}
              onChange={(e) => setPendingPainScore(Number(e.target.value))}
            />
            <p>{tr('当前选择', 'Current selection', 'Selecao atual')}: <strong>{pendingPainScore}</strong>/10</p>
            <div className="role-actions">
              <button type="button" className="btn ghost" onClick={() => setPainModalOpen(false)}>
                {tr('取消', 'Cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  updatePainScore(pendingPainScore)
                  setPainModalOpen(false)
                }}
              >
                {tr('提交评分', 'Submit score', 'Enviar pontuacao')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
