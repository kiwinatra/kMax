import { createElement, qs, qsa } from '../core/dom';
import { storage } from '../core/storage';
import { logger } from '../core/logger';
import { CONFIG } from '../config';
import { getLocale, setLocale, getCurrentLocale, onLocaleChange } from '../locales';
import { FEATURES, toggleFeature, isFeatureEnabled } from '../registry';
import { createSettingsIcon, createCloseIcon, createChevronIcon } from './icons';
import {
    fontOptions,
    systemFonts,
    googleFonts,
    setFont,
    getFontByLabel
} from '../features/changeFont';
import { openTagManager } from '../features/chatTags/ui';
import { getAllTags } from '../features/chatTags/storage';
import { getAllTemplates, addTemplate, removeTemplate, generateTemplateId } from '../features/templates/storage';

const ANIMATION_DURATION = 200;
const SECTION_ORDER = ['general', 'security', 'appearance', 'media', 'other', 'chats'];

function createSectionIcon(type: string): string {
    const icons: Record<string, string> = {
        general: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
        security: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
        appearance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2a10 10 0 0 0 0 20"/><path d="M2 12h20"/></svg>`,
        media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
        other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.56.56a1.65 1.65 0 0 0 2.33 0l.56-.56a1.65 1.65 0 0 0 2.33 0l.56.56a1.65 1.65 0 0 0 2.33 0l.56-.56a1.65 1.65 0 0 0 2.33 0l.56.56a1.65 1.65 0 0 0 2.33 0z"/></svg>`,
        language: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
        about: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        chats: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></svg>`,
    };
    return icons[type] || icons.other;
}

const CSS_STYLES = `
@keyframes kmodFadeScale{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
.kmod-settings-overlay{position:fixed;inset:0;background:rgba(10,10,15,0.85);display:flex;justify-content:center;align-items:center;z-index:999999;animation:kmodFadeScale ${ANIMATION_DURATION}ms ease;backdrop-filter:blur(4px)}
.kmod-settings-window{background:#0a0a0f;border-radius:24px;box-shadow:0 40px 120px rgba(0,0,0,0.8);width:92%;max-width:800px;height:88vh;max-height:720px;display:flex;flex-direction:column;overflow:hidden;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f0f0f0;border:1px solid rgba(255,255,255,0.04)}
.kmod-settings-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;background:#0f0f1a;border-bottom:1px solid rgba(255,255,255,0.04);flex-shrink:0}
.kmod-settings-header h2{font-size:28px;font-weight:900;color:#fff;margin:0;display:flex;align-items:center;gap:12px;letter-spacing:-1px}
.kmod-settings-header h2 .gear{color:rgba(255,255,255,0.3);display:flex;align-items:center}
.kmod-settings-header h2 .gear svg{width:24px;height:24px}
.kmod-settings-close{background:transparent;border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.3);font-size:20px;cursor:pointer;width:40px;height:40px;border-radius:60px;transition:all .2s;display:flex;align-items:center;justify-content:center}
.kmod-settings-close:hover{color:#fff;border-color:rgba(255,255,255,0.15);transform:scale(1.04)}
.kmod-settings-body{display:flex;flex:1;overflow:hidden;background:#0a0a0f}
.kmod-settings-sidebar{width:200px;min-width:160px;background:#0f0f1a;padding:16px 10px;overflow-y:auto;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.03)}
.kmod-settings-sidebar::-webkit-scrollbar{width:3px}
.kmod-settings-sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.06);border-radius:10px}
.kmod-sidebar-item{display:flex;align-items:center;gap:14px;padding:10px 16px;border-radius:12px;cursor:pointer;color:rgba(255,255,255,0.3);font-size:15px;font-weight:700;transition:all .2s;letter-spacing:-0.2px}
.kmod-sidebar-item:hover{color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.03)}
.kmod-sidebar-item.active{color:#fff;background:rgba(255,255,255,0.06)}
.kmod-sidebar-item .icon{width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.kmod-settings-content{flex:1;padding:24px 28px 20px;overflow-y:auto;background:#0a0a0f}
.kmod-settings-content::-webkit-scrollbar{width:3px}
.kmod-settings-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.06);border-radius:10px}
.kmod-settings-section{display:none}
.kmod-settings-section.active{display:block}
.kmod-settings-section .section-header{margin-bottom:24px}
.kmod-settings-section .section-header h3{font-size:22px;font-weight:900;color:#fff;margin:0 0 4px;letter-spacing:-0.5px}
.kmod-settings-section .section-header .subtitle{font-size:14px;color:rgba(255,255,255,0.2);margin:0;font-weight:600;letter-spacing:0.3px;text-transform:uppercase}
.kmod-feature-item{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.03);gap:16px}
.kmod-feature-item:last-child{border-bottom:none}
.kmod-feature-item .info{flex:1;min-width:0}
.kmod-feature-item .info .label{font-size:16px;font-weight:700;color:#f0f0f0;letter-spacing:-0.2px}
.kmod-feature-item .info .desc{font-size:13px;color:rgba(255,255,255,0.25);margin-top:2px;line-height:1.4;font-weight:500}
.kmod-feature-item .status-badge{font-size:11px;font-weight:700;color:rgba(255,255,255,0.2);flex-shrink:0;min-width:40px;text-align:right;letter-spacing:0.5px;text-transform:uppercase}
.kmod-feature-item .status-badge.on{color:#4ade80}
.kmod-feature-item .status-badge.off{color:#ed4245}
.kmod-switch{position:relative;width:44px;height:26px;background:rgba(255,255,255,0.06);border-radius:40px;cursor:pointer;transition:background .25s;flex-shrink:0;border:none;padding:0;outline:0}
.kmod-switch.active{background:#4ade80}
.kmod-switch::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;background:#fff;border-radius:50%;transition:transform .25s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 2px 8px rgba(0,0,0,0.3)}
.kmod-switch.active::after{transform:translateX(18px)}
.kmod-switch:hover{filter:brightness(1.1)}
.kmod-language-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.03);gap:16px}
.kmod-language-row label{font-size:16px;font-weight:700;color:#f0f0f0;letter-spacing:-0.2px}
.kmod-language-row select{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:8px 16px;font-size:15px;font-weight:700;color:#f0f0f0;cursor:pointer;outline:0;min-width:140px;transition:border-color .2s}
.kmod-language-row select:focus{border-color:rgba(255,255,255,0.15)}
.kmod-about-content{padding:4px 0}
.kmod-about-content .name{font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px}
.kmod-about-content .version{font-size:15px;color:rgba(255,255,255,0.2);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
.kmod-about-content .author{font-size:15px;color:rgba(255,255,255,0.15);margin-top:2px;font-weight:600}
.kmod-about-content .desc{font-size:15px;color:rgba(255,255,255,0.2);margin-top:12px;line-height:1.6;font-weight:500}
.kmod-about-divider{height:1px;background:rgba(255,255,255,0.04);margin:12px 0}
.kmod-settings-footer{display:flex;justify-content:space-between;align-items:center;padding:16px 28px;background:#0f0f1a;border-top:1px solid rgba(255,255,255,0.04);flex-shrink:0}
.kmod-settings-footer .status{font-size:12px;color:#4ade80;font-weight:700;display:flex;align-items:center;gap:8px;letter-spacing:0.5px;text-transform:uppercase}
.kmod-settings-footer .status .dot{width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block;box-shadow:0 0 20px rgba(74,222,128,0.3)}
.kmod-settings-footer .actions{display:flex;gap:10px}
.kmod-settings-footer .actions button{padding:8px 20px;border-radius:60px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;border:none;background:transparent;color:rgba(255,255,255,0.3);letter-spacing:0.3px}
.kmod-settings-footer .actions .btn-reset:hover{color:#ed4245;background:rgba(237,66,69,0.08)}
.kmod-settings-footer .actions .btn-close{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.04)}
.kmod-settings-footer .actions .btn-close:hover{background:rgba(255,255,255,0.1);color:#fff;transform:scale(1.02)}
.kmod-font-select-wrapper{display:flex;align-items:center;margin-left:12px}
.kmod-font-select{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:6px 14px;color:#f0f0f0;font-size:14px;font-weight:600;cursor:pointer;outline:0;transition:border-color .2s;min-width:140px}
.kmod-font-select:focus{border-color:rgba(255,255,255,0.15)}
.kmod-font-select option{background:#0a0a0f;color:#f0f0f0}
.kmod-chats-section-btn{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#f0f0f0;padding:14px 24px;border-radius:12px;cursor:pointer;font-size:15px;font-weight:700;transition:all 0.2s;width:100%;letter-spacing:-0.2px}
.kmod-chats-section-btn:hover{background:rgba(255,255,255,0.1);transform:scale(1.01)}
.kmod-tags-preview{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;padding:12px 16px;background:rgba(255,255,255,0.02);border-radius:12px;border:1px solid rgba(255,255,255,0.03);min-height:40px;align-items:center}
.kmod-tag-preview-item{display:inline-block;color:#fff;font-size:11px;font-weight:700;padding:2px 12px;border-radius:12px;margin:2px 0}
.kmod-template-item{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:4px;border:1px solid rgba(255,255,255,0.03)}
.kmod-template-command{color:#4ade80;font-weight:700;font-size:13px;font-family:monospace}
.kmod-template-text{color:rgba(255,255,255,0.5);font-size:13px;flex:1;margin-left:12px}
.kmod-template-delete{background:transparent;border:none;color:rgba(255,255,255,0.2);cursor:pointer;font-size:14px;transition:all 0.2s;padding:4px 8px;border-radius:6px}
.kmod-template-delete:hover{color:#ed4245;background:rgba(237,66,69,0.1)}
.kmod-template-form{display:none;gap:8px;flex-wrap:wrap;margin-bottom:8px;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04)}
@media (max-width:640px){.kmod-settings-window{height:95vh;max-height:none;border-radius:16px;width:98%}.kmod-settings-sidebar{width:52px;min-width:52px;padding:10px 6px}.kmod-sidebar-item .label{display:none}.kmod-sidebar-item{justify-content:center;padding:10px;border-radius:10px}.kmod-settings-content{padding:16px 18px}.kmod-feature-item{flex-wrap:wrap;gap:4px}.kmod-feature-item .status-badge{text-align:left;min-width:auto}.kmod-settings-header h2{font-size:20px}.kmod-language-row{flex-direction:column;align-items:flex-start;gap:8px}.kmod-language-row select{width:100%}.kmod-settings-footer{flex-wrap:wrap;gap:8px;padding:14px 18px}.kmod-font-select-wrapper{width:100%;margin-left:0;margin-top:6px}.kmod-font-select{width:100%}}
`;

const SECTION_MAP: Record<string, { icon: string; key: string }> = {
    general: { icon: 'general', key: 'sectionGeneral' },
    security: { icon: 'security', key: 'sectionSecurity' },
    appearance: { icon: 'appearance', key: 'sectionAppearance' },
    media: { icon: 'media', key: 'sectionMedia' },
    other: { icon: 'other', key: 'sectionOther' },
    language: { icon: 'language', key: 'sectionLanguage' },
    about: { icon: 'about', key: 'sectionAbout' },
    chats: { icon: 'chats', key: 'sectionChats' },
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
    logView: 'other',
};

function getOrCreateStyles(): void {
    if (!document.querySelector('#kmod-settings-styles')) {
        const style = document.createElement('style');
        style.id = 'kmod-settings-styles';
        style.textContent = CSS_STYLES;
        document.head.appendChild(style);
    }
}

function createSwitch(isActive: boolean, onChange: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `kmod-switch${isActive ? ' active' : ''}`;
    btn.type = 'button';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', String(isActive));
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onChange();
    });
    return btn;
}

function updateAllTexts(root: HTMLElement): void {
    const els = root.querySelectorAll('[data-i18n]');
    for (const el of els) {
        const key = el.getAttribute('data-i18n');
        if (key) {
            const translation = getLocale(key as any);
            if (translation) el.textContent = translation;
        }
    }
}

function createFeatureItem(key: string, feature: any): HTMLElement {
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

    const toggleWrapper = document.createElement('div');
    const switchBtn = createSwitch(enabled, () => {
        toggleFeature(key);
        const newState = isFeatureEnabled(key);
        badge.textContent = newState ? getLocale('statusEnabled') : getLocale('statusDisabled');
        badge.className = `status-badge ${newState ? 'on' : 'off'}`;
        const btn = toggleWrapper.querySelector('.kmod-switch');
        if (btn) {
            btn.className = `kmod-switch${newState ? ' active' : ''}`;
            btn.setAttribute('aria-checked', String(newState));
        }
        if (newState && feature.enable) feature.enable();
        else if (feature.disable) feature.disable();
    });
    toggleWrapper.appendChild(switchBtn);
    item.appendChild(toggleWrapper);

    return item;
}

function createFontSelector(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'kmod-feature-item';
    container.style.borderTop = '1px solid rgba(255,255,255,0.06)';
    container.style.marginTop = '8px';
    container.style.paddingTop = '12px';
    container.style.flexWrap = 'wrap';

    const info = document.createElement('div');
    info.className = 'info';
    info.style.flex = '1';
    info.style.minWidth = '150px';

    const label = document.createElement('div');
    label.className = 'label';
    label.setAttribute('data-i18n', 'fontFamilyLabel');
    label.textContent = getLocale('fontFamilyLabel');
    info.appendChild(label);

    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.setAttribute('data-i18n', 'fontFamilyDesc');
    desc.textContent = getLocale('fontFamilyDesc');
    info.appendChild(desc);

    container.appendChild(info);

    const selectWrapper = document.createElement('div');
    selectWrapper.className = 'kmod-font-select-wrapper';
    selectWrapper.style.display = 'flex';
    selectWrapper.style.alignItems = 'center';
    selectWrapper.style.marginLeft = '12px';
    selectWrapper.style.flex = '1';
    selectWrapper.style.minWidth = '180px';

    const select = document.createElement('select');
    select.className = 'kmod-font-select';
    select.style.width = '100%';

    const currentFont = storage.get<string>('fontFamily' as any) || (fontOptions.length > 0 ? fontOptions[0].label : 'Inter');
    const groups = [
        { label: 'Системные', fonts: systemFonts },
        { label: 'Google Fonts', fonts: googleFonts },
    ];

    for (const group of groups) {
        // if (!group.fonts || group.fonts.length === 0) continue;
        const optgroup = document.createElement('optgroup');
        optgroup.label = group.label;
        for (const font of group.fonts) {
            const option = document.createElement('option');
            option.value = font.label;
            const labelKey = `fontFamily${font.label.replace(/[^a-zA-Z]/g, '')}`;
            const localized = getLocale(labelKey as any);
            option.textContent = (localized && localized !== labelKey) ? localized : font.label;
            if (font.label === currentFont) {
                option.selected = true;
            }
            optgroup.appendChild(option);
        }
        select.appendChild(optgroup);
    }

    const loadIndicator = document.createElement('span');
    loadIndicator.style.cssText = `
        margin-left: 10px;
        font-size: 12px;
        color: rgba(255,255,255,0.2);
        font-weight: 600;
        display: none;
    `;
    loadIndicator.textContent = '⏳ Загрузка...';

    select.addEventListener('change', async () => {
        const selected = select.value;
        const font = getFontByLabel(selected);
        if (font && 'url' in font) {
            loadIndicator.style.display = 'inline';
            loadIndicator.textContent = '⏳ Загрузка...';
        }
        try {
            await setFont(selected);
            if (font && 'url' in font) {
                loadIndicator.textContent = '✅ Готово';
                setTimeout(() => { loadIndicator.style.display = 'none'; }, 1500);
            }
        } catch {
            loadIndicator.textContent = '❌ Ошибка';
            setTimeout(() => { loadIndicator.style.display = 'none'; }, 2000);
        }
    });

    selectWrapper.appendChild(select);
    selectWrapper.appendChild(loadIndicator);
    container.appendChild(selectWrapper);

    return container;
}

function createChatsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'kmod-settings-section';
    section.dataset.section = 'chats';

    const header = document.createElement('div');
    header.className = 'section-header';
    const title = document.createElement('h3');
    title.setAttribute('data-i18n', 'sectionChats');
    title.textContent = getLocale('sectionChats');
    header.appendChild(title);
    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.setAttribute('data-i18n', 'sectionChatsDesc');
    subtitle.textContent = getLocale('sectionChatsDesc');
    header.appendChild(subtitle);
    section.appendChild(header);

    const tagsLabel = document.createElement('div');
    tagsLabel.style.cssText = 'font-size:14px;font-weight:700;color:#f0f0f0;margin:12px 0 6px;';
    tagsLabel.textContent = '🏷️ Теги для чатов';
    section.appendChild(tagsLabel);

    const manageBtn = document.createElement('button');
    manageBtn.style.cssText = `
        background: rgba(74,222,128,0.08);
        border: 1px solid rgba(74,222,128,0.15);
        color: #4ade80;
        padding: 10px 18px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
        width: 100%;
        transition: all 0.2s;
    `;
    manageBtn.textContent = '🏷️ Управление тегами';
    manageBtn.onclick = () => openTagManager();
    section.appendChild(manageBtn);

    const preview = document.createElement('div');
    preview.className = 'kmod-tags-preview';
    const renderPreview = () => {
        const tags = getAllTags();
        preview.innerHTML = '';
        if (tags.length === 0) {
            preview.innerHTML = '<span style="color:rgba(255,255,255,0.2);font-size:13px;">Нет тегов</span>';
            return;
        }
        tags.forEach(t => {
            const el = document.createElement('span');
            el.className = 'kmod-tag-preview-item';
            el.style.backgroundColor = t.color;
            el.textContent = t.tagName;
            preview.appendChild(el);
        });
    };
    renderPreview();
    section.appendChild(preview);

    const divider = document.createElement('hr');
    divider.style.cssText = 'border:none;border-top:1px solid rgba(255,255,255,0.04);margin:8px 0 12px;';
    section.appendChild(divider);

    const templatesLabel = document.createElement('div');
    templatesLabel.style.cssText = 'font-size:14px;font-weight:700;color:#f0f0f0;margin-bottom:2px;';
    templatesLabel.textContent = '📝 Шаблоны ответов';
    section.appendChild(templatesLabel);

    const templatesDesc = document.createElement('p');
    templatesDesc.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.25);margin:0 0 8px;';
    templatesDesc.textContent = 'Быстрые ответы через /команда в поле ввода';
    section.appendChild(templatesDesc);

    const list = document.createElement('div');
    list.id = 'kmod-templates-list';
    list.style.cssText = 'margin-bottom:8px;max-height:150px;overflow-y:auto;';

    const renderTemplates = () => {
        const templates = getAllTemplates();
        list.innerHTML = '';
        if (templates.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.15);padding:8px 0;font-size:13px;">Нет шаблонов</div>';
            return;
        }
        templates.forEach(t => {
            const item = document.createElement('div');
            item.className = 'kmod-template-item';
            item.innerHTML = `
                <span class="kmod-template-command">${t.command}</span>
                <span class="kmod-template-text">${t.text}</span>
                <button class="kmod-template-delete" data-id="${t.id}">✕</button>
            `;
            const del = item.querySelector('.kmod-template-delete') as HTMLButtonElement | null;
            del?.addEventListener('click', () => {
                if (confirm(`Удалить шаблон "${t.command}"?`)) {
                    removeTemplate(t.id);
                    renderTemplates();
                }
            });
            list.appendChild(item);
        });
    };
    renderTemplates();
    section.appendChild(list);

    const form = document.createElement('div');
    form.className = 'kmod-template-form';
    form.style.display = 'none';

    const cmdInput = document.createElement('input');
    cmdInput.placeholder = '/команда';
    cmdInput.style.cssText = `
        flex:1;min-width:100px;padding:8px 12px;background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#f0f0f0;font-size:13px;outline:none;
    `;
    form.appendChild(cmdInput);

    const textInput = document.createElement('input');
    textInput.placeholder = 'Текст ответа';
    textInput.style.cssText = `
        flex:2;min-width:150px;padding:8px 12px;background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#f0f0f0;font-size:13px;outline:none;
    `;
    form.appendChild(textInput);

    const formBtns = document.createElement('div');
    formBtns.style.cssText = 'display:flex;gap:8px;width:100%;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Сохранить';
    saveBtn.style.cssText = 'flex:1;padding:8px 16px;background:#4ade80;border:none;border-radius:8px;color:#0a0a0f;font-weight:700;font-size:13px;cursor:pointer;';
    saveBtn.onclick = () => {
        const cmd = cmdInput.value.trim();
        const txt = textInput.value.trim();
        if (!cmd || !txt) { alert('Заполните оба поля'); return; }
        if (!cmd.startsWith('/')) { alert('Команда должна начинаться с /'); return; }
        addTemplate({ id: generateTemplateId(), command: cmd, text: txt, createdAt: Date.now() });
        cmdInput.value = '';
        textInput.value = '';
        form.style.display = 'none';
        renderTemplates();
    };
    formBtns.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Отмена';
    cancelBtn.style.cssText = 'padding:8px 16px;background:transparent;border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:rgba(255,255,255,0.3);font-weight:600;font-size:13px;cursor:pointer;';
    cancelBtn.onclick = () => {
        form.style.display = 'none';
        cmdInput.value = '';
        textInput.value = '';
    };
    formBtns.appendChild(cancelBtn);
    form.appendChild(formBtns);
    section.appendChild(form);

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Добавить шаблон';
    addBtn.style.cssText = `
        background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.1);
        color:rgba(255,255,255,0.3);padding:8px 16px;border-radius:8px;cursor:pointer;
        font-size:13px;font-weight:600;width:100%;transition:all 0.2s;
    `;
    addBtn.onclick = () => {
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
        if (form.style.display === 'flex') cmdInput.focus();
    };
    section.appendChild(addBtn);

    return section;
}

function createSection(key: string): HTMLElement {
    if (key === 'chats') {
        return createChatsSection();
    }

    const section = document.createElement('div');
    section.className = `kmod-settings-section${key === 'general' ? ' active' : ''}`;
    section.dataset.section = key;

    const header = document.createElement('div');
    header.className = 'section-header';

    const title = document.createElement('h3');
    title.setAttribute('data-i18n', SECTION_MAP[key]?.key || '');
    title.textContent = getLocale(SECTION_MAP[key]?.key as any || '');
    header.appendChild(title);

    const descKey = (SECTION_MAP[key]?.key || '') + 'Desc';
    const descText = getLocale(descKey as any);
    if (descText && descText !== String(descKey)) {
        const subtitle = document.createElement('p');
        subtitle.className = 'subtitle';
        subtitle.setAttribute('data-i18n', descKey);
        subtitle.textContent = descText;
        header.appendChild(subtitle);
    }
    section.appendChild(header);

    const featuresContainer = document.createElement('div');
    featuresContainer.className = 'kmod-features-list';

    const features = Object.entries(FEATURES).filter(
        ([fKey]) => FEATURE_SECTION_MAP[fKey] === key
    );

    for (const [fKey, feature] of features) {
        featuresContainer.appendChild(createFeatureItem(fKey, feature));
    }
    section.appendChild(featuresContainer);

    if (key === 'appearance') {
        const fontBlock = createFontSelector();
        section.appendChild(fontBlock);
    }

    return section;
}

function createLanguageSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'kmod-settings-section';
    section.dataset.section = 'language';

    const header = document.createElement('div');
    header.className = 'section-header';
    const title = document.createElement('h3');
    title.setAttribute('data-i18n', 'sectionLanguage');
    title.textContent = getLocale('sectionLanguage');
    header.appendChild(title);
    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.setAttribute('data-i18n', 'sectionLanguageDesc');
    subtitle.textContent = getLocale('sectionLanguageDesc');
    header.appendChild(subtitle);
    section.appendChild(header);

    const row = document.createElement('div');
    row.className = 'kmod-language-row';

    const label = document.createElement('label');
    label.setAttribute('data-i18n', 'languageLabel');
    label.textContent = getLocale('languageLabel');
    row.appendChild(label);

    const select = document.createElement('select');
    const ruOpt = document.createElement('option');
    ruOpt.value = 'ru';
    ruOpt.textContent = getLocale('languageRu');
    select.appendChild(ruOpt);
    const enOpt = document.createElement('option');
    enOpt.value = 'en';
    enOpt.textContent = getLocale('languageEn');
    select.appendChild(enOpt);
    select.value = getCurrentLocale();

    select.addEventListener('change', () => {
        const lang = select.value as 'ru' | 'en';
        setLocale(lang);
        const win = section.closest('.kmod-settings-window') as HTMLElement | null;
        if (win) updateAllTexts(win);
        const items = win?.querySelectorAll('.kmod-feature-item');
        if (items) {
            for (const item of items) {
                const badge = item.querySelector('.status-badge');
                const switchBtn = item.querySelector('.kmod-switch');
                if (badge && switchBtn) {
                    const isOn = switchBtn.classList.contains('active');
                    badge.textContent = isOn ? getLocale('statusEnabled') : getLocale('statusDisabled');
                    badge.className = `status-badge ${isOn ? 'on' : 'off'}`;
                }
            }
        }
        const fontSelect = win?.querySelector('.kmod-font-select') as HTMLSelectElement | null;
        if (fontSelect) {
            const currentValue = fontSelect.value;
            fontSelect.innerHTML = '';
            const groups = [
                { label: 'Системные', fonts: systemFonts },
                { label: 'Google Fonts', fonts: googleFonts },
            ];
            for (const group of groups) {
                // if (!group.fonts || group.fonts.length === 0) continue;
                const optgroup = document.createElement('optgroup');
                optgroup.label = group.label;
                for (const font of group.fonts) {
                    const option = document.createElement('option');
                    option.value = font.label;
                    const labelKey = `fontFamily${font.label.replace(/[^a-zA-Z]/g, '')}`;
                    const localized = getLocale(labelKey as any);
                    option.textContent = (localized && localized !== labelKey) ? localized : font.label;
                    if (font.label === currentValue) option.selected = true;
                    optgroup.appendChild(option);
                }
                fontSelect.appendChild(optgroup);
            }
        }

        const preview = win?.querySelector('.kmod-tags-preview');
        if (preview) {
            const tags = getAllTags();
            preview.innerHTML = '';
            if (tags.length === 0) {
                preview.innerHTML = '<span style="color:rgba(255,255,255,0.2);font-size:13px;">Нет тегов</span>';
            } else {
                tags.forEach(t => {
                    const el = document.createElement('span');
                    el.className = 'kmod-tag-preview-item';
                    el.style.backgroundColor = t.color;
                    el.textContent = t.tagName;
                    preview.appendChild(el);
                });
            }
        }

        const list = win?.querySelector('#kmod-templates-list');
        if (list) {
            const templates = getAllTemplates();
            list.innerHTML = '';
            if (templates.length === 0) {
                list.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.15);padding:8px 0;font-size:13px;">Нет шаблонов</div>';
            } else {
                templates.forEach(t => {
                    const item = document.createElement('div');
                    item.className = 'kmod-template-item';
                    item.innerHTML = `
                        <span class="kmod-template-command">${t.command}</span>
                        <span class="kmod-template-text">${t.text}</span>
                        <button class="kmod-template-delete" data-id="${t.id}">✕</button>
                    `;
                    const del = item.querySelector('.kmod-template-delete') as HTMLButtonElement | null;
                    del?.addEventListener('click', () => {
                        if (confirm(`Удалить шаблон "${t.command}"?`)) {
                            removeTemplate(t.id);
                            const newList = win?.querySelector('#kmod-templates-list');
                            if (newList) {
                                const newTemplates = getAllTemplates();
                                newList.innerHTML = '';
                                if (newTemplates.length === 0) {
                                    newList.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.15);padding:8px 0;font-size:13px;">Нет шаблонов</div>';
                                } else {
                                    newTemplates.forEach(nt => {
                                        const nel = document.createElement('div');
                                        nel.className = 'kmod-template-item';
                                        nel.innerHTML = `
                                            <span class="kmod-template-command">${nt.command}</span>
                                            <span class="kmod-template-text">${nt.text}</span>
                                            <button class="kmod-template-delete" data-id="${nt.id}">✕</button>
                                        `;
                                        const ndel = nel.querySelector('.kmod-template-delete') as HTMLButtonElement | null;
                                        ndel?.addEventListener('click', () => {
                                            if (confirm(`Удалить шаблон "${nt.command}"?`)) {
                                                removeTemplate(nt.id);
                                                closeModal();
                                                setTimeout(openSettingsModal, 150);
                                            }
                                        });
                                        newList.appendChild(nel);
                                    });
                                }
                            }
                        }
                    });
                    list.appendChild(item);
                });
            }
        }
    });

    row.appendChild(select);
    section.appendChild(row);

    return section;
}

function createAboutSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'kmod-settings-section';
    section.dataset.section = 'about';

    const header = document.createElement('div');
    header.className = 'section-header';
    const title = document.createElement('h3');
    title.setAttribute('data-i18n', 'sectionAbout');
    title.textContent = getLocale('sectionAbout');
    header.appendChild(title);
    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.setAttribute('data-i18n', 'sectionAboutDesc');
    subtitle.textContent = getLocale('sectionAboutDesc');
    header.appendChild(subtitle);
    section.appendChild(header);

    const content = document.createElement('div');
    content.className = 'kmod-about-content';
    content.innerHTML = `
        <div class="name">${CONFIG.name}</div>
        <div class="version">${getLocale('aboutVersion')}: ${CONFIG.version}</div>
        <div class="author">${getLocale('aboutAuthor')}: ${CONFIG.author}</div>
        <div class="kmod-about-divider"></div>
        <div class="desc">${getLocale('aboutDescription')}</div>
    `;
    section.appendChild(content);

    return section;
}

let currentOverlay: HTMLDivElement | null = null;
let unwatchLocale: (() => void) | null = null;
let currentWindow: HTMLElement | null = null;

function closeModal(): void {
    if (currentOverlay) {
        currentOverlay.remove();
        currentOverlay = null;
        currentWindow = null;
    }
    if (unwatchLocale) {
        unwatchLocale();
        unwatchLocale = null;
    }
}

function buildModal(): void {
    getOrCreateStyles();

    const overlay = document.createElement('div');
    overlay.className = 'kmod-settings-overlay';

    const windowEl = document.createElement('div');
    windowEl.className = 'kmod-settings-window';
    currentWindow = windowEl;

    const header = document.createElement('div');
    header.className = 'kmod-settings-header';

    const title = document.createElement('h2');
    const gear = document.createElement('span');
    gear.className = 'gear';
    const icon = createSettingsIcon();
    icon.style.width = '24px';
    icon.style.height = '24px';
    gear.appendChild(icon);
    title.appendChild(gear);

    const titleText = document.createElement('span');
    titleText.setAttribute('data-i18n', 'settingsTitle');
    titleText.textContent = getLocale('settingsTitle');
    title.appendChild(titleText);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kmod-settings-close';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', closeModal);

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'kmod-settings-body';

    const sidebar = document.createElement('nav');
    sidebar.className = 'kmod-settings-sidebar';

    const sections = [...SECTION_ORDER, 'language', 'about'];

    for (const key of sections) {
        const item = document.createElement('div');
        item.className = `kmod-sidebar-item${key === 'general' ? ' active' : ''}`;
        item.dataset.section = key;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.innerHTML = createSectionIcon(SECTION_MAP[key]?.icon || 'other');
        item.appendChild(iconSpan);

        const labelSpan = document.createElement('span');
        labelSpan.className = 'label';
        labelSpan.setAttribute('data-i18n', SECTION_MAP[key]?.key || '');
        labelSpan.textContent = getLocale(SECTION_MAP[key]?.key as any || '');
        item.appendChild(labelSpan);

        item.addEventListener('click', () => {
            sidebar.querySelectorAll('.kmod-sidebar-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            const content = body.querySelector('.kmod-settings-content')!;
            content.querySelectorAll('.kmod-settings-section').forEach(el => el.classList.remove('active'));
            const target = content.querySelector(`.kmod-settings-section[data-section="${key}"]`) as HTMLElement;
            if (target) target.classList.add('active');
        });

        sidebar.appendChild(item);
    }

    const content = document.createElement('div');
    content.className = 'kmod-settings-content';

    for (const key of SECTION_ORDER) {
        content.appendChild(createSection(key));
    }
    content.appendChild(createLanguageSection());
    content.appendChild(createAboutSection());

    body.appendChild(sidebar);
    body.appendChild(content);

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
        if (confirm(getLocale('resetConfirm'))) {
            storage.resetToDefaults();
            location.reload();
        }
    });

    const closeBtn2 = document.createElement('button');
    closeBtn2.className = 'btn-close';
    closeBtn2.setAttribute('data-i18n', 'closeButton');
    closeBtn2.textContent = getLocale('closeButton');
    closeBtn2.addEventListener('click', closeModal);

    actions.appendChild(resetBtn);
    actions.appendChild(closeBtn2);
    footer.appendChild(actions);

    windowEl.appendChild(header);
    windowEl.appendChild(body);
    windowEl.appendChild(footer);
    overlay.appendChild(windowEl);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    unwatchLocale = onLocaleChange(() => {
        if (!currentWindow) return;

        updateAllTexts(currentWindow);
        const items = currentWindow.querySelectorAll('.kmod-feature-item');
        for (const item of items) {
            const badge = item.querySelector('.status-badge');
            const switchBtn = item.querySelector('.kmod-switch');
            if (badge && switchBtn) {
                const isOn = switchBtn.classList.contains('active');
                badge.textContent = isOn ? getLocale('statusEnabled') : getLocale('statusDisabled');
                badge.className = `status-badge ${isOn ? 'on' : 'off'}`;
            }
        }
        const select = currentWindow.querySelector('.kmod-language-row select') as HTMLSelectElement | null;
        if (select) select.value = getCurrentLocale();

        const fontSelect = currentWindow.querySelector('.kmod-font-select') as HTMLSelectElement | null;
        if (fontSelect) {
            const currentValue = fontSelect.value;
            fontSelect.innerHTML = '';
            const groups = [
                { label: 'Системные', fonts: systemFonts },
                { label: 'Google Fonts', fonts: googleFonts },
            ];
            for (const group of groups) {
                // if (!group.fonts || group.fonts.length === 0) continue;
                const optgroup = document.createElement('optgroup');
                optgroup.label = group.label;
                for (const font of group.fonts) {
                    const option = document.createElement('option');
                    option.value = font.label;
                    const labelKey = `fontFamily${font.label.replace(/[^a-zA-Z]/g, '')}`;
                    const localized = getLocale(labelKey as any);
                    option.textContent = (localized && localized !== labelKey) ? localized : font.label;
                    if (font.label === currentValue) option.selected = true;
                    optgroup.appendChild(option);
                }
                fontSelect.appendChild(optgroup);
            }
        }

        const preview = currentWindow.querySelector('.kmod-tags-preview');
        if (preview) {
            const tags = getAllTags();
            preview.innerHTML = '';
            if (tags.length === 0) {
                preview.innerHTML = '<span style="color:rgba(255,255,255,0.2);font-size:13px;">Нет тегов</span>';
            } else {
                tags.forEach(t => {
                    const el = document.createElement('span');
                    el.className = 'kmod-tag-preview-item';
                    el.style.backgroundColor = t.color;
                    el.textContent = t.tagName;
                    preview.appendChild(el);
                });
            }
        }

        const list = currentWindow.querySelector('#kmod-templates-list');
        if (list) {
            const templates = getAllTemplates();
            list.innerHTML = '';
            if (templates.length === 0) {
                list.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.15);padding:8px 0;font-size:13px;">Нет шаблонов</div>';
            } else {
                templates.forEach(t => {
                    const item = document.createElement('div');
                    item.className = 'kmod-template-item';
                    item.innerHTML = `
                        <span class="kmod-template-command">${t.command}</span>
                        <span class="kmod-template-text">${t.text}</span>
                        <button class="kmod-template-delete" data-id="${t.id}">✕</button>
                    `;
                    const del = item.querySelector('.kmod-template-delete') as HTMLButtonElement | null;
                    del?.addEventListener('click', () => {
                        if (confirm(`Удалить шаблон "${t.command}"?`)) {
                            removeTemplate(t.id);
                            const newList = currentWindow?.querySelector('#kmod-templates-list');
                            if (newList) {
                                const newTemplates = getAllTemplates();
                                newList.innerHTML = '';
                                if (newTemplates.length === 0) {
                                    newList.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.15);padding:8px 0;font-size:13px;">Нет шаблонов</div>';
                                } else {
                                    newTemplates.forEach(nt => {
                                        const nel = document.createElement('div');
                                        nel.className = 'kmod-template-item';
                                        nel.innerHTML = `
                                            <span class="kmod-template-command">${nt.command}</span>
                                            <span class="kmod-template-text">${nt.text}</span>
                                            <button class="kmod-template-delete" data-id="${nt.id}">✕</button>
                                        `;
                                        const ndel = nel.querySelector('.kmod-template-delete') as HTMLButtonElement | null;
                                        ndel?.addEventListener('click', () => {
                                            if (confirm(`Удалить шаблон "${nt.command}"?`)) {
                                                removeTemplate(nt.id);
                                                closeModal();
                                                setTimeout(openSettingsModal, 150);
                                            }
                                        });
                                        newList.appendChild(nel);
                                    });
                                }
                            }
                        }
                    });
                    list.appendChild(item);
                });
            }
        }
    });

    document.body.appendChild(overlay);
    currentOverlay = overlay;
}

export function openSettingsModal(): void {
    if (currentOverlay) {
        closeModal();
        setTimeout(buildModal, 60);
    } else {
        buildModal();
    }
}

export function closeSettingsModal(): void {
    closeModal();
}

export function toggleSettingsModal(): void {
    if (currentOverlay) {
        closeModal();
    } else {
        openSettingsModal();
    }
}