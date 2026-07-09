import { describe, expect, it } from "vitest";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import italian from "./locales/it.json";
import nl from "./locales/nl.json";
import ptBR from "./locales/pt-BR.json";

const locales = { de, en, es, fr, it: italian, nl, "pt-BR": ptBR };
const importErrorKeys = [
  "importInvalidFile",
  "importUnsupportedVersion",
  "importInconsistentData",
  "importStorageError",
] as const;

describe("import error translations", () => {
  it.each(Object.entries(locales))(
    "%s contains every specific import error",
    (_locale, messages) => {
      for (const key of importErrorKeys) {
        expect(messages.export[key]).toEqual(expect.any(String));
        expect(messages.export[key].trim()).not.toBe("");
      }
    },
  );
});

describe("privacy translations", () => {
  it.each(Object.entries(locales))("%s avoids absolute privacy claims", (_locale, messages) => {
    expect(messages.tutorial.steps.private.title).not.toMatch(/100\s?%/);
    expect(messages.tutorial.steps.private.body.trim()).not.toBe("");
  });
});
