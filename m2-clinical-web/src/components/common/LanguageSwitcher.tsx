import type { Locale } from '../../i18n/I18nContext'
import { useI18n } from '../../i18n/I18nContext'

const options: { value: Locale; label: string }[] = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'pt-BR', label: 'Português' },
]

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  return (
    <label className="lang-switch small">
      <span className="muted">{t('language')}</span>
      <select
        className="patient-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {options.map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    </label>
  )
}
