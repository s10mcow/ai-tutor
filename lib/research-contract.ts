export type PublicSource = { url: string; title: string };
export type ResearchResult = {
  text: string;
  sources: PublicSource[];
  citations: Array<PublicSource & { start: number; end: number }>;
  status: "found" | "missing";
};
