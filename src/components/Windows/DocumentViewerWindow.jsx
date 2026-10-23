// Ventana flotante para ver un documento (como un PDF) dentro de la propia
// página, con botones para abrirlo en otra pestaña, descargarlo o cerrarlo.

import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import { WINDOW_SIZES } from '../../config/windowSizes';

const DocumentViewerWindow = ({ title, fileUrl, onClose }) => {
    const { t } = useTranslation();

    return (
        <FloatingWindow
            id="document-viewer-window"
            title={title}
            initialPosition={{ x: 180, y: 120 }}
            initialSize={WINDOW_SIZES.documentViewer}
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
