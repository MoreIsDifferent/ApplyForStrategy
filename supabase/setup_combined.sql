-- Combined setup script: run once in the Supabase SQL Editor for a fresh project.
-- Includes schema.sql + migrations/0001_add_bio_hash.sql + migrations/0002_add_topic_taxonomy.sql + migrations/0003_publication_enrichment.sql + school records (no placeholder faculty).

create extension if not exists "uuid-ossp";

create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  geography text,
  ranking_utd integer,
  ranking_tamuga integer,
  ranking_qs integer,
  ranking_usnews integer,
  placement_summary text,
  website_url text,
  logo_url text,
  openalex_institution_id text
);

create table topics (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  canonical_name text,
  category text,
  needs_categorization boolean not null default true
);

create table theories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
);

create table faculty (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  school_id uuid not null references schools(id) on delete cascade,
  title text,
  phd_institution text,
  photo_url text,
  school_profile_url text,
  personal_website_url text,
  google_scholar_url text,
  methodology text,
  needs_review boolean not null default false,
  bio_hash text,
  openalex_author_id text,
  openalex_match_confidence text check (openalex_match_confidence in ('name_institution', 'ambiguous'))
);

create table faculty_topics (
  faculty_id uuid not null references faculty(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (faculty_id, topic_id)
);

create table faculty_theories (
  faculty_id uuid not null references faculty(id) on delete cascade,
  theory_id uuid not null references theories(id) on delete cascade,
  primary key (faculty_id, theory_id)
);

create table publications (
  id uuid primary key default uuid_generate_v4(),
  faculty_id uuid not null references faculty(id) on delete cascade,
  title text not null,
  year integer,
  journal text,
  citation_count integer,
  coauthors text[],
  abstract text,
  openalex_id text,
  unique (faculty_id, openalex_id)
);

insert into schools (name, slug, geography, ranking_utd, ranking_tamuga, ranking_qs, ranking_usnews, placement_summary, website_url) values
('Wharton (UPenn)', 'wharton', 'Northeast', 3, 4, 2, 1, 'Strong placement at top-10 R1 universities.', 'https://www.wharton.upenn.edu'),
('Chicago Booth', 'chicago-booth', 'Midwest', 5, 3, 5, 3, 'Consistent placement in top economics and strategy departments.', 'https://www.chicagobooth.edu'),
('UCLA Anderson', 'ucla-anderson', 'West Coast', 12, 10, 15, 16, 'Strong West Coast placement record.', 'https://www.anderson.ucla.edu');
