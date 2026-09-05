// src/offsets.ts

export const OFFSETS = {
    classes: {
    // === СЕЛЕКТОРЫ ИЗ ТВОЕГО ПЕРВОНАЧАЛЬНОГО СПИСКА ===
    
    // Имя пользователя в списке чатов или в шапке диалога
    // Находится: в каждом элементе списка чатов (.cell .title) и в шапке открытого чата
    // При обновлении: искать span с классом .svelte-1riu5uh (уникальный для Svelte)
    name: 'span.text.svelte-1riu5uh',
    
    // Телефон (вероятно, в профиле пользователя)
    // Находится: в блоке описания профиля
    // При обновлении: искать элемент с этими классами (скорее всего, изменится)
    phone: 'description.weight-400.text-align-left.text-tertiary',
    
    // Кнопка/вкладка настроек
    // Находится: в левой навигационной панели (внизу)
    // При обновлении: искать по классу .settingsTab или по тексту "Settings"
    settingsTab: '.settingsTab.svelte-6bkz6t',
    
    // Контейнер с фото (вероятно, для загрузки аватара)
    // Находится: в профиле пользователя
    // При обновлении: искать по классу .content.svelte-2k9gk6
    photoContainer: '.content.svelte-2k9gk6',
    
    // Элемент для перетаскивания (вероятно, для изменения размера панели)
    // Находится: между панелью чатов и основным окном
    // При обновлении: искать по классу .mover.svelte-17vzkrm
    mover: '.mover.svelte-17vzkrm',
    
    // Заголовок панели (обычно "Chats")
    // Находится: в шапке левой панели
    // При обновлении: искать по ID #aside-header-title
    headerTitle: '#aside-header-title',
    
    // === НОВЫЕ СЕЛЕКТОРЫ (ДОБАВЛЕННЫЕ ПОСЛЕ АНАЛИЗА) ===
    
    // 1. Блок историй (Stories)
    // Находится: под шапкой в левой панели (над списком чатов)
    // При обновлении: искать div с классом .storiesStack.svelte-* (число может меняться)
    stories: '.storiesStack.svelte-1rr6jx2',
    
    // 2. Отдельный элемент истории
    // Находится: внутри блока историй (каждый круглый аватар)
    // При обновлении: искать .avatarStoryRingWrapper.svelte-* внутри .storiesStack
    storyItem: '.storiesStack .avatarStoryRingWrapper.svelte-6ybo81',
    
    // 3. Элемент телефона (возможно, в профиле)
    // Находится: в описании профиля пользователя
    // При обновлении: искать по классу .phone.svelte-* (если .svelte-6bkz6t - это профиль)
    phoneElement: '.phone.svelte-6bkz6t', // ← лучше уточнить, что это именно телефон
    
    // 4. Кнопка "Войти в Сферум"
    // Находится: в списке папок/каналов (первый элемент с иконкой Сферума)
    // При обновлении: искать .item.svelte-* с текстом "Сферум" или "Войти в Cферум"
    // Лучше искать по тексту, т.к. классы могут меняться
    sferumButton: '.item.svelte-6bkz6t', // ← логика поиска по тексту
    
    // 5. Список чатов (контейнер)
    // Находится: основная область со списком всех чатов
    // При обновлении: искать .scrollable .content .item.svelte-rg2upy
    chatList: '.scrollable .content .item.svelte-rg2upy',
    
    // 6. Элемент чата в списке
    // Находится: каждый отдельный чат в списке
    // При обновлении: искать .wrapper.svelte-q2jdqb
    chatItem: '.wrapper.svelte-q2jdqb',
    
    // 7. Выделенный чат в списке
    // Находится: активный/открытый чат с классом .cell--selected
    // При обновлении: искать .wrapper.svelte-q2jdqb .cell--selected
    chatItemSelected: '.wrapper.svelte-q2jdqb .cell--selected',
    
    // 8. Заголовок чата (имя собеседника или группы)
    // Находится: внутри элемента чата (.cell)
    // При обновлении: искать .cell .title.svelte-q2jdqb .text.svelte-1riu5uh
    chatItemTitle: '.cell .title.svelte-q2jdqb .text.svelte-1riu5uh',
    
    // 9. Текст последнего сообщения в чате
    // Находится: внутри элемента чата (.cell)
    // При обновлении: искать .cell .text.svelte-q2jdqb
    chatItemMessage: '.cell .text.svelte-q2jdqb',
    
    // 10. Аватар в списке чатов
    // Находится: внутри элемента чата (.cell)
    // При обновлении: искать .avatar.svelte-1gp4c0a .avatarImage
    chatItemAvatar: '.avatar.svelte-1gp4c0a .avatarImage',
    
    // 11. Бейдж с количеством непрочитанных
    // Находится: справа от названия чата (индикатор)
    // При обновлении: искать .cell .indicator .badgeIcon
    chatItemBadge: '.cell .indicator .badgeIcon',
    
    // 12. Время последнего сообщения
    // Находится: в правой части элемента чата (.meta)
    // При обновлении: искать .cell .time.svelte-q2jdqb
    chatItemTime: '.cell .time.svelte-q2jdqb',
    
    // 13. Иконка закрепленного чата
    // Находится: рядом со временем в элементе чата
    // При обновлении: искать .cell .pinned.svelte-q2jdqb
    chatItemPinnedIcon: '.cell .pinned.svelte-q2jdqb',
    
    // 14. Кнопка меню чата (три точки)
    // Находится: при наведении на элемент чата (справа)
    // При обновлении: искать .actions .menuButton.svelte-q2jdqb
    chatItemMenuButton: '.actions .menuButton.svelte-q2jdqb',
    
    // 15. Индикатор прочтения (галочки)
    // Находится: рядом со временем в элементе чата
    // При обновлении: искать .cell .readMarker.svelte-q2jdqb
    chatItemReadMarker: '.cell .readMarker.svelte-q2jdqb',
    
    // 16. Сообщение в диалоге (контейнер)
    // Находится: каждое сообщение в открытом чате
    // При обновлении: искать .block .messageWrapper .message.svelte-1kh0oxy
    mainChatMessage: '.block .messageWrapper .message.svelte-1kh0oxy',
    
    // 17. Входящее сообщение
    // Находится: сообщения от собеседника
    // При обновлении: искать [data-bubbles-variant="incoming"]
    mainChatMessageIncoming: '.message[data-bubbles-variant="incoming"]',
    
    // 18. Исходящее сообщение
    // Находится: отправленные сообщения пользователя
    // При обновлении: искать [data-bubbles-variant="outgoing"]
    mainChatMessageOutgoing: '.message[data-bubbles-variant="outgoing"]',
    
    // 19. Текст сообщения в диалоге
    // Находится: внутри блока сообщения
    // При обновлении: искать .text.svelte-1htnb3l
    mainChatMessageText: '.text.svelte-1htnb3l',
    
    // 20. Мета-информация сообщения (время, статус)
    // Находится: внизу блока сообщения
    // При обновлении: искать .meta.svelte-1htnb3l
    mainChatMessageMeta: '.meta.svelte-1htnb3l',
    
    // 21. Время сообщения
    // Находится: внутри мета-информации
    // При обновлении: искать .meta.svelte-13lobfv .text
    mainChatMessageTime: '.meta.svelte-13lobfv .text',
    
    // 22. Статус сообщения (прочитано/доставлено)
    // Находится: рядом со временем (иконка)
    // При обновлении: искать .meta .indicators.svelte-13lobfv svg
    mainChatMessageStatus: '.meta .indicators.svelte-13lobfv svg',
    
    // 23. Реакции на сообщение
    // Находится: под сообщением (если есть)
    // При обновлении: искать .reactions.svelte-xkv7l2
    mainChatMessageReactions: '.reactions.svelte-xkv7l2',
    
    // 24. Ответ на сообщение (реплай)
    // Находится: внутри сообщения (блок цитирования)
    // При обновлении: искать .mark.svelte-m3np2o
    mainChatMessageReply: '.mark.svelte-m3np2o',
    
    // 25. Стикер в сообщении
    // Находится: если сообщение - стикер
    // При обновлении: искать .sticker.svelte-19cataq
    mainChatMessageSticker: '.sticker.svelte-19cataq',
    
    // 26. Голосовое сообщение
    // Находится: если сообщение - аудио
    // При обновлении: искать .attachAudio.svelte-15vy73c
    mainChatMessageVoice: '.attachAudio.svelte-15vy73c',
    
    // 27. Изображение в сообщении
    // Находится: если сообщение - картинка
    // При обновлении: искать .media .grid .tile .image
    mainChatMessageImage: '.media .grid .tile .image',
    
    // 28. Разделитель дат в диалоге
    // Находится: между сообщениями разных дней
    // При обновлении: искать .capsule.svelte-3850xr
    mainChatDateSeparator: '.capsule.svelte-3850xr',
    
    // 29. Кнопка прокрутки вниз
    // Находится: в правом нижнем углу диалога
    // При обновлении: искать .scrollButtonContainer .button.svelte-1snxxha
    mainChatScrollButton: '.scrollButtonContainer .button.svelte-1snxxha',
    
    // 30. Кнопка профиля в шапке диалога
    // Находится: в шапке открытого чата (имя собеседника)
    // При обновлении: искать .main.svelte-1hrr6vf.content--clickable
    profileButton: '.main.svelte-1hrr6vf.content--clickable',
    
    // 31. Кнопка "Назад" в шапке диалога
    // Находится: в шапке открытого чата (слева)
    // При обновлении: искать по aria-label "Go back"
    headerBackButton: '.header .button--small .content svg',
    
    // 32. Кнопка аудиозвонка
    // Находится: в шапке открытого чата (иконка телефона)
    // При обновлении: искать .header .actions .button:first-child
    callAudioButton: '.header .actions .button:first-child',
    
    // 33. Кнопка видеозвонка
    // Находится: в шапке открытого чата (иконка камеры)
    // При обновлении: искать .header .actions .button:nth-child(2)
    callVideoButton: '.header .actions .button:nth-child(2)',
    
    // 34. Кнопка поиска
    // Находится: в шапке открытого чата (иконка лупы)
    // При обновлении: искать .header .actions .button:nth-child(3)
    searchButton: '.header .actions .button:nth-child(3)',
    
    // 35. Кнопка "Все" в навигации
    // Находится: в левой навигации (первая)
    // При обновлении: искать .navigation .item:first-child .button
    navigationButtonAll: '.navigation .item:first-child .button',
    
    // 36. Кнопка "Контакты" в навигации
    // Находится: в левой навигации (внизу)
    // При обновлении: искать .navigation .button .title:contains("Contacts")
    // Или точнее: .navigation .bottomGroup .button:nth-child(1)
    navigationButtonContacts: '.navigation .bottomGroup .button:nth-child(1)',
    
    // 37. Кнопка "Звонки" в навигации
    // Находится: в левой навигации (внизу)
    // При обновлении: искать .navigation .button .title:contains("Calls")
    // Или точнее: .navigation .bottomGroup .button:nth-child(2)
    navigationButtonCalls: '.navigation .bottomGroup .button:nth-child(2)',
    
    // 38. Кнопка "Настройки" в навигации
    // Находится: в левой навигации (внизу)
    // При обновлении: искать .navigation .settings .button
    navigationButtonSettings: '.navigation .settings .button',
    
    // 39. Поле ввода сообщения (композер)
    // Находится: внизу открытого чата
    // При обновлении: искать .composer.svelte-nwz8cp
    composer: '.composer.svelte-nwz8cp',
    
    // 40. Поле ввода текста
    // Находится: внутри композера
    // При обновлении: искать .contenteditable.svelte-1k31az8
    composerInput: '.contenteditable.svelte-1k31az8',
    
    // 41. Кнопка отправки сообщения
    // Находится: в композере (появляется при вводе текста)
    // При обновлении: искать .btn.svelte-nwz8cp .button--primary
    composerSendButton: '.btn.svelte-nwz8cp .button--primary',
    
    // 42. Кнопка "Стикер" в композере
    // Находится: в композере (иконка стикера)
    // При обновлении: искать .btn.svelte-nwz8cp .button .content svg use[href="#icon_sticker"]
    composerStickerButton: '.btn.svelte-nwz8cp .button .content svg use[href="#icon_sticker"]',
    
    // 43. Кнопка "Голосовое" в композере
    // Находится: в композере (иконка микрофона)
    // При обновлении: искать .btn.svelte-nwz8cp .button .content svg use[href="#icon_microphone"]
    composerVoiceButton: '.btn.svelte-nwz8cp .button .content svg use[href="#icon_microphone"]',
    
    // 44. Кнопка "Прикрепить файл" в композере
    // Находится: в композере (иконка скрепки)
    // При обновлении: искать .btn.svelte-nwz8cp .button .content svg use[href="#icon_attachment"]
    composerAttachButton: '.btn.svelte-nwz8cp .button .content svg use[href="#icon_attachment"]'
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
} as const;

export const FONTS = {
    // Системные шрифты (без загрузки)
    system: [
        { value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', label: 'System UI' },
        { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
        { value: 'Arial Black, Gadget, sans-serif', label: 'Arial Black' },
        { value: 'Georgia, serif', label: 'Georgia' },
        { value: 'Times New Roman, Times, serif', label: 'Times New Roman' },
        { value: 'Courier New, monospace', label: 'Courier New' },
        { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
        { value: 'Tahoma, sans-serif', label: 'Tahoma' },
        { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
        { value: 'Impact, Charcoal, sans-serif', label: 'Impact' },
        { value: 'Comic Sans MS, cursive', label: 'Comic Sans MS' },
        { value: 'Lucida Sans Unicode, Lucida Grande, sans-serif', label: 'Lucida Sans' },
        { value: 'Geneva, Tahoma, sans-serif', label: 'Geneva' },
        { value: 'Palatino Linotype, Book Antiqua, Palatino, serif', label: 'Palatino' },
        { value: 'Bookman Old Style, serif', label: 'Bookman' },
        { value: 'Garamond, serif', label: 'Garamond' },
        { value: 'Helvetica, sans-serif', label: 'Helvetica' },
        { value: 'Franklin Gothic Medium, sans-serif', label: 'Franklin Gothic' },
        { value: 'Century Gothic, sans-serif', label: 'Century Gothic' },
        { value: 'Copperplate, Copperplate Gothic Light, sans-serif', label: 'Copperplate' },
        { value: 'Baskerville, serif', label: 'Baskerville' },
    ],
    // Google Fonts (загружаются из сети)
    google: [
        { value: "'Inter', sans-serif", label: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Roboto', sans-serif", label: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap' },
        { value: "'Open Sans', sans-serif", label: 'Open Sans', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap' },
        { value: "'Montserrat', sans-serif", label: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Oswald', sans-serif", label: 'Oswald', url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap' },
        { value: "'Raleway', sans-serif", label: 'Raleway', url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Lato', sans-serif", label: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap' },
        { value: "'Playfair Display', serif", label: 'Playfair Display', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Merriweather', serif", label: 'Merriweather', url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap' },
        { value: "'Ubuntu', sans-serif", label: 'Ubuntu', url: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap' },
        { value: "'Nunito', sans-serif", label: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap' },
        { value: "'Poppins', sans-serif", label: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Quicksand', sans-serif", label: 'Quicksand', url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap' },
        { value: "'Fira Sans', sans-serif", label: 'Fira Sans', url: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700;800;900&display=swap' },
        { value: "'Source Sans Pro', sans-serif", label: 'Source Sans Pro', url: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700;900&display=swap' },
        { value: "'PT Sans', sans-serif", label: 'PT Sans', url: 'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap' },
        { value: "'IBM Plex Sans', sans-serif", label: 'IBM Plex Sans', url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
        { value: "'Manrope', sans-serif", label: 'Manrope', url: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap' },
        { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono', url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap' },
        { value: "'Caveat', cursive", label: 'Caveat', url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap' },
        { value: "'Marck Script', cursive", label: 'Marck Script', url: 'https://fonts.googleapis.com/css2?family=Marck+Script&display=swap' },
    ],
} as const;

// Типы для шрифтов
export type FontOption = typeof FONTS.system[number] | typeof FONTS.google[number];
export type FontCategory = 'system' | 'google';