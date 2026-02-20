import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

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
                    <p>Something went wrong.</p>
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
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
