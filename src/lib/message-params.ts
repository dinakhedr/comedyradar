/**
 * One-time messages arrive in the address (e.g. /admin/profiles?msg=deleted).
 * Once a message has disappeared, these words are taken out so a refresh does not show it again.
 */
/** Address words that only carry a one-time message. */
export const MESSAGE_PARAMS = ["msg", "welcome", "password", "team", "created", "as", "dates", "imported", "failed", "done", "error"];

/** The address without its one-time message words (null when nothing to remove). */
export function withoutMessageParams(search: string): string | null {
  const params = new URLSearchParams(search);
  let changed = false;
  for (const k of MESSAGE_PARAMS) {
    if (params.has(k)) {
      params.delete(k);
      changed = true;
    }
  }
  if (!changed) return null;
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

