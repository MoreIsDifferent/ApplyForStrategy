-- publications: support OpenAlex-sourced data and dedup across recent/most-cited lists
alter table publications add column abstract text;
alter table publications add column openalex_id text;
alter table publications add constraint publications_faculty_openalex_unique
  unique (faculty_id, openalex_id);

-- faculty: cache OpenAlex author match
alter table faculty add column openalex_author_id text;
alter table faculty add column openalex_match_confidence text
  check (openalex_match_confidence in ('name_institution', 'ambiguous'));

-- schools: cache OpenAlex institution ID (resolved lazily on first enrichment run)
alter table schools add column openalex_institution_id text;
