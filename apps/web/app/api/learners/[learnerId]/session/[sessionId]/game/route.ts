import {
  familyResponse,
  requireFamily,
  requireSameOrigin,
} from "../../../../../../../../../lib/family";
import { playMathsGame } from "../../../../../../../../../lib/maths-game";

type Context = { params: Promise<{ learnerId: string; sessionId: string }> };
export async function POST(request: Request, { params }: Context) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    const { learnerId, sessionId } = await params;
    return {
      session: await playMathsGame(
        await requireFamily(request),
        learnerId,
        sessionId,
        await request.json(),
      ),
    };
  });
}
