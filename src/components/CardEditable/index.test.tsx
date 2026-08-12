import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormInputField } from '../FormInputField';
import { CardEditable } from './index';

/**
 * A save that fails must not look like a save that worked (#690): the card stays
 * open with the entered values so the user can retry, instead of collapsing back to
 * view mode while the change is silently dropped.
 */
const renderCard = (onSave: Parameters<typeof CardEditable>[0]['onSave']) =>
    render(
        <CardEditable titleKey="settings.images.title" onSave={onSave}>
            <FormInputField labelKey="organisation.name" name="name" />
        </CardEditable>,
    );

const startEditingAndSave = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.type(screen.getByRole('textbox'), 'ORISO');
    await user.click(screen.getByRole('button', { name: /save/i }));
};

describe('CardEditable', () => {
    it('leaves edit mode when the save succeeds', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        renderCard(onSave);

        await startEditingAndSave(user);

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        await waitFor(() => expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument());
    });

    it('ignores a failure that arrives after a newer save was sent', async () => {
        const user = userEvent.setup();
        const deferredErrors: (() => void)[] = [];
        const onSave = vi.fn((_formData, options) => {
            if (options?.onError) {
                deferredErrors.push(options.onError);
            }
        });
        renderCard(onSave);

        await startEditingAndSave(user);
        await startEditingAndSave(user);
        expect(deferredErrors).toHaveLength(2);

        // The first save fails late, after the second one has already been sent.
        deferredErrors[0]();

        await waitFor(() => expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument());
    });

    it('stays in edit mode with the entered value when the save fails', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn((_formData, options) => options?.onError?.());
        renderCard(onSave);

        await startEditingAndSave(user);

        await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument());
        expect(screen.getByRole('textbox')).toHaveValue('ORISO');
    });
});
