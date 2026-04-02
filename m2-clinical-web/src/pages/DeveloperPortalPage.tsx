import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/devops-console.css'

type ConsoleTab = 'overview' | 'monitor' | 'release' | 'config'
type Role = 'superAdmin' | 'operator' | 'developer'
type CheckStatus = 'idle' | 'running' | 'pass' | 'fail'
type ServiceStatus = 'healthy' | 'warning' | 'critical'

type EnvMeta = {
  mode: 'development' | 'staging' | 'production'
  version: string
  buildTime: string
  deployer: string
}

type CheckItem = {
  id: string
  title: string
  detail: string
  fix: string
  status: CheckStatus
}

type CoreService = {
  id: string
  name: string
  latency: number
  errorRate: number
  qps: number
  status: ServiceStatus
}

type ConfigSnapshot = {
  id: string
  at: string
  apiBase: string
  mode: string
  buildProfile: string
}

const envMetas: Record<EnvMeta['mode'], EnvMeta> = {
  development: { mode: 'development', version: 'v0.9.4-dev', buildTime: '2026-04-02 14:35', deployer: 'dev-bot' },
  staging: { mode: 'staging', version: 'v0.9.4-rc2', buildTime: '2026-04-02 12:10', deployer: 'ops-lee' },
  production: { mode: 'production', version: 'v0.9.3', buildTime: '2026-04-01 23:48', deployer: 'release-bot' },
}

const initialChecks: CheckItem[] = [
  { id: 'cert', title: '证书与域名校验', detail: '验证 API 证书链和网关域名指向', fix: '更新网关证书并刷新 DNS 缓存。', status: 'idle' },
  { id: 'smoke', title: '三端冒烟测试', detail: '医生/患者/运维入口关键链路检查', fix: '回滚前端包并检查回归用例。', status: 'idle' },
  { id: 'audit', title: '审计日志链路', detail: '确认操作日志写入与查询可用', fix: '重启审计采集器并补偿写入任务。', status: 'idle' },
  { id: 'alert', title: '告警规则可达性', detail: '验证邮件/短信/企业微信通知链路', fix: '检查通知网关配置与告警模板。', status: 'idle' },
]

const availabilityTrend = [99.93, 99.91, 99.95, 99.97, 99.94, 99.9, 99.92, 99.9, 99.89, 99.93, 99.96, 99.94]
const resourceSeed = { cpu: 42, memory: 64, disk: 51, network: 39 }

const topology = [
  { id: 'gateway', label: 'API 网关' },
  { id: 'auth', label: 'Auth 服务' },
  { id: 'patient', label: 'Patient 服务' },
  { id: 'doctor', label: 'Doctor 服务' },
  { id: 'db', label: 'PostgreSQL' },
  { id: 'cache', label: 'Redis' },
]

const topologyEdges: Array<[string, string]> = [
  ['gateway', 'auth'],
  ['gateway', 'patient'],
  ['gateway', 'doctor'],
  ['patient', 'db'],
  ['doctor', 'db'],
  ['auth', 'cache'],
]

const modulesDefault = ['availability', 'build', 'alerts', 'resources']

function classByServiceStatus(status: ServiceStatus) {
  if (status === 'healthy') return 'svc-ok'
  if (status === 'warning') return 'svc-warn'
  return 'svc-bad'
}

export function DeveloperPortalPage() {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('overview')
  const [role, setRole] = useState<Role>('superAdmin')
  const [env, setEnv] = useState<EnvMeta['mode']>('staging')
  const [apiBase, setApiBase] = useState(import.meta.env.VITE_API_BASE ?? 'https://api-staging.clinical.local')
  const [envMode, setEnvMode] = useState<'mock' | 'real'>('mock')
  const [buildProfile, setBuildProfile] = useState('vite-prod-optimized')
  const [checks, setChecks] = useState<CheckItem[]>(initialChecks)
  const [pipelineStage, setPipelineStage] = useState(2)
  const [grayPercent, setGrayPercent] = useState(20)
  const [modules, setModules] = useState<string[]>(modulesDefault)
  const [draggingModule, setDraggingModule] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<string[]>([
    '2026-04-02 14:40 [superAdmin] 修改告警策略：高优先级阈值 3 -> 2',
    '2026-04-02 14:21 [operator] 执行发布预检：通过 3 项，失败 1 项',
    '2026-04-02 13:58 [developer] 切换 mock 数据源进行联调',
  ])
  const [configHistory, setConfigHistory] = useState<ConfigSnapshot[]>([
    { id: 'cfg-1', at: '2026-04-02 14:38', apiBase: 'https://api-staging.clinical.local', mode: 'mock', buildProfile: 'vite-prod-optimized' },
  ])
  const [resources, setResources] = useState(resourceSeed)

  const [services, setServices] = useState<CoreService[]>([
    { id: 'api', name: 'API 网关', latency: 84, errorRate: 0.4, qps: 218, status: 'healthy' },
    { id: 'mock', name: 'Mock 数据服务', latency: 12, errorRate: 0.2, qps: 120, status: 'healthy' },
    { id: 'cdn', name: '静态资源 CDN', latency: 246, errorRate: 1.2, qps: 540, status: 'warning' },
    { id: 'audit', name: '审计日志通道', latency: 96, errorRate: 0.3, qps: 88, status: 'healthy' },
  ])

  const envMeta = envMetas[env]
  const alertStats = useMemo(() => ({ high: 2, medium: 4, low: 7 }), [])
  const availability = 99.9
  const passCount = checks.filter((item) => item.status === 'pass').length
  const failCount = checks.filter((item) => item.status === 'fail').length

  useEffect(() => {
    const timer = window.setInterval(() => {
      setResources((prev) => ({
        cpu: Math.max(10, Math.min(92, prev.cpu + (Math.random() * 8 - 4))),
        memory: Math.max(15, Math.min(95, prev.memory + (Math.random() * 6 - 3))),
        disk: Math.max(20, Math.min(88, prev.disk + (Math.random() * 4 - 2))),
        network: Math.max(8, Math.min(89, prev.network + (Math.random() * 10 - 5))),
      }))
      setServices((prev) =>
        prev.map((svc) => {
          const latency = Math.max(8, Math.round(svc.latency + (Math.random() * 30 - 15)))
          const errorRate = Math.max(0.1, Number((svc.errorRate + (Math.random() * 0.4 - 0.2)).toFixed(1)))
          const qps = Math.max(30, Math.round(svc.qps + (Math.random() * 24 - 12)))
          const status: ServiceStatus = errorRate > 2 ? 'critical' : errorRate > 1 || latency > 240 ? 'warning' : 'healthy'
          return { ...svc, latency, errorRate, qps, status }
        }),
      )
    }, 2800)
    return () => window.clearInterval(timer)
  }, [])

  function pushAudit(entry: string) {
    const now = new Date()
    const t = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setAuditLogs((prev) => [`${t} [${role}] ${entry}`, ...prev.slice(0, 11)])
  }

  function runCheck(id: string) {
    setChecks((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'running' } : item)))
    window.setTimeout(() => {
      const fail = Math.random() < 0.25
      setChecks((prev) => prev.map((item) => (item.id === id ? { ...item, status: fail ? 'fail' : 'pass' } : item)))
      pushAudit(`执行发布预检项 ${id}，结果：${fail ? '失败' : '通过'}`)
    }, 950)
  }

  function saveConfig() {
    const ok = window.confirm('将更新运行配置并写入审计日志，是否确认提交？')
    if (!ok) return
    const snapshot: ConfigSnapshot = {
      id: `cfg-${Date.now()}`,
      at: new Date().toLocaleString(),
      apiBase,
      mode: envMode,
      buildProfile,
    }
    setConfigHistory((prev) => [snapshot, ...prev.slice(0, 9)])
    pushAudit(`更新运行配置：${apiBase} / ${envMode} / ${buildProfile}`)
  }

  function rollbackConfig(snapshot: ConfigSnapshot) {
    setApiBase(snapshot.apiBase)
    setEnvMode(snapshot.mode === 'mock' ? 'mock' : 'real')
    setBuildProfile(snapshot.buildProfile)
    pushAudit(`回溯配置版本 ${snapshot.id}`)
  }

  function triggerRelease() {
    setPipelineStage((prev) => (prev < 4 ? prev + 1 : prev))
    pushAudit('手动触发发布流水线推进')
  }

  function rollbackRelease() {
    setPipelineStage(1)
    pushAudit('执行版本回滚到上一个稳定构建')
  }

  function onDrop(target: string) {
    if (!draggingModule || draggingModule === target) return
    const next = modules.slice()
    const from = next.indexOf(draggingModule)
    const to = next.indexOf(target)
    next.splice(from, 1)
    next.splice(to, 0, draggingModule)
    setModules(next)
    setDraggingModule(null)
  }

  const canManageUsers = role === 'superAdmin' || role === 'operator'
  const canCriticalAction = role === 'superAdmin'

  return (
    <div className="role-page portal-page developer-portal devops-console">
      <header className="portal-hero dev-hero devops-hero">
        <div className="hero-main">
          <p className="hero-kicker">DevOps & Admin Console</p>
          <h1>开发者 / 系统管理中枢</h1>
          <p className="hero-desc">专业级运维控制台：覆盖环境治理、CI/CD、监控告警、审计合规与权限管理。</p>
          <div className="hero-chips">
            <span className="hero-chip">SLA 99.9%</span>
            <span className="hero-chip">灰度发布进行中 {grayPercent}%</span>
            <span className="hero-chip">审计链路在线</span>
          </div>
        </div>
        <div className="hero-side">
          <p className="muted small">当前环境</p>
          <p className="hero-id">{envMeta.mode}</p>
          <p className="muted small">版本：{envMeta.version}</p>
          <p className="muted small">构建时间：{envMeta.buildTime}</p>
          <p className="muted small">部署人：{envMeta.deployer}</p>
          <div className="env-switches">
            {(['development', 'staging', 'production'] as const).map((mode) => (
              <button key={mode} type="button" className={`btn ${env === mode ? 'primary' : 'ghost'}`} onClick={() => { setEnv(mode); pushAudit(`切换环境到 ${mode}`) }}>
                {mode}
              </button>
            ))}
          </div>
          <div className="role-actions">
            <Link className="btn ghost role-link" to="/roles">返回多端入口</Link>
          </div>
        </div>
      </header>

      <section className="card devops-alert-overview">
        <div>
          <h2 className="card-title">全局告警总览</h2>
          <p className="muted small">点击可进入告警中心处理流程。</p>
        </div>
        <div className="alert-counters">
          <button type="button" className="alert-pill high" onClick={() => setActiveTab('monitor')}>高优 {alertStats.high}</button>
          <button type="button" className="alert-pill medium" onClick={() => setActiveTab('monitor')}>中优 {alertStats.medium}</button>
          <button type="button" className="alert-pill low" onClick={() => setActiveTab('monitor')}>低优 {alertStats.low}</button>
        </div>
      </section>

      <section className="card devops-tabbar">
        {([
          ['overview', '概览页'],
          ['monitor', '监控页'],
          ['release', '发布页'],
          ['config', '配置页'],
        ] as const).map(([tab, label]) => (
          <button key={tab} type="button" className={`btn ${activeTab === tab ? 'primary' : 'ghost'}`} onClick={() => setActiveTab(tab)}>
            {label}
          </button>
        ))}
        <div className="tab-right">
          <label className="muted small" htmlFor="roleSelect">权限视角</label>
          <select id="roleSelect" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="superAdmin">超级管理员</option>
            <option value="operator">运维人员</option>
            <option value="developer">开发人员</option>
          </select>
        </div>
      </section>

      {activeTab === 'overview' ? (
        <>
          <section className="portal-kpi-grid premium-grid">
            {modules.map((moduleId) => (
              <article
                key={moduleId}
                className="card portal-stat draggable-module"
                draggable
                onDragStart={() => setDraggingModule(moduleId)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDrop(moduleId)}
              >
                {moduleId === 'availability' ? (
                  <>
                    <p className="stat-label">服务健康度（24h）</p>
                    <div className="ring-wrap">
                      <svg viewBox="0 0 120 120" className="ring">
                        <circle cx="60" cy="60" r="46" className="ring-bg" />
                        <circle cx="60" cy="60" r="46" className="ring-active" strokeDasharray={`${Math.round((availability / 100) * 289)} 289`} />
                      </svg>
                      <p className="stat-value">{availability}%</p>
                    </div>
                    <div className="sparkline">
                      {availabilityTrend.map((point, idx) => (
                        <span key={`${point}-${idx}`} style={{ height: `${(point - 99.7) * 210}px` }} />
                      ))}
                    </div>
                  </>
                ) : null}
                {moduleId === 'build' ? (
                  <>
                    <p className="stat-label">前端构建版本</p>
                    <p className="stat-value">{envMeta.version}</p>
                    <p className="stat-foot muted">提交窗口：2026-04-02 10:00~14:35</p>
                    <p className="stat-foot muted">构建人：{envMeta.deployer}</p>
                    <div className="role-actions">
                      <button type="button" className="btn ghost" onClick={() => pushAudit('查看构建日志')}>构建日志</button>
                      <button type="button" className="btn primary" onClick={rollbackRelease}>一键回滚</button>
                    </div>
                  </>
                ) : null}
                {moduleId === 'alerts' ? (
                  <>
                    <p className="stat-label">待处理告警</p>
                    <p className="stat-value">{alertStats.high + alertStats.medium + alertStats.low}</p>
                    <div className="alert-stack">
                      <span className="alert-tag high">高优 {alertStats.high}</span>
                      <span className="alert-tag medium">中优 {alertStats.medium}</span>
                      <span className="alert-tag low">低优 {alertStats.low}</span>
                    </div>
                    <button type="button" className="btn ghost" onClick={() => setActiveTab('monitor')}>进入告警中心</button>
                  </>
                ) : null}
                {moduleId === 'resources' ? (
                  <>
                    <p className="stat-label">环境资源监控</p>
                    {(['cpu', 'memory', 'disk', 'network'] as const).map((k) => (
                      <div key={k} className="resource-row">
                        <span>{k.toUpperCase()}</span>
                        <div className="resource-track"><div className="resource-fill" style={{ width: `${resources[k]}%` }} /></div>
                        <strong>{resources[k].toFixed(0)}%</strong>
                      </div>
                    ))}
                  </>
                ) : null}
              </article>
            ))}
          </section>
          <section className="card">
            <h2 className="card-title">联调入口与运维核心操作</h2>
            <div className="role-actions big-actions">
              <Link className="btn ghost" to="/doctor">打开医生端</Link>
              <Link className="btn ghost" to="/patient">打开患者端</Link>
              <Link className="btn primary" to="/doctor/p/p-001/trends">快速进入示例患者趋势</Link>
              <button type="button" className="btn ghost" onClick={() => pushAudit('执行一键重启服务')}>一键重启服务</button>
              <button type="button" className="btn ghost" onClick={() => pushAudit('执行一键清空缓存')}>一键清空缓存</button>
              <button type="button" className="btn ghost" onClick={() => { setEnvMode((prev) => (prev === 'mock' ? 'real' : 'mock')); pushAudit('切换 Mock/真实环境') }}>一键切换 Mock/真实环境</button>
              <button type="button" className="btn ghost" onClick={() => setActiveTab('config')}>权限审计入口</button>
              {canManageUsers ? <button type="button" className="btn ghost" onClick={() => pushAudit('打开用户管理入口')}>用户管理入口</button> : null}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === 'monitor' ? (
        <>
          <section className="card">
            <div className="section-head">
              <h2 className="card-title">核心服务状态（实时）</h2>
              <span className="small muted">采样周期 2.8 秒</span>
            </div>
            <div className="task-list">
              {services.map((service) => (
                <article key={service.id} className="service-row">
                  <div>
                    <p className="task-title">{service.name}</p>
                    <p className="muted small">延迟 {service.latency}ms · 错误率 {service.errorRate}% · QPS {service.qps}</p>
                  </div>
                  <div className={`service-state ${classByServiceStatus(service.status)}`}>
                    {service.status === 'healthy' ? '正常' : service.status === 'warning' ? '预警' : '故障'}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="portal-two-col premium-grid">
            <section className="card">
              <h2 className="card-title">依赖服务状态</h2>
              <ul className="simple-list">
                <li>数据库 PostgreSQL：连接池 72%，复制延迟 38ms</li>
                <li>缓存 Redis：命中率 94%，主从同步正常</li>
                <li>消息队列 Kafka：消费堆积 0，吞吐正常</li>
              </ul>
            </section>
            <section className="card">
              <h2 className="card-title">日志中心入口</h2>
              <p className="muted">按服务、时间、关键词检索日志，支持错误堆栈快速定位。</p>
              <div className="role-actions">
                <button type="button" className="btn primary" onClick={() => pushAudit('跳转日志检索中心')}>进入日志检索</button>
                <button type="button" className="btn ghost" onClick={() => pushAudit('打开告警规则配置')}>告警规则配置</button>
              </div>
            </section>
          </section>

          <section className="card">
            <h2 className="card-title">服务拓扑图</h2>
            <div className="topology">
              {topology.map((node) => {
                const broken = node.id === 'gateway' && services.some((s) => s.status === 'critical')
                return <div key={node.id} className={`topology-node ${broken ? 'bad' : ''}`}>{node.label}</div>
              })}
            </div>
            <p className="muted small">依赖关系：{topologyEdges.map((edge) => `${edge[0]}→${edge[1]}`).join('，')}</p>
          </section>
        </>
      ) : null}

      {activeTab === 'release' ? (
        <>
          <section className="card">
            <div className="section-head">
              <h2 className="card-title">发布前检查清单（可执行）</h2>
              <span className="small muted">通过 {passCount} / 失败 {failCount}</span>
            </div>
            <div className="task-list">
              {checks.map((item) => (
                <article key={item.id} className={`task-row precheck-row ${item.status === 'fail' ? 'fail' : ''}`}>
                  <div className="task-main">
                    <p className="task-title">{item.title}</p>
                    <p className="muted small">{item.detail}</p>
                    {item.status === 'fail' ? <p className="small fix-tip">修复建议：{item.fix}</p> : null}
                  </div>
                  <div className="role-actions">
                    <button type="button" className="btn ghost" disabled={item.status === 'running'} onClick={() => runCheck(item.id)}>一键执行</button>
                    <span className={`check-state ${item.status}`}>
                      {item.status === 'idle' ? '待执行' : item.status === 'running' ? '执行中' : item.status === 'pass' ? '通过' : '失败'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="portal-two-col premium-grid">
            <section className="card">
              <h2 className="card-title">发布流水线</h2>
              <div className="pipeline">
                {['代码提交', '构建', '测试', '灰度', '发布'].map((stage, idx) => (
                  <div key={stage} className={`pipeline-node ${idx <= pipelineStage ? 'active' : ''}`}>{stage}</div>
                ))}
              </div>
              <div className="role-actions">
                <button type="button" className="btn primary" onClick={triggerRelease}>触发发布</button>
                <button type="button" className="btn ghost" onClick={rollbackRelease}>回滚发布</button>
              </div>
            </section>
            <section className="card">
              <h2 className="card-title">灰度发布管理</h2>
              <p className="muted small">用户分组：康复中心 A 组 / 专家门诊组 / 内测账号组</p>
              <label htmlFor="grayRange">灰度比例：{grayPercent}%</label>
              <input id="grayRange" type="range" min={1} max={100} value={grayPercent} onChange={(event) => setGrayPercent(Number(event.target.value))} />
              <div className="role-actions">
                <button type="button" className="btn ghost" onClick={() => pushAudit(`调整灰度比例到 ${grayPercent}%`)}>应用比例</button>
                <button type="button" className="btn ghost" onClick={() => pushAudit('暂停灰度发布')}>暂停灰度</button>
                <button type="button" className="btn ghost" onClick={() => pushAudit('终止灰度发布')}>终止灰度</button>
              </div>
            </section>
          </section>
        </>
      ) : null}

      {activeTab === 'config' ? (
        <>
          <section className="portal-two-col premium-grid">
            <section className="card">
              <h2 className="card-title">运行环境配置中心</h2>
              <div className="config-grid">
                <label htmlFor="apiBase">API 基地址</label>
                <input id="apiBase" value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
                <label htmlFor="modeSwitch">环境模式</label>
                <select id="modeSwitch" value={envMode} onChange={(event) => setEnvMode(event.target.value === 'mock' ? 'mock' : 'real')}>
                  <option value="mock">mock</option>
                  <option value="real">real</option>
                </select>
                <label htmlFor="buildProfile">构建配置</label>
                <input id="buildProfile" value={buildProfile} onChange={(event) => setBuildProfile(event.target.value)} />
              </div>
              <div className="role-actions">
                <button type="button" className="btn primary" onClick={saveConfig}>保存配置（含二次确认）</button>
              </div>
            </section>
            <section className="card">
              <h2 className="card-title">配置历史版本回溯</h2>
              <div className="task-list">
                {configHistory.map((history) => (
                  <article key={history.id} className="task-row">
                    <div className="task-main">
                      <p className="task-title">{history.id}</p>
                      <p className="small muted">{history.at}</p>
                      <p className="small muted">{history.apiBase} / {history.mode} / {history.buildProfile}</p>
                    </div>
                    <button type="button" className="btn ghost" onClick={() => rollbackConfig(history)}>回溯</button>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="portal-two-col premium-grid">
            <section className="card">
              <h2 className="card-title">操作审计日志</h2>
              <div className="audit-list">
                {auditLogs.map((log) => <p key={log}>{log}</p>)}
              </div>
              <div className="role-actions">
                <button type="button" className="btn ghost" onClick={() => pushAudit('导出审计报告')}>导出审计报告</button>
              </div>
            </section>
            <section className="card">
              <h2 className="card-title">权限与通知策略</h2>
              <ul className="simple-list">
                <li>超级管理员：全量权限（发布、回滚、权限变更、审计导出）</li>
                <li>运维人员：监控、告警、发布执行、服务操作</li>
                <li>开发人员：日志查询、预检执行、联调操作</li>
              </ul>
              <p className="muted small">通知方式：邮件 / 短信 / 企业微信（支持升级策略与值班轮转）。</p>
              {!canCriticalAction ? <p className="small fix-tip">当前角色无权执行关键变更（如生产回滚、权限变更）。</p> : null}
            </section>
          </section>
        </>
      ) : null}
    </div>
  )
}
