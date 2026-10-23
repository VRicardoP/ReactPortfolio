import { describe, expect, it } from 'vitest'

import { CORE_SOURCE_BY_KEY, JOB_SOURCES, normalizeCoreJob } from '../jobSources'

const CORE_SOURCES = {
  arbeitnow: 'arbeitnow', irishjobs: 'irishjobs', jobgether: 'jobgether',
  nav: 'nav_arbeidsplassen', ostjob: 'ostjob', remotive: 'remotive',
  thehub: 'thehub', weworkremotely: 'weworkremotely', zentraljob: 'zentraljob',
}

const EXCLUSIVE_SOURCES = [
  'adzuna', 'dynamitejobs', 'himalayas', 'ictjobs', 'jobicy', 'jobroom',
  'jobscout24', 'jsearch', 'remoteok', 'swissdevjobs', 'swisstechjobs',
]

const FIXTURE = {
  id: 'id', slug: 'slug', job_id: 'job-id', guid: 'guid',
  title: 'Title', job_title: 'Job Title', position: 'Position',
  company: 'Company', companyName: 'Company Name',
  employer_name: 'Employer Name', employer: 'Employer',
  country: 'Country', location: 'Location', locationRestrictions: ['EU', 'UK'],
  job_city: 'City', city: 'Fallback City', date: 'Date', created_at: 'Created',
  job_posted_at: 'Posted', posted_at: 'Posted fallback', pubDate: 'Pub Date',
  url: 'Url', job_apply_link: 'Job Apply', apply_link: 'Apply',
  apply_url: 'Apply Url', applicationLink: 'Application',
  skills: ['skills'], tags: ['tags'], categories: ['categories'],
  type: 'Type', job_type: 'Job Type', job_types: ['Full', 'Part'],
  job_employment_type: 'Job Employment', employment_type: 'Employment',
  employmentType: 'Employment Type', contract_type: 'Contract', prof_group: 'Profession',
  remote: true, job_is_remote: false, is_remote: true,
  salary_min: 52000, salary_max: 72000,
  job_min_salary: 50000, job_max_salary: 70000,
  job_publisher: 'Job Publisher', publisher: 'Publisher',
}

const legacyExpected = (key) => ({
  id: `${key}-id`, title: 'Title', company: 'Company', location: 'Location',
  date: 'Date', url: 'Url', tags: ['tags'], remote: true, source: key,
  employmentType: 'Employment',
})

const LEGACY_OVERRIDES = {
  jobicy: { location: 'Country', tags: ['skills'], employmentType: 'Type' },
  remotive: { employmentType: 'Job Type' },
  arbeitnow: { id: 'arbeitnow-slug', date: 'Created', employmentType: 'Full, Part' },
  jsearch: {
    id: 'jsearch-job-id', title: 'Job Title', company: 'Employer Name',
    location: 'City', date: 'Posted', url: 'Job Apply', tags: [], remote: false,
    employmentType: 'Job Employment',
  },
  remoteok: { title: 'Position', url: 'Apply Url', employmentType: '' },
  himalayas: {
    company: 'Company Name', date: 'Pub Date', url: 'Application',
    tags: ['categories'], employmentType: 'Employment Type',
  },
  adzuna: { employmentType: 'Contract' },
  swisstechjobs: { employmentType: '' },
}

describe('job source handover', () => {
  it('maps every transferred source to its Core namespace', () => {
    expect(CORE_SOURCE_BY_KEY).toEqual(CORE_SOURCES)
  })

  it('keeps legacy paths only for Portfolio-owned sources', () => {
    for (const item of JOB_SOURCES) {
      if (Object.hasOwn(CORE_SOURCE_BY_KEY, item.key)) {
        expect(item).not.toHaveProperty('urlPath')
      } else {
        expect(item.urlPath).toMatch(/^\/api\/v1\/.+-jobs\/recent$/)
      }
    }
  })

  it('keeps every Portfolio-only source in the dashboard registry', () => {
    const keys = JOB_SOURCES.map(({ key }) => key)
    const exclusive = keys.filter(key => !Object.hasOwn(CORE_SOURCE_BY_KEY, key)).sort()

    expect(new Set(keys).size).toBe(keys.length)
    expect(exclusive).toEqual(EXCLUSIVE_SOURCES)
  })

  it('preserves the exact legacy contract for every source', () => {
    for (const item of JOB_SOURCES) {
      const { salaryMin, salaryMax, publisher, ...legacy } = item.normalize(FIXTURE)
      expect(legacy, item.key).toEqual({
        ...legacyExpected(item.key),
        ...LEGACY_OVERRIDES[item.key],
      })
      expect({ salaryMin, salaryMax, publisher }).toEqual({
        salaryMin: 52000,
        salaryMax: 72000,
        publisher: 'Job Publisher',
      })
    }
  })

  it('does not expose analytics-only metadata in the registry', () => {
    for (const item of JOB_SOURCES) {
      expect(item).not.toHaveProperty('skillsField')
      expect(item).not.toHaveProperty('alwaysRemote')
    }
  })

  it('falls back to the Core source and job reference when id is absent', () => {
    expect(normalizeCoreJob({ job_ref: 'abc-123' }, 'remotive').id)
      .toBe('remotive-abc-123')
  })
})
