import { memo } from 'react';
import FloatingWindow from '../Windows/FloatingWindow';

const RecentVisitorsWindow = memo(({ data, initialPosition }) => {
    if (!data || !data.recent_visitors || data.recent_visitors.length === 0) {
        return (
            <FloatingWindow
                id="recent-visitors-window"
                title="Recent Visitors"
                initialPosition={initialPosition}
                initialSize={{ width: 700, height: 400 }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: '#D3D3D3'
                }}>
                    No recent visitors data
                </div>
            </FloatingWindow>
        );
    }

    return (
        <FloatingWindow
            id="recent-visitors-window"
            title="Recent Visitors"
            initialPosition={initialPosition}
            initialSize={{ width: 800, height: 450 }}
        >
            <div style={{ height: '100%', overflowY: 'auto' }}>
                <table className="visitors-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Country</th>
                            <th>City</th>
                            <th>IP</th>
                            <th>User Agent</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.recent_visitors.map((visitor, index) => (
                            <tr key={index}>
                                <td>{new Date(visitor.timestamp).toLocaleString()}</td>
                                <td>{visitor.country || 'N/A'}</td>
                                <td>{visitor.city || 'N/A'}</td>
                                <td>{visitor.ip_address || 'N/A'}</td>
                                <td style={{
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {visitor.user_agent || 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </FloatingWindow>
    );
});

RecentVisitorsWindow.displayName = 'RecentVisitorsWindow';

export default RecentVisitorsWindow;