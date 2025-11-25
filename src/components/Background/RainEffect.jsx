import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const RainEffect = () => {
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        console.log('Inicializando RainEffect...');

        const { innerWidth, innerHeight } = window;

        // creo el mundo 3d
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        // la camara desde donde vemos todo
        const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
        camera.position.set(0, 50, 100);
        camera.lookAt(0, 0, 0);

        // esto dibuja todo en la pantalla
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(innerWidth, innerHeight);

        // pongo el canvas en toda la pantalla de fondo
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.zIndex = '-1';

        mountRef.current.appendChild(renderer.domElement);
        console.log('Canvas añadido al DOM');

        // una luz general para que se vea algo
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        scene.add(ambientLight);

        // una luz que viene de un lado
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(50, 100, 50);
        scene.add(directionalLight);

        // el suelo negro donde caen las gotas
        const floorGeometry = new THREE.PlaneGeometry(500, 500);
        floorGeometry.rotateX(-Math.PI / 2);
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.y = 0;
        scene.add(floor);

        // creo muchas gotas de lluvia usando lineas
        const rainCount = 3000;
        const rainGeometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < rainCount; i++) {
            // donde empieza cada gota
            const x = (Math.random() - 0.5) * 400;
            const y = Math.random() * 150;
            const z = (Math.random() - 0.5) * 400;

            // cada gota es una linea vertical pequeña
            positions.push(x, y, z);
            positions.push(x, y - 2, z); // lo largo de la gota

            velocities.push(Math.random() * 0.5 + 0.5); // lo rapido que cae
        }

        rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const rainMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.6,
            linewidth: 1
        });

        const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
        scene.add(rain);
        console.log('Lluvia añadida a la escena');

        // para mover la camara con el raton
        let mouseX = 0;
        let targetRotationY = 0;
        let currentRotationY = 0;

        const onMouseMove = (event) => {
            mouseX = (event.clientX / innerWidth) * 2 - 1;
            targetRotationY = mouseX * 0.3;
        };
        document.addEventListener('mousemove', onMouseMove);

        // el bucle que hace que todo se mueva
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            const positions = rain.geometry.attributes.position.array;

            // muevo cada gota hacia abajo
            for (let i = 0; i < rainCount; i++) {
                const i6 = i * 6; // cada gota tiene 6 numeros para su posicion
                const velocity = velocities[i];

                // bajo la gota un poquito
                positions[i6 + 1] -= velocity * 0.5;
                positions[i6 + 4] -= velocity * 0.5;

                // si toca el suelo la vuelvo a poner arriba
                if (positions[i6 + 1] < 0) {
                    positions[i6 + 1] = 150;
                    positions[i6 + 4] = 150 - 2;
                    positions[i6] = (Math.random() - 0.5) * 400;
                    positions[i6 + 3] = positions[i6];
                    positions[i6 + 2] = (Math.random() - 0.5) * 400;
                    positions[i6 + 5] = positions[i6 + 2];
                }
            }

            rain.geometry.attributes.position.needsUpdate = true;

            // muevo la camara suavemente con el raton
            currentRotationY += (targetRotationY - currentRotationY) * 0.05;
            camera.position.x = Math.sin(currentRotationY) * 100;
            camera.position.z = Math.cos(currentRotationY) * 100;
            camera.lookAt(0, 20, 0);

            renderer.render(scene, camera);
        };

        // cuando cambio el tamaño de la ventana ajusto la camara
        const onWindowResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', onWindowResize);

        // arranco la animacion
        animate();
        console.log('Animación iniciada');

        // cuando se cierra el componente limpio todo
        return () => {
            console.log('Limpiando RainEffect...');
            document.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onWindowResize);

            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }

            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }

            renderer.dispose();
            rainGeometry.dispose();
            rainMaterial.dispose();
            floorGeometry.dispose();
            floorMaterial.dispose();
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default RainEffect;