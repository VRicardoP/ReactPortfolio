import { memo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import FloatingWindow from '../Windows/FloatingWindow';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// esto arregla un bug con los iconos del mapa en react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// este componente hace que el mapa se vea bien cuando cambio el tamaño de la ventana
const MapResizeHandler = () => {
    const map = useMap();

    useEffect(() => {
        // le digo al mapa que recalcule su tamaño
        const handleResize = () => {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        };

        // lo hago nada mas cargar
        handleResize();

        // vigilo si el contenedor cambia de tamaño
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });

        // empiezo a vigilar el contenedor
        const container = map.getContainer();
        if (container && container.parentElement) {
            resizeObserver.observe(container.parentElement);
        }

        // tambien vigilo si cambia el tamaño de la pantalla
        window.addEventListener('resize', handleResize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [map]);

    return null;
};

const MapWindow = memo(({ data, initialPosition }) => {
    // si no hay datos uso un array vacio
    const markers = data || [];

    // centro el mapa en el primer visitante o en una vista global
    const center = markers.length > 0 && markers[0].latitude && markers[0].longitude
        ? [markers[0].latitude, markers[0].longitude]
        : [20, 0];

    return (
        <FloatingWindow
            id="map-window"
            title="Visitors Map"
            initialPosition={initialPosition}
            initialSize={{ width: 600, height: 450 }}
        >
            <div style={{
                height: '100%',
                width: '100%'
            }}>
                <MapContainer
                    center={center}
                    zoom={2}
                    style={{
                        height: '100%',
                        width: '100%'
                    }}
                >
                    <MapResizeHandler />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {markers.map((point, index) => {
                        if (!point.latitude || !point.longitude) return null;

                        return (
                            <Marker
                                key={index}
                                position={[point.latitude, point.longitude]}
                            >
                                <Popup>
                                    <div>
                                        <strong>{point.city || 'Unknown'}</strong><br />
                                        <em>{point.country || 'Unknown'}</em><br />
                                        <small>IP: {point.ip_address || 'N/A'}</small><br />
                                        <small>
                                            {point.timestamp
                                                ? new Date(point.timestamp).toLocaleString()
                                                : 'N/A'}
                                        </small>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </FloatingWindow>
    );
});

MapWindow.displayName = 'MapWindow';

export default MapWindow;