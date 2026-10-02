import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('../../Windows/FloatingWindow', () => ({ default: ({ children }) => <div>{children}</div> }));

import SchoolJobsWindow from '../SchoolJobsWindow';

const SCHOOL = {
    id: 'school-1',
    name: 'International School',
    policy: 'direct_email_ok',
    contact_email: 'recruitment@school.ch',
    portal_url: 'https://school.ch',
    jobs_page_url: 'https://school.ch/careers',
};

const JOB = {
    id: 'job-1',
    school_id: SCHOOL.id,
    title: 'IT Manager',
    description_snippet: 'Lead infrastructure and support the school community.',
    date_detected: '2026-10-02T10:00:00Z',
    role_score: '1.00',
    urgency_score: 70,
    url: null,
};

const schoolData = (job = JOB) => ({
    schools: [SCHOOL],
    jobs: [job],
    loading: false,
    error: null,
    refreshing: false,
    triggerScrape: vi.fn(),
    refresh: vi.fn(),
});

describe('SchoolJobsWindow', () => {
    it('shows the jobs page, email and stored description when a job URL is missing', () => {
        render(<SchoolJobsWindow initialPosition={{ x: 0, y: 0 }} schoolData={schoolData()} />);

        expect(screen.getByText(JOB.description_snippet)).toBeTruthy();
        expect(screen.getByRole('link', { name: 'dashboard.schoolJobs.openPortal' }).getAttribute('href'))
            .toBe(SCHOOL.jobs_page_url);
        expect(screen.getByRole('link', { name: 'dashboard.schoolJobs.emailContact' }).getAttribute('href'))
            .toContain(`mailto:${SCHOOL.contact_email}`);
        expect(screen.queryByRole('link', { name: 'dashboard.schoolJobs.viewOffer' })).toBeNull();
    });

    it('uses the individual offer instead of the generic jobs page when available', () => {
        const job = { ...JOB, url: 'https://school.ch/careers/it-manager' };
        render(<SchoolJobsWindow initialPosition={{ x: 0, y: 0 }} schoolData={schoolData(job)} />);

        expect(screen.getByRole('link', { name: 'dashboard.schoolJobs.viewOffer' }).getAttribute('href'))
            .toBe(job.url);
        expect(screen.queryByRole('link', { name: 'dashboard.schoolJobs.openPortal' })).toBeNull();
        expect(screen.getByRole('link', { name: 'dashboard.schoolJobs.emailContact' })).toBeTruthy();
    });
});
