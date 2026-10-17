import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en/common.json'
import ar from '../locales/ar/common.json'

const languageKey = 'happy-inventory-language'
const savedLanguage = window.localStorage.getItem(languageKey)

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: savedLanguage === 'ar' ? 'ar' : 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'ar'],
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (language) => {
  if (language === 'en' || language === 'ar') window.localStorage.setItem(languageKey, language)
})

export default i18n
