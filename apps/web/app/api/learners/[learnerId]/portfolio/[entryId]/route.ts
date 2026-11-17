import {
  familyResponse,
  requireFamily,
  requireSameOrigin,
} from "../../../../../../../../lib/family";
import {
  readPortfolioEntry,
  editReflection,
} from "../../../../../../../../lib/portfolio";
type Context = { params: Promise<{ learnerId: string; entryId: string }> };
export async function GET(request: Request, { params }: Context) {
  return familyResponse(async () => {
    const { learnerId, entryId } = await params;
    return {
      entry: await readPortfolioEntry(
        await requireFamily(request),
        learnerId,
        entryId,
      ),
    };
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    const { learnerId, entryId } = await params;
    return {
      entry: await editReflection(
        await requireFamily(request),
        learnerId,
        entryId,
        await request.json(),
      ),
    };
  });
}
