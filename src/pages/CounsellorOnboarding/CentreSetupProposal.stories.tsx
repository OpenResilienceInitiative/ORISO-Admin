import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { CentreSetupProposal } from './CentreSetupProposal/CentreSetupProposal';

const meta = {
    title: 'Proposals/Invitations/Repeatable centre setup',
    component: CentreSetupProposal,
    args: { allowAdditional: true },
    render: (args) => <CentreSetupProposal key={JSON.stringify(args)} {...args} />,
    parameters: {
        layout: 'fullscreen',
        viewport: {
            options: {
                centreNarrow: { name: 'Centre copy phone 320', styles: { width: '320px', height: '740px' } },
            },
        },
        docs: {
            description: {
                component:
                    'Storybook-only design proposal. The invited first centre already exists; full details follow active 2FA. No live account, permission, email or centre changes. Address reuse is confirmed; additional copy blocks/defaults remain proposed. Runtime reload/persistence belongs to later authenticated product integration.',
            },
        },
    },
} satisfies Meta<typeof CentreSetupProposal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AddressCopyJourney: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Beratungsstelle speichern' }));
        await userEvent.click(await canvas.findByRole('button', { name: 'Weitere Beratungsstelle' }));
        const dialog = within(await within(document.body).findByRole('dialog'));
        await userEvent.click(dialog.getByRole('checkbox', { name: /Adresse/ }));
        await userEvent.click(dialog.getByRole('button', { name: 'Auswahl übernehmen' }));
        await expect(canvas.getByRole('textbox', { name: /^Name/ })).toHaveValue('');
        await expect(canvas.getByRole('textbox', { name: /^Telefon$/ })).toHaveValue('');
        await expect(canvas.getByRole('textbox', { name: /^Stadt/ })).toHaveValue('Berlin');
        await userEvent.type(canvas.getByRole('textbox', { name: /^Name/ }), 'Beratung Süd');
        await userEvent.clear(canvas.getByRole('textbox', { name: /^Stadt/ }));
        await userEvent.type(canvas.getByRole('textbox', { name: /^Stadt/ }), 'Potsdam');
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Allgemeine Sozialberatung' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Beratungsstelle speichern' }));
        await userEvent.click(await canvas.findByRole('button', { name: 'Einrichtung abschließen' }));
        await expect(
            await canvas.findByRole('heading', { name: 'Ihre Beratungsstellen sind eingerichtet' }),
        ).toBeVisible();
        await expect(canvas.getByText('Berlin', { exact: true })).toBeVisible();
        await expect(canvas.getByText('Potsdam', { exact: true })).toBeVisible();
    },
};

export const FirstCentre: Story = {};
export const FirstCentreEnglish: Story = { args: { locale: 'en' } };
export const FirstCentreWithoutExtraPermission: Story = {
    args: { allowAdditional: false },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Beratungsstelle speichern' }));
        await expect(await canvas.findByRole('button', { name: 'Einrichtung abschließen' })).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Weitere Beratungsstelle' })).not.toBeInTheDocument();
    },
};
export const AnotherOrFinish: Story = { args: { initialStep: 'saved' } };
const assertCopyFooterWithinViewport = async () => {
    const body = within(document.body);
    const dialog = await body.findByRole('dialog');
    const choices = within(dialog);
    const apply = choices.getByRole('button', { name: /Auswahl übernehmen|Use selected information/ });
    const cancel = choices.getByRole('button', { name: /Abbrechen|Cancel/ });
    const closeLabel = body.getByRole('main').getAttribute('lang') === 'en' ? 'Close' : 'Schließen';
    const close = choices.getByRole('button', { name: closeLabel, exact: true });
    await waitFor(() => {
        expect(apply).toBeVisible();
        expect(cancel).toBeVisible();
        expect(close).toBeVisible();
        expect(apply.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
        expect(cancel.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
        expect(dialog.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    });
};
export const CopyChoices: Story = { args: { initialStep: 'copy' }, play: assertCopyFooterWithinViewport };
export const CopyChoicesEnglish: Story = {
    args: { locale: 'en', initialStep: 'copy' },
    play: assertCopyFooterWithinViewport,
};
export const CopyChoicesNarrow: Story = {
    args: { initialStep: 'copy' },
    globals: { viewport: { value: 'centreNarrow', isRotated: false } },
    play: assertCopyFooterWithinViewport,
};
export const Finished: Story = { args: { initialStep: 'finished' } };
export const SingleTopic: Story = { args: { singleTopic: true } };
export const MultipleTopics: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Eltern und Familie' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Beratungsstelle speichern' }));
        await expect(await canvas.findByText('Allgemeine Sozialberatung · Eltern und Familie')).toBeVisible();
    },
};
export const SaveError: Story = {
    args: { failNextSave: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Beratungsstelle speichern' }));
        await expect(await canvas.findByRole('alert')).toHaveTextContent('Ihre Eingaben bleiben erhalten');
    },
};
export const SaveRetry: Story = {
    args: { failNextSave: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Beratungsstelle speichern' }));
        await expect(await canvas.findByRole('alert')).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: 'Beratungsstelle speichern' }));
        await expect(await canvas.findByRole('button', { name: 'Einrichtung abschließen' })).toBeVisible();
        await expect(canvas.getAllByRole('heading', { name: 'Beratung Mitte' })).toHaveLength(1);
    },
};
export const CancelCopyThenStartEmpty: Story = {
    args: { initialStep: 'saved' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Weitere Beratungsstelle' }));
        let dialog = within(await within(document.body).findByRole('dialog'));
        await userEvent.click(dialog.getByRole('checkbox', { name: /Adresse/ }));
        await userEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Weitere Beratungsstelle' }));
        dialog = within(await within(document.body).findByRole('dialog'));
        await expect(dialog.getByRole('checkbox', { name: /Adresse/ })).not.toBeChecked();
        await userEvent.click(dialog.getByRole('button', { name: 'Auswahl übernehmen' }));
        await expect(canvas.getByRole('textbox', { name: /^Stadt/ })).toHaveValue('');
        await expect(canvas.getByRole('textbox', { name: /^Telefon$/ })).toHaveValue('');
    },
};
export const LanguageKeepsInputs: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.clear(canvas.getByRole('textbox', { name: /^Stadt/ }));
        await userEvent.type(canvas.getByRole('textbox', { name: /^Stadt/ }), 'Bremen');
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Eltern und Familie' }));
        await userEvent.click(canvas.getByRole('button', { name: 'English' }));
        await expect(canvas.getByRole('textbox', { name: /^City/ })).toHaveValue('Bremen');
        await expect(canvas.getByRole('checkbox', { name: 'Parents and family' })).toBeChecked();
    },
};
export const PermissionDenied: Story = {
    args: { initialStep: 'saved' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Weitere Beratungsstelle' }));
        const dialog = within(await within(document.body).findByRole('dialog'));
        await userEvent.click(dialog.getByRole('button', { name: 'Auswahl übernehmen' }));
        await userEvent.click(
            canvas.getByRole('checkbox', { name: /Weitere Beratungsstellen im eigenen Träger erlauben/ }),
        );
        await expect(canvas.getByRole('button', { name: 'Beratungsstelle speichern' })).toBeDisabled();
        await expect(canvas.getByRole('alert')).toHaveTextContent(
            'Bereits gespeicherte Beratungsstellen bleiben erhalten',
        );
    },
};

export const LongNameEnglish: Story = {
    args: { locale: 'en' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.clear(canvas.getByRole('textbox', { name: /^Name/ }));
        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Name/ }),
            'Counselling centre for families, legal guardianship and advance directives',
        );
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Legal guardianship and advance directives' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Save counselling centre' }));
        await expect(
            await canvas.findByRole('heading', {
                name: 'Counselling centre for families, legal guardianship and advance directives',
            }),
        ).toBeVisible();
    },
};
