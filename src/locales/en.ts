/*
 * @author: potemk.in
 * @brief: English locale dictionary.
 * @desc: Fully typed against Locale. Contains every key used by the UI.
 */

import type { Locale } from '../types';

export const en: Locale = {
    // ===== HEADERS =====
    settingsTitle: 'kMax Mod Settings',
    settingsSubtitle: 'Manage additional features',

    // ===== SECTIONS =====
    sectionGeneral: 'General',
    sectionSecurity: 'Security',
    sectionAppearance: 'Appearance',
    sectionMedia: 'Media',
    sectionOther: 'Other',
    sectionLanguage: 'Language',
    sectionAbout: 'About',
    sectionChats: 'Chats',

    // ===== SECTION DESCRIPTIONS =====
    sectionGeneralDesc: 'Interface and display settings',
    sectionSecurityDesc: 'Privacy and confidentiality protection',
    sectionAppearanceDesc: 'Visual style customization',
    sectionMediaDesc: 'Photo and content settings',
    sectionOtherDesc: 'Additional features',
    sectionLanguageDesc: 'Interface language selection',
    sectionAboutDesc: 'Version and developer information',
    sectionChatsDesc: 'Manage chat tags and templates',

    // ===== GENERAL =====
    hideStoriesLabel: 'Hide stories',
    hideStoriesDesc: 'Hides the stories block in the message feed',

    hideSferumLabel: 'Hide Sferum button',
    hideSferumDesc: 'Removes the "Sign in to Sferum" button from the interface',

    // ===== SECURITY =====
    blockAnalyticsLabel: 'Block analytics',
    blockAnalyticsDesc: 'Spoofs tracker identifiers to protect your privacy',

    hidePhoneLabel: 'Hide phone number',
    hidePhoneDesc: 'Hides your phone number in your profile',

    // ===== APPEARANCE =====
    showCrownLabel: 'Crown for beta testers',
    showCrownDesc: 'Highlights beta testers’ names in gold and adds a 👑 icon',

    replaceTitleLabel: 'kMax in title',
    replaceTitleDesc: 'Adds the prefix "kMax | " to the page title',

    fontFamilyLabel: 'Font',
    fontFamilyDesc: 'Choose a font for the entire site',

    // ===== MEDIA =====
    showMetadataLabel: 'Photo metadata',
    showMetadataDesc: 'Adds a button with information about photo size, format, and upload date',

    // ===== OTHER =====
    replaceMaxLabel: 'Replace Max → MAX',
    replaceMaxDesc: 'Replaces all occurrences of "Max" with "MAX" in page text',

    logViewLabel: '📡 Full logging',
    logViewDesc: 'Shows all logs, events, requests, and errors in real time',

    // ===== CHATS =====
    chatTagsLabel: 'Chat tags',
    chatTagsDesc: 'Add colored tags to chats for convenient organization',

    templatesLabel: 'Reply templates',
    templatesDesc: 'Quick replies via /command in the input field',

    // ===== LANGUAGE =====
    languageLabel: 'Interface language',
    languageRu: 'Russian',
    languageEn: 'English',

    // ===== ABOUT =====
    aboutName: 'kMax Mod',
    aboutVersion: 'Version',
    aboutAuthor: 'Author',
    aboutDescription: 'A mod for max.ru with additional features for convenience and personalization.',

    // ===== BUTTONS =====
    saveButton: 'Save',
    resetButton: 'Reset all',
    resetConfirm: 'Are you sure you want to reset all settings?',
    closeButton: 'Close',

    // ===== STATUSES =====
    statusActive: 'Active',
    statusEnabled: 'Enabled',
    statusDisabled: 'Disabled',

    // ===== UI =====
    toggleOn: 'On',
    toggleOff: 'Off',
    backToSettings: '← Back to settings',

    // ===== FONT LABELS (SYSTEM) =====
    fontFamilySystemUI: 'System UI',
    fontFamilyArial: 'Arial',
    fontFamilyArialBlack: 'Arial Black',
    fontFamilyGeorgia: 'Georgia',
    fontFamilyTimesNewRoman: 'Times New Roman',
    fontFamilyCourierNew: 'Courier New',
    fontFamilyVerdana: 'Verdana',
    fontFamilyTahoma: 'Tahoma',
    fontFamilyTrebuchetMS: 'Trebuchet MS',
    fontFamilyImpact: 'Impact',
    fontFamilyComicSansMS: 'Comic Sans MS',
    fontFamilyLucidaSans: 'Lucida Sans',
    fontFamilyGeneva: 'Geneva',
    fontFamilyPalatino: 'Palatino',
    fontFamilyBookman: 'Bookman',
    fontFamilyGaramond: 'Garamond',
    fontFamilyHelvetica: 'Helvetica',
    fontFamilyFranklinGothic: 'Franklin Gothic',
    fontFamilyCenturyGothic: 'Century Gothic',
    fontFamilyCopperplate: 'Copperplate',
    fontFamilyBaskerville: 'Baskerville',

    // ===== FONT LABELS (GOOGLE) =====
    fontFamilyInter: 'Inter',
    fontFamilyRoboto: 'Roboto',
    fontFamilyOpenSans: 'Open Sans',
    fontFamilyMontserrat: 'Montserrat',
    fontFamilyOswald: 'Oswald',
    fontFamilyRaleway: 'Raleway',
    fontFamilyLato: 'Lato',
    fontFamilyPlayfairDisplay: 'Playfair Display',
    fontFamilyMerriweather: 'Merriweather',
    fontFamilyUbuntu: 'Ubuntu',
    fontFamilyNunito: 'Nunito',
    fontFamilyPoppins: 'Poppins',
    fontFamilyQuicksand: 'Quicksand',
    fontFamilyFiraSans: 'Fira Sans',
    fontFamilySourceSansPro: 'Source Sans Pro',
    fontFamilyPTSans: 'PT Sans',
    fontFamilyIBMPlexSans: 'IBM Plex Sans',
    fontFamilyManrope: 'Manrope',
    fontFamilyJetBrainsMono: 'JetBrains Mono',
    fontFamilyCaveat: 'Caveat',
    fontFamilyMarckScript: 'Marck Script',

    // ===== UPDATES =====
    checkUpdatesButton: 'Check for updates',
    checkUpdatesChecking: 'Checking...',
    checkUpdatesUpToDate: 'You have the latest version installed',
    checkUpdatesAvailable: 'Update available!',
    checkUpdatesFailed: 'Failed to check for updates',
    checkUpdatesNoLoader: 'You are not running through the loader. Please update manually.',
};