/** The reference shown to the visitor on the error page: the server error id, when there is one. */
export function errorReference(error: unknown): string | null {
  if (error && typeof error === "object" && "digest" in error) {
    const d = (error as { digest?: unknown }).digest;
    if (typeof d === "string" && /^[\w-]{1,64}$/.test(d)) return d;
  }
  return null;
}
