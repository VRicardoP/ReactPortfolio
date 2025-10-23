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
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');

        // Añadir mensaje del usuario
        setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setIsTyping(true);

        // Simular respuesta del bot (aquí conectarías con tu API)
        setTimeout(() => {
            const botResponse = generateBotResponse(userMessage, data);
            setMessages(prev => [...prev, { type: 'bot', text: botResponse }]);
            setIsTyping(false);
        }, 1000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <FloatingWindow
            id="chat-window"
            title="Kusanagi - AI Assistant"
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
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-area">
                    <input
                        type="text"
                        className="chat-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything..."
                    />
                    <button className="chat-send-btn" onClick={handleSend}>
                        Send
                    </button>
                </div>
            </div>
        </FloatingWindow>
    );
};

// Función simple para generar respuestas (puedes conectar con tu backend)
const generateBotResponse = (message, data) => {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('experience') || lowerMsg.includes('work')) {
        return `${data.name} has ${data.experience.length} professional experiences listed, including roles at ${data.experience[0]?.company}. Would you like details about a specific position?`;
    }

    if (lowerMsg.includes('skill') || lowerMsg.includes('technology')) {
        const totalSkills = Object.values(data.techSkills).flat().length;
        return `${data.name} has expertise in ${totalSkills} technologies across frontend, backend, databases, and system administration. Any specific technology you'd like to know about?`;
    }

    if (lowerMsg.includes('education') || lowerMsg.includes('study')) {
        return `${data.name} has ${data.education.length} educational entries, including ${data.education[0]?.title}. The focus is on web development and system administration.`;
    }

    if (lowerMsg.includes('contact') || lowerMsg.includes('email')) {
        return `You can reach ${data.name} at ${data.email}. Feel free to send a message!`;
    }

    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        return `Hello! I'm here to help you learn more about ${data.name}'s professional background. What would you like to know?`;
    }

    return `That's an interesting question! I can tell you about ${data.name}'s experience, skills, education, or contact information. What interests you most?`;
};

export default ChatWindow;