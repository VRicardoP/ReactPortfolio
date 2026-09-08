import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import KanbanBoard from './KanbanBoard';
import DocumentLibrary from './DocumentLibrary';
import DocumentDeliveryRecovery from './DocumentDeliveryRecovery';
import { useAuth } from '../../context/AuthContext';
import DocumentPreview from './DocumentPreview';
import useDocumentGeneration from '../../hooks/useDocumentGeneration';

const SelectedOffersPanel = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const docGen = useDocumentGeneration();
    const { user } = useAuth();
    const [previewAppId, setPreviewAppId] = useState(null);

    // Pre-load document status for all applications so icon buttons render correctly
    useEffect(() => {
        docGen.fetchAllDocuments();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleViewDocs = useCallback((appId) => {
        docGen.fetchDocuments(appId);
        setPreviewAppId(appId);
    }, [docGen]);

    const handleGenerate = useCallback(
        (...args) => docGen.generate(...args).catch(() => null),
        [docGen],
    );

    const handleClosePreview = useCallback(() => {
        setPreviewAppId(null);
    }, []);

    const handleDownloadPdf = useCallback(async (appId) => {
        let docs = docGen.getDocumentsFor(appId);
        if (!docs) {
            docs = await docGen.fetchDocuments(appId);
        }
        if (docs?.cv) {
            docGen.downloadPdf(docs.cv.id, 'cv_adapted.pdf');
        }
        if (docs?.coverLetter) {
            docGen.downloadPdf(docs.coverLetter.id, 'cover_letter.pdf');
        }
    }, [docGen]);

    const handleDeleteApp = useCallback((appId) => {
        if (previewAppId === appId) setPreviewAppId(null);
    }, [previewAppId]);

    return (
        <FloatingWindow
            id="selected-offers-panel"
            title={t('dashboard.selectedOffers.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 900, height: 550 }}
        >
            <div className="selected-offers-panel">
                <div className={`selected-offers-kanban${previewAppId ? ' with-preview' : ''}`}>
                    {docGen.error && <p role="alert">{docGen.error}</p>}
                    <DocumentDeliveryRecovery onDelivered={docGen.fetchDocuments} />
                    <DocumentLibrary key={user?.id}
                        onDownloadPdf={docGen.downloadPdf}
                        onDownloadJson={docGen.downloadJson}
                        onDeleted={docGen.fetchDocuments}
                    />
                    <KanbanBoard
                        documentMap={docGen.documents}
                        generatingIds={docGen.generatingSet}
                        onGenerate={handleGenerate}
                        onViewDocuments={handleViewDocs}
                        onDownloadPdf={handleDownloadPdf}
                        onDelete={handleDeleteApp}
                    />
                </div>

                {previewAppId && (
                    <DocumentPreview
                        documents={docGen.getDocumentsFor(previewAppId)}
                        onDownloadPdf={docGen.downloadPdf}
                        onDownloadJson={docGen.downloadJson}
                        onRegenerate={handleGenerate}
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
