import { readBoundedBody } from "./bounded-body.ts";
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
  const bytes = await readBoundedBody(request, maximum, {
    missing: new AccessError(400, "Choose work to save."),
    tooLarge: new AccessError(
      413,
      "Keep recordings under 60 seconds and choose a shorter reflection.",
    ),
  });
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
