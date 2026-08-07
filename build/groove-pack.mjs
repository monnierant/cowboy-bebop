export const GROOVE_PACK_LANGUAGES = {
  grooves: "fr",
  "grooves-en": "en",
};

export const GROOVE_SOURCE_PACK = "grooves";

const FOLDERS = {
  chasseur: "grooveHunters001",
  prime: "grooveBounties01",
};

/**
 * Prepare one source document for a localized groove compendium.
 *
 * Mechanics remain in the single French source catalogue. English only
 * replaces human-readable fields; both generated packs therefore keep the
 * same ids, behavior and folder layout.
 */
export function transformGrooveEntry(document, language, translations = {}) {
  const translated = translations[document._id];
  if (language !== "fr" && translated) {
    if (translated.name) document.name = translated.name;
    if (translated.description && document.system) {
      const original = document.system.description;
      document.system.description = translated.description;
      if (Array.isArray(document.system.reminders)) {
        document.system.reminders = document.system.reminders.map((reminder, index) => ({
          ...reminder,
          text: translated.reminders?.[index] ??
            (reminder.text === original ? translated.description : reminder.text),
        }));
      }
    }
  }

  if (document.system?.audience) {
    document.folder = FOLDERS[document.system.audience] ?? null;
  }

  return document;
}
