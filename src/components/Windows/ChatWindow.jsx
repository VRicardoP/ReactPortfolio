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

    // la url del servidor donde esta el chatbot
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
    const CHAT_ENDPOINT = `${API_BASE_URL}/api/v1/chat/send`;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // cuando el bot termina de escribir vuelvo a poner el cursor en el input
    useEffect(() => {
        if (!isTyping && inputRef.current) {
            // espero un poco a que se actualice la pantalla
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

        // pongo el mensaje del usuario en la lista
        setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setIsTyping(true);

        try {
            // envio el mensaje al servidor
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

            // cuando responde el servidor muestro lo que dijo el bot
            setMessages(prev => [...prev, {
                type: 'bot',
                text: data.response
            }]);

        } catch (error) {
            console.error('Error sending message:', error);
            setError('Sorry, I encountered an error. Please try again.');

            // si falla muestro un mensaje de que algo salio mal
            setMessages(prev => [...prev, {
                type: 'bot',
                text: 'Sorry, I encountered an error connecting to the server. Please try again in a moment.'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        // si pulso enter y el bot no esta escribiendo envio el mensaje
        if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
            // para que no haga otras cosas raras
            return false;
        }
    };

    // cuando le dan click al boton de enviar
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