import { familyResponse, requireFamily } from "../../../../../lib/family";
import { modelAccess } from "../../../../../lib/model-access";
export async function GET(request: Request) {
  return familyResponse(async () => {
    await requireFamily(request);
    const operation = new URL(request.url).searchParams.get("operation");
    return modelAccess(
      operation === "research"
        ? "research"
        : new URL(request.url).searchParams.get("operation") === "image"
          ? "image"
          : "text",
    );
  });
}
