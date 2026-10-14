// Portero de las páginas privadas (como el panel de control): si el
// usuario no ha iniciado sesión, lo manda a la página de login en vez de
// dejarle ver la página protegida.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                color: '#00ffff',
                fontSize: '20px',
                fontFamily: 'Courier New'
            }}>
                Loading...
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;