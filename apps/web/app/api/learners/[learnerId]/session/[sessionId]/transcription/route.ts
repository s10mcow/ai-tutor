import {
  familyResponse,
  requireFamily,
  requireSameOrigin,
} from "../../../../../../../../../lib/family";
import { transcribeRecording } from "../../../../../../../../../lib/transcription";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ learnerId: string; sessionId: string }> },
) {
  return familyResponse(async () => {
    requireSameOrigin(request);
    const access = await requireFamily(request);
    const { learnerId, sessionId } = await params;
    return transcribeRecording(access, learnerId, sessionId, request);
  });
}
