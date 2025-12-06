import { useTheme } from '../../context/ThemeContext';
import RainEffect from './RainEffect';
import ParallaxEffect from './ParallaxEffect';
import MatrixEffect from './MatrixEffect';
import LensflareEffect from './LensflareEffect';
import CubeEffect from './CubeEffect';
import SmokeEffect from './SmokeEffect';

const BackgroundEffect = () => {
    const { backgroundEffect } = useTheme();

    switch (backgroundEffect) {
        case 'parallax':
            return <ParallaxEffect />;
        case 'matrix':
            return <MatrixEffect />;
        case 'lensflare':
            return <LensflareEffect />;
        case 'cube':
            return <CubeEffect />;
        case 'smoke':
            return <SmokeEffect />;
        default:
            return <RainEffect />;
    }
};

export default BackgroundEffect;
