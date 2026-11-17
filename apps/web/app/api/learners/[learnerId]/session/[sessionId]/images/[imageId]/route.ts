import {
  familyResponse,
  requireFamily,
  requireSameOrigin,
  AccessError,
} from "../../../../../../../../../../lib/family";
import { readSession } from "../../../../../../../../../../lib/coaching";
import {
  uploadImage,
  ownedImage,
  interpretImage,
  confirmImage,
  removeImage,
} from "../../../../../../../../../../lib/session-images";
type Context = {
  params: Promise<{ learnerId: string; sessionId: string; imageId: string }>;
};
export async function GET(request: Request, { params }: Context) {
  let bytes: Uint8Array<ArrayBuffer> | undefined;
  const result = await familyResponse(async () => {
    const { learnerId, sessionId, imageId } = await params;
    const image = await ownedImage(
      await requireFamily(request),
      learnerId,
      sessionId,
      imageId,
    );
    bytes = new Uint8Array(image.bytes);
    return null;
  });
  return bytes
    ? new Response(bytes, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": 'inline; filename="picture.jpg"',
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      })
    : result;
}
export async function POST(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    const { learnerId, sessionId, imageId } = await params;
    const access = await requireFamily(request);
    await uploadImage(access, learnerId, sessionId, imageId, request);
    return { session: await readSession(access, learnerId, sessionId) };
  });
}
export async function PATCH(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    const { learnerId, sessionId, imageId } = await params;
    const access = await requireFamily(request);
    const input = await request.json();
    if (!input || typeof input !== "object")
      throw new AccessError(400, "Choose a picture action.");
    if (input.operation === "interpret")
      await interpretImage(access, learnerId, sessionId, imageId);
    else if (input.operation === "confirm")
      await confirmImage(
        access,
        learnerId,
        sessionId,
        imageId,
        input.description,
      );
    else throw new AccessError(400, "Choose a picture action.");
    return { session: await readSession(access, learnerId, sessionId) };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    const { learnerId, sessionId, imageId } = await params;
    const access = await requireFamily(request);
    await removeImage(access, learnerId, sessionId, imageId);
    return { session: await readSession(access, learnerId, sessionId) };
  });
}
