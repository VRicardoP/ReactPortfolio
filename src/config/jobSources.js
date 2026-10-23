// Registro único de las fuentes de empleo y su conversión al contrato común.

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

const firstTruthy = (job, fields, fallback = '') => {
  for (const field of fields) {
    if (job[field]) return job[field];
  }
  return typeof fallback === 'function' ? fallback(job) : fallback;
};

const makeNormalizer = ({
  key,
  locationDefault = '',
  alwaysRemote = false,
  idFields = ['id'],
  titleFields = ['title'],
  companyFields = ['company'],
  locationFields = ['location'],
  dateFields = ['date'],
  urlFields = ['url'],
  tagFields = ['tags'],
  employmentTypeFields = ['employment_type'],
  employmentType,
  remoteFields = ['remote'],
  salaryFields = {
    min: ['salary_min', 'job_min_salary', 'min_salary'],
    max: ['salary_max', 'job_max_salary', 'max_salary'],
  },
  remoteValue,
  publisherFields = ['job_publisher', 'publisher'],
}) => (job) => {
  const rawId = firstTruthy(job, idFields);
  const remote = alwaysRemote || (remoteValue
    ? remoteValue(job)
    : remoteFields.some(field => job[field] === true));
  return {
    id: rawId
      ? `${key}-${rawId}`
      : `${key}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: firstTruthy(job, titleFields),
    company: firstTruthy(job, companyFields),
    location: firstTruthy(job, locationFields, locationDefault),
    date: firstTruthy(job, dateFields),
    url: firstTruthy(job, urlFields),
    tags: firstTruthy(job, tagFields, []),
    remote,
    source: key,
    employmentType: employmentType
      ? employmentType(job)
      : firstTruthy(job, employmentTypeFields),
    salaryMin: firstTruthy(job, salaryFields.min, null),
    salaryMax: firstTruthy(job, salaryFields.max, null),
    publisher: firstTruthy(job, publisherFields),
  };
};

const source = (key, color, options = {}, urlPath) => ({
  key,
  color,
  ...(urlPath ? { urlPath } : {}),
  normalize: makeNormalizer({ key, ...options }),
});

export const JOB_SOURCES = [
  source('jobicy', '#00e5ff', {
    locationFields: ['country'], tagFields: ['skills'], alwaysRemote: true,
    employmentTypeFields: ['type'],
  }, '/api/v1/jobicy-jobs/recent'),
  source('remotive', '#ab47bc', {
    locationDefault: 'Worldwide', alwaysRemote: true,
    employmentTypeFields: ['job_type'],
  }),
  source('arbeitnow', '#ff9800', {
    idFields: ['slug', 'id'], dateFields: ['created_at', 'date'],
    employmentType: job => (job.job_types || []).join(', '),
  }),
  source('jsearch', '#2196f3', {
    idFields: ['job_id', 'id'], titleFields: ['job_title', 'title'],
    companyFields: ['employer_name', 'employer'],
    locationFields: ['job_city', 'city', 'location'],
    dateFields: ['job_posted_at', 'posted_at', 'date'],
    urlFields: ['job_apply_link', 'apply_link', 'url'], tagFields: [],
    remoteFields: ['job_is_remote', 'is_remote'],
    remoteValue: job => job.job_is_remote ?? job.is_remote ?? false,
    employmentTypeFields: ['job_employment_type', 'employment_type'],
  }, '/api/v1/jsearch-jobs/recent'),
  source('remoteok', '#00c853', {
    titleFields: ['position', 'title'], locationDefault: 'Remote',
    urlFields: ['apply_url', 'url'], alwaysRemote: true, employmentTypeFields: [],
  }, '/api/v1/remoteok-jobs/recent'),
  source('himalayas', '#e91e63', {
    idFields: ['id', 'guid'], companyFields: ['companyName', 'company'],
    locationDefault: job => (job.locationRestrictions || []).join(', ') || 'Remote',
    dateFields: ['pubDate', 'date'], urlFields: ['applicationLink', 'url'],
    tagFields: ['categories', 'tags'], alwaysRemote: true,
    employmentTypeFields: ['employmentType'],
  }, '/api/v1/himalayas-jobs/recent'),
  source('adzuna', '#ff5722', { employmentTypeFields: ['contract_type'] }, '/api/v1/adzuna-jobs/recent'),
  source('weworkremotely', '#9c27b0', {
    idFields: ['id', 'guid'], locationDefault: 'Remote', alwaysRemote: true,
  }),
  source('ostjob', '#d32f2f', { locationDefault: 'Switzerland' }),
  source('zentraljob', '#f44336', { locationDefault: 'Switzerland' }),
  source('swisstechjobs', '#4caf50', {
    locationDefault: 'Switzerland', employmentTypeFields: [],
  }, '/api/v1/swisstechjobs-jobs/recent'),
  source('ictjobs', '#ffc107', {
    locationDefault: 'Switzerland',
    employmentTypeFields: ['employment_type', 'prof_group'],
  }, '/api/v1/ictjobs-jobs/recent'),
  source('swissdevjobs', '#009688', { locationDefault: 'Switzerland' }, '/api/v1/swissdevjobs-jobs/recent'),
  source('jobscout24', '#3f51b5', { locationDefault: 'Switzerland' }, '/api/v1/jobscout24-jobs/recent'),
  source('dynamitejobs', '#8bc34a', {
    locationDefault: 'Worldwide', alwaysRemote: true,
  }, '/api/v1/dynamitejobs-jobs/recent'),
  source('jobroom', '#c62828', { locationDefault: 'Switzerland' }, '/api/v1/jobroom-jobs/recent'),
  source('thehub', '#1de9b6', { locationDefault: 'Remote', alwaysRemote: true }),
  source('jobgether', '#7c4dff', { locationDefault: 'Remote', alwaysRemote: true }),
  source('nav', '#0d47a1', { locationDefault: 'Norway' }),
  source('irishjobs', '#2e7d32', { locationDefault: 'Ireland' }),
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
    salaryMin: firstTruthy(job, ['salary_min', 'job_min_salary', 'min_salary'], null),
    salaryMax: firstTruthy(job, ['salary_max', 'job_max_salary', 'max_salary'], null),
    publisher: firstTruthy(job, ['job_publisher', 'publisher']),
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
    id: job.id ?? `${source}-${job.job_ref}`,
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
