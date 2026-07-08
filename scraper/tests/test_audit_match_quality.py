from scraper.audit_match_quality import is_suspect_match, BUSINESS_FIELDS


def test_match_is_ok_when_school_appears_in_affiliations():
    author = {
        "last_known_institutions": [{"display_name": "Harvard Business School", "country_code": "US"}],
        "x_concepts": [{"display_name": "Political science"}],
    }
    assert is_suspect_match(author, "Harvard Business School") is False


def test_match_is_ok_when_field_is_business_even_if_institution_differs():
    author = {
        "last_known_institutions": [{"display_name": "Some Other University", "country_code": "US"}],
        "x_concepts": [{"display_name": "Management"}],
    }
    assert is_suspect_match(author, "Harvard Business School") is False


def test_match_is_suspect_when_neither_institution_nor_field_matches():
    author = {
        "last_known_institutions": [{"display_name": "Some Other University", "country_code": "US"}],
        "x_concepts": [{"display_name": "Astrophysics"}],
    }
    assert is_suspect_match(author, "Harvard Business School") is True


def test_business_fields_includes_management():
    assert "management" in BUSINESS_FIELDS


def test_missing_fields_are_handled():
    assert is_suspect_match({}, "Harvard Business School") is True
