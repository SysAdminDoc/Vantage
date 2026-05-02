/**
 * Vantage i18n utilities — Chrome extension i18n API wrapper
 * 
 * Usage:
 *   const msg = i18n('appName')  // Returns localized string
 *   const msg = i18n('noItems', ['bookmarks'])  // With placeholders
 */

export function i18n(messageKey, substitutions = null) {
  try {
    // Use chrome.i18n if available (extension context)
    if (typeof chrome !== 'undefined' && chrome.i18n) {
      return chrome.i18n.getMessage(messageKey, substitutions);
    }
    // Fallback: placeholder for dev/tests
    return messageKey;
  } catch (err) {
    console.warn(`i18n lookup failed for key "${messageKey}":`, err);
    return messageKey;
  }
}

export function getLanguage() {
  return chrome?.i18n?.getUILanguage?.() || 'en';
}

export function isRTL() {
  const lang = getLanguage();
  return ['ar', 'he', 'fa', 'ur'].includes(lang);
}
