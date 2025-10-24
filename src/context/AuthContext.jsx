import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Verificar token al cargar
    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken');
        if (storedToken) {
            setToken(storedToken);
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    // Login
    const login = useCallback(async (username, password) => {
        try {
            // --- SIMULACIÓN DE LOGIN ---
            // Comprobamos credenciales predefinidas para la simulación.
            // Usuario: admin, Contraseña: password
            if (username === 'admin' && password === 'password') {
                // Simulamos una respuesta exitosa de la API.
                const fakeToken = 'fake-jwt-token-for-simulation';
                const tokenType = 'bearer';

                localStorage.setItem('accessToken', fakeToken);
                localStorage.setItem('tokenType', tokenType);

                setToken(fakeToken);
                setIsAuthenticated(true);

                return { success: true };
            } else {
                // Simulamos un error de autenticación si las credenciales no coinciden.
                throw new Error('Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message || 'Authentication failed'
            };
        }
    }, []);

    // Logout
    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenType');
        setToken(null);
        setIsAuthenticated(false);
    }, []);

    // Fetch autenticado
    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!token) {
            throw new Error('No authentication token');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            logout();
            throw new Error('Session expired');
        }

        return response;
    }, [token, logout]);

    const value = {
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        authenticatedFetch
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};