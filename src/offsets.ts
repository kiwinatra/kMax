// src/offsets.ts
export const OFFSETS = {
    classes: {
        name: 'span.text.svelte-1riu5uh',  // ← обновили
        phone: 'description.weight-400.text-align-left.text-tertiary',
        phoneElement: '.phone.svelte-6bkz6t',
        sferumButton: '.item.svelte-6bkz6t',
        settingsTab: '.settingsTab.svelte-6bkz6t',
        stories: '.storiesStackItem',
        photoContainer: '.content.svelte-2k9gk6',
        mover: '.mover.svelte-17vzkrm',
        headerTitle: '#aside-header-title',
    },

    texts: {
        sferum: 'Войти в Cферум',
        settings: 'Settings',
        settingsRu: 'Настройки',
    },

    storage: {
        prefix: 'kmod_',
        keys: {
            hideStories: 'hideStories',
            hideSferum: 'hideSferum',
            replaceTitle: 'replaceTitle',
            hidePhone: 'hidePhone',
            blockAnalytics: 'blockAnalytics',
            showCrown: 'showCrown',
            showMetadata: 'showMetadata',
            replaceMax: 'replaceMax',
            language: 'language',
        }
    },

    tracer: {
        patterns: [
            'apptracer',
            'tracer',
            'analytics',
            'telemetry',
            'sdk-api.apptracer.ru',
            'crash_token',
            'track_session',
            'uploadBatch',
            'uploadSession',
            'uploadSessionInfo',
            'setRunning',
            'tracerMain',
            'TracerSDK2',
            't.instance',
            'perf/upload'
        ],
        storageKeys: [
            'device',
            'session',
            'user',
            'uuid',
            'id'
        ],
        globalObjects: [
            'TracerSDK2',
            'tracerMain',
            'instance',
            'Tracer',
            'tracer',
            'at',
            'ot',
            'ct',
            'mn',
            'pte',
            'Rte',
            'vte',
            'cne',
            'Pre',
            'vme',
            'Wz',
            'uploadSessionInfo',
            'setRunning',
            'lne',
            'une',
            'l',
            'upload',
            'pte'
        ]
    },

    betaTesters: [
        'Тимоха',
        'Тимофей Борин',
        'Александр Потемкин',
    ],
};