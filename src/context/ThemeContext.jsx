import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// definition of available themes
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

// Available 3D/2D background effects. First entry is the default.
const BACKGROUND_EFFECTS = ['rain', 'parallax', 'matrix', 'lensflare', 'cube', 'smoke'];

const cursorValue = (body, color, hotspot, fallback) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${body.replaceAll('COLOR', color)}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot}, ${fallback}`;
};

const themedCursors = (color) => ({
    '--cursor-default': cursorValue('<path d="M3 2v24l6-7 5 11 4-2-5-10h10z" fill="#050505" stroke="COLOR" stroke-width="2"/>', color, '3 2', 'auto'),
    '--cursor-pointer': cursorValue('<circle cx="16" cy="16" r="8" fill="#050505" stroke="COLOR" stroke-width="2"/><path d="M16 2v8M16 22v8M2 16h8M22 16h8" stroke="COLOR" stroke-width="2"/>', color, '16 16', 'pointer'),
    '--cursor-grab': cursorValue('<path d="M9 15V9a2 2 0 014 0v4-6a2 2 0 014 0v6-5a2 2 0 014 0v6-3a2 2 0 014 0v8c0 6-4 10-10 10h-1c-4 0-7-2-9-6l-2-5a2 2 0 014-2l3 4" fill="#050505" stroke="COLOR" stroke-width="1.5"/>', color, '16 15', 'grab'),
    '--cursor-grabbing': cursorValue('<path d="M8 16V9a2 2 0 014 0v5-7a2 2 0 014 0v7-6a2 2 0 014 0v6-4a2 2 0 014 0v9c0 6-4 10-10 10h-1c-4 0-7-2-9-6l-2-4a2 2 0 014-2l3 4" fill="#050505" stroke="COLOR" stroke-width="2"/>', color, '16 16', 'grabbing'),
    '--cursor-resize-x': cursorValue('<path d="M3 16h26M3 16l6-6M3 16l6 6M29 16l-6-6M29 16l-6 6" stroke="COLOR" stroke-width="2"/>', color, '16 16', 'ew-resize'),
    '--cursor-resize-y': cursorValue('<path d="M16 3v26M16 3l-6 6M16 3l6 6M16 29l-6-6M16 29l6-6" stroke="COLOR" stroke-width="2"/>', color, '16 16', 'ns-resize'),
    '--cursor-resize-nwse': cursorValue('<path d="M5 5l22 22M5 5h9M5 5v9M27 27h-9M27 27v-9" stroke="COLOR" stroke-width="2"/>', color, '16 16', 'nwse-resize'),
    '--cursor-resize-nesw': cursorValue('<path d="M27 5L5 27M27 5h-9M27 5v9M5 27h9M5 27v-9" stroke="COLOR" stroke-width="2"/>', color, '16 16', 'nesw-resize'),
});

export const ThemeProvider = ({ children }) => {
    const [themeName, setThemeName] = useState(() => {
        // retrieve saved theme from localStorage
        const saved = localStorage.getItem('portfolio-theme');
        return saved && themes[saved] ? saved : 'cyan';
    });

    const [backgroundEffect, setBackgroundEffect] = useState(() => {
        // retrieve saved background effect from localStorage
        const saved = localStorage.getItem('portfolio-background');
        return BACKGROUND_EFFECTS.includes(saved) ? saved : BACKGROUND_EFFECTS[0];
    });

    const theme = useMemo(() => themes[themeName], [themeName]);

    const setTheme = useCallback((name) => {
        if (themes[name]) {
            setThemeName(name);
            localStorage.setItem('portfolio-theme', name);
        }
    }, []);

    const cycleTheme = useCallback(() => {
        const themeNames = Object.keys(themes);
        const currentIndex = themeNames.indexOf(themeName);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        setTheme(themeNames[nextIndex]);
    }, [themeName, setTheme]);

    const setBackground = useCallback((effect) => {
        if (BACKGROUND_EFFECTS.includes(effect)) {
            setBackgroundEffect(effect);
            localStorage.setItem('portfolio-background', effect);
        }
    }, []);

    const cycleBackground = useCallback(() => {
        const currentIndex = BACKGROUND_EFFECTS.indexOf(backgroundEffect);
        const nextIndex = (currentIndex + 1) % BACKGROUND_EFFECTS.length;
        setBackground(BACKGROUND_EFFECTS[nextIndex]);
    }, [backgroundEffect, setBackground]);

    // apply global CSS variables when the theme changes
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', theme.primary);
        root.style.setProperty('--theme-primary-rgb', theme.primaryRgb);
        root.style.setProperty('--theme-secondary', theme.secondary);
        root.style.setProperty('--theme-background', theme.background);
        root.style.setProperty('--theme-text', theme.text);
        root.style.setProperty('--theme-text-highlight', theme.textHighlight);
        root.style.setProperty('--theme-border', theme.border);
        root.style.setProperty('--theme-border-light', theme.borderLight);
        Object.entries(themedCursors(theme.primary)).forEach(([name, value]) => {
            root.style.setProperty(name, value);
        });
    }, [theme]);

    const value = useMemo(() => ({
        theme,
        themeName,
        setTheme,
        cycleTheme,
        backgroundEffect,
        setBackground,
        cycleBackground,
        availableThemes: Object.keys(themes).map(key => ({ key, name: themes[key].name }))
    }), [theme, themeName, setTheme, backgroundEffect, setBackground, cycleTheme, cycleBackground]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
