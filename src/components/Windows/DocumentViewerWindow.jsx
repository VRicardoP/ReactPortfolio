import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const DocumentViewerWindow = ({ title, fileUrl, onClose }) => {
    const { t } = useTranslation();

    return (
        <FloatingWindow
            id="document-viewer-window"
            title={title}
            initialPosition={{ x: 180, y: 120 }}
            initialSize={{ width: 760, height: 680 }}
        >
            <div className="document-viewer">
                <div className="document-viewer-actions">
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        {t('documentViewer.openNewTab')}
                    </a>
                    <a href={fileUrl} download>{t('documentViewer.download')}</a>
                    <button type="button" onClick={onClose}>{t('documentViewer.close')}</button>
                </div>
                <iframe src={fileUrl} title={title} className="document-viewer-frame" />
            </div>
        </FloatingWindow>
    );
};

export default DocumentViewerWindow;
