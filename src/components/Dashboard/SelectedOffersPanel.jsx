import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import KanbanBoard from './KanbanBoard';
import DocumentPreview from './DocumentPreview';
import useDocumentGeneration from '../../hooks/useDocumentGeneration';

const SelectedOffersPanel = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const docGen = useDocumentGeneration();
    const [previewAppId, setPreviewAppId] = useState(null);

    const handleViewDocs = useCallback((appId) => {
        docGen.fetchDocuments(appId);
        setPreviewAppId(appId);
    }, [docGen]);

    const handleClosePreview = useCallback(() => {
        setPreviewAppId(null);
    }, []);

    return (
        <FloatingWindow
            id="selected-offers-panel"
            title={t('dashboard.selectedOffers.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 900, height: 550 }}
        >
            <div className="selected-offers-panel">
                <div className={`selected-offers-kanban${previewAppId ? ' with-preview' : ''}`}>
                    <KanbanBoard
                        documentMap={docGen.documents}
                        generatingIds={docGen.generatingSet}
                        onGenerate={docGen.generate}
                        onViewDocuments={handleViewDocs}
                    />
                </div>

                {previewAppId && (
                    <DocumentPreview
                        documents={docGen.getDocumentsFor(previewAppId)}
                        onDownloadPdf={docGen.downloadPdf}
                        onDownloadJson={docGen.downloadJson}
                        onRegenerate={docGen.generate}
                        applicationId={previewAppId}
                        onClose={handleClosePreview}
                    />
                )}
            </div>
        </FloatingWindow>
    );
});

SelectedOffersPanel.displayName = 'SelectedOffersPanel';

export default SelectedOffersPanel;
