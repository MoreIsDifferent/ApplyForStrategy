import trafilatura


def clean_html_to_text(html: str) -> str:
    """Strip boilerplate (nav, footer, ads) and return clean markdown text, preserving links."""
    return trafilatura.extract(html, include_links=True, output_format="markdown") or ""
