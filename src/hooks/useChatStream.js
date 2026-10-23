import { useCallback, useEffect, useRef, useState } from 'react';

import { BACKEND_URL } from '../config/api';

export const MAX_CHAT_MESSAGE_LENGTH = 500;
const STREAM_ENDPOINT = `${BACKEND_URL}/api/v1/chat/send-stream`;

const finishLastMessage = (messages) => {
    const updated = [...messages];
    const last = updated.at(-1);
    if (last?.streaming) updated[updated.length - 1] = { ...last, streaming: false };
    return updated;
};

// Gestiona la conversación, el protocolo SSE y la cancelación de la respuesta.
const useChatStream = (data, t) => {
    const [messages, setMessages] = useState([{
        type: 'bot',
        text: t('chat.greeting', { name: data?.name || 'this portfolio' }),
    }]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!isStreaming && inputRef.current) {
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isStreaming]);

    useEffect(() => () => abortControllerRef.current?.abort(), []);

    const updateInput = useCallback((value) => {
        setInput(value.slice(0, MAX_CHAT_MESSAGE_LENGTH));
    }, []);

    const stopStreaming = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setIsStreaming(false);
    }, []);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isStreaming) return;

        const userMessage = input.trim();
        setInput('');
        setError(null);
        setMessages(current => [
            ...current,
            { type: 'user', text: userMessage },
            { type: 'bot', text: '', streaming: true },
        ]);
        setIsStreaming(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;
        try {
            const response = await fetch(STREAM_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = JSON.parse(line.slice(6));
                    if (payload.type === 'chunk') {
                        setMessages(current => {
                            const updated = [...current];
                            const last = updated.at(-1);
                            updated[updated.length - 1] = {
                                ...last,
                                text: last.text + payload.content,
                            };
                            return updated;
                        });
                    } else if (payload.type === 'done') {
                        setMessages(finishLastMessage);
                    } else if (payload.type === 'error') {
                        throw new Error(payload.content);
                    }
                }
            }
        } catch (streamError) {
            if (streamError.name === 'AbortError') {
                setMessages(finishLastMessage);
            } else {
                setError(t('chat.errorMessage'));
                setMessages(current => {
                    const updated = [...current];
                    updated[updated.length - 1] = {
                        type: 'bot',
                        text: t('chat.errorConnection'),
                        streaming: false,
                    };
                    return updated;
                });
            }
        } finally {
            if (abortControllerRef.current === controller) abortControllerRef.current = null;
            setIsStreaming(false);
        }
    }, [input, isStreaming, t]);

    const handleKeyDown = useCallback((event) => {
        if (event.key !== 'Enter' || event.shiftKey || isStreaming) return;
        event.preventDefault();
        event.stopPropagation();
        void handleSend();
    }, [handleSend, isStreaming]);

    const handleButtonClick = useCallback((event) => {
        event.preventDefault();
        if (isStreaming) stopStreaming();
        else void handleSend();
    }, [handleSend, isStreaming, stopStreaming]);

    return {
        messages,
        input,
        updateInput,
        isStreaming,
        error,
        messagesEndRef,
        inputRef,
        handleKeyDown,
        handleButtonClick,
    };
};

export default useChatStream;
