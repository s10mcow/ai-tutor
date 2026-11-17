import {
  familyResponse,
  requireFamily,
} from "../../../../../../../../../lib/family";
import { readPortfolioAudio } from "../../../../../../../../../lib/portfolio";
type Context = { params: Promise<{ learnerId: string; entryId: string }> };
export async function GET(request: Request, { params }: Context) {
  let bytes: Uint8Array<ArrayBuffer> | undefined;
  const result = await familyResponse(async () => {
    const { learnerId, entryId } = await params;
    bytes = new Uint8Array(
      await readPortfolioAudio(
        await requireFamily(request),
        learnerId,
        entryId,
      ),
    );
    return null;
  });
  return bytes
    ? new Response(bytes, {
        headers: {
          "Content-Type": "audio/wav",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": 'inline; filename="reflection.wav"',
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      })
    : result;
}
