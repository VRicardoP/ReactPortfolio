// Ventana flotante del chatbot: solo pone el marco de la ventana alrededor
// del contenido real del chat (que vive en ChatContent).

import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import ChatContent from './ChatContent';

const ChatWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();

    return (
        <FloatingWindow
            id="chat-window"
            title={t('windows.chat')}
            initialPosition={initialPosition}
            initialSize={{ width: 400, height: 500 }}
        >
            <ChatContent data={data} />
        </FloatingWindow>
    );
};

export default ChatWindow;
