import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/devops-console.css'
import { useI18n } from '../i18n/I18nContext'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'

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

function makeInitialChecks(tr: (zh: string, en: string, pt: string) => string): CheckItem[] {
  return [
    { id: 'cert', title: tr('证书与域名校验', 'Certificate and domain validation', 'Validacao de certificado e dominio'), detail: tr('验证 API 证书链和网关域名指向', 'Verify API certificate chain and gateway DNS mapping', 'Validar cadeia de certificado da API e mapeamento DNS do gateway'), fix: tr('更新网关证书并刷新 DNS 缓存。', 'Update gateway certificate and refresh DNS cache.', 'Atualizar certificado do gateway e atualizar cache DNS.'), status: 'idle' },
    { id: 'smoke', title: tr('三端冒烟测试', 'Three-portal smoke test', 'Teste de fumaca dos tres portais'), detail: tr('医生/患者/运维入口关键链路检查', 'Check critical flows for doctor/patient/devops entries', 'Verificar fluxos criticos das entradas medico/paciente/devops'), fix: tr('回滚前端包并检查回归用例。', 'Rollback frontend package and verify regression cases.', 'Reverter pacote frontend e verificar casos de regressao.'), status: 'idle' },
    { id: 'audit', title: tr('审计日志链路', 'Audit log pipeline', 'Pipeline de logs de auditoria'), detail: tr('确认操作日志写入与查询可用', 'Ensure operation logs can be written and queried', 'Confirmar escrita e consulta dos logs de operacao'), fix: tr('重启审计采集器并补偿写入任务。', 'Restart audit collector and replay missing writes.', 'Reiniciar coletor de auditoria e compensar gravacoes pendentes.'), status: 'idle' },
    { id: 'alert', title: tr('告警规则可达性', 'Alert rule reachability', 'Alcance das regras de alerta'), detail: tr('验证邮件/短信/企业微信通知链路', 'Validate email/SMS/WeCom notification paths', 'Validar rotas de notificacao por e-mail/SMS/WeCom'), fix: tr('检查通知网关配置与告警模板。', 'Check notification gateway settings and alert templates.', 'Verificar configuracao do gateway de notificacao e modelos de alerta.'), status: 'idle' },
  ]
}

const availabilityTrend = [99.93, 99.91, 99.95, 99.97, 99.94, 99.9, 99.92, 99.9, 99.89, 99.93, 99.96, 99.94]
const resourceSeed = { cpu: 42, memory: 64, disk: 51, network: 39 }

function makeTopology(tr: (zh: string, en: string, pt: string) => string) {
  return [
    { id: 'gateway', label: tr('API 网关', 'API Gateway', 'API Gateway') },
    { id: 'auth', label: tr('认证服务', 'Auth Service', 'Servico de Autenticacao') },
    { id: 'patient', label: tr('患者服务', 'Patient Service', 'Servico do Paciente') },
    { id: 'doctor', label: tr('医生服务', 'Doctor Service', 'Servico Medico') },
    { id: 'db', label: 'PostgreSQL' },
    { id: 'cache', label: 'Redis' },
  ]
}

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
  const { t, locale } = useI18n()
  const tr = (zh: string, en: string, pt: string) =>
    locale === 'en' ? en : locale === 'pt-BR' ? pt : zh
  const topology = useMemo(() => makeTopology(tr), [locale])
  const [activeTab, setActiveTab] = useState<ConsoleTab>('overview')
  const [role, setRole] = useState<Role>('superAdmin')
  const [env, setEnv] = useState<EnvMeta['mode']>('staging')
  const [apiBase, setApiBase] = useState(import.meta.env.VITE_API_BASE ?? 'https://api-staging.clinical.local')
  const [envMode, setEnvMode] = useState<'mock' | 'real'>('mock')
  const [buildProfile, setBuildProfile] = useState('vite-prod-optimized')
  const [checks, setChecks] = useState<CheckItem[]>(() => makeInitialChecks(tr))
  const [pipelineStage, setPipelineStage] = useState(2)
  const [grayPercent, setGrayPercent] = useState(20)
  const [modules, setModules] = useState<string[]>(modulesDefault)
  const [draggingModule, setDraggingModule] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<string[]>([
    tr('2026-04-02 14:40 [superAdmin] 修改告警策略：高优先级阈值 3 -> 2', '2026-04-02 14:40 [superAdmin] Updated alert policy: high-priority threshold 3 -> 2', '2026-04-02 14:40 [superAdmin] Politica de alerta atualizada: limiar de alta prioridade 3 -> 2'),
    tr('2026-04-02 14:21 [operator] 执行发布预检：通过 3 项，失败 1 项', '2026-04-02 14:21 [operator] Ran release prechecks: 3 passed, 1 failed', '2026-04-02 14:21 [operator] Pre-checks de release executados: 3 aprovados, 1 falhou'),
    tr('2026-04-02 13:58 [developer] 切换 mock 数据源进行联调', '2026-04-02 13:58 [developer] Switched to mock data source for integration test', '2026-04-02 13:58 [developer] Fonte de dados mock ativada para integracao'),
  ])
  const [configHistory, setConfigHistory] = useState<ConfigSnapshot[]>([
    { id: 'cfg-1', at: '2026-04-02 14:38', apiBase: 'https://api-staging.clinical.local', mode: 'mock', buildProfile: 'vite-prod-optimized' },
  ])
  const [resources, setResources] = useState(resourceSeed)

  const [services, setServices] = useState<CoreService[]>([
    { id: 'api', name: tr('API 网关', 'API Gateway', 'API Gateway'), latency: 84, errorRate: 0.4, qps: 218, status: 'healthy' },
    { id: 'mock', name: tr('Mock 数据服务', 'Mock Data Service', 'Servico de Dados Mock'), latency: 12, errorRate: 0.2, qps: 120, status: 'healthy' },
    { id: 'cdn', name: tr('静态资源 CDN', 'Static Assets CDN', 'CDN de Ativos Estaticos'), latency: 246, errorRate: 1.2, qps: 540, status: 'warning' },
    { id: 'audit', name: tr('审计日志通道', 'Audit Log Channel', 'Canal de Log de Auditoria'), latency: 96, errorRate: 0.3, qps: 88, status: 'healthy' },
  ])

  const envMeta = envMetas[env]
  const alertStats = useMemo(() => ({ high: 2, medium: 4, low: 7 }), [])
  const availability = 99.9
  const passCount = checks.filter((item) => item.status === 'pass').length
  const failCount = checks.filter((item) => item.status === 'fail').length

  useEffect(() => {
    setChecks(makeInitialChecks(tr))
    setServices((prev) =>
      prev.map((svc) => {
        if (svc.id === 'api') return { ...svc, name: tr('API 网关', 'API Gateway', 'API Gateway') }
        if (svc.id === 'mock') return { ...svc, name: tr('Mock 数据服务', 'Mock Data Service', 'Servico de Dados Mock') }
        if (svc.id === 'cdn') return { ...svc, name: tr('静态资源 CDN', 'Static Assets CDN', 'CDN de Ativos Estaticos') }
        if (svc.id === 'audit') return { ...svc, name: tr('审计日志通道', 'Audit Log Channel', 'Canal de Log de Auditoria') }
        return svc
      }),
    )
  }, [locale])

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
      pushAudit(
        tr(
          `执行发布预检项 ${id}，结果：${fail ? '失败' : '通过'}`,
          `Executed precheck item ${id}, result: ${fail ? 'failed' : 'passed'}`,
          `Item de pre-check ${id} executado, resultado: ${fail ? 'falhou' : 'aprovado'}`,
        ),
      )
    }, 950)
  }

  function saveConfig() {
    const ok = window.confirm(
      tr(
        '将更新运行配置并写入审计日志，是否确认提交？',
        'This will update runtime config and write an audit log. Confirm submit?',
        'Isso atualizara a configuracao de execucao e registrara auditoria. Confirmar envio?',
      ),
    )
    if (!ok) return
    const snapshot: ConfigSnapshot = {
      id: `cfg-${Date.now()}`,
      at: new Date().toLocaleString(),
      apiBase,
      mode: envMode,
      buildProfile,
    }
    setConfigHistory((prev) => [snapshot, ...prev.slice(0, 9)])
    pushAudit(
      tr(
        `更新运行配置：${apiBase} / ${envMode} / ${buildProfile}`,
        `Updated runtime config: ${apiBase} / ${envMode} / ${buildProfile}`,
        `Configuracao de execucao atualizada: ${apiBase} / ${envMode} / ${buildProfile}`,
      ),
    )
  }

  function rollbackConfig(snapshot: ConfigSnapshot) {
    setApiBase(snapshot.apiBase)
    setEnvMode(snapshot.mode === 'mock' ? 'mock' : 'real')
    setBuildProfile(snapshot.buildProfile)
    pushAudit(tr(`回溯配置版本 ${snapshot.id}`, `Rolled back config version ${snapshot.id}`, `Versao de configuracao revertida ${snapshot.id}`))
  }

  function triggerRelease() {
    setPipelineStage((prev) => (prev < 4 ? prev + 1 : prev))
    pushAudit(tr('手动触发发布流水线推进', 'Manually advanced release pipeline', 'Pipeline de release avancado manualmente'))
  }

  function rollbackRelease() {
    setPipelineStage(1)
    pushAudit(tr('执行版本回滚到上一个稳定构建', 'Rolled back to previous stable build', 'Revertido para a compilacao estavel anterior'))
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
          <p className="hero-kicker">{tr('DevOps 与管理控制台', 'DevOps & Admin Console', 'Console DevOps e Admin')}</p>
          <h1>{tr('开发者 / 系统管理中枢', 'Developer / System Management Hub', 'Hub do Desenvolvedor / Gestao do Sistema')}</h1>
          <p className="hero-desc">{tr('专业级运维控制台：覆盖环境治理、CI/CD、监控告警、审计合规与权限管理。', 'Professional operations console for environment governance, CI/CD, monitoring, auditing, and access control.', 'Console profissional de operacoes para governanca de ambiente, CI/CD, monitoramento, auditoria e controle de acesso.')}</p>
          <div className="hero-chips">
            <span className="hero-chip">SLA 99.9%</span>
            <span className="hero-chip">{tr('灰度发布进行中', 'Canary rollout in progress', 'Liberacao gradual em andamento')} {grayPercent}%</span>
            <span className="hero-chip">{tr('审计链路在线', 'Audit pipeline online', 'Pipeline de auditoria online')}</span>
          </div>
        </div>
        <div className="hero-side">
          <p className="muted small">{tr('当前环境', 'Current environment', 'Ambiente atual')}</p>
          <p className="hero-id">{envMeta.mode}</p>
          <p className="muted small">{tr('版本', 'Version', 'Versao')}: {envMeta.version}</p>
          <p className="muted small">{tr('构建时间', 'Build time', 'Horario de build')}: {envMeta.buildTime}</p>
          <p className="muted small">{tr('部署人', 'Deployer', 'Responsavel pelo deploy')}: {envMeta.deployer}</p>
          <div className="env-switches">
            {(['development', 'staging', 'production'] as const).map((mode) => (
              <button key={mode} type="button" className={`btn ${env === mode ? 'primary' : 'ghost'}`} onClick={() => { setEnv(mode); pushAudit(`切换环境到 ${mode}`) }}>
                {mode}
              </button>
            ))}
          </div>
          <div className="role-actions">
            <Link className="btn ghost role-link" to="/roles">{t('backToRoleEntry')}</Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <section className="card devops-alert-overview">
        <div>
          <h2 className="card-title">{tr('全局告警总览', 'Global alert overview', 'Visao geral de alertas')}</h2>
          <p className="muted small">{tr('点击可进入告警中心处理流程。', 'Click to enter alert center workflows.', 'Clique para acessar os fluxos do centro de alertas.')}</p>
        </div>
        <div className="alert-counters">
          <button type="button" className="alert-pill high" onClick={() => setActiveTab('monitor')}>{tr('高优', 'High', 'Alta')} {alertStats.high}</button>
          <button type="button" className="alert-pill medium" onClick={() => setActiveTab('monitor')}>{tr('中优', 'Medium', 'Media')} {alertStats.medium}</button>
          <button type="button" className="alert-pill low" onClick={() => setActiveTab('monitor')}>{tr('低优', 'Low', 'Baixa')} {alertStats.low}</button>
        </div>
      </section>

      <section className="card devops-tabbar">
        {([
          ['overview', tr('概览页', 'Overview', 'Visao geral')],
          ['monitor', tr('监控页', 'Monitoring', 'Monitoramento')],
          ['release', tr('发布页', 'Release', 'Liberacao')],
          ['config', tr('配置页', 'Configuration', 'Configuracao')],
        ] as const).map(([tab, label]) => (
          <button key={tab} type="button" className={`btn ${activeTab === tab ? 'primary' : 'ghost'}`} onClick={() => setActiveTab(tab)}>
            {label}
          </button>
        ))}
        <div className="tab-right">
          <label className="muted small" htmlFor="roleSelect">{tr('权限视角', 'Permission view', 'Visao de permissao')}</label>
          <select id="roleSelect" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="superAdmin">{tr('超级管理员', 'Super Admin', 'Super Admin')}</option>
            <option value="operator">{tr('运维人员', 'Operator', 'Operador')}</option>
            <option value="developer">{tr('开发人员', 'Developer', 'Desenvolvedor')}</option>
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
                    <p className="stat-label">{tr('服务健康度（24h）', 'Service health (24h)', 'Saude do servico (24h)')}</p>
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
                    <p className="stat-label">{tr('前端构建版本', 'Frontend build version', 'Versao de build do frontend')}</p>
                    <p className="stat-value">{envMeta.version}</p>
                    <p className="stat-foot muted">{tr('提交窗口', 'Commit window', 'Janela de commit')}: 2026-04-02 10:00~14:35</p>
                    <p className="stat-foot muted">{tr('构建人', 'Builder', 'Responsavel pelo build')}: {envMeta.deployer}</p>
                    <div className="role-actions">
                      <button type="button" className="btn ghost" onClick={() => pushAudit(tr('查看构建日志', 'View build logs', 'Ver logs de build'))}>{tr('构建日志', 'Build logs', 'Logs de build')}</button>
                      <button type="button" className="btn primary" onClick={rollbackRelease}>{tr('一键回滚', 'One-click rollback', 'Rollback com um clique')}</button>
                    </div>
                  </>
                ) : null}
                {moduleId === 'alerts' ? (
                  <>
                    <p className="stat-label">{tr('待处理告警', 'Pending alerts', 'Alertas pendentes')}</p>
                    <p className="stat-value">{alertStats.high + alertStats.medium + alertStats.low}</p>
                    <div className="alert-stack">
                      <span className="alert-tag high">{tr('高优', 'High', 'Alta')} {alertStats.high}</span>
                      <span className="alert-tag medium">{tr('中优', 'Medium', 'Media')} {alertStats.medium}</span>
                      <span className="alert-tag low">{tr('低优', 'Low', 'Baixa')} {alertStats.low}</span>
                    </div>
                    <button type="button" className="btn ghost" onClick={() => setActiveTab('monitor')}>{tr('进入告警中心', 'Open alert center', 'Entrar no centro de alertas')}</button>
                  </>
                ) : null}
                {moduleId === 'resources' ? (
                  <>
                    <p className="stat-label">{tr('环境资源监控', 'Environment resource monitor', 'Monitoramento de recursos do ambiente')}</p>
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
            <h2 className="card-title">{tr('联调入口与运维核心操作', 'Integration entry and core ops actions', 'Entrada de integracao e acoes principais de operacoes')}</h2>
            <div className="role-actions big-actions">
              <Link className="btn ghost" to="/doctor">{tr('打开医生端', 'Open doctor portal', 'Abrir portal medico')}</Link>
              <Link className="btn ghost" to="/patient">{tr('打开患者端', 'Open patient portal', 'Abrir portal do paciente')}</Link>
              <Link className="btn primary" to="/doctor/p/p-001/trends">{tr('快速进入示例患者趋势', 'Quick open sample patient trend', 'Abrir rapidamente tendencia de paciente de exemplo')}</Link>
              <button type="button" className="btn ghost" onClick={() => pushAudit(tr('执行一键重启服务', 'Executed one-click service restart', 'Executada reinicializacao unica de servico'))}>{tr('一键重启服务', 'One-click restart services', 'Reiniciar servicos com um clique')}</button>
              <button type="button" className="btn ghost" onClick={() => pushAudit(tr('执行一键清空缓存', 'Executed one-click cache flush', 'Executada limpeza de cache com um clique'))}>{tr('一键清空缓存', 'One-click clear cache', 'Limpar cache com um clique')}</button>
              <button type="button" className="btn ghost" onClick={() => { setEnvMode((prev) => (prev === 'mock' ? 'real' : 'mock')); pushAudit(tr('切换 Mock/真实环境', 'Switched mock/real environment', 'Alternado ambiente mock/real')) }}>{tr('一键切换 Mock/真实环境', 'Toggle mock/real environment', 'Alternar ambiente mock/real')}</button>
              <button type="button" className="btn ghost" onClick={() => setActiveTab('config')}>{tr('权限审计入口', 'Permission and audit entry', 'Entrada de permissao e auditoria')}</button>
              {canManageUsers ? <button type="button" className="btn ghost" onClick={() => pushAudit(tr('打开用户管理入口', 'Opened user management entry', 'Entrada de gestao de usuarios aberta'))}>{tr('用户管理入口', 'User management entry', 'Entrada de gestao de usuarios')}</button> : null}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === 'monitor' ? (
        <>
          <section className="card">
            <div className="section-head">
              <h2 className="card-title">{tr('核心服务状态（实时）', 'Core service status (real-time)', 'Status dos servicos principais (tempo real)')}</h2>
              <span className="small muted">{tr('采样周期 2.8 秒', 'Sampling every 2.8 seconds', 'Amostragem a cada 2,8 segundos')}</span>
            </div>
            <div className="task-list">
              {services.map((service) => (
                <article key={service.id} className="service-row">
                  <div>
                    <p className="task-title">{service.name}</p>
                    <p className="muted small">{tr('延迟', 'Latency', 'Latencia')} {service.latency}ms · {tr('错误率', 'Error rate', 'Taxa de erro')} {service.errorRate}% · QPS {service.qps}</p>
                  </div>
                  <div className={`service-state ${classByServiceStatus(service.status)}`}>
                    {service.status === 'healthy' ? tr('正常', 'Healthy', 'Saudavel') : service.status === 'warning' ? tr('预警', 'Warning', 'Alerta') : tr('故障', 'Critical', 'Critico')}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="portal-two-col premium-grid">
            <section className="card">
              <h2 className="card-title">{tr('依赖服务状态', 'Dependency service status', 'Status dos servicos dependentes')}</h2>
              <ul className="simple-list">
                <li>{tr('数据库 PostgreSQL：连接池 72%，复制延迟 38ms', 'PostgreSQL: connection pool 72%, replication lag 38ms', 'PostgreSQL: pool de conexoes 72%, atraso de replicacao 38ms')}</li>
                <li>{tr('缓存 Redis：命中率 94%，主从同步正常', 'Redis: hit rate 94%, primary-replica sync normal', 'Redis: taxa de acerto 94%, sincronizacao primario-replica normal')}</li>
                <li>{tr('消息队列 Kafka：消费堆积 0，吞吐正常', 'Kafka: consumer backlog 0, throughput normal', 'Kafka: atraso de consumo 0, throughput normal')}</li>
              </ul>
            </section>
            <section className="card">
              <h2 className="card-title">{tr('日志中心入口', 'Log center entry', 'Entrada do centro de logs')}</h2>
              <p className="muted">{tr('按服务、时间、关键词检索日志，支持错误堆栈快速定位。', 'Search logs by service/time/keyword with quick stack-trace diagnosis.', 'Pesquise logs por servico/tempo/palavra-chave com diagnostico rapido de stack trace.')}</p>
              <div className="role-actions">
                <button type="button" className="btn primary" onClick={() => pushAudit(tr('跳转日志检索中心', 'Opened log search center', 'Centro de busca de logs aberto'))}>{tr('进入日志检索', 'Open log search', 'Abrir busca de logs')}</button>
                <button type="button" className="btn ghost" onClick={() => pushAudit(tr('打开告警规则配置', 'Opened alert rule settings', 'Configuracao de regras de alerta aberta'))}>{tr('告警规则配置', 'Alert rule settings', 'Configuracao de regras de alerta')}</button>
              </div>
            </section>
          </section>

          <section className="card">
            <h2 className="card-title">{tr('服务拓扑图', 'Service topology', 'Topologia de servicos')}</h2>
            <div className="topology">
              {topology.map((node) => {
                const broken = node.id === 'gateway' && services.some((s) => s.status === 'critical')
                return <div key={node.id} className={`topology-node ${broken ? 'bad' : ''}`}>{node.label}</div>
              })}
            </div>
            <p className="muted small">{tr('依赖关系：', 'Dependencies: ', 'Dependencias: ')}{topologyEdges.map((edge) => `${edge[0]}→${edge[1]}`).join(locale === 'zh-CN' ? '，' : ', ')}</p>
          </section>
        </>
      ) : null}

      {activeTab === 'release' ? (
        <>
          <section className="card">
            <div className="section-head">
              <h2 className="card-title">{tr('发布前检查清单（可执行）', 'Pre-release checklist (executable)', 'Checklist pre-release (executavel)')}</h2>
              <span className="small muted">{tr('通过', 'Passed', 'Aprovado')} {passCount} / {tr('失败', 'Failed', 'Falhou')} {failCount}</span>
            </div>
            <div className="task-list">
              {checks.map((item) => (
                <article key={item.id} className={`task-row precheck-row ${item.status === 'fail' ? 'fail' : ''}`}>
                  <div className="task-main">
                    <p className="task-title">{item.title}</p>
                    <p className="muted small">{item.detail}</p>
                    {item.status === 'fail' ? <p className="small fix-tip">{tr('修复建议：', 'Fix recommendation: ', 'Recomendacao de correcao: ')}{item.fix}</p> : null}
                  </div>
                  <div className="role-actions">
                    <button type="button" className="btn ghost" disabled={item.status === 'running'} onClick={() => runCheck(item.id)}>{tr('一键执行', 'Run now', 'Executar agora')}</button>
                    <span className={`check-state ${item.status}`}>
                      {item.status === 'idle' ? tr('待执行', 'Pending', 'Pendente') : item.status === 'running' ? tr('执行中', 'Running', 'Executando') : item.status === 'pass' ? tr('通过', 'Passed', 'Aprovado') : tr('失败', 'Failed', 'Falhou')}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="portal-two-col premium-grid">
            <section className="card">
              <h2 className="card-title">{tr('发布流水线', 'Release pipeline', 'Pipeline de release')}</h2>
              <div className="pipeline">
                {[tr('代码提交', 'Commit', 'Commit'), tr('构建', 'Build', 'Build'), tr('测试', 'Test', 'Teste'), tr('灰度', 'Canary', 'Canario'), tr('发布', 'Release', 'Release')].map((stage, idx) => (
                  <div key={stage} className={`pipeline-node ${idx <= pipelineStage ? 'active' : ''}`}>{stage}</div>
                ))}
              </div>
              <div className="role-actions">
                <button type="button" className="btn primary" onClick={triggerRelease}>{tr('触发发布', 'Trigger release', 'Disparar release')}</button>
                <button type="button" className="btn ghost" onClick={rollbackRelease}>{tr('回滚发布', 'Rollback release', 'Rollback de release')}</button>
              </div>
            </section>
            <section className="card">
              <h2 className="card-title">{tr('灰度发布管理', 'Canary release management', 'Gestao de release canario')}</h2>
              <p className="muted small">{tr('用户分组：康复中心 A 组 / 专家门诊组 / 内测账号组', 'User groups: Rehab Center Group A / Specialist Clinic / Internal Test Accounts', 'Grupos de usuarios: Centro de Reabilitacao A / Clinica Especialista / Contas de Teste Interno')}</p>
              <label htmlFor="grayRange">{tr('灰度比例', 'Canary percentage', 'Percentual canario')}: {grayPercent}%</label>
              <input id="grayRange" type="range" min={1} max={100} value={grayPercent} onChange={(event) => setGrayPercent(Number(event.target.value))} />
              <div className="role-actions">
                <button type="button" className="btn ghost" onClick={() => pushAudit(tr(`调整灰度比例到 ${grayPercent}%`, `Adjusted canary percentage to ${grayPercent}%`, `Percentual canario ajustado para ${grayPercent}%`))}>{tr('应用比例', 'Apply percentage', 'Aplicar percentual')}</button>
                <button type="button" className="btn ghost" onClick={() => pushAudit(tr('暂停灰度发布', 'Paused canary release', 'Release canario pausado'))}>{tr('暂停灰度', 'Pause canary', 'Pausar canario')}</button>
                <button type="button" className="btn ghost" onClick={() => pushAudit(tr('终止灰度发布', 'Terminated canary release', 'Release canario encerrado'))}>{tr('终止灰度', 'Terminate canary', 'Encerrar canario')}</button>
              </div>
            </section>
          </section>
        </>
      ) : null}

      {activeTab === 'config' ? (
        <>
          <section className="portal-two-col premium-grid">
            <section className="card">
              <h2 className="card-title">{tr('运行环境配置中心', 'Runtime configuration center', 'Centro de configuracao de execucao')}</h2>
              <div className="config-grid">
                <label htmlFor="apiBase">{tr('API 基地址', 'API base URL', 'URL base da API')}</label>
                <input id="apiBase" value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
                <label htmlFor="modeSwitch">{tr('环境模式', 'Environment mode', 'Modo de ambiente')}</label>
                <select id="modeSwitch" value={envMode} onChange={(event) => setEnvMode(event.target.value === 'mock' ? 'mock' : 'real')}>
                  <option value="mock">mock</option>
                  <option value="real">real</option>
                </select>
                <label htmlFor="buildProfile">{tr('构建配置', 'Build profile', 'Perfil de build')}</label>
                <input id="buildProfile" value={buildProfile} onChange={(event) => setBuildProfile(event.target.value)} />
              </div>
              <div className="role-actions">
                <button type="button" className="btn primary" onClick={saveConfig}>{tr('保存配置（含二次确认）', 'Save configuration (with confirmation)', 'Salvar configuracao (com confirmacao)')}</button>
              </div>
            </section>
            <section className="card">
              <h2 className="card-title">{tr('配置历史版本回溯', 'Config history rollback', 'Rollback do historico de configuracao')}</h2>
              <div className="task-list">
                {configHistory.map((history) => (
                  <article key={history.id} className="task-row">
                    <div className="task-main">
                      <p className="task-title">{history.id}</p>
                      <p className="small muted">{history.at}</p>
                      <p className="small muted">{history.apiBase} / {history.mode} / {history.buildProfile}</p>
                    </div>
                    <button type="button" className="btn ghost" onClick={() => rollbackConfig(history)}>{tr('回溯', 'Rollback', 'Reverter')}</button>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="portal-two-col premium-grid">
            <section className="card">
              <h2 className="card-title">{tr('操作审计日志', 'Operation audit logs', 'Logs de auditoria operacional')}</h2>
              <div className="audit-list">
                {auditLogs.map((log) => <p key={log}>{log}</p>)}
              </div>
              <div className="role-actions">
                <button type="button" className="btn ghost" onClick={() => pushAudit(tr('导出审计报告', 'Exported audit report', 'Relatorio de auditoria exportado'))}>{tr('导出审计报告', 'Export audit report', 'Exportar relatorio de auditoria')}</button>
              </div>
            </section>
            <section className="card">
              <h2 className="card-title">{tr('权限与通知策略', 'Permissions and notification policy', 'Permissoes e politica de notificacao')}</h2>
              <ul className="simple-list">
                <li>{tr('超级管理员：全量权限（发布、回滚、权限变更、审计导出）', 'Super Admin: full permissions (release, rollback, permission changes, audit export)', 'Super Admin: permissoes completas (release, rollback, mudanca de permissoes, exportacao de auditoria)')}</li>
                <li>{tr('运维人员：监控、告警、发布执行、服务操作', 'Operator: monitoring, alerts, release execution, service operations', 'Operador: monitoramento, alertas, execucao de release e operacoes de servico')}</li>
                <li>{tr('开发人员：日志查询、预检执行、联调操作', 'Developer: log queries, precheck execution, integration operations', 'Desenvolvedor: consulta de logs, execucao de pre-check e operacoes de integracao')}</li>
              </ul>
              <p className="muted small">{tr('通知方式：邮件 / 短信 / 企业微信（支持升级策略与值班轮转）。', 'Notification channels: email / SMS / WeCom (supports escalation and on-call rotation).', 'Canais de notificacao: e-mail / SMS / WeCom (suporta escalonamento e rotacao de plantao).')}</p>
              {!canCriticalAction ? <p className="small fix-tip">{tr('当前角色无权执行关键变更（如生产回滚、权限变更）。', 'Current role is not allowed to perform critical changes (e.g., production rollback, permission changes).', 'O papel atual nao tem permissao para alteracoes criticas (ex.: rollback em producao, mudanca de permissoes).')}</p> : null}
            </section>
          </section>
        </>
      ) : null}
    </div>
  )
}
