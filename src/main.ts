/*
* @author: potemk.in
* @brief: Application bootstrap — initialization, feature application, DOM watcher, global API, error handling.
* @desc: Entry point that wires together the config, locales, storage, registry, UI, and the centralized DOM observer. Uses the new batch-based observer so features receive only the nodes that changed in the current frame, avoiding full-document rescans. Handles retry on init, global API exposure, crash screen, and cleanup.
*/

import { CONFIG } from './config';
import { locales, getLocale, initLocale } from './locales';
import { logger } from './core/logger';
import { storage } from './core/storage';
import { watchDOM, ObserverBatch } from './core/observer';
import {
    applyAllFeatures,
    applyFeature,
    applyOnMutations,
    isFeatureEnabled,
    toggleFeature,
} from './registry';
import { createVersionBadge } from './ui/versionBadge';
import { waitForSettingsAndCreateButtons } from './ui/buttons';
import { openSettingsModal } from './ui/settingsModal';
import {
    showLoader,
    hideLoader,
    showCrashScreen,
    isCrashScreenActive,
} from './ui/loader';
import { FEATURES } from './registry';
import { whenIdle } from './core/performance';
import { applyStoredFont } from './features/changeFont';
import { dumpScripts } from './features/dumpScripts';

// ============================================================
// STATE
// ============================================================

let initialized = false;
let initPromise: Promise<void> | null = null;
let unwatchDom: (() => void) | null = null;

const MAX_INIT_ATTEMPTS = 3;

// ============================================================
// HELPERS
// ============================================================

function isMaxSite(): boolean {
    try {
        return window.location.hostname.includes('max.ru');
    } catch {
        return false;
    }
}

function safeApplyAllFeatures(): void {
    try {
        applyAllFeatures();
    } catch (error) {
        logger.error('Failed to apply all features:', error);
    }
}

/**
 * Called on every batched DOM mutation.
 * The observer already batches by rAF, so no extra debounce needed.
 */
function handleMutations(batch: ObserverBatch): void {
    try {
        applyOnMutations(batch);
    } catch (error) {
        logger.error('Error in mutation handler:', error);
    }
}

// ============================================================
// INIT
// ============================================================

async function init(): Promise<void> {
    if (initialized) {
        logger.debug('Already initialized, skipping');
        return;
    }

    if (initPromise) {
        logger.debug('Initialization already in progress, waiting...');
        return initPromise;
    }

    initPromise = (async () => {
        let attempts = 0;
        while (attempts < MAX_INIT_ATTEMPTS) {
            try {
                attempts++;
                await doInit();
                initialized = true;
                logger.info(`✅ ${CONFIG.name} v${CONFIG.version} initialized successfully`);
                return;
            } catch (error) {
                logger.error(`Init attempt ${attempts}/${MAX_INIT_ATTEMPTS} failed:`, error);
                if (attempts >= MAX_INIT_ATTEMPTS) throw error;
                await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
            }
        }
    })();

    return initPromise;
}

async function doInit(): Promise<void> {
    if (!isMaxSite()) {
        logger.warn('Mod is not running on max.ru. Some features may not work.');
    }

    initLocale();
    logger.info(`🌐 Locale: ${getLocale('settingsTitle')}`);

    safeApplyAllFeatures();

    try {
        createVersionBadge(CONFIG.version);
    } catch (error) {
        logger.error('Failed to create version badge:', error);
    }

    try {
        whenIdle(() => {
            waitForSettingsAndCreateButtons();
        }, 2000);
    } catch (error) {
        logger.error('Failed to create settings buttons:', error);
    }

    // Single global observer — features subscribe to it via registry.
    // Main only dispatches the batch to the registry.
    if (!unwatchDom) {
        unwatchDom = watchDOM(handleMutations);
        logger.debug('DOM watcher started');
    }

    setupGlobalAPI();
    applyStoredFont();

    hideLoader();

    logger.info('✅ Mod initialized');
}

// ============================================================
// GLOBAL API
// ============================================================

function setupGlobalAPI(): void {
    if (typeof window === 'undefined') return;
    window.__kmax_dump_scripts = dumpScripts;

    window.kmod = {
        config: CONFIG,
        storage,
        locales,
        getLocale,
        utils: { logger },
        features: {
            toggleFeature,
            isFeatureEnabled,
            applyFeature,
            applyAllFeatures: safeApplyAllFeatures,
        },
        ui: { openSettingsModal },
        version: CONFIG.version,
    };

    logger.debug('✅ Global API available: window.kmod');
}

declare global {
    interface Window {
        kmod: {
            config: typeof CONFIG;
            storage: typeof storage;
            locales: typeof locales;
            getLocale: typeof getLocale;
            utils: { logger: typeof logger };
            features: {
                toggleFeature: typeof toggleFeature;
                isFeatureEnabled: typeof isFeatureEnabled;
                applyFeature: typeof applyFeature;
                applyAllFeatures: typeof applyAllFeatures;
            };
            ui: { openSettingsModal: typeof openSettingsModal };
            version: string;
        };
        __kmax_dump_scripts: typeof dumpScripts;
    }
}

// ============================================================
// BOOTSTRAP
// ============================================================

if (typeof window !== 'undefined') {
    showLoader();
}

const safeMode =
    typeof window !== 'undefined' &&
    localStorage.getItem('kmod_safe_mode') === 'true';

if (safeMode) {
    console.warn('[KMOD] 🛡️ Safe mode enabled — skipping initialization');
    setTimeout(() => {
        hideLoader();
        showCrashScreen({
            title: '🛡️ Безопасный режим',
            message:
                'Мод отключен в безопасном режиме. Чтобы включить снова — удалите kmod_safe_mode из localStorage.',
        });
    }, 500);
} else if (typeof window !== 'undefined') {
    const startInit = () => {
        whenIdle(() => {
            init().catch((error) => {
                hideLoader();
                showCrashScreen({
                    title: '💥 Ошибка инициализации',
                    message:
                        'Мод не смог загрузиться. Попробуйте перезагрузить страницу или отключить мод.',
                    error,
                    details: `Попытка инициализации на ${window.location.hostname}`,
                });
            });
        }, 1000);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startInit, { once: true });
    } else {
        startInit();
    }
}

// ============================================================
// GLOBAL ERROR HANDLING
// ============================================================

if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        const message = event.message || '';
        const filename = event.filename || '';
        const isKmodError =
            message.includes('kmod') ||
            message.includes('kMax') ||
            message.includes('KMOD') ||
            filename.includes('kmod') ||
            filename.includes('kMax');
        if (isKmodError && !isCrashScreenActive()) {
            hideLoader();
            showCrashScreen({
                title: '💥 Критическая ошибка мода',
                message: 'В работе мода произошла непредвиденная ошибка.',
                error: event.error || event.message,
                details: `${event.filename}:${event.lineno}:${event.colno}`,
            });
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const reasonStr = String(reason || '');
        const stack = reason && typeof reason === 'object' ? reason.stack || '' : '';
        const isKmodRejection =
            stack.includes('kmod') ||
            stack.includes('kMax') ||
            reasonStr.includes('kmod') ||
            reasonStr.includes('kMax');
        if (isKmodRejection && !isCrashScreenActive()) {
            hideLoader();
            showCrashScreen({
                title: '💥 Необработанная ошибка',
                message: 'В работе мода произошла непредвиденная ошибка.',
                error: reason,
            });
        }
    });
}

// ============================================================
// CLEANUP
// ============================================================

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (unwatchDom) {
            unwatchDom();
            unwatchDom = null;
        }
        logger.debug('Cleanup completed');
    });
}

export { init, isMaxSite, handleMutations };