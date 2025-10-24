import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import RainEffect from '../components/Background/RainEffect';
import { WindowProvider } from '../context/WindowContext';
import Toast from '../components/UI/Toast';
import StatsWindow from '../components/Dashboard/StatsWindow';
import MapWindow from '../components/Dashboard/MapWindow';
import JobicyWindow from '../components/Dashboard/JobicyWindow';
import RemotiveWindow from '../components/Dashboard/RemotiveWindow';
import RecentVisitorsWindow from '../components/Dashboard/RecentVisitorsWindow';
import useTypewriter from '../hooks/useTypewriter';
import useWindowLayout from '../hooks/useWindowLayout';
import '../styles/dashboard.css';

// Componente que contiene las ventanas dentro del WindowProvider
function DashboardContent({ stats, mapData, jobicyData, remotiveData }) {
    const dashboardWindowIds = [
        'stats-window',
        'recent-visitors-window',
        'map-window',
        'jobicy-window',
        'remotive-window'
    ];

    // Animación cascada → menú después de 3 segundos
    useWindowLayout(dashboardWindowIds, 3000);

    return (
        <>
            <StatsWindow
                data={stats}
                initialPosition={{ x: 100, y: 120 }}
            />

            <RecentVisitorsWindow
                data={stats}
                initialPosition={{ x: 130, y: 130 }}
            />

            <MapWindow
                data={mapData}
                initialPosition={{ x: 160, y: 140 }}
            />

            <JobicyWindow
                data={jobicyData}
                initialPosition={{ x: 190, y: 150 }}
            />

            <RemotiveWindow
                data={remotiveData}
                initialPosition={{ x: 220, y: 160 }}
            />
        </>
    );
}

const DashboardPage = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const typedText = useTypewriter('Dashboard > Analytics', 100);
    const { stats, mapData, jobicyData, remotiveData, loading, error } = useDashboardData();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleGoHome = () => {
        navigate('/');
    };

    // Estado de carga
    if (loading) {
        return (
            <>
                <RainEffect />
                <div className="dashboard-header">
                    <h1 className="main-title">
                        <span className="typewriter-container">Loading dashboard...</span>
                        <span className="terminal-cursor"></span>
                    </h1>
                </div>
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#00ffff',
                    fontFamily: 'Courier New',
                    zIndex: 100
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
                    <p style={{ fontSize: '18px' }}>Fetching analytics data...</p>
                </div>
            </>
        );
    }

    // Estado de error
    if (error) {
        return (
            <>
                <RainEffect />
                <div className="dashboard-header">
                    <h1 className="main-title">
                        <span className="typewriter-container">Dashboard Error</span>
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
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#ff6b6b',
                    fontFamily: 'Courier New',
                    zIndex: 100,
                    maxWidth: '600px',
                    padding: '30px',
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '2px solid #ff6b6b',
                    borderRadius: '8px'
                }}>
                    <h2 style={{ marginTop: 0 }}>❌ Failed to load dashboard data</h2>
                    <p style={{ fontSize: '16px', margin: '20px 0' }}>{error}</p>
                    <div style={{
                        fontSize: '14px',
                        marginTop: '30px',
                        padding: '15px',
                        background: 'rgba(255, 107, 107, 0.1)',
                        borderRadius: '4px',
                        color: '#D3D3D3'
                    }}>
                        <strong>Troubleshooting:</strong>
                        <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                            <li>Check backend is running at http://127.0.0.1:8000</li>
                            <li>Verify you're logged in with valid credentials</li>
                            <li>Check browser console for detailed errors</li>
                            <li>Ensure CORS is properly configured on backend</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#00ffff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontFamily: 'Courier New',
                            fontWeight: 'bold'
                        }}
                    >
                        Retry
                    </button>
                </div>
            </>
        );
    }

    // Dashboard completo con datos cargados
    return (
        <>
            {/* Efecto de lluvia de fondo */}
            <RainEffect />

            {/* Header con título y navegación */}
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

            {/* Sistema de notificaciones */}
            <Toast />

            {/* WindowProvider envuelve las ventanas del dashboard */}
            <WindowProvider>
                <DashboardContent
                    stats={stats}
                    mapData={mapData}
                    jobicyData={jobicyData}
                    remotiveData={remotiveData}
                />
            </WindowProvider>
        </>
    );
};

export default DashboardPage;