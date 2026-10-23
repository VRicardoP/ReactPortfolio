import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../context/ThemeContext', () => ({
    useTheme: () => ({ theme: {
        primary: '#00e5ff', primaryRgb: '0, 229, 255', text: '#ddd',
        textHighlight: '#fff', borderLight: '#333',
    } }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('../JobCardExtras', () => ({
    CompanyResearchName: ({ children }) => <span>{children}</span>,
    JobBadges: () => <span>badges</span>,
    JobDate: ({ date }) => <time>{date}</time>,
    JobSummary: () => <p>summary</p>,
}));

import JobCard from '../JobCard';

const job = {
    id: '1', title: 'Original', title_en: 'English', company: 'Example',
    location: 'Bern', date: '2026-10-23', url: 'https://example.test/job',
    source: 'test', remote: true, employmentType: 'full-time', tags: ['React'],
};

describe('JobCard', () => {
    it('preserva la estructura de la variante board', () => {
        const { container } = render(<JobCard job={job} actions={<button>Save</button>} showSource />);
        expect(container.firstChild).toMatchSnapshot();
    });
    it('preserva la estructura de la variante filter', () => {
        const { container } = render(
            <JobCard
                job={{ ...job, salary_min: 50000, salary_max: 70000, employment_type: 'FULLTIME' }}
                variant="filter"
                formatSalary={(min, max) => `${min}-${max}`}
                actions={<button>Open</button>}
            />
        );
        expect(container.firstChild).toMatchSnapshot();
    });
    it('preserva la estructura de la variante live', () => {
        const { container } = render(
            <JobCard
                job={{ ...job, job_title: 'Live', employer_name: 'Live Co', job_is_remote: true, job_city: 'Zürich', job_country: 'CH', job_publisher: 'JSearch' }}
                variant="live"
                formatSalary={() => 'CHF 100000'}
                actions={<a href="https://example.test/job">Apply</a>}
            />
        );
        expect(container.firstChild).toMatchSnapshot();
    });
});
