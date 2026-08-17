// src/main.ts
import { CONFIG } from './config';
import { locales, getLocale, initLocale } from './locales';
import { logger } from './core/logger';
import { storage } from './core/storage';
import { watchDOM } from './core/observer';
import { applyAllFeatures, applyFeature, isFeatureEnabled, toggleFeature } from './registry';
import { createVersionBadge } from './ui/versionBadge';
import { waitForSettingsAndCreateButtons } from './ui/buttons';
import { openSettingsModal, openFaqModal } from './ui/index';
import { FEATURES } from './registry';

let initialized = false;

function init(): void {
    if (initialized) return;
    initialized = true;

    initLocale();
    logger.info(`${CONFIG.name} v${CONFIG.version} loaded`);

    if (!window.location.hostname.includes('max.ru')) {
        logger.warn('Mod is not running on max.ru. Some features may not work.');
    }

    applyAllFeatures();
    createVersionBadge(CONFIG.version);
    waitForSettingsAndCreateButtons();

    watchDOM(() => {
        for (const key of Object.keys(FEATURES)) {
            if (isFeatureEnabled(key)) {
                applyFeature(key);
            }
        }
    });

    logger.info('✅ Mod initialized');
}

declare global {
    interface Window {
        kmod: {
            config: typeof CONFIG;
            storage: typeof storage;
            locales: typeof locales;
            getLocale: typeof getLocale;
            utils: {
                logger: typeof logger;
            };
            features: {
                toggleFeature: typeof toggleFeature;
                isFeatureEnabled: typeof isFeatureEnabled;
                applyFeature: typeof applyFeature;
                applyAllFeatures: typeof applyAllFeatures;
            };
            ui: {
                openSettingsModal: typeof openSettingsModal;
                openFaqModal: typeof openFaqModal;
            };
        };
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.kmod = {
    config: CONFIG,
    storage,
    locales,
    getLocale,
    utils: {
        logger,
    },
    features: {
        toggleFeature,
        isFeatureEnabled,
        applyFeature,
        applyAllFeatures,
    },
    ui: {
        openSettingsModal,
        openFaqModal,
    },
};

console.log('%c✅ API available: window.kmod', 'color: #4ade80; font-weight: bold;');