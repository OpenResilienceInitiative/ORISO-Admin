import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyLinkRow } from './CopyLinkRow';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const LINK = 'https://app.example.org/registration?cid=qa-shazia-2810';

describe('CopyLinkRow', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uses the copy labels it is given and announces the confirmation', async () => {
        const user = userEvent.setup();
        render(<CopyLinkRow value={LINK} labelKey="link.label" copyKey="link.copy" copiedKey="link.copied" />);

        expect(screen.getByLabelText('link.label')).toHaveValue(LINK);
        await user.click(screen.getByRole('button', { name: 'link.copy' }));

        await screen.findByRole('button', { name: 'link.copied' });
        expect(screen.getByRole('status')).toHaveTextContent('link.copied');
        await expect(navigator.clipboard.readText()).resolves.toBe(LINK);
    });

    it('falls back to selecting and copying the text when the Clipboard API is unavailable', async () => {
        const user = userEvent.setup();
        vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('not allowed'));
        const execCommand = vi.fn().mockReturnValue(true);
        Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
        render(<CopyLinkRow value={LINK} labelKey="link.label" copyKey="link.copy" copiedKey="link.copied" />);

        await user.click(screen.getByRole('button', { name: 'link.copy' }));

        expect(execCommand).toHaveBeenCalledWith('copy');
        await screen.findByRole('button', { name: 'link.copied' });
    });

    it('leaves the link selected for a manual copy when no copy method works', async () => {
        const user = userEvent.setup();
        vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('not allowed'));
        Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn().mockReturnValue(false) });
        render(<CopyLinkRow value={LINK} labelKey="link.label" copyKey="link.copy" copiedKey="link.copied" />);

        await user.click(screen.getByRole('button', { name: 'link.copy' }));

        const input = screen.getByLabelText('link.label') as HTMLInputElement;
        expect(input.selectionStart).toBe(0);
        expect(input.selectionEnd).toBe(LINK.length);
        expect(screen.queryByRole('button', { name: 'link.copied' })).not.toBeInTheDocument();
    });
});
