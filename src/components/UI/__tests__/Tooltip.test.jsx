import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Tooltip from '../Tooltip';

describe('Tooltip', () => {
    it('renders in a body portal so window overflow cannot clip it', () => {
        const { container } = render(
            <div data-testid="window">
                <Tooltip text="Minimize" position="bottom">
                    <button type="button">control</button>
                </Tooltip>
            </div>
        );

        fireEvent.mouseEnter(screen.getByText('control').parentElement);

        const tooltip = screen.getByRole('tooltip');
        expect(document.body).toContainElement(tooltip);
        expect(container).not.toContainElement(tooltip);
        expect(tooltip).toHaveClass('cyberpunk-tooltip');
    });
});
