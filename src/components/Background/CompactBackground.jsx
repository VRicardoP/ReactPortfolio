// Fondo ligero para el diseño compacto (DT-208): dos manchas de luz del color
// del tema que derivan despacio, solo con CSS. Sin Three.js ni canvas, y
// quieto si el sistema pide menos movimiento (prefers-reduced-motion). No es
// interactivo a propósito: en una página con scroll, un fondo que se arrastra
// compite con el dedo.

import '../../styles/compact-background.css';

const CompactBackground = () => <div className="compact-background" aria-hidden="true" />;

export default CompactBackground;
