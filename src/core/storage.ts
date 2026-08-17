type StorageKey = 
    | 'hideStories' 
    | 'hideSferum' 
    | 'replaceTitle' 
    | 'hidePhone' 
    | 'blockAnalytics' 
    | 'showCrown' 
    | 'showMetadata' 
    | 'language';

interface Settings {
    hideStories: boolean;
    hideSferum: boolean;
    replaceTitle: boolean;
    hidePhone: boolean;
    blockAnalytics: boolean;
    showCrown: boolean;
    showMetadata: boolean;
    language: 'ru' | 'en';
}

const DEFAULTS: Settings = {
    hideStories: false,
    hideSferum: false,
    replaceTitle: false,
    hidePhone: false,
    blockAnalytics: false,
    showCrown: false,
    showMetadata: false,
    language: 'ru',
};

const PREFIX = 'kmod_';

export const storage = {
    get<T = unknown>(key: StorageKey): T | null {
        try {
            const value = localStorage.getItem(PREFIX + key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    },

    set<T = unknown>(key: StorageKey, value: T): void {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage set error:', error);
        }
    },

    remove(key: StorageKey): void {
        try {
            localStorage.removeItem(PREFIX + key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    },

    getBoolean(key: StorageKey): boolean {
        const value = this.get<boolean>(key);
        return value ?? false;
    },

    setBoolean(key: StorageKey, value: boolean): void {
        this.set<boolean>(key, value);
    },

    getAll(): Settings {
        return {
            hideStories: this.getBoolean('hideStories'),
            hideSferum: this.getBoolean('hideSferum'),
            replaceTitle: this.getBoolean('replaceTitle'),
            hidePhone: this.getBoolean('hidePhone'),
            blockAnalytics: this.getBoolean('blockAnalytics'),
            showCrown: this.getBoolean('showCrown'),
            showMetadata: this.getBoolean('showMetadata'),
            language: this.get<'ru' | 'en'>('language') || 'ru',
        };
    },

    reset(): void {
        this.remove('hideStories');
        this.remove('hideSferum');
        this.remove('replaceTitle');
        this.remove('hidePhone');
        this.remove('blockAnalytics');
        this.remove('showCrown');
        this.remove('showMetadata');
        this.remove('language');
    },

    resetToDefaults(): void {
        this.set('hideStories', DEFAULTS.hideStories);
        this.set('hideSferum', DEFAULTS.hideSferum);
        this.set('replaceTitle', DEFAULTS.replaceTitle);
        this.set('hidePhone', DEFAULTS.hidePhone);
        this.set('blockAnalytics', DEFAULTS.blockAnalytics);
        this.set('showCrown', DEFAULTS.showCrown);
        this.set('showMetadata', DEFAULTS.showMetadata);
        this.set('language', DEFAULTS.language);
    },

    toggle(key: StorageKey): boolean {
        const current = this.getBoolean(key);
        const newValue = !current;
        this.setBoolean(key, newValue);
        return newValue;
    },
};