import ReactECharts from 'echarts-for-react'
import { ComparisonPanel } from '../../components/history/ComparisonPanel'
import { HistoryMetricsPreview, HistoryTable } from '../../components/history/HistoryTable'
import { ErrorBanner } from '../../components/common/ErrorBanner'
import { LoadingBlock } from '../../components/common/LoadingBlock'
import { useDoctorHistoryViewModel } from '../../viewmodels/useDoctorHistoryViewModel'

export function DoctorHistoryPageNeo() {
  const vm = useDoctorHistoryViewModel()

  return (
    <div className="neo-page neo-page-history">
      <header className="neo-header">
        <p className="neo-kicker">Timeline Studio</p>
        <h1>{vm.t('navHistory')}</h1>
        <p className="muted">{vm.t('historyDesc')}</p>
      </header>

      {vm.err ? <ErrorBanner message={vm.err} onRetry={() => void vm.reload()} /> : null}
      {vm.loading ? (
        <LoadingBlock label={vm.t('loadingHistory')} />
      ) : (
        <div className="neo-history-grid">
          <section className="card">
            <HistoryTable rows={vm.rows} selectedIds={vm.selected} onToggle={vm.toggle} />
          </section>
          <section className="card">
            <h2 className="card-title">{vm.t('metricCompare')}</h2>
            <ComparisonPanel records={vm.selectedRecords} />
          </section>
          <section className="card">
            <p className="muted small">{vm.t('historyAutoAnalyzePrompt')}</p>
            {vm.selectedRecords.length >= 2 ? (
              <>
                <ReactECharts option={vm.compareOption} style={{ height: 260 }} />
                <p className="small">{vm.compareSummary}</p>
              </>
            ) : null}
          </section>
          {vm.selectedRecords.length ? (
            <section className="card">
              <h2 className="card-title">{vm.t('selectedSummary')}</h2>
              <ul className="selected-records">
                {vm.selectedRecords.map((r) => (
                  <li key={r.id}>
                    <div className="sel-head">
                      <strong>{r.title}</strong>
                      <span className="muted small">{r.t}</span>
                    </div>
                    <HistoryMetricsPreview record={r} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
