import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import i18n from '../../../i18n';
import { ChatMessageSettingsCard } from '.';
import { ChatMessageSettingsValues } from './chatMessageSettings';

const switchNamed = (canvasElement: HTMLElement, name: string) => within(canvasElement).getByRole('switch', { name });

const startEditing = (canvasElement: HTMLElement) =>
    userEvent.click(within(canvasElement).getByRole('button', { name: 'Bearbeiten' }));

const save = (canvasElement: HTMLElement) =>
    userEvent.click(within(canvasElement).getByRole('button', { name: 'Speichern' }));

/**
 * Platform-wide chat message settings. Controls: `disabledFormats` takes the comma-separated keys
 * the server stores (for example `bold,heading`), `maxWidth` in pixels, `collapseThreshold` in
 * characters with 0 for "never".
 */
const meta = {
    title: 'Organisms/GlobalSettings/ChatMessageSettingsCard',
    component: ChatMessageSettingsCard,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 480 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    argTypes: {
        disabledFormats: { control: 'text' },
        maxWidth: { control: { type: 'number', min: 320, max: 1600, step: 10 } },
        collapseThreshold: { control: { type: 'number', min: 0, max: 100000, step: 50 } },
        disabled: { control: 'boolean' },
        isLoading: { control: 'boolean' },
    },
    args: { disabledFormats: '', maxWidth: '770', collapseThreshold: '300', isLoading: false, onSave: fn() },
    // The play functions query German labels; the preview does not pin i18next's language.
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
    },
} satisfies Meta<typeof ChatMessageSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Never configured: every format on, today's width and today's show-more limit. */
export const Defaults: Story = {
    args: { disabledFormats: undefined, maxWidth: undefined, collapseThreshold: undefined },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(switchNamed(canvasElement, 'Fett')).toBeChecked();
        await expect(switchNamed(canvasElement, 'Überschriften')).toBeChecked();
        await expect(canvas.getByLabelText(/Maximale Breite/)).toHaveValue(770);
        await expect(switchNamed(canvasElement, '„Mehr anzeigen“ für lange Nachrichten')).toBeChecked();
        await expect(canvas.getByLabelText(/Einklappen ab/)).toHaveValue(300);
    },
};

/** Formats the platform switched off render as off switches, the rest stay on. */
export const SomeFormatsOff: Story = {
    args: { disabledFormats: 'bold,heading,taskList' },
    play: async ({ canvasElement }) => {
        await expect(switchNamed(canvasElement, 'Fett')).not.toBeChecked();
        await expect(switchNamed(canvasElement, 'Überschriften')).not.toBeChecked();
        await expect(switchNamed(canvasElement, 'Aufgabenliste')).not.toBeChecked();
        await expect(switchNamed(canvasElement, 'Kursiv')).toBeChecked();
    },
};

/** Collapsing off: the threshold field is gone, messages always show in full. */
export const CollapseOff: Story = {
    args: { collapseThreshold: '0' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(switchNamed(canvasElement, '„Mehr anzeigen“ für lange Nachrichten')).not.toBeChecked();
        await expect(canvas.queryByLabelText(/Einklappen ab/)).toBeNull();
    },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: { disabled: true, disabledFormats: 'bold' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(switchNamed(canvasElement, 'Fett')).toBeDisabled();
        await expect(canvas.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
    },
};

/** Switching a format off sends its key, a width and a threshold together. */
export const SwitchFormatOffAndSave: Story = {
    play: async ({ canvasElement, args }) => {
        await startEditing(canvasElement);
        await userEvent.click(switchNamed(canvasElement, 'Unterstrichen'));
        await save(canvasElement);
        await waitFor(() =>
            expect(args.onSave).toHaveBeenCalledWith(
                { disabledFormats: ['underline'], maxWidth: 770, collapseThreshold: 300 },
                expect.anything(),
            ),
        );
    },
};

/** Both directions on one card: off, saved, on again, saved. The stored list ends up empty. */
const OffAndOnAgainHarness = ({ onSave }: { onSave: (values: ChatMessageSettingsValues) => void }) => {
    const [stored, setStored] = useState<ChatMessageSettingsValues>({
        disabledFormats: [],
        maxWidth: 770,
        collapseThreshold: 300,
    });
    return (
        <ChatMessageSettingsCard
            disabledFormats={stored.disabledFormats}
            maxWidth={stored.maxWidth}
            collapseThreshold={stored.collapseThreshold}
            isLoading={false}
            onSave={(values) => {
                onSave(values);
                setStored(values);
            }}
        />
    );
};

export const SwitchFormatOffAndOnAgain: Story = {
    render: (args) => <OffAndOnAgainHarness onSave={args.onSave} />,
    play: async ({ canvasElement, args }) => {
        await startEditing(canvasElement);
        await userEvent.click(switchNamed(canvasElement, 'Fett'));
        await save(canvasElement);
        await waitFor(() =>
            expect(args.onSave).toHaveBeenLastCalledWith({
                disabledFormats: ['bold'],
                maxWidth: 770,
                collapseThreshold: 300,
            }),
        );
        await waitFor(() => expect(switchNamed(canvasElement, 'Fett')).not.toBeChecked());

        await startEditing(canvasElement);
        await userEvent.click(switchNamed(canvasElement, 'Fett'));
        await save(canvasElement);
        await waitFor(() =>
            expect(args.onSave).toHaveBeenLastCalledWith({
                disabledFormats: [],
                maxWidth: 770,
                collapseThreshold: 300,
            }),
        );
        await waitFor(() => expect(switchNamed(canvasElement, 'Fett')).toBeChecked());
    },
};

/** Off is a real value: the switch sends threshold 0. */
export const SwitchCollapseOffAndSave: Story = {
    play: async ({ canvasElement, args }) => {
        await startEditing(canvasElement);
        await userEvent.click(switchNamed(canvasElement, '„Mehr anzeigen“ für lange Nachrichten'));
        await waitFor(() => expect(within(canvasElement).queryByLabelText(/Einklappen ab/)).toBeNull());
        await save(canvasElement);
        await waitFor(() =>
            expect(args.onSave).toHaveBeenCalledWith(
                { disabledFormats: [], maxWidth: 770, collapseThreshold: 0 },
                expect.anything(),
            ),
        );
    },
};

/** A width outside the bounds is refused in the card, before the server has to say so. */
export const WidthOutOfBoundsIsRefused: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await startEditing(canvasElement);
        const width = canvas.getByLabelText(/Maximale Breite/);
        await userEvent.clear(width);
        await userEvent.type(width, '100');
        await save(canvasElement);
        await canvas.findByText(/zwischen 320 und 1600/);
        await expect(args.onSave).not.toHaveBeenCalled();
    },
};
