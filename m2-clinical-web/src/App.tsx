import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { PatientProvider, usePatient } from './context/PatientContext'
import { AppLayout } from './components/layout/AppLayout'
import { LoadingBlock } from './components/common/LoadingBlock'
import { TrendsPage } from './pages/TrendsPage'
import { HistoryPage } from './pages/HistoryPage'
import { I18nProvider, useI18n } from './i18n/I18nContext'

const Limb3DPage = lazy(async () => {
  const m = await import('./pages/Limb3DPage')
  return { default: m.Limb3DPage }
})

function HomeRedirect() {
  const { patientId } = usePatient()
  return <Navigate to={`/p/${patientId}/trends`} replace />
}

function Loading3DFallback() {
  const { t } = useI18n()
  return <LoadingBlock label={t('loading')} />
}

function LayoutWithSync() {
  const { patientId: urlId } = useParams<{ patientId: string }>()
  const { patientId, setPatientId } = usePatient()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (urlId && urlId !== patientId) {
      setPatientId(urlId)
    }
  }, [urlId, patientId, setPatientId])

  const onPatientChange = (id: string) => {
    const path = location.pathname
    const m = path.match(/^\/p\/[^/]+(\/.*)?$/)
    const tail = m?.[1] && m[1].length > 1 ? m[1] : '/trends'
    setPatientId(id)
    navigate(`/p/${id}${tail}`)
  }

  return <AppLayout onPatientChange={onPatientChange} />
}

export default function App() {
  return (
    <HashRouter>
      <I18nProvider>
      <PatientProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/p/:patientId" element={<LayoutWithSync />}>
            <Route index element={<Navigate to="trends" replace />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route
              path="limb"
              element={
                <Suspense fallback={<Loading3DFallback />}>
                  <Limb3DPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PatientProvider>
      </I18nProvider>
    </HashRouter>
  )
}
