import { familyResponse, requireFamily } from "../../../../../lib/family";
import { modelAccess } from "../../../../../lib/model-access";
export async function GET(request: Request) {
  return familyResponse(async () => {
    await requireFamily(request);
    const kind = new URL(request.url).searchParams.get("operation");
    return modelAccess(
      kind === "research" || kind === "transcription" || kind === "image"
        ? kind
        : "text",
    );
  });
}
