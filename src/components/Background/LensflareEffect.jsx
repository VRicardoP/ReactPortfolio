// Campo 3D de cubos con luces y destellos que responde al puntero fino.
// useThreeScene owns the renderer loop; this component owns lensflare resources.

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { useTheme } from '../../context/ThemeContext';
import useThreeScene from '../../hooks/useThreeScene';

const LensflareEffect = () => {
    const mountRef = useRef(null);
    const boxMaterialRef = useRef(null);
    const themeRef = useRef(null);
    const { theme } = useTheme();
    themeRef.current = theme;

    // Construye la escena y limita toda interacción al canvas del fondo.
    // Pointer capture keeps press/release paired without document listeners.
    const build = useCallback(({ width, height }) => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(themeRef.current.background);
        scene.fog = new THREE.Fog(0x000000, 2500, 10000);
        const camera = new THREE.PerspectiveCamera(40, width / height, 1, 15000);
        camera.position.set(0, 0, 250);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        Object.assign(renderer.domElement.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', zIndex: '-1',
        });
        // DT-208: también responde al dedo (tablet en modo escritorio): arrastrar
        // gira la cámara y mantener pulsado avanza. La página no hace scroll en
        // ese modo, así que el gesto no compite con nada.
        renderer.domElement.style.pointerEvents = 'auto';
        renderer.domElement.style.touchAction = 'none';

        const boxGeometry = new THREE.BoxGeometry(250, 250, 250);
        const boxMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(themeRef.current.primary),
            specular: 0xffffff,
            shininess: 50,
        });
        boxMaterialRef.current = boxMaterial;
        const instancedMesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, 3000);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < 3000; i++) {
            dummy.position.set(
                8000 * (2 * Math.random() - 1),
                8000 * (2 * Math.random() - 1),
                8000 * (2 * Math.random() - 1),
            );
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        scene.add(instancedMesh);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.15);
        dirLight.position.set(0, -1, 0).normalize();
        scene.add(dirLight);

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.05, 'rgba(255, 255, 220, 0.9)');
        gradient.addColorStop(0.1, 'rgba(255, 220, 150, 0.7)');
        gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.3)');
        gradient.addColorStop(0.6, 'rgba(200, 100, 20, 0.1)');
        gradient.addColorStop(1, 'rgba(100, 50, 0, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 512);
        const flareTexture = new THREE.CanvasTexture(canvas);
        const lensflares = [];

        const addLight = (hue, saturation, lightness, x, y, z) => {
            const light = new THREE.PointLight(0xffffff, 1.5, 2000, 0);
            light.color.setHSL(hue, saturation, lightness);
            light.position.set(x, y, z);
            const lensflare = new Lensflare();
            lensflare.addElement(new LensflareElement(flareTexture, 700, 0, light.color));
            light.add(lensflare);
            scene.add(light);
            lensflares.push(lensflare);
        };
        addLight(0.08, 0.9, 0.5, 0, 0, -1000);
        addLight(0.55, 0.8, 0.5, 2000, 1000, -3000);
        addLight(0.995, 0.8, 0.5, -2000, -1000, -2000);

        let mouseX = 0;
        let mouseY = 0;
        let moveForward = false;
        let moveBackward = false;
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        const cameraUp = new THREE.Vector3(0, 1, 0);
        const rightAxis = new THREE.Vector3();
        const lookAtPoint = new THREE.Vector3();
        const onPointerMove = event => {
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = (event.clientY / window.innerHeight) * 2 - 1;
        };
        const onPointerDown = event => {
            renderer.domElement.setPointerCapture(event.pointerId);
            if (event.button === 0) moveForward = true;
            if (event.button === 2) moveBackward = true;
        };
        const onPointerUp = event => {
            if (renderer.domElement.hasPointerCapture(event.pointerId)) {
                renderer.domElement.releasePointerCapture(event.pointerId);
            }
            if (event.button === 0) moveForward = false;
            if (event.button === 2) moveBackward = false;
        };
        const onContextMenu = event => event.preventDefault();
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('pointercancel', onPointerUp);
        renderer.domElement.addEventListener('contextmenu', onContextMenu);

        return {
            scene,
            camera,
            renderer,
            animate: () => {
                const rotationX = -mouseX * Math.abs(mouseX) * 0.03;
                const rotationY = -mouseY * Math.abs(mouseY) * 0.03;
                cameraDirection.applyAxisAngle(cameraUp, rotationX);
                rightAxis.crossVectors(cameraDirection, cameraUp).normalize();
                cameraDirection.applyAxisAngle(rightAxis, rotationY).normalize();
                if (moveForward) camera.position.addScaledVector(cameraDirection, 50);
                if (moveBackward) camera.position.addScaledVector(cameraDirection, -50);
                camera.lookAt(lookAtPoint.copy(camera.position).add(cameraDirection));
            },
            dispose: () => {
                renderer.domElement.removeEventListener('pointermove', onPointerMove);
                renderer.domElement.removeEventListener('pointerdown', onPointerDown);
                renderer.domElement.removeEventListener('pointerup', onPointerUp);
                renderer.domElement.removeEventListener('pointercancel', onPointerUp);
                renderer.domElement.removeEventListener('contextmenu', onContextMenu);
                lensflares.forEach(lensflare => lensflare.dispose());
                instancedMesh.dispose();
                boxGeometry.dispose();
                boxMaterial.dispose();
                boxMaterialRef.current = null;
            },
        };
    }, []);

    const { scene } = useThreeScene(mountRef, build);

    // Cambia tema sobre los recursos vivos sin reconstruir las tres mil
    // copias del destello (un InstancedMesh de Three.js: en vez de crear 3000
    // objetos 3D separados —caro—, es UN solo objeto que dibuja la misma
    // forma 3000 veces con posiciones distintas; reconstruirlo entero solo
    // para cambiar un color sería un desperdicio).
    // The refs are populated by useThreeScene after construction.
    useEffect(() => {
        boxMaterialRef.current?.color.set(theme.primary);
        scene.current?.background.set(theme.background);
    }, [scene, theme]);

    return <div ref={mountRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />;
};

export default LensflareEffect;
