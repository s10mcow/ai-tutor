import {
  familyResponse,
  requireFamily,
  requireSameOrigin,
  selectLearner,
} from "../../../../../lib/family";
export async function POST(request: Request) {
  return familyResponse(async () => {
    const access = await requireFamily(request);
    requireSameOrigin(request);
    return selectLearner(access, (await request.json()).learnerId);
  });
}
