import {
  familyResponse,
  requireFamily,
} from "../../../../../../../../../../lib/family";
import { readPortfolioImage } from "../../../../../../../../../../lib/portfolio";
type Context = {
  params: Promise<{ learnerId: string; entryId: string; imageId: string }>;
};
export async function GET(request: Request, { params }: Context) {
  let bytes: Uint8Array<ArrayBuffer> | undefined;
  const result = await familyResponse(async () => {
    const { learnerId, entryId, imageId } = await params;
    bytes = new Uint8Array(
      await readPortfolioImage(
        await requireFamily(request),
        learnerId,
        entryId,
        imageId,
      ),
    );
    return null;
  });
  return bytes
    ? new Response(bytes, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": 'inline; filename="portfolio-picture.jpg"',
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      })
    : result;
}
