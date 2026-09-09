/** Shared id/timestamp helpers — split out so lib modules that reference
 *  each other don't need to import from one another just to generate a row
 *  id. */

/** cuid-shaped opaque string id: timestamp prefix + 16 hex chars of entropy. */
export function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `c${ts}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
