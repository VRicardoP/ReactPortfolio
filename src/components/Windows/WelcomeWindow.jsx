import { useState } from 'react';
import FloatingWindow from './FloatingWindow';
import '../../styles/welcome-window.css';

const WelcomeWindow = ({ portfolioData }) => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    const centerX = (window.innerWidth - 600) / 2;
    const centerY = (window.innerHeight - 400) / 2;

    return (
        <FloatingWindow
            id="welcome-window"
            title={`🚀 Bienvenido - ${portfolioData?.name || 'Portfolio'}`}
            initialPosition={{ x: Math.max(0, centerX), y: Math.max(0, centerY) }}
            initialSize={{ width: 600, height: 400 }}
        >
            <div className="welcome-content">
                <div className="welcome-header">
                    <h2>¡Hola! Soy {portfolioData?.name}</h2>
                    <p className="welcome-subtitle">{portfolioData?.title}</p>
                </div>

                <div className="welcome-body">
                    <p><strong>Bienvenido a mi portfolio interactivo.</strong></p>
                    <p>Esta web simula un entorno de escritorio donde puedes explorar mi experiencia profesional y habilidades.</p>

                    <div className="instructions">
                        <h3>📋 Cómo navegar:</h3>
                        <ul>
                            <li><span className="icon">🖱️</span> <strong>Arrastrar:</strong> Haz clic en la barra superior de cualquier ventana y muévela</li>
                            <li><span className="icon">↔️</span> <strong>Redimensionar:</strong> Arrastra desde los bordes y esquinas</li>
                            <li><span className="icon purple-dot"></span> <strong>Minimizar:</strong> Click en el botón morado (izquierda)</li>
                            <li><span className="icon yellow-dot"></span> <strong>Maximizar:</strong> Click en el botón amarillo (derecha)</li>
                        </ul>
                    </div>

                    <div className="welcome-tip">
                        💡 <strong>Tip:</strong> Explora las diferentes ventanas para conocer más sobre mi experiencia, habilidades y proyectos.
                    </div>
                </div>

                <div className="welcome-footer">
                    <button
                        className="close-welcome-btn"
                        onClick={() => setIsVisible(false)}
                    >
                        Entendido, ¡empecemos! →
                    </button>
                </div>
            </div>
        </FloatingWindow>
    );
};

export default WelcomeWindow;