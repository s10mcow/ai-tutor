# 09: Talk and type within the same coaching session

**What to build:** A Learner speaks or types to the Tutor, hears replies, and keeps the question and work visible on screen. Switching input method does not restart the learning activity.

**Blocked by:** 03 — Connect model access with visible usage controls.

**Status:** accepted for implementation; published issue linked in [tracker index](../tracker-index.json).

**Source stories:** 18, 19, 20, 21, 22, 26, 50, 61.

- [x] On a supported computer browser, microphone input becomes a visible Learner turn in the current session and a Tutor reply can be played aloud.
- [x] The Learner can inspect and correct a misheard message before that mistake guides subsequent work.
- [x] Typing and speaking use the same Learner, session context, problem, and visible work.
- [x] Denied microphone access, unavailable speech services, or failed playback leave text interaction usable and explain the failure clearly.
- [x] Changing Learners cancels or disassociates pending recording, transcription, and reply playback so old content does not appear in the new profile.
- [x] Ordinary voice interaction does not create a permanent application audio archive, and logs do not retain raw recordings. Saving a recording deliberately is a later Portfolio feature.
- [x] Speech operations use the shared funding and live-family readiness controls and include their usage in the parent's view.
- [x] Browser scenarios with controlled speech services exercise a spoken turn, corrected transcription, audible reply, text switch, microphone denial, and profile switching.

**Demo:** Speak a fictional question, correct a misheard word, hear the reply, and type the next attempt while the same work remains visible.

**Scope:** Provide a complete supported spoken interaction; selecting a particular full-duplex voice protocol is not a separate user requirement. Live provider suitability is verified in the pilot.
