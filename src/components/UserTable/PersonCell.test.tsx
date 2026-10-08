import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PersonCell } from './PersonCell';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
// Decorative icons do not affect the Copy button or snackbar behaviour.
vi.mock('@mui/icons-material', () => ({ Check: () => null, Close: () => null }));
vi.mock('@mui/icons-material/ContentCopyOutlined', () => ({ default: () => null }));

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

afterEach(() => {
    cleanup();
    if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    else Reflect.deleteProperty(navigator, 'clipboard');
});

describe('PersonCell e-mail copying', () => {
    it('shows the failure snackbar when the Clipboard API is unavailable', async () => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
        render(<PersonCell name="Maria Huber" email="maria@example.org" />);

        fireEvent.click(screen.getByRole('button', { name: /E-Mail/ }));

        expect(await screen.findByRole('status')).toHaveTextContent('Kopieren fehlgeschlagen');
    });

    it('shows the failure snackbar when writing throws before returning a promise', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: () => {
                    throw new Error('Clipboard unavailable');
                },
            },
        });
        render(<PersonCell name="Maria Huber" email="maria@example.org" />);

        fireEvent.click(screen.getByRole('button', { name: /E-Mail/ }));

        expect(await screen.findByRole('status')).toHaveTextContent('Kopieren fehlgeschlagen');
    });
});
