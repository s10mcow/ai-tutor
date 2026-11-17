// Count streamed bytes as well as Content-Length, which may be absent or wrong.
// Callers own their format checks and the errors appropriate to their operation.
export async function readBoundedBody(
  request: Request,
  maximumBytes: number,
  errors: { missing: Error; tooLarge: Error },
): Promise<Buffer<ArrayBuffer>> {
  if (Number(request.headers.get("content-length")) > maximumBytes) {
    await request.body?.cancel();
    throw errors.tooLarge;
  }
  const reader = request.body?.getReader();
  if (!reader) throw errors.missing;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximumBytes) {
        await reader.cancel();
        throw errors.tooLarge;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
