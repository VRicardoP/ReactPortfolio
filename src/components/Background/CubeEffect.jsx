// Efecto de fondo en 3D: un cubo metálico rodeado de barras de luz.
// La construcción es propia; el ciclo renderer/resize/cleanup vive en useThreeScene.

import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import useThreeScene from '../../hooks/useThreeScene';

const CubeEffect = () => {
    const mountRef = useRef(null);

    // Construye los objetos exclusivos del cubo y devuelve su animación y limpieza.
    // Shared renderer lifecycle stays in useThreeScene.
    const build = useCallback(({ width, height }) => {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        Object.assign(renderer.domElement.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', zIndex: '-1',
        });
        const supportsOrbit = window.matchMedia('(pointer: fine)').matches;
        renderer.domElement.style.pointerEvents = supportsOrbit ? 'auto' : 'none';

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000a0b);
        const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
        camera.position.set(0, -1.7, 8);
        const clock = new THREE.Clock();
        const textureLoader = new THREE.TextureLoader();
        const matcapTexture = textureLoader.load('/textures/cube-matcap.webp');
        const envTexture = textureLoader.load('/textures/cube-env.webp');
        const cubeGeometry = new RoundedBoxGeometry(1, 1, 1, 5, 0.05);
        const cubeMaterial = new THREE.MeshMatcapMaterial({
            color: 0xffffff,
            matcap: matcapTexture,
            map: envTexture,
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        scene.add(cube);

        const lightBars = [];
        const barMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (let i = 0; i <= 20; i++) {
            const geometry = new THREE.CapsuleGeometry(0.02, 0.5 + Math.random(), 5, 16);
            const bar = new THREE.Mesh(geometry, barMaterial);
            bar.position.y = -Math.random() * 0.5 + Math.random() * 0.5;
            bar.position.x = -Math.sin(i * 0.3) * Math.PI;
            bar.position.z = -Math.cos(i * 0.3) * Math.PI;
            scene.add(bar);
            lightBars.push(geometry);
        }

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.rotateSpeed = 0.9;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enabled = supportsOrbit;
        controls.enableDamping = true;
        controls.dampingFactor = 0.02;
        controls.update();

        return {
            scene,
            camera,
            renderer,
            animate: () => {
                const elapsed = clock.getElapsedTime();
                scene.rotation.y = elapsed * 0.2;
                camera.lookAt(scene.position);
                camera.updateMatrixWorld();
                controls.update();
            },
            dispose: () => {
                controls.dispose();
                cubeGeometry.dispose();
                cubeMaterial.dispose();
                matcapTexture.dispose();
                envTexture.dispose();
                barMaterial.dispose();
                lightBars.forEach(geometry => geometry.dispose());
            },
        };
    }, []);

    useThreeScene(mountRef, build);

    return <div ref={mountRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />;
};

export default CubeEffect;
