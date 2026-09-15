const LANGUAGE_KEY = 'language';
const LEGACY_LANGUAGE_KEY = 'lang'; // older key name, still read as a fallback

export function getLanguage() {
  return localStorage.getItem(LANGUAGE_KEY) || localStorage.getItem(LEGACY_LANGUAGE_KEY) || 'zh';
}

export function setLanguage(lang) {
  localStorage.setItem(LANGUAGE_KEY, lang);
}

export function hasLanguage() {
  return Boolean(localStorage.getItem(LANGUAGE_KEY));
}
