import { familyResponse, requireFamily } from "../../../../../lib/family";
import { modelAccess } from "../../../../../lib/model-access";
import { pilotReadiness } from "../../../../../lib/pilot-readiness";
export async function GET(request: Request) {
  return familyResponse(async () => {
    await requireFamily(request);
    const kind = new URL(request.url).searchParams.get("operation");
    if (!kind) return pilotReadiness();
    return modelAccess(
      kind === "research" || kind === "transcription" || kind === "image"
        ? kind
        : "text",
    );
  });
}
