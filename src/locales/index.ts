// src/locales/index.ts
import { ru } from './ru';
import { en } from './en';
import { storage } from '../core/storage';

export const locales = {
  ru,
  en,
};

export type LocaleCode = keyof typeof locales;

let currentLocale: LocaleCode = 'ru';
let listeners: (() => void)[] = [];

export function setLocale(locale: LocaleCode): void {
  if (locales[locale]) {
    currentLocale = locale;
    storage.set('language', locale);
    // Уведомляем всех слушателей
    for (const listener of listeners) {
      listener();
    }
  }
}

export function getLocale(key: keyof typeof ru): string {
  const locale = locales[currentLocale];
  if (!locale) {
    return key;
  }
  return locale[key] || key;
}

export function getCurrentLocale(): LocaleCode {
  return currentLocale;
}

export function detectLocale(): LocaleCode {
  const saved = storage.get<'ru' | 'en'>('language');
  if (saved === 'ru' || saved === 'en') {
    return saved;
  }

  const lang = navigator.language || navigator.languages?.[0] || 'ru';

  if (lang.startsWith('ru')) {
    return 'ru';
  }

  return 'en';
}

export function initLocale(): void {
  const detected = detectLocale();
  setLocale(detected);
  console.log('[KMOD] Locale set to:', detected);
}

export function onLocaleChange(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}