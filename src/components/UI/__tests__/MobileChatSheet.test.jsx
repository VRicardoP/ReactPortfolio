import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileChatSheet from '../MobileChatSheet';

// Mock ChatContent to avoid SSE/fetch dependencies
vi.mock('../../Windows/ChatContent', () => ({
    default: () => <div data-testid="chat-content">Chat content loaded</div>,
}));

describe('MobileChatSheet', () => {
    it('renders the FAB button', () => {
        render(<MobileChatSheet data={{}} />);
        const fab = screen.getByLabelText('Open chat');
        expect(fab).toBeInTheDocument();
        expect(fab).toHaveClass('mobile-chat-fab');
    });

    it('does not show the sheet by default', () => {
        render(<MobileChatSheet data={{}} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the sheet when FAB is clicked', async () => {
        render(<MobileChatSheet data={{}} />);
        fireEvent.click(screen.getByLabelText('Open chat'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Kusanagi AI')).toBeInTheDocument();
    });

    it('closes the sheet when close button is clicked', () => {
        render(<MobileChatSheet data={{}} />);
        fireEvent.click(screen.getByLabelText('Open chat'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Close chat'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the sheet when overlay is clicked', () => {
        render(<MobileChatSheet data={{}} />);
        fireEvent.click(screen.getByLabelText('Open chat'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        fireEvent.click(document.querySelector('.mobile-chat-overlay'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
