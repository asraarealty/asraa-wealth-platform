/**
 * Normalise heterogeneous search API responses into a plain array.
 *
 * Handles all backend envelope shapes:
 *   - bare array
 *   - { data: [...] }
 *   - { results: [...] }
 *   - nested { data: { data: [...] } }
 */
export function normalizeSearchResponse(response: unknown): unknown[] {
  const raw = (response as any)?.data ?? response;

  if (Array.isArray(raw)) return raw;
  if (Array.isArray((raw as any)?.data)) return (raw as any).data;
  if (Array.isArray((raw as any)?.results)) return (raw as any).results;

  return [];
}
