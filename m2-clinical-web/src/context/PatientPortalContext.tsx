import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadDecision, loadDoctorOrder, subscribeDoctorSync } from '../services/clinicalBridge'
import { useI18n } from '../i18n/I18nContext'
import { usePatient } from './PatientContext'

type Task = {
  id: string
  title: string
  target: string
  done: number
  total: number
  week: string
  caution: string
  videoUrl: string
}

type FollowUpItem = {
  id: string
  dateTime: string
  doctor: string
  mode: 'online' | 'offline'
  status: 'upcoming' | 'done'
}

type PatientPortalContextValue = {
  tasks: Task[]
  followUps: FollowUpItem[]
  painScore: number
  painHistory: { at: string; score: number }[]
  doctorMessage: string
  todayCheckInDone: boolean
  doctorOrder: { riskLevel: 'Green' | 'Yellow' | 'Red' | 'Orange'; advice: string; scarOrder: string } | null
  doctorDecision: { phase: string; cobb: string } | null
  completeTask: (id: string) => void
  updatePainScore: (score: number) => void
  toggleTodayCheckIn: () => void
}

const STORAGE_KEY = 'm2_patient_portal_state_v1'

function getStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<{
      tasks: Task[]
      painScore: number
      painHistory: { at: string; score: number }[]
      todayCheckInDone: boolean
    }>
  } catch {
    return null
  }
}

function makeDefaultTasks(tr: (zh: string, en: string, pt: string) => string): Task[] {
  return [
    { id: 'w1', title: tr('膝关节屈伸训练', 'Knee flexion-extension training', 'Treino de flexao-extensao do joelho'), target: tr('每天 2 轮 / 每轮 10 分钟', '2 rounds/day, 10 minutes each', '2 series por dia, 10 minutos cada'), done: 11, total: 14, week: tr('第 8 周', 'Week 8', 'Semana 8'), caution: tr('动作过程避免突然发力，屈伸节奏保持稳定。', 'Avoid sudden force; keep a steady flexion-extension rhythm.', 'Evite forca brusca; mantenha ritmo estavel de flexao-extensao.'), videoUrl: 'https://www.youtube.com/embed/2kNf8yx_Bf8' },
    { id: 'w2', title: tr('疼痛评分记录', 'Pain score logging', 'Registro da pontuacao de dor'), target: tr('每天训练后 1 次', 'Once after daily training', 'Uma vez apos o treino diario'), done: 6, total: 7, week: tr('第 8 周', 'Week 8', 'Semana 8'), caution: tr('训练完成 10 分钟内记录评分，便于医生调整负荷。', 'Log your score within 10 minutes after training to help load adjustment.', 'Registre a pontuacao em ate 10 minutos apos o treino para ajuste de carga.'), videoUrl: 'https://www.youtube.com/embed/YlZQyP6iPqg' },
    { id: 'w3', title: tr('平衡与步态训练', 'Balance and gait training', 'Treino de equilibrio e marcha'), target: tr('每周 3 次', '3 times/week', '3 vezes por semana'), done: 2, total: 3, week: tr('第 8 周', 'Week 8', 'Semana 8'), caution: tr('建议家属陪同，先慢速完成，再逐步提升稳定性。', 'Family supervision recommended; start slow, then improve stability.', 'Recomenda-se acompanhamento familiar; inicie devagar e evolua a estabilidade.'), videoUrl: 'https://www.youtube.com/embed/gXQ6fJk7AoA' },
  ]
}

function makeDefaultFollowups(tr: (zh: string, en: string, pt: string) => string): FollowUpItem[] {
  return [
    { id: 'f1', dateTime: '2026-04-06 14:30', doctor: tr('王医生', 'Dr. Wang', 'Dr. Wang'), mode: 'online', status: 'upcoming' },
    { id: 'f2', dateTime: '2026-03-22 10:00', doctor: tr('王医生', 'Dr. Wang', 'Dr. Wang'), mode: 'offline', status: 'done' },
  ]
}

const PatientPortalContext = createContext<PatientPortalContextValue | null>(null)

export function PatientPortalProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n()
  const tr = (zh: string, en: string, pt: string) => (locale === 'en' ? en : locale === 'pt-BR' ? pt : zh)
  const { patientId } = usePatient()
  const initial = getStoredState()
  const [tasks, setTasks] = useState<Task[]>(initial?.tasks?.length ? initial.tasks : makeDefaultTasks(tr))
  const [painScore, setPainScore] = useState(
    typeof initial?.painScore === 'number' ? initial.painScore : 3,
  )
  const [painHistory, setPainHistory] = useState<{ at: string; score: number }[]>(
    initial?.painHistory?.length ? initial.painHistory : [{ at: new Date().toISOString(), score: 3 }],
  )
  const [todayCheckInDone, setTodayCheckInDone] = useState(Boolean(initial?.todayCheckInDone))
  const [doctorOrder, setDoctorOrder] = useState<PatientPortalContextValue['doctorOrder']>(null)
  const [doctorDecision, setDoctorDecision] = useState<PatientPortalContextValue['doctorDecision']>(null)
  const followUps = useMemo(() => makeDefaultFollowups(tr), [locale])

  useEffect(() => {
    const localized = makeDefaultTasks(tr)
    setTasks((prev) =>
      prev.map((task) => {
        const base = localized.find((x) => x.id === task.id)
        return base ? { ...base, done: task.done, total: task.total } : task
      }),
    )
  }, [locale])

  useEffect(() => {
    const refresh = () => {
      const order = loadDoctorOrder(patientId)
      const decision = loadDecision(patientId)
      if (!order) {
        setDoctorOrder(null)
        return
      }
      setDoctorOrder({
        riskLevel: order.riskLevel,
        advice: order.advice,
        scarOrder: order.scarOrder,
      })
      setDoctorDecision(decision ? { phase: decision.phase, cobb: decision.cobb } : null)
    }
    refresh()
    return subscribeDoctorSync(refresh)
  }, [patientId])

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tasks, painScore, painHistory, todayCheckInDone }),
      )
    } catch {
      // ignore storage errors
    }
  }, [tasks, painHistory, painScore, todayCheckInDone])

  const completeTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: Math.min(t.done + 1, t.total) } : t)),
    )
  }

  const updatePainScore = (score: number) => {
    setPainScore(score)
    setPainHistory((prev) => [{ at: new Date().toISOString(), score }, ...prev].slice(0, 24))
  }

  const toggleTodayCheckIn = () => setTodayCheckInDone((x) => !x)

  const value = useMemo(
    () => ({
      tasks,
      followUps,
      painScore,
      painHistory,
      doctorMessage:
        doctorOrder?.advice ||
        tr(
          '本周建议保持当前训练节奏，重点关注步态稳定性。若出现持续性肿胀，请先降低训练强度并及时反馈。',
          'Keep current training cadence this week and focus on gait stability. If swelling persists, reduce intensity and report promptly.',
          'Mantenha o ritmo de treino nesta semana e foque na estabilidade da marcha. Se o inchaco persistir, reduza a intensidade e avise a equipe.',
        ),
      todayCheckInDone,
      doctorOrder,
      doctorDecision,
      completeTask,
      updatePainScore,
      toggleTodayCheckIn,
    }),
    [tasks, followUps, painScore, painHistory, todayCheckInDone, doctorOrder, doctorDecision, locale],
  )

  return <PatientPortalContext.Provider value={value}>{children}</PatientPortalContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePatientPortal() {
  const ctx = useContext(PatientPortalContext)
  if (!ctx) throw new Error('usePatientPortal must be used within PatientPortalProvider')
  return ctx
}

export type { Task, FollowUpItem }
