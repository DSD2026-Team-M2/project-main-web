import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'
import { useI18n } from '../i18n/I18nContext'
import { doctorRegistrationStore } from '../services/doctorRegistrationStore'

type RoleKey = 'doctor' | 'admin'
type AuthMode = 'login' | 'register'

export function AuthGatewayPage() {
  const { t, locale } = useI18n()
  const { role = 'doctor' } = useParams<{ role: RoleKey }>()
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [msg, setMsg] = useState('')
  const [licenseFiles, setLicenseFiles] = useState<File[]>([])
  const [licensePreviews, setLicensePreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const safeRole: RoleKey = role === 'admin' ? 'admin' : 'doctor'
  const roleLabel = useMemo(
    () => (safeRole === 'doctor' ? t('roleDoctor') : t('roleAdmin')),
    [safeRole, t],
  )

  const targetPath = safeRole === 'doctor' ? '/doctor' : '/admin'

  const tr = (zh: string, en: string) => (locale === 'zh-CN' ? zh : en)

  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('read file failed'))
      reader.readAsDataURL(file)
    })
  }

  async function addLicenseFiles(files: File[]) {
    const next = [...licenseFiles]
    for (const f of files) {
      const key = `${f.name}-${f.size}-${f.lastModified}`
      const exists = next.some(
        (x) => `${x.name}-${x.size}-${x.lastModified}` === key,
      )
      if (!exists) next.push(f)
      if (next.length >= 6) break
    }
    setLicenseFiles(next)
    const previews = await Promise.all(next.map(async (f) => await fileToDataUrl(f)))
    setLicensePreviews(previews)
  }

  function removeLicenseAt(idx: number) {
    const next = licenseFiles.filter((_, i) => i !== idx)
    setLicenseFiles(next)
    setLicensePreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Doctor registration: submit license images for admin approval (demo local storage).
    if (safeRole === 'doctor' && mode === 'register') {
      if (!account.trim()) {
        setMsg(tr('请先填写账号（邮箱/手机号）', 'Please enter an account (email/phone)'))
        return
      }
      if (!displayName.trim()) {
        setMsg(tr('请先填写显示名称（医生姓名）', 'Please enter display name (doctor name)'))
        return
      }
      if (licenseFiles.length === 0) {
        setMsg(tr('请上传至少 1 张医生执照图片', 'Please upload at least 1 license image'))
        return
      }

      try {
        setBusy(true)
        const images = await Promise.all(licenseFiles.map(fileToDataUrl))
        doctorRegistrationStore.submit({
          doctorName: displayName,
          account,
          licenseImages: images,
        })
        setMsg(tr('已提交注册申请，请等待管理员审批。', 'Application submitted. Please wait for admin approval.'))
        setLicenseFiles([])
        setLicensePreviews([])
        return
      } finally {
        setBusy(false)
      }
    }

    // Demo login/register behavior (no HTTP yet)
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

          {safeRole === 'doctor' && mode === 'register' ? (
            <div style={{ marginBottom: 12 }}>
              <label className="small muted" style={{ display: 'block', marginBottom: 8 }}>
                {tr('添加医生执照（可上传多张）', 'Upload doctor license images (multiple)')}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? [])
                  await addLicenseFiles(files)
                  // allow selecting the same file again
                  e.currentTarget.value = ''
                }}
              />
              <div className="role-actions" style={{ justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy || licenseFiles.length >= 6}
                >
                  {tr('添加文件', 'Add files')}
                </button>
                <span className="muted small">
                  {tr(`最多 6 张（已选 ${licenseFiles.length}）`, `Up to 6 images (${licenseFiles.length} selected)`)}
                </span>
              </div>
              {licensePreviews.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {licensePreviews.map((src, idx) => (
                    <div
                      key={`${idx}-${src.slice(0, 20)}`}
                      style={{ position: 'relative', width: 86, height: 86 }}
                    >
                      <img
                        src={src}
                        alt={tr('执照预览', 'License preview')}
                        style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 10, border: '1px solid #d2def0' }}
                      />
                      <button
                        type="button"
                        className="btn ghost"
                        aria-label={tr('删除', 'Remove')}
                        onClick={() => removeLicenseAt(idx)}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 26,
                          height: 26,
                          padding: 0,
                          borderRadius: 999,
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="muted small" style={{ marginTop: 8 }}>
                {tr('提示：演示模式会把图片以 Base64 存在浏览器本地，过大可能导致保存失败。', 'Tip: demo mode stores images as Base64 in local storage; very large images may fail to save.')}
              </p>
            </div>
          ) : null}

          <div className="role-actions">
            <button type="submit" className="btn primary" disabled={busy}>
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
