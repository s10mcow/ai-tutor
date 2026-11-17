import {
  familyResponse,
  requireFamily,
  requireLearner,
} from "../../../../../../lib/family";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ learnerId: string }> },
) {
  return familyResponse(async () =>
    requireLearner(await requireFamily(request), (await params).learnerId),
  );
}
