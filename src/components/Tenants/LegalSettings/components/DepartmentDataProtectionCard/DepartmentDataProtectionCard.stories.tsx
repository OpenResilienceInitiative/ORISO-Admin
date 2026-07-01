import type { Meta, StoryObj } from '@storybook/react-vite';
import { DepartmentDataProtectionCard } from './index';

const meta = {
    title: 'Organisms/Legal/DepartmentDataProtectionCard',
    component: DepartmentDataProtectionCard,
    parameters: { layout: 'padded' },
    args: { onSave: () => undefined },
} satisfies Meta<typeof DepartmentDataProtectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Published: Story = {
    args: {
        departmentName: 'Schwangerschaftsberatung',
        publicationStatus: 'PUBLISHED',
        initialContent:
            '<h1>Datenschutzerklärung</h1>' +
            '<p>Fachbereich Schwangerschaftsberatung. Verantwortlicher, Zwecke, Rechtsgrundlagen, ' +
            'Speicherdauer und Betroffenenrechte.</p>',
    },
};

export const Draft: Story = {
    args: {
        departmentName: 'Suchtberatung',
        publicationStatus: 'DRAFT',
        initialContent: '<p>Entwurf der Datenschutzerklärung – noch nicht veröffentlicht …</p>',
    },
};

export const Empty: Story = {
    args: {
        departmentName: 'Neuer Fachbereich',
        initialContent: '',
    },
};
