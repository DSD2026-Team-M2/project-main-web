import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useParams } from 'react-router-dom'
import { usePatient } from '../context/PatientContext'
import { getDiseaseType, loadDecision, saveDecision, saveDoctorOrder } from '../services/clinicalBridge'

type Phase = 'IA' | 'IB' | 'II'
type Cobb = 'I' | 'II' | 'III'
type Risk = 'Green' | 'Yellow' | 'Red' | 'Orange'
type WeightBearing = '免负重' | '部分负重' | '完全负重'
type Phenotype = '优质恢复组' | '迟缓恢复组' | '高风险代偿组'

type EventRow = {
  id: string
  at: string
  type: '再次撕裂' | '皮下血肿' | '皮肤感染'
  note: string
}

type DiseaseScale = 'lysholm_ikdc' | 'ases_constant'

const LYSHOLM_ITEMS = [
  { key: 'limp', label: '跛行', max: 5 },
  { key: 'support', label: '支撑', max: 5 },
  { key: 'locking', label: '交锁', max: 15 },
  { key: 'instability', label: '不稳感', max: 25 },
  { key: 'pain', label: '疼痛', max: 25 },
  { key: 'swelling', label: '肿胀', max: 10 },
  { key: 'stairs', label: '上下楼', max: 10 },
  { key: 'squat', label: '下蹲', max: 5 },
] as const

const ASES_ITEMS = [
  { key: 'pain', label: '疼痛评分', max: 50, tip: '0=重度疼痛，50=无痛。' },
  { key: 'adl', label: '日常活动', max: 50, tip: '活动能力越完整，得分越高。' },
] as const

const CONSTANT_ITEMS = [
  { key: 'pain', label: '疼痛', max: 15, tip: '肩痛控制程度。' },
  { key: 'adl', label: '日常活动', max: 20, tip: '穿衣、睡眠、工作活动能力。' },
  { key: 'rom', label: '活动度', max: 40, tip: '屈曲、外展、旋转综合。' },
  { key: 'strength', label: '力量', max: 25, tip: '外展力量，kg 或等效分值。' },
] as const

function calcPhenotype(mmt: number, rom: number): Phenotype {
  if (mmt >= 4 && rom >= 120) return '优质恢复组'
  if (mmt <= 2 || rom <= 90) return '高风险代偿组'
  return '迟缓恢复组'
}

function calcRisk(lysholm: number, ikdc: number, kt: number): Risk {
  if (lysholm >= 85 && ikdc >= 80 && kt <= 3) return 'Green'
  if (lysholm >= 70 && ikdc >= 65 && kt <= 5) return 'Yellow'
  if (lysholm >= 55 && ikdc >= 50 && kt <= 7) return 'Red'
  return 'Orange'
}

function riskText(risk: Risk) {
  if (risk === 'Green') return '低风险'
  if (risk === 'Yellow') return '中风险'
  if (risk === 'Red') return '高风险'
  return '极高风险'
}

function reportText(input: {
  patientId: string
  phase: Phase
  cobb: Cobb
  phenotype: Phenotype
  lysholm: number
  ikdc: number
  tegner: number
  kt: number
  hq: number
  risk: Risk
  wb: WeightBearing
  scarOrder: string
  events: EventRow[]
}) {
  return [
    '《ACL术后康复中期评估报告》',
    `患者编号：${input.patientId}`,
    `术后分期：${input.phase}期，Cobb分级：${input.cobb}`,
    `恢复分型：${input.phenotype}`,
    `Lysholm评分：${input.lysholm}/100`,
    `IKDC评分：${input.ikdc}/100`,
    `Tegner活动等级：${input.tegner}/10`,
    `KT-1000/2000模拟前向位移：${input.kt.toFixed(1)} mm`,
    `H/Q Ratio：${input.hq.toFixed(2)}`,
    `风险分层：${riskText(input.risk)}（${input.risk}）`,
    `保护性负重等级：${input.wb}`,
    `瘢痕管理/粘连松解医嘱：${input.scarOrder || '无'}`,
    '临床并发症记录：',
    ...(input.events.length
      ? input.events.map((e) => `- ${e.at} ${e.type}：${e.note}`)
      : ['- 暂无']),
  ].join('\n')
}

export function DoctorClinicalPage() {
  const { patientId = 'p-001' } = useParams<{ patientId: string }>()
  const { currentPatient } = usePatient()
  const diseaseType = getDiseaseType(currentPatient?.diagnosisShort)
  const scaleType: DiseaseScale = diseaseType === 'acl' ? 'lysholm_ikdc' : 'ases_constant'
  const diseaseTitle = diseaseType === 'acl' ? 'ACL术后' : '肩袖修复术后'

  const initialDecision = loadDecision(patientId)
  const [phase, setPhase] = useState<Phase>((initialDecision?.phase as Phase) || 'IB')
  const [cobb, setCobb] = useState<Cobb>((initialDecision?.cobb as Cobb) || 'II')
  const [mmt, setMmt] = useState(initialDecision?.mmt ?? 3.5)
  const [rom, setRom] = useState(initialDecision?.rom ?? 112)
  const [ikdc, setIkdc] = useState(67)
  const [tegner, setTegner] = useState(4)
  const [ktShift, setKtShift] = useState(4.2)
  const [hqRatio, setHqRatio] = useState(0.61)
  const [weightBearing, setWeightBearing] = useState<WeightBearing>('部分负重')
  const [scarOrder, setScarOrder] = useState('术后瘢痕松解训练每周 3 次，关注胫骨前外侧粘连点。')
  const [missDays, setMissDays] = useState(4)
  const [unfinishedCount, setUnfinishedCount] = useState(7)
  const [vasPoints, setVasPoints] = useState<number[]>([6, 5, 4, 4, 3, 5, 3])
  const [triggerNote, setTriggerNote] = useState('下楼梯后 30 分钟疼痛触发，VAS 峰值 6。')
  const [events, setEvents] = useState<EventRow[]>([
    { id: 'e1', at: '2026-03-28', type: '皮下血肿', note: '术区外侧轻度，48h 缓解。' },
  ])
  const [newEventType, setNewEventType] = useState<EventRow['type']>('再次撕裂')
  const [newEventNote, setNewEventNote] = useState('')
  const [editScale, setEditScale] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [manualLysholm, setManualLysholm] = useState<Record<string, number>>({})
  const [ases, setAses] = useState<Record<string, number>>({ pain: 35, adl: 34 })
  const [constant, setConstant] = useState<Record<string, number>>({
    pain: 10,
    adl: 14,
    rom: 29,
    strength: 18,
  })

  const lysholmItems = useMemo(
    () => ({
      limp: mmt >= 4 ? 5 : 3,
      support: mmt >= 4 ? 5 : 3,
      locking: rom >= 110 ? 12 : 8,
      instability: mmt >= 3.5 ? 18 : 12,
      pain: vasPoints[vasPoints.length - 1] <= 3 ? 20 : 14,
      swelling: rom >= 110 ? 8 : 5,
      stairs: rom >= 105 ? 8 : 4,
      squat: rom >= 120 ? 4 : 2,
    }),
    [mmt, rom, vasPoints],
  )
  const lysholmTotal = useMemo(() => {
    const merged = LYSHOLM_ITEMS.map((item) => manualLysholm[item.key] ?? lysholmItems[item.key])
    return merged.reduce((a, b) => a + b, 0)
  }, [lysholmItems, manualLysholm])
  const asesTotal = useMemo(() => (ases.pain || 0) + (ases.adl || 0), [ases])
  const constantTotal = useMemo(
    () => (constant.pain || 0) + (constant.adl || 0) + (constant.rom || 0) + (constant.strength || 0),
    [constant],
  )
  const phenotype = useMemo(() => calcPhenotype(mmt, rom), [mmt, rom])
  const risk = useMemo(() => calcRisk(lysholmTotal, ikdc, ktShift), [lysholmTotal, ikdc, ktShift])

  const vasOption = useMemo(
    () => ({
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'] },
      yAxis: { type: 'value', min: 0, max: 10 },
      series: [
        {
          type: 'line',
          data: vasPoints,
          smooth: true,
          lineStyle: { color: '#f59e0b', width: 2 },
          markPoint: {
            data: [{ coord: [0, vasPoints[0]], value: '触发点' }],
          },
        },
      ],
    }),
    [vasPoints],
  )

  const adherenceOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['45%', '72%'],
          data: [
            { name: '漏练天数', value: missDays },
            { name: '未完成次数', value: unfinishedCount },
            { name: '有效完成', value: Math.max(1, 30 - missDays - unfinishedCount) },
          ],
        },
      ],
    }),
    [missDays, unfinishedCount],
  )

  const exportReport = () => {
    const content = reportText({
      patientId,
      phase,
      cobb,
      phenotype,
      lysholm: lysholmTotal,
      ikdc,
      tegner,
      kt: ktShift,
      hq: hqRatio,
      risk,
      wb: weightBearing,
      scarOrder,
      events,
    })
    const header = `病种：${diseaseTitle}\n评估体系：${scaleType === 'lysholm_ikdc' ? 'Lysholm/IKDC/Tegner' : 'ASES/Constant-Murley'}\n`
    const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `acl-clinical-report-${patientId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page doctor-clinical-page">
      <header className="page-header">
        <div>
          <h1>{diseaseTitle}临床工作站</h1>
          <p className="muted">临床分期、医疗质控与科研指标统一视图（医生专属）。患者：{patientId}</p>
        </div>
        <button type="button" className="btn primary" onClick={exportReport}>
          导出《术后康复中期评估报告》
        </button>
      </header>

      <section className="card doc-grid-2">
        <article>
          <h2 className="card-title">临床路径与分期管理</h2>
          <div className="doc-field-row">
            <label>术后分期</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value as Phase)}>
              <option value="IA">IA期（炎症期）</option>
              <option value="IB">IB期（纤维化期）</option>
              <option value="II">II期（成熟期）</option>
            </select>
          </div>
          <div className="doc-field-row">
            <label>Cobb 分级</label>
            <select value={cobb} onChange={(e) => setCobb(e.target.value as Cobb)}>
              <option value="I">I级</option>
              <option value="II">II级</option>
              <option value="III">III级</option>
            </select>
          </div>
          <div className="doc-field-row">
            <label>MMT</label>
            <input type="number" step="0.1" value={mmt} onChange={(e) => setMmt(Number(e.target.value))} />
          </div>
          <div className="doc-field-row">
            <label>ROM(°)</label>
            <input type="number" value={rom} onChange={(e) => setRom(Number(e.target.value))} />
          </div>
          <p className="doc-highlight">智能分型：{phenotype}</p>
          <div className="role-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                saveDecision(patientId, {
                  phase,
                  cobb,
                  mmt,
                  rom,
                  updatedAt: new Date().toISOString(),
                })
                setSaveMsg('分期与指标已保存')
                setTimeout(() => setSaveMsg(''), 1800)
              }}
            >
              保存分期与指标
            </button>
            {saveMsg ? <span className="small muted">{saveMsg}</span> : null}
          </div>
        </article>
        <article>
          <h2 className="card-title">风险分层与干预</h2>
          <p className={`risk-chip risk-${risk.toLowerCase()}`}>{riskText(risk)}（{risk}）</p>
          <div className="doc-field-row">
            <label>保护性负重等级</label>
            <select value={weightBearing} onChange={(e) => setWeightBearing(e.target.value as WeightBearing)}>
              <option value="免负重">免负重</option>
              <option value="部分负重">部分负重</option>
              <option value="完全负重">完全负重</option>
            </select>
          </div>
          <div className="doc-field-row">
            <label>瘢痕管理/粘连松解</label>
            <textarea value={scarOrder} onChange={(e) => setScarOrder(e.target.value)} rows={3} />
          </div>
          <p className="muted small">临床建议：{risk === 'Orange' ? '暂停进阶负重并复查影像，优先控制炎症反应。' : '维持当前康复节律，按周复评功能量表。'}</p>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              saveDoctorOrder(patientId, {
                riskLevel: risk,
                weightBearing,
                scarOrder,
                advice:
                  risk === 'Orange'
                    ? '近期高风险，请严格控制负重并在72小时内复诊。'
                    : '继续按当前节律训练，每周复评功能量表。',
                updatedAt: new Date().toISOString(),
              })
              setSaveMsg('医嘱已下发到患者端风险提醒')
              setTimeout(() => setSaveMsg(''), 1800)
            }}
          >
            下发医嘱
          </button>
        </article>
      </section>

      <section className="card">
        <div className="section-head">
          <h2 className="card-title">专业评估体系（{scaleType === 'lysholm_ikdc' ? 'Lysholm / IKDC / Tegner' : 'ASES / Constant-Murley'}）</h2>
          <button type="button" className="btn ghost" onClick={() => setEditScale((x) => !x)}>
            {editScale ? '完成编辑' : '编辑量表'}
          </button>
        </div>
        <div className="doc-grid-3">
          {scaleType === 'lysholm_ikdc' ? (
            <article className="doc-panel">
              <h3>Lysholm 评分：{lysholmTotal}/100</h3>
              <ul className="simple-list">
                {LYSHOLM_ITEMS.map((item) => (
                  <li key={item.key} title={`${item.label}评分标准：见临床量表说明`}>
                    {item.label}：
                    {editScale ? (
                      <input
                        type="number"
                        min={0}
                        max={item.max}
                        value={manualLysholm[item.key] ?? lysholmItems[item.key]}
                        onChange={(e) =>
                          setManualLysholm((prev) => ({ ...prev, [item.key]: Number(e.target.value) }))
                        }
                      />
                    ) : (
                      `${manualLysholm[item.key] ?? lysholmItems[item.key]} / ${item.max}`
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ) : (
            <article className="doc-panel">
              <h3>ASES 总分：{asesTotal}/100</h3>
              <ul className="simple-list">
                {ASES_ITEMS.map((item) => (
                  <li key={item.key} title={item.tip}>
                    {item.label}：
                    {editScale ? (
                      <input
                        type="number"
                        min={0}
                        max={item.max}
                        value={ases[item.key]}
                        onChange={(e) => setAses((p) => ({ ...p, [item.key]: Number(e.target.value) }))}
                      />
                    ) : (
                      `${ases[item.key]} / ${item.max}`
                    )}
                  </li>
                ))}
              </ul>
              <h3>Constant-Murley：{constantTotal}/100</h3>
              <ul className="simple-list">
                {CONSTANT_ITEMS.map((item) => (
                  <li key={item.key} title={item.tip}>
                    {item.label}：
                    {editScale ? (
                      <input
                        type="number"
                        min={0}
                        max={item.max}
                        value={constant[item.key]}
                        onChange={(e) => setConstant((p) => ({ ...p, [item.key]: Number(e.target.value) }))}
                      />
                    ) : (
                      `${constant[item.key]} / ${item.max}`
                    )}
                  </li>
                ))}
              </ul>
            </article>
          )}
          <article className="doc-panel">
            <h3>IKDC & Tegner</h3>
            <div className="doc-field-row">
              <label>IKDC</label>
              <input type="number" value={ikdc} onChange={(e) => setIkdc(Number(e.target.value))} />
            </div>
            <div className="doc-field-row">
              <label>Tegner</label>
              <input type="number" min={1} max={10} value={tegner} onChange={(e) => setTegner(Number(e.target.value))} />
            </div>
          </article>
          <article className="doc-panel">
            <h3>生物力学指标</h3>
            <div className="doc-field-row">
              <label>KT 前向位移(mm)</label>
              <input type="number" step="0.1" value={ktShift} onChange={(e) => setKtShift(Number(e.target.value))} />
            </div>
            <div className="doc-field-row">
              <label>H/Q Ratio</label>
              <input type="number" step="0.01" value={hqRatio} onChange={(e) => setHqRatio(Number(e.target.value))} />
            </div>
            <p className="small muted">参考阈值：H/Q Ratio 正常范围 0.6 - 0.8，当前 {hqRatio.toFixed(2)}（{hqRatio >= 0.6 && hqRatio <= 0.8 ? '达标' : '偏离'}）</p>
          </article>
        </div>
      </section>

      <section className="card doc-grid-2">
        <article>
          <h2 className="card-title">VAS 疼痛评分曲线（医生标注触发点）</h2>
          <ReactECharts option={vasOption} style={{ height: 280 }} />
          <div className="doc-field-row">
            <label>触发点标注</label>
            <input value={triggerNote} onChange={(e) => setTriggerNote(e.target.value)} />
          </div>
          <div className="role-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setVasPoints((prev) => [...prev.slice(1), Math.max(0, Math.min(10, prev[prev.length - 1] - 1))])}
            >
              记录改善趋势
            </button>
          </div>
        </article>
        <article>
          <h2 className="card-title">医疗质控与合规</h2>
          <ReactECharts option={adherenceOption} style={{ height: 280 }} />
          <div className="doc-field-row">
            <label>漏练天数</label>
            <input type="number" value={missDays} onChange={(e) => setMissDays(Number(e.target.value))} />
          </div>
          <div className="doc-field-row">
            <label>未完成训练次数</label>
            <input type="number" value={unfinishedCount} onChange={(e) => setUnfinishedCount(Number(e.target.value))} />
          </div>
        </article>
      </section>

      <section className="card">
        <h2 className="card-title">临床事件记录（并发症）</h2>
        <div className="doc-grid-3">
          <select value={newEventType} onChange={(e) => setNewEventType(e.target.value as EventRow['type'])}>
            <option value="再次撕裂">再次撕裂</option>
            <option value="皮下血肿">皮下血肿</option>
            <option value="皮肤感染">皮肤感染</option>
          </select>
          <input
            placeholder="记录并发症详情"
            value={newEventNote}
            onChange={(e) => setNewEventNote(e.target.value)}
          />
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (!newEventNote.trim()) return
              setEvents((prev) => [
                {
                  id: `e-${Date.now()}`,
                  at: new Date().toISOString().slice(0, 10),
                  type: newEventType,
                  note: newEventNote.trim(),
                },
                ...prev,
              ])
              setNewEventNote('')
            }}
          >
            新增事件
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>日期</th><th>事件</th><th>医学备注</th></tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.at}</td>
                  <td>{e.type}</td>
                  <td>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
