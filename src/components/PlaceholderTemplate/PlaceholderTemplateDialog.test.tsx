import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlaceholderTemplateDialog } from './PlaceholderTemplateDialog';

const t = (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key);

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

describe('PlaceholderTemplateDialog', () => {
    const renderDialog = (props: Partial<Parameters<typeof PlaceholderTemplateDialog>[0]> = {}) => {
        const onSave = vi.fn();
        const onClose = vi.fn();
        render(
            <PlaceholderTemplateDialog
                titleKey="placeholderTemplate.dialog.inviteTitle"
                descriptionKey="placeholderTemplate.dialog.inviteDescription"
                onSave={onSave}
                onClose={onClose}
                {...props}
            >
                <section aria-label="Einladungs-E-Mail">
                    <header>
                        <h3>Einladungs-E-Mail</h3>
                    </header>
                    <p>editor body</p>
                </section>
            </PlaceholderTemplateDialog>,
        );
        return { onSave, onClose };
    };

    it('renders the house dialog anatomy: title, description, body, save and cancel', () => {
        renderDialog();
        expect(screen.getByText('placeholderTemplate.dialog.inviteTitle')).toBeInTheDocument();
        expect(screen.getByText('placeholderTemplate.dialog.inviteDescription')).toBeInTheDocument();
        expect(screen.getByText('editor body')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'save' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'cancel' })).toBeInTheDocument();
    });

    it('wires save and cancel to the callbacks', () => {
        const { onSave, onClose } = renderDialog();
        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        expect(onSave).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('disables save via saveDisabled while keeping cancel active', () => {
        renderDialog({ saveDisabled: true });
        expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'cancel' })).toBeEnabled();
    });
});
