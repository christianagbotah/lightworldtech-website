export async function readJsonSafely<T = any>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function requireJson<T = any>(
  response: Response,
  fallbackMessage = 'Request failed',
): Promise<T> {
  const payload = await readJsonSafely<T & { error?: string }>(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : fallbackMessage;
    throw new Error(message);
  }
  if (payload === null) throw new Error(fallbackMessage);
  return payload as T;
}
