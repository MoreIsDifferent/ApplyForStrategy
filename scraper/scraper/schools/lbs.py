import requests

from scraper.fetch import fetch_rendered
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

# London Business School's faculty directory is a Coveo-powered search SPA with
# no server-rendered listing. We query the same public Coveo search endpoint the
# page uses. The "xx"-prefixed token is a long-lived public search API key (not a
# rotating visitor JWT); the cq/pipeline pin the query to faculty-profile records.
COVEO_ENDPOINT = (
    "https://lbsproduction4isj1f0n.org.coveo.com/rest/search/v2"
    "?organizationId=lbsproduction4isj1f0n"
)
COVEO_API_KEY = "xxe728cebb-9cc2-401b-9cda-9b46596d5bd1"
COVEO_CONSTANT_QUERY = "@source=london.edu-Liv && @contenttypeid=facultyProfileDetail"
SUBJECT_AREA = "Strategy and Entrepreneurship"
PAGE_SIZE = 100
NAME_SUFFIX = " | London Business School"


def _query_page(first_result: int) -> dict:
    body = {
        "q": "",
        "enableQuerySyntax": True,
        "aq": f'@profilesubjectarea=="{SUBJECT_AREA}"',
        "cq": COVEO_CONSTANT_QUERY,
        "pipeline": "Faculty profiles",
        "searchHub": "Faculty profiles",
        "sortCriteria": "@profilesurname ascending",
        "numberOfResults": PAGE_SIZE,
        "firstResult": first_result,
        "fieldsToInclude": ["profilepositiontitle", "profilesurname", "title"],
    }
    response = requests.post(
        COVEO_ENDPOINT,
        json=body,
        headers={"Authorization": f"Bearer {COVEO_API_KEY}", "Content-Type": "application/json"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def _result_to_stub(result: dict) -> FacultyStub | None:
    uri = result.get("clickUri") or result.get("uri")
    title = result.get("title") or ""
    name = title.split("|", 1)[0].strip() if "|" in title else title.strip()
    if not name or not uri:
        return None
    position = (result.get("raw") or {}).get("profilepositiontitle")
    return FacultyStub(name=name, title=position, profile_url=uri)


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    stubs: list[FacultyStub] = []
    seen: set[str] = set()
    first = 0
    while True:
        data = _query_page(first)
        results = data.get("results") or []
        if not results:
            break
        for result in results:
            stub = _result_to_stub(result)
            if stub and stub.profile_url not in seen:
                seen.add(stub.profile_url)
                stubs.append(stub)
        if first + len(results) >= data.get("totalCount", 0):
            break
        first += len(results)
    return stubs


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_rendered(stub.profile_url)
    return clean_html_to_text(str(soup))
