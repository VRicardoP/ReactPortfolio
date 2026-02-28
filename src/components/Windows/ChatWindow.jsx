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
