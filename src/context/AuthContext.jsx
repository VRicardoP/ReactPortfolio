import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { BACKEND_URL } from '../config/api';

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

    // when the page loads check if there's already a saved token
    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken');
        if (storedToken) {
            setToken(storedToken);
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    // function to log in
    const login = useCallback(async (username, password) => {
        try {
            // prepare the data to send to the server
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

            // save the token so we don't have to log in again
            localStorage.setItem('accessToken', data.access_token);
            localStorage.setItem('tokenType', data.token_type);

            setToken(data.access_token);
            setIsAuthenticated(true);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Authentication failed'
            };
        }
    }, []);

    // log out and clear everything
    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenType');
        setToken(null);
        setIsAuthenticated(false);
    }, []);

    // to make requests to the server with the token
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