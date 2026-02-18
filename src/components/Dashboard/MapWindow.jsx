import { memo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import FloatingWindow from '../Windows/FloatingWindow';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// this fixes a bug with map icons in react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
});

// this component makes the map look good when the window is resized
const MapResizeHandler = () => {
    const map = useMap();

    useEffect(() => {
        // tell the map to recalculate its size
        const handleResize = () => {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        };

        // do it right after loading
        handleResize();

        // watch if the container changes size
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });

        // start watching the container
        const container = map.getContainer();
        if (container && container.parentElement) {
            resizeObserver.observe(container.parentElement);
        }

        // also watch if the screen size changes
        window.addEventListener('resize', handleResize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [map]);

    return null;
};

const MapWindow = memo(({ data, initialPosition }) => {
    // if there's no data use an empty array
    const markers = data || [];

    // center the map on the first visitor or on a global view
    const center = markers.length > 0 && markers[0].latitude != null && markers[0].longitude != null
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
                        if (point.latitude == null || point.longitude == null) return null;

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