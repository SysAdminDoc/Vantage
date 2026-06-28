// Vantage i18n utilities - WebExtensions i18n API wrapper.

export const FALLBACK_MESSAGES = Object.freeze({
  appName: "Vantage",
  newTabTitle: "New Tab",
  sidePanelTitle: "Vantage Feeds",
  sidePanelKicker: "News and reading list in one stream.",
  refreshFeeds: "Refresh feeds",
  customizeWidgets: "Customize widgets",
  openSettings: "Open settings",
  editLayout: "Edit layout",
  skipToMain: "Skip to main content",
  vantageHome: "Vantage home",
  localStatus: "Local status",
  pageControls: "Page controls",
  searchAndQuickLinks: "Search and quick links",
  readingPanels: "Reading panels",
  privacyAndSyncStatus: "Privacy and sync status",
  localFirstPrivate: "Local-first. Private by default.",
  noSyncNoTracking: "No sync. No tracking. No profile.",
  workspaces: "Workspaces",
  widgets: "Widgets",
  widgetPickerSubtitle: "Toggle dashboard modules and add live embeds.",
  closeWidgetPicker: "Close widget picker",
  activeCountSuffix: "on",
  customCountSuffix: "custom",
  widgetGroupHero: "Hero",
  widgetGroupStatusBar: "Status Bar",
  widgetGroupTimer: "Timer",
  widgetGroupReadingPanels: "Reading Panels",
  widgetGroupToolsContent: "Tools & Content",
  widgetGroupEmbeds: "Embeds",
  clock: "Clock",
  greeting: "Greeting",
  quickLinks: "Quick Links",
  topSites: "Top Sites",
  worldClocks: "World Clocks",
  quoteOfTheDay: "Quote of the Day",
  weather: "Weather",
  airQuality: "Air Quality",
  pomodoro: "Pomodoro",
  countdowns: "Countdowns",
  feeds: "Feeds",
  news: "News",
  rssReadingList: "RSS / Reading List",
  calendar: "Calendar",
  windyRadar: "Windy Radar",
  animatedBackground: "Animated Background",
  marineWeather: "Marine Weather",
  riverFloodRisk: "River Flood Risk",
  solarRadiation: "Solar Radiation",
  todoList: "To-Do List",
  notes: "Notes",
  zenShelf: "Zen Shelf",
  bookmarks: "Bookmarks",
  starredItems: "Starred Items",
  inbox: "Inbox",
  ambientSounds: "Ambient Sounds",
  historySearch: "History Search",
  cryptoPrices: "Crypto Prices",
  github: "GitHub",
  photoOfTheDay: "Photo of the Day",
  unitConverter: "Unit Converter",
  widgetHintTimeDate: "Time and date",
  widgetHintPersonalWelcome: "Personal welcome",
  widgetHintPinnedShortcuts: "Pinned shortcuts",
  widgetHintFrequentVisits: "Frequent visits",
  widgetHintSavedTimeZones: "Saved time zones",
  widgetHintDailyReflection: "Daily reflection",
  widgetHintLocalConditions: "Local conditions",
  widgetHintAqiPollen: "AQI and pollen",
  widgetHintFocusSessions: "Focus sessions",
  widgetHintImportantDates: "Important dates",
  widgetHintCuratedHeadlines: "Curated headlines",
  widgetHintPersonalFeeds: "Personal feeds",
  widgetHintIcalAgenda: "iCal agenda",
  widgetHintWeatherMap: "Weather map",
  widgetHintLiveSkyScene: "Live sky scene",
  widgetHintWavesCurrents: "Waves and currents",
  widgetHintLocalRiverRisk: "Local river risk",
  widgetHintUvIrradiance: "UV and irradiance",
  widgetHintTaskCapture: "Task capture",
  widgetHintScratchNotes: "Scratch notes",
  widgetHintVisualStickers: "Visual stickers",
  widgetHintBrowserBookmarks: "Browser bookmarks",
  widgetHintPinnedReads: "Pinned reads",
  widgetHintReadLaterQueue: "Read-later queue",
  widgetHintFocusSound: "Focus sound",
  widgetHintOptInHistory: "Opt-in browser history",
  widgetHintMarketPrices: "Market prices",
  widgetHintRepositoryActivity: "Repository activity",
  widgetHintNasaApod: "NASA APOD",
  widgetHintQuickConversions: "Quick conversions",
  toggleWidgetLabel: "Toggle $1",
  permissionDeniedWidgetDisabled: "$1 permission denied. The widget stays disabled.",
  embed: "Embed",
  untitledEmbed: "Untitled Embed",
  configureInSettings: "Configure in Settings",
  openSettingsForEmbed: "Open settings for this embed",
  removeEmbed: "Remove embed",
  removeThisEmbed: "Remove this embed",
  removedNamedItem: "Removed \"$1\".",
  undo: "Undo",
  customWebEmbed: "Custom web embed",
  addTrustedEmbedHint: "Add a trusted web page when it belongs beside your dashboard.",
  addEmbed: "Add embed",
  embedTitlePlaceholder: "Title (e.g. Flight Tracker)",
  embedTitleAria: "Embed title",
  embedUrlPlaceholder: "example.com/dashboard",
  embedUrlAria: "Embed URL",
  enterEmbedTitle: "Enter a title for the embed.",
  enterEmbedUrl: "Enter the embed URL.",
  enterValidWebUrlNoCredentials: "Enter a valid web URL without a username or password.",
  add: "Add",
  cancel: "Cancel",
  noItems: "No $ITEM$ yet",
  firstTimeSetup: "First-time setup",
  vantageSetup: "Vantage setup",
  setupStepOf: "Step $1 of $2",
  layoutPresetFocused: "Focused",
  layoutPresetFocusedTagline: "Search, quick links, and two panels.",
  layoutPresetFocusedFeature1: "Private search",
  layoutPresetFocusedFeature2: "Quick links",
  layoutPresetFocusedFeature3: "Two reading panels",
  layoutPresetBalanced: "Balanced",
  layoutPresetBalancedTagline: "Three panels for more context.",
  layoutPresetBalancedFeature1: "Private search",
  layoutPresetBalancedFeature2: "Greeting",
  layoutPresetBalancedFeature3: "Weather",
  layoutPresetBalancedFeature4: "Quick links",
  layoutPresetBalancedFeature5: "Three panels",
  layoutPresetExpanded: "Expanded",
  layoutPresetExpandedTagline: "Four panels for power users.",
  layoutPresetExpandedFeature1: "Private search",
  layoutPresetExpandedFeature2: "Weather",
  layoutPresetExpandedFeature3: "Air quality",
  layoutPresetExpandedFeature4: "Feeds",
  layoutPresetExpandedFeature5: "Pomodoro",
  chooseYourLayout: "Choose your layout",
  chooseLayoutSubtitle: "Start with the dashboard pace you want. Every choice stays editable later.",
  chooseStartingLayout: "Choose a starting layout",
  presetAriaLabel: "$1. $2 Includes $3.",
  skipSetup: "Skip setup",
  next: "Next",
  back: "Back",
  personalize: "Personalize",
  personalizeSubtitle: "Add a greeting name and weather city now, or leave either blank for a clean start.",
  yourName: "Your name",
  greetingNameAria: "Your name for the greeting",
  name: "Name",
  optional: "optional",
  cityPlaceholder: "City - e.g. Chicago",
  cityForWeather: "City for weather",
  set: "Set",
  detectLocation: "Detect location",
  weatherLocation: "Weather location",
  lookingUp: "Looking up...",
  setToLocation: "Set to $1",
  detecting: "Detecting...",
  detectedLocation: "Detected: $1",
  allSetReady: "All set. You're ready.",
  onboardingDoneSubtitle: "Your preferences are saved locally on this device. You can refine the setup from Settings.",
  openDashboard: "Open dashboard",
  sidePanelEmptyHint: "Add an RSS / News feed in Settings -> Reading list or News."
});

export function i18n(messageKey, substitutions = null) {
  const fallback = FALLBACK_MESSAGES[messageKey] || messageKey;
  try {
    const ext = globalThis.browser || globalThis.chrome;
    const value = ext?.i18n?.getMessage?.(messageKey, substitutions);
    if (value) return value;
  } catch (err) {
    console.warn(`i18n lookup failed for key "${messageKey}":`, err);
  }
  return applyFallbackSubstitutions(fallback, substitutions);
}

export function getLanguage() {
  const ext = globalThis.browser || globalThis.chrome;
  return ext?.i18n?.getUILanguage?.() || "en";
}

export function isRTL() {
  const lang = getLanguage().toLowerCase().split("-")[0];
  return ["ar", "he", "fa", "ur"].includes(lang);
}

export function localizeDocument(root = document) {
  applyText(root, "[data-i18n]", "textContent", "i18n");
  applyText(root, "[data-i18n-title]", "title", "i18nTitle");
  applyText(root, "[data-i18n-aria-label]", "aria-label", "i18nAriaLabel");
  applyText(root, "[data-i18n-placeholder]", "placeholder", "i18nPlaceholder");
}

export function setupRTL() {
  const htmlEl = document.documentElement;
  htmlEl.setAttribute("lang", getLanguage());
  htmlEl.setAttribute("dir", isRTL() ? "rtl" : "ltr");
}

function applyText(root, selector, target, dataName) {
  root.querySelectorAll?.(selector).forEach((node) => {
    const key = node.dataset?.[dataName];
    if (!key) return;
    const value = i18n(key);
    if (target === "textContent") node.textContent = value;
    else node.setAttribute(target, value);
  });
}

function applyFallbackSubstitutions(message, substitutions) {
  const values = Array.isArray(substitutions)
    ? substitutions
    : substitutions == null
      ? []
      : [substitutions];
  let text = message;
  const namedTokens = [...new Set([...message.matchAll(/\$[A-Z][A-Z0-9_]*\$/g)].map(match => match[0]))];
  values.forEach((value, index) => {
    text = text.replaceAll(`$${index + 1}`, String(value));
    if (namedTokens[index]) text = text.replaceAll(namedTokens[index], String(value));
  });
  return text;
}
