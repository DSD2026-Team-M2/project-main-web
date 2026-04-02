import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadDecision, loadDoctorOrder, subscribeDoctorSync } from '../services/clinicalBridge'
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

const defaultTasks: Task[] = [
  {
    id: 'w1',
    title: '膝关节屈伸训练',
    target: '每天 2 轮 / 每轮 10 分钟',
    done: 11,
    total: 14,
    week: '第 8 周',
    caution: '动作过程避免突然发力，屈伸节奏保持稳定。',
    videoUrl: 'https://www.youtube.com/embed/2kNf8yx_Bf8',
  },
  {
    id: 'w2',
    title: '疼痛评分记录',
    target: '每天训练后 1 次',
    done: 6,
    total: 7,
    week: '第 8 周',
    caution: '训练完成 10 分钟内记录评分，便于医生调整负荷。',
    videoUrl: 'https://www.youtube.com/embed/YlZQyP6iPqg',
  },
  {
    id: 'w3',
    title: '平衡与步态训练',
    target: '每周 3 次',
    done: 2,
    total: 3,
    week: '第 8 周',
    caution: '建议家属陪同，先慢速完成，再逐步提升稳定性。',
    videoUrl: 'https://www.youtube.com/embed/gXQ6fJk7AoA',
  },
]

const defaultFollowUps: FollowUpItem[] = [
  { id: 'f1', dateTime: '2026-04-06 14:30', doctor: '王医生', mode: 'online', status: 'upcoming' },
  { id: 'f2', dateTime: '2026-03-22 10:00', doctor: '王医生', mode: 'offline', status: 'done' },
]

const PatientPortalContext = createContext<PatientPortalContextValue | null>(null)

export function PatientPortalProvider({ children }: { children: ReactNode }) {
  const { patientId } = usePatient()
  const initial = getStoredState()
  const [tasks, setTasks] = useState<Task[]>(initial?.tasks?.length ? initial.tasks : defaultTasks)
  const [painScore, setPainScore] = useState(
    typeof initial?.painScore === 'number' ? initial.painScore : 3,
  )
  const [painHistory, setPainHistory] = useState<{ at: string; score: number }[]>(
    initial?.painHistory?.length ? initial.painHistory : [{ at: new Date().toISOString(), score: 3 }],
  )
  const [todayCheckInDone, setTodayCheckInDone] = useState(Boolean(initial?.todayCheckInDone))
  const [doctorOrder, setDoctorOrder] = useState<PatientPortalContextValue['doctorOrder']>(null)
  const [doctorDecision, setDoctorDecision] = useState<PatientPortalContextValue['doctorDecision']>(null)

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
      followUps: defaultFollowUps,
      painScore,
      painHistory,
      doctorMessage:
        doctorOrder?.advice ||
        '本周建议保持当前训练节奏，重点关注步态稳定性。若出现持续性肿胀，请先降低训练强度并及时反馈。',
      todayCheckInDone,
      doctorOrder,
      doctorDecision,
      completeTask,
      updatePainScore,
      toggleTodayCheckIn,
    }),
    [tasks, painScore, painHistory, todayCheckInDone, doctorOrder, doctorDecision],
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
