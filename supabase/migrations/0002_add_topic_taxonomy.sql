alter table topics
  add column canonical_name text,
  add column category text,
  add column needs_categorization boolean not null default true;
