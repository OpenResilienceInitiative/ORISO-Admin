// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, fn, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TemplateSplitButton } from './TemplateSplitButton';

const templates = [
    { id: 1, name: 'Standard-Einladung' },
    { id: 2, name: 'Kurzfassung' },
    { id: 3, name: 'Fachkraft (englisch)' },
];

const meta = {
    title: 'Molecules/PlaceholderTemplate/TemplateSplitButton',
    component: TemplateSplitButton,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Template chooser on the reused M3 split button (invite composer / legal editor pattern): the main segment names the active template, the chevron menu switches templates or starts a new one from an existing template.',
            },
        },
    },
    args: {
        templates,
        onSelectTemplate: () => {},
    },
} satisfies Meta<typeof TemplateSplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const StatefulPicker = (args: Parameters<NonNullable<Story['render']>>[0]) => {
    const [activeTemplateId, setActiveTemplateId] = useState<number | string>(1);
    return (
        <TemplateSplitButton
            {...args}
            activeTemplateId={activeTemplateId}
            onCreateFromTemplate={() => {}}
            onSelectTemplate={setActiveTemplateId}
        />
    );
};

export const WithActiveTemplate: Story = {
    render: (args) => <StatefulPicker {...args} />,
};

export const NothingSelected: Story = {};

export const PickOnly: Story = {
    args: { activeTemplateId: 2 },
};

export const BlankAndCopy: Story = {
    args: { activeTemplateId: 1, size: 'medium', onCreateTemplate: fn(), onCreateFromTemplate: fn() },
    play: async ({ canvasElement, args }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await userEvent.click(await body.findByRole('menuitem', { name: /^Neue Vorlage$/ }));
        await expect(args.onCreateTemplate).toHaveBeenCalledOnce();
        await expect(args.onCreateFromTemplate).not.toHaveBeenCalled();
    },
};
