import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import '../../styles/chat.css';

const MAX_MESSAGE_LENGTH = 500;

const ChatWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: t('chat.greeting', { name: data?.name || 'this portfolio' })
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';
    const CHAT_ENDPOINT = `${API_BASE_URL}/api/v1/chat/send`;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!isTyping && inputRef.current) {
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    }, [isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        setInput('');
        setError(null);

        setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setIsTyping(true);

        try {
            const response = await fetch(CHAT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const respData = await response.json();

            setMessages(prev => [...prev, {
                type: 'bot',
                text: respData.response
            }]);

        } catch {
            setError(t('chat.errorMessage'));

            setMessages(prev => [...prev, {
                type: 'bot',
                text: t('chat.errorConnection')
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
            return false;
        }
    };

    const handleButtonClick = (e) => {
        e.preventDefault();
        handleSend();
    };

    return (
        <FloatingWindow
            id="chat-window"
            title={t('windows.chat')}
            initialPosition={initialPosition}
            initialSize={{ width: 400, height: 500 }}
        >
            <div className="chat-container">
                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`chat-message ${msg.type}-message`}>
                            <p>{msg.text}</p>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="chat-message bot-message typing">
                            <p>{t('chat.typing')}</p>
                        </div>
                    )}
                    {error && (
                        <div className="chat-error">
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
                        onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                        maxLength={MAX_MESSAGE_LENGTH}
                        onKeyDown={handleKeyDown}
                        placeholder={t('chat.placeholder')}
                        disabled={isTyping}
                        autoFocus
                        autoComplete="off"
                    />
                    {input.length > 0 && (
                        <span className="chat-char-count" style={{
                            fontSize: '10px',
                            color: input.length >= MAX_MESSAGE_LENGTH ? '#ff6b6b' : '#888',
                            position: 'absolute',
                            right: '70px',
                            bottom: '14px',
                            fontFamily: 'Courier New',
                        }}>
                            {input.length}/{MAX_MESSAGE_LENGTH}
                        </span>
                    )}
                    <button
                        className="chat-send-btn"
                        onClick={handleButtonClick}
                        onMouseDown={(e) => e.preventDefault()}
                        disabled={isTyping || !input.trim()}
                        type="button"
                    >
                        {t('chat.send')}
                    </button>
                </div>
            </div>
        </FloatingWindow>
    );
};

export default ChatWindow;
