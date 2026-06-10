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
  logo_url text
);

create table topics (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
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
  needs_review boolean not null default false
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
  coauthors text[]
);
