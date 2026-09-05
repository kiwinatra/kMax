// src/locales/index.ts
import { ru } from './ru';
import { en } from './en';
import { storage } from '../core/storage';
import { logger } from '../core/logger';

export const locales = {
  ru,
  en,
};

export type LocaleCode = keyof typeof locales;
export type LocaleKey = keyof typeof ru;

let currentLocale: LocaleCode = 'ru';
let listeners: (() => void)[] = [];
let translationCache: Partial<Record<LocaleKey, string>> = {};

/**
 * Установка языка
 */
export function setLocale(locale: LocaleCode): void {
  if (!locales[locale]) {
    logger.warn(`Locale "${locale}" not found, fallback to ru`);
    locale = 'ru';
  }
  if (currentLocale === locale) return;
  
  currentLocale = locale;
  translationCache = {}; // Сбрасываем кеш при смене языка
  
  try {
    storage.set('language', locale);
  } catch (error) {
    logger.error('Failed to save language to storage:', error);
  }
  
  // Уведомляем всех слушателей
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      logger.error('Locale listener error:', error);
    }
  }
}

/**
 * Получение перевода по ключу (типобезопасно)
 */
export function getLocale(key: LocaleKey): string {
  // Проверяем кеш
  if (translationCache[key] !== undefined) {
    return translationCache[key] as string;
  }
  
  const localeData = locales[currentLocale];
  if (!localeData) {
    logger.warn(`Locale data for "${currentLocale}" not found`);
    return key;
  }
  
  const value = localeData[key];
  if (value === undefined || value === null) {
    logger.warn(`Translation key "${key}" not found in "${currentLocale}"`);
    return key; // fallback
  }
  
  // Сохраняем в кеш
  translationCache[key] = value;
  return value;
}

/**
 * Получение перевода с параметрами (шаблонизация)
 * Пример: getLocaleWithParams('welcome', { name: 'User' }) => "Hello, User!"
 */
export function getLocaleWithParams(key: LocaleKey, params: Record<string, string>): string {
  let text = getLocale(key);
  for (const [param, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
  }
  return text;
}

/**
 * Получение текущего языка
 */
export function getCurrentLocale(): LocaleCode {
  return currentLocale;
}

/**
 * Определение языка по умолчанию
 */
export function detectLocale(): LocaleCode {
  try {
    const saved = storage.get<'ru' | 'en'>('language');
    if (saved === 'ru' || saved === 'en') {
      return saved;
    }
  } catch (error) {
    logger.debug('Failed to read language from storage:', error);
  }

  // Определяем по браузеру
  try {
    const lang = navigator.language || navigator.languages?.[0] || 'ru';
    if (lang.startsWith('ru')) {
      return 'ru';
    }
    return 'en';
  } catch (error) {
    logger.debug('Failed to detect browser language:', error);
    return 'ru';
  }
}

/**
 * Инициализация локали (вызывается при старте)
 */
export function initLocale(): void {
  const detected = detectLocale();
  setLocale(detected);
  logger.info(`🌐 Locale initialized: ${detected}`);
}

/**
 * Подписка на изменение языка
 * @returns Функция для отписки
 */
export function onLocaleChange(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}

/**
 * Добавление новой локали (для расширения)
 */
export function addLocale(code: LocaleCode, data: Record<LocaleKey, string>): void {
  if (locales[code]) {
    logger.warn(`Locale "${code}" already exists, overwriting`);
  }
  locales[code] = data;
}

/**
 * Получение всех доступных языков
 */
export function getAvailableLocales(): LocaleCode[] {
  return Object.keys(locales) as LocaleCode[];
}

/**
 * Проверка, существует ли локаль
 */
export function hasLocale(code: string): code is LocaleCode {
  return code in locales;
}

/**
 * Принудительное обновление всех слушателей (полезно после добавления новых локалей)
 */
export function refreshLocale(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      logger.error('Locale refresh listener error:', error);
    }
  }
}

// Экспортируем тип для удобства
export type { LocaleCode as Locale };