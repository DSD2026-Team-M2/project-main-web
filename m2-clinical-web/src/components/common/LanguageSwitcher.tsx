import type { Locale } from '../../i18n/I18nContext'
import { useI18n } from '../../i18n/I18nContext'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const options: { value: Locale; label: string }[] = [
    { value: 'zh-CN', label: t('langZh') },
    { value: 'en', label: t('langEn') },
    { value: 'pt-BR', label: t('langPt') },
  ]
  return (
    <label className="lang-switch small global-lang-switcher">
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
