import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { useTheme } from '../../context/ThemeContext';

const LensflareEffect = () => {
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (!mountRef.current) return;

        const { innerWidth, innerHeight } = window;

        // creo la escena con fondo oscuro y niebla como el original
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        scene.fog = new THREE.Fog(0x000000, 2500, 10000);

        // la camara
        const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 15000);
        camera.position.set(0, 0, 250);

        // el renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(innerWidth, innerHeight);

        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.zIndex = '-1';

        mountRef.current.appendChild(renderer.domElement);

        // creo los cubos flotantes como en el original
        const boxGeometry = new THREE.BoxGeometry(250, 250, 250);
        const boxMaterial = new THREE.MeshPhongMaterial({
            color: 0xc9a868,
            specular: 0xffffff,
            shininess: 50
        });

        for (let i = 0; i < 3000; i++) {
            const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
            mesh.position.x = 8000 * (2.0 * Math.random() - 1.0);
            mesh.position.y = 8000 * (2.0 * Math.random() - 1.0);
            mesh.position.z = 8000 * (2.0 * Math.random() - 1.0);
            mesh.rotation.x = Math.random() * Math.PI;
            mesh.rotation.y = Math.random() * Math.PI;
            mesh.rotation.z = Math.random() * Math.PI;
            mesh.matrixAutoUpdate = false;
            mesh.updateMatrix();
            scene.add(mesh);
        }

        // luz direccional para iluminar los cubos
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.15);
        dirLight.position.set(0, -1, 0).normalize();
        scene.add(dirLight);

        // funcion para crear las texturas de lensflare proceduralmente
        const createFlareTexture = (size, type) => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            const centerX = size / 2;
            const centerY = size / 2;
            const radius = size / 2;

            if (type === 'main') {
                // textura principal del destello - brillo intenso central
                const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
                grd.addColorStop(0, 'rgba(255, 255, 255, 1)');
                grd.addColorStop(0.05, 'rgba(255, 255, 220, 0.9)');
                grd.addColorStop(0.1, 'rgba(255, 220, 150, 0.7)');
                grd.addColorStop(0.3, 'rgba(255, 150, 50, 0.3)');
                grd.addColorStop(0.6, 'rgba(200, 100, 20, 0.1)');
                grd.addColorStop(1, 'rgba(100, 50, 0, 0)');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, size, size);
            } else {
                // halos secundarios
                const grd = ctx.createRadialGradient(centerX, centerY, radius * 0.7, centerX, centerY, radius);
                grd.addColorStop(0, 'rgba(255, 200, 100, 0)');
                grd.addColorStop(0.5, 'rgba(255, 180, 80, 0.15)');
                grd.addColorStop(0.8, 'rgba(255, 150, 50, 0.1)');
                grd.addColorStop(1, 'rgba(200, 100, 20, 0)');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, size, size);
            }

            return new THREE.CanvasTexture(canvas);
        };

        const textureFlare0 = createFlareTexture(512, 'main');

        // funcion para añadir luces con lensflare
        const addLight = (h, s, l, x, y, z) => {
            const light = new THREE.PointLight(0xffffff, 1.5, 2000, 0);
            light.color.setHSL(h, s, l);
            light.position.set(x, y, z);
            scene.add(light);

            const lensflare = new Lensflare();
            lensflare.addElement(new LensflareElement(textureFlare0, 700, 0, light.color));
            light.add(lensflare);

            return light;
        };

        // añado las luces - una principal naranja/amarilla y otras de colores
        addLight(0.08, 0.9, 0.5, 0, 0, -1000);
        addLight(0.55, 0.8, 0.5, 2000, 1000, -3000);
        addLight(0.995, 0.8, 0.5, -2000, -1000, -2000);

        // control de la camara
        let mouseX = 0; // normalizado -1 a 1
        let mouseY = 0; // normalizado -1 a 1
        let moveForward = false;
        let moveBackward = false;

        // direccion hacia donde mira la camara (relativa a su posicion)
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        const cameraUp = new THREE.Vector3(0, 1, 0);

        const onMouseMove = (event) => {
            // normalizo entre -1 y 1 (0 en el centro)
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = (event.clientY / window.innerHeight) * 2 - 1;
        };

        const onMouseDown = (event) => {
            if (event.button === 0) {
                moveForward = true;
            } else if (event.button === 2) {
                moveBackward = true;
            }
        };

        const onMouseUp = (event) => {
            if (event.button === 0) {
                moveForward = false;
            } else if (event.button === 2) {
                moveBackward = false;
            }
        };

        // evitar el menu contextual del click derecho
        const onContextMenu = (event) => {
            event.preventDefault();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('contextmenu', onContextMenu);

        // bucle de animacion
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            // calculo la velocidad de rotacion basada en la distancia del centro
            // mas lejos del centro = mas rapido, en el centro = estatico
            const rotationSpeed = 0.03;
            const rotationX = -mouseX * Math.abs(mouseX) * rotationSpeed; // yaw (izq/der)
            const rotationY = -mouseY * Math.abs(mouseY) * rotationSpeed; // pitch (arr/aba)

            // roto la direccion de la camara horizontalmente (yaw)
            cameraDirection.applyAxisAngle(cameraUp, rotationX);

            // roto la direccion de la camara verticalmente (pitch)
            // calculo el eje perpendicular para el pitch
            const rightAxis = new THREE.Vector3();
            rightAxis.crossVectors(cameraDirection, cameraUp).normalize();
            cameraDirection.applyAxisAngle(rightAxis, rotationY);

            // normalizo la direccion
            cameraDirection.normalize();

            // movimiento hacia adelante/atras con los botones del raton
            const moveSpeed = 50;
            if (moveForward) {
                camera.position.addScaledVector(cameraDirection, moveSpeed);
            }
            if (moveBackward) {
                camera.position.addScaledVector(cameraDirection, -moveSpeed);
            }

            // la camara mira en la direccion calculada
            const lookAtPoint = new THREE.Vector3();
            lookAtPoint.copy(camera.position).add(cameraDirection);
            camera.lookAt(lookAtPoint);

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
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('contextmenu', onContextMenu);
            window.removeEventListener('resize', onWindowResize);

            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }

            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }

            renderer.dispose();
            boxGeometry.dispose();
            boxMaterial.dispose();
            textureFlare0.dispose();
        };
    }, [theme]);

    return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default LensflareEffect;
