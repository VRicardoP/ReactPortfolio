import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const cycleTheme = vi.fn();
const toggleCompactBackground = vi.fn();
vi.mock('../../../context/ThemeContext', () => ({
    useTheme: () => ({
        theme: { primary: '#0ff' },
        cycleTheme,
        compactBackground: false,
        toggleCompactBackground,
    }),
}));

import MobileNav from '../MobileNav';

describe('MobileNav', () => {
    const defaultProps = {
        title: 'Vicente Pau',
        onTerminalToggle: vi.fn(),
    };

    // DT-208: en móvil no había forma de cambiar el tema ni de tener fondo.
    it('offers theme cycling and the animated-background switch in the menu', () => {
        render(<MobileNav {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Menu'));

        fireEvent.click(screen.getByRole('menuitem', { name: /theme/i }));
        expect(cycleTheme).toHaveBeenCalledOnce();

        const bgSwitch = screen.getByRole('menuitemcheckbox', { name: /animated background/i });
        expect(bgSwitch).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(bgSwitch);
        expect(toggleCompactBackground).toHaveBeenCalledOnce();

        // Neither closes the menu: the visitor can keep cycling themes.
        expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('renders the title', () => {
        render(<MobileNav {...defaultProps} />);
        expect(screen.getByText('Vicente Pau')).toBeInTheDocument();
    });

    it('renders the menu button', () => {
        render(<MobileNav {...defaultProps} />);
        const menuBtn = screen.getByLabelText('Menu');
        expect(menuBtn).toBeInTheDocument();
    });

    it('does not show the dropdown by default', () => {
        render(<MobileNav {...defaultProps} />);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('opens the dropdown when menu button is clicked', () => {
        render(<MobileNav {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Menu'));
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getByText('Terminal')).toBeInTheDocument();
    });

    it('calls onTerminalToggle and closes menu when Terminal is clicked', () => {
        const onToggle = vi.fn();
        render(<MobileNav {...defaultProps} onTerminalToggle={onToggle} />);

        fireEvent.click(screen.getByLabelText('Menu'));
        fireEvent.click(screen.getByRole('menuitem', { name: /terminal/i }));

        expect(onToggle).toHaveBeenCalledOnce();
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes the dropdown when overlay is clicked', () => {
        render(<MobileNav {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Menu'));
        expect(screen.getByRole('menu')).toBeInTheDocument();

        fireEvent.click(document.querySelector('.mobile-nav-dropdown-overlay'));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('sets aria-expanded correctly', () => {
        render(<MobileNav {...defaultProps} />);
        const menuBtn = screen.getByLabelText('Menu');

        expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(menuBtn);
        expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    });
});
