import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { translations, type SupportedLanguage } from '../i18n/translations'

interface LanguageContextValue {
  language: SupportedLanguage
  t: (key: string) => string
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<SupportedLanguage>('de')

  const value = useMemo<LanguageContextValue>(() => {
    const t = (key: string): string => {
      const segments = key.split('.')
      let current: unknown = translations[language]

      for (const segment of segments) {
        if (typeof current !== 'object' || current === null || !(segment in current)) {
          return key
        }
        current = (current as Record<string, unknown>)[segment]
      }

      return typeof current === 'string' ? current : key
    }

    return {
      language,
      t,
      toggleLanguage: () => setLanguage((prev) => (prev === 'de' ? 'en' : 'de')),
    }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }

  return context
}
