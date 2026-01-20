export type Language = "en" | "zh";

export interface TranslationResources {
  common: {
    title: string;
    settings: string;
    newChat: string;
    close: string;
    save: string;
    saving: string;
    cancel: string;
    send: string;
    stop: string;
    processing: string;
    noActions: string;
  };
  settings: {
    title: string;
    subtitle: string;
    language: string;
    theme: string;
    byok: string;
    byokDescription: string;
    aiHost: string;
    aiToken: string;
    aiModel: string;
    hostPlaceholder: string;
    tokenPlaceholder: string;
    modelPlaceholder: string;
    saveSuccess: string;
    saveError: string;
    testConnection: string;
    testing: string;
    testSuccess: string;
    testFailed: string;
    reset: string;
    resetConfirm: string;
    privacy: string;
    dataSharing: string;
    dataSharingEnabled: string;
    dataSharingDisabled: string;
    dataSharingDescription: string;
    privacyModeDescription: string;
    aboutUs: string;
    aboutDescription: string;
    starOnGithub: string;
    joinDiscord: string;
    joinWechat: string;
    sendEmail: string;
    followTwitter: string;
    feedback: string;
    general: string;
    aiConfiguration: string;
    selectProvider: string;
    searchProviders: string;
    noProvidersFound: string;
    getApiKey: string;
    current: string;
  };
  theme: {
    light: string;
    dark: string;
    system: string;
  };
  tooltip: {
    newChat: string;
    settings: string;
    close: string;
    stopResponse: string;
  };
  mode: {
    focus: string;
    background: string;
    selectMode: string;
    focusDescription: string;
    backgroundDescription: string;
  };
  ai: {
    thinking: string;
    streamingResponse: string;
    realtimeExecution: string;
    planningAgent: string;
    enhancedPlanning: string;
  };
  language: {
    en: string;
    zh: string;
  };
  input: {
    newLine: string;
    placeholder1: string;
    placeholder2: string;
    placeholder3: string;
  };
  welcome: {
    title: string;
    subtitle: string;
    organizeTabs: string;
    analyzePage: string;
    research: string;
    comparePrice: string;
  };
  config: {
    title: string;
    description: string;
    apiTokenRequired: string;
    openSettings: string;
  };
  tools: {
    [key: string]: string;
  };
}

export type BaseTranslationKey =
  | "common.title"
  | "common.settings"
  | "common.newChat"
  | "common.close"
  | "common.save"
  | "common.saving"
  | "common.cancel"
  | "common.send"
  | "common.stop"
  | "common.processing"
  | "common.noActions"
  | "settings.title"
  | "settings.subtitle"
  | "settings.language"
  | "settings.theme"
  | "settings.byok"
  | "settings.byokDescription"
  | "settings.aiHost"
  | "settings.aiToken"
  | "settings.aiModel"
  | "settings.hostPlaceholder"
  | "settings.tokenPlaceholder"
  | "settings.modelPlaceholder"
  | "settings.saveSuccess"
  | "settings.saveError"
  | "settings.testConnection"
  | "settings.testing"
  | "settings.testSuccess"
  | "settings.testFailed"
  | "settings.reset"
  | "settings.resetConfirm"
  | "settings.privacy"
  | "settings.dataSharing"
  | "settings.dataSharingEnabled"
  | "settings.dataSharingDisabled"
  | "settings.dataSharingDescription"
  | "settings.privacyModeDescription"
  | "settings.aboutUs"
  | "settings.aboutDescription"
  | "settings.starOnGithub"
  | "settings.joinDiscord"
  | "settings.joinWechat"
  | "settings.sendEmail"
  | "settings.followTwitter"
  | "settings.feedback"
  | "settings.general"
  | "settings.aiConfiguration"
  | "settings.selectProvider"
  | "settings.searchProviders"
  | "settings.noProvidersFound"
  | "settings.getApiKey"
  | "settings.current"
  | "theme.light"
  | "theme.dark"
  | "theme.system"
  | "tooltip.newChat"
  | "tooltip.settings"
  | "tooltip.close"
  | "tooltip.stopResponse"
  | "mode.focus"
  | "mode.background"
  | "mode.selectMode"
  | "mode.focusDescription"
  | "mode.backgroundDescription"
  | "ai.thinking"
  | "ai.streamingResponse"
  | "ai.realtimeExecution"
  | "ai.planningAgent"
  | "ai.enhancedPlanning"
  | "language.en"
  | "language.zh"
  | "input.newLine"
  | "input.placeholder1"
  | "input.placeholder2"
  | "input.placeholder3"
  | "welcome.title"
  | "welcome.subtitle"
  | "welcome.organizeTabs"
  | "welcome.analyzePage"
  | "welcome.research"
  | "welcome.comparePrice"
  | "config.title"
  | "config.description"
  | "config.apiTokenRequired"
  | "config.openSettings";

export type TranslationKey = BaseTranslationKey | `tools.${string}`;

export interface I18nContextValue {
  language: Language;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  changeLanguage: (lang: Language) => Promise<void>;
}
