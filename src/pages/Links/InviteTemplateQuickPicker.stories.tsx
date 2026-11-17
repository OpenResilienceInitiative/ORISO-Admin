import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook package exports
import { expect, fn, userEvent, within } from 'storybook/test';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import { InviteTemplateQuickPicker } from './InviteTemplateQuickPicker';

const templates: InviteEmailTemplateDTO[] = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    name: index === 0 ? 'Systemvorlage Träger' : `Träger-Vorlage ${index + 1}`,
    kind: 'TENANT_INVITE',
    language: 'de',
    subject: 'Ihre Einladung',
    body: 'Hallo {{firstName}},',
    active: true,
    systemDefault: index === 0,
    createDate: '2026-10-13T08:00:00Z',
    updateDate: null,
}));

const meta = {
    title: 'Organisms/Pages/Links/InviteTemplateQuickPicker',
    component: InviteTemplateQuickPicker,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: {
        templates: {
            list: templates,
            recentIds: [],
            onManage: fn(),
            onSelect: fn(),
            onCreateFrom: fn(),
        },
    },
} satisfies Meta<typeof InviteTemplateQuickPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A new account never receives arbitrary catalogue entries as "recent" choices. */
export const NoRecentChoices: Story = {
    play: async ({ canvas, canvasElement, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Vorlage wählen' }));
        await expect(args.templates.onManage).toHaveBeenCalledWith('list');
        await userEvent.click(canvas.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findAllByRole('menuitem')).toHaveLength(2);
        await userEvent.click(body.getByRole('menuitem', { name: 'Neue Vorlage' }));
        await expect(args.templates.onManage).toHaveBeenCalledWith('create');
    },
};

export const LatestFourChoices: Story = {
    args: { templates: { ...meta.args.templates, selectedId: 3, recentIds: [99, 6, 5, 4, 3, 2] } },
    play: async ({ canvas, canvasElement, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        const body = within(canvasElement.ownerDocument.body);
        const choices = await body.findAllByRole('menuitem', { name: /^Träger-Vorlage / });
        await expect(choices.map((choice) => choice.textContent)).toEqual([
            'Träger-Vorlage 6',
            'Träger-Vorlage 5',
            'Träger-Vorlage 4',
            'Träger-Vorlage 3',
        ]);
        await userEvent.click(choices[1]);
        await expect(args.templates.onSelect).toHaveBeenCalledWith(5);
    },
};

export const CreateFromSystemDefault: Story = {
    play: async ({ canvas, canvasElement, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('menuitem', { name: 'Standardvorlage' }));
        await expect(args.templates.onCreateFrom).toHaveBeenCalledWith(1);
    },
};

export const NoSystemDefaultForLanguage: Story = {
    args: { templates: { ...meta.args.templates, list: templates.slice(1) } },
    play: async ({ canvas, canvasElement }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByRole('menuitem', { name: 'Standardvorlage' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
        await userEvent.keyboard('{Escape}');
    },
};
