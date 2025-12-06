import { useEffect, useState, useCallback } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useTheme } from '../../context/ThemeContext';

const ParallaxEffect = () => {
    const [init, setInit] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const particlesLoaded = useCallback(async (container) => {
        console.log('Particles loaded:', container);
    }, []);

    const options = {
        fullScreen: {
            enable: true,
            zIndex: -1
        },
        background: {
            color: {
                value: '#000000'
            }
        },
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    mode: 'grab',
                    parallax: {
                        enable: true,
                        force: 60,
                        smooth: 10
                    }
                },
                resize: true
            },
            modes: {
                grab: {
                    distance: 200,
                    links: {
                        opacity: 0.5
                    }
                }
            }
        },
        particles: {
            color: {
                value: theme.primary
            },
            links: {
                color: theme.primary,
                distance: 150,
                enable: true,
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 1,
                direction: 'none',
                random: false,
                straight: false,
                outModes: {
                    default: 'out'
                }
            },
            number: {
                density: {
                    enable: true,
                    area: 800
                },
                value: 80
            },
            opacity: {
                value: 0.6
            },
            shape: {
                type: 'circle'
            },
            size: {
                value: { min: 1, max: 3 }
            }
        },
        detectRetina: true
    };

    if (!init) {
        return null;
    }

    return (
        <Particles
            id="tsparticles"
            particlesLoaded={particlesLoaded}
            options={options}
        />
    );
};

export default ParallaxEffect;
