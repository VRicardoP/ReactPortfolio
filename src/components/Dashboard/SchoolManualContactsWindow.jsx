// Ventana del panel que lista los colegios a los que se puede escribir
// directamente: su correo, cada cuánto recordar escribirles, y un enlace a su
// web.
//
// El criterio es la POLÍTICA de contacto del colegio, no cómo se le vigila.
// Antes filtraba por `monitoring_mode === 'manual_only'`, que es otra cosa —
// "no se puede raspar su web"— y dejaba fuera colegios que aceptan correo
// directo aunque además publiquen sus ofertas. La columna de modo distingue
// unos de otros, porque para los vigilados la candidatura espontánea es un
// añadido y no la única vía.

import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import FloatingWindow from '../Windows/FloatingWindow';
import { WINDOW_SIZES } from '../../config/windowSizes';
import '../../styles/dashboard-schools.css';

// Políticas que admiten candidatura por correo. `portal_only` queda fuera a
// propósito: ese colegio solo acepta su propio formulario.
const POLITICAS_CONTACTO_DIRECTO = Object.freeze([
    'direct_email',
    'direct_email_ok',
    'direct_email_director',
]);

// "Cosechar" = vigilar automáticamente la web del colegio para detectar ofertas
// nuevas (lo que hace SchoolJobsWindow). Un colegio que no se cosecha
// (`monitoring_mode === 'manual_only'`, porque no se puede raspar su web) no
// manda nunca una oferta al panel, así que su enlace es la única vía de
// enterarse: entra aunque su política sea de portal.
const noSeCosecha = (s) => s.monitoring_mode === 'manual_only';

// La página de ofertas es el enlace útil; la raíz del portal es el respaldo.
const enlaceDe = (s) => s.jobs_page_url || s.portal_url || null;

const SchoolManualContactsWindow = memo(({ initialPosition, schoolData }) => {
    const { t } = useTranslation();
    const { schools, loading, error } = schoolData;

    // Dos motivos para estar aquí: que se le pueda escribir, o que nadie vigile
    // sus ofertas por él. Los que se cosechan y solo admiten portal no entran:
    // de esos el panel ya recibe las vacantes.
    const contactSchools = useMemo(
        () =>
            schools.filter(
                (s) => POLITICAS_CONTACTO_DIRECTO.includes(s.policy) || noSeCosecha(s)
            ),
        [schools]
    );

    return (
        <FloatingWindow
            id="school-manual-contacts-window"
            title={t('dashboard.schoolContacts.title')}
            initialPosition={initialPosition}
            initialSize={WINDOW_SIZES.schoolContacts}
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

            {!error && !loading && contactSchools.length === 0 && (
                <div className="school-msg">
                    {t('dashboard.schoolContacts.noContacts')}
                </div>
            )}

            {!error && contactSchools.length > 0 && (
                <div className="school-contacts-scroll">
                    <table className="visitors-table school-table">
                        <thead>
                            <tr>
                                <th>{t('dashboard.schoolContacts.cols.school')}</th>
                                <th>{t('dashboard.schoolContacts.cols.contact')}</th>
                                <th>{t('dashboard.schoolContacts.cols.mode')}</th>
                                <th>{t('dashboard.schoolContacts.cols.reminderEvery')}</th>
                                <th>{t('dashboard.schoolContacts.cols.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contactSchools.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        {s.name}
                                        <div className="school-cell-sub">
                                            {[s.city, s.policy].filter(Boolean).join(' · ')}
                                        </div>
                                    </td>
                                    <td>
                                        {s.contact_email
                                            ? <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>
                                            : <em>{t('dashboard.schoolContacts.unverified')}</em>}
                                    </td>
                                    <td>
                                        {t(`dashboard.schoolContacts.modes.${s.monitoring_mode}`)}
                                    </td>
                                    <td>
                                        {s.manual_reminder_interval_days
                                            ? t('dashboard.schoolContacts.everyNDays', { days: s.manual_reminder_interval_days })
                                            : '—'}
                                    </td>
                                    <td>
                                        {enlaceDe(s) && (
                                            <a href={enlaceDe(s)} target="_blank" rel="noopener noreferrer">
                                                {noSeCosecha(s)
                                                    ? t('dashboard.schoolContacts.checkJobsPage')
                                                    : t('dashboard.schoolContacts.visitSite')}
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
