import { getSupabaseClient } from './supabase';
import type { Coauthor, Faculty, Methodology, Publication, School, Topic } from './types';
import { getTopCoauthors, linkCoauthors } from './coauthors';

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

export interface FacultyRow {
  id: string;
  name: string;
  title: string | null;
  phd_institution: string | null;
  photo_url: string | null;
  school_profile_url: string | null;
  personal_website_url: string | null;
  google_scholar_url: string | null;
  methodology: string | null;
  openalex_author_id: string | null;
  openalex_match_confidence: string | null;
  schools: SchoolRow;
  faculty_topics: { topics: { name: string; canonical_name: string | null; category: string | null } | null }[];
  faculty_theories: { theories: { name: string } | null }[];
}

export interface PublicationRow {
  faculty_id: string;
  title: string;
  journal: string | null;
  year: number | null;
  citation_count: number;
  coauthors: string[] | null;
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

function dedupeTopics(
  facultyTopics: { topics: { name: string; canonical_name: string | null; category: string | null } | null }[]
): Topic[] {
  const map = new Map<string, Topic>();
  for (const ft of facultyTopics) {
    if (!ft.topics) continue;
    const name = ft.topics.canonical_name ?? ft.topics.name;
    const category = ft.topics.category ?? 'Other';
    if (!map.has(name)) {
      map.set(name, { name, category });
    }
  }
  return Array.from(map.values());
}

const MAX_PUBLICATIONS = 25;

export function buildFaculty(row: FacultyRow, pubRows: PublicationRow[]): Faculty {
  const verified = row.openalex_match_confidence === 'name_institution';
  const sorted = verified
    ? [...pubRows].sort((a, b) => b.citation_count - a.citation_count)
    : [];
  const publications: Publication[] = verified
    ? sorted.slice(0, MAX_PUBLICATIONS).map((p) => ({
        title: p.title,
        journal: p.journal,
        year: p.year,
        citation_count: p.citation_count,
      }))
    : [];
  // facultyId starts null; getAllFaculty replaces it via linkCoauthors after building the name index
  const coauthors: Coauthor[] = verified
    ? getTopCoauthors(pubRows).map((c) => ({ ...c, facultyId: null }))
    : [];
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
    topics: dedupeTopics(row.faculty_topics),
    theories: row.faculty_theories.map((ft) => ft.theories?.name).filter((name): name is string => !!name),
    verified,
    openalexAuthorId: verified ? row.openalex_author_id : null,
    publications,
    coauthors,
  };
}

export async function getSchools(): Promise<School[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('schools').select('*').order('name');
  if (error) throw error;
  return (data as SchoolRow[]).map(toSchool);
}

const PAGE_SIZE = 1000;

async function getPublicationsByFaculty(): Promise<Map<string, PublicationRow[]>> {
  const supabase = getSupabaseClient();
  const byFaculty = new Map<string, PublicationRow[]>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('publications')
      .select('faculty_id, title, journal, year, citation_count, coauthors')
      .order('faculty_id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    for (const p of data as unknown as PublicationRow[]) {
      const list = byFaculty.get(p.faculty_id) ?? [];
      list.push(p);
      byFaculty.set(p.faculty_id, list);
    }
    if (data.length < PAGE_SIZE) break;
  }
  return byFaculty;
}

export function buildNameIndex(faculty: { id: string; name: string }[]): Map<string, string | null> {
  const index = new Map<string, string | null>();
  for (const f of faculty) {
    const key = f.name.toLowerCase();
    index.set(key, index.has(key) ? null : f.id);
  }
  return index;
}

export async function getAllFaculty(): Promise<Faculty[]> {
  const supabase = getSupabaseClient();
  const rows: FacultyRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('faculty')
      .select(
        '*, schools(*), faculty_topics(topics(name, canonical_name, category)), faculty_theories(theories(name))'
      )
      .order('name')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data as unknown as FacultyRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  const pubsByFaculty = await getPublicationsByFaculty();
  const faculty = rows.map((row) => buildFaculty(row, pubsByFaculty.get(row.id) ?? []));
  const nameIndex = buildNameIndex(faculty);
  return faculty.map((f) => ({ ...f, coauthors: linkCoauthors(f.coauthors, nameIndex) }));
}
