import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import FloatingWindow from '../Windows/FloatingWindow';
import useSchoolJobs from '../../hooks/useSchoolJobs';

const SchoolManualContactsWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { schools, loading, error } = useSchoolJobs();

    const manualSchools = useMemo(
        () => schools.filter((s) => s.monitoring_mode === 'manual_only'),
        [schools]
    );

    return (
        <FloatingWindow
            id="school-manual-contacts-window"
            title={t('dashboard.schoolContacts.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 640, height: 400 }}
        >
            <div style={{ padding: 12, color: 'var(--theme-text)', opacity: 0.7, fontSize: 12 }}>
                {t('dashboard.schoolContacts.help')}
            </div>

            {error && (
                <div style={{ padding: 16, color: '#ff5252' }}>
                    {t('dashboard.schoolJobs.error', { message: error })}
                </div>
            )}

            {!error && loading && (
                <div style={{ padding: 16, color: 'var(--theme-text)', opacity: 0.6 }}>
                    {t('dashboard.schoolJobs.loading')}
                </div>
            )}

            {!error && !loading && manualSchools.length === 0 && (
                <div style={{ padding: 16, color: 'var(--theme-text)', opacity: 0.6 }}>
                    {t('dashboard.schoolContacts.noContacts')}
                </div>
            )}

            {!error && manualSchools.length > 0 && (
                <div style={{ overflowY: 'auto' }}>
                    <table className="visitors-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>{t('dashboard.schoolContacts.cols.school')}</th>
                                <th>{t('dashboard.schoolContacts.cols.contact')}</th>
                                <th>{t('dashboard.schoolContacts.cols.reminderEvery')}</th>
                                <th>{t('dashboard.schoolContacts.cols.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {manualSchools.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        {s.name}
                                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                                            {s.policy}
                                        </div>
                                    </td>
                                    <td>
                                        {s.contact_email
                                            ? <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>
                                            : <em>{t('dashboard.schoolContacts.unverified')}</em>}
                                    </td>
                                    <td>
                                        {s.manual_reminder_interval_days
                                            ? t('dashboard.schoolContacts.everyNDays', { days: s.manual_reminder_interval_days })
                                            : '—'}
                                    </td>
                                    <td>
                                        {s.portal_url && (
                                            <a href={s.portal_url} target="_blank" rel="noopener noreferrer">
                                                {t('dashboard.schoolContacts.visitSite')}
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </FloatingWindow>
    );
});

SchoolManualContactsWindow.displayName = 'SchoolManualContactsWindow';

export default SchoolManualContactsWindow;
