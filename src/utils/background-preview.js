export const BACKGROUND_PREVIEW_EVENT = "vantage:background-preview-change";

const STORAGE_KEY = "vantage:background-preview";

export const PREVIEW_TIME_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "06:30", label: "Dawn" },
  { value: "14:00", label: "Day" },
  { value: "19:15", label: "Dusk" },
  { value: "23:00", label: "Night" },
];

export const PREVIEW_DATE_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "2026-03-20", label: "Spring" },
  { value: "2026-06-21", label: "Summer" },
  { value: "2026-09-22", label: "Autumn" },
  { value: "2026-12-21", label: "Winter" },
];

export const PREVIEW_WEATHER_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "clear", label: "Clear" },
  { value: "cloudy", label: "Clouds" },
  { value: "rain", label: "Rain" },
  { value: "snow", label: "Snow" },
  { value: "storm", label: "Storm" },
];

export const PREVIEW_LOCALITY_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "urban", label: "Urban" },
  { value: "coastal", label: "Coast" },
  { value: "forest", label: "Forest" },
  { value: "mountain", label: "Mountain" },
  { value: "desert", label: "Desert" },
  { value: "polar", label: "Polar" },
];

export const PREVIEW_HOLIDAY_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "halloween", label: "Halloween" },
  { value: "christmas-day", label: "Christmas" },
  { value: "nye", label: "NYE" },
];

const OPTION_SETS = {
  time: new Set(PREVIEW_TIME_OPTIONS.map((item) => item.value)),
  date: new Set(PREVIEW_DATE_OPTIONS.map((item) => item.value)),
  weather: new Set(PREVIEW_WEATHER_OPTIONS.map((item) => item.value)),
  locality: new Set(PREVIEW_LOCALITY_OPTIONS.map((item) => item.value)),
  holiday: new Set(PREVIEW_HOLIDAY_OPTIONS.map((item) => item.value)),
};

function readRawPreview() {
  try {
    const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeRawPreview(value) {
  try {
    if (!Object.keys(value).length) {
      globalThis.sessionStorage?.removeItem(STORAGE_KEY);
      return;
    }
    globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Session storage can be unavailable in some extension and privacy contexts.
  }
}

function normalizePreview(value) {
  const next = {};
  for (const [key, options] of Object.entries(OPTION_SETS)) {
    const raw = value?.[key];
    if (typeof raw === "string" && raw && options.has(raw)) {
      next[key] = raw;
    }
  }
  return next;
}

export function getBackgroundPreview() {
  return normalizePreview(readRawPreview());
}

export function hasBackgroundPreview(value = getBackgroundPreview()) {
  return Object.keys(normalizePreview(value)).length > 0;
}

export function notifyBackgroundPreviewChange() {
  try {
    globalThis.dispatchEvent?.(new CustomEvent(BACKGROUND_PREVIEW_EVENT));
  } catch {
    globalThis.dispatchEvent?.(new Event(BACKGROUND_PREVIEW_EVENT));
  }
}

export function setBackgroundPreview(patch) {
  const merged = { ...getBackgroundPreview(), ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (!value) {
      delete merged[key];
    }
  }
  const next = normalizePreview(merged);
  writeRawPreview(next);
  notifyBackgroundPreviewChange();
  return next;
}

export function clearBackgroundPreview() {
  writeRawPreview({});
  notifyBackgroundPreviewChange();
}
