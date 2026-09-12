/*
* @author: potemk.in
* @brief: English locale dictionary.
* @desc: Fully typed against Locale. Contains every key used by the UI.
*       All font labels are in English (not a mix of ru/en like before).
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
    sectionLanguageDesc: 'Select interface language',
    sectionAboutDesc: 'Version and developer information',
    sectionChatsDesc: 'Manage tags and templates for chats',

    // ===== GENERAL =====
    hideStoriesLabel: 'Hide stories',
    hideStoriesDesc: 'Hides the stories block in the feed',

    hideSferumLabel: 'Hide Sferum button',
    hideSferumDesc: 'Removes the "Sign in to Sferum" button from the interface',

    // ===== SECURITY =====
    blockAnalyticsLabel: 'Block analytics',
    blockAnalyticsDesc: 'Replaces tracker IDs with fake ones to protect your privacy',

    hidePhoneLabel: 'Hide phone number',
    hidePhoneDesc: 'Hides your phone number in your profile',

    // ===== APPEARANCE =====
    showCrownLabel: 'Beta Tester crown',
    showCrownDesc: 'Highlights beta tester names with gold color and adds 👑',

    replaceTitleLabel: 'kMax in title',
    replaceTitleDesc: 'Adds "kMax | " prefix to the page title',

    fontFamilyLabel: 'Font Family',
    fontFamilyDesc: 'Select font for the whole site',

    // ===== MEDIA =====
    showMetadataLabel: 'Photo Metadata',
    showMetadataDesc: 'Adds a button with photo information: size, format, and upload date',

    // ===== OTHER =====
    replaceMaxLabel: 'Replace Max → MAX',
    replaceMaxDesc: 'Replaces all "Max" mentions with "MAX" on the page',

    logViewLabel: '📡 Log Everything',
    logViewDesc: 'Shows all logs, events, requests and errors in real time',

    // ===== CHATS =====
    chatTagsLabel: 'Chat Tags',
    chatTagsDesc: 'Add colored tags to chats for easy organization',

    templatesLabel: 'Reply Templates',
    templatesDesc: 'Quick replies via /command in the input field',

    // ===== LANGUAGE =====
    languageLabel: 'Interface language',
    languageRu: 'Русский',
    languageEn: 'English',

    // ===== ABOUT =====
    aboutName: 'kMax Mod',
    aboutVersion: 'Version',
    aboutAuthor: 'Author',
    aboutDescription: 'Mod for max.ru with additional features for convenience and customization.',

    // ===== BUTTONS =====
    saveButton: 'Save',
    resetButton: 'Reset All',
    resetConfirm: 'Are you sure you want to reset all settings?',
    closeButton: 'Close',

    // ===== STATUSES =====
    statusActive: 'Active',
    statusEnabled: 'On',
    statusDisabled: 'Off',

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
};