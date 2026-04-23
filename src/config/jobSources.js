/**
 * Centralized job sources registry — single source of truth.
 * All job-related components import from here instead of defining their own lists.
 */

export const JOB_SOURCES = [
  {
    key: 'jobicy',
    color: '#00e5ff',
    urlPath: '/api/v1/jobicy-jobs/recent',
    skillsField: 'skills',
    alwaysRemote: true,
    normalize: (job) => ({
      id: job.id ? `jobicy-${job.id}` : `jobicy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.country || '',
      date: job.date || '',
      url: job.url || '',
      tags: job.skills || [],
      remote: true,
      source: 'jobicy',
      employmentType: job.type || '',
    }),
  },
  {
    key: 'remotive',
    color: '#ab47bc',
    urlPath: '/api/v1/remotive-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: true,
    normalize: (job) => ({
      id: job.id ? `remotive-${job.id}` : `remotive-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Worldwide',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: true,
      source: 'remotive',
      employmentType: job.job_type || '',
    }),
  },
  {
    key: 'arbeitnow',
    color: '#ff9800',
    urlPath: '/api/v1/arbeitnow-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: (job.slug || job.id) ? `arbeitnow-${job.slug || job.id}` : `arbeitnow-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      date: job.created_at || job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'arbeitnow',
      employmentType: (job.job_types || []).join(', '),
    }),
  },
  {
    key: 'jsearch',
    color: '#2196f3',
    urlPath: '/api/v1/jsearch-jobs/recent',
    skillsField: null, // JSearch has no skills field
    alwaysRemote: false,
    normalize: (job) => ({
      id: (job.job_id || job.id) ? `jsearch-${job.job_id || job.id}` : `jsearch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.job_title || job.title || '',
      company: job.employer_name || job.employer || '',
      location: job.job_city || job.city || job.location || '',
      date: job.job_posted_at || job.posted_at || job.date || '',
      url: job.job_apply_link || job.apply_link || job.url || '',
      tags: [],
      remote: job.job_is_remote ?? job.is_remote ?? false,
      source: 'jsearch',
      employmentType: job.job_employment_type || job.employment_type || '',
    }),
  },
  {
    key: 'remoteok',
    color: '#00c853',
    urlPath: '/api/v1/remoteok-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: true,
    normalize: (job) => ({
      id: job.id ? `remoteok-${job.id}` : `remoteok-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.position || job.title || '',
      company: job.company || '',
      location: job.location || 'Remote',
      date: job.date || '',
      url: job.apply_url || job.url || '',
      tags: job.tags || [],
      remote: true,
      source: 'remoteok',
      employmentType: '',
    }),
  },
  {
    key: 'himalayas',
    color: '#e91e63',
    urlPath: '/api/v1/himalayas-jobs/recent',
    skillsField: 'categories',
    alwaysRemote: true,
    normalize: (job) => ({
      id: (job.id || job.guid) ? `himalayas-${job.id || job.guid}` : `himalayas-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.companyName || job.company || '',
      location: job.location || (job.locationRestrictions || []).join(', ') || 'Remote',
      date: job.pubDate || job.date || '',
      url: job.applicationLink || job.url || '',
      tags: job.categories || job.tags || [],
      remote: true,
      source: 'himalayas',
      employmentType: job.employmentType || '',
    }),
  },
  {
    key: 'adzuna',
    color: '#ff5722',
    urlPath: '/api/v1/adzuna-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `adzuna-${job.id}` : `adzuna-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'adzuna',
      employmentType: job.contract_type || '',
    }),
  },
  {
    key: 'weworkremotely',
    color: '#9c27b0',
    urlPath: '/api/v1/weworkremotely-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: true,
    normalize: (job) => ({
      id: (job.id || job.guid) ? `weworkremotely-${job.id || job.guid}` : `weworkremotely-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Remote',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: true,
      source: 'weworkremotely',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'ostjob',
    color: '#d32f2f',
    urlPath: '/api/v1/ostjob-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `ostjob-${job.id}` : `ostjob-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Switzerland',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'ostjob',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'zentraljob',
    color: '#f44336',
    urlPath: '/api/v1/zentraljob-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `zentraljob-${job.id}` : `zentraljob-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Switzerland',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'zentraljob',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'swisstechjobs',
    color: '#4caf50',
    urlPath: '/api/v1/swisstechjobs-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `swisstechjobs-${job.id}` : `swisstechjobs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Switzerland',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'swisstechjobs',
      employmentType: '',
    }),
  },
  {
    key: 'ictjobs',
    color: '#ffc107',
    urlPath: '/api/v1/ictjobs-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `ictjobs-${job.id}` : `ictjobs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Switzerland',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'ictjobs',
      employmentType: job.employment_type || job.prof_group || '',
    }),
  },
];

// Derived lookups consumed by multiple components
export const SOURCE_TAB_DATA = [
  { key: 'all', color: '#ffffff' },
  ...JOB_SOURCES.map(({ key, color }) => ({ key, color })),
];

export const SOURCE_KEYS = JOB_SOURCES.map(s => s.key);

export const SOURCE_COLOR_MAP = Object.fromEntries(
  JOB_SOURCES.map(({ key, color }) => [key, color])
);

// Lookup for normalize functions (keyed by source name)
const NORMALIZE_MAP = Object.fromEntries(
  JOB_SOURCES.map(({ key, normalize }) => [key, normalize])
);

/**
 * Normalize a job from any source to a common schema.
 * Delegates to the source-specific normalize function from the registry.
 */
export function normalizeJob(job, source) {
  const fn = NORMALIZE_MAP[source];
  if (fn) return fn(job);
  return {
    id: `${source}-${job.id || Math.random()}`,
    title: job.title || '',
    company: job.company || '',
    location: job.location || '',
    date: job.date || '',
    url: job.url || '',
    tags: job.tags || [],
    remote: false,
    source,
    employmentType: '',
  };
}

/**
 * Extract raw job array from different API response formats.
 */
export function extractJobs(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.jobs)) return data.jobs;
  return [];
}
