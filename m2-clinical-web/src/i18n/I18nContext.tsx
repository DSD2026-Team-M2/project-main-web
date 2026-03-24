import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { setRuntimeLocale } from './runtime'

export type Locale = 'zh-CN' | 'en' | 'pt-BR'
type Dict = Record<string, string>

const dict: Record<Locale, Dict> = {
  'zh-CN': {
    language: '语言',
    patient: '当前患者',
    patientLoading: '患者列表加载中',
    sideLeft: '左侧',
    sideRight: '右侧',
    navMain: '主导航',
    navTrends: '长期恢复趋势',
    navHistory: '历史与对比',
    navLimb: '3D 肢体重建',
    appTitle: '临床工作站',
    appSubtitle: '康复数据 · 非患者端',
    sidebarFooter: 'REST 对接见',
    shareView: '视图分享',
    copyView: '复制当前视图链接',
    copied: '已复制链接',
    retry: '重试',
    loading: '加载中…',
    trendsDesc: '关键指标随时间变化；实线为实测，虚线为 AI 推断；红点标记异常提示；纵轴事件为手术/评估节点。',
    timeRange: '时间范围',
    week: '周',
    month: '月',
    all: '全部',
    loadingTrends: '正在拉取趋势与事件…',
    trendsFoot: '曲线启用 LTTB 抽样与 dataZoom，适合较长序列；可按需在 ECharts 中开启 progressive 渲染。',
    historyDesc: '按时间列出训练/评估；勾选多条记录对比指标变化，并标注改善或退步。',
    loadingHistory: '正在加载历史会话…',
    metricCompare: '指标对比',
    selectedSummary: '所选记录摘要',
    compareSelectHint: '请至少勾选两条记录进行对比（按时间轴从早到晚排列）。',
    compareSelectedPrefix: '已选',
    compareSelectedSuffix: '个时间点。Δ 为「最早一次有值 → 最晚一次有值」的差值；默认假设数值升高为改善（演示规则，可按指标配置）。',
    colMetric: '指标',
    colDelta: 'Δ（末 − 初）',
    colDirection: '方向',
    dirFlat: '持平',
    dirUp: '改善',
    dirDown: '退步',
    colCompare: '对比',
    colTime: '时间',
    colType: '类型',
    colTitle: '标题',
    colSummary: '摘要',
    typeAssessment: '评估',
    typeTraining: '训练',
    ariaChooseForCompare: '选择 {title} 用于对比',
    limbDesc: 'Three.js 场景：旋转/缩放/平移；颜色表示热力强度，角度为叠加数据（演示）。',
    refreshOverlay: '刷新叠加数据',
    loadingLimb: '加载肢体叠加数据…',
    dataMix: '数据混合说明：',
    updatedAt: '更新时间',
    heat: '热力',
    limbFoot: '切换患者或点击刷新会卸载并重建 Canvas，便于释放 GPU 资源；生产环境可改为单例 Renderer 并仅更新几何/材质。',
    notesTitle: '临床备注',
    notesDesc: '保存在本机浏览器，便于团队口头交接时对照（非电子病历）。',
    notesPh: '记录干预要点、禁忌、下次关注点…',
    saveNotes: '保存备注',
    saved: '已保存',
    measured: '实测',
    aiInferred: 'AI 推断',
    anomaly: '异常',
    anomalyTip: '异常提示',
    trendMeasured: '实测',
    trendAi: 'AI 推断',
    limbProximal: '近端',
    limbDistal: '远端',
    kneeFlexion: '膝屈曲角（示意）',
    limbHint: '拖拽旋转 · 滚轮缩放 · 右键平移。卸载页面或切换患者时将释放 WebGL 上下文。',
    pageTitle: 'M2 临床工作站',
  },
  en: {
    language: 'Language', patient: 'Current patient', patientLoading: 'Loading patients',
    sideLeft: 'left', sideRight: 'right', navMain: 'Main navigation',
    navTrends: 'Long-term trends', navHistory: 'History & comparison', navLimb: '3D limb reconstruction',
    appTitle: 'Clinical Workstation', appSubtitle: 'Rehab data · clinician only', sidebarFooter: 'REST integration at',
    shareView: 'Share view', copyView: 'Copy current view URL', copied: 'Link copied', retry: 'Retry', loading: 'Loading…',
    trendsDesc: 'Key metrics over time; solid line = measured, dashed = AI inferred; red points = anomalies; vertical lines = surgery/assessment events.',
    timeRange: 'Time range', week: 'Week', month: 'Month', all: 'All', loadingTrends: 'Loading trends and events…',
    trendsFoot: 'Curves use LTTB sampling + dataZoom for long sequences; progressive rendering can be enabled when needed.',
    historyDesc: 'List training/assessment records by time; select multiple records to compare and mark improvement or decline.',
    loadingHistory: 'Loading historical sessions…', metricCompare: 'Metric comparison', selectedSummary: 'Selected records summary',
    compareSelectHint: 'Select at least two records to compare (ordered by time).',
    compareSelectedPrefix: 'Selected', compareSelectedSuffix: 'time points. Δ means latest minus earliest available value; demo assumes higher is better.',
    colMetric: 'Metric', colDelta: 'Δ (last - first)', colDirection: 'Direction', dirFlat: 'Flat', dirUp: 'Improved', dirDown: 'Declined',
    colCompare: 'Compare', colTime: 'Time', colType: 'Type', colTitle: 'Title', colSummary: 'Summary', typeAssessment: 'Assessment', typeTraining: 'Training',
    ariaChooseForCompare: 'Select {title} for comparison',
    limbDesc: 'Three.js scene: rotate/zoom/pan; color indicates heat intensity and angles are overlay values (demo).',
    refreshOverlay: 'Refresh overlay data', loadingLimb: 'Loading limb overlay data…', dataMix: 'Data mix:', updatedAt: 'Updated at', heat: 'Heat',
    limbFoot: 'Switching patient or refreshing rebuilds the canvas to help release GPU resources; production can use a singleton renderer.',
    notesTitle: 'Clinical notes', notesDesc: 'Stored in local browser for handoff reference (not legal EMR).', notesPh: 'Intervention notes, precautions, next focus…',
    saveNotes: 'Save notes', saved: 'Saved', measured: 'Measured', aiInferred: 'AI inferred', anomaly: 'Anomaly', anomalyTip: 'Anomaly tip',
    trendMeasured: 'Measured', trendAi: 'AI inferred', limbProximal: 'Proximal', limbDistal: 'Distal', kneeFlexion: 'Knee flexion (demo)',
    limbHint: 'Drag to rotate · wheel to zoom · right click to pan. WebGL context is released when switching/unmounting.',
    pageTitle: 'M2 Clinical Workstation',
  },
  'pt-BR': {
    language: 'Idioma', patient: 'Paciente atual', patientLoading: 'Carregando pacientes',
    sideLeft: 'lado esquerdo', sideRight: 'lado direito', navMain: 'Navegação principal',
    navTrends: 'Tendências de longo prazo', navHistory: 'Histórico e comparação', navLimb: 'Reconstrução 3D do membro',
    appTitle: 'Estação Clínica', appSubtitle: 'Dados de reabilitação · apenas clínicos', sidebarFooter: 'Integração REST em',
    shareView: 'Compartilhar visualização', copyView: 'Copiar link da visualização', copied: 'Link copiado', retry: 'Tentar novamente', loading: 'Carregando…',
    trendsDesc: 'Métricas ao longo do tempo; linha sólida = medido, tracejada = inferido por IA; pontos vermelhos = anomalias; linhas verticais = eventos.',
    timeRange: 'Intervalo', week: 'Semana', month: 'Mês', all: 'Todos', loadingTrends: 'Carregando tendências e eventos…',
    trendsFoot: 'As curvas usam amostragem LTTB + dataZoom para séries longas; renderização progressiva pode ser habilitada quando necessário.',
    historyDesc: 'Lista de sessões por tempo; selecione múltiplos registros para comparar e marcar melhora ou piora.',
    loadingHistory: 'Carregando sessões históricas…', metricCompare: 'Comparação de métricas', selectedSummary: 'Resumo dos registros selecionados',
    compareSelectHint: 'Selecione ao menos dois registros para comparar (ordem temporal).',
    compareSelectedPrefix: 'Selecionados', compareSelectedSuffix: 'pontos no tempo. Δ = último menos primeiro valor disponível; demo assume que maior é melhor.',
    colMetric: 'Métrica', colDelta: 'Δ (último - primeiro)', colDirection: 'Direção', dirFlat: 'Estável', dirUp: 'Melhora', dirDown: 'Piora',
    colCompare: 'Comparar', colTime: 'Hora', colType: 'Tipo', colTitle: 'Título', colSummary: 'Resumo', typeAssessment: 'Avaliação', typeTraining: 'Treino',
    ariaChooseForCompare: 'Selecionar {title} para comparação',
    limbDesc: 'Cena Three.js: rotacionar/zoom/pan; cor indica intensidade térmica e ângulos são sobreposições (demo).',
    refreshOverlay: 'Atualizar sobreposição', loadingLimb: 'Carregando dados de sobreposição…', dataMix: 'Mistura de dados:', updatedAt: 'Atualizado em', heat: 'Calor',
    limbFoot: 'Trocar paciente ou atualizar reconstrói o canvas para liberar GPU; em produção use renderer singleton.',
    notesTitle: 'Anotações clínicas', notesDesc: 'Salvas no navegador local para passagem de caso (não substitui prontuário).', notesPh: 'Intervenções, precauções, próximo foco…',
    saveNotes: 'Salvar anotação', saved: 'Salvo', measured: 'Medido', aiInferred: 'Inferido por IA', anomaly: 'Anomalia', anomalyTip: 'Alerta de anomalia',
    trendMeasured: 'Medido', trendAi: 'Inferido por IA', limbProximal: 'Proximal', limbDistal: 'Distal', kneeFlexion: 'Flexão do joelho (demo)',
    limbHint: 'Arraste para rotacionar · roda para zoom · clique direito para pan. O contexto WebGL é liberado ao trocar/desmontar.',
    pageTitle: 'M2 Estação Clínica',
  },
}

interface Ctx { locale: Locale; setLocale: (x: Locale) => void; t: (key: string) => string }
const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try { return (localStorage.getItem('m2_locale') as Locale) || 'zh-CN' } catch { return 'zh-CN' }
  })

  useEffect(() => {
    setRuntimeLocale(locale)
    document.title = dict[locale].pageTitle
  }, [locale])

  const value = useMemo(() => ({
    locale,
    setLocale: (x: Locale) => { setLocale(x); try { localStorage.setItem('m2_locale', x) } catch { /* ignore */ } },
    t: (key: string) => dict[locale][key] ?? dict['zh-CN'][key] ?? key,
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
