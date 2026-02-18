import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import BackgroundEffect from '../components/Background/BackgroundEffect';
import '../styles/login.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!username.trim()) {
            setError(t('login.usernameRequired'));
            setLoading(false);
            return;
        }

        if (!password.trim()) {
            setError(t('login.passwordRequired'));
            setLoading(false);
            return;
        }

        const result = await login(username, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error || t('login.invalidCredentials'));
        }

        setLoading(false);
    };

    return (
        <div className="login-page">
            <BackgroundEffect />

            <div className="login-container">
                <h1>{t('login.title')}</h1>
                <p style={{
                    color: '#8b949e',
                    fontSize: '14px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    {t('login.subtitle')}
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder={t('login.usernamePlaceholder')}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            placeholder={t('login.passwordPlaceholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? t('login.authenticating') : t('login.login')}
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
                        {t('login.backToPortfolio')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
