import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TabBar from '../TabBar';

const tabs = [
    { key: 'one', label: 'One' },
    { key: 'two', label: 'Two', disabled: true },
    { key: 'three', label: 'Three' },
];

describe('TabBar', () => {
    it('exposes a roving accessible tab set', () => {
        const onChange = vi.fn();
        render(<TabBar tabs={tabs} active="one" onChange={onChange} ariaLabel="Sections" />);
        expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute('tabindex', '-1');

        fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
        expect(onChange).toHaveBeenCalledWith('three');
    });

    it('supports Home and End without selecting disabled tabs', () => {
        const onChange = vi.fn();
        render(<TabBar tabs={tabs} active="three" onChange={onChange} ariaLabel="Sections" />);
        fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Home' });
        fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' });
        expect(onChange.mock.calls).toEqual([['one'], ['three']]);
    });
});
