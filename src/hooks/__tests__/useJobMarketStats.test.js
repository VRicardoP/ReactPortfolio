import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useJobMarketStats from '../useJobMarketStats';

const theme = {
  primary: '#0ff',
  primaryRgb: '0, 255, 255',
  error: '#f66',
  chartColors: ['cyan'],
};

describe('useJobMarketStats', () => {
  it('builds market and salary datasets from normalized jobs', () => {
    const jobData = {
      jobicy: { _normalized: [{
        tags: ['React'], remote: true, salaryMin: 50000, salaryMax: 70000,
        employmentType: 'Full-time', publisher: 'Jobicy',
      }] },
    };
    const { result } = renderHook(() => useJobMarketStats(jobData, theme, key => key));

    expect(result.current.allJobs).toHaveLength(1);
    expect(result.current.skillsChartData.labels).toEqual(['React']);
    expect(result.current.remoteChartData.datasets[0].data).toEqual([1, 0]);
    expect(result.current.rangesChartData.datasets[0].data).toEqual([0, 1, 0, 0, 0]);
    expect(result.current.byTypeChartData.datasets[0].data).toEqual([60000]);
  });
});
