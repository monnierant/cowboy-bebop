export const SESSION_PACK_LANGUAGES = {
  "types-de-session": "fr",
  "types-de-session-en": "en",
};

export const SESSION_SOURCE_PACK = "types-de-session";

const FOLDERS = {
  sessionClassiq01: "sessionStandard1",
  sessionPersonn02: "sessionStandard1",
  sessionFiller003: "sessionSpecial01",
  sessionPivotSa04: "sessionSpecial01",
};

/**
 * Prepare one source document for a localized session-type compendium.
 *
 * The French catalogue remains the mechanical source of truth. A translated
 * pack only replaces text meant for readers, while ids, riffs and costs stay
 * byte-for-byte equivalent after compilation.
 */
export function transformSessionEntry(document, language, translations = {}) {
  const translated = translations[document._id];
  if (language !== "fr" && translated) {
    if (translated.name) document.name = translated.name;
    if (translated.setup && document.system) document.system.setup = translated.setup;
  }

  if (document.type === "sessionType") {
    document.folder = FOLDERS[document._id] ?? null;
  }

  return document;
}
