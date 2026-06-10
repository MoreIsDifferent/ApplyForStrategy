import { getSupabaseClient } from './supabase';
import type { Faculty, Methodology, School } from './types';

interface SchoolRow {
  id: string;
  name: string;
  slug: string;
  geography: string | null;
  ranking_utd: number | null;
  ranking_tamuga: number | null;
  ranking_qs: number | null;
  ranking_usnews: number | null;
  placement_summary: string | null;
  website_url: string | null;
  logo_url: string | null;
}

interface FacultyRow {
  id: string;
  name: string;
  title: string | null;
  phd_institution: string | null;
  photo_url: string | null;
  school_profile_url: string | null;
  personal_website_url: string | null;
  google_scholar_url: string | null;
  methodology: string | null;
  schools: SchoolRow;
  faculty_topics: { topics: { name: string } | null }[];
  faculty_theories: { theories: { name: string } | null }[];
}

function toSchool(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    geography: row.geography ?? '',
    ranking_utd: row.ranking_utd,
    ranking_tamuga: row.ranking_tamuga,
    ranking_qs: row.ranking_qs,
    ranking_usnews: row.ranking_usnews,
    placement_summary: row.placement_summary,
    website_url: row.website_url,
    logo_url: row.logo_url,
  };
}

function toFaculty(row: FacultyRow): Faculty {
  return {
    id: row.id,
    name: row.name,
    school: toSchool(row.schools),
    title: row.title,
    phd_institution: row.phd_institution,
    photo_url: row.photo_url,
    school_profile_url: row.school_profile_url,
    personal_website_url: row.personal_website_url,
    google_scholar_url: row.google_scholar_url,
    methodology: (row.methodology as Methodology | null) ?? null,
    topics: row.faculty_topics.map((ft) => ft.topics?.name).filter((name): name is string => !!name),
    theories: row.faculty_theories.map((ft) => ft.theories?.name).filter((name): name is string => !!name),
  };
}

export async function getSchools(): Promise<School[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('schools').select('*').order('name');
  if (error) throw error;
  return (data as SchoolRow[]).map(toSchool);
}

export async function getAllFaculty(): Promise<Faculty[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('faculty')
    .select(
      '*, schools(*), faculty_topics(topics(name)), faculty_theories(theories(name))'
    )
    .order('name');
  if (error) throw error;
  return (data as unknown as FacultyRow[]).map(toFaculty);
}
