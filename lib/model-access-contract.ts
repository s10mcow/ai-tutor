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
  evidenceExpiresAt: string | null;
  retentionExpiresAt: string | null;
};

export type FamilyState = "setup" | "live" | "paused";
export type PilotReadiness = ModelAccess & {
  familyState: FamilyState;
  familyLiveReady: boolean;
  operations: Record<
    "text" | "image" | "transcription" | "research",
    ModelAccess
  >;
  applicationRetention: {
    verified: boolean;
    recoveryHistorySeconds: number | null;
  };
};
