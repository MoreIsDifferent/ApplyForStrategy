from scraper.audit_match_quality import is_suspect_match


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


def test_field_match_is_case_insensitive_substring():
    author = {
        "last_known_institutions": [{"display_name": "Some Other University"}],
        "x_concepts": [{"display_name": "Marketing Science"}],
    }
    assert is_suspect_match(author, "Harvard Business School") is False


def test_match_is_ok_when_institution_is_prefix_of_school_name():
    author = {
        "last_known_institutions": [{"display_name": "Booth School"}],
        "x_concepts": [{"display_name": "Astrophysics"}],
    }
    assert is_suspect_match(author, "Booth School of Business, University of Chicago") is False


def test_missing_school_name_is_not_a_free_pass():
    author = {
        "last_known_institutions": [{"display_name": "Some Other University"}],
        "x_concepts": [{"display_name": "Astrophysics"}],
    }
    assert is_suspect_match(author, "") is True


def test_missing_fields_are_handled():
    assert is_suspect_match({}, "Harvard Business School") is True
