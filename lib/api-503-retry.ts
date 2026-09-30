/** Retry exactly once only for a bodyless GET after a transient 503. */
export async function retryTransientReadOnce<T extends { status: number }>(
  response: T,
  send: () => Promise<T>,
  method: string | undefined,
  body: BodyInit | null | undefined,
  delay: () => Promise<unknown>,
): Promise<T> {
  const isBodylessGet = (method ?? 'GET').toUpperCase() === 'GET' && body == null;
  if (response.status !== 503 || !isBodylessGet) return response;

  await delay();
  return send();
}
