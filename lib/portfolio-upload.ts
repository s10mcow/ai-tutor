import { audioMaximumBytes } from "./audio-contract.ts";
import { AccessError } from "./family.ts";

// Bound the whole multipart envelope before parsing files into memory. Only an
// explicit Portfolio save uploads this new recording; there is no staging asset.
export async function portfolioSaveBody(
  request: Request,
): Promise<{ input: unknown; audio?: Buffer }> {
  const multipart = request.headers
    .get("content-type")
    ?.startsWith("multipart/form-data;");
  const maximum = multipart ? audioMaximumBytes + 32_768 : 32_768;
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "Choose work to save.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new AccessError(
          413,
          "Keep recordings under 60 seconds and choose a shorter reflection.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(chunks);
  try {
    if (!multipart) return { input: JSON.parse(bytes.toString("utf8")) };
    const form = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
    const input = form.get("input");
    const audio = form.get("audio");
    if (
      typeof input !== "string" ||
      !audio ||
      typeof audio === "string" ||
      audio.type !== "audio/wav" ||
      [...form.keys()].length !== 2
    )
      throw new Error("Invalid reflection");
    if (audio.size > audioMaximumBytes)
      throw new AccessError(413, "Record no more than 60 seconds at a time.");
    return {
      input: JSON.parse(input),
      audio: Buffer.from(await audio.arrayBuffer()),
    };
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(
      400,
      "The save could not be read. Choose your work and record your reflection again.",
    );
  }
}
