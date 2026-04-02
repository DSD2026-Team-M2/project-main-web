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
import { PatientPortalPage } from './pages/PatientPortalPage'
import { DeveloperPortalPage } from './pages/DeveloperPortalPage'
import { RoleHomePage } from './pages/RoleHomePage'
import { I18nProvider, useI18n } from './i18n/I18nContext'
import { ThemeProvider, useTheme } from './theme/ThemeContext'
import { PatientPortalLayout } from './components/layout/PatientPortalLayout'
import { PatientPortalProvider } from './context/PatientPortalContext'
import { PatientTrainingPlanPage } from './pages/PatientTrainingPlanPage'
import { PatientTrainingDetailPage } from './pages/PatientTrainingDetailPage'
import { PatientRecoveryDataPage } from './pages/PatientRecoveryDataPage'
import { PatientFollowUpPage } from './pages/PatientFollowUpPage'
import { PatientLimb3DViewPage } from './pages/PatientLimb3DViewPage'
import { PatientProfilePage } from './pages/PatientProfilePage'
import { DoctorClinicalPage } from './pages/DoctorClinicalPage'

const Limb3DPage = lazy(async () => {
  const m = await import('./pages/Limb3DPage')
  return { default: m.Limb3DPage }
})

function HomeRedirect() {
  const { patientId } = usePatient()
  return <Navigate to={`/doctor/p/${patientId}/clinical`} replace />
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
    const m = path.match(/^\/(?:doctor\/)?p\/[^/]+(\/.*)?$/)
    const tail = m?.[1] && m[1].length > 1 ? m[1] : '/clinical'
    setPatientId(id)
    navigate(`/doctor/p/${id}${tail}`)
  }

  return <AppLayout onPatientChange={onPatientChange} />
}

function RouteThemeSync() {
  const location = useLocation()
  const { setRoleTheme } = useTheme()

  useEffect(() => {
    if (location.pathname.startsWith('/patient')) {
      setRoleTheme('patient')
      return
    }

    if (location.pathname.startsWith('/developer')) {
      setRoleTheme('admin')
      return
    }

    setRoleTheme('doctor')
  }, [location.pathname, setRoleTheme])

  return null
}

function PatientPortalRoot() {
  return (
    <PatientPortalProvider>
      <PatientPortalLayout />
    </PatientPortalProvider>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <I18nProvider>
          <PatientProvider>
            <RouteThemeSync />
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/roles" element={<RoleHomePage />} />
              <Route path="/patient" element={<Navigate to="/patient/home" replace />} />
              <Route path="/patient/*" element={<PatientPortalRoot />}>
                <Route path="home" element={<PatientPortalPage />} />
                <Route path="training" element={<PatientTrainingPlanPage />} />
                <Route path="training/:taskId" element={<PatientTrainingDetailPage />} />
                <Route path="recovery" element={<PatientRecoveryDataPage />} />
                <Route path="follow-up" element={<PatientFollowUpPage />} />
                <Route path="limb-3d" element={<PatientLimb3DViewPage />} />
                <Route path="profile" element={<PatientProfilePage />} />
                <Route path="*" element={<Navigate to="/patient/home" replace />} />
              </Route>
              <Route path="/developer" element={<DeveloperPortalPage />} />
              <Route path="/doctor" element={<HomeRedirect />} />
              <Route path="/doctor/p/:patientId" element={<LayoutWithSync />}>
                <Route index element={<Navigate to="clinical" replace />} />
                <Route path="clinical" element={<DoctorClinicalPage />} />
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
              <Route path="/p/:patientId" element={<LayoutWithSync />}>
                <Route index element={<Navigate to="clinical" replace />} />
                <Route path="clinical" element={<DoctorClinicalPage />} />
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
      </ThemeProvider>
    </HashRouter>
  )
}
