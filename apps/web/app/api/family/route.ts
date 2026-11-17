import {
  familyResponse,
  listLearners,
  requireFamily,
  selectedLearnerId,
} from "../../../../../lib/family";
export async function GET(request: Request) {
  return familyResponse(async () => {
    const access = await requireFamily(request);
    const [learners, selected] = await Promise.all([
      listLearners(access),
      selectedLearnerId(access),
    ]);
    return { learners, selectedLearnerId: selected };
  });
}
