import {
  familyResponse,
  requireFamily,
  requireSameOrigin,
} from "../../../../../../../lib/family";
import {
  listPortfolio,
  saveWrittenEvidence,
} from "../../../../../../../lib/portfolio";
type Context = { params: Promise<{ learnerId: string }> };
export async function GET(request: Request, { params }: Context) {
  return familyResponse(async () => ({
    entries: await listPortfolio(
      await requireFamily(request),
      (await params).learnerId,
    ),
  }));
}
export async function POST(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    return {
      entry: await saveWrittenEvidence(
        await requireFamily(request),
        (await params).learnerId,
        await request.json(),
      ),
    };
  });
}
