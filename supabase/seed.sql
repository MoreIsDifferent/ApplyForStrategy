insert into schools (name, slug, geography, ranking_utd, ranking_tamuga, ranking_qs, ranking_usnews, placement_summary, website_url) values
('Wharton (UPenn)', 'wharton', 'Northeast', 3, 4, 2, 1, 'Strong placement at top-10 R1 universities.', 'https://www.wharton.upenn.edu'),
('Chicago Booth', 'chicago-booth', 'Midwest', 5, 3, 5, 3, 'Consistent placement in top economics and strategy departments.', 'https://www.chicagobooth.edu'),
('UCLA Anderson', 'ucla-anderson', 'West Coast', 12, 10, 15, 16, 'Strong West Coast placement record.', 'https://www.anderson.ucla.edu');

insert into topics (name) values
('Innovation'), ('M&A'), ('Corporate Strategy'), ('Entrepreneurship'), ('Org Theory');

insert into theories (name) values
('RBV'), ('Institutional Theory'), ('Behavioral Theory'), ('Agency Theory');

insert into faculty (name, school_id, title, phd_institution, methodology) values
('Jane Doe', (select id from schools where slug = 'wharton'), 'Assistant Professor', 'MIT', 'Quantitative'),
('Robert Chen', (select id from schools where slug = 'wharton'), 'Associate Professor', 'Stanford', 'Quantitative'),
('Maria Garcia', (select id from schools where slug = 'wharton'), 'Professor', 'Harvard', 'Mixed'),
('David Kim', (select id from schools where slug = 'wharton'), 'Assistant Professor', 'UC Berkeley', 'Qualitative'),
('Sarah Lee', (select id from schools where slug = 'wharton'), 'Associate Professor', 'Columbia', 'Quantitative'),
('Michael Brown', (select id from schools where slug = 'chicago-booth'), 'Professor', 'University of Chicago', 'Quantitative'),
('Emily Wilson', (select id from schools where slug = 'chicago-booth'), 'Assistant Professor', 'Northwestern', 'Mixed'),
('James Taylor', (select id from schools where slug = 'chicago-booth'), 'Associate Professor', 'Wharton', 'Qualitative'),
('Linda Martinez', (select id from schools where slug = 'chicago-booth'), 'Professor', 'Stanford', 'Quantitative'),
('Kevin Anderson', (select id from schools where slug = 'chicago-booth'), 'Assistant Professor', 'MIT', 'Quantitative'),
('Anna Thompson', (select id from schools where slug = 'ucla-anderson'), 'Associate Professor', 'UC Berkeley', 'Mixed'),
('Brian White', (select id from schools where slug = 'ucla-anderson'), 'Professor', 'UCLA', 'Qualitative'),
('Catherine Harris', (select id from schools where slug = 'ucla-anderson'), 'Assistant Professor', 'Yale', 'Quantitative'),
('Daniel Clark', (select id from schools where slug = 'ucla-anderson'), 'Associate Professor', 'Duke', 'Qualitative'),
('Rachel Lewis', (select id from schools where slug = 'ucla-anderson'), 'Professor', 'Cornell', 'Mixed');

insert into faculty_topics (faculty_id, topic_id)
select f.id, t.id from faculty f, topics t where
  (f.name = 'Jane Doe' and t.name in ('Innovation', 'Corporate Strategy')) or
  (f.name = 'Robert Chen' and t.name in ('M&A', 'Corporate Strategy')) or
  (f.name = 'Maria Garcia' and t.name in ('Entrepreneurship', 'Innovation')) or
  (f.name = 'David Kim' and t.name in ('Org Theory')) or
  (f.name = 'Sarah Lee' and t.name in ('Innovation')) or
  (f.name = 'Michael Brown' and t.name in ('M&A', 'Corporate Strategy')) or
  (f.name = 'Emily Wilson' and t.name in ('Entrepreneurship')) or
  (f.name = 'James Taylor' and t.name in ('Org Theory', 'Corporate Strategy')) or
  (f.name = 'Linda Martinez' and t.name in ('Innovation', 'Entrepreneurship')) or
  (f.name = 'Kevin Anderson' and t.name in ('M&A')) or
  (f.name = 'Anna Thompson' and t.name in ('Innovation', 'Org Theory')) or
  (f.name = 'Brian White' and t.name in ('Entrepreneurship', 'Corporate Strategy')) or
  (f.name = 'Catherine Harris' and t.name in ('M&A', 'Innovation')) or
  (f.name = 'Daniel Clark' and t.name in ('Org Theory')) or
  (f.name = 'Rachel Lewis' and t.name in ('Corporate Strategy', 'Innovation'));

insert into faculty_theories (faculty_id, theory_id)
select f.id, th.id from faculty f, theories th where
  (f.name = 'Jane Doe' and th.name in ('RBV')) or
  (f.name = 'Robert Chen' and th.name in ('Agency Theory')) or
  (f.name = 'Maria Garcia' and th.name in ('RBV', 'Behavioral Theory')) or
  (f.name = 'David Kim' and th.name in ('Institutional Theory')) or
  (f.name = 'Sarah Lee' and th.name in ('RBV')) or
  (f.name = 'Michael Brown' and th.name in ('Agency Theory', 'RBV')) or
  (f.name = 'Emily Wilson' and th.name in ('Behavioral Theory')) or
  (f.name = 'James Taylor' and th.name in ('Institutional Theory')) or
  (f.name = 'Linda Martinez' and th.name in ('RBV')) or
  (f.name = 'Kevin Anderson' and th.name in ('Agency Theory')) or
  (f.name = 'Anna Thompson' and th.name in ('Institutional Theory', 'RBV')) or
  (f.name = 'Brian White' and th.name in ('Behavioral Theory')) or
  (f.name = 'Catherine Harris' and th.name in ('Agency Theory')) or
  (f.name = 'Daniel Clark' and th.name in ('Institutional Theory')) or
  (f.name = 'Rachel Lewis' and th.name in ('RBV', 'Agency Theory'));
