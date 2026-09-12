/*
* @author: potemk.in
* @brief: Static config — selectors, texts, storage keys, tracer patterns, fonts.
* @desc: Central source of truth for all hardcoded selectors and constants.
*       Font entries now carry an optional `labelKey` (translation key in Locale)
*       so settingsModal doesn't need to build it dynamically from the label.
*       Kept `as const` for narrow literal types on the font values.
*/

// ============================================================
// OFFSETS
// ============================================================

export const OFFSETS = {
    classes: {
        name: 'span.text.svelte-1riu5uh',
        phone: 'description.weight-400.text-align-left.text-tertiary',
        settingsTab: '.settingsTab.svelte-6bkz6t',
        photoContainer: '.content.svelte-2k9gk6',
        mover: '.mover.svelte-17vzkrm',
        headerTitle: '#aside-header-title',
        stories: '.storiesStack.svelte-1rr6jx2',
        storyItem: '.storiesStack .avatarStoryRingWrapper.svelte-6ybo81',
        phoneElement: '.phone.svelte-6bkz6t',
        sferumButton: '.item.svelte-6bkz6t',
        chatList: '.scrollable .content .item.svelte-rg2upy',
        chatItem: '.wrapper.svelte-q2jdqb',
        chatItemSelected: '.wrapper.svelte-q2jdqb .cell--selected',
        chatItemTitle: '.cell .title.svelte-q2jdqb .text.svelte-1riu5uh',
        chatItemMessage: '.cell .text.svelte-q2jdqb',
        chatItemAvatar: '.avatar.svelte-1gp4c0a .avatarImage',
        chatItemBadge: '.cell .indicator .badgeIcon',
        chatItemTime: '.cell .time.svelte-q2jdqb',
        chatItemPinnedIcon: '.cell .pinned.svelte-q2jdqb',
        chatItemMenuButton: '.actions .menuButton.svelte-q2jdqb',
        chatItemReadMarker: '.cell .readMarker.svelte-q2jdqb',
        mainChatMessage: '.block .messageWrapper .message.svelte-1kh0oxy',
        mainChatMessageIncoming: '.message[data-bubbles-variant="incoming"]',
        mainChatMessageOutgoing: '.message[data-bubbles-variant="outgoing"]',
        mainChatMessageText: '.text.svelte-1htnb3l',
        mainChatMessageMeta: '.meta.svelte-1htnb3l',
        mainChatMessageTime: '.meta.svelte-13lobfv .text',
        mainChatMessageStatus: '.meta .indicators.svelte-13lobfv svg',
        mainChatMessageReactions: '.reactions.svelte-xkv7l2',
        mainChatMessageReply: '.mark.svelte-m3np2o',
        mainChatMessageSticker: '.sticker.svelte-19cataq',
        mainChatMessageVoice: '.attachAudio.svelte-15vy73c',
        mainChatMessageImage: '.media .grid .tile .image',
        mainChatDateSeparator: '.capsule.svelte-3850xr',
        mainChatScrollButton: '.scrollButtonContainer .button.svelte-1snxxha',
        profileButton: '.main.svelte-1hrr6vf.content--clickable',
        headerBackButton: '.header .button--small .content svg',
        callAudioButton: '.header .actions .button:first-child',
        callVideoButton: '.header .actions .button:nth-child(2)',
        searchButton: '.header .actions .button:nth-child(3)',
        navigationButtonAll: '.navigation .item:first-child .button',
        navigationButtonContacts: '.navigation .bottomGroup .button:nth-child(1)',
        navigationButtonCalls: '.navigation .bottomGroup .button:nth-child(2)',
        navigationButtonSettings: '.navigation .settings .button',
        composer: '.composer.svelte-nwz8cp',
        composerInput: '.contenteditable.svelte-1k31az8',
        composerSendButton: '.btn.svelte-nwz8cp .button--primary',
        composerStickerButton: '.btn.svelte-nwz8cp .button .content svg use[href="#icon_sticker"]',
        composerVoiceButton: '.btn.svelte-nwz8cp .button .content svg use[href="#icon_microphone"]',
        composerAttachButton: '.btn.svelte-nwz8cp .button .content svg use[href="#icon_attachment"]',
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
        },
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
            'perf/upload',
        ],
        storageKeys: ['device', 'session', 'user', 'uuid', 'id'],
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
            'pte',
        ],
    },

    betaTesters: ['Тимоха', 'Тимофей Борин', 'Александр Потемкин'],
} as const;

// ============================================================
// FONTS
// ============================================================

export interface SystemFont {
    readonly value: string;
    readonly label: string;
    readonly labelKey: string;
}

export interface GoogleFont {
    readonly value: string;
    readonly label: string;
    readonly labelKey: string;
    readonly url: string;
}

export const FONTS = {
    system: [
        { value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', label: 'System UI',       labelKey: 'fontFamilySystemUI' },
        { value: 'Arial, Helvetica, sans-serif',                                                 label: 'Arial',           labelKey: 'fontFamilyArial' },
        { value: 'Arial Black, Gadget, sans-serif',                                              label: 'Arial Black',     labelKey: 'fontFamilyArialBlack' },
        { value: 'Georgia, serif',                                                               label: 'Georgia',         labelKey: 'fontFamilyGeorgia' },
        { value: 'Times New Roman, Times, serif',                                                label: 'Times New Roman', labelKey: 'fontFamilyTimesNewRoman' },
        { value: 'Courier New, monospace',                                                       label: 'Courier New',     labelKey: 'fontFamilyCourierNew' },
        { value: 'Verdana, Geneva, sans-serif',                                                  label: 'Verdana',         labelKey: 'fontFamilyVerdana' },
        { value: 'Tahoma, sans-serif',                                                           label: 'Tahoma',          labelKey: 'fontFamilyTahoma' },
        { value: 'Trebuchet MS, sans-serif',                                                     label: 'Trebuchet MS',    labelKey: 'fontFamilyTrebuchetMS' },
        { value: 'Impact, Charcoal, sans-serif',                                                 label: 'Impact',          labelKey: 'fontFamilyImpact' },
        { value: 'Comic Sans MS, cursive',                                                       label: 'Comic Sans MS',   labelKey: 'fontFamilyComicSansMS' },
        { value: 'Lucida Sans Unicode, Lucida Grande, sans-serif',                               label: 'Lucida Sans',     labelKey: 'fontFamilyLucidaSans' },
        { value: 'Geneva, Tahoma, sans-serif',                                                   label: 'Geneva',          labelKey: 'fontFamilyGeneva' },
        { value: 'Palatino Linotype, Book Antiqua, Palatino, serif',                             label: 'Palatino',        labelKey: 'fontFamilyPalatino' },
        { value: 'Bookman Old Style, serif',                                                     label: 'Bookman',         labelKey: 'fontFamilyBookman' },
        { value: 'Garamond, serif',                                                              label: 'Garamond',        labelKey: 'fontFamilyGaramond' },
        { value: 'Helvetica, sans-serif',                                                        label: 'Helvetica',       labelKey: 'fontFamilyHelvetica' },
        { value: 'Franklin Gothic Medium, sans-serif',                                           label: 'Franklin Gothic', labelKey: 'fontFamilyFranklinGothic' },
        { value: 'Century Gothic, sans-serif',                                                   label: 'Century Gothic',  labelKey: 'fontFamilyCenturyGothic' },
        { value: 'Copperplate, Copperplate Gothic Light, sans-serif',                            label: 'Copperplate',     labelKey: 'fontFamilyCopperplate' },
        { value: 'Baskerville, serif',                                                           label: 'Baskerville',     labelKey: 'fontFamilyBaskerville' },
    ] as readonly SystemFont[],
    google: [
        { value: "'Inter', sans-serif",             label: 'Inter',             labelKey: 'fontFamilyInter',             url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Roboto', sans-serif",            label: 'Roboto',            labelKey: 'fontFamilyRoboto',            url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap' },
        { value: "'Open Sans', sans-serif",         label: 'Open Sans',         labelKey: 'fontFamilyOpenSans',          url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap' },
        { value: "'Montserrat', sans-serif",        label: 'Montserrat',        labelKey: 'fontFamilyMontserrat',        url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Oswald', sans-serif",            label: 'Oswald',            labelKey: 'fontFamilyOswald',            url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap' },
        { value: "'Raleway', sans-serif",           label: 'Raleway',           labelKey: 'fontFamilyRaleway',           url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Lato', sans-serif",              label: 'Lato',              labelKey: 'fontFamilyLato',              url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap' },
        { value: "'Playfair Display', serif",       label: 'Playfair Display',  labelKey: 'fontFamilyPlayfairDisplay',   url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Merriweather', serif",           label: 'Merriweather',      labelKey: 'fontFamilyMerriweather',      url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap' },
        { value: "'Ubuntu', sans-serif",            label: 'Ubuntu',            labelKey: 'fontFamilyUbuntu',            url: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap' },
        { value: "'Nunito', sans-serif",            label: 'Nunito',            labelKey: 'fontFamilyNunito',            url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap' },
        { value: "'Poppins', sans-serif",           label: 'Poppins',           labelKey: 'fontFamilyPoppins',           url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Quicksand', sans-serif",         label: 'Quicksand',         labelKey: 'fontFamilyQuicksand',         url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap' },
        { value: "'Fira Sans', sans-serif",         label: 'Fira Sans',         labelKey: 'fontFamilyFiraSans',          url: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Source Sans Pro', sans-serif",   label: 'Source Sans Pro',   labelKey: 'fontFamilySourceSansPro',     url: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700;900&display=swap' },
        { value: "'PT Sans', sans-serif",           label: 'PT Sans',           labelKey: 'fontFamilyPTSans',            url: 'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap' },
        { value: "'IBM Plex Sans', sans-serif",     label: 'IBM Plex Sans',     labelKey: 'fontFamilyIBMPlexSans',       url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
        { value: "'Manrope', sans-serif",           label: 'Manrope',           labelKey: 'fontFamilyManrope',           url: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap' },
        { value: "'JetBrains Mono', monospace",     label: 'JetBrains Mono',    labelKey: 'fontFamilyJetBrainsMono',     url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap' },
        { value: "'Caveat', cursive",               label: 'Caveat',            labelKey: 'fontFamilyCaveat',            url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap' },
        { value: "'Marck Script', cursive",         label: 'Marck Script',      labelKey: 'fontFamilyMarckScript',       url: 'https://fonts.googleapis.com/css2?family=Marck+Script&display=swap' },
    ] as readonly GoogleFont[],
} as const;

export type FontOption = SystemFont | GoogleFont;
export type FontCategory = 'system' | 'google';