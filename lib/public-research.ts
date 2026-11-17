import { isIP } from "node:net";
import type { ResearchResult, PublicSource } from "./research-contract.ts";

function publicUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    // Links only: the application never fetches these URLs. Reject local addresses,
    // credentials, non-web schemes, and IP literals rather than exposing an SSRF route.
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      !host.includes(".") ||
      isIP(host.replace(/^\[|\]$/g, "")) ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export function readResearchResult(output: unknown): ResearchResult {
  const missing: ResearchResult = {
    text: "No usable public source was returned. This claim remains unverified. Try a narrower question or explain what evidence would help.",
    sources: [],
    citations: [],
    status: "missing",
  };
  if (
    !Array.isArray(output) ||
    output.some(
      (item) =>
        !item ||
        !["message", "reasoning", "web_search_call"].includes(item.type),
    )
  )
    return missing;
  const calls = output.filter((item) => item.type === "web_search_call");
  if (
    calls.length !== 1 ||
    calls[0].status !== "completed" ||
    !["search", "open_page", "find_in_page"].includes(calls[0].action?.type)
  )
    return missing;
  const retrieved = calls[0].action.sources;
  if (!Array.isArray(retrieved)) return missing;
  const sources: PublicSource[] = [];
  for (const source of retrieved) {
    const url = publicUrl(source.url);
    if (url && sources.length < 20 && !sources.some((item) => item.url === url))
      sources.push({
        url,
        title:
          typeof source.title === "string" && source.title.trim()
            ? source.title.slice(0, 200)
            : new URL(url).hostname,
      });
  }
  if (!sources.length) return missing;
  const result: ResearchResult = {
    text: "",
    sources,
    citations: [],
    status: "found",
  };
  for (const item of output.filter((item) => item.type === "message")) {
    for (const part of Array.isArray(item.content) ? item.content : []) {
      if (part.type !== "output_text" || typeof part.text !== "string")
        continue;
      const offset = result.text.length;
      result.text += part.text + "\n";
      for (const annotation of Array.isArray(part.annotations)
        ? part.annotations
        : []) {
        const url = publicUrl(annotation.url);
        const source = sources.find((source) => source.url === url);
        if (
          annotation.type !== "url_citation" ||
          !source ||
          !Number.isSafeInteger(annotation.start_index) ||
          !Number.isSafeInteger(annotation.end_index) ||
          annotation.start_index < 0 ||
          annotation.end_index <= annotation.start_index ||
          annotation.end_index > part.text.length
        )
          continue;
        if (typeof annotation.title === "string" && annotation.title.trim())
          source.title = annotation.title.slice(0, 200);
        result.citations.push({
          ...source,
          start: offset + annotation.start_index,
          end: offset + annotation.end_index,
        });
      }
    }
  }
  result.citations.sort((a, b) => a.start - b.start);
  result.citations = result.citations.filter(
    (item, index, all) => !index || item.start >= all[index - 1].end,
  );
  if (!result.citations.length || result.text.length > 6000) {
    result.text =
      "Public sources were found, but no usable cited explanation was returned. Their presence does not verify this claim. Inspect the sources and decide what evidence is still missing.";
    result.citations = [];
  }
  return result;
}
