import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, userEvent, within } from 'storybook/test';
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
