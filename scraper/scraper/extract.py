import json
import os
import time

from scraper.types import ExtractedFields

EXTRACTION_SYSTEM_PROMPT = """You are extracting structured information from a university faculty member's biography.
Given the faculty member's name, title, and bio text, return a JSON object with exactly these fields:
- "phd_institution": string or null - the institution where they earned their PhD
- "methodology": one of "Quantitative", "Qualitative", "Mixed", "Experimental", "Computational", or null
- "topics": array of strings - 1 to 4 research topics most prominent in the bio (e.g. "Innovation", "Mergers and Acquisitions", "Corporate Governance")
- "theories": array of strings - theoretical frameworks the faculty member uses (e.g. "Resource-Based View", "Agency Theory"), empty array if none mentioned
- "personal_website_url": string or null - personal website URL if mentioned in the bio
- "google_scholar_url": string or null - Google Scholar profile URL if mentioned in the bio

Return null for any field you cannot determine. Respond with ONLY the JSON object, no other text."""

MIN_BIO_LENGTH = 50
MAX_ATTEMPTS = 3


class ExtractionError(Exception):
    """Raised when LLM extraction fails after all retries."""


def extract_faculty_fields(
    name: str, title: str | None, bio_text: str, client, model: str
) -> ExtractedFields:
    if not bio_text or len(bio_text.strip()) < MIN_BIO_LENGTH:
        return ExtractedFields(phd_institution=None, methodology=None)

    user_message = f"Name: {name}\nTitle: {title or 'Unknown'}\nBio:\n{bio_text}"

    last_error: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content)
            return ExtractedFields(
                phd_institution=data.get("phd_institution"),
                methodology=data.get("methodology"),
                topics=data.get("topics") or [],
                theories=data.get("theories") or [],
                personal_website_url=data.get("personal_website_url"),
                google_scholar_url=data.get("google_scholar_url"),
            )
        except Exception as error:
            last_error = error
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(2**attempt)

    raise ExtractionError(f"LLM extraction failed after {MAX_ATTEMPTS} attempts: {last_error}")


def build_client():
    from openai import OpenAI

    return OpenAI(
        base_url=os.environ["LLM_BASE_URL"],
        api_key=os.environ["LLM_API_KEY"],
        timeout=60.0,
    )


def get_model() -> str:
    return os.environ.get("LLM_MODEL", "mimo-v2.5-pro")
