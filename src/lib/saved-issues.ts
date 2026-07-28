/**
 * Client-side saved issues using browser cookies.
 * Stores only issue IDs (not full objects) to keep cookie size minimal.
 */

const COOKIE_NAME = "saved_issues";
const MAX_SAVED = 100; // Reasonable limit to prevent cookie overflow

export function getSavedIssueIds(): string[] {
  if (typeof document === "undefined") return [];

  const cookies = document.cookie.split("; ");
  const cookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return [];

  const value = cookie.split("=")[1];
  if (!value) return [];

  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveIssue(issueId: string): boolean {
  const current = getSavedIssueIds();

  if (current.includes(issueId)) return false; // Already saved

  const updated = [issueId, ...current].slice(0, MAX_SAVED);

  try {
    const encoded = encodeURIComponent(JSON.stringify(updated));
    // Set cookie for 1 year
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
    return true;
  } catch {
    return false;
  }
}

export function unsaveIssue(issueId: string): boolean {
  const current = getSavedIssueIds();
  const updated = current.filter((id) => id !== issueId);

  if (updated.length === current.length) return false; // Wasn't saved

  try {
    if (updated.length === 0) {
      // Clear the cookie
      document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
    } else {
      const encoded = encodeURIComponent(JSON.stringify(updated));
      const maxAge = 365 * 24 * 60 * 60;
      document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    return true;
  } catch {
    return false;
  }
}

export function isIssueSaved(issueId: string): boolean {
  return getSavedIssueIds().includes(issueId);
}
