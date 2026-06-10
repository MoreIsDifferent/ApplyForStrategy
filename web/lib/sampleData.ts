import type { Faculty, School } from './types';

export const schools: School[] = [
  {
    id: 's-wharton',
    name: 'Wharton (UPenn)',
    slug: 'wharton',
    geography: 'Northeast',
    ranking_utd: 3,
    ranking_tamuga: 4,
    ranking_qs: 2,
    ranking_usnews: 1,
    placement_summary: 'Strong placement at top-10 R1 universities.',
    website_url: 'https://www.wharton.upenn.edu',
    logo_url: null,
  },
  {
    id: 's-booth',
    name: 'Chicago Booth',
    slug: 'chicago-booth',
    geography: 'Midwest',
    ranking_utd: 5,
    ranking_tamuga: 3,
    ranking_qs: 5,
    ranking_usnews: 3,
    placement_summary: 'Consistent placement in top economics and strategy departments.',
    website_url: 'https://www.chicagobooth.edu',
    logo_url: null,
  },
  {
    id: 's-ucla',
    name: 'UCLA Anderson',
    slug: 'ucla-anderson',
    geography: 'West Coast',
    ranking_utd: 12,
    ranking_tamuga: 10,
    ranking_qs: 15,
    ranking_usnews: 16,
    placement_summary: 'Strong West Coast placement record.',
    website_url: 'https://www.anderson.ucla.edu',
    logo_url: null,
  },
];

const [wharton, booth, ucla] = schools;

export const allFaculty: Faculty[] = [
  { id: 'f1', name: 'Jane Doe', school: wharton, title: 'Assistant Professor', phd_institution: 'MIT', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/jane-doe', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['Innovation', 'Corporate Strategy'], theories: ['RBV'] },
  { id: 'f2', name: 'Robert Chen', school: wharton, title: 'Associate Professor', phd_institution: 'Stanford', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/robert-chen', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['M&A', 'Corporate Strategy'], theories: ['Agency Theory'] },
  { id: 'f3', name: 'Maria Garcia', school: wharton, title: 'Professor', phd_institution: 'Harvard', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/maria-garcia', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: ['Entrepreneurship', 'Innovation'], theories: ['RBV', 'Behavioral Theory'] },
  { id: 'f4', name: 'David Kim', school: wharton, title: 'Assistant Professor', phd_institution: 'UC Berkeley', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/david-kim', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: ['Org Theory'], theories: ['Institutional Theory'] },
  { id: 'f5', name: 'Sarah Lee', school: wharton, title: 'Associate Professor', phd_institution: 'Columbia', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/sarah-lee', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['Innovation'], theories: ['RBV'] },

  { id: 'f6', name: 'Michael Brown', school: booth, title: 'Professor', phd_institution: 'University of Chicago', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/michael-brown', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['M&A', 'Corporate Strategy'], theories: ['Agency Theory', 'RBV'] },
  { id: 'f7', name: 'Emily Wilson', school: booth, title: 'Assistant Professor', phd_institution: 'Northwestern', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/emily-wilson', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: ['Entrepreneurship'], theories: ['Behavioral Theory'] },
  { id: 'f8', name: 'James Taylor', school: booth, title: 'Associate Professor', phd_institution: 'Wharton', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/james-taylor', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: ['Org Theory', 'Corporate Strategy'], theories: ['Institutional Theory'] },
  { id: 'f9', name: 'Linda Martinez', school: booth, title: 'Professor', phd_institution: 'Stanford', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/linda-martinez', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['Innovation', 'Entrepreneurship'], theories: ['RBV'] },
  { id: 'f10', name: 'Kevin Anderson', school: booth, title: 'Assistant Professor', phd_institution: 'MIT', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/kevin-anderson', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['M&A'], theories: ['Agency Theory'] },

  { id: 'f11', name: 'Anna Thompson', school: ucla, title: 'Associate Professor', phd_institution: 'UC Berkeley', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/anna-thompson', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: ['Innovation', 'Org Theory'], theories: ['Institutional Theory', 'RBV'] },
  { id: 'f12', name: 'Brian White', school: ucla, title: 'Professor', phd_institution: 'UCLA', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/brian-white', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: ['Entrepreneurship', 'Corporate Strategy'], theories: ['Behavioral Theory'] },
  { id: 'f13', name: 'Catherine Harris', school: ucla, title: 'Assistant Professor', phd_institution: 'Yale', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/catherine-harris', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['M&A', 'Innovation'], theories: ['Agency Theory'] },
  { id: 'f14', name: 'Daniel Clark', school: ucla, title: 'Associate Professor', phd_institution: 'Duke', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/daniel-clark', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: ['Org Theory'], theories: ['Institutional Theory'] },
  { id: 'f15', name: 'Rachel Lewis', school: ucla, title: 'Professor', phd_institution: 'Cornell', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/rachel-lewis', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: ['Corporate Strategy', 'Innovation'], theories: ['RBV', 'Agency Theory'] },
];
