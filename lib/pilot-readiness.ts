import { database } from "./database.ts";
import { applicationRetention, modelAccess } from "./model-access.ts";
import type { PilotReadiness } from "./model-access-contract.ts";

export async function pilotReadiness(): Promise<PilotReadiness> {
  const [text, image, transcription, research] = await Promise.all([
    modelAccess("text"),
    modelAccess("image"),
    modelAccess("transcription"),
    modelAccess("research"),
  ]);
  const operations = { text, image, transcription, research };
  const familyLiveReady = Object.values(operations).every(
    (operation) => operation.liveReady,
  );
  if (familyLiveReady) {
    await database.query(
      "INSERT INTO pilot_activation (id) VALUES (true) ON CONFLICT DO NOTHING",
    );
  }
  const established =
    (await database.query("SELECT id FROM pilot_activation WHERE id = true"))
      .rowCount === 1;
  return {
    ...text,
    operations,
    familyLiveReady,
    familyState: familyLiveReady ? "live" : established ? "paused" : "setup",
    applicationRetention: applicationRetention(),
  };
}
