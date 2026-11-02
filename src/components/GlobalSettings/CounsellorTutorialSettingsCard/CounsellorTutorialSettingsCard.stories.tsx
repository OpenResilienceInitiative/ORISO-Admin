import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { useState } from 'react';
import { message } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import i18n from '../../../i18n';
import { CounsellorTutorialSettingsCard } from '.';

const meta = {
    title: 'Organisms/GlobalSettings/CounsellorTutorialSettingsCard',
    component: CounsellorTutorialSettingsCard,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 520 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { toursEnabled: false, practiceEnabled: false },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const controls = canvas.getAllByRole('switch');
        await expect(controls).toHaveLength(4);
        controls.forEach((control) => expect(control).toBeDisabled());
        await expect(canvas.queryByRole('button')).toBeNull();
        await expect(canvas.getByText(/^(Kommt bald|Coming soon)$/)).toBeVisible();
    },
} satisfies Meta<typeof CounsellorTutorialSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = {
    args: { toursEnabled: true, practiceEnabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const tours = canvas.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' });
        await expect(tours).toBeDisabled();
        await expect(tours).toBeChecked();
        await userEvent.click(tours.closest('label')!);
        tours.focus();
        await userEvent.keyboard(' {Enter}');
        await expect(tours).not.toHaveFocus();
        await expect(tours).toBeChecked();
        await expect(canvas.getByRole('switch', { name: 'Übungsbereich anbieten' })).toBeChecked();
        await expect(
            canvas.getByRole('switch', { name: 'Einführung bei neuen Beraterkonten automatisch starten' }),
        ).not.toBeChecked();
        await expect(canvas.queryByRole('button')).toBeNull();
    },
};

/** Admin#1205: the platform admin switches tours centrally; the other controls stay a preview. */
export const PlatformAdmin: Story = {
    args: { toursEnabled: false, practiceEnabled: true, onToursChange: fn() },
    render: function PlatformAdminStory(args) {
        const [toursEnabled, setToursEnabled] = useState(args.toursEnabled);
        return (
            <CounsellorTutorialSettingsCard
                {...args}
                toursEnabled={toursEnabled}
                onToursChange={(enabled) => {
                    args.onToursChange?.(enabled);
                    setToursEnabled(enabled);
                }}
            />
        );
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const tours = canvas.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' });
        await expect(tours).toBeEnabled();
        await expect(tours).not.toBeChecked();
        await userEvent.click(tours);
        await expect(args.onToursChange).toHaveBeenCalledWith(true);
        await expect(tours).toBeChecked();
        await expect(canvas.getAllByText('Verfügbar')).toHaveLength(2);
        await expect(canvas.getByRole('switch', { name: 'Übungsbereich anbieten' })).toBeDisabled();
    },
};

export const Saving: Story = {
    args: { toursEnabled: false, practiceEnabled: false, onToursChange: fn(), toursSaving: true },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' })).toBeDisabled();
    },
};

/** The save fails: the error message appears and the switch returns to the stored value. */
export const SaveFailed: Story = {
    args: { toursEnabled: true, practiceEnabled: true },
    render: function SaveFailedStory(args) {
        const [, setAttempts] = useState(0);
        return (
            <CounsellorTutorialSettingsCard
                {...args}
                onToursChange={() => {
                    message.error({ content: String(i18n.t('globalSettings.tutorials.error.generic')), duration: 5 });
                    setAttempts((attempts) => attempts + 1);
                }}
            />
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const tours = canvas.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' });
        await userEvent.click(tours);
        await waitFor(() =>
            expect(
                within(canvasElement.ownerDocument.body).getByText(
                    'Die Einstellung für Rundgänge konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
                ),
            ).toBeVisible(),
        );
        await waitFor(() => expect(tours).toBeChecked());
    },
};

export const SettingsNotReported: Story = {
    args: { toursEnabled: undefined, practiceEnabled: undefined },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getAllByText('Nicht gemeldet')).toHaveLength(2);
    },
};

export const PracticeRequiresTours: Story = {
    args: { toursEnabled: false, practiceEnabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getAllByText('Ausgeschaltet')).toHaveLength(2);
        await expect(canvas.getByRole('switch', { name: 'Übungsbereich anbieten' })).toBeChecked();
        await expect(
            canvas.getByText(
                'Zeigt die aktuelle Freigabe für Übungen. Übungen benötigen zusätzlich die Freigabe der Rundgänge.',
            ),
        ).toBeVisible();
    },
};

export const Mobile390: Story = {
    parameters: { viewport: { defaultViewport: 'phone' } },
    decorators: [
        (Story) => (
            <div style={{ width: 358, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
};

export const Tablet820: Story = {
    parameters: {
        viewport: {
            defaultViewport: 'tablet820',
            options: { tablet820: { name: 'Tablet 820', styles: { width: '820px', height: '1180px' } } },
        },
    },
};

export const Desktop1440: Story = {
    parameters: { viewport: { defaultViewport: 'desktop' } },
};

export const English: Story = {
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('en');
        return () => i18n.changeLanguage(previousLanguage);
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { name: 'Counsellor tutorials' })).toBeVisible();
        await expect(canvas.getByText('Coming soon')).toBeVisible();
        await expect(
            canvas.getByRole('switch', { name: 'Automatically start the introduction for new counsellor accounts' }),
        ).toBeDisabled();
        await expect(canvas.getByText(/Existing preferences are retained/)).toBeVisible();
    },
};
