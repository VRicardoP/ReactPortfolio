import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';

const maskIp = (ip) => {
    if (!ip) return 'N/A';
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    // IPv6 or other format - mask last segment
    const segments = ip.split(':');
    if (segments.length > 1) {
        segments[segments.length - 1] = '****';
        return segments.join(':');
    }
    return ip;
};

const RecentVisitorsWindow = memo(({ data, initialPosition }) => {
    const { t } = useTranslation();

    if (!data || !data.recent_visitors || data.recent_visitors.length === 0) {
        return (
            <FloatingWindow
                id="recent-visitors-window"
                title={t('dashboard.recentVisitors.title')}
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
                    {t('dashboard.recentVisitors.noData')}
                </div>
            </FloatingWindow>
        );
    }

    return (
        <FloatingWindow
            id="recent-visitors-window"
            title={t('dashboard.recentVisitors.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 800, height: 450 }}
        >
            <div style={{ height: '100%', overflowY: 'auto' }}>
                <table className="visitors-table">
                    <thead>
                        <tr>
                            <th>{t('dashboard.recentVisitors.columns.timestamp')}</th>
                            <th>{t('dashboard.recentVisitors.columns.country')}</th>
                            <th>{t('dashboard.recentVisitors.columns.city')}</th>
                            <th>{t('dashboard.recentVisitors.columns.ip')}</th>
                            <th>{t('dashboard.recentVisitors.columns.userAgent')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.recent_visitors.map((visitor, index) => (
                            <tr key={index}>
                                <td>{new Date(visitor.timestamp).toLocaleString()}</td>
                                <td>{visitor.country || 'N/A'}</td>
                                <td>{visitor.city || 'N/A'}</td>
                                <td>{maskIp(visitor.ip_address)}</td>
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