import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BACKEND_URL } from '../../config/api';
import '../../styles/chat.css';

const MAX_MESSAGE_LENGTH = 500;
const STREAM_ENDPOINT = `${BACKEND_URL}/api/v1/chat/send-stream`;

const ChatContent = ({ data }) => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: t('chat.greeting', { name: data?.name || 'this portfolio' })
        }
    ]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortControllerRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!isStreaming && inputRef.current) {
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    }, [isStreaming]);

    const stopStreaming = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        const userMessage = input.trim();
        setInput('');
        setError(null);

        setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setIsStreaming(true);

        // Add empty bot message that will be filled by streaming
        setMessages(prev => [...prev, { type: 'bot', text: '', streaming: true }]);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch(STREAM_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                // Keep incomplete last line in buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = JSON.parse(line.slice(6));

                    if (payload.type === 'chunk') {
                        setMessages(prev => {
                            const updated = [...prev];
                            const last = updated[updated.length - 1];
                            updated[updated.length - 1] = {
                                ...last,
                                text: last.text + payload.content,
                            };
                            return updated;
                        });
                    } else if (payload.type === 'done') {
                        // Mark streaming complete
                        setMessages(prev => {
                            const updated = [...prev];
                            updated[updated.length - 1] = {
                                ...updated[updated.length - 1],
                                streaming: false,
                            };
                            return updated;
                        });
                    } else if (payload.type === 'error') {
                        throw new Error(payload.content);
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                // User stopped — mark message as complete
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.streaming) {
                        updated[updated.length - 1] = { ...last, streaming: false };
                    }
                    return updated;
                });
            } else {
                setError(t('chat.errorMessage'));
                // Replace streaming message with error
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        type: 'bot',
                        text: t('chat.errorConnection'),
                        streaming: false,
                    };
                    return updated;
                });
            }
        } finally {
            abortControllerRef.current = null;
            setIsStreaming(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
            return false;
        }
    };

    const handleButtonClick = (e) => {
        e.preventDefault();
        if (isStreaming) {
            stopStreaming();
        } else {
            handleSend();
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-messages" aria-live="polite" aria-label="Chat messages">
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
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    maxLength={MAX_MESSAGE_LENGTH}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.placeholder')}
                    aria-label={t('chat.placeholder')}
                    disabled={isStreaming}
                    autoComplete="off"
                />
                {input.length > 0 && (
                    <span className="chat-char-count" aria-live="off" style={{
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
