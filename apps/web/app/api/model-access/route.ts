import { familyResponse, requireFamily } from "../../../../../lib/family";
import { modelAccess } from "../../../../../lib/model-access";
export async function GET(request: Request) {
  return familyResponse(async () => {
    await requireFamily(request);
    return modelAccess();
  });
}
