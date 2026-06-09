# Strategy PhD Program Finder — Design Spec

## Overview

A public website that helps prospective Strategy PhD applicants research programs and faculty. Instead of manually combing through dozens of school websites, applicants can filter faculty across the top US Strategy PhD programs by research topic, theory, methodology, school, geography, ranking, and more — getting a dynamically narrowed "Choice Set" of best-fit faculty/programs.

## Scope

**Phase 1 (this spec):** Faculty/program database + faceted multi-tag filter search.

**Phase 2 (future, separate spec):** Coauthor network graph — recursive ego-network visualization built from publication data collected during Phase 1.

**School coverage (initial):** Top 20-30 US Strategy PhD programs by placement record, expandable later.

**Audience:** Public website, no login required for end users.

## Architecture

- **Frontend:** Next.js, deployed on Vercel (free tier)
- **Database:** Supabase (Postgres, free tier) — also provides auth (for admin) and file storage (faculty photos)
- **Scraper:** Python scripts, scheduled via GitHub Actions (free tier)
- **Filtering:** All faceted filtering happens client-side in the browser. On page load, the frontend fetches the full dataset (~200-600 faculty records) as JSON. Selecting/deselecting facet tags recomputes result counts and the result list instantly with no server roundtrip.

This architecture was chosen over (a) a fully static JSON-in-repo site, which would make admin corrections painful, and (b) Airtable-as-database, which has a 1,000-record cap and API rate limits unsuitable for a public site with traffic. Supabase + Next.js + GitHub Actions keeps everything on free tiers while supporting a real admin workflow and providing a Postgres foundation for Phase 2's graph data.

## Data Model

### `schools`
| Field | Notes |
|---|---|
| name | e.g., "Wharton" |
| geography | region/state |
| ranking_utd | UTD Top 100 ranking |
| ranking_tamuga | TAMUGA ranking |
| ranking_qs | QS ranking |
| ranking_usnews | US News ranking |
| placement_summary | text/structured note on recent placements |
| website_url | program page link |

### `faculty`
| Field | Notes |
|---|---|
| name | |
| school_id | FK → schools |
| title | Assistant/Associate/Full Professor, etc. |
| phd_institution | where they earned their PhD |
| photo_url | stored in Supabase storage |
| school_profile_url | faculty page on school site |
| personal_website_url | |
| google_scholar_url | |
| methodology | tags: quantitative/qualitative/mixed/experimental/computational |
| needs_review | flag set by scraper for new/changed records |

### `topics`, `theories` (lookup tables)
Canonical lists of research topics and theories. Maintained via the admin interface to keep tags consistent (e.g., merging "M&A" and "Mergers and Acquisitions").

### `faculty_topics`, `faculty_theories` (many-to-many junction tables)
Each faculty member can have multiple topics and multiple theories. This many-to-many structure powers the multi-tag faceted filtering — a user can combine "Topic: Innovation" + "Theory: RBV" + "Methodology: Qualitative" to dynamically narrow the faculty list.

### `publications`
Stores each faculty member's selected paper set (title, year, journal, coauthors, citation count), collected from Google Scholar. Used to derive research topic tags via LLM analysis of abstracts, and serves as the raw data source for Phase 2's coauthor network graph.

## Scraping Pipeline

### Faculty bios + publication-based topic tags (quarterly, end of March/June/September/December)

1. **Bio scraping:** For each school's faculty directory page, scrape HTML using `requests`/`httpx` + `BeautifulSoup`, falling back to `playwright` for JS-rendered pages.
2. **Publication collection:** For each faculty member, pull their publication list from Google Scholar. Select the union of:
   - Top 10 most-cited papers
   - 10 most recent papers
   - 10 most recent papers in top journals (AMJ, SMJ, AMR, Org Science, ASQ, MS, etc.)
   - For prolific authors, expand each category from 10 to 20.
   - Google Scholar scraping must include throttling/delays to avoid rate-limiting/blocking.
3. **LLM extraction:** Pass scraped bio text and publication titles/abstracts to the Claude API to extract structured fields — research topics, theories, methodology, title, PhD institution. Topic tags derived from publication abstracts are more accurate than bio text alone.
4. **Upsert:** Scraper upserts records into Supabase. New or substantially-changed records are flagged `needs_review` for admin attention.

### Rankings & placement data (semi-annual, January and July)

Rankings (UTD, TAMUGA, QS, US News) and placement data are sourced from external ranking-publisher pages and updated manually or via lightweight scrapers, refreshed twice a year.

## Frontend: Filter UI

**Layout:** Horizontal multi-column facet bar above a results list ("Choice Set").

- Each filter dimension (Topic, Theory, Methodology, Geography, Ranking Tier, etc.) gets its own column, displayed side by side
- Each column lists all distinct values for that dimension across the dataset, with live counts
- Checking a value in any column instantly recomputes counts in every other column and the result list — true client-side faceted search
- On narrower screens, columns wrap (2-3 per row) or collapse into an accordion/horizontal scroll
- Columns with many values (e.g., Topic) get their own scroll or "show more" expander

**Results list ("Choice Set"):** Each row shows school logo, faculty name, title, and topic/theory tags as badges. Default sort: alphabetical by faculty name.

**Faculty profile:** Photo, school, title, PhD institution, research topics, theories, methodology, links to school profile / personal website / Google Scholar.

**School profile page — research portfolio chart:** A donut chart showing the proportion of that school's faculty by research topic (e.g., a slice for Innovation, M&A, Org Theory), with a legend and counts on hover. Computed client-side from the same `faculty_topics` data used for filtering. Since a faculty member can have multiple topics, the chart counts topic mentions rather than strictly partitioning faculty 1:1 — slices represent relative emphasis, not a disjoint headcount.

## Admin Interface

- `/admin` area in the Next.js app, authenticated via Supabase Auth (single admin account initially)
- Review queue: lists faculty records flagged `needs_review` from the quarterly scrape, for quick approve/edit
- Edit forms for any faculty/school record — correct scraped data, fill gaps, manage topic/theory tag assignments
- Manage canonical `topics` and `theories` lookup lists to keep tagging consistent across faculty
