import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Force mobile mode so FloatingWindow renders the mobile variant
vi.mock('../../../hooks/useIsMobile', () => ({
    default: () => true,
}));

// Mock WindowContext so FloatingWindowDesktop imports don't fail
vi.mock('../../../context/WindowContext', () => ({
    useWindowContext: () => ({
        windows: {},
        activeWindowId: null,
        registerWindow: vi.fn(),
        unregisterWindow: vi.fn(),
        bringToFront: vi.fn(),
        toggleMinimize: vi.fn(),
        toggleMaximize: vi.fn(),
        fitToContent: vi.fn(),
        updatePosition: vi.fn(),
        updateSize: vi.fn(),
    }),
}));

import FloatingWindow from '../FloatingWindow';

describe('FloatingWindowMobile', () => {
    it('renders collapsed by default', () => {
        render(
            <FloatingWindow id="test-window" title="Test Window">
                <p>Window content</p>
            </FloatingWindow>
        );

        expect(screen.getByText('Test Window')).toBeInTheDocument();
        expect(screen.queryByText('Window content')).not.toBeInTheDocument();
    });

    it('renders expanded when defaultExpanded is true', () => {
        render(
            <FloatingWindow id="test-window" title="Test Window" defaultExpanded>
                <p>Window content</p>
            </FloatingWindow>
        );

        expect(screen.getByText('Test Window')).toBeInTheDocument();
        expect(screen.getByText('Window content')).toBeInTheDocument();
    });

    it('expands on header click', () => {
        render(
            <FloatingWindow id="test-window" title="Test Window">
                <p>Window content</p>
            </FloatingWindow>
        );

        expect(screen.queryByText('Window content')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /test window/i }));
        expect(screen.getByText('Window content')).toBeInTheDocument();
    });

    it('collapses when expanded header is clicked', () => {
        render(
            <FloatingWindow id="test-window" title="Test Window" defaultExpanded>
                <p>Window content</p>
            </FloatingWindow>
        );

        expect(screen.getByText('Window content')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /test window/i }));
        expect(screen.queryByText('Window content')).not.toBeInTheDocument();
    });

    it('toggles on Enter key press', () => {
        render(
            <FloatingWindow id="test-window" title="Test Window">
                <p>Window content</p>
            </FloatingWindow>
        );

        const header = screen.getByRole('button', { name: /test window/i });
        fireEvent.keyDown(header, { key: 'Enter' });
        expect(screen.getByText('Window content')).toBeInTheDocument();

        fireEvent.keyDown(header, { key: 'Enter' });
        expect(screen.queryByText('Window content')).not.toBeInTheDocument();
    });

    it('toggles on Space key press', () => {
        render(
            <FloatingWindow id="test-window" title="Test Window">
                <p>Window content</p>
            </FloatingWindow>
        );

        const header = screen.getByRole('button', { name: /test window/i });
        fireEvent.keyDown(header, { key: ' ' });
        expect(screen.getByText('Window content')).toBeInTheDocument();
    });

    it('has correct aria-expanded attribute', () => {
        render(
            <FloatingWindow id="test-window" title="Test Window">
                <p>Window content</p>
            </FloatingWindow>
        );

        const header = screen.getByRole('button', { name: /test window/i });
        expect(header).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(header);
        expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('sets aria-labelledby on the section', () => {
        render(
            <FloatingWindow id="test-window" title="Test Window">
                <p>Window content</p>
            </FloatingWindow>
        );

        const section = screen.getByRole('region', { hidden: true }) || document.querySelector('section');
        expect(section).toHaveAttribute('aria-labelledby', 'test-window-title');
    });
});
