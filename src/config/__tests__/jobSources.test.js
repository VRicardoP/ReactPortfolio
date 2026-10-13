import { describe, expect, it } from 'vitest'

import { CORE_SOURCE_BY_KEY, JOB_SOURCES } from '../jobSources'

const CORE_SOURCES = {
  arbeitnow: 'arbeitnow',
  irishjobs: 'irishjobs',
  jobgether: 'jobgether',
  nav: 'nav_arbeidsplassen',
  ostjob: 'ostjob',
  remotive: 'remotive',
  thehub: 'thehub',
  weworkremotely: 'weworkremotely',
  zentraljob: 'zentraljob',
}

const EXCLUSIVE_SOURCES = [
  'adzuna',
  'dynamitejobs',
  'himalayas',
  'ictjobs',
  'jobicy',
  'jobroom',
  'jobscout24',
  'jsearch',
  'remoteok',
  'swissdevjobs',
  'swisstechjobs',
]

describe('job source handover', () => {
  it('maps every transferred source to its Core namespace', () => {
    expect(CORE_SOURCE_BY_KEY).toEqual(CORE_SOURCES)
  })

  it('keeps legacy paths only for Portfolio-owned sources', () => {
    for (const source of JOB_SOURCES) {
      if (Object.hasOwn(CORE_SOURCE_BY_KEY, source.key)) {
        expect(source).not.toHaveProperty('urlPath')
      } else {
        expect(source.urlPath).toMatch(/^\/api\/v1\/.+-jobs\/recent$/)
      }
    }
  })

  it('keeps every Portfolio-only source in the dashboard registry', () => {
    const keys = JOB_SOURCES.map(({ key }) => key)
    const exclusive = keys
      .filter((key) => !Object.hasOwn(CORE_SOURCE_BY_KEY, key))
      .sort()

    expect(new Set(keys).size).toBe(keys.length)
    expect(exclusive).toEqual(EXCLUSIVE_SOURCES)
  })
})
