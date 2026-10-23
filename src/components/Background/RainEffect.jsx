// Efecto de lluvia 3D cuyo color sigue el tema y cuya cámara responde al puntero.
// Shared renderer, resize and frame lifecycle are delegated to useThreeScene.

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';
import useThreeScene from '../../hooks/useThreeScene';

const RainEffect = () => {
    const mountRef = useRef(null);
    const rainMaterialRef = useRef(null);
    const themeRef = useRef(null);
    const { theme } = useTheme();
    themeRef.current = theme;

    // Construye la lluvia y conserva aquí únicamente sus recursos específicos.
    // Pointer normalization reads the current viewport width after every resize.
    const build = useCallback(({ width, height }) => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(0, 50, 100);
        camera.lookAt(0, 0, 0);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        renderer.domElement.className = 'rain-canvas';
        renderer.domElement.style.pointerEvents = window.matchMedia('(pointer: fine)').matches ? 'auto' : 'none';

        scene.add(new THREE.AmbientLight(0x404040, 0.5));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(50, 100, 50);
        scene.add(directionalLight);

        const floorGeometry = new THREE.PlaneGeometry(500, 500);
        floorGeometry.rotateX(-Math.PI / 2);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        scene.add(floor);

        const rainCount = 3000;
        const rainGeometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        for (let i = 0; i < rainCount; i++) {
            const x = (Math.random() - 0.5) * 400;
            const y = Math.random() * 150;
            const z = (Math.random() - 0.5) * 400;
            positions.push(x, y, z, x, y - 2, z);
            velocities.push(Math.random() * 0.5 + 0.5);
        }
        rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const rainMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(themeRef.current.primary),
            transparent: true,
            opacity: 0.6,
            linewidth: 1,
        });
        rainMaterialRef.current = rainMaterial;
        const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
        scene.add(rain);

        let targetRotationY = 0;
        let currentRotationY = 0;
        const onPointerMove = event => {
            const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            targetRotationY = mouseX * 0.3;
        };
        renderer.domElement.addEventListener('pointermove', onPointerMove);

        return {
            scene,
            camera,
            renderer,
            animate: () => {
                const coordinates = rain.geometry.attributes.position.array;
                for (let i = 0; i < rainCount; i++) {
                    const index = i * 6;
                    const fall = velocities[i] * 0.5;
                    coordinates[index + 1] -= fall;
                    coordinates[index + 4] -= fall;
                    if (coordinates[index + 1] < 0) {
                        coordinates[index + 1] = 150;
                        coordinates[index + 4] = 148;
                        coordinates[index] = (Math.random() - 0.5) * 400;
                        coordinates[index + 3] = coordinates[index];
                        coordinates[index + 2] = (Math.random() - 0.5) * 400;
                        coordinates[index + 5] = coordinates[index + 2];
                    }
                }
                rain.geometry.attributes.position.needsUpdate = true;
                currentRotationY += (targetRotationY - currentRotationY) * 0.05;
                camera.position.x = Math.sin(currentRotationY) * 100;
                camera.position.z = Math.cos(currentRotationY) * 100;
                camera.lookAt(0, 20, 0);
            },
            dispose: () => {
                renderer.domElement.removeEventListener('pointermove', onPointerMove);
                rainGeometry.dispose();
                rainMaterial.dispose();
                floorGeometry.dispose();
                floorMaterial.dispose();
                rainMaterialRef.current = null;
            },
        };
    }, []);

    useThreeScene(mountRef, build);

    // Actualiza el material vivo sin reconstruir la geometría de la lluvia.
    // Theme changes stay independent from scene construction.
    useEffect(() => {
        rainMaterialRef.current?.color.set(theme.primary);
    }, [theme]);

    return <div ref={mountRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />;
};

export default RainEffect;
