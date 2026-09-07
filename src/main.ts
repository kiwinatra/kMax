/*
* @author: potemk.in
* @brief: Main entry point for the application that handles initialization, feature application, DOM watching, and global error handling.
* @desc: This file is the core bootstrap module that initializes the entire application. It manages feature registration, DOM mutation observation, locale initialization, global API exposure, error handling, and crash recovery. It also controls the loading screen lifecycle and provides safe mode functionality.
*/

import { CONFIG } from './config';
import { locales, getLocale, initLocale } from './locales';
import { logger } from './core/logger';
import { storage } from './core/storage';
import { watchDOM } from './core/observer';
import { applyAllFeatures, applyFeature, isFeatureEnabled, toggleFeature } from './registry';
import { createVersionBadge } from './ui/versionBadge';
import { waitForSettingsAndCreateButtons } from './ui/buttons';
import { openSettingsModal } from './ui/settingsModal';
import { showLoader, hideLoader, showCrashScreen, isCrashScreenActive } from './ui/loader';
import { FEATURES } from './registry';
import { whenIdle, isTabVisible, onVisibilityChange } from './core/performance';
import { applyStoredFont } from './features/changeFont';
import { dumpScripts } from './features/dumpScripts';

let initialized = false;
let initPromise: Promise<void> | null = null;
let unwatchDom: (() => void) | null = null;
let domWatchTimeout: number | null = null;
let visibilityUnwatch: (() => void) | null = null;

const DOM_WATCH_DEBOUNCE = 500;
const MAX_INIT_ATTEMPTS = 3;

// Function for checking if the current site is max.ru
function isMaxSite(): boolean {
    try {
        return window.location.hostname.includes('max.ru');
    } catch {
        return false;
    }
}

// Function for safely applying all features with error handling
function safeApplyAllFeatures(): void {
    try {
        applyAllFeatures();
    } catch (error) {
        logger.error('Failed to apply all features:', error);
    }
}

// Function for handling DOM changes and reapplying features
function handleDomChanges(): void {
    if (!isTabVisible()) return;
    
    if (domWatchTimeout) {
        clearTimeout(domWatchTimeout);
    }
    domWatchTimeout = window.setTimeout(() => {
        domWatchTimeout = null;
        try {
            for (const key of Object.keys(FEATURES)) {
                try {
                    if (isFeatureEnabled(key)) {
                        applyFeature(key);
                    }
                } catch (error) {
                    logger.error(`Failed to apply feature "${key}" on DOM change:`, error);
                }
            }
        } catch (error) {
            logger.error('Error in DOM change handler:', error);
        }
    }, DOM_WATCH_DEBOUNCE);
}

// Function for initializing the application with retry logic
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
                await new Promise(resolve => setTimeout(resolve, 500 * attempts));
            }
        }
    })();

    return initPromise;
}

// Function for performing the actual initialization logic
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

    if (!unwatchDom) {
        unwatchDom = watchDOM(() => {
            handleDomChanges();
        });
        logger.debug('DOM watcher started');
    }

    if (!visibilityUnwatch) {
        visibilityUnwatch = onVisibilityChange((visible) => {
            if (visible) {
                handleDomChanges();
            }
        });
    }

    setupGlobalAPI();
    applyStoredFont();
    
    hideLoader();

    logger.info('✅ Mod initialized');
}

// Function for exposing global API on window object
function setupGlobalAPI(): void {
    if (typeof window === 'undefined') return;

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
    }
}

if (typeof window !== 'undefined') {
    showLoader();
}

const safeMode = typeof window !== 'undefined' && localStorage.getItem('kmod_safe_mode') === 'true';

if (safeMode) {
    console.warn('[KMOD] 🛡️ Safe mode enabled — skipping initialization');
    setTimeout(() => {
        hideLoader();
        showCrashScreen({
            title: '🛡️ Безопасный режим',
            message: 'Мод отключен в безопасном режиме. Чтобы включить снова — удалите kmod_safe_mode из localStorage.',
        });
    }, 500);
} else if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            whenIdle(() => {
                init().catch((error) => {
                    hideLoader();
                    showCrashScreen({
                        title: '💥 Ошибка инициализации',
                        message: 'Мод не смог загрузиться. Попробуйте перезагрузить страницу или отключить мод.',
                        error,
                        details: `Попытка инициализации на ${window.location.hostname}`,
                    });
                });
            }, 1500);
        });
    } else {
        whenIdle(() => {
            init().catch((error) => {
                hideLoader();
                showCrashScreen({
                    title: '💥 Ошибка инициализации',
                    message: 'Мод не смог загрузиться. Попробуйте перезагрузить страницу или отключить мод.',
                    error,
                    details: `Попытка инициализации на ${window.location.hostname}`,
                });
            });
        }, 1000);
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        const message = event.message || '';
        const filename = event.filename || '';
        if (message.includes('kmod') || message.includes('kMax') || message.includes('KMOD') ||
            filename.includes('kmod') || filename.includes('kMax')) {
            if (!isCrashScreenActive()) {
                hideLoader();
                showCrashScreen({
                    title: '💥 Критическая ошибка мода',
                    message: 'В работе мода произошла непредвиденная ошибка.',
                    error: event.error || event.message,
                    details: `${event.filename}:${event.lineno}:${event.colno}`,
                });
            }
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const reasonStr = String(reason || '');
        if (reason && typeof reason === 'object' && 
            (reason.stack?.includes('kmod') || reason.stack?.includes('kMax') ||
             reasonStr.includes('kmod') || reasonStr.includes('kMax'))) {
            if (!isCrashScreenActive()) {
                hideLoader();
                showCrashScreen({
                    title: '💥 Необработанная ошибка',
                    message: 'В работе мода произошла непредвиденная ошибка.',
                    error: reason,
                });
            }
        }
    });
}

export { init, isMaxSite, handleDomChanges };

window.addEventListener('beforeunload', () => {
    if (unwatchDom) {
        unwatchDom();
        unwatchDom = null;
    }
    if (domWatchTimeout) {
        clearTimeout(domWatchTimeout);
        domWatchTimeout = null;
    }
    if (visibilityUnwatch) {
        visibilityUnwatch();
        visibilityUnwatch = null;
    }
    logger.debug('Cleanup completed');
});