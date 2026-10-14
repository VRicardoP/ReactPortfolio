// Elige y muestra el fondo animado activo (lluvia, matrix, cubo, etc.),
// descargando solo el código del efecto elegido, y lo desactiva en móvil
// para no gastar batería/rendimiento con gráficos 3D pesados.

import { lazy, Suspense } from 'react';
import { useTheme } from '../../context/ThemeContext';
import useIsMobile from '../../hooks/useIsMobile';

// Lazy-load each effect so only the active one is downloaded
const RainEffect = lazy(() => import('./RainEffect'));
const ParallaxEffect = lazy(() => import('./ParallaxEffect'));
const MatrixEffect = lazy(() => import('./MatrixEffect'));
const LensflareEffect = lazy(() => import('./LensflareEffect'));
const CubeEffect = lazy(() => import('./CubeEffect'));
const SmokeEffect = lazy(() => import('./SmokeEffect'));

// Relaciona el nombre del efecto (guardado en el tema) con su componente.
const EFFECTS = {
    parallax: ParallaxEffect,
    matrix: MatrixEffect,
    lensflare: LensflareEffect,
    cube: CubeEffect,
    smoke: SmokeEffect,
};

const BackgroundEffect = () => {
    const isMobile = useIsMobile();
    const { backgroundEffect } = useTheme();

    // Skip heavy Three.js/Canvas effects on mobile (CSS gradient used instead)
    if (isMobile) return null;

    const EffectComponent = EFFECTS[backgroundEffect] || RainEffect;

    return (
        <Suspense fallback={null}>
            <EffectComponent />
        </Suspense>
    );
};

export default BackgroundEffect;
