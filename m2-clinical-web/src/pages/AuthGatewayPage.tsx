import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'
import { useI18n } from '../i18n/I18nContext'

type RoleKey = 'doctor' | 'patient' | 'developer'
type AuthMode = 'login' | 'register'

export function AuthGatewayPage() {
  const { t } = useI18n()
  const { role = 'doctor' } = useParams<{ role: RoleKey }>()
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [msg, setMsg] = useState('')

  const safeRole: RoleKey = role === 'patient' || role === 'developer' ? role : 'doctor'
  const roleLabel = useMemo(
    () =>
      safeRole === 'doctor'
        ? t('roleDoctor')
        : safeRole === 'patient'
          ? t('rolePatient')
          : t('roleDev'),
    [safeRole, t],
  )

  const targetPath = safeRole === 'doctor' ? '/doctor' : safeRole === 'patient' ? '/patient' : '/developer'

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const verb = mode === 'login' ? t('authLoginSubmit') : t('authRegisterSubmit')
    setMsg(`${verb}${t('authFakeSuccess')}`)
    window.setTimeout(() => navigate(targetPath), 700)
  }

  return (
    <div className="role-page portal-page">
      <header className="page-header">
        <div>
          <h1>{t('authTitle').replace('{role}', roleLabel)}</h1>
          <p className="muted">{t('authDesc')}</p>
        </div>
        <div className="role-actions">
          <Link className="btn ghost" to="/roles">{t('backToRoleEntry')}</Link>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="card" style={{ maxWidth: 560 }}>
        <div className="role-actions" style={{ marginBottom: 12 }}>
          <button type="button" className={`btn ${mode === 'login' ? 'primary' : 'ghost'}`} onClick={() => setMode('login')}>
            {t('authLoginTab')}
          </button>
          <button type="button" className={`btn ${mode === 'register' ? 'primary' : 'ghost'}`} onClick={() => setMode('register')}>
            {t('authRegisterTab')}
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {mode === 'register' ? (
            <label className="small muted" style={{ display: 'block', marginBottom: 10 }}>
              {t('authDisplayName')}
              <input className="patient-select" style={{ width: '100%', marginTop: 6 }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('authDisplayNamePh')} />
            </label>
          ) : null}

          <label className="small muted" style={{ display: 'block', marginBottom: 10 }}>
            {t('authAccount')}
            <input className="patient-select" style={{ width: '100%', marginTop: 6 }} value={account} onChange={(e) => setAccount(e.target.value)} placeholder={t('authAccountPh')} />
          </label>

          <label className="small muted" style={{ display: 'block', marginBottom: 12 }}>
            {t('authPassword')}
            <input type="password" className="patient-select" style={{ width: '100%', marginTop: 6 }} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('authPasswordPh')} />
          </label>

          <div className="role-actions">
            <button type="submit" className="btn primary">
              {mode === 'login' ? t('authLoginSubmit') : t('authRegisterSubmit')}
            </button>
            <button type="button" className="btn ghost" onClick={() => navigate(targetPath)}>
              {t('authSkip')}
            </button>
          </div>
        </form>

        {msg ? <p className="small muted" style={{ marginTop: 10 }}>{msg}</p> : null}
      </section>
    </div>
  )
}
