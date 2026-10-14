// Lista única con los datos de las 20 páginas de empleo de donde se
// recogen ofertas (color, URL para pedirlas, y cómo convertir cada oferta
// al mismo formato común). Cualquier ventana que muestre ofertas lee de
// aquí, para no tener que repetir esta información en cada sitio.
/**
 * Centralized job sources registry — single source of truth.
 * All job-related components import from here instead of defining their own lists.
 */

// Relaciona el nombre de cada fuente con el nombre que usa el sistema
// central ("Core") que las recoge en vivo; solo NAV se llama distinto ahí.
// Sources whose live harvesting is authoritative in Core. The dashboard keeps
// the established tab names; NAV is the only namespace that differs in Core.
export const CORE_SOURCE_BY_KEY = Object.freeze({
  arbeitnow: 'arbeitnow',
  irishjobs: 'irishjobs',
  jobgether: 'jobgether',
  nav: 'nav_arbeidsplassen',
  ostjob: 'ostjob',
  remotive: 'remotive',
  thehub: 'thehub',
  weworkremotely: 'weworkremotely',
  zentraljob: 'zentraljob',
});

// Las 20 fuentes de empleo. Cada una tiene su color, (a veces) la URL
// donde pedir sus ofertas, y una función `normalize` que convierte el
// formato propio de esa página al formato común que usa toda la app
// (título, empresa, ubicación, fecha, url, etiquetas, si es remoto...).
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
  {
    key: 'swissdevjobs',
    color: '#009688',
    urlPath: '/api/v1/swissdevjobs-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `swissdevjobs-${job.id}` : `swissdevjobs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Switzerland',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'swissdevjobs',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'jobscout24',
    color: '#3f51b5',
    urlPath: '/api/v1/jobscout24-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `jobscout24-${job.id}` : `jobscout24-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Switzerland',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'jobscout24',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'dynamitejobs',
    color: '#8bc34a',
    urlPath: '/api/v1/dynamitejobs-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: true,
    normalize: (job) => ({
      id: job.id ? `dynamitejobs-${job.id}` : `dynamitejobs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Worldwide',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: true,
      source: 'dynamitejobs',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'jobroom',
    color: '#c62828',
    urlPath: '/api/v1/jobroom-jobs/recent',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `jobroom-${job.id}` : `jobroom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Switzerland',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'jobroom',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'thehub',
    color: '#1de9b6',
    skillsField: 'tags',
    alwaysRemote: true,
    normalize: (job) => ({
      id: job.id ? `thehub-${job.id}` : `thehub-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Remote',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: true,
      source: 'thehub',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'jobgether',
    color: '#7c4dff',
    skillsField: 'tags',
    alwaysRemote: true,
    normalize: (job) => ({
      id: job.id ? `jobgether-${job.id}` : `jobgether-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Remote',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: true,
      source: 'jobgether',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'nav',
    color: '#0d47a1',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `nav-${job.id}` : `nav-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Norway',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'nav',
      employmentType: job.employment_type || '',
    }),
  },
  {
    key: 'irishjobs',
    color: '#2e7d32',
    skillsField: 'tags',
    alwaysRemote: false,
    normalize: (job) => ({
      id: job.id ? `irishjobs-${job.id}` : `irishjobs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Ireland',
      date: job.date || '',
      url: job.url || '',
      tags: job.tags || [],
      remote: job.remote === true,
      source: 'irishjobs',
      employmentType: job.employment_type || '',
    }),
  },
];

// Listas y mapas calculados a partir de JOB_SOURCES, listos para que los
// usen las pestañas, los colores de las tarjetas, etc.
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

// Convierte una oferta de cualquier fuente al formato común de la app,
// usando la función `normalize` de esa fuente concreta (o unos valores
// por defecto si la fuente no está en la lista).
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

// Igual que normalizeJob, pero usando el identificador estable que da el
// sistema central ("Core") para la misma oferta, sin perder los valores
// por defecto de cada pestaña (como "siempre remoto").
/** Preserve Core's stable vacancy identity while retaining each tab's existing
 * display defaults (for example, remote-only portals). */
export function normalizeCoreJob(job, source) {
  return {
    ...normalizeJob(job, source),
    id: job.id,
    jobRef: job.job_ref || job.id,
    source,
  };
}

// Saca la lista de ofertas de la respuesta del servidor, sin importar si
// viene como un array directo o envuelta en un campo "data" o "jobs".
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
