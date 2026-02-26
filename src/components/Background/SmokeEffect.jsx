import { useEffect, useRef } from 'react';
import * as THREE from 'three';
const SmokeEffect = () => {
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);

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

        // clock for delta time
        const clock = new THREE.Clock();

        // scene and camera
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 10000);
        camera.position.z = 1000;
        scene.add(camera);

        // directional light like in the original
        const light = new THREE.DirectionalLight(0xffffff, 0.5);
        light.position.set(-1, 0, 1);
        scene.add(light);

        // load the smoke texture from the original URL
        const textureLoader = new THREE.TextureLoader();
        const smokeTexture = textureLoader.load(
            '/textures/smoke.webp'
        );

        // smoke material - same as the original
        const smokeMaterial = new THREE.MeshLambertMaterial({
            color: 0x00dddd,
            map: smokeTexture,
            transparent: true
        });

        const smokeGeo = new THREE.PlaneGeometry(300, 300);
        const smokeParticles = [];

        // create 150 smoke particles like in the original
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

        // animation loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            const delta = clock.getDelta();

            // rotate smoke particles like in the original
            for (let sp = smokeParticles.length - 1; sp >= 0; sp--) {
                smokeParticles[sp].rotation.z += delta * 0.2;
            }

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

            renderer.dispose();
            smokeGeo.dispose();
            smokeMaterial.dispose();
            smokeTexture.dispose();
        };
    }, []); // theme is not used — smoke color is hardcoded

    return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default SmokeEffect;
