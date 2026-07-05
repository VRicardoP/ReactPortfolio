import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import FloatingWindow from '../Windows/FloatingWindow';
import '../../styles/dashboard-schools.css';

const SchoolManualContactsWindow = memo(({ initialPosition, schoolData }) => {
    const { t } = useTranslation();
    const { schools, loading, error } = schoolData;

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
            <div className="school-contacts-help">
                {t('dashboard.schoolContacts.help')}
            </div>

            {error && (
                <div className="school-error">
                    {t('dashboard.schoolJobs.error', { message: error })}
                </div>
            )}

            {!error && loading && (
                <div className="school-msg">
                    {t('dashboard.schoolJobs.loading')}
                </div>
            )}

            {!error && !loading && manualSchools.length === 0 && (
                <div className="school-msg">
                    {t('dashboard.schoolContacts.noContacts')}
                </div>
            )}

            {!error && manualSchools.length > 0 && (
                <div className="school-contacts-scroll">
                    <table className="visitors-table school-table">
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
                                        <div className="school-cell-sub">
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
