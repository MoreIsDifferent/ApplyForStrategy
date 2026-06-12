# Generic Scraper Pilot — Results

Pilot schools were adjusted slightly from the original 8-school candidate list during
research (Task 6): Stanford GSB was dropped because it has no unified "Strategy"
department (strategy-adjacent faculty are split across "Organizational Behavior" and
"Political Economy" areas with no combined roster page), and was replaced with Duke
Fuqua (which has a dedicated Strategy academic area). UNC Kenan-Flagler was added per
user request, bringing the pilot to 9 schools.

## MIT Sloan (`mit-sloan`)

- Faculty found: 17
- Roster looks correct: yes — this is the TIES (Technological Innovation,
  Entrepreneurship, and Strategic Management) group, which includes Entrepreneurship and
  Innovation faculty alongside Strategy faculty (e.g., Ezra Zuckerman Sivan). Per design
  this is expected — manual cleanup via `needs_review`.
- Bio field quality: `phd_institution` populated for 14/17, `topics` for 17/17
  (4 topics each for most).
- Issues: none.

## Harvard Business School (`harvard-hbs`)

- Faculty found: 22 (full roster matches the known Strategy unit roster from research)
- Roster looks correct: yes — directory extraction (`extract_faculty_list`) worked well
  on the rendered directory page.
- Bio field quality: smoke test (2 faculty) returned `phd_institution`/`topics`/
  `methodology` all null for both, with identical `bio_hash` — the rendered profile
  page (`hbs.edu/faculty/Pages/profile.aspx?facId=...`) appears to return generic/empty
  content via `fetch_rendered`, not the actual bio text.
- Issues: profile-page rendering doesn't capture bio content (likely needs a longer
  render wait or different selector/wait-for-content strategy for HBS's ASPX profile
  pages). Static fetch of profile pages returns HTTP 403. Not run full — would just
  produce 22 records with null bio fields.

## Columbia Business School (`columbia-cbs`)

- Faculty found: 0
- Roster looks correct: no — `extract_faculty_list` returned an empty roster.
- Bio field quality: n/a (no faculty).
- Issues: directory page extraction failed entirely. WebFetch also returned HTTP 403
  for this URL during research, suggesting bot-protection; the rendered fetch likely
  received a blocked/empty page. Needs follow-up (different URL, headers, or longer
  wait).

## NYU Stern (`nyu-stern`)

- Faculty found: 30
- Roster looks correct: yes — this is the Management & Organizations Department's
  Tenured & Tenure-Track faculty, which includes Organizational Behavior, Organization
  Theory, and Strategy sub-specializations. Per design this is expected — manual
  cleanup via `needs_review`.
- Bio field quality: `phd_institution` populated for 29/30, `topics` for 30/30.
- Issues: none. Best result of the pilot.

## Northwestern Kellogg (`northwestern-kellogg`)

- Faculty found: 0
- Roster looks correct: no — `extract_faculty_list` returned an empty roster.
- Bio field quality: n/a.
- Issues: the faculty directory URL (`/academics-research/faculty-directory/?department=Strategy`)
  is a landing page even when rendered — no individual faculty are present in the
  cleaned text, only navigation/descriptive copy. The actual roster is likely loaded via
  a client-side search/filter widget that doesn't populate on initial render. Needs a
  different URL or interaction (e.g., triggering the filter) — flagged for follow-up.

## UC Berkeley Haas (`berkeley-haas`)

- Faculty found: 19
- Roster looks correct: yes — this is the Management of Organizations (MORS) Group's
  ladder faculty, covering both strategy and organizational behavior. Per design this is
  expected — manual cleanup via `needs_review`.
- Bio field quality: `phd_institution` populated for 15/19, `topics` for 19/19.
- Issues: none.

## Michigan Ross (`michigan-ross`)

- Faculty found: 1 (Felipe Csaszar, Area Chair)
- Roster looks correct: no — only the area chair was extracted; the full Strategy
  faculty roster (known to include several more professors) was not captured.
- Bio field quality: `topics` populated (3), but `phd_institution`/`methodology` null,
  and `profile_url` fell back to the directory page (no individual profile link found).
- Issues: directory page extraction is severely incomplete — likely the rendered page
  only surfaced a brief area-chair callout rather than the full faculty grid (possible
  JS-loaded roster or anti-bot interference, consistent with the HTTP 403 seen via
  WebFetch during research). Not run full. Flagged for follow-up.

## Duke Fuqua (`duke-fuqua`)

- Faculty found: 3
- Roster looks correct: partial — the 3 faculty found (Sharon Belenzon, Aaron
  Chatterji, David Ridley) are real Strategy-area faculty, but Duke Fuqua's Strategy
  area has more than 3 faculty members. The `areas.fuqua.duke.edu/strategy/` page
  appears to lazy-load most of its faculty grid via JS; the rendered fetch only
  captured a partial set.
- Bio field quality: `phd_institution` populated for 2/3, `topics` for 3/3.
- Issues: directory page is JS-paginated/lazy-loaded — only a subset of faculty
  captured. Flagged as a per-school follow-up (consistent with the spec's noted
  pagination limitation).

## UNC Kenan-Flagler (`unc-kenan-flagler`)

- Faculty found: 1 (Charlie An, Assistant Professor of Strategy and Entrepreneurship)
- Roster looks correct: no — this directory page lists the *entire* faculty across all
  departments (Accounting, Finance, Marketing, etc.) with a "Load More" pagination
  widget; only the first batch of ~30 faculty (mostly non-Strategy) was captured, of
  which only 1 had "Strategy and Entrepreneurship" in their title.
  `extract_faculty_list` correctly used the `area_hint` to filter by title text from
  what it could see, but most of the Strategy and Entrepreneurship faculty (e.g., Isin
  Guler, Christopher Bingham, Sekou Bermiss) are beyond the first "page" of results.
- Bio field quality: `topics` populated (2), `phd_institution`/`methodology` null,
  `profile_url` fell back to the directory page.
- Issues: directory page is JS-paginated ("Load More") and not area-filterable via URL
  — needs a school-specific directory URL (if one exists) or pagination handling. Not
  run full. Flagged for follow-up.

## Summary

- Schools fully working (good roster + good bio quality): **3/9** (MIT Sloan, NYU
  Stern, UC Berkeley Haas)
- Schools with partial results (roster found but bios/coverage incomplete): **2/9**
  (Harvard HBS — full roster, null bios; Duke Fuqua — partial roster, good bios for
  those found)
- Schools with directory-extraction failures: **4/9**
  - Columbia CBS — empty roster, likely bot-protected page
  - Northwestern Kellogg — empty roster, directory is a JS-driven landing page
  - Michigan Ross — only 1/many faculty captured, likely anti-bot/JS-loaded grid
  - UNC Kenan-Flagler — only 1/many faculty captured, JS "Load More" pagination on an
    all-department directory
- Rough LLM call count: 1 directory call per school + 1 bio call per faculty found =
  9 directory calls + (17+2+0+30+0+19+1+3+1) bio calls = **82 total calls**
- Recommendation: **needs tweaks before scaling to the remaining ~90 schools**. The
  core extraction pipeline (`clean_html_to_text` → `extract_faculty_list` →
  `extract_faculty_fields`) works very well when the directory page is a single static
  or fully-rendered list (3/9 schools, plus a 4th — HBS — for the roster step). But
  5/9 schools hit JS-paginated/lazy-loaded/"Load More" directory pages or bot
  protection, which `fetch_rendered` in its current form (single page load, no
  scroll/click/wait-for-network-idle) does not handle. Before scaling, prioritize:
  1. Enhancing `fetch_rendered` to scroll-to-bottom and/or click "Load More" buttons
     and wait for network idle before extracting HTML.
  2. Investigating why HBS's rendered profile pages return empty bio content
     (separately from the directory page, which worked).
  3. For bot-protected pages (Columbia, possibly Michigan Ross), considering
     alternative fetch strategies (different user agent, longer waits) — and accepting
     that some schools may need a small custom parser even in the "generic" era.

## Follow-up: fetch_rendered + clean_html_to_text fixes (2026-06-11)

Addressed recommendation #1 above (and unblocked Columbia's bot-protection issue as a
side effect). Three changes to `scraper/scraper/fetch.py` and
`scraper/scraper/generic.py`:

1. **`fetch_rendered` now scrolls to the bottom and clicks "Load More"/"Show
   More"/"More Faculty"/"More Results"-style buttons in a loop until the page height
   stabilizes** (capped at 10 iterations). Click failures (e.g. an element obscured by
   an overlay) are swallowed rather than crashing the fetch.
2. **`fetch_rendered` dismisses "Accept All"-style cookie consent banners** before the
   scroll/click loop, since they can sit on top of and block "Load More" buttons
   (this was blocking Kellogg's "More Faculty" button).
3. **`clean_html_to_text` now falls back to a simple boilerplate-stripped raw-text
   extraction** when trafilatura's main-content heuristic keeps less than half as much
   text as the raw extraction — trafilatura was treating large faculty directory grids
   as navigation/listing boilerplate and discarding nearly all of them.

Additionally, `michigan-ross`'s `directory_url` was changed from the "Strategy" area
landing page (which only embeds one faculty profile directly) to the filtered faculty
directory page (`/faculty-research/directory?status=All&department=35`), which lists
the full department roster.

**Re-tested directory roster extraction for all schools that previously failed or were
incomplete** (smoke test only — directory list extraction, not full bio scraping):

| School | Before | After |
|---|---|---|
| Columbia CBS (`columbia-cbs`) | 0 (empty/bot-blocked) | 12 |
| Northwestern Kellogg (`northwestern-kellogg`) | 0 (landing page) | 44 |
| Michigan Ross (`michigan-ross`) | 1 (area chair only) | 25 |
| Duke Fuqua (`duke-fuqua`) | 3 (lazy-loaded, partial) | 13 |
| UNC Kenan-Flagler (`unc-kenan-flagler`) | 1 (first page only) | 24 |

All 9 pilot schools now extract a full or near-full Strategy faculty roster from the
directory page.

## HBS profile bio rendering — accepted limitation (2026-06-12)

Investigated why HBS's rendered profile pages (`hbs.edu/faculty/Pages/profile.aspx?facId=...`)
return empty bio fields. Findings:

- Our research bot's User-Agent gets a **403 from HBS's CDN** (a WAF rule blocking
  declared bots).
- A normal browser User-Agent via plain `requests` gets a 200, but it's a **JS
  challenge page** with no real content.
- A normal browser User-Agent via headless Playwright triggers a **PerimeterX CAPTCHA**
  ("solve a puzzle... confirm you are human").

HBS faculty profile pages are actively protected by bot-detection/CAPTCHA. Bypassing
this would require stealth/fingerprint-evasion or CAPTCHA-solving techniques, which is
out of scope.

**Decision:** keep HBS in the pipeline for its directory roster (23 Strategy faculty,
extracted correctly), but accept that bio fields (`phd_institution`, `methodology`,
`topics`, `personal_website_url`, `google_scholar_url`) will be null for HBS faculty.
These will need manual lookup via the existing `needs_review` workflow. No further
engineering effort planned for HBS bio scraping.

## Columbia CBS empty roster — accepted limitation (2026-06-12)

Investigated why `columbia-cbs` repeatedly produced an empty roster (`[]`) in the full
pipeline run despite an earlier smoke test returning 12 faculty. Findings:

- The configured directory page (`business.columbia.edu/faculty/areas-of-expertise/strategy`)
  is fetched and cleaned **stably** (always ~8063 chars via trafilatura) — this is not a
  fetch/extraction bug.
- Unlike the other 8 schools, Columbia Business School has **no faculty-directory grid
  page**. Its "Areas of Expertise > Strategy" page is a news/topic feed: a "Latest on
  Strategy" article list, a "Strategy Faculty" widget containing exactly **one** named
  faculty member (Gernot Wagner), and a "CBS Faculty Research on Strategy" article feed
  whose author bylines link to ~15 other `/faculty/people/...` profiles (mostly
  incidental "mentioned faculty", not a Strategy roster).
- Columbia's Academic Divisions (Accounting, DRO, Economics, Finance, Management,
  Marketing) include no "Strategy" division, and the Management division page is also a
  news feed rather than a roster. No general faculty directory/search page exists
  (`/faculty/people` is a 404).
- Because the cleaned text mixes one genuine roster entry with many incidental author
  mentions, `extract_faculty_list` is non-deterministic on this input — observed
  returning 0, 1, or 12 faculty across different invocations on essentially the same
  text. This matches the situation that got Stanford GSB dropped from the pilot
  ("no unified Strategy department... no combined roster page").

**Decision:** keep Columbia CBS in the pipeline rather than dropping it, but accept that
its roster is incomplete and unreliable — currently 1 faculty member (Gernot Wagner,
from the "Strategy Faculty" widget), with `phd_institution`/`methodology` null since no
individual profile URL was found. The remaining Columbia Strategy-area faculty will need
manual research via the existing `needs_review` workflow. No further engineering effort
planned for Columbia's directory extraction.
