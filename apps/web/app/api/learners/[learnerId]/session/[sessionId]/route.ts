import {
  familyResponse,
  requireFamily,
  requireSameOrigin,
} from "../../../../../../../../lib/family";
import {
  readSession,
  submitAction,
} from "../../../../../../../../lib/coaching";
type Context = { params: Promise<{ learnerId: string; sessionId: string }> };
export async function GET(request: Request, { params }: Context) {
  return familyResponse(async () => {
    const { learnerId, sessionId } = await params;
    return {
      session: await readSession(
        await requireFamily(request),
        learnerId,
        sessionId,
      ),
    };
  });
}
export async function POST(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    const { learnerId, sessionId } = await params;
    const access = await requireFamily(request);
    return {
      session: await submitAction(
        access,
        learnerId,
        sessionId,
        await request.json(),
      ),
    };
  });
}
