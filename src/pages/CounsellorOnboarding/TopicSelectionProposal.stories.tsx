import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, waitFor, within } from 'storybook/test';
import { TopicSelectionProposal } from './TopicSelectionProposal';

const meta = {
    title: 'Pages/CounsellorOnboarding/Design proposals/Topic selection',
    component: TopicSelectionProposal,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Review-only topic dialog. Example IDs and seven-language labels are fixtures, with three unmodified shared ORISO topic assets. No production route, catalogue or permissions change.',
            },
        },
        viewport: {
            options: {
                topic320: { name: 'Topic phone 320', styles: { width: '320px', height: '740px' } },
                topic412: { name: 'Topic phone 412', styles: { width: '412px', height: '915px' } },
                topicTablet: { name: 'Topic tablet 820', styles: { width: '820px', height: '1180px' } },
            },
        },
    },
} satisfies Meta<typeof TopicSelectionProposal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ApplyCancelAndLanguage: Story = {
    name: 'Apply, cancel and change language without losing entered data',
    play: async ({ canvas, userEvent }) => {
        const body = within(document.body);
        await userEvent.type(canvas.getByLabelText('Anzeigename'), 'Georgia');
        await userEvent.click(canvas.getByRole('button', { name: 'Themen auswählen' }));
        let dialog = within(await body.findByRole('dialog'));
        await userEvent.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
        await userEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }));
        await expect(canvas.queryByRole('checkbox', { name: 'Schulden entfernen' })).not.toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Themen auswählen' }));
        dialog = within(await body.findByRole('dialog'));
        await expect(dialog.getByRole('checkbox', { name: 'Schulden' })).not.toBeChecked();
        await userEvent.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
        await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Sprache' }), 'en');
        await expect(await dialog.findByRole('checkbox', { name: 'Debt' })).toBeChecked();
        await userEvent.click(dialog.getByRole('button', { name: 'Apply' }));
        await expect(canvas.getByLabelText('Display name')).toHaveValue('Georgia');
        await expect(canvas.getByRole('checkbox', { name: 'Remove Debt' })).toBeVisible();
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Remove Debt' }));
        await expect(canvas.queryByRole('checkbox', { name: 'Remove Debt' })).not.toBeInTheDocument();
    },
};
export const Catalogue: Story = { args: { initialOpen: true, requiredTopicIds: [101] } };
export const Phone390: Story = { ...Catalogue, globals: { viewport: { value: 'phone', isRotated: false } } };
export const Tablet820: Story = { ...Catalogue, globals: { viewport: { value: 'topicTablet', isRotated: false } } };
export const Desktop1440: Story = { ...Catalogue, globals: { viewport: { value: 'desktop', isRotated: false } } };
export const Narrow320: Story = {
    args: { initialOpen: true, initialLanguage: 'en', initialSelectedIds: [104, 113] },
    globals: { viewport: { value: 'topic320', isRotated: false } },
};
export const Phone412: Story = { ...Catalogue, globals: { viewport: { value: 'topic412', isRotated: false } } };
export const EnglishLongLabels: Story = {
    args: { initialOpen: true, initialLanguage: 'en', initialSelectedIds: [104, 113] },
};
export const InvitationFixed: Story = {
    args: { permission: 'NONE', fixed: true, initialOpen: true },
    play: async ({ userEvent }) => {
        const dialog = within(await within(document.body).findByRole('dialog'));
        await expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toBeDisabled();
        await userEvent.click(dialog.getByRole('button', { name: 'Anwenden' }));
        await expect(
            within(document.body).getByRole('checkbox', { name: 'Eltern und Familie entfernen' }),
        ).toBeDisabled();
    },
};
export const ExactlyOneCentreTopic: Story = { args: { permission: 'NONE', initialOpen: true } };
export const CentreTopicsOnly: Story = { args: { permission: 'SELECT_EXISTING', initialOpen: true } };
export const Loading: Story = { args: { initialOpen: true, initialStatus: 'loading' } };
export const LoadError: Story = { args: { initialOpen: true, initialStatus: 'error' } };
export const NoPermittedTopics: Story = { args: { initialOpen: true, initialStatus: 'empty', initialSelectedIds: [] } };
export const NoResults: Story = {
    args: { initialOpen: true },
    play: async ({ userEvent }) => {
        const dialog = within(await within(document.body).findByRole('dialog'));
        await waitFor(() => expect(dialog.getByLabelText('Themen suchen')).toBeVisible());
        await userEvent.type(dialog.getByLabelText('Themen suchen'), 'xyz');
        await waitFor(() => expect(dialog.getByText('Keine passenden Themen gefunden.')).toBeVisible());
        await expect(dialog.getByRole('button', { name: 'Suche zurücksetzen' })).toBeVisible();
    },
};

export const French: Story = { args: { initialOpen: true, initialLanguage: 'fr' } };
export const Russian: Story = { args: { initialOpen: true, initialLanguage: 'ru' } };
export const Turkish: Story = { args: { initialOpen: true, initialLanguage: 'tr' } };
export const Ukrainian: Story = { args: { initialOpen: true, initialLanguage: 'uk' } };
export const Tigrinya: Story = { args: { initialOpen: true, initialLanguage: 'ti' } };
