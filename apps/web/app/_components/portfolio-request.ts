export async function portfolioRequest<T>(
  url: string,
  signal: AbortSignal,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method: body ? method : "GET",
    signal,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error ?? "Your Portfolio could not be reached. Please try again.",
    );
  return data;
}
