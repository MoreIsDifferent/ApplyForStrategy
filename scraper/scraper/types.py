from dataclasses import dataclass, field


@dataclass
class SchoolConfig:
    slug: str
    name: str
    directory_url: str
    fetch_mode: str


@dataclass
class FacultyStub:
    name: str
    title: str | None
    profile_url: str


@dataclass
class ExtractedFields:
    phd_institution: str | None
    methodology: str | None
    topics: list[str] = field(default_factory=list)
    theories: list[str] = field(default_factory=list)
    personal_website_url: str | None = None
    google_scholar_url: str | None = None
