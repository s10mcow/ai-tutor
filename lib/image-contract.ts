// Raw uploads stay below the hosted function's 4.5 MB request-body ceiling.
export const imageMaximumBytes = 4_000_000;
export const imageMaximumSize = `${imageMaximumBytes / 1_000_000} MB`;
export const imageUploadSizeError = `Choose a picture up to ${imageMaximumSize}, or type the question.`;

export type SessionImage = {
  id: string;
  kind: "workbook" | "art";
  status:
    | "uploaded"
    | "pending"
    | "interpreted"
    | "unreadable"
    | "failed"
    | "confirmed";
  interpretation: string | null;
  confirmedDescription: string | null;
};
