"use client";
import { useId, useRef } from "react";
import type { ResearchResult } from "../../../../lib/research-contract";
import type { ReactNode } from "react";
export function PublicSources({ result }: { result: ResearchResult }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <section className="public-sources" aria-label="Public source check">
      <SourceContent result={result} />
      <button type="button" onClick={() => dialog.current?.showModal()}>
        Inspect this source check
      </button>
      <dialog ref={dialog} className="source-dialog" aria-labelledby={titleId}>
        <h2 id={titleId}>Inspect public evidence</h2>
        <SourceContent result={result} />
        <form method="dialog">
          <button autoFocus>Close source check</button>
        </form>
      </dialog>
    </section>
  );
}
function SourceContent({ result }: { result: ResearchResult }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const [index, citation] of result.citations.entries()) {
    parts.push(result.text.slice(cursor, citation.end));
    parts.push(
      <a
        key={index}
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
      >
        {" "}
        [{citation.title}]
      </a>,
    );
    cursor = citation.end;
  }
  parts.push(result.text.slice(cursor));
  return (
    <>
      <h3>
        {result.status === "found"
          ? "Public sources found"
          : "No usable source found"}
      </h3>
      <p>{parts}</p>
      {!!result.sources.length && (
        <ul>
          {result.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                {source.title}
              </a>
              <small>{new URL(source.url).hostname}</small>
            </li>
          ))}
        </ul>
      )}
      <p className="small">
        Sources found do not prove a claim. Check what each source supports,
        what disagrees, and what is still missing. Choose “Revise my conclusion”
        to explain what changed in your own words.
      </p>
    </>
  );
}
