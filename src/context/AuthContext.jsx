import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext();

const BACKEND_URL = 'http://127.0.0.1:8000';

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

    // Login real con el backend
    const login = useCallback(async (username, password) => {
        try {
            // Crear FormData para el endpoint OAuth2
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`${BACKEND_URL}/api/v1/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Authentication failed');
            }

            const data = await response.json();

            // Guardar tokens
            localStorage.setItem('accessToken', data.access_token);
            localStorage.setItem('tokenType', data.token_type);

            setToken(data.access_token);
            setIsAuthenticated(true);

            return { success: true };
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

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Request failed');
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