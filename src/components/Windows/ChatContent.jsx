// El contenido real del chatbot: la lista de mensajes, la casilla de
// escribir, y la lógica de enviar el mensaje y recibir la respuesta de la
// IA palabra por palabra (streaming), con un botón para poder cancelarla.

import { useTranslation } from 'react-i18next';
import useChatStream, { MAX_CHAT_MESSAGE_LENGTH } from '../../hooks/useChatStream';
import '../../styles/chat.css';

const ChatContent = ({ data }) => {
    const { t } = useTranslation();
    const {
        messages,
        input,
        updateInput,
        isStreaming,
        error,
        messagesEndRef,
        inputRef,
        handleKeyDown,
        handleButtonClick,
    } = useChatStream(data, t);

    return (
        <div className="chat-container">
            <div className="chat-messages" aria-live="polite" aria-label={t('chat.messages')}>
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.type}-message${msg.streaming ? ' streaming' : ''}`}>
                        <p>{msg.text}{msg.streaming && <span className="streaming-cursor" aria-hidden="true">|</span>}</p>
                    </div>
                ))}
                {error && (
                    <div className="chat-error" role="alert">
                        {error}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <input
                    ref={inputRef}
                    type="text"
                    className="chat-input"
                    value={input}
                    onChange={(event) => updateInput(event.target.value)}
                    maxLength={MAX_CHAT_MESSAGE_LENGTH}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.placeholder')}
                    aria-label={t('chat.placeholder')}
                    disabled={isStreaming}
                    autoComplete="off"
                />
                {input.length > 0 && (
                    <span
                        className={`chat-char-count${input.length >= MAX_CHAT_MESSAGE_LENGTH ? ' limit' : ''}`}
                        aria-live="off"
                    >
                        {input.length}/{MAX_CHAT_MESSAGE_LENGTH}
                    </span>
                )}
                <button
                    className={`chat-send-btn${isStreaming ? ' stop-btn' : ''}`}
                    onClick={handleButtonClick}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!isStreaming && !input.trim()}
                    type="button"
                >
                    {isStreaming ? t('chat.stop') : t('chat.send')}
                </button>
            </div>
        </div>
    );
};

export default ChatContent;
