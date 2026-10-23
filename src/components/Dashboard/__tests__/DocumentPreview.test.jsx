import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));

import DocumentPreview from '../DocumentPreview';

const noop = vi.fn();

describe('DocumentPreview', () => {
    it('muestra un error controlado si el documento está corrupto', () => {
        render(
            <DocumentPreview
                documents={{ cv: { id: 'cv-1', content: '{invalid' }, coverLetter: null }}
                onDownloadPdf={noop}
                onDownloadJson={noop}
                onRegenerate={noop}
                applicationId="app-1"
                onClose={noop}
            />
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'dashboard.cvGeneration.corruptDocument'
        );
    });
});
