# Ticket 12 verification and spoken Portfolio contract

## Delivered behavior

**Save Learning evidence** is available in a current activity even without a typed attempt. Its chooser separates **My spoken reflection** from ordinary **Record a message**. **Record a reflection to keep** starts a new recording of the Learner’s own thinking. **Stop and review reflection** releases the microphone and offers local playback, **Discard reflection recording**, and deliberate **Save to Portfolio**. The written reflection is optional for an audio entry. A picture can accompany explicit saved audio without forcing an extra typed explanation; ordinary speech does not meet that requirement.

Recording uses ticket 09’s real `startAudioCapture` AudioWorklet and canonical mono PCM WAV boundary: 16 kHz, 16 bit, 0.25–60 seconds, at most 1,920,044 bytes. There is no transcription request, generated text, model charge, or provider readiness dependency for saving or playing this recording. The original ordinary-speech transcription path remains temporary. Its byte validator is now shared from `lib/audio-recording.ts` without changing its rules.

The chooser cannot open while ordinary speech is capturing. A modal prevents overlapping actions while the reflection is being reviewed. Discard and close revoke the browser object URL; unmount and hidden tabs cancel microphone capture, including permission that arrives after cancellation. A failed or denied recording explains recovery. A hidden tab also pauses preview playback. Leaving the chooser clears its unsaved draft. A failed save keeps the submitted metadata and recording together for exact retry; even a later preview playback error cannot change that submitted payload. Closing after an unconfirmed save clears the local draft; the entry may already exist and can be checked in My Portfolio.

Saved entries display a labeled audio player in normal and **Show my parent** views. Playback survives source activity deletion and web-process restart. Missing playback produces a retry explanation. Entry rendering does not claim that an audio-only entry lacks a reflection.

## HTTP and persistence contract

`POST /api/learners/:learnerId/portfolio` retains its existing JSON contract for written/picture-only saves. A spoken save sends multipart form data with exactly two fields: `input` containing the same metadata JSON (`id`, `sessionId`, `actionIds`, optional `imageIds`, `title`, `reflection`) and `audio` containing the new WAV bytes. Arbitrary audio URLs, prior conversation recording identifiers, unvalidated formats, and client-supplied duration metadata do not grant an audio asset. The entire multipart envelope is bounded before parsing, then the canonical WAV bytes and duration are independently validated. The route authenticates before reading the upload and checks same origin and the owned source activity before saving.

`PortfolioEntry.audio` is additive metadata: `{ durationSeconds: number } | null`. `WrittenEvidence[]` and ticket 11’s `images` metadata remain intact. Migration `12-spoken-portfolio.sql` adds entry audio metadata and a `portfolio_audio` bytea row keyed by the owning entry. There is no temporary-upload table, source-session foreign key, public asset URL, disk file, provider Files upload, or transcription archive. Entry, audio bytes, and selected picture copies commit in one PostgreSQL transaction. Only explicitly submitted audio reaches this table; ordinary transcription cannot insert into it.

The existing save lock serializes concurrent identical saves. The immutable fingerprint adds a SHA-256 digest only when audio is present, preserving legacy written/picture fingerprints. An identical replay returns the existing entry even after the source session ends; changed audio or metadata returns 409. Editing written reflection does not change the original save identity. The picture own-words edit guard recognizes the independently saved spoken reflection.

`GET /api/learners/:learnerId/portfolio/:entryId/audio` joins the asset to the family/Learner-owned entry. Anonymous requests return 401; other-family and wrong-Learner paths return 404. Responses use `audio/wav`, `private, no-store`, `nosniff`, a fixed inline filename, and a restrictive content security policy. A byte-size cap makes full WAV delivery sufficient for native browser playback. Reading uses no model service. Deleting the owning Learner cascades through the entry to its audio; source-session cleanup does not delete it.

## Verification evidence

Tests exercise the real application, Better Auth, HTTP, and isolated PostgreSQL. Only microphone hardware, external model HTTP, deliberately lost browser responses, and a browser playback failure are controlled. The microphone fixture supplies an oscillator MediaStream; actual Web Audio capture, WAV encoding, local decoding, and saved-response playback remain real. A deferred PostgreSQL constraint trigger produces a real commit failure after the audio insert; assertions use HTTP rather than inspecting database records.

The new capability, capture-overlap guard, and retry-after-preview-failure behavior were each observed failing before their implementation. Scenarios cover audio-only review/save/later playback, no provider calls for saving, ordinary speech with zero Portfolio uploads, discard/URL revocation, permission failure/recovery, late permission after profile switching, atomic commit failure, lost response and unchanged replay, changed audio rejection, malformed/oversized audio, concurrent first saves, same-origin/auth/family/Learner isolation, and pictures accompanied by explicitly kept speech.

Laptop screenshots at 1366×768 are retained outside the repository in `/tmp/ai-tutor-research/ticket12/`: `review-laptop.png` and `playback-laptop.png`. They show the deliberate review/save controls and one playable entry chosen for a parent. The React checklist was applied to form labels, native audio controls, modal navigation, browser-safe imports, owned media routes, async cancellation, object URL disposal, and narrow component responsibilities.

This is local fictional-data evidence. Controlled oscillator playback is not proof of real microphone quality, audible hardware output, or child usability. Ticket 14 owns those family-flow checks. Hosted ticket 12 playback, storage/backups and retention remain deployment verification work; application source controls are not a claim about provider or hosting retention. No live model request or children’s data was used, and no cloud resource was created by this ticket.

Node 26.13.1 checks:

- `npm run test:browser -- tests/spoken-portfolio.spec.ts`: six passed.
- `npm run test:browser -- tests/spoken-portfolio.spec.ts tests/written-portfolio.spec.ts tests/picture-portfolio.spec.ts tests/voice-coaching.spec.ts -g 'a new spoken reflection|a Learner saves only selected|a lost save response|a picture keeps|a failed picture transaction|transcription validates bytes|reviewed speech and typed'`: seven passed, preserving the image and written save contracts and ordinary speech validation.
- After merging public-source integration `9f0b394`, `npm run test:browser -- tests/spoken-portfolio.spec.ts tests/public-sources.spec.ts tests/voice-coaching.spec.ts -g 'a new spoken reflection|a failed audio commit|a deliberately kept|a Learner inspects retrieved|reviewed speech and typed'`: five passed. The subsequent integration `545268a` only records ticket 13 acceptance and is also merged.
- `npm run typecheck`: passed before and after the feature integration merge.
- Production `npm run build:web`: passed with explicit fictional auth configuration and unavailable model/database endpoints. The protected Portfolio audio route is included in the production route map.
- Prettier and `git diff --check`: passed for the changed source. No full repository test-suite run was needed.
