import { afterEach, describe, expect, it, vi } from 'vitest';

import downloadBlob from '../downloadBlob';
import { formatFilterSalary, formatJobSalary } from '../formatSalary';
import maskIp from '../maskIp';

describe('utilidades compartidas de presentación', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('conserva los dos contratos de salario', () => {
        expect(formatFilterSalary(50000, 100000, 'CHF')).toBe('CHF 50,000 - 100,000');
        expect(formatFilterSalary(null, 80000, 'USD')).toBe('USD <=80,000');
        expect(formatJobSalary({
            job_min_salary: 50000,
            job_max_salary: 100000,
            job_salary_currency: 'CHF',
            job_salary_period: 'year',
        })).toBe('CHF 50,000-100,000/year');
        expect(formatJobSalary({})).toBeNull();
    });

    it('oculta IPv4 e IPv6 sin modificar otros identificadores', () => {
        expect(maskIp('192.168.1.42')).toBe('192.168.1.***');
        expect(maskIp('2001:db8::1')).toBe('2001:db8::****');
        expect(maskIp('localhost')).toBe('localhost');
        expect(maskIp(null)).toBe('N/A');
    });

    it('inserta el enlace para Firefox y siempre libera sus recursos', () => {
        const anchor = { click: vi.fn(), remove: vi.fn() };
        vi.spyOn(document, 'createElement').mockReturnValue(anchor);
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchor);
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:test'),
            revokeObjectURL: vi.fn(),
        });

        downloadBlob(new Blob(['data']), 'file.txt');

        expect(document.body.appendChild).toHaveBeenCalledWith(anchor);
        expect(anchor.click).toHaveBeenCalledOnce();
        expect(anchor.remove).toHaveBeenCalledOnce();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
});
