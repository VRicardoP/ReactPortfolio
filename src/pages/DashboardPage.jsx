import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RainEffect from '../components/Background/RainEffect';
import { WindowProvider } from '../context/WindowContext';
import Toast from '../components/UI/Toast';
import useTypewriter from '../hooks/useTypewriter';
import '../styles/dashboard.css';

// Componente temporal mientras creamos las ventanas del dashboard
function DashboardContent() {
    return (
        <div className="dashboard-placeholder">
            <h2>Dashboard Content</h2>
            <p>Aquí irán las ventanas de estadísticas, mapa y gráficos</p>
        </div>
    );
}

const DashboardPage = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const typedText = useTypewriter('Dashboard > Analytics', 100);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <>
            <RainEffect />

            <div className="dashboard-header">
                <h1 className="main-title">
                    <span className="typewriter-container">{typedText}</span>
                    <span className="terminal-cursor"></span>
                </h1>

                <div className="dashboard-nav">
                    <button onClick={handleGoHome} className="nav-button">
                        ← Portfolio
                    </button>
                    <button onClick={handleLogout} className="nav-button logout">
                        Logout
                    </button>
                </div>
            </div>

            <Toast />

            <WindowProvider>
                <DashboardContent />
            </WindowProvider>
        </>
    );
};

export default DashboardPage;