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

export type Methodology = 'Quantitative' | 'Qualitative' | 'Mixed' | 'Experimental' | 'Computational';

export interface Faculty {
  id: string;
  name: string;
  school: School;
  title: string | null;
  phd_institution: string | null;
  photo_url: string | null;
  school_profile_url: string | null;
  personal_website_url: string | null;
  google_scholar_url: string | null;
  methodology: Methodology | null;
  topics: string[];
  theories: string[];
}
