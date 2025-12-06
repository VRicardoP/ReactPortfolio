import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

const SmokeEffect = () => {
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (!mountRef.current) return;

        const { innerWidth, innerHeight } = window;

        // renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        renderer.setSize(innerWidth, innerHeight);

        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.zIndex = '-1';

        mountRef.current.appendChild(renderer.domElement);

        // clock para delta time
        const clock = new THREE.Clock();

        // escena y camara
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 10000);
        camera.position.z = 1000;
        scene.add(camera);

        // luz direccional como en el original
        const light = new THREE.DirectionalLight(0xffffff, 0.5);
        light.position.set(-1, 0, 1);
        scene.add(light);

        // cargo la textura de humo desde la URL original
        const textureLoader = new THREE.TextureLoader();
        const smokeTexture = textureLoader.load(
            'https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png'
        );

        // material del humo - igual que el original
        const smokeMaterial = new THREE.MeshLambertMaterial({
            color: 0x00dddd,
            map: smokeTexture,
            transparent: true
        });

        const smokeGeo = new THREE.PlaneGeometry(300, 300);
        const smokeParticles = [];

        // creo 150 particulas de humo como en el original
        for (let p = 0; p < 150; p++) {
            const particle = new THREE.Mesh(smokeGeo, smokeMaterial);
            particle.position.set(
                Math.random() * 500 - 250,
                Math.random() * 500 - 250,
                Math.random() * 1000 - 100
            );
            particle.rotation.z = Math.random() * 360;
            scene.add(particle);
            smokeParticles.push(particle);
        }

        // bucle de animacion
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            const delta = clock.getDelta();

            // roto las particulas de humo como en el original
            for (let sp = smokeParticles.length - 1; sp >= 0; sp--) {
                smokeParticles[sp].rotation.z += delta * 0.2;
            }

            renderer.render(scene, camera);
        };

        // cuando cambia el tamaño de la ventana
        const onWindowResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', onWindowResize);

        animate();

        // limpieza cuando se desmonta el componente
        return () => {
            window.removeEventListener('resize', onWindowResize);

            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }

            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }

            renderer.dispose();
            smokeGeo.dispose();
            smokeMaterial.dispose();
            smokeTexture.dispose();
        };
    }, [theme]);

    return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default SmokeEffect;
