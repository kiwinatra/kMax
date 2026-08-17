// src/ui/settingsModal.ts
import { createElement, qs, qsa } from '../core/dom';
import { storage } from '../core/storage';
import { logger } from '../core/logger';
import { CONFIG } from '../config';
import { getLocale, setLocale, getCurrentLocale, onLocaleChange } from '../locales';
import { FEATURES, toggleFeature, isFeatureEnabled } from '../registry';
import { createSettingsIcon } from './icons';

// ============================================================
// DISCORD-LIKE ДИЗАЙН — МИНИМАЛИЗМ, ТЕМНОТА, ЧИСТОТА
// ============================================================
const modalStyles = `
  @keyframes kmodFadeScale {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .kmod-settings-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999999;
    animation: kmodFadeScale 0.15s ease;
  }

  .kmod-settings-window {
    background: #313338;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    width: 92%;
    max-width: 740px;
    height: 88vh;
    max-height: 680px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #dbdee1;
  }

  /* ===== HEADER ===== */
  .kmod-settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 20px;
    background: #2b2d31;
    border-bottom: 1px solid #1e1f22;
    flex-shrink: 0;
  }
  .kmod-settings-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #f2f3f5;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    letter-spacing: -0.2px;
  }
  .kmod-settings-header h2 .gear {
    color: #b5bac1;
  }
  .kmod-settings-header h2 .gear svg {
    width: 22px;
    height: 22px;
  }
  .kmod-settings-close {
    background: none;
    border: none;
    color: #b5bac1;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.15s;
    line-height: 1;
  }
  .kmod-settings-close:hover {
    color: #f2f3f5;
    background: #3f4147;
  }

  /* ===== BODY ===== */
  .kmod-settings-body {
    display: flex;
    flex: 1;
    overflow: hidden;
    background: #313338;
  }

  /* ===== SIDEBAR ===== */
  .kmod-settings-sidebar {
    width: 200px;
    min-width: 160px;
    background: #2b2d31;
    padding: 12px 8px;
    overflow-y: auto;
    flex-shrink: 0;
  }
  .kmod-settings-sidebar::-webkit-scrollbar {
    width: 4px;
  }
  .kmod-settings-sidebar::-webkit-scrollbar-thumb {
    background: #1e1f22;
    border-radius: 4px;
  }

  .kmod-sidebar-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    color: #949ba4;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.15s;
  }
  .kmod-sidebar-item:hover {
    color: #dbdee1;
    background: #3f4147;
  }
  .kmod-sidebar-item.active {
    color: #f2f3f5;
    background: #3f4147;
  }
  .kmod-sidebar-item .icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  /* ===== CONTENT ===== */
  .kmod-settings-content {
    flex: 1;
    padding: 20px 24px 16px;
    overflow-y: auto;
    background: #313338;
  }
  .kmod-settings-content::-webkit-scrollbar {
    width: 4px;
  }
  .kmod-settings-content::-webkit-scrollbar-thumb {
    background: #1e1f22;
    border-radius: 4px;
  }

  .kmod-settings-section {
    display: none;
  }
  .kmod-settings-section.active {
    display: block;
  }

  .kmod-settings-section .section-header {
    margin-bottom: 20px;
  }
  .kmod-settings-section .section-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: #f2f3f5;
    margin: 0 0 2px 0;
  }
  .kmod-settings-section .section-header .subtitle {
    font-size: 12px;
    color: #949ba4;
    margin: 0;
    font-weight: 400;
  }

  /* ===== FEATURE ITEMS ===== */
  .kmod-feature-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #2b2d31;
    gap: 16px;
  }
  .kmod-feature-item:last-child {
    border-bottom: none;
  }

  .kmod-feature-item .info {
    flex: 1;
    min-width: 0;
  }
  .kmod-feature-item .info .label {
    font-size: 14px;
    font-weight: 500;
    color: #dbdee1;
  }
  .kmod-feature-item .info .desc {
    font-size: 12px;
    color: #949ba4;
    margin-top: 1px;
    line-height: 1.4;
  }

  .kmod-feature-item .status-badge {
    font-size: 11px;
    font-weight: 600;
    color: #949ba4;
    flex-shrink: 0;
    min-width: 36px;
    text-align: right;
  }
  .kmod-feature-item .status-badge.on {
    color: #3ba55c;
  }
  .kmod-feature-item .status-badge.off {
    color: #ed4245;
  }

  /* ===== TOGGLE ===== */
  .kmod-switch {
    position: relative;
    width: 40px;
    height: 24px;
    background: #4e5058;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
    border: none;
    padding: 0;
    outline: none;
  }
  .kmod-switch.active {
    background: #3ba55c;
  }
  .kmod-switch::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    background: #f2f3f5;
    border-radius: 50%;
    transition: transform 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  .kmod-switch.active::after {
    transform: translateX(16px);
  }
  .kmod-switch:hover {
    filter: brightness(1.1);
  }

  /* ===== LANGUAGE ===== */
  .kmod-language-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #2b2d31;
    gap: 16px;
  }
  .kmod-language-row label {
    font-size: 14px;
    font-weight: 500;
    color: #dbdee1;
  }
  .kmod-language-row select {
    background: #1e1f22;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 14px;
    font-weight: 500;
    color: #dbdee1;
    cursor: pointer;
    outline: none;
    min-width: 120px;
  }
  .kmod-language-row select:focus {
    outline: 1px solid #3ba55c;
  }

  /* ===== ABOUT ===== */
  .kmod-about-content {
    padding: 4px 0;
  }
  .kmod-about-content .name {
    font-size: 18px;
    font-weight: 700;
    color: #f2f3f5;
  }
  .kmod-about-content .version {
    font-size: 13px;
    color: #949ba4;
    margin-top: 2px;
  }
  .kmod-about-content .author {
    font-size: 13px;
    color: #949ba4;
    margin-top: 2px;
  }
  .kmod-about-content .desc {
    font-size: 13px;
    color: #949ba4;
    margin-top: 10px;
    line-height: 1.5;
    max-width: 400px;
  }
  .kmod-about-divider {
    height: 1px;
    background: #2b2d31;
    margin: 10px 0;
  }

  /* ===== FOOTER ===== */
  .kmod-settings-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: #2b2d31;
    border-top: 1px solid #1e1f22;
    flex-shrink: 0;
  }
  .kmod-settings-footer .status {
    font-size: 12px;
    color: #3ba55c;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .kmod-settings-footer .status .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3ba55c;
    display: inline-block;
  }
  .kmod-settings-footer .actions {
    display: flex;
    gap: 8px;
  }
  .kmod-settings-footer .actions button {
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    border: none;
    background: none;
    color: #949ba4;
  }
  .kmod-settings-footer .actions .btn-reset:hover {
    color: #ed4245;
    background: #3f4147;
  }
  .kmod-settings-footer .actions .btn-close {
    background: #4e5058;
    color: #f2f3f5;
  }
  .kmod-settings-footer .actions .btn-close:hover {
    background: #6d6f78;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 640px) {
    .kmod-settings-window {
      height: 95vh;
      max-height: none;
      border-radius: 4px;
      width: 98%;
    }
    .kmod-settings-sidebar {
      width: 48px;
      min-width: 48px;
      padding: 8px 4px;
    }
    .kmod-sidebar-item .label {
      display: none;
    }
    .kmod-sidebar-item {
      justify-content: center;
      padding: 8px;
    }
    .kmod-settings-content {
      padding: 12px 14px;
    }
    .kmod-feature-item {
      flex-wrap: wrap;
      gap: 6px;
    }
    .kmod-feature-item .status-badge {
      text-align: left;
      min-width: auto;
    }
    .kmod-settings-header h2 {
      font-size: 17px;
    }
    .kmod-language-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .kmod-language-row select {
      width: 100%;
    }
    .kmod-settings-footer {
      flex-wrap: wrap;
      gap: 6px;
    }
  }
`;

// ============================================================
// ЛОГИКА
// ============================================================

let currentOverlay: HTMLDivElement | null = null;
let unwatchLocale: (() => void) | null = null;

const SECTION_ORDER = ['general', 'security', 'appearance', 'media', 'other'];

const SECTION_MAP: Record<string, { icon: string; key: string }> = {
  general: { icon: '📌', key: 'sectionGeneral' },
  security: { icon: '🛡️', key: 'sectionSecurity' },
  appearance: { icon: '👑', key: 'sectionAppearance' },
  media: { icon: '📷', key: 'sectionMedia' },
  other: { icon: '🔧', key: 'sectionOther' },
  language: { icon: '🌐', key: 'sectionLanguage' },
  about: { icon: 'ℹ️', key: 'sectionAbout' },
};

const FEATURE_SECTION_MAP: Record<string, string> = {
  hideStories: 'general',
  hideSferum: 'general',
  blockAnalytics: 'security',
  hidePhone: 'security',
  showCrown: 'appearance',
  replaceTitle: 'appearance',
  showMetadata: 'media',
  replaceMax: 'other',
};

function getOrCreateStyles(): void {
  if (!document.querySelector('#kmod-settings-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'kmod-settings-styles';
    styleEl.textContent = modalStyles;
    document.head.appendChild(styleEl);
  }
}

function createSwitch(isActive: boolean, onChange: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `kmod-switch${isActive ? ' active' : ''}`;
  btn.type = 'button';
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', String(isActive));
  btn.addEventListener('click', onChange);
  return btn;
}

function updateAllTexts(): void {
  const elements = document.querySelectorAll('[data-i18n]');
  for (const el of elements) {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = getLocale(key as any);
    }
  }
}

function createFeatureItem(key: string, feature: any, container: HTMLElement): void {
  const enabled = isFeatureEnabled(key);
  const label = getLocale(feature.label as any);
  const descKey = feature.label.replace(/Label$/, '') + 'Desc';
  const desc = getLocale(descKey as any);

  const item = document.createElement('div');
  item.className = 'kmod-feature-item';

  const info = document.createElement('div');
  info.className = 'info';

  const labelEl = document.createElement('div');
  labelEl.className = 'label';
  labelEl.textContent = label;
  info.appendChild(labelEl);

  if (desc && desc !== descKey) {
    const descEl = document.createElement('div');
    descEl.className = 'desc';
    descEl.textContent = desc;
    info.appendChild(descEl);
  }

  item.appendChild(info);

  const badge = document.createElement('span');
  badge.className = `status-badge ${enabled ? 'on' : 'off'}`;
  badge.textContent = enabled ? getLocale('statusEnabled') : getLocale('statusDisabled');
  item.appendChild(badge);

  const toggle = document.createElement('div');
  const switchBtn = createSwitch(enabled, () => {
    toggleFeature(key);
    const newState = isFeatureEnabled(key);
    badge.textContent = newState ? getLocale('statusEnabled') : getLocale('statusDisabled');
    badge.className = `status-badge ${newState ? 'on' : 'off'}`;
    const btn = toggle.querySelector('.kmod-switch');
    if (btn) {
      btn.className = `kmod-switch${newState ? ' active' : ''}`;
      btn.setAttribute('aria-checked', String(newState));
    }
    if (newState && feature.apply) {
      feature.apply();
    } else if (feature.restore) {
      feature.restore();
    }
  });
  toggle.appendChild(switchBtn);
  item.appendChild(toggle);

  container.appendChild(item);
}

function createSection(key: string): HTMLElement {
  const section = document.createElement('div');
  section.className = `kmod-settings-section${key === 'general' ? ' active' : ''}`;
  section.dataset.section = key;

  const header = document.createElement('div');
  header.className = 'section-header';

  const title = document.createElement('h3');
  const titleKey = SECTION_MAP[key]?.key || '';
  title.setAttribute('data-i18n', titleKey);
  title.textContent = getLocale(titleKey as any);
  header.appendChild(title);

  const descKey = titleKey + 'Desc';
  const descText = getLocale(descKey as any);
  if (descText && descText !== descKey) {
    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.setAttribute('data-i18n', descKey);
    subtitle.textContent = descText;
    header.appendChild(subtitle);
  }

  section.appendChild(header);

  for (const [featureKey, feature] of Object.entries(FEATURES)) {
    if (FEATURE_SECTION_MAP[featureKey] === key) {
      createFeatureItem(featureKey, feature, section);
    }
  }

  return section;
}

function buildSettingsModal(): void {
  getOrCreateStyles();

  const overlay = document.createElement('div');
  overlay.className = 'kmod-settings-overlay';
  currentOverlay = overlay;

  const windowEl = document.createElement('div');
  windowEl.className = 'kmod-settings-window';

  // ===== HEADER =====
  const header = document.createElement('div');
  header.className = 'kmod-settings-header';

  const title = document.createElement('h2');
  const gear = document.createElement('span');
  gear.className = 'gear';
  const icon = createSettingsIcon();
  icon.style.width = '20px';
  icon.style.height = '20px';
  gear.appendChild(icon);

  const titleText = document.createElement('span');
  titleText.setAttribute('data-i18n', 'settingsTitle');
  titleText.textContent = getLocale('settingsTitle');

  title.appendChild(gear);
  title.appendChild(titleText);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'kmod-settings-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => closeModal());

  header.appendChild(title);
  header.appendChild(closeBtn);

  // ===== BODY =====
  const body = document.createElement('div');
  body.className = 'kmod-settings-body';

  // Sidebar
  const sidebar = document.createElement('nav');
  sidebar.className = 'kmod-settings-sidebar';

  const sidebarItems: string[] = [...SECTION_ORDER, 'language', 'about'];

  for (const key of sidebarItems) {
    const item = document.createElement('div');
    item.className = `kmod-sidebar-item${key === 'general' ? ' active' : ''}`;
    item.dataset.section = key;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.textContent = SECTION_MAP[key]?.icon || '📄';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';
    labelSpan.setAttribute('data-i18n', SECTION_MAP[key]?.key || '');
    labelSpan.textContent = getLocale(SECTION_MAP[key]?.key as any || '');

    item.appendChild(iconSpan);
    item.appendChild(labelSpan);

    item.addEventListener('click', () => {
      sidebar.querySelectorAll('.kmod-sidebar-item').forEach((el) => el.classList.remove('active'));
      item.classList.add('active');
      const content = body.querySelector('.kmod-settings-content');
      if (content) {
        content.querySelectorAll('.kmod-settings-section').forEach((el) => el.classList.remove('active'));
        const target = content.querySelector(`.kmod-settings-section[data-section="${key}"]`);
        if (target) target.classList.add('active');
      }
    });

    sidebar.appendChild(item);
  }

  // Content
  const content = document.createElement('div');
  content.className = 'kmod-settings-content';

  for (const key of SECTION_ORDER) {
    content.appendChild(createSection(key));
  }

  // Language
  const langSection = document.createElement('div');
  langSection.className = 'kmod-settings-section';
  langSection.dataset.section = 'language';

  const langHeader = document.createElement('div');
  langHeader.className = 'section-header';
  const langTitle = document.createElement('h3');
  langTitle.setAttribute('data-i18n', 'sectionLanguage');
  langTitle.textContent = getLocale('sectionLanguage');
  langHeader.appendChild(langTitle);
  const langSubtitle = document.createElement('p');
  langSubtitle.className = 'subtitle';
  langSubtitle.setAttribute('data-i18n', 'sectionLanguageDesc');
  langSubtitle.textContent = getLocale('sectionLanguageDesc');
  langHeader.appendChild(langSubtitle);
  langSection.appendChild(langHeader);

  const langRow = document.createElement('div');
  langRow.className = 'kmod-language-row';

  const langLabel = document.createElement('label');
  langLabel.setAttribute('data-i18n', 'languageLabel');
  langLabel.textContent = getLocale('languageLabel');
  langRow.appendChild(langLabel);

  const select = document.createElement('select');
  const ruOption = document.createElement('option');
  ruOption.value = 'ru';
  ruOption.textContent = getLocale('languageRu');
  select.appendChild(ruOption);

  const enOption = document.createElement('option');
  enOption.value = 'en';
  enOption.textContent = getLocale('languageEn');
  select.appendChild(enOption);

  select.value = getCurrentLocale();

  select.addEventListener('change', () => {
    const lang = select.value as 'ru' | 'en';
    setLocale(lang);
    updateAllTexts();
    document.querySelectorAll('.kmod-feature-item').forEach((item) => {
      const badge = item.querySelector('.status-badge');
      const btn = item.querySelector('.kmod-switch');
      if (badge) {
        const isOn = btn?.classList.contains('active');
        badge.textContent = isOn ? getLocale('statusEnabled') : getLocale('statusDisabled');
        badge.className = `status-badge ${isOn ? 'on' : 'off'}`;
      }
    });
  });

  langRow.appendChild(select);
  langSection.appendChild(langRow);
  content.appendChild(langSection);

  // About
  const aboutSection = document.createElement('div');
  aboutSection.className = 'kmod-settings-section';
  aboutSection.dataset.section = 'about';

  const aboutHeader = document.createElement('div');
  aboutHeader.className = 'section-header';
  const aboutTitle = document.createElement('h3');
  aboutTitle.setAttribute('data-i18n', 'sectionAbout');
  aboutTitle.textContent = getLocale('sectionAbout');
  aboutHeader.appendChild(aboutTitle);
  const aboutSubtitle = document.createElement('p');
  aboutSubtitle.className = 'subtitle';
  aboutSubtitle.setAttribute('data-i18n', 'sectionAboutDesc');
  aboutSubtitle.textContent = getLocale('sectionAboutDesc');
  aboutHeader.appendChild(aboutSubtitle);
  aboutSection.appendChild(aboutHeader);

  const aboutContent = document.createElement('div');
  aboutContent.className = 'kmod-about-content';
  aboutContent.innerHTML = `
    <div class="name">${CONFIG.name}</div>
    <div class="version">${getLocale('aboutVersion')}: ${CONFIG.version}</div>
    <div class="author">${getLocale('aboutAuthor')}: ${CONFIG.author}</div>
    <div class="kmod-about-divider"></div>
    <div class="desc">${getLocale('aboutDescription')}</div>
  `;
  aboutSection.appendChild(aboutContent);
  content.appendChild(aboutSection);

  body.appendChild(sidebar);
  body.appendChild(content);

  // ===== FOOTER =====
  const footer = document.createElement('div');
  footer.className = 'kmod-settings-footer';

  const status = document.createElement('div');
  status.className = 'status';
  const dot = document.createElement('span');
  dot.className = 'dot';
  status.appendChild(dot);
  const statusText = document.createElement('span');
  statusText.setAttribute('data-i18n', 'statusActive');
  statusText.textContent = getLocale('statusActive');
  status.appendChild(statusText);
  footer.appendChild(status);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn-reset';
  resetBtn.setAttribute('data-i18n', 'resetButton');
  resetBtn.textContent = getLocale('resetButton');
  resetBtn.addEventListener('click', () => {
    if (confirm(getLocale('resetConfirm' as any) || 'Сбросить все настройки?')) {
      storage.resetToDefaults();
      location.reload();
    }
  });

  const closeBtn2 = document.createElement('button');
  closeBtn2.className = 'btn-close';
  closeBtn2.setAttribute('data-i18n', 'closeButton');
  closeBtn2.textContent = getLocale('closeButton');
  closeBtn2.addEventListener('click', () => closeModal());

  actions.appendChild(resetBtn);
  actions.appendChild(closeBtn2);
  footer.appendChild(actions);

  // ===== ASSEMBLE =====
  windowEl.appendChild(header);
  windowEl.appendChild(body);
  windowEl.appendChild(footer);
  overlay.appendChild(windowEl);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && currentOverlay) {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  unwatchLocale = onLocaleChange(() => {
    updateAllTexts();
  });

  document.body.appendChild(overlay);
}

function closeModal(): void {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  if (unwatchLocale) {
    unwatchLocale();
    unwatchLocale = null;
  }
}

export function openSettingsModal(): void {
  if (currentOverlay) {
    closeModal();
    setTimeout(() => buildSettingsModal(), 50);
  } else {
    buildSettingsModal();
  }
}

export function closeSettingsModal(): void {
  closeModal();
}