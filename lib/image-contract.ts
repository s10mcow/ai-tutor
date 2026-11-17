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
