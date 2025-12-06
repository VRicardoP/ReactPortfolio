import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useTheme } from '../../context/ThemeContext';

const CubeEffect = () => {
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (!mountRef.current) return;

        const { innerWidth, innerHeight } = window;

        // renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(innerWidth, innerHeight);

        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.zIndex = '-1';

        mountRef.current.appendChild(renderer.domElement);

        // escena y camara
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000a0b);

        const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
        camera.position.set(0, -1.7, 8);

        // clock para las animaciones
        const clock = new THREE.Clock();

        // cargo las texturas desde las URLs originales
        const textureLoader = new THREE.TextureLoader();
        const matcapTexture = textureLoader.load(
            'https://images.unsplash.com/photo-1626908013943-df94de54984c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=512&q=80'
        );
        const envTexture = textureLoader.load(
            'https://images.unsplash.com/photo-1536566482680-fca31930a0bd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=512&q=80'
        );

        // cubo con bordes redondeados - material igual al original
        const cubeGeometry = new RoundedBoxGeometry(1, 1, 1, 5, 0.05);
        const cubeMaterial = new THREE.MeshMatcapMaterial({
            color: 0xffffff,
            matcap: matcapTexture,
            map: envTexture
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        scene.add(cube);

        // barras de luz alrededor del cubo - verticales en circulo
        const lightBars = [];
        const barMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        for (let i = 0; i <= 20; i++) {
            const barLength = 0.5 + Math.random();
            const barGeometry = new THREE.CapsuleGeometry(0.02, barLength, 5, 16);
            const bar = new THREE.Mesh(barGeometry, barMaterial);

            // posicion en circulo como el original
            const amp = 1;
            bar.position.y = -Math.random() * (amp / 2) + Math.random() * (amp / 2);
            bar.position.x = -Math.sin(i * 0.3) * Math.PI;
            bar.position.z = -Math.cos(i * 0.3) * Math.PI;

            scene.add(bar);
            lightBars.push({ mesh: bar, geometry: barGeometry });
        }

        // velocidades como en el original
        const sceneSpeed = 0.2;
        const objectSpeed = 0; // en el original es 0 por defecto

        // OrbitControls como en el original
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.rotateSpeed = 0.9;
        controls.enableZoom = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.02;
        controls.update();

        // bucle de animacion
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            const elapsed = clock.getElapsedTime();

            // roto la escena automaticamente
            scene.rotation.y = elapsed * sceneSpeed;

            // roto y muevo el cubo (objectSpeed es 0 por defecto)
            cube.rotation.y = -elapsed * objectSpeed;
            cube.rotation.z = elapsed * objectSpeed;
            cube.rotation.x = elapsed * objectSpeed;
            cube.position.y = Math.sin(elapsed * objectSpeed) * 0.2;

            camera.lookAt(scene.position);
            camera.updateMatrixWorld();

            controls.update();
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

            controls.dispose();
            renderer.dispose();
            cubeGeometry.dispose();
            cubeMaterial.dispose();
            matcapTexture.dispose();
            envTexture.dispose();
            barMaterial.dispose();
            lightBars.forEach(bar => bar.geometry.dispose());
        };
    }, [theme]);

    return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }} />;
};

export default CubeEffect;
