import { useState, useRef, useEffect } from 'react';
import FloatingWindow from './FloatingWindow';
import '../../styles/chat.css';

const ChatWindow = ({ data, initialPosition }) => {
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: `¡Hi there! I'm Kusanagi! Do you have any questions about ${data?.name || 'this portfolio'}?`
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Configuración de la API del backend
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const CHAT_ENDPOINT = `${API_BASE_URL}/api/v1/chat/send`;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Efecto para mantener el foco cuando cambia isTyping
    useEffect(() => {
        if (!isTyping && inputRef.current) {
            // Usar requestAnimationFrame para asegurar que el DOM se haya actualizado
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

        // Añadir mensaje del usuario
        setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setIsTyping(true);

        try {
            // Llamada al backend
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

            const data = await response.json();

            // Añadir respuesta del bot
            setMessages(prev => [...prev, {
                type: 'bot',
                text: data.response
            }]);

        } catch (error) {
            console.error('Error sending message:', error);
            setError('Sorry, I encountered an error. Please try again.');

            // Añadir mensaje de error
            setMessages(prev => [...prev, {
                type: 'bot',
                text: 'Sorry, I encountered an error connecting to the server. Please try again in a moment.'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        // Solo procesar Enter cuando no está escribiendo
        if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
            // Prevenir que el evento llegue a otros handlers
            return false;
        }
    };

    // Handler alternativo para el botón
    const handleButtonClick = (e) => {
        e.preventDefault();
        handleSend();
    };

    return (
        <FloatingWindow
            id="chat-window"
            title="Kusanagi AI"
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
                            <p>Kusanagi is typing...</p>
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
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything..."
                        disabled={isTyping}
                        autoFocus
                        autoComplete="off"
                    />
                    <button
                        className="chat-send-btn"
                        onClick={handleButtonClick}
                        onMouseDown={(e) => e.preventDefault()}
                        disabled={isTyping || !input.trim()}
                        type="button"
                    >
                        Send
                    </button>
                </div>
            </div>
        </FloatingWindow>
    );
};

export default ChatWindow;