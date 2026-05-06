import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/devops-console.css'
import { useI18n } from '../i18n/I18nContext'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'
import {
  doctorRegistrationStore,
  type DoctorRegistrationApplication,
} from '../services/doctorRegistrationStore'
import { adminApiService } from '../services/adminApiService'
import type { ApiPatient } from '../types/api'
import { authStore } from '../services/authStore'

const API_BASE_URL = 'http://113.44.220.94:3000'

type AdminTab = 'registration' | 'accounts' | 'reports' | 'content'
type AccountStatus = 'active' | 'disabled'


type UserAccount = {
  id: string
  name: string
  role: 'doctor' | 'admin'
  email: string
  status: AccountStatus
  joinedAt: string
}

type FeedbackItem = {
  id: string
  from: string
  subject: string
  content: string
  at: string
  resolved: boolean
}

type ContentItem = {
  id: string
  title: string
  type: 'announcement' | 'article' | 'notification'
  status: 'draft' | 'published'
  updatedAt: string
}

function mapApplication(app: DoctorRegistrationApplication) {
  return {
    id: app.id,
    name: app.doctorName,
    account: app.account,
    submittedAt: app.submittedAt,
    status: app.status,
    licenseImages: app.licenseImages,
  }
}

const initialAccounts: UserAccount[] = [
  { id: 'u-001', name: '张伟', role: 'doctor', email: 'zhangwei@hospital.cn', status: 'active', joinedAt: '2026-04-28' },
  { id: 'u-002', name: '李娟', role: 'doctor', email: 'lijuan@rehab.cn', status: 'active', joinedAt: '2026-04-30' },
  { id: 'u-003', name: 'Admin', role: 'admin', email: 'admin@m2.cn', status: 'active', joinedAt: '2026-01-01' },
  { id: 'u-004', name: '旧账号', role: 'doctor', email: 'old@hospital.cn', status: 'disabled', joinedAt: '2025-11-10' },
]

const initialFeedback: FeedbackItem[] = [
  { id: 'fb-001', from: '张伟医生', subject: '趋势图加载慢', content: '在月度视图下图表加载需要 5 秒以上，建议优化。', at: '2026-05-03 09:12', resolved: false },
  { id: 'fb-002', from: '李娟医生', subject: '3D 视图无法旋转', content: '在 Safari 浏览器下 3D 视图拖拽旋转无响应。', at: '2026-05-02 14:38', resolved: false },
  { id: 'fb-003', from: '王磊医生', subject: '历史对比功能建议', content: '希望可以跨患者比较相同指标。', at: '2026-04-30 17:05', resolved: true },
]

const initialContent: ContentItem[] = [
  { id: 'ct-001', title: '系统维护公告（5月10日）', type: 'announcement', status: 'draft', updatedAt: '2026-05-05' },
  { id: 'ct-002', title: 'ACL 康复指南 v2 更新说明', type: 'article', status: 'published', updatedAt: '2026-05-01' },
  { id: 'ct-003', title: '新功能上线通知', type: 'notification', status: 'published', updatedAt: '2026-04-28' },
]

const usageStats = {
  totalDoctors: 48,
  activeSessions: 12,
  patientsTracked: 234,
  avgSessionMin: 18,
}

export function AdminPortalPage() {
  const { t, locale } = useI18n()
  const tr = (zh: string, en: string) => locale === 'zh-CN' ? zh : en
  const navigate = useNavigate()

  function logout() {
    authStore.clearToken()
    navigate('/roles')
  }

  const [activeTab, setActiveTab] = useState<AdminTab>('registration')
  const [applications, setApplications] = useState(() =>
    doctorRegistrationStore.list().map(mapApplication),
  )
  const [apiPending, setApiPending] = useState<ApiPatient[]>([])
  const [apiPendingLoading, setApiPendingLoading] = useState(false)
  const [apiPendingErr, setApiPendingErr] = useState('')
  const [accounts, setAccounts] = useState(initialAccounts)
  const [feedback, setFeedback] = useState(initialFeedback)
  const [content, setContent] = useState(initialContent)
  const [searchQuery, setSearchQuery] = useState('')
  const [licenseViewer, setLicenseViewer] = useState<{
    name: string
    account: string
    images: string[]
  } | null>(null)
  const [auditLogs, setAuditLogs] = useState<string[]>([
    tr('2026-05-05 08:40 [admin] 审批医生注册申请 app-003：通过', '2026-05-05 08:40 [admin] Approved doctor registration app-003'),
    tr('2026-05-04 17:22 [admin] 禁用账号 u-004', '2026-05-04 17:22 [admin] Disabled account u-004'),
    tr('2026-05-03 11:10 [admin] 发布内容 ct-002', '2026-05-03 11:10 [admin] Published content ct-002'),
  ])

  useEffect(() => {
    return doctorRegistrationStore.subscribe(() => {
      setApplications(doctorRegistrationStore.list().map(mapApplication))
    })
  }, [])

  // Load API-side pending clinicians on first render
  useEffect(() => {
    setApiPendingLoading(true)
    adminApiService
      .listPendingClinicians()
      .then((list) => { setApiPending(list); setApiPendingErr('') })
      .catch((err: unknown) => setApiPendingErr(err instanceof Error ? err.message : String(err)))
      .finally(() => setApiPendingLoading(false))
  }, [])

  function pushAudit(entry: string) {
    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setAuditLogs(prev => [`${ts} [admin] ${entry}`, ...prev.slice(0, 19)])
  }

  function reviewApp(id: string, action: 'approved' | 'rejected') {
    doctorRegistrationStore.review(id, action)
    pushAudit(tr(
      `${action === 'approved' ? '通过' : '拒绝'}医生注册申请 ${id}`,
      `${action === 'approved' ? 'Approved' : 'Rejected'} doctor registration ${id}`,
    ))
  }

  async function approveApiClinician(user: ApiPatient) {
    try {
      await adminApiService.approveClinician(user.id)
      setApiPending(prev => prev.filter(u => u.id !== user.id))
      pushAudit(tr(
        `通过 API 医生注册申请 #${user.id}（${user.name}）`,
        `Approved API clinician registration #${user.id} (${user.name})`,
      ))
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  async function viewApiLicense(user: ApiPatient) {
    try {
      const full = await adminApiService.getUserById(user.id) as any
      const raw =
        full?.license_url ??
        full?.licenseUrl ??
        full?.license ??
        full?.license_path ??
        full?.licensePath

      const urls: string[] = Array.isArray(raw) ? raw : raw ? [String(raw)] : []
      const images = urls
        .map((u) => {
          const s = String(u)
          if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s
          if (s.startsWith('/')) return `${API_BASE_URL}${s}`
          return `${API_BASE_URL}/${s}`
        })

      setLicenseViewer({
        name: user.name,
        account: user.email,
        images,
      })
      if (images.length === 0) {
        window.alert(tr('该用户未返回执照字段（API 暂不支持查看）', 'No license field returned by API for this user.'))
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  function toggleAccount(id: string) {
    setAccounts(prev => prev.map(a => {
      if (a.id !== id) return a
      const next = a.status === 'active' ? 'disabled' : 'active'
      pushAudit(tr(`账号 ${id} 状态更改为 ${next}`, `Account ${id} status changed to ${next}`))
      return { ...a, status: next }
    }))
  }

  function resolveFeedback(id: string) {
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, resolved: true } : f))
    pushAudit(tr(`反馈 ${id} 已标记为已处理`, `Feedback ${id} marked as resolved`))
  }

  function togglePublish(id: string) {
    setContent(prev => prev.map(c => {
      if (c.id !== id) return c
      const next = c.status === 'published' ? 'draft' : 'published'
      pushAudit(tr(`内容 ${id}「${c.title}」状态变更为 ${next}`, `Content ${id} "${c.title}" status changed to ${next}`))
      return { ...c, status: next }
    }))
  }

  function sendNotification(_id: string, title: string) {
    pushAudit(tr(`手动推送通知「${title}」至所有医生`, `Manually pushed notification "${title}" to all doctors`))
    window.alert(tr(`已向所有医生推送：${title}`, `Notification sent to all doctors: ${title}`))
  }

  const filteredAccounts = accounts.filter(a =>
    !searchQuery || a.name.includes(searchQuery) || a.email.includes(searchQuery) || a.role.includes(searchQuery)
  )

  const pendingCount = applications.filter(a => a.status === 'pending').length + apiPending.length
  const unresolvedCount = feedback.filter(f => !f.resolved).length

  const tabs: Array<{ key: AdminTab; label: string; badge?: number }> = [
    { key: 'registration', label: tr('审核注册', 'Registration Review'), badge: pendingCount },
    { key: 'accounts', label: tr('账号与权限', 'Accounts & Roles') },
    { key: 'reports', label: tr('报告与审计', 'Reports & Audit') },
    { key: 'content', label: tr('反馈与内容', 'Feedback & Content'), badge: unresolvedCount },
  ]

  return (
    <div className="role-page portal-page developer-portal devops-console">
      <header className="portal-hero dev-hero devops-hero">
        <div className="hero-main">
          <p className="hero-kicker">{tr('系统管理控制台', 'System Admin Console')}</p>
          <h1>{tr('管理员工作台', 'Admin Dashboard')}</h1>
          <p className="hero-desc">{tr(
            '覆盖医生资质审核、账号权限管理、健康数据报告与内容运营全流程。',
            'Full-cycle admin hub: doctor registration review, account management, health data reports, and content operations.',
          )}</p>
          <div className="hero-chips">
            <span className="hero-chip">{tr(`待审申请 ${pendingCount}`, `${pendingCount} pending`)}</span>
            <span className="hero-chip">{tr(`活跃医生 ${usageStats.totalDoctors}`, `${usageStats.totalDoctors} doctors`)}</span>
            <span className="hero-chip">{tr(`未处理反馈 ${unresolvedCount}`, `${unresolvedCount} unresolved`)}</span>
          </div>
        </div>
        <div className="hero-side">
          <p className="muted small">{tr('跟踪患者', 'Patients tracked')}</p>
          <p className="hero-id">{usageStats.patientsTracked}</p>
          <p className="muted small">{tr('在线会话', 'Active sessions')}: {usageStats.activeSessions}</p>
          <p className="muted small">{tr('平均时长', 'Avg session')}: {usageStats.avgSessionMin} {tr('分钟', 'min')}</p>
          <div className="role-actions" style={{ marginTop: '0.6rem' }}>
            <button type="button" className="btn ghost role-link" onClick={logout}>{t('logout')}</button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <section className="card devops-tabbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`btn ${activeTab === tab.key ? 'primary' : 'ghost'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0
              ? <span style={{ marginLeft: '0.35rem', background: '#e53e3e', color: '#fff', borderRadius: '999px', padding: '0 0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>{tab.badge}</span>
              : null}
          </button>
        ))}
      </section>

      {/* ── Registration Review ── */}
      {activeTab === 'registration' ? (
        <section className="card">
          <h2 className="card-title">{tr('医生注册申请审核', 'Doctor Registration Applications')}</h2>
          <p className="muted small">{tr('审阅执照与资质，通过或拒绝后系统自动通知申请医生。', 'Review license and credentials; system notifies the applicant upon decision.')}</p>
          {/* ── API-side pending clinicians ── */}
          <div style={{ marginTop: '1rem' }}>
            <p className="small muted" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
              {tr('来自 API 的待审批注册', 'Pending registrations from API')}
            </p>
            {apiPendingLoading ? (
              <p className="muted small">{tr('加载中…', 'Loading…')}</p>
            ) : apiPendingErr ? (
              <p className="muted small" style={{ color: '#c53030' }}>{apiPendingErr}</p>
            ) : apiPending.length === 0 ? (
              <p className="muted small">{tr('暂无待审批的 API 注册申请。', 'No pending API registrations.')}</p>
            ) : (
              <div className="task-list">
                {apiPending.map(user => (
                  <article key={user.id} className="task-row precheck-row">
                    <div className="task-main">
                      <p className="task-title applicant-name">{user.name}</p>
                      <p className="muted small">{user.email} · ID #{user.id} · {tr('注册于', 'Joined')} {user.created_at.slice(0, 10)}</p>
                    </div>
                    <div className="role-actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => void viewApiLicense(user)}
                      >
                        {tr('查看执照', 'View license')}
                      </button>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => void approveApiClinician(user)}
                      >
                        {tr('通过', 'Approve')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* ── Local (demo) pending applications ── */}
          <p className="small muted" style={{ marginTop: '1.2rem', marginBottom: '0.5rem', fontWeight: 600 }}>
            {tr('本地演示注册申请', 'Local demo registrations')}
          </p>
          <div className="task-list">
            {applications.map(app => (
              <article key={app.id} className={`task-row precheck-row ${app.status === 'rejected' ? 'fail' : ''}`}>
                <div className="task-main">
                  <p className="task-title applicant-name">{app.name}</p>
                  <p className="muted small">{app.account} · {tr('提交于', 'Submitted')} {app.submittedAt}</p>
                </div>
                <div className="role-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() =>
                      setLicenseViewer({
                        name: app.name,
                        account: app.account,
                        images: app.licenseImages ?? [],
                      })}
                  >
                    {tr('查看执照', 'View license')}
                  </button>
                  {app.status === 'pending' ? (
                    <>
                      <button type="button" className="btn primary" onClick={() => reviewApp(app.id, 'approved')}>{tr('通过', 'Approve')}</button>
                      <button type="button" className="btn ghost" onClick={() => reviewApp(app.id, 'rejected')}>{tr('拒绝', 'Reject')}</button>
                    </>
                  ) : (
                    <span className={`check-state ${app.status === 'approved' ? 'pass' : 'fail'}`}>
                      {app.status === 'approved' ? tr('已通过', 'Approved') : tr('已拒绝', 'Rejected')}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {licenseViewer ? (
        <div className="entry-modal-mask" role="dialog" aria-modal="true">
          <div className="entry-modal" style={{ width: 'min(95vw, 860px)' }}>
            <h3 style={{ margin: 0, color: '#0f2a4e' }}>
              {tr('医生执照', 'Doctor license')}
            </h3>
            <p className="muted small" style={{ marginTop: 6 }}>
              {licenseViewer.name} · {licenseViewer.account}
            </p>
            {licenseViewer.images.length === 0 ? (
              <p className="muted">{tr('未上传执照图片。', 'No license images uploaded.')}</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 10 }}>
                {licenseViewer.images.map((src, idx) => (
                  <a key={`${idx}-${src.slice(0, 18)}`} href={src} target="_blank" rel="noreferrer">
                    <img
                      src={src}
                      alt={tr('执照图片', 'License image')}
                      style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, border: '1px solid #d2def0' }}
                    />
                  </a>
                ))}
              </div>
            )}
            <div className="role-actions" style={{ marginTop: 12 }}>
              <button type="button" className="btn primary" onClick={() => setLicenseViewer(null)}>
                {tr('关闭', 'Close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Accounts & Roles ── */}
      {activeTab === 'accounts' ? (
        <section className="card">
          <h2 className="card-title">{tr('账号与权限管理', 'Account & Role Management')}</h2>
          <div className="role-actions" style={{ marginBottom: '0.8rem' }}>
            <input
              className="patient-select"
              style={{ flex: 1, maxWidth: 320 }}
              placeholder={tr('搜索姓名 / 邮箱 / 角色…', 'Search name / email / role…')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="task-list">
            {filteredAccounts.map(acc => (
              <article key={acc.id} className="task-row">
                <div className="task-main">
                  <p className="task-title">
                    {acc.name}
                    <span className="muted small" style={{ marginLeft: '0.5rem' }}>
                      [{acc.role === 'doctor' ? tr('医生', 'Doctor') : tr('管理员', 'Admin')}]
                    </span>
                  </p>
                  <p className="muted small">{acc.email} · {tr('加入', 'Joined')} {acc.joinedAt}</p>
                </div>
                <div className="role-actions">
                  <span className={`check-state ${acc.status === 'active' ? 'pass' : 'fail'}`}>
                    {acc.status === 'active' ? tr('正常', 'Active') : tr('已禁用', 'Disabled')}
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={acc.role === 'admin'}
                    onClick={() => toggleAccount(acc.id)}
                  >
                    {acc.status === 'active' ? tr('禁用', 'Disable') : tr('启用', 'Enable')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Reports & Audit ── */}
      {activeTab === 'reports' ? (
        <>
          <section className="portal-kpi-grid premium-grid">
            {([
              { label: tr('注册医生总数', 'Total Doctors'), value: usageStats.totalDoctors, foot: tr('较上月 +6', '+6 vs last month') },
              { label: tr('在线会话数', 'Active Sessions'), value: usageStats.activeSessions, foot: tr('当前实时', 'Real-time') },
              { label: tr('跟踪患者数', 'Patients Tracked'), value: usageStats.patientsTracked, foot: tr('所有医生合计', 'All doctors combined') },
              { label: tr('平均会话时长', 'Avg Session Duration'), value: `${usageStats.avgSessionMin} ${tr('分钟', 'min')}`, foot: tr('近 30 天', 'Last 30 days') },
            ] as const).map(stat => (
              <article key={stat.label} className="card portal-stat">
                <p className="stat-label">{stat.label}</p>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-foot muted">{stat.foot}</p>
              </article>
            ))}
          </section>

          <section className="card">
            <h2 className="card-title">{tr('操作审计日志', 'Admin Action Audit Log')}</h2>
            <p className="muted small" style={{ marginBottom: '0.6rem' }}>{tr('记录所有管理员操作，支持合规核查与追溯。', 'All admin actions are logged here for compliance and traceability.')}</p>
            <div className="audit-list">
              {auditLogs.map((log, i) => <p key={i}>{log}</p>)}
            </div>
            <div className="role-actions" style={{ marginTop: '0.6rem' }}>
              <button type="button" className="btn ghost" onClick={() => pushAudit(tr('导出审计报告', 'Exported audit report'))}>
                {tr('导出审计报告', 'Export Audit Report')}
              </button>
            </div>
          </section>
        </>
      ) : null}

      {/* ── Feedback & Content ── */}
      {activeTab === 'content' ? (
        <div className="portal-two-col premium-grid">
          <section className="card">
            <h2 className="card-title">{tr('用户反馈处理', 'User Feedback')}</h2>
            <div className="task-list">
              {feedback.map(fb => (
                <article key={fb.id} className={`task-row ${fb.resolved ? '' : 'precheck-row'}`}>
                  <div className="task-main">
                    <p className="task-title">{fb.subject}</p>
                    <p className="muted small">{fb.from} · {fb.at}</p>
                    <p className="small" style={{ marginTop: '0.2rem' }}>{fb.content}</p>
                  </div>
                  <div className="role-actions">
                    {fb.resolved
                      ? <span className="check-state pass">{tr('已处理', 'Resolved')}</span>
                      : <button type="button" className="btn primary" onClick={() => resolveFeedback(fb.id)}>{tr('标记已处理', 'Mark resolved')}</button>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">{tr('内容与通知管理', 'Content & Notifications')}</h2>
            <div className="task-list">
              {content.map(ct => (
                <article key={ct.id} className="task-row">
                  <div className="task-main">
                    <p className="task-title">{ct.title}</p>
                    <p className="muted small">
                      {ct.type === 'announcement' ? tr('公告', 'Announcement')
                        : ct.type === 'article' ? tr('文章', 'Article')
                        : tr('通知', 'Notification')}
                      {' · '}{tr('更新', 'Updated')} {ct.updatedAt}
                    </p>
                  </div>
                  <div className="role-actions">
                    <span className={`check-state ${ct.status === 'published' ? 'pass' : 'idle'}`}>
                      {ct.status === 'published' ? tr('已发布', 'Published') : tr('草稿', 'Draft')}
                    </span>
                    <button type="button" className="btn ghost" onClick={() => togglePublish(ct.id)}>
                      {ct.status === 'published' ? tr('撤回', 'Unpublish') : tr('发布', 'Publish')}
                    </button>
                    {ct.type === 'notification' && ct.status === 'published'
                      ? <button type="button" className="btn primary" onClick={() => sendNotification(ct.id, ct.title)}>{tr('推送', 'Push')}</button>
                      : null}
                  </div>
                </article>
              ))}
            </div>
            <div className="role-actions" style={{ marginTop: '0.8rem' }}>
              <button type="button" className="btn ghost" onClick={() => pushAudit(tr('新建内容草稿', 'Created new content draft'))}>
                {tr('+ 新建内容', '+ New Content')}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Persistent audit log footer (visible on all tabs except reports which shows it inline) */}
      {activeTab !== 'reports' ? (
        <section className="card" style={{ marginTop: '0.8rem' }}>
          <h2 className="card-title" style={{ fontSize: '0.95rem' }}>{tr('操作审计日志', 'Audit Log')}</h2>
          <div className="audit-list" style={{ maxHeight: 120, overflowY: 'auto' }}>
            {auditLogs.slice(0, 5).map((log, i) => <p key={i}>{log}</p>)}
          </div>
        </section>
      ) : null}
    </div>
  )
}
