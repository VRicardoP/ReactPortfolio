import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('../../Windows/FloatingWindow', () => ({ default: ({ children }) => <div>{children}</div> }));

import SchoolManualContactsWindow from '../SchoolManualContactsWindow';

// Un colegio por cada política, para fijar el criterio de la ventana: lo que
// decide es si acepta correo directo, no cómo se le vigila.
const COLEGIOS = [
    {
        id: 's1',
        name: 'Escuela Correo Directo',
        city: 'Villars-sur-Ollon',
        policy: 'direct_email',
        monitoring_mode: 'manual_only',
        contact_email: 'jobs@directo.ch',
        manual_reminder_interval_days: 90,
        portal_url: 'https://directo.ch',
    },
    {
        id: 's2',
        // El caso que la ventana perdía: acepta correo directo Y publica ofertas.
        name: 'Escuela Vigilada Con Correo',
        policy: 'direct_email_ok',
        monitoring_mode: 'scrape',
        contact_email: 'recruitment@vigilada.ch',
        manual_reminder_interval_days: null,
        portal_url: 'https://vigilada.ch',
    },
    {
        id: 's3',
        name: 'Escuela Correo Al Director',
        policy: 'direct_email_director',
        monitoring_mode: 'scrape',
        contact_email: null,
        manual_reminder_interval_days: null,
        portal_url: null,
    },
    {
        id: 's4',
        name: 'Escuela Solo Portal Vigilada',
        policy: 'portal_only',
        monitoring_mode: 'scrape',
        contact_email: 'no-escribir@portal.ch',
        manual_reminder_interval_days: null,
        portal_url: 'https://portal.ch',
    },
    {
        id: 's5',
        // Solo portal Y sin vigilancia: nadie le saca las ofertas, asi que su
        // enlace es la unica via de enterarse. Entra pese a su politica.
        name: 'Escuela Sin Vigilancia',
        policy: 'portal_only',
        monitoring_mode: 'manual_only',
        contact_email: null,
        manual_reminder_interval_days: 120,
        jobs_page_url: 'https://sinvigilancia.ch/empleo',
        portal_url: 'https://sinvigilancia.ch',
    },
];

const schoolData = (schools = COLEGIOS, extra = {}) => ({
    schools,
    jobs: [],
    loading: false,
    error: null,
    ...extra,
});

describe('SchoolManualContactsWindow', () => {
    it('lista los colegios que aceptan correo directo, sea cual sea su vigilancia', () => {
        render(<SchoolManualContactsWindow schoolData={schoolData()} />);

        expect(screen.getByText('Escuela Correo Directo')).toBeInTheDocument();
        expect(screen.getByText('Escuela Correo Al Director')).toBeInTheDocument();
    });

    it('incluye un colegio vigilado que admite correo (la regresión que motivó el cambio)', () => {
        // Antes se filtraba por `monitoring_mode === 'manual_only'`, asi que un
        // colegio con `scrape` + `direct_email_ok` no aparecia nunca, aunque su
        // politica dijera justo que se le puede escribir.
        render(<SchoolManualContactsWindow schoolData={schoolData()} />);

        expect(screen.getByText('Escuela Vigilada Con Correo')).toBeInTheDocument();
        expect(screen.getByText('recruitment@vigilada.ch')).toBeInTheDocument();
    });

    it('excluye los colegios VIGILADOS que solo admiten su propio portal', () => {
        render(<SchoolManualContactsWindow schoolData={schoolData()} />);

        // De este el panel ya recibe las ofertas, asi que no hay nada que hacer
        // a mano; y su correo no se ofrece porque contradice su politica.
        expect(screen.queryByText('Escuela Solo Portal Vigilada')).not.toBeInTheDocument();
        expect(screen.queryByText('no-escribir@portal.ch')).not.toBeInTheDocument();
    });

    it('incluye un colegio sin vigilancia aunque solo admita portal', () => {
        // Nadie cosecha sus ofertas, asi que el enlace es la unica via: entra
        // pese a que su politica no permita escribir.
        render(<SchoolManualContactsWindow schoolData={schoolData()} />);

        expect(screen.getByText('Escuela Sin Vigilancia')).toBeInTheDocument();
    });

    it('enlaza la pagina de ofertas, no la raiz del portal', () => {
        render(<SchoolManualContactsWindow schoolData={schoolData()} />);

        // El colegio sin vigilancia declara las dos URLs: debe ganar la de
        // ofertas, que es la que sirve para detectar una vacante.
        const destinos = screen
            .getAllByText('dashboard.schoolContacts.checkJobsPage')
            .map((a) => a.getAttribute('href'));
        expect(destinos).toContain('https://sinvigilancia.ch/empleo');
        expect(destinos).not.toContain('https://sinvigilancia.ch');
    });

    it('distingue la vigilancia de cada colegio', () => {
        render(<SchoolManualContactsWindow schoolData={schoolData()} />);

        // Con `t` devolviendo la clave, el modo se ve como su clave i18n.
        expect(screen.getAllByText('dashboard.schoolContacts.modes.manual_only')).toHaveLength(2);
        expect(screen.getAllByText('dashboard.schoolContacts.modes.scrape')).toHaveLength(2);
    });

    it('muestra la poblacion junto al nombre cuando el nucleo la envia', () => {
        render(<SchoolManualContactsWindow schoolData={schoolData()} />);

        expect(screen.getByText('Villars-sur-Ollon · direct_email')).toBeInTheDocument();
    });

    it('marca como sin verificar a los colegios sin correo', () => {
        render(<SchoolManualContactsWindow schoolData={schoolData()} />);

        // Dos entran sin correo: el de correo al director y el sin vigilancia.
        expect(screen.getAllByText('dashboard.schoolContacts.unverified')).toHaveLength(2);
    });

    it('avisa cuando no queda nada que hacer a mano', () => {
        // Vigilado y solo-portal: ni se le escribe, ni hay que mirarle la web.
        const nadaQueHacer = COLEGIOS.filter(
            (s) => s.policy === 'portal_only' && s.monitoring_mode === 'scrape'
        );
        render(<SchoolManualContactsWindow schoolData={schoolData(nadaQueHacer)} />);

        expect(screen.getByText('dashboard.schoolContacts.noContacts')).toBeInTheDocument();
    });
});
