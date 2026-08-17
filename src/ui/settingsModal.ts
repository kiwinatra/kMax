// src/ui/settingsModal.ts
import { createElement, qs, qsa } from '../core/dom';
import { storage } from '../core/storage';
import { logger } from '../core/logger';
import { CONFIG } from '../config';
import { getLocale, setLocale, getCurrentLocale } from '../locales';
import { FEATURES, getFeaturesBySection, toggleFeature, isFeatureEnabled } from '../registry';
import { createSettingsIcon } from './icons';

const modalStyles = `
    @keyframes kmodSlideIn {
        from { opacity: 0; transform: translateY(-20px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes kmodFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    .kmod-modal-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        animation: kmodFadeIn 0.2s ease;
    }
    .kmod-modal-content {
        background: #18181f;
        border-radius: 20px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
        width: 90%;
        max-width: 500px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        animation: kmodSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #e4e4e7;
    }
    .kmod-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px 14px;
        border-bottom: 1px solid #2a2a33;
        flex-shrink: 0;
    }
    .kmod-modal-title {
        font-size: 20px;
        font-weight: 700;
        color: #f0f0f0;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        letter-spacing: -0.3px;
    }
    .kmod-modal-title svg {
        color: #6b8cff;
    }
    .kmod-modal-close {
        background: none;
        border: none;
        font-size: 22px;
        color: #666;
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 8px;
        transition: all 0.2s;
        line-height: 1;
    }
    .kmod-modal-close:hover {
        background: #2a2a33;
        color: #eee;
    }
    .kmod-modal-body {
        padding: 16px 24px 20px;
        overflow-y: auto;
        flex: 1;
    }
    .kmod-modal-body::-webkit-scrollbar {
        width: 4px;
    }
    .kmod-modal-body::-webkit-scrollbar-track {
        background: transparent;
    }
    .kmod-modal-body::-webkit-scrollbar-thumb {
        background: #3a3a44;
        border-radius: 2px;
    }

    .kmod-section {
        margin-bottom: 24px;
    }
    .kmod-section:last-child {
        margin-bottom: 0;
    }
    .kmod-section-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #888;
        margin: 0 0 12px 0;
        border-bottom: 1px solid #2a2a33;
        padding-bottom: 6px;
    }
    .kmod-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #25252e;
    }
    .kmod-option:last-child {
        border-bottom: none;
    }
    .kmod-option-label {
        font-size: 15px;
        color: #ddd;
        font-weight: 450;
        user-select: none;
    }

    /* Toggle Switch (тёмный) */
    .kmod-switch {
        position: relative;
        width: 44px;
        height: 26px;
        background: #3a3a44;
        border-radius: 13px;
        cursor: pointer;
        transition: background 0.25s;
        flex-shrink: 0;
        border: none;
        padding: 0;
        outline: none;
    }
    .kmod-switch.active {
        background: #6b8cff;
    }
    .kmod-switch::after {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 20px;
        height: 20px;
        background: #f0f0f0;
        border-radius: 50%;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .kmod-switch.active::after {
        transform: translateX(18px);
        background: #fff;
    }

    /* Language selector */
    .kmod-language-selector {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 0 8px;
        border-top: 1px solid #2a2a33;
        margin-top: 8px;
    }
    .kmod-language-selector label {
        font-size: 15px;
        color: #ddd;
        font-weight: 450;
    }
    .kmod-language-selector select {
        background: #25252e;
        border: 1px solid #33333d;
        border-radius: 10px;
        padding: 8px 16px 8px 14px;
        font-size: 14px;
        font-weight: 500;
        color: #eee;
        cursor: pointer;
        outline: none;
        transition: border 0.2s, background 0.2s;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
    }
    .kmod-language-selector select:focus {
        border-color: #6b8cff;
        background-color: #2a2a33;
    }
    .kmod-language-selector select option {
        background: #18181f;
        color: #eee;
    }

    /* About block */
    .kmod-about {
        background: #1f1f28;
        border-radius: 12px;
        padding: 16px 18px;
        margin-top: 12px;
        border: 1px solid #2a2a33;
        font-size: 14px;
        color: #aaa;
        line-height: 1.7;
    }
    .kmod-about strong {
        color: #f0f0f0;
        font-weight: 600;
    }
    .kmod-about .version {
        color: #6b8cff;
        font-size: 13px;
        font-weight: 500;
    }
    .kmod-about .author {
        color: #777;
        font-size: 13px;
    }

    .kmod-footer {
        padding: 12px 24px;
        border-top: 1px solid #2a2a33;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 12px;
        background: #14141a;
        flex-shrink: 0;
    }
    .kmod-status {
        font-size: 13px;
        color: #6b8cff;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        letter-spacing: 0.3px;
    }
    .kmod-status::before {
        content: '●';
        font-size: 12px;
        color: #4ade80;
    }
`;

// ---- Хранилище ссылок на динамические элементы ----
interface ModalElements {
    title: HTMLElement;
    sectionTitles: Map<string, HTMLElement>; // sectionKey -> заголовок
    options: Map<string, { label: HTMLElement; switch: HTMLButtonElement }>;
    langLabel: HTMLElement;
    langSelect: HTMLSelectElement;
    aboutBlock: HTMLElement;
    status: HTMLElement;
}

let modalElements: ModalElements | null = null;
let currentOverlay: HTMLDivElement | null = null;

// ---- Стили ----
function getOrCreateStyles(): void {
    if (!document.querySelector('#kmod-modal-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'kmod-modal-styles';
        styleEl.textContent = modalStyles;
        document.head.appendChild(styleEl);
    }
}

// ---- Создание переключателя ----
function createSwitch(isActive: boolean, onChange: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `kmod-switch${isActive ? ' active' : ''}`;
    btn.type = 'button';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', String(isActive));
    btn.addEventListener('click', onChange);
    return btn;
}

// ---- Обновление состояния одного переключателя ----
function updateOptionState(optionKey: string): void {
    const enabled = isFeatureEnabled(optionKey);
    const opt = modalElements?.options.get(optionKey);
    if (opt) {
        opt.switch.className = `kmod-switch${enabled ? ' active' : ''}`;
        opt.switch.setAttribute('aria-checked', String(enabled));
    }
}

// ---- Обновление всех текстов (при смене языка) ----
function updateAllTexts(): void {
    if (!modalElements) return;

    const el = modalElements;

    el.title.textContent = getLocale('settingsTitle');

    const generalTitle = el.sectionTitles.get('general');
    const appearanceTitle = el.sectionTitles.get('appearance');
    if (generalTitle) generalTitle.textContent = getLocale('settingsGeneral');
    if (appearanceTitle) appearanceTitle.textContent = getLocale('settingsAppearance');

    // Опции
    for (const [key, opt] of el.options) {
        const feature = FEATURES[key];
        if (feature) {
            opt.label.textContent = getLocale(feature.label as any);
        }
    }

    // Язык
    el.langLabel.textContent = getLocale('languageLabel');
    const ruOpt = el.langSelect.querySelector('option[value="ru"]') as HTMLOptionElement | null;
    const enOpt = el.langSelect.querySelector('option[value="en"]') as HTMLOptionElement | null;
    if (ruOpt) ruOpt.textContent = getLocale('languageRu');
    if (enOpt) enOpt.textContent = getLocale('languageEn');

    // About
    el.aboutBlock.innerHTML = `
        <strong>${CONFIG.name}</strong><br>
        <span class="version">v${CONFIG.version}</span><br>
        <span class="author">${CONFIG.author}</span>
    `;

    el.status.textContent = 'Active';
}

// ---- Основная функция отрисовки/обновления модалки ----
export function createSettingsModal(): void {
    // Если модалка уже есть — обновляем и показываем
    if (currentOverlay) {
        currentOverlay.style.display = 'flex';
        updateAllTexts();
        // Обновляем состояния чекбоксов
        for (const key of Object.keys(FEATURES)) {
            updateOptionState(key);
        }
        // Обновляем выбранный язык
        if (modalElements) {
            modalElements.langSelect.value = getCurrentLocale();
        }
        return;
    }

    getOrCreateStyles();

    const overlay = document.createElement('div');
    overlay.className = 'kmod-modal-overlay';
    currentOverlay = overlay;

    const content = document.createElement('div');
    content.className = 'kmod-modal-content';

    // ---- HEADER ----
    const header = document.createElement('div');
    header.className = 'kmod-modal-header';

    const title = document.createElement('h2');
    title.className = 'kmod-modal-title';

    const icon = createSettingsIcon();
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.color = '#6b8cff';
    title.appendChild(icon);

    const titleText = document.createTextNode(' ' + getLocale('settingsTitle'));
    title.appendChild(titleText);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kmod-modal-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => {
        if (currentOverlay) {
            currentOverlay.style.display = 'none';
        }
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // ---- BODY ----
    const body = document.createElement('div');
    body.className = 'kmod-modal-body';

    // Секции
    const generalSection = createSectionElement(getLocale('settingsGeneral'), 'general');
    const appearanceSection = createSectionElement(getLocale('settingsAppearance'), 'appearance');

    const optionsMap = new Map();

    // General
    const generalFeatures = getFeaturesBySection('general');
    for (const [key, feature] of generalFeatures) {
        const enabled = isFeatureEnabled(key);
        const opt = createOptionElement(
            getLocale(feature.label as any),
            enabled,
            () => {
                toggleFeature(key);
                updateOptionState(key);
            }
        );
        generalSection.appendChild(opt);
        optionsMap.set(key, { label: opt.querySelector('.kmod-option-label') as HTMLElement, switch: opt.querySelector('.kmod-switch') as HTMLButtonElement });
    }

    // Appearance
    const appearanceFeatures = getFeaturesBySection('appearance');
    for (const [key, feature] of appearanceFeatures) {
        const enabled = isFeatureEnabled(key);
        const opt = createOptionElement(
            getLocale(feature.label as any),
            enabled,
            () => {
                toggleFeature(key);
                updateOptionState(key);
            }
        );
        appearanceSection.appendChild(opt);
        optionsMap.set(key, { label: opt.querySelector('.kmod-option-label') as HTMLElement, switch: opt.querySelector('.kmod-switch') as HTMLButtonElement });
    }

    body.appendChild(generalSection);
    body.appendChild(appearanceSection);

    // ---- Language selector ----
    const langSelector = document.createElement('div');
    langSelector.className = 'kmod-language-selector';

    const langLabel = document.createElement('label');
    langLabel.textContent = getLocale('languageLabel');
    langSelector.appendChild(langLabel);

    const select = document.createElement('select');
    const ruOption = document.createElement('option');
    ruOption.value = 'ru';
    ruOption.textContent = getLocale('languageRu');
    select.appendChild(ruOption);

    const enOption = document.createElement('option');
    enOption.value = 'en';
    enOption.textContent = getLocale('languageEn');
    select.appendChild(enOption);

    const currentLang = getCurrentLocale();
    select.value = currentLang;

    select.addEventListener('change', () => {
        const lang = select.value as 'ru' | 'en';
        setLocale(lang);
        updateAllTexts();
        // Обновляем состояния опций (на случай, если label изменился)
        for (const key of Object.keys(FEATURES)) {
            updateOptionState(key);
        }
        logger.info(`Language changed to: ${lang}`);
    });

    langSelector.appendChild(select);

    body.appendChild(langSelector);

    // ---- About ----
    const aboutBlock = document.createElement('div');
    aboutBlock.className = 'kmod-about';
    aboutBlock.innerHTML = `
        <strong>${CONFIG.name}</strong><br>
        <span class="version">v${CONFIG.version}</span><br>
        <span class="author">${CONFIG.author}</span>
    `;
    body.appendChild(aboutBlock);

    // ---- FOOTER ----
    const footer = document.createElement('div');
    footer.className = 'kmod-footer';

    const status = document.createElement('span');
    status.className = 'kmod-status';
    status.textContent = 'Active';
    footer.appendChild(status);

    // ---- Сборка ----
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    overlay.appendChild(content);

    // ---- Сохраняем ссылки ----
    modalElements = {
        title: title,
        sectionTitles: new Map([
            ['general', generalSection.querySelector('.kmod-section-title') as HTMLElement],
            ['appearance', appearanceSection.querySelector('.kmod-section-title') as HTMLElement],
        ]),
        options: optionsMap,
        langLabel: langLabel,
        langSelect: select,
        aboutBlock: aboutBlock,
        status: status,
    };

    // ---- Закрытие по клику на оверлей ----
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });

    // ---- Закрытие по Escape ----
    const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && currentOverlay && currentOverlay.style.display !== 'none') {
            currentOverlay.style.display = 'none';
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    logger.info('Settings modal opened');
}

// ---- Вспомогательные функции ----
function createSectionElement(title: string, key: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'kmod-section';
    section.dataset.section = key;

    const heading = document.createElement('h3');
    heading.className = 'kmod-section-title';
    heading.textContent = title;
    section.appendChild(heading);

    return section;
}

function createOptionElement(label: string, checked: boolean, onChange: () => void): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'kmod-option';

    const labelEl = document.createElement('span');
    labelEl.className = 'kmod-option-label';
    labelEl.textContent = label;

    const switchBtn = createSwitch(checked, onChange);

    wrapper.appendChild(labelEl);
    wrapper.appendChild(switchBtn);

    return wrapper;
}

// ---- Публичный API ----
export function openSettingsModal(): void {
    createSettingsModal();
}

// ---- Если нужно принудительно закрыть ----
export function closeSettingsModal(): void {
    if (currentOverlay) {
        currentOverlay.style.display = 'none';
    }
}