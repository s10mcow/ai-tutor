# 11: Keep selected workbook and artwork pictures in the Portfolio

**What to build:** A Learner deliberately saves a session image with their explanation or reflection, then revisits the picture and their thinking together when showing the work to their parent.

**Blocked by:** 08 — Learn from workbook and artwork pictures; 10 — Save and show Learning evidence in a Portfolio.

**Status:** accepted for implementation; published issue linked in [tracker index](../tracker-index.json).

**Source stories:** 24, 45, 46, 51, 55, 61.

- [x] A session image becomes lasting Portfolio evidence only through an explicit save action by the Learner.
- [x] The saved entry displays the image together with the Learner's own explanation or reflection in later visits.
- [x] Saving evidence preserves the required image beyond temporary session-material cleanup, while an unsaved upload does not silently become a Portfolio item.
- [x] Retried saves are safe against duplicate entries and orphaned persisted assets after a partial failure.
- [x] Portfolio image access follows the entry's family and Learner ownership; an image URL cannot be used to bypass authorization.
- [x] A browser scenario saves a fictional artwork or workbook image, revisits it after temporary-session cleanup, and checks isolation and save-failure recovery.

**Demo:** Save a paper drawing with an explanation, reopen it in a new visit, and show the image and explanation together.

**Scope:** Reuse the established upload and Portfolio behaviors. No additional image editor, public publishing system, or new media-ingestion path is needed.
