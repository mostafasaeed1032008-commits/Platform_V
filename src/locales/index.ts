import en from './en.json';
import ar from './ar.json';

const dictionaries: Record<string, any> = {
  en,
  ar
};

const lang = (((import.meta as any).env || {}).VITE_PLATFORM_LANGUAGE || 'en').toLowerCase();
const dict = dictionaries[lang] || en;

export function t(key: string, replacements?: Record<string, string | number>): string {
  let val = dict[key] || en[key] || key;
  if (replacements) {
    Object.entries(replacements).forEach(([k, v]) => {
      val = val.replace(`{${k}}`, String(v));
    });
  }
  return val;
}

export function getPlatformLanguage(): string {
  return lang;
}

export function getPlatformDirection(): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}
