import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { CardEditable } from './index';
import { ReadOnlyHintContext } from './ReadOnlyHintContext';
import { MuiFormField } from '../mui/MuiFormField';
import { MuiSwitchField } from '../mui/MuiSwitchField';
import { FormSwitchField } from '../FormSwitchField';

/**
 * Read-only guarantee (#689/#735): a CardEditable that is not in edit mode
 * disables its whole antd `<Form>`; MUI-backed fields must pick that up via
 * `ConfigProvider.useConfig().componentDisabled`. They used to read the
 * antd-internal `antd/es/config-provider/DisabledContext`, which resolves to a
 * second module instance under Vitest — the context value never arrived and
 * this exact assertion failed while the app looked fine in the browser.
 */
describe('CardEditable', () => {
    const renderCard = () =>
        render(
            <CardEditable titleKey="card.title" onSave={vi.fn()} initialValues={{ name: 'ACME', enabled: true }}>
                <MuiFormField name="name" label="Name" />
                <MuiSwitchField name="enabled" label="Enabled" />
            </CardEditable>,
        );

    it('renders MUI-backed fields disabled while not editing', () => {
        renderCard();

        expect(screen.getByLabelText('Name')).toBeDisabled();
        expect(screen.getByRole('switch', { name: 'Enabled' })).toHaveAttribute('aria-disabled', 'true');
    });

    it('keeps a locked switch focusable and ignores keyboard and pointer changes', async () => {
        const user = userEvent.setup();
        renderCard();
        const toggle = screen.getByRole('switch', { name: 'Enabled' });
        toggle.focus();
        expect(toggle).toHaveFocus();
        await user.keyboard('[Space]');
        expect(toggle).toBeChecked();
        await user.click(toggle);
        expect(toggle).toBeChecked();
    });

    it('uses the same locked switch for legacy form fields', async () => {
        const user = userEvent.setup();
        render(
            <CardEditable titleKey="card.title" onSave={vi.fn()} initialValues={{ enabled: true }}>
                <FormSwitchField name="enabled" label="Legacy" />
            </CardEditable>,
        );
        const toggle = screen.getByRole('switch', { name: 'Legacy' });
        expect(toggle).toHaveAttribute('aria-disabled', 'true');
        toggle.focus();
        expect(toggle).toHaveFocus();
        await user.keyboard('[Space]');
        expect(toggle).toBeChecked();
    });

    it('hides editing actions when editing is forbidden', () => {
        render(
            <CardEditable titleKey="card.title" onSave={vi.fn()} allowEdit={false} initialValues={{ enabled: true }}>
                <MuiSwitchField name="enabled" label="Enabled" />
            </CardEditable>,
        );
        expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'card.edit.save' })).not.toBeInTheDocument();
    });

    it('re-enables the fields once editing starts', async () => {
        const user = userEvent.setup();
        renderCard();

        await user.click(screen.getByRole('button', { name: 'edit' }));

        expect(screen.getByLabelText('Name')).toBeEnabled();
        expect(screen.getByRole('switch', { name: 'Enabled' })).toBeEnabled();
    });

    it('submits a toggled-off switch as false so card patches keep the new value', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <CardEditable titleKey="card.title" onSave={onSave} initialValues={{ teamAgency: true }}>
                <MuiSwitchField name="teamAgency" label="Team" />
            </CardEditable>,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: 'Team' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][0]).toEqual({ teamAgency: false });
    });

    it('keeps entered values editable when the save callback reports an error', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <CardEditable titleKey="card.title" onSave={onSave} initialValues={{ name: 'ACME' }}>
                <MuiFormField name="name" label="Name" />
            </CardEditable>,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const nameField = screen.getByLabelText('Name');
        await user.clear(nameField);
        await user.type(nameField, 'Edited agency');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        onSave.mock.calls[0][1].onError();

        await waitFor(() => expect(screen.getByLabelText('Name')).toBeEnabled());
        expect(screen.getByLabelText('Name')).toHaveValue('Edited agency');
    });

    it('restores edit and unsaved-change state when save fails synchronously', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn((_formData, options) => options?.onError?.());
        render(
            <CardEditable allowUnsavedChanges titleKey="card.title" onSave={onSave} initialValues={{ name: 'ACME' }}>
                <MuiFormField name="name" label="Name" />
            </CardEditable>,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.clear(screen.getByLabelText('Name'));
        await user.type(screen.getByLabelText('Name'), 'Edited agency');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        expect(screen.getByLabelText('Name')).toBeEnabled();
        await user.click(screen.getByRole('button', { name: 'card.edit.cancel' }));
        expect(await screen.findByText('overlay.unsaved.title')).toBeInTheDocument();
    });

    it('ignores a failure that arrives after a newer save was sent', async () => {
        const user = userEvent.setup();
        const deferredErrors: (() => void)[] = [];
        const onSave = vi.fn((_formData, options) => {
            if (options?.onError) {
                deferredErrors.push(options.onError);
            }
        });
        render(
            <CardEditable titleKey="card.title" onSave={onSave} initialValues={{ name: 'ACME' }}>
                <MuiFormField name="name" label="Name" />
            </CardEditable>,
        );

        const saveOnce = async (value: string) => {
            await user.click(screen.getByRole('button', { name: 'edit' }));
            await user.clear(screen.getByLabelText('Name'));
            await user.type(screen.getByLabelText('Name'), value);
            await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        };

        await saveOnce('First edit');
        await saveOnce('Second edit');
        expect(deferredErrors).toHaveLength(2);

        // The first save fails late, after the second one has already been sent.
        deferredErrors[0]();

        await waitFor(() => expect(screen.getByLabelText('Name')).toBeDisabled());
    });

    /** #1374: a press on a locked field used to do nothing, so nothing said "Bearbeiten" comes first. */
    describe('edit nudge', () => {
        const renderFooterCard = () =>
            render(
                <CardEditable
                    titleKey="card.title"
                    onSave={vi.fn()}
                    variant="dialog"
                    editButtonPlacement="footer"
                    initialValues={{ name: 'ACME', enabled: true }}
                >
                    <MuiFormField name="name" label="Name" />
                    <MuiSwitchField name="enabled" label="Enabled" />
                    <a href="#help">Mehr erfahren</a>
                </CardEditable>,
            );

        it('points at the edit button when a locked field is pressed in read mode', () => {
            vi.useFakeTimers();
            try {
                renderFooterCard();
                const status = screen.getByRole('status');
                expect(status).toHaveAttribute('aria-live', 'polite');
                expect(status).toBeEmptyDOMElement();

                fireEvent.pointerDown(screen.getByLabelText('Name'));

                expect(status).toHaveTextContent('card.edit.nudge');
                expect(screen.getByRole('button', { name: 'edit' }).className).toMatch(/editNudge/);

                act(() => {
                    vi.advanceTimersByTime(3300);
                });
                expect(status).toBeEmptyDOMElement();
                expect(screen.getByRole('button', { name: 'edit' }).className).not.toMatch(/editNudge/);
            } finally {
                vi.useRealTimers();
            }
        });

        it('also nudges for Space on a locked switch that keeps keyboard focus', () => {
            renderFooterCard();
            fireEvent.keyDown(screen.getByRole('switch', { name: 'Enabled' }), { key: ' ' });
            expect(screen.getByRole('status')).toHaveTextContent('card.edit.nudge');
        });

        it('leaves working read-mode controls such as links alone', () => {
            renderFooterCard();
            fireEvent.pointerDown(screen.getByRole('link', { name: 'Mehr erfahren' }));
            expect(screen.getByRole('status')).toBeEmptyDOMElement();
        });

        it('does not nudge once the tile is being edited', async () => {
            const user = userEvent.setup();
            renderFooterCard();
            await user.click(screen.getByRole('button', { name: 'edit' }));

            fireEvent.pointerDown(screen.getByLabelText('Name'));

            expect(screen.queryByRole('status')).not.toBeInTheDocument();
            expect(screen.queryByText('card.edit.nudge')).not.toBeInTheDocument();
        });

        it('stops the nudge when editing starts', async () => {
            const user = userEvent.setup();
            renderFooterCard();
            fireEvent.pointerDown(screen.getByLabelText('Name'));
            await user.click(screen.getByRole('button', { name: 'edit' }));
            expect(screen.queryByText('card.edit.nudge')).not.toBeInTheDocument();
            expect(screen.getByLabelText('Name')).toBeEnabled();
        });
    });

    describe('read-only access', () => {
        const renderReadOnly = (placement: 'header' | 'footer') =>
            render(
                <CardEditable
                    titleKey="card.title"
                    onSave={vi.fn()}
                    readOnlyAccess
                    editButtonPlacement={placement}
                    initialValues={{ name: 'ACME' }}
                >
                    <MuiFormField name="name" label="Name" />
                </CardEditable>,
            );

        it.each(['header', 'footer'] as const)(
            'shows a locked, focusable edit action with a %s tooltip and stays read-only',
            async (placement) => {
                const user = userEvent.setup();
                renderReadOnly(placement);
                const locked = screen.getByRole('button', { name: 'edit' });
                expect(locked).toHaveAttribute('aria-disabled', 'true');
                expect(locked).not.toBeDisabled();

                await user.tab();
                expect(locked).toHaveFocus();
                const tooltip = await screen.findByRole('tooltip');
                expect(tooltip).toHaveTextContent('card.edit.readOnly');
                // Announced with the button, not only shown.
                expect(locked).toHaveAttribute('aria-describedby', tooltip.id);

                await user.click(locked);
                expect(screen.getByLabelText('Name')).toBeDisabled();
                expect(screen.queryByRole('button', { name: 'card.edit.save' })).not.toBeInTheDocument();
            },
        );

        it('does not nudge towards an edit the viewer cannot make', () => {
            renderReadOnly('footer');
            fireEvent.pointerDown(screen.getByLabelText('Name'));
            expect(screen.queryByText('card.edit.nudge')).not.toBeInTheDocument();
        });

        it('marks the tile itself: a "Nur lesen" chip with the same hint and a dashed outline', async () => {
            const user = userEvent.setup();
            const { container } = renderReadOnly('footer');
            const chip = screen.getByText('card.edit.readOnlyChip');
            // Not a tab stop of its own: the locked edit button carries the hint for the keyboard.
            await user.tab();
            expect(screen.getByRole('button', { name: 'edit' })).toHaveFocus();
            await user.tab({ shift: true });

            await user.hover(chip);
            expect(await screen.findByRole('tooltip')).toHaveTextContent('card.edit.readOnly');
            expect(container.firstElementChild?.className).toMatch(/readOnlyTile/);
        });

        it('names who can change it: the tile hint before the page hint before the generic sentence', async () => {
            const user = userEvent.setup();
            const tile = (hint?: string) => (
                <ReadOnlyHintContext.Provider value="page hint">
                    <CardEditable titleKey="card.title" readOnlyAccess readOnlyHint={hint}>
                        <MuiFormField name="name" label="Name" />
                    </CardEditable>
                </ReadOnlyHintContext.Provider>
            );
            const { rerender } = render(tile('tile hint'));
            await user.hover(screen.getByRole('button', { name: 'edit' }));
            expect(await screen.findByRole('tooltip')).toHaveTextContent('tile hint');
            await user.unhover(screen.getByRole('button', { name: 'edit' }));

            rerender(tile());
            await user.hover(screen.getByRole('button', { name: 'edit' }));
            expect(await screen.findByRole('tooltip')).toHaveTextContent('page hint');
        });

        it('shows neither chip nor dashed outline on a tile the viewer may edit', () => {
            const { container } = renderCard();
            expect(screen.queryByText('card.edit.readOnlyChip')).not.toBeInTheDocument();
            expect(container.firstElementChild?.className).not.toMatch(/readOnlyTile/);
        });
    });
});
