import { TrendChart } from '../../components/charts/TrendChart'
import { ErrorBanner } from '../../components/common/ErrorBanner'
import { LoadingBlock } from '../../components/common/LoadingBlock'
import { useDoctorTrendsViewModel } from '../../viewmodels/useDoctorTrendsViewModel'

export function DoctorTrendsPageNeo() {
  const vm = useDoctorTrendsViewModel()

  return (
    <div className="neo-page neo-page-trends">
      <header className="neo-header">
        <div>
          <p className="neo-kicker">Rehab Intelligence</p>
          <h1>{vm.t('navTrends')}</h1>
          <p className="muted">{vm.t('trendsDesc')}</p>
        </div>
      </header>

      <section className="neo-toolbar card">
        <span className="small muted">{vm.t('timeRange')}</span>
        <div className="range-toggle" role="group" aria-label={vm.t('timeRange')}>
          {([['week', vm.t('week')], ['month', vm.t('month')], ['all', vm.t('all')]] as const).map(
            ([k, lab]) => (
              <button
                key={k}
                type="button"
                className={`btn ${vm.range === k ? 'primary' : 'ghost'}`}
                onClick={() => vm.setRange(k)}
              >
                {lab}
              </button>
            ),
          )}
        </div>
      </section>

      {vm.err ? <ErrorBanner message={vm.err} onRetry={() => void vm.reload()} /> : null}
      {vm.loading ? (
        <LoadingBlock label={vm.t('loadingTrends')} />
      ) : (
        <section className="card neo-chart-card">
          <TrendChart seriesList={vm.series} events={vm.events} height={460} />
        </section>
      )}
    </div>
  )
}
