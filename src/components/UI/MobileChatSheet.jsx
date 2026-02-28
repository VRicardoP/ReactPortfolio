import { useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/mobile.css';

const ChatContent = lazy(() => import('../Windows/ChatContent'));

const MobileChatSheet = ({ data }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation();

    return (
        <>
            <button
                className="mobile-chat-fab"
                onClick={() => setIsOpen(true)}
                aria-label={t('mobile.openChat')}
            >
                {'💬'}
            </button>

            {isOpen && (
                <>
                    <div
                        className="mobile-chat-overlay"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="mobile-chat-sheet" role="dialog" aria-label={t('windows.chat')}>
                        <div className="mobile-chat-sheet-header">
                            <span className="mobile-chat-sheet-title">{t('windows.chat')}</span>
                            <button
                                className="mobile-chat-close-btn"
                                onClick={() => setIsOpen(false)}
                                aria-label={t('mobile.closeChat')}
                            >
                                {'\u00D7'}
                            </button>
                        </div>
                        <div className="mobile-chat-sheet-body">
                            <Suspense fallback={null}>
                                <ChatContent data={data} />
                            </Suspense>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default MobileChatSheet;
