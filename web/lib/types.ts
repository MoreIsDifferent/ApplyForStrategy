export interface School {
  id: string;
  name: string;
  slug: string;
  geography: string;
  ranking_utd: number | null;
  ranking_tamuga: number | null;
  ranking_qs: number | null;
  ranking_usnews: number | null;
  placement_summary: string | null;
  website_url: string | null;
  logo_url: string | null;
}

export type Methodology = 'Quantitative' | 'Qualitative' | 'Mixed';

export interface Faculty {
  id: string;
  name: string;
  school: School;
  title: string;
  phd_institution: string;
  photo_url: string | null;
  school_profile_url: string | null;
  personal_website_url: string | null;
  google_scholar_url: string | null;
  methodology: Methodology;
  topics: string[];
  theories: string[];
}
