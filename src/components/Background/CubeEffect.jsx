import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CubeEffect = () => {
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);

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

        // scene and camera
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000a0b);

        const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
        camera.position.set(0, -1.7, 8);

        // clock for animations
        const clock = new THREE.Clock();

        // load textures from the original URLs
        const textureLoader = new THREE.TextureLoader();
        const matcapTexture = textureLoader.load(
            '/textures/cube-matcap.webp'
        );
        const envTexture = textureLoader.load(
            '/textures/cube-env.webp'
        );

        // cube with rounded edges - material same as the original
        const cubeGeometry = new RoundedBoxGeometry(1, 1, 1, 5, 0.05);
        const cubeMaterial = new THREE.MeshMatcapMaterial({
            color: 0xffffff,
            matcap: matcapTexture,
            map: envTexture
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        scene.add(cube);

        // light bars around the cube - vertical in a circle
        const lightBars = [];
        const barMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        for (let i = 0; i <= 20; i++) {
            const barLength = 0.5 + Math.random();
            const barGeometry = new THREE.CapsuleGeometry(0.02, barLength, 5, 16);
            const bar = new THREE.Mesh(barGeometry, barMaterial);

            // position in circle like the original
            const amp = 1;
            bar.position.y = -Math.random() * (amp / 2) + Math.random() * (amp / 2);
            bar.position.x = -Math.sin(i * 0.3) * Math.PI;
            bar.position.z = -Math.cos(i * 0.3) * Math.PI;

            scene.add(bar);
            lightBars.push({ mesh: bar, geometry: barGeometry });
        }

        // speeds like in the original
        const sceneSpeed = 0.2;
        const objectSpeed = 0; // in the original it's 0 by default

        // OrbitControls like in the original
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.rotateSpeed = 0.9;
        controls.enableZoom = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.02;
        controls.update();

        // animation loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            const elapsed = clock.getElapsedTime();

            // rotate the scene automatically
            scene.rotation.y = elapsed * sceneSpeed;

            // rotate and move the cube (objectSpeed is 0 by default)
            cube.rotation.y = -elapsed * objectSpeed;
            cube.rotation.z = elapsed * objectSpeed;
            cube.rotation.x = elapsed * objectSpeed;
            cube.position.y = Math.sin(elapsed * objectSpeed) * 0.2;

            camera.lookAt(scene.position);
            camera.updateMatrixWorld();

            controls.update();
            renderer.render(scene, camera);
        };

        // when the window size changes
        const onWindowResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', onWindowResize);

        animate();

        const mountNode = mountRef.current;

        // cleanup when the component unmounts
        return () => {
            window.removeEventListener('resize', onWindowResize);

            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }

            if (mountNode && renderer.domElement) {
                mountNode.removeChild(renderer.domElement);
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
    }, []);

    // Note: pointerEvents 'none' also disables OrbitControls interaction, acceptable for a background effect
    return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default CubeEffect;
