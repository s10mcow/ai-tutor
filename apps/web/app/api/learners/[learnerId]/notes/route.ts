import {
  familyResponse,
  requireFamily,
  requireSameOrigin,
} from "../../../../../../../lib/family";
import {
  readLearningNotes,
  saveLearningNotes,
  clearLearningNotes,
} from "../../../../../../../lib/learning-notes";
type Context = { params: Promise<{ learnerId: string }> };
export async function GET(request: Request, { params }: Context) {
  return familyResponse(async () => ({
    notes: await readLearningNotes(
      await requireFamily(request),
      (await params).learnerId,
    ),
  }));
}
export async function PUT(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    return {
      notes: await saveLearningNotes(
        await requireFamily(request),
        (await params).learnerId,
        await request.json(),
      ),
    };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    await clearLearningNotes(
      await requireFamily(request),
      (await params).learnerId,
    );
    return { notes: null };
  });
}
