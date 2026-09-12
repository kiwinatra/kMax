/*
* @author: potemk.in
* @brief: Russian locale dictionary.
* @desc: Fully typed against Locale. Contains every key used by the UI.
*/

import type { Locale } from '../types';

export const ru: Locale = {
    // ===== HEADERS =====
    settingsTitle: 'Настройки kMax Mod',
    settingsSubtitle: 'Управление дополнительными функциями',

    // ===== SECTIONS =====
    sectionGeneral: 'Основные',
    sectionSecurity: 'Безопасность',
    sectionAppearance: 'Внешний вид',
    sectionMedia: 'Медиа',
    sectionOther: 'Другое',
    sectionLanguage: 'Язык',
    sectionAbout: 'О моде',
    sectionChats: 'Чаты',

    // ===== SECTION DESCRIPTIONS =====
    sectionGeneralDesc: 'Настройки интерфейса и отображения',
    sectionSecurityDesc: 'Защита приватности и конфиденциальности',
    sectionAppearanceDesc: 'Кастомизация визуального стиля',
    sectionMediaDesc: 'Настройки для фото и контента',
    sectionOtherDesc: 'Дополнительные функции',
    sectionLanguageDesc: 'Выбор языка интерфейса',
    sectionAboutDesc: 'Информация о версии и разработчиках',
    sectionChatsDesc: 'Управление тегами и шаблонами для чатов',

    // ===== GENERAL =====
    hideStoriesLabel: 'Скрыть сторис',
    hideStoriesDesc: 'Скрывает блок со сторис в ленте сообщений',

    hideSferumLabel: 'Скрыть кнопку Сферума',
    hideSferumDesc: 'Убирает кнопку "Войти в Сферум" из интерфейса',

    // ===== SECURITY =====
    blockAnalyticsLabel: 'Блокировка аналитики',
    blockAnalyticsDesc: 'Подменяет идентификаторы трекера на фейковые, защищая вашу приватность',

    hidePhoneLabel: 'Скрыть номер телефона',
    hidePhoneDesc: 'Скрывает ваш номер телефона в профиле',

    // ===== APPEARANCE =====
    showCrownLabel: 'Корона бета-тестерам',
    showCrownDesc: 'Выделяет имена бета-тестеров золотым цветом и добавляет 👑',

    replaceTitleLabel: 'kMax в заголовке',
    replaceTitleDesc: 'Добавляет префикс "kMax | " в заголовок страницы',

    fontFamilyLabel: 'Шрифт',
    fontFamilyDesc: 'Выберите шрифт для всего сайта',

    // ===== MEDIA =====
    showMetadataLabel: 'Metadata для фото',
    showMetadataDesc: 'Добавляет кнопку с информацией о размере, формате и дате загрузки фото',

    // ===== OTHER =====
    replaceMaxLabel: 'Замена Max → MAX',
    replaceMaxDesc: 'Заменяет все упоминания "Max" на "MAX" в тексте страницы',

    logViewLabel: '📡 Логирование всего',
    logViewDesc: 'Показывает все логи, события, запросы и ошибки в реальном времени',

    // ===== CHATS =====
    chatTagsLabel: 'Теги для чатов',
    chatTagsDesc: 'Добавляйте цветные теги к чатам для удобной организации',

    templatesLabel: 'Шаблоны ответов',
    templatesDesc: 'Быстрые ответы через /команда в поле ввода',

    // ===== LANGUAGE =====
    languageLabel: 'Язык интерфейса',
    languageRu: 'Русский',
    languageEn: 'English',

    // ===== ABOUT =====
    aboutName: 'kMax Mod',
    aboutVersion: 'Версия',
    aboutAuthor: 'Автор',
    aboutDescription: 'Мод для max.ru с дополнительными функциями для удобства и кастомизации.',

    // ===== BUTTONS =====
    saveButton: 'Сохранить',
    resetButton: 'Сбросить все',
    resetConfirm: 'Вы уверены, что хотите сбросить все настройки?',
    closeButton: 'Закрыть',

    // ===== STATUSES =====
    statusActive: 'Активно',
    statusEnabled: 'Вкл',
    statusDisabled: 'Выкл',

    // ===== UI =====
    toggleOn: 'Вкл',
    toggleOff: 'Выкл',
    backToSettings: '← Назад к настройкам',

    // ===== FONT LABELS (SYSTEM) =====
    fontFamilySystemUI: 'Системный',
    fontFamilyArial: 'Arial',
    fontFamilyArialBlack: 'Arial Black',
    fontFamilyGeorgia: 'Georgia',
    fontFamilyTimesNewRoman: 'Times New Roman',
    fontFamilyCourierNew: 'Courier New',
    fontFamilyVerdana: 'Verdana',
    fontFamilyTahoma: 'Tahoma',
    fontFamilyTrebuchetMS: 'Trebuchet MS',
    fontFamilyImpact: 'Impact',
    fontFamilyComicSansMS: 'Comic Sans MS',
    fontFamilyLucidaSans: 'Lucida Sans',
    fontFamilyGeneva: 'Geneva',
    fontFamilyPalatino: 'Palatino',
    fontFamilyBookman: 'Bookman',
    fontFamilyGaramond: 'Garamond',
    fontFamilyHelvetica: 'Helvetica',
    fontFamilyFranklinGothic: 'Franklin Gothic',
    fontFamilyCenturyGothic: 'Century Gothic',
    fontFamilyCopperplate: 'Copperplate',
    fontFamilyBaskerville: 'Baskerville',

    // ===== FONT LABELS (GOOGLE) =====
    fontFamilyInter: 'Inter',
    fontFamilyRoboto: 'Roboto',
    fontFamilyOpenSans: 'Open Sans',
    fontFamilyMontserrat: 'Montserrat',
    fontFamilyOswald: 'Oswald',
    fontFamilyRaleway: 'Raleway',
    fontFamilyLato: 'Lato',
    fontFamilyPlayfairDisplay: 'Playfair Display',
    fontFamilyMerriweather: 'Merriweather',
    fontFamilyUbuntu: 'Ubuntu',
    fontFamilyNunito: 'Nunito',
    fontFamilyPoppins: 'Poppins',
    fontFamilyQuicksand: 'Quicksand',
    fontFamilyFiraSans: 'Fira Sans',
    fontFamilySourceSansPro: 'Source Sans Pro',
    fontFamilyPTSans: 'PT Sans',
    fontFamilyIBMPlexSans: 'IBM Plex Sans',
    fontFamilyManrope: 'Manrope',
    fontFamilyJetBrainsMono: 'JetBrains Mono',
    fontFamilyCaveat: 'Caveat',
    fontFamilyMarckScript: 'Marck Script',
};