import { describe, expect, it } from "vitest";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import italian from "./locales/it.json";
import nl from "./locales/nl.json";
import ptBR from "./locales/pt-BR.json";

// fr.json is the source-of-truth locale: new keys are always written there first.
const otherLocales: Record<string, unknown> = { en, es, de, "pt-BR": ptBR, nl, it: italian };

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale key parity", () => {
  const referenceKeys = new Set(flattenKeys(fr));

  it("fr.json has no duplicate flattened keys (sanity check on the reference set)", () => {
    expect(referenceKeys.size).toBe(flattenKeys(fr).length);
  });

  it.each(Object.entries(otherLocales))(
    "%s has exactly the same keys as fr.json (no missing, no extra)",
    (_locale, messages) => {
      const keys = new Set(flattenKeys(messages));
      const missing = [...referenceKeys].filter((key) => !keys.has(key)).sort();
      const extra = [...keys].filter((key) => !referenceKeys.has(key)).sort();
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    },
  );
});
