// Red de seguridad: si algo dentro de esta parte de la página se rompe
// (un error de JavaScript), en vez de que toda la web se quede en blanco,
// muestra un aviso con un botón para reintentar, y el resto sigue
// funcionando.

import { Component } from 'react';
import i18n from '../i18n';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    // React llama aquí cuando algo de dentro ha fallado, para decirle
    // al componente que debe mostrar el aviso de error.
    static getDerivedStateFromError() {
        return { hasError: true };
    }

    // Registra el error en la consola para poder investigarlo luego.
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback === null) return null;

            return this.props.fallback || (
                <div style={{
                    color: '#ff6b6b',
                    fontFamily: 'Courier New',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <p>{i18n.t('error.somethingWrong')}</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        style={{
                            color: '#00ffff',
                            background: 'transparent',
                            border: '1px solid #00ffff',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontFamily: 'Courier New',
                            marginTop: '10px'
                        }}
                    >
                        {i18n.t('error.tryAgain')}
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
