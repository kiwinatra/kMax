// src/features/addCrown/index.ts
import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qsa, createElement } from '../../core/dom';
import { OFFSETS } from '../../offsets';

let isEnabled = false;
let unwatch: (() => void) | null = null;
let checkInterval: number | null = null;

function isBetaTester(name: string): boolean {
    if (!name) return false;
    
    const trimmed = name.trim().toLowerCase();
    
    return OFFSETS.betaTesters.some(tester => {
        const testerLower = tester.trim().toLowerCase();
        return trimmed === testerLower || 
               trimmed.includes(testerLower) || 
               testerLower.includes(trimmed);
    });
}

function findNameElements(): Element[] {
    // Пробуем основной селектор из offsets
    let elements = qsa(OFFSETS.classes.name);
    
    if (elements.length > 0) {
        return elements;
    }
    
    // Fallback: ищем все span с классом text
    const fallbackSelectors = [
        'span.text.svelte-1riu5uh',
        '.text.svelte-1riu5uh',
        'span[class*="text"]',
        'span.text'
    ];
    
    for (const selector of fallbackSelectors) {
        const found = qsa(selector);
        if (found.length > 0) {
            logger.debug(`Found ${found.length} name elements with fallback selector: ${selector}`);
            return found;
        }
    }
    
    return [];
}

function makeNameGold(nameElement: HTMLElement): void {
    // Пропускаем, если уже обработано
    if (nameElement.dataset.kmodCrown === 'true') return;
    
    const name = nameElement.textContent?.trim() || '';
    if (!name) return;
    
    if (!isBetaTester(name)) return;
    
    // Помечаем как обработанное
    nameElement.dataset.kmodCrown = 'true';

    // Применяем стили
    nameElement.style.color = '#ffd700';
    nameElement.style.fontWeight = '700';
    nameElement.style.textShadow = '0 0 20px rgba(255, 215, 0, 0.4)';
    
    // Добавляем эмодзи короны, если её нет
    const currentText = nameElement.textContent || '';
    if (!currentText.includes('👑')) {
        nameElement.textContent = currentText + ' 👑';
    }
    
    logger.debug(`👑 Crown added to: ${nameElement.textContent}`);
}

function processPage(): void {
    // Проверяем состояние из storage, а не только isEnabled
    const enabled = storage.getBoolean('showCrown');
    if (!enabled) return;
    
    const nameElements = findNameElements();
    
    if (nameElements.length === 0) {
        return;
    }
    
    let processed = 0;
    let betaFound = 0;
    
    for (const el of nameElements) {
        const name = el.textContent?.trim() || '';
        if (name) {
            if (isBetaTester(name)) {
                betaFound++;
                makeNameGold(el as HTMLElement);
                processed++;
            }
        }
    }
    
    if (betaFound > 0) {
        logger.info(`👑 Found ${betaFound} beta tester(s), processed ${processed} new crowns`);
    }
}

export function apply(): void {
    // Проверяем состояние из storage
    const enabled = storage.getBoolean('showCrown');
    if (enabled) {
        processPage();
    } else {
        removeCrowns();
    }
}

function removeCrowns(): void {
    const nameElements = findNameElements();
    for (const el of nameElements) {
        const element = el as HTMLElement;
        element.style.color = '';
        element.style.fontWeight = '';
        element.style.textShadow = '';
        const currentText = element.textContent || '';
        element.textContent = currentText.replace(' 👑', '');
        delete element.dataset.kmodCrown;
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;

    logger.info('👑 Beta testers crown включена');
    logger.debug('Beta testers list:', OFFSETS.betaTesters);

    // Обрабатываем существующие элементы
    processPage();

    // Подписываемся на изменения DOM
    if (!unwatch) {
        unwatch = watchDOM(() => {
            processPage();
        });
    }

    // Агрессивная проверка каждую секунду
    if (!checkInterval) {
        checkInterval = window.setInterval(() => {
            processPage();
        }, 1000);
        logger.debug('Started aggressive checking interval (1s)');
    }
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;

    // Отписываемся от DOM-изменений
    if (unwatch) {
        unwatch();
        unwatch = null;
    }

    // Останавливаем интервал
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
        logger.debug('Stopped aggressive checking interval');
    }

    // Удаляем короны
    removeCrowns();

    logger.info('👑 Beta testers crown отключена');
}

export function toggle(): boolean {
    const current = storage.getBoolean('showCrown');
    const newState = !current;
    storage.setBoolean('showCrown', newState);

    if (newState) {
        enable();
    } else {
        disable();
    }

    return newState;
}