import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
});
