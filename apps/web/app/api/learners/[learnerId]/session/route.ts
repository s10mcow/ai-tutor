import {
  familyResponse,
  requireFamily,
  requireSameOrigin,
} from "../../../../../../../lib/family";
import {
  currentSession,
  startSession,
} from "../../../../../../../lib/coaching";
type Context = { params: Promise<{ learnerId: string }> };
export async function GET(request: Request, { params }: Context) {
  return familyResponse(async () => ({
    session: await currentSession(
      await requireFamily(request),
      (await params).learnerId,
    ),
  }));
}
export async function POST(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    return {
      session: await startSession(
        await requireFamily(request),
        (await params).learnerId,
      ),
    };
  });
}
