import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import es from '../locales/es.json';
import en from '../locales/en.json';
import it from '../locales/it.json';

const LANGUAGE_KEY = '@spendiapp_language';

export const LANGUAGES = [
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'it', label: 'IT', flag: '🇮🇹' },
];

export async function initI18n() {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  const deviceLang = getLocales()[0]?.languageCode ?? 'es';
  const supported = LANGUAGES.map((l) => l.code);
  const lng = saved ?? (supported.includes(deviceLang) ? deviceLang : 'es');

  await i18n.use(initReactI18next).init({
    resources: { es: { translation: es }, en: { translation: en }, it: { translation: it } },
    lng,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  });
}

export async function changeLanguage(code: string) {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
}

export default i18n;
