// Efecto 3D de planos de humo que flotan y giran lentamente.
// Shared renderer, resize and frame lifecycle are delegated to useThreeScene.

import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import useThreeScene from '../../hooks/useThreeScene';

const SmokeEffect = () => {
    const mountRef = useRef(null);

    // Construye las partículas de humo y declara cómo liberar sus recursos.
    // Texture, geometry and material remain owned by this effect.
    const build = useCallback(({ width, height }) => {
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        Object.assign(renderer.domElement.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', zIndex: '-1',
        });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000);
        camera.position.z = 1000;
        scene.add(camera);
        const light = new THREE.DirectionalLight(0xffffff, 0.5);
        light.position.set(-1, 0, 1);
        scene.add(light);

        const smokeTexture = new THREE.TextureLoader().load('/textures/smoke.webp');
        const smokeMaterial = new THREE.MeshLambertMaterial({
            color: 0x00dddd,
            map: smokeTexture,
            transparent: true,
        });
        const smokeGeometry = new THREE.PlaneGeometry(300, 300);
        const smokeParticles = [];
        for (let index = 0; index < 150; index++) {
            const particle = new THREE.Mesh(smokeGeometry, smokeMaterial);
            particle.position.set(
                Math.random() * 500 - 250,
                Math.random() * 500 - 250,
                Math.random() * 1000 - 100,
            );
            particle.rotation.z = Math.random() * 360;
            scene.add(particle);
            smokeParticles.push(particle);
        }
        const clock = new THREE.Clock();

        return {
            scene,
            camera,
            renderer,
            animate: () => {
                const delta = clock.getDelta();
                smokeParticles.forEach(particle => { particle.rotation.z += delta * 0.2; });
            },
            dispose: () => {
                smokeGeometry.dispose();
                smokeMaterial.dispose();
                smokeTexture.dispose();
            },
        };
    }, []);

    useThreeScene(mountRef, build);

    return <div ref={mountRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />;
};

export default SmokeEffect;
