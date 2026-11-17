export type ModelAccess = {
  mode: "live" | "fixture" | "scripted";
  ready: boolean;
  liveReady: boolean;
  reason: string;
  message: string;
  allowanceNanoUsd: string;
  settledNanoUsd: string;
  reservedNanoUsd: string;
  unknownNanoUsd: string;
  remainingNanoUsd: string;
  nextTextReservationNanoUsd: string;
  checkedAt: string | null;
  expiresAt: string | null;
};
