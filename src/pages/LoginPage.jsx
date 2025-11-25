import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RainEffect from '../components/Background/RainEffect';
import '../styles/login.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // compruebo que hayan escrito algo
        if (!username.trim()) {
            setError('Username is required');
            setLoading(false);
            return;
        }

        if (!password.trim()) {
            setError('Password is required');
            setLoading(false);
            return;
        }

        const result = await login(username, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error || 'Invalid credentials');
        }

        setLoading(false);
    };

    return (
        <div className="login-page">
            <RainEffect />

            <div className="login-container">
                <h1>Dashboard Access</h1>
                <p style={{
                    color: '#8b949e',
                    fontSize: '14px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    Enter your credentials to access analytics
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Login'}
                    </button>
                </form>

                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}

                <div style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    fontSize: '14px'
                }}>
                    <Link
                        to="/"
                        style={{
                            color: '#00ffff',
                            textDecoration: 'none'
                        }}
                    >
                        ← Back to Portfolio
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;