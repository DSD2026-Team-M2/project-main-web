import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'
import { useI18n } from '../i18n/I18nContext'
import { authStore, type AuthUser } from '../services/authStore'

const BASE_URL = 'http://113.44.220.94:3000'

/**
 * Hardcoded admin whitelist.
 * Only these emails are permitted to log in through the admin portal.
 * All other accounts (clinicians, patients) are rejected even if the
 * backend returns a valid token, because the backend shares roles.
 */
const ADMIN_EMAILS: ReadonlySet<string> = new Set([
  'admin@v2.dsd',
])

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

  // Re-upload license flow for rejected clinicians
  const [reuploadOpen, setReuploadOpen] = useState(false)
  const [reuploadUserId, setReuploadUserId] = useState<number | null>(null)
  const [reuploadFile, setReuploadFile] = useState<File | null>(null)
  const [reuploadPreview, setReuploadPreview] = useState<string>('')

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
    if (!account.trim() || !password.trim()) {
      setMsg(tr('请填写账号和密码', 'Please enter account and password'))
      return
    }

    setBusy(true)
    try {
      // ── Register ─────────────────────────────────────────────────────────
      if (mode === 'register') {
        // admin portal shows login-only; this guard is a safety net
        if (safeRole === 'admin') {
          setMsg(tr('管理员账号无法在此注册，请直接登录。', 'Admin accounts cannot be registered here. Please log in.'))
          return
        }
        if (!displayName.trim()) {
          setMsg(tr('请填写显示名称（医生姓名）', 'Please enter your display name'))
          return
        }
        if (licenseFiles.length === 0) {
          setMsg(tr('请上传至少 1 张医生执照图片', 'Please upload at least 1 license image'))
          return
        }

        const formData = new FormData()
        formData.append('name', displayName)
        formData.append('email', account)
        formData.append('password', password)
        formData.append('role', 'clinician')
        formData.append('license', licenseFiles[0])

        const res = await fetch(`${BASE_URL}/auth/register`, {
          method: 'POST',
          body: formData,
        })
        if (res.ok) {
          setMsg(tr('注册申请已提交，请等待管理员审批后再登录。', 'Registration submitted. Please wait for admin approval, then log in.'))
          setLicenseFiles([])
          setLicensePreviews([])
        } else {
          const body = await res.json().catch(() => ({})) as { error?: string }
          setMsg(body.error ?? tr(`注册失败 (${res.status})`, `Registration failed (${res.status})`))
        }
        return
      }

      // ── Login ─────────────────────────────────────────────────────────────
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account, password }),
      })

      if (res.ok) {
        const data = await res.json() as { token: string; user: AuthUser }

        // Backend hotfix: if user is rejected but login still succeeds,
        // block client-side login and force re-upload flow.
        if (safeRole === 'doctor' && data.user?.status === 'rejected') {
          authStore.clearToken()
          setMsg(tr('你的证件未通过审核，请重新提交执照。', 'Your license was rejected. Please re-upload your license.'))
          setReuploadUserId(typeof data.user.id === 'number' ? data.user.id : null)
          setReuploadOpen(true)
          return
        }

        // Admin portal: reject anyone not in the whitelist, even with a valid token.
        if (safeRole === 'admin' && !ADMIN_EMAILS.has(data.user.email)) {
          setMsg(tr('该账号无管理员权限，请使用管理员邮箱登录。', 'This account does not have admin access.'))
          return
        }

        authStore.setToken(data.token)
        authStore.setUser(data.user)
        navigate(targetPath)
      } else if (res.status === 403) {
        const body = await res.json().catch(() => ({})) as { error?: string; status?: string; userId?: number; id?: number }
        const status = body.status ?? ''
        const errText = body.error ?? ''
        const isRejected = status === 'rejected' || /rejected/i.test(errText) || errText.includes('未通过') || errText.includes('重新上传')

        if (isRejected && safeRole === 'doctor') {
          setMsg(tr('你的证件未通过审核，请重新提交执照。', 'Your license was rejected. Please re-upload your license.'))
          const uid = body.userId ?? body.id ?? null
          setReuploadUserId(typeof uid === 'number' ? uid : null)
          setReuploadOpen(true)
        } else {
          setMsg(errText || tr('账号正在等待审批，暂时无法登录。', 'Account pending admin approval.'))
        }
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setMsg(body.error ?? tr(`登录失败 (${res.status})`, `Login failed (${res.status})`))
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : tr('网络错误，请检查连接。', 'Network error. Please check your connection.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="role-page portal-page">
      <header className="page-header">
        <div>
          <h1>
            {safeRole === 'admin'
              ? tr(`${roleLabel} 登录`, `${roleLabel} Login`)
              : t('authTitle').replace('{role}', roleLabel)}
          </h1>
        </div>
        <div className="role-actions">
          <Link className="btn ghost" to="/roles">{t('backToRoleEntry')}</Link>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="card" style={{ maxWidth: 560 }}>
        {safeRole !== 'admin' ? (
          <div className="role-actions" style={{ marginBottom: 12 }}>
            <button type="button" className={`btn ${mode === 'login' ? 'primary' : 'ghost'}`} onClick={() => setMode('login')}>
              {t('authLoginTab')}
            </button>
            <button type="button" className={`btn ${mode === 'register' ? 'primary' : 'ghost'}`} onClick={() => setMode('register')}>
              {t('authRegisterTab')}
            </button>
          </div>
        ) : null}

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
          </div>
        </form>

        {msg ? <p className="small muted" style={{ marginTop: 10 }}>{msg}</p> : null}

        {safeRole === 'doctor' && reuploadOpen && mode === 'login' ? (
          <section className="card" style={{ marginTop: 12, border: '1px solid #f1c7c7' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#7f1d1d' }}>
              {tr('重新提交执照', 'Re-upload license')}
            </h3>
            <p className="muted small" style={{ marginTop: 6 }}>
              {tr('请上传新的执照照片，提交后状态将变为 pending 等待管理员复审。', 'Upload a new license photo; status will reset to pending for admin review.')}
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0] ?? null
                setReuploadFile(f)
                if (f) {
                  try { setReuploadPreview(await fileToDataUrl(f)) } catch { setReuploadPreview('') }
                } else {
                  setReuploadPreview('')
                }
              }}
            />
            {reuploadPreview ? (
              <div style={{ marginTop: 8 }}>
                <img src={reuploadPreview} alt={tr('执照预览', 'License preview')} style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 10, border: '1px solid #f1c7c7' }} />
              </div>
            ) : null}

            <div className="role-actions" style={{ marginTop: 10, justifyContent: 'flex-start' }}>
              <button
                type="button"
                className="btn primary"
                disabled={busy || !reuploadFile || !reuploadUserId}
                onClick={async () => {
                  if (!reuploadFile || !reuploadUserId) return
                  setBusy(true)
                  try {
                    const fd = new FormData()
                    fd.append('license', reuploadFile)
                    const r = await fetch(`${BASE_URL}/users/${reuploadUserId}/license`, { method: 'PATCH', body: fd })
                    const txt = await r.text().catch(() => '')
                    if (!r.ok) throw new Error(txt || `HTTP ${r.status}`)
                    setMsg(tr('已重新提交执照，等待管理员复审。', 'License re-submitted. Waiting for admin review.'))
                    setReuploadOpen(false)
                    setReuploadFile(null)
                    setReuploadPreview('')
                  } catch (err) {
                    setMsg(err instanceof Error ? err.message : String(err))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {tr('提交新执照', 'Submit new license')}
              </button>
              {!reuploadUserId ? (
                <span className="muted small" style={{ color: '#7f1d1d' }}>
                  {tr('后端未返回 userId，无法自动提交；请联系管理员。', 'No userId returned; cannot submit automatically.')}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  )
}

