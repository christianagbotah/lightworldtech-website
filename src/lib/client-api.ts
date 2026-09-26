export type JsonPayload = Record<string, unknown> | null;

export async function readJsonResponse<T = any>(
  response: Response,
  fallbackMessage = 'Request failed',
): Promise<T> {
  const raw = await response.text();
  let payload: any = null;

  if (raw.trim()) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error(
        response.ok
          ? 'The server returned an invalid JSON response'
          : fallbackMessage + ' (invalid server response)',
      );
    }
  }

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : typeof payload?.message === 'string' && payload.message.trim()
          ? payload.message
          : raw.trim()
            ? fallbackMessage
            : fallbackMessage + ' (empty server response)';
    throw new Error(message);
  }

  if (!raw.trim()) {
    throw new Error('The server returned an empty response');
  }

  return payload as T;
}

export async function fetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackMessage = 'Request failed',
): Promise<T> {
  const response = await fetch(input, init);
  return readJsonResponse<T>(response, fallbackMessage);
}
