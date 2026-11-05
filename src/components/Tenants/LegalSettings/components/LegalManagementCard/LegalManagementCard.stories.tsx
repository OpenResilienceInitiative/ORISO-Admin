import type { Meta, StoryObj } from '@storybook/react-vite';
import { LegalManagementCard } from './index';

const meta = {
    title: 'Settings/Einstellungen/Rechtliches/LegalManagementCard',
    id: 'organisms-legal-legalmanagementcard',
    component: LegalManagementCard,
    args: { allowEdit: true, allowed: false, onSave: () => {} },
    parameters: { layout: 'padded' },
} satisfies Meta<typeof LegalManagementCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { allowed: true } };

export const ReadOnly: Story = { args: { allowEdit: false } };
