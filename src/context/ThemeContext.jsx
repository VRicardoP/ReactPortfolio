import { createContext, useContext, useState, useEffect, useMemo } from 'react';

// definicion de los temas disponibles
const themes = {
    cyan: {
        name: 'Cyan',
        primary: '#00ffff',
        primaryRgb: '0, 255, 255',
        secondary: '#D3D3D3',
        background: 'rgba(0, 0, 0, 0.95)',
        backgroundLight: 'rgba(0, 255, 255, 0.05)',
        backgroundMedium: 'rgba(0, 255, 255, 0.1)',
        border: 'rgba(0, 255, 255, 0.3)',
        borderLight: 'rgba(0, 255, 255, 0.2)',
        text: '#D3D3D3',
        textHighlight: '#00ffff',
        success: '#00ff00',
        error: '#ff6b6b',
        warning: '#ffcc00',
        chartColors: [
            'rgba(0, 255, 255, 0.8)',
            'rgba(0, 200, 200, 0.8)',
            'rgba(0, 150, 150, 0.8)',
            'rgba(0, 100, 100, 0.8)',
            'rgba(0, 50, 50, 0.8)'
        ]
    },
    silver: {
        name: 'Silver',
        primary: '#a0a0a0',
        primaryRgb: '160, 160, 160',
        secondary: '#e0e0e0',
        background: 'rgba(20, 20, 25, 0.95)',
        backgroundLight: 'rgba(160, 160, 160, 0.05)',
        backgroundMedium: 'rgba(160, 160, 160, 0.1)',
        border: 'rgba(160, 160, 160, 0.3)',
        borderLight: 'rgba(160, 160, 160, 0.2)',
        text: '#e0e0e0',
        textHighlight: '#ffffff',
        success: '#7fcc7f',
        error: '#cc7f7f',
        warning: '#cccc7f',
        chartColors: [
            'rgba(180, 180, 180, 0.8)',
            'rgba(150, 150, 150, 0.8)',
            'rgba(120, 120, 120, 0.8)',
            'rgba(90, 90, 90, 0.8)',
            'rgba(60, 60, 60, 0.8)'
        ]
    },
    amber: {
        name: 'Amber',
        primary: '#d4a574',
        primaryRgb: '212, 165, 116',
        secondary: '#e8d5c4',
        background: 'rgba(15, 10, 5, 0.95)',
        backgroundLight: 'rgba(212, 165, 116, 0.05)',
        backgroundMedium: 'rgba(212, 165, 116, 0.1)',
        border: 'rgba(212, 165, 116, 0.3)',
        borderLight: 'rgba(212, 165, 116, 0.2)',
        text: '#e8d5c4',
        textHighlight: '#d4a574',
        success: '#a5d46e',
        error: '#d47474',
        warning: '#d4c474',
        chartColors: [
            'rgba(212, 165, 116, 0.8)',
            'rgba(180, 140, 100, 0.8)',
            'rgba(150, 115, 80, 0.8)',
            'rgba(120, 90, 60, 0.8)',
            'rgba(90, 65, 40, 0.8)'
        ]
    }
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    const [themeName, setThemeName] = useState(() => {
        // recuperar tema guardado en localStorage
        const saved = localStorage.getItem('portfolio-theme');
        return saved && themes[saved] ? saved : 'cyan';
    });

    const [backgroundEffect, setBackgroundEffect] = useState(() => {
        // recuperar efecto de fondo guardado en localStorage
        const saved = localStorage.getItem('portfolio-background');
        const validEffects = ['rain', 'parallax', 'matrix', 'lensflare', 'cube', 'smoke'];
        return validEffects.includes(saved) ? saved : 'rain';
    });

    const theme = useMemo(() => themes[themeName], [themeName]);

    const setTheme = (name) => {
        if (themes[name]) {
            setThemeName(name);
            localStorage.setItem('portfolio-theme', name);
        }
    };

    const cycleTheme = () => {
        const themeNames = Object.keys(themes);
        const currentIndex = themeNames.indexOf(themeName);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        setTheme(themeNames[nextIndex]);
    };

    const cycleBackground = () => {
        const effects = ['rain', 'parallax', 'matrix', 'lensflare', 'cube', 'smoke'];
        const currentIndex = effects.indexOf(backgroundEffect);
        const nextIndex = (currentIndex + 1) % effects.length;
        const newEffect = effects[nextIndex];
        setBackgroundEffect(newEffect);
        localStorage.setItem('portfolio-background', newEffect);
    };

    // aplicar variables CSS globales cuando cambia el tema
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', theme.primary);
        root.style.setProperty('--theme-primary-rgb', theme.primaryRgb);
        root.style.setProperty('--theme-secondary', theme.secondary);
        root.style.setProperty('--theme-background', theme.background);
        root.style.setProperty('--theme-text', theme.text);
        root.style.setProperty('--theme-text-highlight', theme.textHighlight);
    }, [theme]);

    const value = useMemo(() => ({
        theme,
        themeName,
        setTheme,
        cycleTheme,
        backgroundEffect,
        cycleBackground,
        availableThemes: Object.keys(themes).map(key => ({ key, name: themes[key].name }))
    }), [theme, themeName, backgroundEffect]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
