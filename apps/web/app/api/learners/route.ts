import {
  createLearner,
  familyResponse,
  requireFamily,
  requireSameOrigin,
} from "../../../../../lib/family";
export async function POST(request: Request) {
  return familyResponse(async () => {
    const access = await requireFamily(request);
    requireSameOrigin(request);
    return createLearner(access, (await request.json()).name);
  });
}
